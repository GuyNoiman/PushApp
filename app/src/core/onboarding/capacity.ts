/**
 * capacity — what onboarding's Q6 answer means to the agent that BUILDS a Journey (D82).
 *
 * The question is "how much room do you realistically have for this right now?", and until this
 * file existed its answer reached nothing at all: it was collected, stored, exported and deleted
 * with the account, and never once changed a plan. So somebody who said they had a few minutes a
 * day could still be handed a plan that needs five hours a week — and the app would have asked the
 * question purely to look like it was listening.
 *
 * ── WHY THREE OF THE SIX OPTIONS MAP TO NOTHING ────────────────────────────────────────────────
 *
 * The plan's `weeklyAvailabilityMinutes` is a CEILING. Three answers name one:
 *
 *   "a few minutes on most days" · "a short amount of time a few times a week" · "about half an hour
 *   on most days"
 *
 * The other three do not, and turning them into a number would be the app inventing a commitment
 * nobody made:
 *
 *   - **"I can invest more when needed"** says there is no ceiling — not that there is a large one.
 *   - **"it changes a lot from week to week"** says a single number is the wrong shape for the
 *     answer. Picking the average would quietly plan for a week this person may not get.
 *   - **"I do not know yet"** is not a quantity.
 *
 * For those three the derivation falls through to exactly what it did before, which is the honest
 * outcome: no signal, no constraint.
 *
 * ── AND WHY THESE NUMBERS ARE ROUND ────────────────────────────────────────────────────────────
 *
 * They are read off the option's own words and nothing else — "a few minutes on most days" is about
 * ten minutes, six days. There is no data behind a more precise figure, and a precise-looking one
 * would imply there was. They are config, tuned here and nowhere else.
 *
 * Pure TypeScript — no React, no i18n, no vendor imports.
 */

/** The Q6 option ids, as `core/onboarding/questions.ts` declares them. */
export type OnboardingCapacity =
  | 'fewMinutes'
  | 'shortFewTimes'
  | 'halfHour'
  | 'moreWhenNeeded'
  | 'changesWeekly'
  | 'dontKnow';

/**
 * Weekly minutes each capacity answer implies, or `undefined` where the answer names no ceiling.
 * See the file header for why half of these are deliberately absent.
 */
export const CAPACITY_WEEKLY_MINUTES: Record<OnboardingCapacity, number | undefined> = {
  /** ~10 minutes, most days of the week. */
  fewMinutes: 60,
  /** ~20 minutes, three times a week. */
  shortFewTimes: 60,
  /** ~30 minutes, most days of the week. */
  halfHour: 180,
  /** No ceiling named — not a large one. */
  moreWhenNeeded: undefined,
  /** A single number is the wrong shape for this answer. */
  changesWeekly: undefined,
  /** Not a quantity. */
  dontKnow: undefined,
};

/**
 * The weekly-minutes ceiling this person's onboarding answer implies, or `undefined` when it
 * implies none — including when they skipped the question, or when a stored answer is from a
 * version of Q6 that no longer exists.
 */
export function weeklyMinutesForCapacity(capacity: string | undefined): number | undefined {
  if (!capacity) return undefined;
  return CAPACITY_WEEKLY_MINUTES[capacity as OnboardingCapacity];
}
