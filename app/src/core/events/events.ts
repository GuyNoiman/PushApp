/**
 * DomainEvent union — the vocabulary the engines speak over the EventBus.
 * Engines never call each other directly; they emit and react to these events
 * (Engineering Bible §7 event-driven). Pure TS — no React/UI/vendor imports.
 */
import type { Buddy, BuddyStage, CheckIn, Journey, LeverId, ReasonId, ReminderRule, Step } from '../types/domain';

export interface JourneyCreated {
  type: 'JourneyCreated';
  journey: Journey;
}

export interface StepCheckedIn {
  type: 'StepCheckedIn';
  journeyId: string;
  step: Step;
  checkIn: CheckIn;
}

export interface JourneyCompleted {
  type: 'JourneyCompleted';
  journey: Journey;
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

/** The user postponed a Step (kept it, will move it). Drives persistence. No `done` change. */
export interface StepPostponed {
  type: 'StepPostponed';
  journeyId: string;
  stepId: string;
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
  | RewardGranted
  | BuddyReacted
  | BuddyEvolved
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
  // RESERVED — not yet emitted (deferred domains)
  | ProfileUpdated
  | InterestsUpdated
  | InterventionScheduled;

export type DomainEventType = DomainEvent['type'];

/** Narrow the union to the single event shape for a given type string. */
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;
