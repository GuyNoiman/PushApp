/**
 * Turning a finished Journey into the automatic half of its outcome evidence.
 *
 * Pure, and deliberately conservative: it reports what the Journey object
 * actually holds and nothing it would have to infer. `daysActive` is real
 * elapsed time, not an estimate of engagement; `stepsDone` counts Steps marked
 * done, not "progress".
 *
 * The DOMAIN is deliberately absent: a `Journey` does not carry one. It lives on
 * the GoalSpec that built the Journey and is not persisted with it, so reporting
 * it here would mean inferring it from a title — a guess written into the
 * evidence base as a fact. The column exists for when the Journey carries it.
 *
 * `intendedDepth` is the one field the device cannot derive — nobody has been
 * asked yet. It is threaded through as a parameter rather than defaulted to
 * `whole_thing`, because defaulting it would silently assert that everyone
 * intended to finish, which is exactly the assumption §5.2 exists to remove.
 */
import type { Journey } from '../types/domain';
import type { AutomaticOutcome } from './model';
import type { JourneyEnding } from './taxonomy';

const DAY = 24 * 60 * 60 * 1000;

export function automaticOutcomeFrom(
  journey: Journey,
  ending: JourneyEnding,
  options: { intendedDepth?: string | null; now?: number } = {},
): AutomaticOutcome {
  const steps = journey.steps ?? [];
  const endedAt = journey.completedAt ?? journey.abandonedAt ?? options.now ?? Date.now();
  const started = journey.createdAt;
  return {
    ending,
    definitionId: journey.libraryRef?.definitionId ?? null,
    variantId: journey.libraryRef?.variantId ?? null,
    definitionVersion: journey.libraryRef?.version ?? null,
    intendedDepth: options.intendedDepth ?? null,
    stepsTotal: steps.length,
    stepsDone: steps.filter((s) => s.done).length,
    daysActive: started ? Math.max(0, Math.round((endedAt - started) / DAY)) : null,
  };
}
