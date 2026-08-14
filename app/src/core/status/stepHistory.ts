/**
 * stepHistory — the SINGLE pure answer to "did anything actually happen on this Step?".
 *
 * Two shipped paths remove Steps and both must agree on the same test, or a Step that carries a real
 * record could be spliced away by one path and preserved by the other: {@link JourneyEngine.updateJourney}
 * (a J1 edit that drops a Step) and {@link JourneyEngine.abandonJourney} (the cancel — unlived Steps go,
 * lived Steps stay, marked `dropped`). The UI needs the same test a THIRD time, to tell the user how many
 * Steps a cancel will remove BEFORE they confirm it (Journey Abandonment PRD §8.4.2 — informed consent
 * about data removal, never leverage). Rather than let a display copy of the rule drift from the engine's,
 * both read this.
 *
 * Pure TS — no React, no clock reads, no state access (the caller passes the reason log).
 */
import type { Journey, ReasonEntry, Step } from '../types/domain';

/**
 * Whether a Step carries HISTORY worth preserving on removal: it was completed, it was ever touched
 * (a check-in / partial stamps `lastCheckInAt`), a report on it was REVERSED (D36 — `reverseReport`
 * clears `done` + `lastCheckInAt` but stamps `lastReportClearedAt`, and the CheckIn/reason rows stay),
 * or the reason log holds an entry for it. Such a Step is dropped rather than spliced, so its record
 * survives; a pristine, never-touched Step has nothing to remember and is removed.
 */
export function stepHasHistory(step: Step, reasonLog: readonly ReasonEntry[] = []): boolean {
  if (step.done || step.lastCheckInAt !== undefined) return true;
  if (step.lastReportClearedAt !== undefined) return true;
  return reasonLog.some((e) => e.stepId === step.id);
}

/**
 * How many of a Journey's Steps a CANCEL would remove — the Steps that never happened. This is the
 * exact count the confirmation states, derived from the same rule the engine applies a moment later,
 * so the number the user consented to is the number that is actually removed.
 */
export function unlivedStepCount(journey: Journey, reasonLog: readonly ReasonEntry[] = []): number {
  return journey.steps.filter((s) => !stepHasHistory(s, reasonLog)).length;
}
