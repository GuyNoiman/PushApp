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
 *
 * COPY (Communication_Style_Profile_PRD §10/AC#4): this file stays i18n-free. The words
 * are resolved by an INJECTED {@link ReminderCopyBuilder} in `toRule()` — the thin apply
 * layer — never inside the planner. Because copy is resolved at reconcile time rather
 * than baked at rule-creation time, a language, form-of-address or communication-style
 * change applies to reminders that were already scheduled. With no builder (or a builder
 * that declines) the rule's own baked `title`/`body` are used, so behaviour degrades to
 * exactly what shipped and a notification can never come out blank.
 */
import { featureFlags } from '../config/featureFlags';
import { MAX_PENDING } from '../config/schedulerLimits';
import type { EventBus } from '../events/EventBus';
import type { CalendarGateway } from '../calendar/CalendarGateway';
import type { LocationGateway } from '../location/LocationGateway';
import type { AggregateCopyBuilder } from '../notify/aggregateCopy';
import { planAggregatesForDay, type AggregateInput } from '../notify/aggregatePlan';
import type { ReminderCopyBuilder } from '../notify/reminderCopy';
import type { AppState, Journey, ReminderRule, SchedulingPrefs } from '../types/domain';
import { clampScheduleMinute, dayAvailability, isDayUniform } from '../util/availability';
import { minuteOfDay } from '../util/date';
import { isRunning } from '../util/journeyStatus';
import type { ReminderNotificationData, ReminderEngine } from './ReminderEngine';

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
  /**
   * OPAQUE ids attached to the OS notification so a TAP can be attributed back to the rule that
   * sent it (Smart Notification Timing, PRD §4 "record tap vs organic foreground separately").
   * Ids ONLY — never a title, never any user text; the payload is readable by anything that can
   * read the notification. Present only while the `smartTiming` flag is on, so a build without it
   * sends byte-identical notifications to what shipped.
   */
  data?: ReminderNotificationData;
  /**
   * Set ONLY on an adaptive aggregate (Smart_Notification_Timing_PRD §3). Its presence is what
   * tells the apply layer to ask the {@link AggregateCopyBuilder} for words instead of the
   * per-Journey {@link ReminderCopyBuilder} — and to send NOTHING when that builder declines,
   * because an aggregate has no baked copy to fall back to.
   */
  aggregate?: AggregateSend;
}

/**
 * What one planned ADAPTIVE AGGREGATE speaks for: the smart rules it REPLACES, the Journeys it
 * names, and how many actionable Steps are pending across them. Present only on an aggregate; a
 * per-Journey reminder never carries it.
 *
 * The counts and titles are computed by the PURE planner and handed to the copy builder at apply
 * time, which is what keeps the words out of the timing algorithm (Engineering Bible §19).
 */
export interface AggregateSend {
  /** The smart rules this send replaces — none of them is scheduled on its own. */
  ruleIds: string[];
  journeys: { journeyId: string; journeyTitle: string }[];
  /** Actionable pending Steps across those Journeys — a count, never a title (PRD §6 Q3). */
  pendingStepCount: number;
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
  /** Present only on an aggregate candidate — see {@link AggregateSend}. */
  aggregate?: AggregateSend;
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
    /**
     * Optional copy resolver, asked once per planned notification at APPLY time (see
     * `toRule`). Omitted here and in every planner-only test: without it the rule's
     * baked copy is used unchanged. The composition root injects the real one.
     */
    private readonly buildCopy?: ReminderCopyBuilder,
    /**
     * Optional copy resolver for the low-frequency ADAPTIVE AGGREGATE (Smart Notification Timing
     * PRD §3). Declared now so this constructor settles in one pass; UNUSED until the aggregate
     * slice lands, and with no builder injected no aggregate is ever planned. Kept LAST so every
     * existing caller and test is untouched.
     */
    private readonly buildAggregateCopy?: AggregateCopyBuilder,
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

    // 1. Aggregate: enabled rules whose Journey exists and is RUNNING. Gated positively (isRunning)
    //    so every non-running state is excluded by construction: completed, FROZEN (a paused Journey
    //    fires nothing until resumed, J3), and FUTURE (an approved plan saved for later must produce
    //    no reminders before it starts — Future Journey Management §5/§14.4).
    const active = rules.filter((r) => {
      if (!r.enabled) return false;
      const journey = byId.get(r.journeyId);
      return !!journey && isRunning(journey);
    });

    // 2. Partition by the user's chosen MODE (D40 `ReminderRule.mode`, founder 2026-08-26).
    //
    //    A `fixed` rule is one a PERSON set, so it expands exactly as it always has and is never an
    //    input to the aggregate — that is how "a reminder somebody set by hand always fires at the
    //    time they set" is guaranteed structurally rather than remembered.
    //
    //    A `smart` rule hands its time to the aggregate planner and produces NO notification of its
    //    own: the aggregate REPLACES it. Without an injected copy builder there would be no words
    //    for that aggregate, so in that case smart rules simply expand like fixed ones — which is
    //    byte-for-byte what this scheduler did before the aggregate existed.
    const canAggregate = !!this.buildAggregateCopy;
    const smart = canAggregate ? active.filter((r) => r.mode === 'smart') : [];
    const direct = canAggregate ? active.filter((r) => r.mode !== 'smart') : active;

    // 3. Expand each directly-scheduled rule into candidate notifications.
    const candidates: Candidate[] = [];
    for (const rule of direct) {
      const journey = byId.get(rule.journeyId)!;
      candidates.push(...this.candidatesFor(rule, journey, prefs, now));
    }
    candidates.push(...this.aggregateCandidates(smart, byId, prefs, now));

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
      ...(c.aggregate ? { aggregate: c.aggregate } : {}),
      // Attribution ids, and ONLY while Smart Timing is on — a build with the flag off puts nothing
      // new on the lock screen. Building them here keeps the planner pure: they are copied from the
      // rule, not read from anywhere.
      ...(featureFlags.smartTiming
        ? {
            data: {
              ruleId: c.ruleId,
              journeyId: c.journeyId,
              kind: (c.aggregate ? 'aggregate' : 'reminder') as 'reminder' | 'aggregate',
            },
          }
        : {}),
    }));

    // Coalesce duplicates (same weekday+hour+minute → one), keeping the best (the
    // list is already sorted best-first, so the first occurrence per key wins).
    //
    // An aggregate lives in its OWN key space. Sharing one would mean a hand-set reminder that
    // happens to land on the same minute silently loses to an aggregate for other Journeys —
    // exactly the overruling of an explicit instruction the founder's rule forbids. Two sends in
    // the same minute is the honest outcome: one is the time a person chose, the other speaks for
    // the Journeys that asked us to choose.
    const seen = new Set<string>();
    const coalesced: PlannedNotification[] = [];
    for (const p of planned) {
      const key = `${p.aggregate ? 'agg' : 'one'}|${p.weekday ?? '*'}|${p.hour}|${p.minute}`;
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

  /**
   * Cancel what is pending, then schedule the planned set (tracking new ids).
   *
   * THE TEARDOWN GOES THROUGH THE OS, not through `ownedIds`. Tracking ids in memory looked right
   * and was wrong in the one case that matters: a cold start begins with an empty list, so the
   * rebuild cancelled nothing and scheduled a second copy of every daily reminder — and a third the
   * next morning (founder's phone, 2026-08-23: three identical notifications at once). `ownedIds`
   * is still cleared afterwards, but the sweep is what makes the rebuild idempotent, and it also
   * cleans up the copies that earlier launches already left behind.
   */
  private async apply(planned: PlannedNotification[]): Promise<void> {
    await this.reminderEngine.cancelRepeating();
    this.ownedIds = [];
    for (const p of planned) {
      const rule = this.toRule(p);
      // An aggregate has no baked copy to fall back to — its words exist only if the injected
      // builder produced them. Nothing is better than a blank banner, so it is dropped silently
      // and the Journeys it spoke for are simply quiet today.
      if (p.aggregate && !rule.title && !rule.body) continue;
      // The attribution payload rides ALONGSIDE the synthesized rule rather than inside it: it is
      // transport metadata for one send, not part of the rule the user configured and we persist.
      const ids = await this.reminderEngine.scheduleRule(rule, p.data);
      this.ownedIds.push(...ids);
    }
  }

  /**
   * Synthesize the minimal ReminderRule the ReminderEngine needs to schedule one
   * planned notification: a plain daily when `weekday` is undefined, else a single
   * WEEKLY notification for that weekday. The engine owns the DAILY/WEEKLY mapping.
   *
   * This is also where the WORDS are resolved (never in the planner): the injected
   * builder gets the Journey this notification belongs to and returns copy in the
   * user's current language/form of address/communication style. Anything less than a
   * clean answer — no builder, an unknown Journey, a `null`, or a throw — falls back to
   * the copy baked on the plan, which is what the app sent before this seam existed.
   */
  private toRule(p: PlannedNotification): ReminderRule {
    const resolved = this.resolveCopy(p);
    return {
      id: p.ruleId,
      journeyId: p.journeyId,
      trigger: {
        kind: 'fixedTime',
        hour: p.hour,
        minute: p.minute,
        weekdays: p.weekday === undefined ? undefined : [p.weekday],
      },
      title: resolved?.title ?? p.title,
      body: resolved?.body ?? p.body,
      // `enabled: true` below is what makes the ReminderEngine act on this synthesized rule; an
      // aggregate the builder declined is filtered out in `apply` before it gets here.
      enabled: true,
      scheduledNotificationIds: [],
    };
  }

  /**
   * Ask the injected builder for this notification's copy, or `null` to keep the baked
   * copy. Never throws: a failing copy builder must degrade one notification's wording,
   * not abort the whole reconcile and leave the user with no reminders at all.
   */
  private resolveCopy(p: PlannedNotification): { title: string; body: string } | null {
    // An aggregate asks its OWN builder, and gets no per-Journey fallback: it speaks for several
    // Journeys, so there is no single one whose reminder copy would be true.
    if (p.aggregate) {
      if (!this.buildAggregateCopy) return null;
      try {
        return this.buildAggregateCopy({
          journeys: p.aggregate.journeys,
          pendingStepCount: p.aggregate.pendingStepCount,
        });
      } catch {
        return null;
      }
    }
    if (!this.buildCopy) return null;
    try {
      const journey = this.getState().journeys.find((j) => j.id === p.journeyId);
      if (!journey) return null;
      return this.buildCopy({ journeyId: journey.id, journeyTitle: journey.title });
    } catch {
      return null;
    }
  }

  /**
   * Turn the SMART rules into at most two aggregate candidates per day (Smart_Notification_Timing
   * PRD §3, founder's decisions of 2026-08-26). The rules themselves produce nothing else — this
   * send replaces them.
   *
   * Three things happen here, in this order, and each is doing real work:
   *
   *  1. **A Journey with nothing pending is not in the aggregate at all.** This is the planning
   *     half of "if nothing is pending at send time, suppress it" (§3). A local notification cannot
   *     be recalled once the OS holds it, so the honest mechanism is that the next reconcile — and
   *     one runs whenever a Step is completed — simply stops planning it, and the teardown cancels
   *     what was pending. The gap it leaves is real: finishing everything AFTER the last reconcile
   *     of the day still lets today's send arrive. The foreground half is exact, and lives in the
   *     {@link ReminderEngine} notification handler.
   *  2. **Each rule expands through the very same {@link candidatesFor} the fixed path uses**, so
   *     preferred days, per-day Active Hours and the location constraint apply identically. The
   *     aggregate decides who is spoken to TOGETHER; it never widens when someone is reachable.
   *  3. **Grouping is per real day.** When every smart rule is a plain daily, one group covers all
   *     seven days and one daily notification carries it. The moment any rule is weekday-specific,
   *     the dailies fan out to explicit weekdays too — otherwise a daily group and a Monday group
   *     would both fire on Monday, which is the third interruption this whole feature exists to
   *     prevent.
   */
  private aggregateCandidates(
    rules: ReminderRule[],
    byId: Map<string, Journey>,
    prefs: SchedulingPrefs,
    now: Date,
  ): Candidate[] {
    if (rules.length === 0) return [];

    const pendingByJourney = new Map<string, number>();
    const inputs: AggregateInput[] = [];
    for (const rule of rules) {
      const journey = byId.get(rule.journeyId)!;
      const pending = journey.steps.filter((s) => !s.done && !s.dropped).length;
      if (pending === 0) continue;
      pendingByJourney.set(journey.id, pending);
      for (const c of this.candidatesFor(rule, journey, prefs, now)) {
        inputs.push({
          ruleId: c.ruleId,
          journeyId: c.journeyId,
          journeyTitle: journey.title,
          hour: c.hour,
          minute: c.minute,
          ...(c.weekday !== undefined ? { weekday: c.weekday } : {}),
        });
      }
    }
    if (inputs.length === 0) return [];

    const anyWeekday = inputs.some((i) => i.weekday !== undefined);
    const byDay = new Map<string, AggregateInput[]>();
    for (const input of inputs) {
      const days: (number | undefined)[] =
        input.weekday !== undefined ? [input.weekday] : anyWeekday ? [0, 1, 2, 3, 4, 5, 6] : [undefined];
      for (const weekday of days) {
        const key = weekday === undefined ? '*' : String(weekday);
        const list = byDay.get(key) ?? [];
        list.push(weekday === input.weekday ? input : { ...input, weekday });
        byDay.set(key, list);
      }
    }

    const out: Candidate[] = [];
    for (const [key, dayInputs] of byDay) {
      for (const slot of planAggregatesForDay(dayInputs)) {
        const pendingStepCount = slot.journeys.reduce(
          (sum, j) => sum + (pendingByJourney.get(j.journeyId) ?? 0),
          0,
        );
        const createdAt = Math.min(
          ...slot.journeys.map((j) => byId.get(j.journeyId)?.createdAt ?? Number.MAX_SAFE_INTEGER),
        );
        out.push({
          // A synthetic id: this send belongs to no single rule, and the ReminderEngine uses the id
          // only for the dormant location/calendar kinds. Stable across reconciles for the same
          // slot, so logs and taps read consistently.
          ruleId: `aggregate:${key}:${slot.hour}:${slot.minute}`,
          // A tap has to open SOMETHING; the earliest Journey in the slot is the honest answer, and
          // the send itself opens Home / Today's Focus.
          journeyId: slot.journeys[0].journeyId,
          // Deliberately empty: the words are built at apply time, never in this pure planner.
          title: '',
          body: '',
          hour: slot.hour,
          minute: slot.minute,
          weekday: slot.weekday,
          journeyCreatedAt: createdAt,
          fireOffset: nextFireOffsetMinutes(now, slot.hour, slot.minute, slot.weekday),
          aggregate: { ruleIds: slot.ruleIds, journeys: slot.journeys, pendingStepCount },
        });
      }
    }
    return out;
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
   * window (D40), so the user's account window is the FINAL (winning) constraint. Delegates to the
   * shared {@link clampScheduleMinute}, so the scheduler, the Miss-Recovery reschedule helper and
   * the Smart-Timing proposal engine honour ONE definition and can never drift apart. A day with
   * no window (all-day) leaves the time unchanged; a disabled day is filtered out before this is
   * reached (hence the non-null fallback).
   */
  private clampTime(
    hour: number,
    minute: number,
    prefs: SchedulingPrefs,
    weekday: number,
  ): { hour: number; minute: number } {
    const requested = hour * 60 + minute;
    const m = clampScheduleMinute(requested, weekday, prefs) ?? requested;
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
