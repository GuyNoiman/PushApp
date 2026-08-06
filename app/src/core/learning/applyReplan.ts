/**
 * applyReplan — the IMPURE counterpart of the pure {@link replan} (adaptive coach, S1.11).
 * Where `replan` only COMPUTES an intended {@link ReplanResult}, this ENACTS it on an existing
 * {@link Journey} by walking `result.stepAdjustments` and calling the matching JourneyEngine
 * mutator for each. It owns NO planning logic and NO state of its own — the reasoning stays in
 * the pure planner, the mutation stays in the engine; this is only the thin bridge between them.
 *
 * Adjustment kind → JourneyEngine mutator:
 *   rescheduled → rescheduleStep(plannedFor)   [emits PlanAdapted per Step]
 *   resized     → resizeStep({ estimatedDuration?, difficulty? })  [silent, like the Reshape lever]
 *   removed     → dropStep()                    [emits StepDropped]
 *   refrequency / added / none → not produced by the current adjustment-centric replan; ignored.
 *
 * COHERENT EMISSION: a rescheduled Step already emits PlanAdapted via the engine, so applyReplan
 * deliberately emits NO extra summary event (PlanAdapted is a single-Step scalar shape, not a
 * summary) — that would double-signal confusingly. resize/drop carry their own engine semantics.
 *
 * SAFE NO-OP: when `result.changed` is false there is nothing to enact, so applyReplan returns
 * immediately and touches neither state nor the bus. Each underlying mutator is itself a no-op for
 * a missing / done / already-dropped Step, so re-applying the same result is harmless.
 *
 * Pure-ish bridge — no React, no UI, no vendor imports; all side effects go through the engine.
 */
import type { JourneyEngine } from '../engines/JourneyEngine';
import type { Journey } from '../types/domain';
import type { ReplanResult } from './types';

/**
 * Enact a {@link ReplanResult} on `journey` via `engine`. No-op when the result made no change.
 * Order follows `result.stepAdjustments` (already stable per the pure planner).
 */
export function applyReplan(engine: JourneyEngine, journey: Journey, result: ReplanResult): void {
  if (!result.changed) return;

  const journeyId = journey.id;
  for (const adj of result.stepAdjustments) {
    switch (adj.kind) {
      case 'rescheduled':
        if (adj.plannedFor != null) engine.rescheduleStep(journeyId, adj.stepId, adj.plannedFor);
        break;
      case 'resized': {
        const changes: { estimatedDuration?: number; difficulty?: number } = {};
        if (adj.estimatedDuration != null) changes.estimatedDuration = adj.estimatedDuration;
        if (adj.difficulty != null) changes.difficulty = adj.difficulty;
        if (Object.keys(changes).length > 0) engine.resizeStep(journeyId, adj.stepId, changes);
        break;
      }
      case 'removed':
        engine.dropStep(journeyId, adj.stepId);
        break;
      // 'refrequency' | 'added' | 'none' — not emitted by the current replan; nothing to enact.
      default:
        break;
    }
  }
}
