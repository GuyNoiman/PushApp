/**
 * CommunicationScheduler — the ONE place that decides *when* the app talks to the
 * user across every reminder rule. It turns the user's rules + their scheduling
 * preferences into a bounded, de-duplicated, prioritized set of on-device
 * notifications, then applies that set through the ReminderEngine (the only file
 * that touches expo-notifications). Pure planner + thin apply, so all the timing
 * logic is deterministic and unit-testable with an injected clock.
 *
 * Design (Engineering Bible §7/§19 — logic in engines, config-before-code):
 *  - `planSchedule(...)` is a PURE function of (rules, journeys, prefs, now): no OS
 *    calls, no persistence. It aggregates the active rules, applies the day/window
 *    constraints, coalesces duplicates, and caps to MAX_PENDING by priority. The
 *    only side effect it may have is emitting `SchedulerCapped` when it trims.
 *  - `reconcile()` = full teardown + rebuild: cancel every scheduler-owned OS
 *    notification, then schedule the freshly-planned set. A full rebuild is fine for
 *    v1; a diff-based apply is a future optimization.
 *
 * PRIVACY RED-LINE (R2): the calendar/location trigger kinds resolve ONLY through
 * the injected gateways and ONLY when a gateway is `enabled`. Both are Null/disabled
 * today, so those kinds produce nothing and NOTHING leaves the device. This file
 * imports no `expo-*` module.
 */
import { MAX_PENDING } from '../config/schedulerLimits';
import type { EventBus } from '../events/EventBus';
import type { CalendarGateway } from '../calendar/CalendarGateway';
import type { LocationGateway } from '../location/LocationGateway';
import type { AppState, Journey, ReminderRule, SchedulingPrefs } from '../types/domain';
import { clampMinuteToWindow, dayPartBand, minuteOfDay } from '../util/date';
import type { ReminderEngine } from './ReminderEngine';

/**
 * One resolved OS notification the scheduler wants pending. A `weekday` of
 * `undefined` means a plain daily (fires every day); otherwise it fires weekly on
 * that JS weekday (0=Sun … 6=Sat). Carries its source `ruleId` so cancels/reporting
 * can be attributed, and a `priority` (higher = kept first when capping).
 */
export interface PlannedNotification {
  ruleId: string;
  journeyId: string;
  title: string;
  body: string;
  /** 0-23 local hour, already clamped into the user's window/day-part. */
  hour: number;
  /** 0-59 local minute, already clamped. */
  minute: number;
  /** JS weekday (0=Sun … 6=Sat), or undefined for a daily. */
  weekday?: number;
  /** Higher = more important; the cap keeps the highest-priority entries. */
  priority: number;
}

/** Gateways for the DORMANT calendar/location trigger kinds (both Null today). */
export interface SchedulerGateways {
  location: LocationGateway;
  calendar: CalendarGateway;
}

/** A candidate notification before coalesce/cap, carrying its sort inputs. */
interface Candidate {
  ruleId: string;
  journeyId: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  weekday?: number;
  /** createdAt of the owning Journey (earlier Journey ⇒ higher priority). */
  journeyCreatedAt: number;
  /** Minutes from `now` until this candidate next fires (sooner ⇒ higher priority). */
  fireOffset: number;
}

export class CommunicationScheduler {
  /**
   * OS notification ids this scheduler currently owns. Tracked in memory so a
   * reconcile can tear them all down before rebuilding. (Persisting these — or
   * diffing instead of full-rebuild — is a future optimization; a restart simply
   * re-plans on the next reconcile.)
   */
  private ownedIds: string[] = [];

  constructor(
    private readonly bus: EventBus,
    private readonly getState: () => AppState,
    private readonly reminderEngine: ReminderEngine,
    private readonly gateways: SchedulerGateways,
    /** Injected clock (defaults to the real one) — overridden in tests. */
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * PURE planner: the desired notification set for the given inputs. No OS calls and
   * no persistence — the only side effect is emitting `SchedulerCapped` if the set
   * had to be trimmed to MAX_PENDING. Safe to call repeatedly.
   */
  planSchedule(
    rules: ReminderRule[],
    journeys: Journey[],
    prefs: SchedulingPrefs,
    now: Date,
  ): PlannedNotification[] {
    const byId = new Map(journeys.map((j) => [j.id, j]));

    // 1. Aggregate: enabled rules whose Journey exists and is not completed.
    const active = rules.filter((r) => {
      if (!r.enabled) return false;
      const journey = byId.get(r.journeyId);
      return !!journey && !journey.completedAt;
    });

    // 2/3. Expand each active rule into candidate notifications.
    const candidates: Candidate[] = [];
    for (const rule of active) {
      const journey = byId.get(rule.journeyId)!;
      candidates.push(...this.candidatesFor(rule, journey, prefs, now));
    }

    // 4. Priority: earlier Journey, then sooner fire time, then fewer occurrences.
    const occurrences = new Map<string, number>();
    for (const c of candidates) occurrences.set(c.ruleId, (occurrences.get(c.ruleId) ?? 0) + 1);
    candidates.sort((a, b) => this.compare(a, b, occurrences));

    // Assign a descending priority so the best-sorted candidate ranks highest.
    const planned: PlannedNotification[] = candidates.map((c, i) => ({
      ruleId: c.ruleId,
      journeyId: c.journeyId,
      title: c.title,
      body: c.body,
      hour: c.hour,
      minute: c.minute,
      weekday: c.weekday,
      priority: candidates.length - i,
    }));

    // Coalesce duplicates (same weekday+hour+minute → one), keeping the best (the
    // list is already sorted best-first, so the first occurrence per key wins).
    const seen = new Set<string>();
    const coalesced: PlannedNotification[] = [];
    for (const p of planned) {
      const key = `${p.weekday ?? '*'}|${p.hour}|${p.minute}`;
      if (seen.has(key)) continue;
      seen.add(key);
      coalesced.push(p);
    }

    // Cap to MAX_PENDING, keeping the highest priority; report what was dropped.
    if (coalesced.length > MAX_PENDING) {
      const kept = coalesced.slice(0, MAX_PENDING);
      const dropped = coalesced.slice(MAX_PENDING);
      this.bus.emit({
        type: 'SchedulerCapped',
        dropped: dropped.length,
        ruleIds: [...new Set(dropped.map((p) => p.ruleId))],
      });
      return kept;
    }
    return coalesced;
  }

  /**
   * Full teardown + rebuild: cancel every scheduler-owned OS notification, then
   * schedule the freshly-planned set through the ReminderEngine. Never throws —
   * scheduling failures inside the ReminderEngine just drop that id.
   */
  async reconcile(): Promise<void> {
    const state = this.getState();
    const planned = this.planSchedule(
      state.reminderRules,
      state.journeys,
      state.schedulingPrefs,
      this.now(),
    );
    await this.apply(planned);
  }

  /** Cancel owned notifications, then schedule the planned set (tracking new ids). */
  private async apply(planned: PlannedNotification[]): Promise<void> {
    for (const id of this.ownedIds) {
      await this.reminderEngine.cancel(id);
    }
    this.ownedIds = [];
    for (const p of planned) {
      const ids = await this.reminderEngine.scheduleRule(this.toRule(p));
      this.ownedIds.push(...ids);
    }
  }

  /**
   * Synthesize the minimal ReminderRule the ReminderEngine needs to schedule one
   * planned notification: a plain daily when `weekday` is undefined, else a single
   * WEEKLY notification for that weekday. The engine owns the DAILY/WEEKLY mapping.
   */
  private toRule(p: PlannedNotification): ReminderRule {
    return {
      id: p.ruleId,
      journeyId: p.journeyId,
      trigger: {
        kind: 'fixedTime',
        hour: p.hour,
        minute: p.minute,
        weekdays: p.weekday === undefined ? undefined : [p.weekday],
      },
      title: p.title,
      body: p.body,
      enabled: true,
      scheduledNotificationIds: [],
    };
  }

  /**
   * Expand a single rule into candidate notifications under the current prefs.
   *  - `fixedTime`: intersect firing days with `preferredDays` (HARD filter, D-A),
   *    then clamp the time into the window + day-part band (D-B — clamp, never drop).
   *    A plain daily fans out to per-weekday entries once `preferredDays` narrows it.
   *  - `calendar`/`location`: resolved ONLY via an ENABLED gateway; both are dormant
   *    today, so they produce nothing and never touch a device API (R2).
   */
  private candidatesFor(
    rule: ReminderRule,
    journey: Journey,
    prefs: SchedulingPrefs,
    now: Date,
  ): Candidate[] {
    const t = rule.trigger;
    if (t.kind === 'calendar') {
      // Dormant seam: an enabled gateway would resolve device-local events here.
      if (!this.gateways.calendar.enabled) return [];
      return [];
    }
    if (t.kind === 'location') {
      // Dormant seam: an enabled gateway would resolve device-local places here.
      if (!this.gateways.location.enabled) return [];
      return [];
    }

    // fixedTime — resolve the effective weekday set (null = daily / every day).
    const base = t.weekdays && t.weekdays.length > 0 ? t.weekdays : null;
    const preferred = prefs.preferredDays;
    let days: number[] | null;
    if (preferred.length > 0) {
      // HARD filter (D-A): a plain daily narrows to the preferred days; a
      // day-specific rule keeps only the intersection.
      days = base === null ? [...preferred] : base.filter((d) => preferred.includes(d));
    } else {
      days = base; // no preferred-day constraint — keep the rule's own days (or daily)
    }
    // Empty intersection ⇒ the rule fires on no allowed day: produce nothing.
    if (days !== null && days.length === 0) return [];

    // Clamp the requested time into the allowed window + day-part band (D-B).
    const clamped = this.clampTime(t.hour, t.minute, prefs);

    if (days === null) {
      return [this.candidate(rule, journey, clamped.hour, clamped.minute, undefined, now)];
    }
    return days.map((weekday) =>
      this.candidate(rule, journey, clamped.hour, clamped.minute, weekday, now),
    );
  }

  /** Build one candidate, precomputing its sort inputs (Journey age + fire offset). */
  private candidate(
    rule: ReminderRule,
    journey: Journey,
    hour: number,
    minute: number,
    weekday: number | undefined,
    now: Date,
  ): Candidate {
    return {
      ruleId: rule.id,
      journeyId: rule.journeyId,
      title: rule.title,
      body: rule.body,
      hour,
      minute,
      weekday,
      journeyCreatedAt: journey.createdAt,
      fireOffset: nextFireOffsetMinutes(now, hour, minute, weekday),
    };
  }

  /**
   * Clamp `hour:minute` into the day-part band first, then the user's window, so the
   * user's explicit window is the FINAL (winning) constraint. Returns the clamped
   * hour/minute. When neither is set, the time is returned unchanged.
   */
  private clampTime(hour: number, minute: number, prefs: SchedulingPrefs): { hour: number; minute: number } {
    let m = hour * 60 + minute;
    const band = dayPartBand(prefs.dayPart);
    if (band) m = clampMinuteToWindow(m, band);
    if (prefs.window) m = clampMinuteToWindow(m, prefs.window);
    return { hour: Math.floor(m / 60), minute: m % 60 };
  }

  /** Sort comparator (best first): earlier Journey → sooner fire → fewer occurrences. */
  private compare(a: Candidate, b: Candidate, occurrences: Map<string, number>): number {
    if (a.journeyCreatedAt !== b.journeyCreatedAt) return a.journeyCreatedAt - b.journeyCreatedAt;
    if (a.fireOffset !== b.fireOffset) return a.fireOffset - b.fireOffset;
    const oa = occurrences.get(a.ruleId) ?? 0;
    const ob = occurrences.get(b.ruleId) ?? 0;
    if (oa !== ob) return oa - ob;
    // Stable deterministic tiebreak so plans are reproducible.
    if (a.ruleId !== b.ruleId) return a.ruleId < b.ruleId ? -1 : 1;
    return (a.weekday ?? -1) - (b.weekday ?? -1);
  }
}

/**
 * Minutes from `now` until the next occurrence of `hour:minute` — daily when
 * `weekday` is undefined, else on that JS weekday (0=Sun … 6=Sat). Always in
 * `[0, 1440)` for daily and `[0, 10080)` for weekly. Used only to rank "soonest
 * fire time"; pure and local.
 */
function nextFireOffsetMinutes(now: Date, hour: number, minute: number, weekday?: number): number {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const target = minuteOfDay({ hour, minute });
  if (weekday === undefined) {
    const diff = target - nowMin;
    return diff >= 0 ? diff : diff + 1440;
  }
  const dayDiff = (weekday - now.getDay() + 7) % 7;
  const diff = dayDiff * 1440 + (target - nowMin);
  return diff >= 0 ? diff : diff + 7 * 1440;
}
