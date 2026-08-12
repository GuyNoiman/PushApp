/**
 * DomainEvent union — the vocabulary the engines speak over the EventBus.
 * Engines never call each other directly; they emit and react to these events
 * (Engineering Bible §7 event-driven). Pure TS — no React/UI/vendor imports.
 */
import type { Buddy, BuddyStage, CheckIn, Journey, LeverId, ReasonId, ReminderRule, Step } from '../types/domain';
// Type-only import (erased at compile) — reuses the re-planner's coarse adjustment enum without a
// runtime dependency on the learning layer, so no import cycle is introduced.
import type { ReplanAdjustment } from '../learning/types';

export interface JourneyCreated {
  type: 'JourneyCreated';
  journey: Journey;
}

export interface StepCheckedIn {
  type: 'StepCheckedIn';
  journeyId: string;
  step: Step;
  checkIn: CheckIn;
  /**
   * True the FIRST time this Step is checked in (no prior CheckIn for its id), false on a
   * re-completion after a reversal (Daily Step Reporting, D36). The RewardEngine grants XP/Coins
   * only when true, so re-completing a reversed Step mints nothing twice. Boolean only.
   */
  firstCompletion: boolean;
}

export interface JourneyCompleted {
  type: 'JourneyCompleted';
  journey: Journey;
  /**
   * True the FIRST time the Journey completes ({@link Journey.completionRewarded} was unset), false
   * on any later re-completion after a reversal (Daily Step Reporting, D36). The RewardEngine grants
   * the completion reward only when true. Boolean only.
   */
  firstCompletion: boolean;
}

/**
 * A Journey was edited in place through the coach-led edit path (JourneyEngine.updateJourney) —
 * scalars, added/edited/removed Steps applied while preserving Step ids + check-in history + XP.
 * Carries the mutated {@link Journey} IN-PROCESS ONLY, exactly like {@link JourneyCreated}: AppCore
 * persists + notifies (onChanged) and re-plans reminders (onReconcile) off it, and it never leaves
 * the device.
 */
export interface JourneyUpdated {
  type: 'JourneyUpdated';
  journey: Journey;
}

/**
 * A Journey was permanently deleted/abandoned by the user (task J2) — the Journey and its Steps are
 * hard-removed from AppState. Carries only the `journeyId` scalar (enum/scalar-only, like
 * {@link ReminderRuleRemoved}): AppCore persists off it (onChanged) and re-plans reminders
 * (onReconcile) so the deleted Journey's on-device notifications are cancelled. IN-PROCESS ONLY —
 * it never leaves the device and never widens what is exposed (G1).
 */
export interface JourneyDeleted {
  type: 'JourneyDeleted';
  journeyId: string;
}

/**
 * A Journey was PAUSED (frozen) by the user without losing progress (task J3) — its `status` flips
 * to `frozen`. Carries the mutated {@link Journey} IN-PROCESS ONLY, like {@link JourneyUpdated}:
 * AppCore persists off it (onChanged) and re-plans reminders (onReconcile) so a paused Journey's
 * on-device notifications stop until it is resumed. It never leaves the device (G1).
 */
export interface JourneyFrozen {
  type: 'JourneyFrozen';
  journey: Journey;
}

/**
 * A frozen Journey was RESUMED by the user (task J3) — its `status` flips back to `active`. Carries
 * the mutated {@link Journey} IN-PROCESS ONLY: AppCore persists (onChanged) and re-plans reminders
 * (onReconcile) so its notifications resume. It never leaves the device (G1).
 */
export interface JourneyResumed {
  type: 'JourneyResumed';
  journey: Journey;
}

/**
 * A Step's report was REVERSED — the open-week "un-report" path (Daily Step Reporting, D36). The
 * Step's completion was cleared (`done=false`, `lastCheckInAt` dropped) and {@link Step.lastReportClearedAt}
 * stamped so status derivation supersedes any earlier terminal reason row; prior CheckIn / reason rows
 * are KEPT as history and no XP is clawed back. `reopenedJourney` is true when the reversal un-completed
 * an auto-completed Journey (its reminders must resume). Carries ids/booleans ONLY — no free text (G1);
 * AppCore persists off it and re-plans a reopened Journey's reminders. IN-PROCESS ONLY.
 */
export interface StepReportReversed {
  type: 'StepReportReversed';
  journeyId: string;
  stepId: string;
  /** True when the reversal moved an auto-completed Journey back to `active`. */
  reopenedJourney: boolean;
}

/**
 * A Dream was created by the coach (Dream Management, D40 — the coach owns the Dream layer, no user
 * approval gate). Carries the `dreamId` SCALAR ONLY: the Dream title/why is private on-device data
 * (PRD §8) and must never ride an event, so AppCore persists off this id (onChanged) and re-derives
 * everything from state. IN-PROCESS ONLY — never leaves the device (G1/G2).
 */
export interface DreamCreated {
  type: 'DreamCreated';
  dreamId: string;
}

/**
 * A Journey↔Dream relationship was created/changed (Dream Management, D40). `primary` distinguishes
 * the deterministic PRIMARY link from an additional secondary one. Ids + a boolean ONLY — no Dream
 * or Journey text (G1). AppCore persists off it; linking never edits the Journey's Steps/schedule.
 */
export interface JourneyDreamLinked {
  type: 'JourneyDreamLinked';
  journeyId: string;
  dreamId: string;
  primary: boolean;
}

/**
 * A Journey↔Dream relationship was removed (Dream Management, D40) — the link is severed but the
 * Journey is NEVER cascade-deleted or edited (PRD §9). Ids ONLY. AppCore persists off it.
 */
export interface JourneyDreamUnlinked {
  type: 'JourneyDreamUnlinked';
  journeyId: string;
  dreamId: string;
}

export interface RewardGranted {
  type: 'RewardGranted';
  xp: number;
  coins: number;
  reason: 'StepCheckedIn' | 'JourneyCompleted' | 'MissionClaimed' | 'LoginRewardClaimed';
  /** Set when the reward came from a Journey (Step check-in / completion). */
  sourceJourneyId?: string;
  sourceStepId?: string;
  /** Set when the reward came from claiming a Mission. */
  sourceMissionId?: string;
}

export interface BuddyReacted {
  type: 'BuddyReacted';
  buddy: Buddy;
  gainedXp: number;
  gainedCoins: number;
}

/**
 * The prominent day-count streak changed (StreakEngine). Emitted on a new-day increment
 * (first check-in of a calendar day) and on a reset (an URGENT Step was missed). Carries
 * only the new scalar count — AppCore persists off it. Enum/scalar-only, never any title
 * or note; safe to observe/persist and never widens what leaves the device (G1).
 */
export interface StreakChanged {
  type: 'StreakChanged';
  /** The streak's new day-count (0 after an urgent-miss reset). */
  streak: number;
}

export interface BuddyEvolved {
  type: 'BuddyEvolved';
  buddy: Buddy;
  fromStage: BuddyStage;
  toStage: BuddyStage;
}

/** A Shop cosmetic was bought: Coins were spent and the item added to the Buddy. */
export interface ItemPurchased {
  type: 'ItemPurchased';
  itemId: string;
  coinsSpent: number;
  /** The Buddy's Coin balance after the purchase. */
  balance: number;
}

/** The equipped cosmetic changed. `itemId` is null when the Buddy was unequipped. */
export interface ItemEquipped {
  type: 'ItemEquipped';
  itemId: string | null;
}

/** A Mission advanced toward its target (game-loop progress, not transformation). */
export interface MissionProgressed {
  type: 'MissionProgressed';
  missionId: string;
  progress: number;
  target: number;
}

/** A Mission hit its target and is now claimable. Emitted once, on crossing. */
export interface MissionCompleted {
  type: 'MissionCompleted';
  missionId: string;
}

/** A completed Mission was claimed: its Coins are granted via RewardGranted. */
export interface MissionClaimed {
  type: 'MissionClaimed';
  missionId: string;
  coins: number;
}

/** The daily Login reward was claimed: its Coins are granted via RewardGranted. */
export interface LoginRewardClaimed {
  type: 'LoginRewardClaimed';
  /** 1-based day in the login cycle that was claimed. */
  day: number;
  coins: number;
}

/** A user reminder rule was added (or updated). Drives persistence. */
export interface ReminderRuleAdded {
  type: 'ReminderRuleAdded';
  rule: ReminderRule;
}

/** A user reminder rule was removed. Drives persistence. */
export interface ReminderRuleRemoved {
  type: 'ReminderRuleRemoved';
  ruleId: string;
}

/** The user's scheduling preferences changed (window / day-part / weekdays). */
export interface SchedulingPrefsChanged {
  type: 'SchedulingPrefsChanged';
}

// ── Miss-Recovery (user-triggered) ───────────────────────────────────────────
// Emitted when the user taps Postpone and works through the recovery loop. Ids/enums
// ONLY — no free text, no `note`, no Grace-Token cost (Cancel is FREE this slice).
// These are NOT the reserved auto-miss keystone: StepMissed stays reserved (below)
// and is never emitted here, and `featureFlags.intervention` stays off.

/**
 * The user postponed a Step (kept it, will move it). Drives persistence. No `done` change.
 *
 * Carries ENUM/SCALAR-ONLY optional fields (Step Postponement, D37): the resolved
 * {@link StepPostponed.postponedUntil} target and the running {@link StepPostponed.postponeCount}.
 * Never any free text / reason `note` (G1) — the on-device {@link ReasonEntry} owns the optional note.
 */
export interface StepPostponed {
  type: 'StepPostponed';
  journeyId: string;
  stepId: string;
  /** Epoch ms this occurrence is postponed until, when a target was resolved. Scalar only. */
  postponedUntil?: number;
  /** How many times this occurrence has been postponed without a final report. Scalar only. */
  postponeCount?: number;
}

/**
 * The user let THIS occurrence of a Step go ("Not this time"). Carries the closed
 * reason id only. Cancel is FREE this slice — there is deliberately NO graceTokenCost
 * and no token language anywhere (founder decision, PRD §9).
 */
export interface StepCancelled {
  type: 'StepCancelled';
  journeyId: string;
  stepId: string;
  reasonId: ReasonId;
}

/**
 * A recovery lever changed the Step's/Journey's reminder schedule. Carries the
 * lever ids that acted — never the reason `note` or any free text (G1).
 */
export interface ReminderRescheduled {
  type: 'ReminderRescheduled';
  journeyId: string;
  stepId: string;
  leverIds: LeverId[];
}

/**
 * The planner trimmed the desired notification set to stay under MAX_PENDING.
 * Reports how many were dropped and which rules they belonged to (deduped), so a
 * future surface can tell the user some reminders won't fire.
 */
export interface SchedulerCapped {
  type: 'SchedulerCapped';
  /** How many planned notifications were dropped by the cap. */
  dropped: number;
  /** Distinct rule ids that lost at least one notification to the cap. */
  ruleIds: string[];
}

// ── Adaptive coach — behaviour tracking ──────────────────────────────────────
// Emitted by the JourneyEngine (partial/reschedule hooks) and the
// BehaviorModelEngine (slip detector + insight refresh). Ids/enums/scalars ONLY —
// never the reason `note`, a goal/title, or any free text (G1/G2).

/**
 * A Step was worked on partially — touched but not completed (no celebration, no
 * Journey completion). Ids only. The BehaviorModelEngine records this as a `partial`.
 */
export interface StepPartial {
  type: 'StepPartial';
  journeyId: string;
  stepId: string;
}

/**
 * A Step's scheduled occurrence was moved (JourneyEngine.rescheduleStep — the Planner's
 * retime lever). Carries the new `plannedFor` as a single scalar epoch ms (allowed) plus
 * ids only — never any free text.
 */
export interface PlanAdapted {
  type: 'PlanAdapted';
  journeyId: string;
  stepId: string;
  /** Epoch ms the Step is now planned for. */
  plannedFor: number;
}

/**
 * A remaining Step was shed from scope so a deadline plan could be held — the AdaptivePlanner
 * load-shed lever, applied via JourneyEngine.dropStep. Ids only, no free text (G1/G2). The Step
 * is not deleted; it is simply excluded from completion, the actionable / week lists, progress,
 * and slip detection thereafter.
 */
export interface StepDropped {
  type: 'StepDropped';
  journeyId: string;
  stepId: string;
}

/**
 * The on-device InsightModel changed because a new {@link RawBehaviorRecord} landed. A
 * PURE signal — it deliberately carries NO derived values, because the InsightModel stays
 * on-device forever (G1). A consumer re-reads BehaviorModelEngine.getInsights() itself.
 */
export interface InsightUpdated {
  type: 'InsightUpdated';
}

/**
 * A Step's planned occurrence elapsed while it was still not done. First emitted by the
 * BehaviorModelEngine slip detector (`tick`) — its first real producer. Ids only; a
 * future InterventionEngine consumes it to decide a nudge.
 */
export interface StepMissed {
  type: 'StepMissed';
  journeyId: string;
  stepId: string;
}

/**
 * The adaptive coach re-planned a Journey's week and enacted the change (adaptive report→replan
 * loop). Emitted by AppCore.reviewWeek AFTER applyReplan, so a consumer knows the plan just moved.
 *
 * SECURITY-PRIVACY G1 — ENUMS/SCALARS ONLY: `adjustments` is the coarse {@link ReplanAdjustment}
 * kind list and `atRisk` a boolean. It deliberately carries NO Journey/Step title, NO reason note,
 * NO raw timestamp series, and NO narration text — the human copy is rendered on-device only. This
 * event is safe to observe/persist; it never widens what may leave the device.
 */
export interface WeekReplanned {
  type: 'WeekReplanned';
  journeyId: string;
  /** Coarse kinds of change the re-plan made (e.g. `['rescheduled','resized']`). Enum-only. */
  adjustments: ReplanAdjustment[];
  /** True when a deadline plan is still tight even after the re-plan (honest, never punishing). */
  atRisk: boolean;
}

// ── RESERVED events ─────────────────────────────────────────────────────────
// Declared-but-never-emitted contract members for deferred domains (profile /
// interests / intervention). They keep the DomainEvent vocabulary stable so a
// future engine can subscribe/emit with no union churn. NONE of these is emitted
// anywhere today — building the behavior behind them is out of scope.

/** RESERVED — not yet emitted. The derived user profile changed. Carries NO PII. */
export interface ProfileUpdated {
  type: 'ProfileUpdated';
}

/** RESERVED — not yet emitted. The user's chosen interest topics changed. */
export interface InterestsUpdated {
  type: 'InterestsUpdated';
}

/** RESERVED — not yet emitted. A future InterventionEngine scheduled a nudge. */
export interface InterventionScheduled {
  type: 'InterventionScheduled';
}

export type DomainEvent =
  | JourneyCreated
  | StepCheckedIn
  | JourneyCompleted
  | StepReportReversed
  | JourneyUpdated
  | JourneyDeleted
  | JourneyFrozen
  | JourneyResumed
  | DreamCreated
  | JourneyDreamLinked
  | JourneyDreamUnlinked
  | RewardGranted
  | BuddyReacted
  | BuddyEvolved
  | StreakChanged
  | ItemPurchased
  | ItemEquipped
  | MissionProgressed
  | MissionCompleted
  | MissionClaimed
  | LoginRewardClaimed
  | ReminderRuleAdded
  | ReminderRuleRemoved
  | SchedulingPrefsChanged
  | SchedulerCapped
  | StepPostponed
  | StepCancelled
  | ReminderRescheduled
  // Adaptive coach — behaviour tracking
  | StepPartial
  | PlanAdapted
  | StepDropped
  | InsightUpdated
  | StepMissed
  | WeekReplanned
  // RESERVED — not yet emitted (deferred domains)
  | ProfileUpdated
  | InterestsUpdated
  | InterventionScheduled;

export type DomainEventType = DomainEvent['type'];

/** Narrow the union to the single event shape for a given type string. */
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;
