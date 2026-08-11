/**
 * Domain types — the official PushApp vocabulary as data structures.
 * Terminology is canonical (see 09_Product_Philosophy/Product_Terminology.md):
 * Dream · Journey · Step · Buddy · XP · Coins. Do not introduce synonyms.
 *
 * This file is pure TypeScript. No React, no UI, no vendor imports.
 */
import type { Entitlement } from './entitlement';

/** How often a Step is meant to recur. A Step may be one-time or repeating. */
export type Cadence = 'once' | 'daily' | 'weekly';

/** The overall rhythm the user commits to for a Journey (duration/rhythm). */
export type Rhythm = 'daily' | 'few-times-week' | 'weekly';

/** Buddy evolution stages, egg → guardian. Thresholds live in config/buddyStages.ts. */
export type BuddyStage = 'egg' | 'hatchling' | 'sprout' | 'companion' | 'guardian';

/**
 * A condition that must hold for a reminder to be worth firing (Miss-Recovery
 * slice). A discriminated union — designed to GROW (energy/equipment/low-noise
 * later) exactly like {@link ReminderTrigger}. V1 supports only `location`: a
 * home-only Step should not nudge the user when they are away.
 */
export type Constraint = {
  kind: 'location';
  /** The place the Step needs. `'home'` is the V1 value; the slot is open to grow. */
  place: 'home' | string;
};

/** The smallest unit of progress inside a Journey. Always belongs to one Journey. */
export interface Step {
  id: string;
  title: string;
  description?: string;
  /** The first, deliberately-easy Step that gets the user moving. */
  isStarterStep: boolean;
  /** Planned pace hint for this Step (metadata; Steps are completed once). */
  cadence: Cadence;
  /** Epoch ms of the most recent check-in on this Step, if any. */
  lastCheckInAt?: number;
  done: boolean;
  /**
   * Minutes the Step is expected to take (Miss-Recovery slice). Optional — existing
   * Steps stay valid. Lets recovery only propose a time when a slot actually fits,
   * and powers the Reshape lever (a long Step + "No time" → offer to shrink).
   */
  estimatedDuration?: number;
  /**
   * Conditions that gate whether a reminder for this Step is worth firing
   * (Miss-Recovery slice). Optional and extensible; V1 supports a `location` place.
   */
  constraints?: Constraint[];
  /**
   * Epoch ms the Planner scheduled this occurrence for (adaptive coach, S1). Optional —
   * a manually-created Step (or a pre-Planner Journey) simply has none.
   */
  plannedFor?: number;
  /** The {@link Milestone} (mid-layer) this Step belongs to, when the Journey has Milestones. */
  milestoneId?: string;
  /** Relative difficulty 1..5 the Planner/DomainExpert assigned. Optional metadata. */
  difficulty?: number;
  /**
   * True once the adaptive coach shed this Step from scope to hold a deadline
   * (AdaptivePlanner load-shed, applied via JourneyEngine.dropStep). A dropped Step is
   * NOT deleted (history is preserved) but is excluded from completion, the actionable /
   * week lists, progress, and slip detection. Optional — an unshed Step simply has none.
   */
  dropped?: boolean;
  /**
   * Epoch ms this occurrence is postponed UNTIL — the per-occurrence "remind me later" target
   * (Step Postponement, D37). Set by {@link JourneyEngine.postponeStep}; drives the lightweight
   * "postponed to <time>" affordance. "Postponed" is an ACTION, not a status (D37.1) — the Step
   * stays `unreported`. Cleared by any FINAL report (Done/Partial/Couldn't) or a Journey
   * freeze/complete/delete. ON-DEVICE ONLY — never emitted or synced; covered by export/deletion.
   */
  postponedUntil?: number;
  /**
   * How many times THIS occurrence has been postponed without a final report yet (Step
   * Postponement, D37 §5 — per occurrence, not per day/week). Persisted so a later Weekly-Review /
   * intervention can read the signal; no threshold fires in MVP. Reset when the occurrence gets a
   * final report. ON-DEVICE ONLY — covered by export/deletion. No PII.
   */
  postponeCount?: number;
  /** Epoch ms the most recent postpone was recorded (Step Postponement, D37). ON-DEVICE ONLY. */
  postponedAt?: number;
  /**
   * The OS notification id of the per-occurrence one-shot postpone reminder (Step Postponement,
   * D37). Held on the Step so the reminder can be cancelled on re-postpone or on any final report.
   * Empty/undefined when none is pending (or permission was off, so nothing was scheduled).
   * ON-DEVICE ONLY — an opaque local scheduler id, never emitted or synced; covered by
   * export/deletion.
   */
  postponeNotificationId?: string;
  /**
   * Epoch ms the Step's report was last CLEARED (Daily Step Reporting reversal, D36). Stamped by
   * {@link JourneyEngine.reverseReport} when the user moves a Step back out of a terminal report
   * (e.g. un-completes it or marks it "not reported yet"). A clear SUPERSEDES any earlier terminal
   * `reasonLog`/CheckIn row for status derivation ({@link deriveStepStatus}): rows older than this
   * mark no longer determine the current status, but they are KEPT as append-only history (no XP
   * clawback, no data lost). Optional — a Step that was never reversed simply has none.
   */
  lastReportClearedAt?: number;
}

/**
 * A Milestone — the mid-layer object between a Journey and its Steps (adaptive coach, S1).
 * The Planner groups Steps into an ordered arc of Milestones. Optional and additive: a
 * Journey created before Milestones existed (or by the manual flow) simply has none, so
 * existing Journeys stay valid. Terminology is canonical — Milestone, never "Phase".
 */
export interface Milestone {
  id: string;
  title: string;
  /** 0-based position within the Journey. */
  order: number;
  /** Optional relative effort/importance weight the Planner uses to size the arc. */
  weight?: number;
}

/**
 * The lifecycle state of a Journey — the SOURCE OF TRUTH for which tab it appears under on the
 * Journeys screen and for freeze/resume (J3). `active` = in progress; `frozen` = paused by the
 * user without losing progress (resumable — J3); `completed` = every Step done; `abandoned` = let
 * go (reserved — deletion currently removes the Journey outright rather than soft-marking it).
 * The `future` display bucket (a Journey scheduled to begin later) is derived from `createdAt`, not
 * a stored status, so it transitions to `active` on its own when the start time passes.
 */
export type JourneyStatus = 'active' | 'frozen' | 'completed' | 'abandoned';

/** A finite transformation — the core object of PushApp. */
export interface Journey {
  id: string;
  title: string;
  /** An optional short description of what this Journey is about. */
  description?: string;
  /** The user's "why" — one or more reasons this Journey matters to them. */
  why: string[];
  durationDays: number;
  rhythm: Rhythm;
  steps: Step[];
  createdAt: number;
  completedAt?: number;
  /**
   * Lifecycle status — the authoritative field the Journeys tabs bucket by. Optional for
   * backward-compat with Journeys persisted before this field existed: a missing status is
   * resolved to `completed` when `completedAt` is set, else `active` (see `resolveJourneyStatus`
   * in `components/journey/journeyView.ts`). New Journeys carry it explicitly.
   */
  status?: JourneyStatus;
  /** Optional link to the long-term Dream this Journey serves. */
  dreamId?: string;
  /**
   * The ordered {@link Milestone}s grouping this Journey's Steps (Planner output, S1).
   * Optional — absent on manually-created or pre-Planner Journeys.
   */
  milestones?: Milestone[];
  /**
   * True once the Journey's COMPLETION reward has been granted (Daily Step Reporting, D36). Set the
   * first time every Step is done (in {@link JourneyEngine.checkInStep}) and never cleared — so a
   * reversal + re-completion cannot mint the completion XP/Coins twice (idempotent rewards; no
   * clawback either). Optional — a Journey completed before this field existed simply has none, and
   * a fresh completion sets it. Carries no PII.
   */
  completionRewarded?: boolean;
}

/** A long-term aspiration — the person the user wants to become. Never "completed". */
export interface Dream {
  id: string;
  title: string;
  description?: string;
  journeyIds: string[];
}

/** The user's companion. Not the user, not merely an avatar. Grows with XP; holds Coins. */
export interface Buddy {
  name: string;
  xp: number;
  level: number;
  stage: BuddyStage;
  coins: number;
  /** Ids of Shop cosmetics the user has purchased (see config/shopItems.ts). */
  ownedCosmetics: string[];
  /** The single cosmetic currently worn on the Buddy, or null when none. */
  equippedCosmetic: string | null;
}

/** A recorded check-in against a Step. */
export interface CheckIn {
  id: string;
  journeyId: string;
  stepId: string;
  at: number;
}

/** Progress + claim state for a single Mission (definitions live in config/missions.ts). */
export interface MissionProgress {
  /** How far toward the Mission's target the user has advanced. */
  progress: number;
  /** True once the Coins reward has been claimed (blocks a second claim). */
  claimed: boolean;
}

/**
 * The Missions "return loop" state. Progress is keyed by Mission id; the reset
 * markers let the engine roll daily Missions over each day and weekly ones each
 * week without a background timer (recomputed from the runtime clock on read).
 */
export interface MissionsState {
  /** Per-Mission progress/claim, keyed by Mission id. */
  progress: Record<string, MissionProgress>;
  /** Local date key (YYYY-MM-DD) daily Missions were last reset on. */
  dailyResetKey: string;
  /** Week key (the week's Monday, YYYY-MM-DD) weekly Missions were last reset on. */
  weeklyResetKey: string;
}

/** Daily-login reward tracking (Coins only; the amounts live in config/loginReward.ts). */
export interface LoginState {
  /** Local date key (YYYY-MM-DD) the reward was last claimed on, or null. */
  lastClaimedKey: string | null;
  /** Zero-based index of the NEXT reward in the login cycle. */
  dayIndex: number;
}

/**
 * What fires a reminder. A discriminated union so a rule can grow new trigger
 * kinds without changing existing callers. Only `fixedTime` is live today; the
 * `calendar`/`location` variants are DORMANT reserved seams (their gateways are
 * inert, flags off) — their payloads are intentionally minimal placeholders and
 * must pass security-privacy + store review before being enabled.
 */
export type ReminderTrigger =
  | {
      kind: 'fixedTime';
      /** 0-23 local hour. */
      hour: number;
      /** 0-59 local minute. */
      minute: number;
      /**
       * Days of the week this fires on, in JS `Date.getDay()` convention
       * (0=Sunday … 6=Saturday). Omitted/empty means every day (a plain daily).
       */
      weekdays?: number[];
    }
  | {
      /** RESERVED (dormant) — fire relative to a calendar event. Placeholder payload. */
      kind: 'calendar';
      /** Minutes before the event to fire. */
      minutesBefore?: number;
    }
  | {
      /** RESERVED (dormant) — fire on arriving at / leaving a place. Placeholder payload. */
      kind: 'location';
      /** Whether the trigger is on arrival or departure. */
      transition?: 'enter' | 'exit';
    };

/**
 * A user's reminder for a Journey. Owns the scheduled OS notification ids so the
 * rule can be cancelled/rescheduled cleanly. On-device only — no reminder content
 * ever leaves the device.
 */
export interface ReminderRule {
  id: string;
  journeyId: string;
  trigger: ReminderTrigger;
  title: string;
  body: string;
  enabled: boolean;
  /** OS notification ids scheduled for this rule (may be several, one per weekday). */
  scheduledNotificationIds: string[];
}

/**
 * How the user has chosen to be contacted. All default ON except the two
 * OS-permission opt-ins (location/calendar), which start OFF and never turn on
 * without an explicit, reviewed opt-in (red-line R2). No PII.
 */
export interface CommunicationPrefs {
  remindersEnabled: boolean;
  socialCheerEnabled: boolean;
  socialNudgeEnabled: boolean;
  /** Opt-in for location-triggered reminders (dormant seam). Default false. */
  locationOptIn: boolean;
  /** Opt-in for calendar-triggered reminders (dormant seam). Default false. */
  calendarOptIn: boolean;
}

/** Which part of the day the user prefers to be contacted in. */
export type DayPart = 'morning' | 'evening' | 'either';

/**
 * The ALLOWED window a reminder may fire in, as local wall-clock bounds. Stored as
 * the *allowed* range (not a quiet range); firing times outside it are clamped to
 * the nearest edge, never dropped. May cross midnight (e.g. 22:00 → 06:00), which
 * the scheduling helpers handle explicitly.
 */
export interface AllowedWindow {
  start: { hour: number; minute: number };
  end: { hour: number; minute: number };
}

/**
 * How the user wants their reminders TIMED (distinct from CommunicationPrefs, which
 * is per-channel opt-in). All-permissive by default so nothing changes until the
 * user sets a preference. Consumed by the CommunicationScheduler when it plans the
 * on-device notification set. No PII.
 */
export interface SchedulingPrefs {
  /** Optional allowed firing window; undefined means any time of day. */
  window?: AllowedWindow;
  /** Preferred part of day; 'either' applies no day-part constraint. */
  dayPart: DayPart;
  /** Preferred weekdays in JS `Date.getDay()` convention (0=Sun … 6=Sat); empty = all days. */
  preferredDays: number[];
}

// ── Miss-Recovery — reasons, levers, and the per-user reason log ─────────────
// The user says WHAT HAPPENED (a closed reason); a rules engine (config, not AI)
// maps the reason to a LEVER that changes the next reminder / plan. The reason list
// and the reason→lever mapping are config-before-code (config/reasons.ts,
// config/levers.ts) — never hard-coded in an engine. Lever names are INTERNAL to
// the taxonomy (a reserved Intervention-domain vocabulary); the user-facing history
// label is "see past reasons", never "Mirror" (which would collide with Reflection).

/** The closed set of reasons a Step didn't happen (source of truth: config/reasons.ts). */
export type ReasonId =
  | 'forgot'
  | 'no_time'
  | 'lost_motivation'
  | 'too_hard'
  | 'did_partially'
  | 'couldnt'
  | 'not_relevant'
  | 'other';

/** The internal lever taxonomy a reason maps to (source of truth: config/levers.ts). */
export type LeverId =
  | 'retime'
  | 'refrequency'
  | 'retone'
  | 'rally'
  | 'reconnect_why'
  | 'reshape'
  | 'mirror'
  | 'grace';

/** The two Screen-1 choices: keep-and-move (postpone) or let-this-occurrence-go (cancel). */
export type PostponeAction = 'postpone' | 'cancel';

/** What actually happened to the Step as a result of the chosen lever(s). */
export type ReasonOutcome = 'rescheduled' | 'partial' | 'accepted' | 'edited' | 'logged';

/**
 * One structured record in the per-user reason history — the seed of the "learn the
 * user" data and the source for the "see past reasons" view. Minimal and structured
 * from day one: ids + enums + a timestamp, so a future Profiling/Analytics layer can
 * consume it. NO PII beyond the optional on-device `note` (see below).
 *
 * SECURITY-PRIVACY G6 (forward): this log — INCLUDING `note` — must be in scope for
 * account deletion/export when that lands (E3 P7).
 */
export interface ReasonEntry {
  id: string;
  stepId: string;
  journeyId: string;
  reasonId: ReasonId;
  /** The lever(s) the rules engine resolved for this reason (placeholders included). */
  leverIds: LeverId[];
  outcome: ReasonOutcome;
  /** Epoch ms the reason was captured. */
  at: number;
  /**
   * The Screen-1 action this entry was recorded under (Daily Step Reporting, D36) — keep-and-move
   * (`postpone`) or let-this-occurrence-go (`cancel`). Optional so an older entry (written before
   * this field existed) still loads. Recorded by the RecoveryEngine so status derivation
   * ({@link deriveStepStatus}) can tell a `not_completed` report (a `couldnt`/cancel) from a
   * `did_partially` note precisely, without re-deriving from the reason id alone. Enum only, no PII.
   */
  action?: PostponeAction;
  /**
   * The free-text captured for a report that reveals a note — the `other` reason AND the optional
   * `did_partially` (Partial) note (Daily Step Reporting, D36). Both are on the SAME on-device-only
   * footing.
   *
   * SECURITY-PRIVACY G1 — ON-DEVICE ONLY, FOREVER. This string must NEVER be copied
   * into a DomainEvent, a ProgressSummary, an OutreachInsight, a log line, or any
   * Profiling/Analytics signal. It never leaves the device. Moving it anywhere needs a
   * fresh security-privacy review. The reason→lever code must never read it into an event.
   *
   * This same G1 rule covers, verbatim, EVERY on-device-only raw signal of the adaptive
   * coach: coach conversation text, {@link RawBehaviorRecord} rows, and the exact
   * goal/title specifics of a Journey/Step. None of these may leave the device; only the
   * enum/bucket {@link OutreachInsight} projection may (via deriveOutreachInsight).
   */
  note?: string;
}

// ── Adaptive coach — on-device signal, derived model, minimal outreach projection ──
// A privacy boundary in three layers (S0.5/S0.6). RawBehaviorRecord is the ON-DEVICE-ONLY
// raw signal; InsightModel is the ON-DEVICE derived model the adaptive engine consumes;
// OutreachInsight is the ONE minimal, server-eligible projection. The single chokepoint
// where data becomes server-eligible is deriveOutreachInsight (core/insights). Nothing
// crosses that line except enums, buckets, booleans, opt-in prefs, and a pseudonymous uid.

/**
 * A single raw behavioural signal about one Step occurrence — the seed of the adaptive
 * coach's "learn the user" data. Structured (ids + enum + timestamps) from day one so the
 * on-device InsightModel can be derived from it.
 *
 * SECURITY-PRIVACY G1 — ON-DEVICE ONLY, FOREVER (same invariant as {@link ReasonEntry.note}).
 * A RawBehaviorRecord — and any raw timestamp series built from it — must NEVER be copied
 * into a DomainEvent, a ProgressSummary, an OutreachInsight, a log line, or any sync path.
 * It never leaves the device. Only the bucketed {@link OutreachInsight} may leave, and only
 * via deriveOutreachInsight. In scope for account deletion/export (G6) when that lands.
 */
export interface RawBehaviorRecord {
  id: string;
  stepId: string;
  journeyId: string;
  /** The Milestone (mid-layer object) this Step belongs to, if any. */
  milestoneId?: string;
  /** What happened to the occurrence. */
  kind: 'done' | 'partial' | 'couldnt' | 'slipped' | 'postponed';
  /** Epoch ms the signal was recorded. */
  at: number;
  /** Epoch ms the occurrence was planned for, if it was scheduled. */
  plannedFor?: number;
  /** Actual minutes spent, when known (e.g. a timed session). */
  actualMinutes?: number;
}

/**
 * The DERIVED model the adaptive engine consumes, computed on-device from
 * {@link RawBehaviorRecord}s (deriveInsights). It MAY be richer than what ever leaves the
 * device — because it never does. STAYS ON DEVICE (G1). Only {@link OutreachInsight} is
 * server-eligible.
 */
export interface InsightModel {
  /** Per-Milestone reliability, 0..1 = done / total occurrences for that Milestone. */
  reliabilityByMilestone: Record<string, number>;
  /** 0..1 share of occurrences that slipped. */
  slipRate: number;
  /** Which part of day the user actually completes Steps in. */
  preferredDaypart: DayPart;
  /** Mean minutes of a typical completed session (0 when unknown). */
  typicalSessionMinutes: number;
  /** 0..1 = planned occurrences completed on-plan / planned occurrences. */
  paceRatio: number;
  /** True when the user is trending toward falling off (slips/pace/recency). */
  atRisk: boolean;
  /** Epoch ms of the most recent raw signal, or null when there is none. */
  lastActivityAt: number | null;
  /** Whole days between {@link lastActivityAt} and `now` (0 when there is none). */
  daysSinceLastActivity: number;
}

/** Coarse engagement bucket for outreach. Enum only — no raw activity dates. */
export type EngagementState = 'active' | 'cooling' | 'dormant';
/** Coarse streak bucket for outreach. Enum only — no exact streak length. */
export type StreakBucket = 'none' | 'building' | 'strong';
/**
 * Coarse proximity of a goal deadline (cert exam, event, …). Generalized from the
 * exam-only original. Enum only — the exact target date never leaves the device.
 */
export type TargetProximity = 'none' | 'far' | 'weeks' | 'days' | 'past';

/** Preferred contact window for outreach — a coarse day-part, never exact wall-clock times. */
export type ContactWindow = DayPart;

/**
 * Which channels outreach may use. Booleans only — mirrors the {@link CommunicationPrefs}
 * opt-ins, carries no PII.
 */
export interface ChannelPrefs {
  push: boolean;
  social: boolean;
}

/**
 * The MINIMAL, server-eligible projection of the on-device {@link InsightModel} — the ONLY
 * adaptive-coach artefact allowed to leave the device (later, behind an InsightGateway).
 *
 * SECURITY-PRIVACY (G2, data minimization Bible §8): this is a WHITELIST, exactly like
 * {@link ProgressSummary}. Every field is an enum, a bucket, a boolean, an opt-in pref, a
 * pseudonymous uid, or a single scalar timestamp — NEVER free text, coach conversation
 * text, an exact goal/title, or a raw timestamp series. Never add a field that carries any
 * of those without a fresh security-privacy review. deriveOutreachInsight is the single
 * chokepoint that produces this.
 */
export interface OutreachInsight {
  /** Pseudonymous account id (not an email, name, or handle). */
  uid: string;
  engagementState: EngagementState;
  slippageFlag: boolean;
  streakBucket: StreakBucket;
  contactWindow: ContactWindow;
  channelPrefs: ChannelPrefs;
  /** Coarse deadline proximity; omitted/`'none'` when there is no tracked goal date. */
  targetProximity?: TargetProximity;
  /** Epoch ms the user was last nudged, if ever (a single scalar — never a series). */
  lastNudgeAt?: number;
  /** Epoch ms this projection was computed. */
  updatedAt: number;
}

/** The full persisted application state (offline-first). */
export interface AppState {
  dreams: Dream[];
  journeys: Journey[];
  buddy: Buddy;
  checkIns: CheckIn[];
  missions: MissionsState;
  login: LoginState;
  /** User-defined reminders (on-device local notifications). */
  reminderRules: ReminderRule[];
  /** How the user wants to be contacted (reminders / social / opt-ins). */
  communicationPrefs: CommunicationPrefs;
  /** How the user wants reminders timed (window / day-part / weekdays). */
  schedulingPrefs: SchedulingPrefs;
  /**
   * The prominent day-count streak (StreakEngine, founder decision D26.4). Counts up on the
   * first check-in of a new calendar day and resets to 0 when an URGENT Step is missed.
   * Optional so an older snapshot loads without it (backfilled to 0 in AppCore.migrateState).
   */
  streak?: number;
  /**
   * Local date key (YYYY-MM-DD) of the day the streak last counted a check-in, or null when it
   * has never counted / was just reset. Guards the once-per-day increment. Optional so an older
   * snapshot loads without it (backfilled to null in AppCore.migrateState). No PII.
   */
  lastActiveDay?: string | null;
  /**
   * Epoch ms onboarding was completed, or undefined if the user has not yet
   * finished it. A pre-existing persisted snapshot (from before onboarding
   * existed) is backfilled to a nonzero timestamp so existing users never see it.
   */
  onboardingCompletedAt?: number;
  /**
   * Local account-tier state (types/entitlement.ts). Optional so an older
   * persisted snapshot loads without it and resolves to the `free` default
   * (backfilled in AppCore.migrateState). Holds ONLY the local dev/POC trial
   * on-device; a server `subscriber` tier is read live via EntitlementGateway,
   * never stored here. Carries NO PII.
   */
  entitlement?: Entitlement;
  /**
   * The per-user Miss-Recovery reason history (Miss-Recovery slice). Optional so an
   * older snapshot loads without it (backfilled to `[]` in AppCore.migrateState).
   *
   * SECURITY-PRIVACY: this log is ON-DEVICE ONLY and is WHITELIST-EXCLUDED from the
   * Social sync path — SocialProvider must never read it, and no reason/reflection
   * data ever enters a ProgressSummary (G2). The JourneyEngine caps it to a rolling
   * window per Step (G5); a future Profiling layer may derive only coarse aggregates
   * from it, never raw records and never the `note`.
   */
  reasonLog?: ReasonEntry[];
  /**
   * The adaptive coach's ON-DEVICE raw behaviour log (adaptive coach, S1.16). Optional so
   * an older snapshot loads without it (backfilled to `[]` in AppCore.migrateState). Only
   * populated when the `adaptiveCoach` flag is on; the BehaviorModelEngine hydrates from it
   * on load and writes {@link BehaviorModelEngine.getRawLog} back through the save path.
   *
   * SECURITY-PRIVACY G1 — ON-DEVICE ONLY, FOREVER. A {@link RawBehaviorRecord} must NEVER be
   * copied into a DomainEvent, a ProgressSummary, an OutreachInsight, a log line, or any sync
   * path. WHITELIST-EXCLUDED from the Social path exactly like {@link reasonLog}. In scope for
   * account deletion/export (G6) when that lands.
   */
  behaviorLog?: RawBehaviorRecord[];
  /**
   * The adaptive coach's DERIVED on-device {@link InsightModel} (adaptive coach, S1.16),
   * recomputed from {@link behaviorLog} on each change and cached here. Optional; only
   * populated when the `adaptiveCoach` flag is on. STAYS ON DEVICE (G1) — only the bucketed
   * {@link OutreachInsight} is ever server-eligible.
   */
  insightModel?: InsightModel;
  /**
   * Per-Journey epoch ms of the last adaptive week-review (report→replan loop). Powers the
   * once-per-calendar-day cadence gate so a Journey is not re-planned repeatedly in a day.
   * Optional so an older snapshot loads without it (backfilled to `{}` in AppCore.migrateState).
   *
   * SECURITY-PRIVACY G1 — ON-DEVICE ONLY. These timestamps are a local scheduling ledger; they
   * are NEVER copied into a DomainEvent (WeekReplanned carries none), a ProgressSummary, or any
   * sync path.
   */
  weekReviewAt?: Record<string, number>;
}
