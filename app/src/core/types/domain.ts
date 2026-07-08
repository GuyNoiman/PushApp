/**
 * Domain types — the official PushApp vocabulary as data structures.
 * Terminology is canonical (see 09_Product_Philosophy/Product_Terminology.md):
 * Dream · Journey · Step · Buddy · XP · Coins. Do not introduce synonyms.
 *
 * This file is pure TypeScript. No React, no UI, no vendor imports.
 */

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
  cadence: Cadence;
  /** Epoch ms of the most recent check-in on this Step, if any. */
  lastCheckInAt?: number;
  done: boolean;
}

/** A finite transformation — the core object of PushApp. */
export interface Journey {
  id: string;
  title: string;
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

/** The full persisted application state (offline-first). */
export interface AppState {
  dreams: Dream[];
  journeys: Journey[];
  buddy: Buddy;
  checkIns: CheckIn[];
  missions: MissionsState;
  login: LoginState;
}
