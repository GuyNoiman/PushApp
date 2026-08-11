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
import { dayAvailability, isDayUniform } from '../util/availability';
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

    // 1. Aggregate: enabled rules whose Journey exists and is currently running — not completed
    //    and not FROZEN (a paused Journey must fire no reminders until it is resumed, J3).
    const active = rules.filter((r) => {
      if (!r.enabled) return false;
      const journey = byId.get(r.journeyId);
      return !!journey && !journey.completedAt && journey.status !== 'frozen';
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
    // Miss-Recovery constraint gate: if the location signal says the user is AWAY and
    // EVERY still-pending Step of this Journey is home-only, there's nothing to nudge
    // for — produce no candidates for this rule. PERMISSIVE by construction: the real
    // Null gateway (and every case with the dev mock off) returns 'unknown', which
    // never gates, so existing behaviour + tests are unchanged.
    if (this.constraintGatedOut(journey)) return [];

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

    // Active Hours are per-day (D40). When every day resolves identically — the legacy
    // no-Active-Hours case, or a shared window — a plain daily can stay a SINGLE daily
    // notification (one clamp), keeping the old behaviour a pure passthrough. Only when
    // days genuinely differ do we fan a daily out to explicit weekdays so each can clamp
    // into ITS window. Enforcement is CLAMP, not disable (D40): an out-of-window time is
    // moved to the nearest allowed minute; a disabled day yields no candidate.
    if (days === null && isDayUniform(prefs)) {
      if (dayAvailability(0, prefs).kind === 'none') return []; // every day quiet ⇒ nothing
      const clamped = this.clampTime(t.hour, t.minute, prefs, 0);
      return [this.candidate(rule, journey, clamped.hour, clamped.minute, undefined, now)];
    }

    // Per-weekday path: an explicit weekday list, or all seven when a daily meets a
    // non-uniform Active-Hours setting. Each weekday clamps into its own window; a
    // disabled/quiet day contributes no candidate.
    const weekdays = days === null ? [0, 1, 2, 3, 4, 5, 6] : days;
    const clampedDays: { weekday: number; hour: number; minute: number }[] = [];
    for (const weekday of weekdays) {
      if (dayAvailability(weekday, prefs).kind === 'none') continue;
      const clamped = this.clampTime(t.hour, t.minute, prefs, weekday);
      clampedDays.push({ weekday, hour: clamped.hour, minute: clamped.minute });
    }
    if (clampedDays.length === 0) return [];

    // Collapse a fanned-out DAILY back into a single daily when every weekday survived
    // and they all resolved to the SAME time (e.g. each day's window still contains the
    // requested time). This avoids emitting ~7× the pending notifications for what is
    // one daily reminder — which would inflate the count and risk SchedulerCapped
    // dropping other Journeys' reminders. Only a full-week set can become a daily; a
    // subset stays weekly so it never fires on a disabled day.
    const first = clampedDays[0];
    const allSameTime = clampedDays.every((p) => p.hour === first.hour && p.minute === first.minute);
    if (days === null && allSameTime && clampedDays.length === 7) {
      return [this.candidate(rule, journey, first.hour, first.minute, undefined, now)];
    }
    return clampedDays.map((p) => this.candidate(rule, journey, p.hour, p.minute, p.weekday, now));
  }

  /**
   * Whether a Journey's reminders should be suppressed by the location constraint
   * (Miss-Recovery). True ONLY when the location gateway concretely reports 'away'
   * AND every pending Step of the Journey requires being at home. Any 'unknown'
   * signal (the default) — or any pending Step doable while away — keeps the reminder.
   * The gateway read is transient/gating-only and is never persisted or emitted (G4).
   */
  private constraintGatedOut(journey: Journey): boolean {
    const place = this.gateways.location.currentPlace?.() ?? 'unknown';
    if (place !== 'away') return false;
    const pending = journey.steps.filter((s) => !s.done);
    if (pending.length === 0) return false;
    return pending.every((s) =>
      (s.constraints ?? []).some((c) => c.kind === 'location' && c.place === 'home'),
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
   * Clamp `hour:minute` into the day-part band first, then that WEEKDAY's Active-Hours
   * window (D40), so the user's account window is the FINAL (winning) constraint. The
   * window is resolved through the shared availability service, so the scheduler and the
   * Miss-Recovery reschedule helper honour one definition. A day with no window (all-day)
   * leaves the time unchanged; a disabled day is filtered out before this is reached.
   */
  private clampTime(
    hour: number,
    minute: number,
    prefs: SchedulingPrefs,
    weekday: number,
  ): { hour: number; minute: number } {
    let m = hour * 60 + minute;
    const band = dayPartBand(prefs.dayPart);
    if (band) m = clampMinuteToWindow(m, band);
    const av = dayAvailability(weekday, prefs);
    if (av.kind === 'window') m = clampMinuteToWindow(m, av.window);
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
