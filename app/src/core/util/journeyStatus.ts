/**
 * journeyStatus — the SINGLE pure resolution of a Journey's lifecycle status, so the
 * framework-free engines (Weekly Review, the adaptive report→replan loop) and the UI
 * (`components/journey/journeyView`) never disagree on whether a Journey is `active`,
 * `frozen`, `completed`, `abandoned`, or `future`.
 *
 * Trusts the explicit {@link Journey.status} when set; otherwise derives it for Journeys
 * persisted before the field existed — `completed` when `completedAt` is set, else `active`.
 * (Kept in sync with the JSDoc on `Journey.status`.)
 *
 * It also owns the ONE POSITIVE predicate every "is this Journey running?" gate must use
 * ({@link isRunning}). Writing those gates as negations (`!completedAt`, `status !== 'frozen'`)
 * makes every new lifecycle state leak by default and the compiler cannot catch it — Future
 * Journey Management added `future`, which must produce no Steps, reminders, or reports at all.
 *
 * Pure TS — no React, no vendor imports, no clock reads.
 */
import type { Journey, JourneyStatus } from '../types/domain';

export function resolveJourneyStatus(journey: Journey): JourneyStatus {
  if (journey.status) return journey.status;
  return journey.completedAt ? 'completed' : 'active';
}

/**
 * Is this Journey RUNNING right now — i.e. does it produce obligations (actionable Steps, reminders,
 * slip detection, weekly review, the active count)? True ONLY for `active`; a `frozen` (paused, J3),
 * `completed`, `abandoned`, or `future` (not started yet) Journey produces none. A legacy Journey with
 * no `status` and no `completedAt` resolves to `active`, so it keeps running exactly as before.
 */
export function isRunning(journey: Journey): boolean {
  return resolveJourneyStatus(journey) === 'active';
}

/** Is this a Future Journey — a complete plan saved for later, not yet started (PRD §5)? */
export function isFuture(journey: Journey): boolean {
  return resolveJourneyStatus(journey) === 'future';
}

/**
 * The instant a Journey's timeline is anchored to for DISPLAY and week math (Future Journey
 * Management, §5). Precedence: the ACTUAL activation ({@link Journey.activatedAt}) when it has
 * started, else the INTENDED start ({@link Journey.startsAt}) while it is still Future, else
 * `createdAt` — which is what every Journey created before this feature (and every "start now"
 * Journey) legitimately started at. `createdAt` therefore stays creation-only (PRD §14.3): it is
 * merely the fallback, never overwritten to mean "start".
 */
export function effectiveStartAt(journey: Journey): number {
  return journey.activatedAt ?? journey.startsAt ?? journey.createdAt;
}
