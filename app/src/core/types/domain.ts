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
}

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
  /** Optional link to the long-term Dream this Journey serves. */
  dreamId?: string;
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
}
