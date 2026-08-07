/**
 * deriveConstraints — the pure bridge from an EXISTING {@link Journey} + the user's
 * {@link SchedulingPrefs} to the {@link PlanConstraints} the {@link replan} re-planner consumes
 * (adaptive report→replan loop). It owns NO planning logic and NO side effects; it only reads the
 * two inputs and returns the constraint shape. Same inputs → identical output (deterministic).
 *
 * Habit vs finite (founder decision): `rhythm === 'daily'` ⇒ an open-ended HABIT — no
 * `targetDate`, so `replan` runs its "shrink toward the floor to rebuild momentum" open-ended
 * path. Any other rhythm ⇒ a FINITE goal that back-solves to a deadline of
 * `createdAt + durationDays × one day`.
 *
 * `weeklyAvailabilityMinutes` is an APPROXIMATION derived from the remaining (not-done,
 * not-dropped) Steps' `estimatedDuration`: the total remaining minutes, spread across the
 * Journey's own week span for a finite goal (a rough "pace the user signed up for"), or taken as
 * a single week's worth for a habit. It is deliberately generous so the feasibility check never
 * sheds scope spuriously on the founder's demo device; a future slice can replace it with a real
 * availability signal. No PII — minutes / epoch ms / weekday indices only.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { Journey, SchedulingPrefs, Step } from '../types/domain';
import type { PlanConstraints } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Fallback minutes for a remaining Step that carries no `estimatedDuration`. */
const DEFAULT_STEP_MINUTES = 20;

/** Whether a Step still counts toward remaining work (not done, not shed by load-shedding). */
function isRemaining(step: Step): boolean {
  return !step.done && !step.dropped;
}

/**
 * Compute the {@link PlanConstraints} for re-planning `journey` under the user's `prefs`.
 * See the file header for the habit/finite rule and the availability approximation.
 */
export function deriveConstraints(journey: Journey, prefs: SchedulingPrefs): PlanConstraints {
  const isHabit = journey.rhythm === 'daily';
  const targetDate = isHabit ? undefined : journey.createdAt + journey.durationDays * MS_PER_DAY;

  const remaining = journey.steps.filter(isRemaining);
  const remainingMinutes = remaining.reduce(
    (sum, s) => sum + (s.estimatedDuration ?? DEFAULT_STEP_MINUTES),
    0,
  );
  // Spread the remaining work across the Journey's own week span (finite), or treat it as one
  // week's worth (habit). Rounded, and never below the single lightest Step so capacity > 0.
  const weeks = isHabit ? 1 : Math.max(1, journey.durationDays / 7);
  const weeklyAvailabilityMinutes = Math.max(
    DEFAULT_STEP_MINUTES,
    Math.round(remainingMinutes / weeks),
  );

  return {
    ...(targetDate !== undefined ? { targetDate } : {}),
    weeklyAvailabilityMinutes,
    preferredDays: prefs.preferredDays,
    // SchedulingPrefs.dayPart and PlanConstraints.daypart share the same DayPart union — a rename.
    daypart: prefs.dayPart,
  };
}
