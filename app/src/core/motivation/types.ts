/**
 * motivation/types — the shape of the first slice of the Personalized Motivation Engine
 * (`04_Product/PRD/Motivation_First_Slice_PRD.md`).
 *
 * The line this slice is drawn along: **say only what the app already knows for certain.** Every
 * number here was COUNTED by the app, never estimated — which is why there is no baseline, no
 * formula to disclose, and no way for a sentence to carry a figure nobody can check. Money,
 * consumption and health metrics are deliberately absent; they need a baseline the user enters, and
 * that is its own feature.
 *
 * PRIVACY: nothing in this module holds user-authored text. The facts are counts and ids; the log is
 * ids and verdicts. That is what lets the whole thing live in `AppState` — inside the export and
 * inside the account wipe — without a single extra line in either path.
 *
 * Pure TypeScript — no React, no i18n, no vendor imports.
 */

/** The four moments that can make somebody eligible for a card. No others (PRD §3 Q5). */
export type MotivationTrigger = 'sustained' | 'returned' | 'milestone' | 'quiet';

/**
 * What a card may offer to open. AT MOST ONE, and only when a genuinely useful destination exists —
 * an item with no honest door has none, and the card never invents one to earn a tap (PRD §3 Q13).
 */
export type MotivationDoor = 'journey' | 'today';

/** `progress` carries a number the app counted; `encouragement` carries none. */
export type MotivationFamily = 'progress' | 'encouragement';

/**
 * The facts a card may speak, all derived from what the app itself recorded. An optional field that
 * is `undefined` means "the app does not know this right now" — and an item that needs it is simply
 * not eligible, which is the whole truth mechanism: an item cannot be SELECTED without its facts, so
 * it can never be SHOWN with an invented one.
 */
export interface MotivationFacts {
  /** Steps reported done across every Journey, ever. */
  stepsDoneTotal: number;
  /** Steps reported done since the start of the local week. */
  stepsDoneThisWeek: number;
  /** The day streak. */
  streakDays: number;
  /** How many Journeys are running right now. */
  runningJourneys: number;
  /** The Journey this card is about, when one stands out. */
  journeyId?: string;
  /** That Journey's title — shown in the card, never stored in the log. */
  journeyTitle?: string;
  /** Whole days since that Journey started. */
  daysMoving?: number;
  /** That Journey's completion as a whole percentage, 0..100. */
  journeyProgressPct?: number;
  /** Steps left before that Journey's current Milestone is complete. */
  stepsToMilestone?: number;
  /** Whole days since the last Step was reported done; undefined when none ever was. */
  daysSinceLastDone?: number;
  /** A Step was reported done after a missed one, within the last week. */
  returnedAfterMiss: boolean;
}

/** The fact fields an item's sentence can require. */
export type MotivationFactKey = Extract<
  keyof MotivationFacts,
  | 'stepsDoneTotal'
  | 'stepsDoneThisWeek'
  | 'streakDays'
  | 'daysMoving'
  | 'journeyProgressPct'
  | 'stepsToMilestone'
  | 'daysSinceLastDone'
  | 'journeyTitle'
>;

/**
 * One catalog entry — DATA, never code (configuration-before-code). `id` is the stable feedback key
 * AND the i18n key group; `version` is bumped when the MEANING changes, which retires the feedback
 * gathered about the old meaning rather than carrying a verdict about a different sentence.
 */
export interface MotivationItem {
  id: string;
  version: number;
  family: MotivationFamily;
  /** Groups items for the 7-day theme cooldown, so two ways of saying one thing do not stack. */
  theme: string;
  trigger: MotivationTrigger;
  /** Facts the sentence needs. A missing one makes the item ineligible, never blank. */
  requires: readonly MotivationFactKey[];
  door?: MotivationDoor;
}

/**
 * One entry in the on-device log: what was shown, and what — if anything — the person said about it.
 * `verdict` absent means it was shown and not answered, which is NOT a dislike (PRD §3 Q7).
 * `dismissed` is "not now" and carries no opinion about the content.
 */
export interface MotivationLogEntry {
  itemId: string;
  /** The item's theme at the time, so a cooldown can be applied without re-reading the catalog. */
  theme: string;
  version: number;
  /** Epoch ms it was shown. */
  at: number;
  verdict?: 'helpful' | 'notHelpful' | 'dismissed';
}

/** A selected card, ready for the copy layer to give words to. */
export interface MotivationSelection {
  item: MotivationItem;
  facts: MotivationFacts;
  /** True when this is the card already shown today, rather than a fresh selection. */
  alreadyShownToday: boolean;
}
