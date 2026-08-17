/**
 * Learning-layer types — the vocabulary the deterministic Planner and its pluggable
 * DomainExpert speak (adaptive coach, S1). Domain-agnostic: nothing here knows about a
 * specific field (running, coding, a certification exam …); a DomainExpert supplies that.
 *
 * Terminology is canonical: the mid-layer object is a Milestone (never "Phase").
 *
 * SECURITY-PRIVACY G1: a {@link GoalInput} title/description and the exact goal specifics
 * are ON-DEVICE-ONLY raw signal (same invariant as ReasonEntry.note / RawBehaviorRecord).
 * They feed the on-device Planner and must NEVER be copied into a DomainEvent, a
 * ProgressSummary, an OutreachInsight, a log line, or any sync path.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { NewJourneyInput } from '../engines/JourneyEngine';
import type { Cadence, DayPart, RawBehaviorRecord } from '../types/domain';

/**
 * What the user wants to become / achieve, as the Planner's input. `isHabit`
 * distinguishes an open-ended recurring practice (no end date) from a finite goal that
 * back-solves to a target date. `cadence` is an optional pace hint the DomainExpert and
 * Planner may honour; when absent a sensible default is derived from `isHabit`.
 */
export interface GoalInput {
  title: string;
  /** True for an open-ended recurring practice; false for a finite, deadline-able goal. */
  isHabit: boolean;
  description?: string;
  /** Optional pace hint (once/daily/weekly). Reuses the domain {@link Cadence} union. */
  cadence?: Cadence;
  /** The plan's SHAPE. Absent means `process` — see {@link JourneyShape}. */
  shape?: JourneyShape;
}

/**
 * The SHAPE of a plan, which decides its whole structure — a distinct question from `isHabit`
 * (open-ended vs deadline-able) and from the domain (what the goal is about).
 *
 *  - `recurring` — ONE action, repeated. "Drink a protein shake daily", "change the pillowcases
 *    every fortnight", "read twice a week". There are no stages: there is no second phase of
 *    changing the pillowcases. The plan is a few setup Steps and then the user's own action, laid
 *    on every active day.
 *  - `process` — a progression, where later work genuinely differs from earlier work. "Build the
 *    confidence to approach strangers." Here a Milestone arc earns its place, and the domain
 *    expert's staged content is what the user is paying attention for.
 *
 * WHY THIS EXISTS: the app knew only the second shape and forced it onto both. Four of the five
 * real goals the founder brought are the first kind, which is why the plans it produced read as
 * though they had been written for somebody else — because they had been.
 */
export type JourneyShape = 'recurring' | 'process';

/**
 * The real-world limits the Planner lays Steps out within. All time fields are minutes /
 * epoch ms / JS `Date.getDay()` weekdays — no PII. `targetDate` present ⇒ the Planner
 * back-solves to hit it; absent ⇒ an open-ended cadence.
 */
export interface PlanConstraints {
  /** Optional deadline (epoch ms). Present ⇒ back-solve; absent ⇒ open-ended. */
  targetDate?: number;
  /** Total minutes the user can give this goal per week (0 ⇒ minimum, one Step/day). */
  weeklyAvailabilityMinutes: number;
  /** Preferred weekdays in JS `Date.getDay()` convention (0=Sun … 6=Sat); empty = all days. */
  preferredDays: number[];
  /** Preferred part of day the Steps are scheduled in. */
  daypart: DayPart;
}

/**
 * A single behavioural signal the learning layer consumes when it (later) re-plans. Reuses
 * the {@link RawBehaviorRecord} `kind` union verbatim (do not redefine it) so the two never
 * fork. ON-DEVICE-ONLY, same G1 invariant as RawBehaviorRecord.
 */
export interface BehaviorSignal {
  stepId: string;
  milestoneId?: string;
  /** What happened to the occurrence — the SAME closed union as RawBehaviorRecord. */
  kind: RawBehaviorRecord['kind'];
  /** Epoch ms the signal was recorded. */
  at: number;
  /** Epoch ms the occurrence was planned for, if it was scheduled. */
  plannedFor?: number;
  /** Actual minutes spent, when known. */
  actualMinutes?: number;
}

/** What a re-plan adjusted, as a coarse enum (never free text). */
export type ReplanAdjustment =
  | 'none'
  | 'rescheduled'
  | 'resized'
  | 'refrequency'
  | 'added'
  | 'removed';

/**
 * One INTENDED change to a single remaining Step, for the apply step (S1.11) to enact via the
 * JourneyEngine. Pure data — replan NEVER mutates the Step; it only describes the change. A
 * Step may appear in more than one adjustment (e.g. both `rescheduled` and `resized`), one per
 * JourneyEngine call the apply step will make.
 */
export interface StepAdjustment {
  stepId: string;
  /** The coarse kind of change (maps 1:1 to a JourneyEngine method in the apply step). */
  kind: ReplanAdjustment;
  /** New scheduled occurrence (epoch ms) when `kind` is `rescheduled`. Never past the targetDate. */
  plannedFor?: number;
  /** New expected length in minutes when `kind` is `resized`. */
  estimatedDuration?: number;
  /** New relative difficulty 1..5 when `kind` is `resized`. */
  difficulty?: number;
}

/**
 * A reminder-timing hint the re-plan derived from the on-device {@link InsightModel} + policy:
 * the day-part the user actually shows up in, plus the weekdays the remaining Steps now land
 * on. Enum/scalar only — carries no free text (G1/G2). A later wiring feeds it to the
 * CommunicationScheduler; replan itself performs no scheduling side effects.
 */
export interface NudgeHint {
  /** The day-part to aim reminders at — the user's observed InsightModel.preferredDaypart. */
  daypart: DayPart;
  /** Weekdays (JS getDay 0=Sun…6=Sat) the remaining Steps are scheduled on; empty = no signal. */
  days: number[];
  /** Minutes before a planned Step to fire the nudge (from policy). */
  leadMinutes: number;
  /** True when the plan is at-risk and an extra pre-reminder is warranted (from policy). */
  extra: boolean;
}

/**
 * The result of re-planning an existing Journey from the derived {@link InsightModel}. It is
 * ADJUSTMENT-CENTRIC: replan computes an intended set of per-Step changes over the REMAINING
 * (not-yet-done) Steps; the apply step (S1.11) enacts them on the existing Journey. The
 * algorithm lives in {@link ../AdaptivePlanner}.replan; this is its stable output shape.
 */
export interface ReplanResult {
  /**
   * OPTIONAL revised journey-creation input, reserved for a future full re-lay. The current
   * adjustment-centric algorithm leaves it undefined and expresses every change through
   * {@link stepAdjustments}.
   */
  plan?: NewJourneyInput;
  /** True when the re-plan intends any change (⇔ {@link stepAdjustments} is non-empty). */
  changed: boolean;
  /** Coarse summary of the KINDS of change made (for logging / a future UI). */
  adjustments: ReplanAdjustment[];
  /** The concrete per-Step intended changes the apply step (S1.11) will enact. */
  stepAdjustments: StepAdjustment[];
  /**
   * At-risk HONESTY: true when a deadline plan cannot be held even after compression and
   * load-shedding — the coach never silently fails, it surfaces the risk. Always false for an
   * open-ended (no targetDate) plan, which has no deadline to miss.
   */
  atRisk: boolean;
  /** Reminder-timing hint derived from the InsightModel + policy. */
  nudge: NudgeHint;
}
