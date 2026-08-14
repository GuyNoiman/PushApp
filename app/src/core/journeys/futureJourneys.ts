/**
 * futureJourneys — the framework-free read model for Journeys saved for later (Future Journey
 * Management). It holds the LIST ORDER the Future tab renders (§7) and the CAPACITY read the
 * creation path and the Coach gate on (§10). Pure selectors: they never touch state, ids, the clock,
 * or the event bus — the {@link JourneyEngine} does that.
 *
 * A Future Journey is a complete, approved plan that is simply inactive. There is deliberately NO
 * progress, no "overdue", and no failure language here — nothing in this module derives any.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import { FUTURE_JOURNEY_POLICY } from '../config/futureJourneys';
import type { Journey } from '../types/domain';
import { isFuture } from '../util/journeyStatus';

/** How full the Future list is, and what the UI/Coach may offer at that fill level (§10). */
export interface FutureCapacity {
  /** How many Journeys currently sit in the `future` status. */
  count: number;
  /** The hard maximum from {@link FUTURE_JOURNEY_POLICY}. */
  max: number;
  /** How many more may be saved for later (never negative). */
  slotsRemaining: number;
  /** At the cap: nothing is silently replaced — the user starts, edits, reschedules, or removes one. */
  capReached: boolean;
  /** The Coach MAY offer an optional relevance review at/above the threshold. An offer, never a nag. */
  offerReview: boolean;
}

/**
 * The Future Journeys in DISPLAY order (§7): scheduled ones first by NEAREST planned start, then the
 * manual-start ones (no date — "Start when ready") in their existing array order. The sort is stable,
 * so two Journeys sharing a start instant keep their relative order.
 */
export function listFutureJourneys(journeys: readonly Journey[]): Journey[] {
  const future = journeys.filter(isFuture);
  return future
    .map((journey, index) => ({ journey, index }))
    .sort((a, b) => {
      const aAt = a.journey.startsAt;
      const bAt = b.journey.startsAt;
      // A manual-start Journey (no instant) always sorts after every scheduled one.
      if (aAt == null && bAt == null) return a.index - b.index;
      if (aAt == null) return 1;
      if (bAt == null) return -1;
      return aAt - bAt || a.index - b.index;
    })
    .map((entry) => entry.journey);
}

/**
 * How full the Future list is (§10). Only the `future` status counts — an active, frozen, or
 * completed Journey never consumes a slot, and starting/removing one frees its slot immediately
 * (there is no separate ledger to keep in sync; the count is always derived).
 */
export function futureCapacity(journeys: readonly Journey[]): FutureCapacity {
  const count = journeys.reduce((total, journey) => total + (isFuture(journey) ? 1 : 0), 0);
  const { max, reviewThreshold } = FUTURE_JOURNEY_POLICY;
  return {
    count,
    max,
    slotsRemaining: Math.max(0, max - count),
    capReached: count >= max,
    offerReview: count >= reviewThreshold,
  };
}
