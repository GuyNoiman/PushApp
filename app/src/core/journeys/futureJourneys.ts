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

/**
 * WHICH of the three "not started yet" states a Future Journey is in, for display only (§7).
 *
 * `ready` is the deliberate third state: a scheduled Journey whose instant has passed but which has
 * not been activated yet — the app was closed, or the account was inside an inactivity freeze that
 * blocks activation. It is NOT late and NOT overdue; the plan is simply waiting. Nothing in this
 * module derives urgency, and no surface built on it may add any.
 */
export type FutureStartState =
  | { kind: 'scheduled'; at: number }
  | { kind: 'ready'; at: number }
  | { kind: 'manual' };

export function futureStartState(journey: Journey, now: number): FutureStartState {
  if (journey.startsAt == null) return { kind: 'manual' };
  return journey.startsAt > now
    ? { kind: 'scheduled', at: journey.startsAt }
    : { kind: 'ready', at: journey.startsAt };
}

/**
 * The absolute instant `days` from `now`, at {@link FUTURE_JOURNEY_POLICY.defaultStartHour} local
 * time — what the creation surfaces store as {@link Journey.startsAt} for a scheduled start.
 *
 * Days are added on the CALENDAR (via the Date constructor), never as milliseconds, so a start that
 * crosses a DST boundary still lands on the day the user picked. The result is an absolute epoch
 * instant from then on: the stored `startTimeZone` is context only and is never used to re-derive it.
 */
export function startInstantInDays(days: number, now: number): number {
  const today = new Date(now);
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + days,
    FUTURE_JOURNEY_POLICY.defaultStartHour,
    0,
    0,
    0,
  ).getTime();
}

/** What starting a Future Journey RIGHT NOW would mean — the confirmation's facts (§9). */
export interface StartNowPreview {
  /** The instant it would actually begin (the effective start). */
  startsAt: number;
  /** Where its window would then end, by the same rule the Journey card and detail already use. */
  endsAt: number;
  /**
   * How many whole days EARLIER than the recorded intention this start is. 0 when the Journey has no
   * date, or when its instant has already passed — starting a Journey whose day has come around is
   * not early, and nothing about it shifts.
   */
  earlyByDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Preview the "Start Journey" action (§9) so the confirmation can state the effective start and, for
 * a scheduled Journey started early, the plan shift the user is agreeing to. Pure: it computes, it
 * never activates — {@link JourneyEngine.activateJourney} is still the only writer.
 */
export function previewStartNow(journey: Journey, now: number): StartNowPreview {
  const aheadMs = journey.startsAt != null ? journey.startsAt - now : 0;
  return {
    startsAt: now,
    endsAt: now + journey.durationDays * DAY_MS,
    // At least a whole day whenever the start really is ahead, so a few hours early never reads "0".
    earlyByDays: aheadMs > 0 ? Math.max(1, Math.round(aheadMs / DAY_MS)) : 0,
  };
}
