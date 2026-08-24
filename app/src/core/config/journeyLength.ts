/**
 * How long a Journey may be planned for — one number, in one place.
 *
 * THE DECISION (founder, 2026-08-25): **up to sixty days, and any number inside that.** Not a menu of
 * three lengths: "up to 60" means ten days is a Journey and fifty days is a Journey, and the app
 * should not make somebody round their own life to the nearest month.
 *
 * WHAT IT REPLACES. The creation wizard offered 30 / 60 / 90 and the coach's horizon question offered
 * the same three, which contradicted his own guidance that a Journey is planned for up to two months.
 * The ninety was not a considered exception — it was the third chip in a row of three.
 *
 * IT IS A PLANNING CEILING, NOT A LIFETIME ONE. A Journey may still run longer than sixty days: an
 * approved postponement extends the end date, there is no cap on extensions (Step_Postponement_02),
 * and that is a different thing entirely. What is bounded here is the length somebody may commit to
 * at the moment they have not started yet — which is exactly when an optimistic number does the most
 * damage.
 *
 * Pure TypeScript — no React, no i18n, no clock reads.
 */

/** The longest a Journey may be planned for at creation. */
export const MAX_JOURNEY_DAYS = 60;

/** The shortest. One day is not a Journey; a week is the smallest thing with a shape. */
export const MIN_JOURNEY_DAYS = 7;

/**
 * The lengths offered as one tap. Everything between {@link MIN_JOURNEY_DAYS} and
 * {@link MAX_JOURNEY_DAYS} is still reachable — these are the two most people mean.
 */
export const OFFERED_JOURNEY_DAYS: readonly number[] = [30, MAX_JOURNEY_DAYS];

/** Hold a requested length inside the allowed range. A number outside it is corrected, never refused. */
export function clampJourneyDays(days: number): number {
  if (!Number.isFinite(days)) return MAX_JOURNEY_DAYS;
  return Math.min(MAX_JOURNEY_DAYS, Math.max(MIN_JOURNEY_DAYS, Math.round(days)));
}
