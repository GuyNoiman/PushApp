/**
 * Urgency helper — the pure "no slack left this week" test the streak rule leans on
 * (founder decision D26.4). A Journey is at an URGENT point when the sessions it still
 * needs this week are at least the days still left in the week, so every remaining day
 * must carry a session — one miss and the weekly target can no longer be hit.
 *
 * No helper for this existed in the engine (the adaptive coach's own "at risk" reads the
 * derived InsightModel, a different signal), so this is a small new pure helper. It reads the week
 * boundary from the ONE authoritative week service (`util/week`), so "this week" here is exactly the
 * user's configured week (D33), not a hardcoded Monday. Pure TS — no React/vendor imports; the caller
 * injects `now`.
 */
import type { StreakConfig } from '../config/streak';
import type { Journey } from '../types/domain';
import { remainingDaysInWeek as weekRemainingDays, startOfWeek } from './week';

/** Days still left in the user's week, including today (7 on the start day … 1 on its last day). */
export function remainingDaysInWeek(now: number): number {
  return weekRemainingDays(now);
}

/** How many of the Journey's Steps were completed within the current (user-configured) week. */
export function sessionsCompletedThisWeek(journey: Journey, now: number): number {
  const weekStart = startOfWeek(now);
  return journey.steps.filter(
    (s) => s.done && s.lastCheckInAt !== undefined && s.lastCheckInAt >= weekStart && s.lastCheckInAt <= now,
  ).length;
}

/** Sessions the Journey still needs this week to hit its rhythm's target (never below zero). */
export function remainingRequiredSessions(journey: Journey, now: number, config: StreakConfig): number {
  const required = config.requiredSessionsPerWeek[journey.rhythm];
  return Math.max(0, required - sessionsCompletedThisWeek(journey, now));
}

/**
 * Whether a miss on this Journey RIGHT NOW is URGENT — i.e. the week has no slack left.
 * Founder phrased the rule as `remaining-days-in-week == remaining-required-sessions`;
 * generalized to `>=` so an already-over-committed week (more required than days left)
 * also counts as urgent rather than silently passing. A Journey that has already met its
 * weekly target (remaining required = 0) is never urgent.
 */
export function isUrgentMiss(journey: Journey, now: number, config: StreakConfig): boolean {
  const remaining = remainingRequiredSessions(journey, now, config);
  return remaining > 0 && remaining >= remainingDaysInWeek(now);
}

/**
 * What a Step's Journey means for the STREAK right now, as one shared derivation (Open Work 1.1).
 *
 * The streak rule itself is unchanged (D26.4) — this only NAMES the two sides of the existing
 * {@link isUrgentMiss} test so a surface can show the difference instead of leaving the user to
 * infer it from a number that moved:
 *
 *   • `recommended` — the week still has slack. Doing this today is the suggestion; missing it
 *     costs the streak NOTHING, because another day this week can still carry the session.
 *   • `binding`     — no slack is left. Every remaining day must carry a session, so this is the
 *     one that holds the week together, and a miss is what the streak rule reacts to.
 *
 * This is a naming of the SAME predicate, deliberately — a second definition in the UI is exactly
 * how the shown label and the applied rule drift apart.
 */
export type StreakRole = 'recommended' | 'binding';

/** {@link StreakRole} for a Journey at `now` — `binding` iff a miss right now would be urgent. */
export function streakRole(journey: Journey, now: number, config: StreakConfig): StreakRole {
  return isUrgentMiss(journey, now, config) ? 'binding' : 'recommended';
}
