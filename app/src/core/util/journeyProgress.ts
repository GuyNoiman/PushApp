/**
 * journeyProgress — the SINGLE pure count of a Journey's Steps, so the engine, the Journeys
 * cluster and the completion card can never disagree about how far someone got.
 *
 * They used to, in three different ways. `JourneyEngine.journeyProgress` and
 * `buildCompletionCard` both excluded dropped Steps; `toJourneyView` counted the raw array. A
 * Journey whose adaptive replan dropped two Steps therefore read one percentage on the Journeys
 * card and a different one in the engine — and could show 80% on screen while minting a
 * completion card built from another denominator. Same class of defect as the Milestone count
 * (Device QA 2026-08-17, A1), fixed the same way: one derivation, three callers.
 *
 * Two rules, and both exist because a number here is a claim about someone's effort:
 *
 *  - A DROPPED Step is out of scope — it counts toward neither the numerator nor the
 *    denominator. The adaptive coach dropped it; the user never declined it.
 *  - A CANCELED Journey is measured against {@link Journey.stepsAtAbandon} — the count it had at
 *    the moment the user let it go. Canceling splices the unlived Steps away and marks the rest
 *    dropped, so the in-scope math would read a triumphant 100% for a Journey that was
 *    abandoned. A cancel must never render as a success.
 *
 * Pure TS — no React, no vendor imports, no clock reads (Engineering Bible §19).
 */
import type { Journey } from '../types/domain';

/** How many Steps a Journey is measured against, how many are done, and the resulting ratio. */
export interface JourneyStepCounts {
  /**
   * The Steps this Journey is measured against: its in-scope (non-dropped) Steps, or the count it
   * carried at cancellation for an abandoned Journey.
   */
  totalSteps: number;
  /** Done Steps, counted on the same basis as {@link totalSteps}. */
  doneSteps: number;
  /** {@link doneSteps} over {@link totalSteps} in [0,1]; 0 when there is nothing to measure. */
  progress: number;
}

/**
 * Count one Journey's Steps. The one place either rule above is written, so a surface that wants
 * "3 of 12" and an engine that wants 0.25 are reading the same two numbers.
 */
export function journeyStepCounts(journey: Journey): JourneyStepCounts {
  // Canceled: the honest denominator is what the user was carrying when they stopped. Every Step
  // that kept a report survives the cancel undropped, so the numerator is a plain `done` count.
  const atAbandon = journey.stepsAtAbandon;
  if (atAbandon !== undefined) {
    const doneSteps = journey.steps.filter((s) => s.done).length;
    return {
      totalSteps: atAbandon,
      doneSteps,
      progress: atAbandon === 0 ? 0 : doneSteps / atAbandon,
    };
  }

  const inScope = journey.steps.filter((s) => !s.dropped);
  const doneSteps = inScope.filter((s) => s.done).length;
  return {
    totalSteps: inScope.length,
    doneSteps,
    progress: inScope.length === 0 ? 0 : doneSteps / inScope.length,
  };
}
