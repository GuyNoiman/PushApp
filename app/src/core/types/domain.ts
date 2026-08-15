/**
 * Domain types — the official PushApp vocabulary as data structures.
 * Terminology is canonical (see 09_Product_Philosophy/Product_Terminology.md):
 * Dream · Journey · Step · Buddy · XP · Coins. Do not introduce synonyms.
 *
 * This file is pure TypeScript. No React, no UI, no vendor imports.
 */
import type { Entitlement } from './entitlement';
// Type-only cross-import (erased at runtime — no cycle): the on-device onboarding record (K2). The
// answer/step shapes + logic live under core/onboarding; AppState only stores them.
import type { OnboardingAnswers, OnboardingStep } from '../onboarding/model';
// Type-only cross-import (erased at runtime — no cycle): a Weekly Review proposal carries the
// SAME coarse adjustment kinds + per-Step diff the AdaptivePlanner already speaks.
import type { ReplanAdjustment, StepAdjustment } from '../learning/types';
// Type-only cross-import (erased at runtime — no cycle): the classified goal domain, so a parked
// goal can be routed back to the right expert on activation. Same source the coach's DeferredGoal uses.
import type { DomainId } from '../learning/experts/registry';

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
  /**
   * The id of the SINGLE predecessor Step this Step depends on (Step Dependencies, linear). When set,
   * this Step is LOCKED until the predecessor's derived status ({@link deriveStepStatus}) is
   * `completed`/`partially_completed` (see `core/status/stepDependencies.ts`, the single source of
   * dependency truth). Dependencies are linear (one predecessor), chained up to 3 Steps, and only ever
   * link Steps WITHIN THE SAME {@link Milestone}. Fail-open: a missing/unknown/`dropped` predecessor
   * counts as unlocked, so a dependent can never be permanently stranded. Optional/additive — a Step
   * without a dependency simply has none, so existing Journeys keep their current behaviour (no
   * migration needed). ON-DEVICE ONLY — a local ordering hint, never emitted or synced; covered by
   * export/deletion.
   */
  dependsOnStepId?: string;
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
 *
 * `future` (Future Journey Management) = a complete, APPROVED plan intentionally saved for later.
 * It is a STORED status, no longer derived from `createdAt` (the old display hack overloaded the
 * creation timestamp — PRD §3). A `future` Journey produces NO obligations: no Home Steps, no
 * reminders, no reports, no progress, and it is never swept by the inactivity freeze. It becomes
 * `active` through exactly one idempotent transition ({@link JourneyEngine.activateJourney}).
 */
export type JourneyStatus = 'active' | 'frozen' | 'completed' | 'abandoned' | 'future';

/**
 * The START MODE chosen at final approval of a Journey (Future Journey Management, §5) — exactly
 * one per Journey, never two:
 *  - `now` — Active immediately (today's only path; `createdAt` is also the start);
 *  - `scheduled` — Future until the stored absolute instant `at`, then activated by the clock;
 *  - `manual` — Future with no date until the user explicitly starts it.
 *
 * `at` is ABSOLUTE epoch ms so a DST shift or a device time-zone change can never move the user's
 * chosen instant; `timeZone` is the IANA zone captured at approval as CONTEXT ONLY (display), never
 * re-derived into an instant.
 */
export type JourneyStart =
  | { mode: 'now' }
  | { mode: 'scheduled'; at: number; timeZone?: string }
  | { mode: 'manual' };

/**
 * WHY a Journey is `frozen` (Account Inactivity Freeze, J5) — provenance on the SAME J3
 * frozen path, never a parallel state. `'manual'` = the user paused it (task J3); it is
 * NEVER auto-resumed. `'account_inactivity'` = the local {@link InactivityEngine} paused it
 * after a long absence (config/inactivityPolicy). Only the latter is offered for one-tap
 * resume on the return screen. Absent on a Journey that was never frozen; cleared on resume.
 * ON-DEVICE ONLY — never emitted or synced (the freeze events carry scalar counts only, G1).
 */
export type FreezeReason = 'manual' | 'account_inactivity';

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
   * in `components/journey/journeyView.ts`). New Journeys carry it explicitly. A snapshot persisted
   * before `'future'` existed can therefore never RESOLVE to `future` — the Future bucket is only
   * ever entered explicitly, at creation (Future Journey Management, §5).
   */
  status?: JourneyStatus;
  /**
   * The INTENDED start instant, absolute epoch ms (Future Journey Management, §5). Present on a
   * SCHEDULED Journey; absent on a manual-start Future Journey (it has no date) and on a Journey
   * that started now. IMMUTABLE once the plan is approved — it records the user's intention and is
   * NOT rewritten when the Journey actually starts (that is {@link activatedAt}), except by an
   * explicit reschedule while still `future` (§8). Every display/scheduling read goes through the
   * single `effectiveStartAt()` helper, never straight at this field. ON-DEVICE ONLY.
   */
  startsAt?: number;
  /**
   * The IANA time zone captured at approval (e.g. `Europe/Berlin`) — CONTEXT ONLY, so the app can
   * show the calendar meaning the user chose (Future Journey Management, §5/§13). {@link startsAt}
   * is already absolute, so the instant is NEVER re-derived from this zone: a DST change or a trip
   * cannot silently move the user's chosen start. Optional/additive.
   */
  startTimeZone?: string;
  /**
   * The ACTUAL activation instant, epoch ms (Future Journey Management, §9). Stamped ONCE by the
   * single Future → Active transition and never rewritten, so an early manual start is honestly
   * distinguishable from the recorded {@link startsAt} intention. Absent on a Journey that has not
   * been activated through that transition (including every legacy Journey). ON-DEVICE ONLY.
   */
  activatedAt?: number;
  /**
   * WHY this Journey is currently `frozen` (Account Inactivity Freeze, J5) — provenance ONLY,
   * meaningful when {@link status} is `frozen`. Defaults to `'manual'` for a user-paused Journey
   * (task J3) and is set to `'account_inactivity'` when the {@link InactivityEngine} froze it after
   * a long absence. Cleared (undefined) on resume. Optional/additive: a Journey persisted before this
   * field existed carries none, and migration backfills a legacy frozen Journey to `'manual'` (the
   * safe default — never auto-resumed). ON-DEVICE ONLY — never emitted or synced.
   */
  freezeReason?: FreezeReason;
  /**
   * The PRIMARY {@link Dream} this Journey serves — the authoritative, deterministic link used for
   * grouping (Home / Journeys eyebrow) and back-compat (Dream Management, D40). Optional: a Journey
   * may be unlinked until the coach links it (D40 — linking is NOT a hard gate). Old single-Dream
   * data keeps its Dream here as primary, so migration is lossless.
   */
  dreamId?: string;
  /**
   * Additional (SECONDARY) Dreams this Journey also serves (Dream Management, D40 — many-to-many with
   * one primary). Optional/additive: absent on the common single-Dream Journey. The relationship is
   * authoritative on the Journey side; {@link Dream} never stores a back-reference (derived on read
   * via `core/dreams/dreams.ts`). The FIRST UI slice exposes single-primary only, so this stays empty
   * in practice today, but the model + engine already honour it. No duplicates, and a Dream is never
   * both primary and secondary for the same Journey. ON-DEVICE ONLY — never emitted or synced.
   */
  secondaryDreamIds?: string[];
  /**
   * The ordered {@link Milestone}s grouping this Journey's Steps (Planner output, S1).
   * Optional — absent on manually-created or pre-Planner Journeys.
   */
  milestones?: Milestone[];
  /**
   * How this Journey was created (Journey Support Circle, D2). `'coach'` = built by the conversational
   * coach / Planner from a {@link GoalSpec} (Step titles are coach-generated template text, carrying no
   * user free text); `'manual'` = built by the "Build your own" wizard (Step titles are user-typed).
   * Optional/additive: absent on legacy Journeys, which are treated as `'manual'` — i.e. Companion-
   * INELIGIBLE. Only a `'coach'` Journey may offer the Companion bundle (system-generated Step progress
   * is safe to share; a manual Journey's user-typed titles must never reach Companion). ON-DEVICE marker.
   */
  createdVia?: 'coach' | 'manual';
  /**
   * How many Steps the Journey held at the moment it was ABANDONED (canceled) — snapshotted by
   * {@link JourneyEngine.abandonJourney} BEFORE the never-lived Steps are removed, and never
   * rewritten. It is the HONEST DENOMINATOR for a canceled Journey: without it, splicing the
   * unlived Steps away would turn "3 of 12 done" into "3 of 3" and render a full progress bar — a
   * Journey the user gave up on must never read as a success (Friend Profile PRD §4.2). Every
   * progress read for an abandoned Journey goes through it (`journeyProgress`, `toJourneyView`).
   * Optional/additive: absent on every Journey that was never abandoned. A plain count — no PII.
   */
  stepsAtAbandon?: number;
  /**
   * WHEN the Journey was ABANDONED (canceled), epoch ms — stamped ONCE by
   * {@link JourneyEngine.abandonJourney} alongside {@link stepsAtAbandon} and never rewritten (the
   * transition is terminal and idempotent, so there is no second write). It is the canceled
   * Journey's own date: the History surface shows "Stopped <date>" from it and orders history by
   * it, the way {@link completedAt} dates a finished Journey — and canceling deliberately never
   * stamps `completedAt`, so the two stay honestly apart. Optional/additive: absent on every
   * Journey that was never abandoned AND on one canceled before this field existed, which simply
   * shows no date and sorts last (never a fabricated or "Invalid" one). A plain timestamp — no PII;
   * it rides {@link AppState} for export/deletion and never enters a social payload.
   */
  abandonedAt?: number;
  /**
   * True once the Journey's COMPLETION reward has been granted (Daily Step Reporting, D36). Set the
   * first time every Step is done (in {@link JourneyEngine.checkInStep}) and never cleared — so a
   * reversal + re-completion cannot mint the completion XP/Coins twice (idempotent rewards; no
   * clawback either). Optional — a Journey completed before this field existed simply has none, and
   * a fresh completion sets it. Carries no PII.
   */
  completionRewarded?: boolean;
  /**
   * The durable {@link CompletionCard} minted the FIRST time this Journey completed (Completion
   * Celebration, I1). Built once (latched, like {@link completionRewarded}) in
   * {@link JourneyEngine.checkInStep} and never rewritten. Optional — absent until a Journey
   * completes (and absent on a legacy pre-feature completion until an explicit reopen builds one).
   * Holds SAFE FIELDS ONLY (see {@link CompletionCard}).
   */
  completionCard?: CompletionCard;
}

/**
 * The durable, shareable record of a completed {@link Journey} (Completion Celebration, I1). It is
 * NOT an Achievement from the global Achievement engine and must never be called one (PRD §3). It
 * powers the big completion ceremony and the reopenable "Share completion" action.
 *
 * SECURITY-PRIVACY (PRD §3, §6, §9, whitelist like {@link OutreachInsight}): this is a WHITELIST of
 * SAFE FIELDS ONLY. It must NEVER hold Step reports, a Step's `why`/reason data, private notes,
 * Dream information, or Ally names — nothing that reveals raw or sensitive content. Fields are ids,
 * timestamps, a version, and non-sensitive display counts. ON-DEVICE ONLY: covered by
 * export/deletion (cascades with the Journey), and WHITELIST-EXCLUDED from any social/sync payload.
 * Adding any field carrying raw content needs a fresh security-privacy review.
 */
export interface CompletionCard {
  /** The completed Journey this card belongs to. */
  journeyId: string;
  /** The Journey title SNAPSHOTTED at completion time (a late rename does not rewrite the card). */
  journeyTitleSnapshot: string;
  /** Epoch ms the Journey completed (the authoritative transition to `completed`). */
  completedAt: number;
  /** The {@link CARD_TEMPLATE_VERSION} the card was built under, so a variant set can be reconstructed. */
  templateVersion: number;
  /**
   * Epoch ms the big ceremony was first SHOWN, if it has been (Weekly-Review-style auto-open latch).
   * Absent ⇒ the ceremony is still pending. Legacy completions are stamped already-shown by
   * migration so the feature never retro-floods historical completions.
   */
  ceremonyShownAt?: number;
  /** Non-sensitive display count: how many in-scope (non-dropped) Steps the Journey held. */
  totalSteps: number;
  /** Non-sensitive display value: the Journey's planned duration in days. */
  durationDays: number;
}

/**
 * A long-term aspiration — the person the user wants to become. Never "completed" (no progress,
 * percentage, deadline, or reward — Dream Management PRD). The COACH owns this layer (D40): it
 * infers/formulates Dreams from the conversation and may create/edit/remove them without a user
 * approval gate.
 *
 * The Journey↔Dream relationship is authoritative on the JOURNEY side ({@link Journey.dreamId} +
 * {@link Journey.secondaryDreamIds}); a Dream deliberately holds NO `journeyIds` back-reference —
 * its Journeys are DERIVED on read (`core/dreams/dreams.ts` → `journeysForDream`) so there is a
 * single source of truth that can never drift. `description` carries the optional "why this matters".
 *
 * PRIVACY: Dreams are private account data. A Dream title must never enter a ProgressSummary,
 * OutreachInsight, social/Support-Circle payload, notification, or analytics signal (PRD §8, G2).
 * ON-DEVICE ONLY; covered by export/deletion.
 */
export interface Dream {
  id: string;
  title: string;
  /** Optional "why this matters" — the meaning behind the aspiration. */
  description?: string;
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
  /**
   * The user-chosen reminder MODE for this Journey (Journey Reminder Management, D40).
   * Optional and additive: a rule persisted before this field existed has none, so it is
   * resolved for backward-compat as `'fixed'` when {@link enabled} and `'off'` when not
   * ({@link resolveReminderRule}). `'smart'` is a reserved value — kept so a future
   * Smart-timing slice (gated on Weekly Review) can select it — but it is NOT selectable in
   * the current UI. `enabled` stays the single source of truth the scheduler reads; `'off'`
   * always pairs with `enabled: false`, so a mode-unaware scheduler behaves identically.
   */
  mode?: 'off' | 'fixed' | 'smart';
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
 * One weekday's Active-Hours entry: whether the app may contact the user that day
 * at all, and (when enabled) the allowed wall-clock window. An `enabled: false` day
 * allows NOTHING (no reminder is scheduled for it). A window whose start equals its
 * end means "all day" (no constraint), the canonical default (00:00 → 00:00). Cross-
 * midnight windows are honored via {@link AllowedWindow}.
 */
export interface DayActiveHours {
  enabled: boolean;
  window: AllowedWindow;
}

/**
 * Account-level **Active Hours** (D40) — the outer per-day boundary within which the
 * app may send optional Journey communications, set/edited from the Profile screen.
 * The single source of truth for the account window: when present it is authoritative
 * and the legacy {@link SchedulingPrefs.window} is not consulted; when absent the
 * legacy window (or all-day) applies. `mode` records the editor's view; the
 * availability helpers read `days` directly and are mode-agnostic.
 *
 *  - `days` is length 7, indexed by JS weekday (0=Sun … 6=Sat).
 *  - `mode: 'shared'` = every day carries the same enabled window (the editor shows
 *    one range); `mode: 'perDay'` = each day is independently enabled with its window.
 */
export interface ActiveHours {
  mode: 'shared' | 'perDay';
  days: DayActiveHours[];
}

/**
 * How the user wants their reminders TIMED (distinct from CommunicationPrefs, which
 * is per-channel opt-in). All-permissive by default so nothing changes until the
 * user sets a preference. Consumed by the CommunicationScheduler when it plans the
 * on-device notification set. No PII.
 */
export interface SchedulingPrefs {
  /**
   * Legacy account-level allowed firing window; undefined means any time of day.
   * SUPERSEDED by {@link activeHours} when that is present (single source of truth) —
   * kept so older snapshots load and behave unchanged.
   */
  window?: AllowedWindow;
  /**
   * Per-day account-level Active Hours (D40). Optional/additive: when undefined the
   * account behaves as all-day, all-days-enabled (falling back to the legacy
   * `window`), so pre-existing snapshots are unaffected. When present it is the
   * authoritative account window.
   */
  activeHours?: ActiveHours;
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

// ── Weekly Review (Weekly_Review_PRD, D40/D41) ──────────────────────────────
// One user-level experience generated at the WEEK BOUNDARY (week.ts). Deterministic — the
// analysis reuses the on-device AdaptivePlanner; the optional LLM narration seam is future
// (rides the live-coach gate). Persisted in the single encrypted AppState blob (PRD §13.7):
// cascade-deleted via resetToFirstRun() and included in exportStateJson().

/**
 * The past-week SUMMARY of a {@link WeeklyReview} (PRD §8 "Screen open: past-week summary").
 * Counts are the DERIVED Daily-Reporting statuses ({@link deriveStepStatus}) of the reviewed
 * week's Steps across ACTIVE Journeys only — a frozen Journey's days are NEVER counted as
 * non-completion (PRD §7); it is merely named in {@link frozenJourneyTitles}.
 */
export interface WeeklyReviewSummary {
  /** "X Steps done" — Steps checked in during the reviewed week. */
  completed: number;
  /** Steps reported Partial (a non-failure state) during the reviewed week. */
  partial: number;
  /** Steps let go ("couldn't") during the reviewed week. */
  notCompleted: number;
  /** Scheduled Steps in the reviewed week that received no terminal report. */
  unreported: number;
  /** Titles of Journeys frozen at week close — mentioned, excluded from next-week changes (§7). */
  frozenJourneyTitles: string[];
  /** Titles of Journeys that COMPLETED during the reviewed week — a celebratory mention (§8). */
  completedJourneyTitles: string[];
}

/**
 * The fallback branch chosen for the "Never an empty next week" guarantee (PRD §8):
 * `steps` — remaining Steps exist across active Journeys; `coachCta` — active Journeys but no
 * remaining Steps, hand off to the Coach to build a plan; `dreamSuggestion` — no active Journeys
 * at all, surface a Dream-based suggestion (an existing/unaddressed Dream). Every branch either
 * surfaces already-real data or hands off to the Coach — it NEVER fabricates a Journey or Step.
 */
export type WeeklyReviewNextWeekKind = 'steps' | 'coachCta' | 'dreamSuggestion';

/** The "next week" section of a {@link WeeklyReview}, resolved by the never-empty fallback chain. */
export interface WeeklyReviewNextWeek {
  kind: WeeklyReviewNextWeekKind;
  /** For `steps`: how many remaining Steps are already planned across active Journeys. */
  stepCount?: number;
  /** For `dreamSuggestion`: the Dream to suggest building a Journey from. */
  dreamTitle?: string;
  /** For `dreamSuggestion`: whether that Dream is already addressed by an (active) Journey. */
  dreamAddressed?: boolean;
}

/**
 * One Journey's proposed change inside a {@link WeeklyReview} — the coarse {@link ReplanAdjustment}
 * kinds plus the concrete forward-only {@link StepAdjustment} diff (the AdaptivePlanner output).
 * Only ACTIVE Journeys appear here; frozen / completed / abandoned Journeys are excluded from
 * next-week changes (PRD §7).
 */
export interface WeeklyReviewJourneyProposal {
  journeyId: string;
  journeyTitle: string;
  adjustments: ReplanAdjustment[];
  stepAdjustments: StepAdjustment[];
  atRisk: boolean;
}

/**
 * Resolution state of a {@link WeeklyReview}. `pending` awaits the user's outcome; `approved`
 * applied the diff (forward-only); `dismissed` kept the changes out (previous plan continues);
 * `expired` passed the 48-hour retention window unresolved (PRD §9); `superseded` was replaced
 * because another week closed first (PRD §9 "Never stack two competing actionable proposals").
 */
export type WeeklyReviewStatus = 'pending' | 'approved' | 'dismissed' | 'expired' | 'superseded';

/**
 * A generated Weekly Review for ONE closed week (PRD §11). Immutable review-period identity
 * (`id` + `weekKey`); the analysis result ({@link summary}, {@link nextWeek}, {@link proposals})
 * is separate from user-facing copy (rendered i18n-side). ON-DEVICE ONLY — carries Journey titles
 * for local display, so it is WHITELIST-EXCLUDED from any future sync/social payload (same footing
 * as the reason/behaviour logs); in scope for account deletion/export.
 */
export interface WeeklyReview {
  /** Immutable review-period id. */
  id: string;
  /** The {@link weekKey} of the CLOSED week this review covers. */
  weekKey: string;
  /** Epoch ms the review was generated — the 48-hour retention window is measured from here. */
  generatedAt: number;
  /** Epoch ms the screen was first opened (auto-open fires once, then the Home card persists). */
  openedAt?: number;
  summary: WeeklyReviewSummary;
  nextWeek: WeeklyReviewNextWeek;
  /** Per-Journey change proposals; EMPTY ⇒ a "no change" review (still shown — PRD §8). */
  proposals: WeeklyReviewJourneyProposal[];
  status: WeeklyReviewStatus;
  /** Epoch ms the review was resolved (approved / dismissed / expired), if it has been. */
  resolvedAt?: number;
}

// ── Smart Notification Timing (Smart_Notification_Timing_PRD) ────────────────────────────────
// The on-device evidence store behind the learned reminder time. Everything here is DERIVED
// scheduling state — wall-clock times and small counters. There is no free text, no Step title,
// no reason and no coach content, by construction.

/** A local wall-clock time of day, in the same `{hour, minute}` convention as {@link AllowedWindow}. */
export interface TimeOfDay {
  /** 0-23 */
  hour: number;
  /** 0-59 */
  minute: number;
}

/**
 * Which window a {@link TimingModel} learns for: a single JS weekday (0=Sun … 6=Sat) when the
 * reminder names its days, or `'*'` for a deliberately shared all-days window — PRD §5, "separate
 * per-day windows learn independently; a deliberately shared all-days window shares one model".
 */
export type TimingDayKey = number | '*';

/**
 * The classified result of one send (PRD §4). Only `positive` and `negative` are EVIDENCE; the
 * others deliberately never move the learned time:
 *  - `pending`      — the day is not over and nothing conclusive has happened yet;
 *  - `positive`     — the Journey was opened/viewed/acted on within the response window;
 *  - `neutral`      — no timely interaction, but the relevant Step was Completed/Partial later that
 *                     local day, which PRD §4 says PREVENTS a negative conclusion;
 *  - `negative`     — no Journey interaction and no Completed/Partial outcome that local day;
 *  - `contaminated` — another of OUR sends fell inside the window, or the app was already in the
 *                     foreground, so the response cannot be attributed to this send.
 */
export type TimingOutcome = 'pending' | 'positive' | 'neutral' | 'negative' | 'contaminated';

/**
 * How the app came to the foreground for a trial (PRD §4: "record tap vs organic foreground
 * separately; neither proves causality"). Recorded alongside the outcome, never folded into it.
 */
export type TimingResponseKind = 'tap' | 'organic' | 'none';

/**
 * A candidate time the user declined in Weekly Review, plus the size of the evidence set at the
 * moment they declined. PRD §5: "the same proposal is not repeated without new evidence" — so the
 * proposal engine skips this time until {@link TimingModel.eligibleCount} has moved on.
 */
export interface RejectedTimingCandidate extends TimeOfDay {
  /** {@link TimingModel.eligibleCount} when the rejection was recorded. */
  atEligibleCount: number;
}

/**
 * The learned timing state for ONE Journey/day window — the MINIMAL derived shape PRD §7 names
 * (eligible count, positive/negative aggregate, current/previous candidate, confidence, last
 * update, model version), so it is sync-ready the day a backend exists with no reshaping.
 *
 * SECURITY-PRIVACY G1 — ON-DEVICE ONLY today. Times + counters only; no titles, no reasons, no
 * coach content. WHITELIST-EXCLUDED from every sync/social path exactly like
 * {@link AppState.reasonLog}, and in scope for account export + deletion.
 */
export interface TimingModel {
  journeyId: string;
  /** The window this model learns (one weekday, or `'*'` for a shared all-days window). */
  dayKey: TimingDayKey;
  /** The user's OWN time — the fixed point the three-hour cap is measured from (PRD §5). */
  anchor: TimeOfDay;
  /** The time currently being evaluated. Equals {@link anchor} until a proposal is approved. */
  currentCandidate: TimeOfDay;
  /** The previously-evaluated time, kept as history (PRD §5 "preserve old evidence as history"). */
  previousCandidate?: TimeOfDay;
  /** {@link positive} as it stood for {@link previousCandidate}, so a revert can be justified. */
  previousPositive?: number;
  /** {@link negative} as it stood for {@link previousCandidate}. */
  previousNegative?: number;
  /** How many EVIDENCE trials (positive or negative) the current candidate has accumulated. */
  eligibleCount: number;
  positive: number;
  negative: number;
  /** Display-only 0..1 reading of how much evidence there is. NEVER gates a proposal. */
  confidence: number;
  /** Which way the next exploration step moves (PRD §5 "explore alternately later / earlier"). */
  exploreDirection: 'later' | 'earlier';
  /** Times the user declined, with the evidence size at rejection (PRD §5). */
  rejectedCandidates: RejectedTimingCandidate[];
  /**
   * IANA zone name the model was learned in (e.g. `Europe/Berlin`), when the device could report
   * one. PRD §9 requires a time-zone change to invalidate the candidate, and only the zone NAME is
   * unambiguous under DST. Coarse — treated as a location proxy and never leaves the device.
   */
  tzName?: string;
  lastUpdatedAt: number;
  /** Schema version of this model, so a future shape change can migrate rather than guess. */
  modelVersion: number;
}

/**
 * ONE send and what followed it — the raw operational evidence a {@link TimingModel} is derived
 * from. PRD §7 gives these BOUNDED retention (config/timingPolicy: newest few per model, hard-
 * dropped past four weeks) and keeps them out of social payloads and third-party analytics.
 *
 * SECURITY-PRIVACY G1 — ON-DEVICE ONLY, and never sync-eligible even when the derived
 * {@link TimingModel} becomes so. In scope for account export + deletion.
 */
export interface TimingTrial {
  /** `journeyId|dayKey` — the model this trial belongs to (core/timing/timingModel.ts). */
  modelKey: string;
  /** Epoch ms the send was SCHEDULED for. The response window is measured from here… */
  scheduledAt: number;
  /**
   * …unless the OS told us when it actually delivered. Local repeating triggers give no receipt,
   * so this is ALWAYS absent in MVP (PRD §4 anticipates exactly that and says use the scheduled
   * time); the field exists so a future delivery receipt needs no migration.
   */
  deliveredAt?: number;
  outcome: TimingOutcome;
  /** Tap vs organic foreground, kept SEPARATE from {@link outcome} (PRD §4). */
  responseKind?: TimingResponseKind;
  /** The Journeys this send covered (one today; an aggregate may cover several). */
  journeyIds: string[];
  /** IANA zone the trial was run in, when known — see {@link TimingModel.tzName}. */
  tzName?: string;
}

/**
 * The record of ONE detected account-inactivity freeze cycle (Account Inactivity Freeze, J5,
 * LOCAL-FIRST POC). Present + `resolved` falsy ⇒ there is a pending "welcome back" return the UI
 * should surface. It is stamped when the local {@link InactivityEngine} detects a gap of at least
 * the configured threshold (config/inactivityPolicy) and freezes the account's active Journeys.
 *
 * ON-DEVICE ONLY: scalar timestamps + a boolean, no titles or reasons; in scope for account
 * deletion/export and WHITELIST-EXCLUDED from any sync/social payload (same footing as
 * {@link AppState.reasonLog}, G1).
 */
export interface AccountInactivity {
  /** Epoch ms the freeze was detected (the gap crossed the threshold on this local beat). */
  frozenAt: number;
  /** Epoch ms the user was seen returning — the same beat that detected the freeze (POC). */
  returnedAt?: number;
  /** Epoch ms the return screen was first auto-opened, so it opens ONCE (mirrors weekly review). */
  returnOpenedAt?: number;
  /** True once the return is resolved (all away-frozen Journeys handled, or nothing to review). */
  resolved?: boolean;
}

/**
 * A goal the coach DETECTED in the user's opening but that the user chose NOT to build first
 * (Parked/deferred goals, L1). Persisted so the Journeys "For later" surface can show it and let the
 * user activate it into a real Journey next — the durable mirror of the coach's on-device
 * `DeferredGoal` (interviewPlaybook), with a stable `id` so the UI can list / activate / dismiss it.
 * The `processType` union is redeclared inline (rather than importing the coach's `GoalKind`) to keep
 * this base types file from depending on the coach layer.
 *
 * SECURITY-PRIVACY G1 — ON-DEVICE ONLY: `title` is the user's own raw framing; it must NEVER be copied
 * into a DomainEvent, a ProgressSummary, or any sync/analytics path (same footing as {@link ReasonEntry.note}).
 * A goal in a SENSITIVE domain is never parked (filtered at capture, L1). In scope for account
 * deletion/export (lives in the AppState blob).
 */
export interface ParkedGoal {
  id: string;
  /** Short title in the user's framing. ON-DEVICE-ONLY. */
  title: string;
  /** The shape of work understood — a recurring habit or a staged process. */
  processType: 'recurring' | 'process';
  /** The classified domain, so activating it routes to the right expert. */
  domain: DomainId;
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
   * The page the first-run flow should RESUME at if interrupted (Onboarding_Questionnaire_PRD §8:
   * "closing and reopening resumes at the same position"). Undefined ⇒ start at the beginning.
   * ON-DEVICE only; irrelevant once `onboardingCompletedAt` is set.
   */
  onboardingStep?: OnboardingStep;
  /**
   * The user's onboarding questionnaire answers (K2) — the Coach's opening context (PRD §9). Private
   * on-device adaptation preferences + optional free text (PRD §10): never social, never analytics,
   * cascade-deleted/exported with the account. Undefined until the user answers anything.
   */
  onboardingAnswers?: OnboardingAnswers;
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
   * Goals the coach detected but the user chose NOT to build first (Parked/deferred goals, L1).
   * Surfaced on the Journeys "For later" tab so the user can activate one into a real Journey or
   * dismiss it. Optional so an older snapshot loads without it (backfilled to `[]` in
   * AppCore.migrateState).
   *
   * SECURITY-PRIVACY G1 — ON-DEVICE ONLY. A {@link ParkedGoal}'s `title` is the user's raw framing and
   * must NEVER enter a DomainEvent, a ProgressSummary, or any sync path (same footing as {@link reasonLog}).
   * A SENSITIVE-domain goal is never parked (filtered at capture). In scope for account deletion/export.
   */
  parkedGoals?: ParkedGoal[];
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
  /**
   * The {@link weekKey} of the current week as of the last week-boundary check (Weekly Review,
   * D40). This is the per-WEEK gate — distinct from the per-Journey daily {@link weekReviewAt} — so
   * ONE Weekly Review is generated per closed week and re-opening the app never regenerates it.
   * Undefined on a fresh install; the first `syncTime` records the current key WITHOUT generating
   * (there is no closed week to review yet). Optional so an older snapshot loads without it.
   */
  lastWeeklyReviewKey?: string;
  /**
   * The single current {@link WeeklyReview} — the pending proposal awaiting an outcome, or the last
   * resolved/expired/superseded one (Weekly Review, D40). At most ONE is ever held: when another
   * week closes first, the older pending review is marked `superseded` and replaced (PRD §9). Only
   * populated when the adaptive loop is enabled. ON-DEVICE ONLY — WHITELIST-EXCLUDED from any sync
   * path; in scope for account deletion/export.
   */
  weeklyReview?: WeeklyReview;
  /**
   * Epoch ms of the last AUTHENTICATED activity the {@link InactivityEngine} observed — the anchor
   * the inactivity gap is measured from (Account Inactivity Freeze, J5). ABSENT on a fresh install
   * or a legacy snapshot, so the first tick simply SEEDS `now` and never instantly freezes (grace on
   * first sight). Refreshed to `now` on every tick.
   *
   * SECURITY-PRIVACY G1 — ON-DEVICE ONLY. A local scheduling anchor; never copied into a DomainEvent
   * (the freeze events carry scalar counts only), a ProgressSummary, or any sync path. In scope for
   * account deletion/export.
   */
  lastAuthenticatedActivityAt?: number;
  /**
   * The pending/last account-inactivity freeze cycle (Account Inactivity Freeze, J5, LOCAL-FIRST
   * POC). Present + unresolved ⇒ the return experience is pending. Absent until the first freeze is
   * detected. ON-DEVICE ONLY (same G1 footing as {@link lastAuthenticatedActivityAt}); in scope for
   * account deletion/export.
   */
  accountInactivity?: AccountInactivity;
  /**
   * The DERIVED learned reminder timing, one {@link TimingModel} per Journey/day window (Smart
   * Notification Timing, PRD §7). Optional so an older snapshot loads without it (backfilled to
   * `[]` in AppCore.migrateState). Only ever populated when the `smartTiming` flag is on.
   *
   * SECURITY-PRIVACY G1 — ON-DEVICE ONLY. Times + counters, no free text. WHITELIST-EXCLUDED from
   * every sync path — it must never enter a DomainEvent, a ProgressSummary, a social payload or a
   * third-party analytics event (same footing as {@link reasonLog}). In scope for account
   * export + deletion, which it gets by living here rather than in its own store.
   */
  timingModels?: TimingModel[];
  /**
   * The RAW timing trials the models above are derived from (PRD §7 "raw operational events have
   * bounded retention"). Optional so an older snapshot loads without it (backfilled to `[]` in
   * AppCore.migrateState). Pruned to the newest few per model and hard-dropped past four weeks
   * (config/timingPolicy).
   *
   * SECURITY-PRIVACY G1 — ON-DEVICE ONLY, FOREVER: unlike the derived {@link timingModels} these
   * are NEVER sync-eligible, not even once a backend exists. WHITELIST-EXCLUDED from every sync
   * path; in scope for account export + deletion.
   */
  timingTrials?: TimingTrial[];
  /**
   * Epoch ms the app last entered the foreground (Smart Notification Timing, PRD §4 — the general
   * communication-response signal). Absent until the first foreground under the `smartTiming` flag.
   *
   * SECURITY-PRIVACY G1 — ON-DEVICE ONLY. A single local scheduling scalar; never copied into a
   * DomainEvent, a ProgressSummary or any sync path. In scope for account export + deletion.
   */
  lastForegroundAt?: number;
}
