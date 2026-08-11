/**
 * journeyStatus — the SINGLE pure resolution of a Journey's lifecycle status, so the
 * framework-free engines (Weekly Review, the adaptive report→replan loop) and the UI
 * (`components/journey/journeyView`) never disagree on whether a Journey is `active`,
 * `frozen`, `completed`, or `abandoned`.
 *
 * Trusts the explicit {@link Journey.status} when set; otherwise derives it for Journeys
 * persisted before the field existed — `completed` when `completedAt` is set, else `active`.
 * (Kept in sync with the JSDoc on `Journey.status`.)
 *
 * Pure TS — no React, no vendor imports, no clock reads.
 */
import type { Journey, JourneyStatus } from '../types/domain';

export function resolveJourneyStatus(journey: Journey): JourneyStatus {
  if (journey.status) return journey.status;
  return journey.completedAt ? 'completed' : 'active';
}
