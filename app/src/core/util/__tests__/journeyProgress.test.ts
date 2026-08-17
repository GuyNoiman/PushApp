/**
 * Journey Step counts — the ONE derivation the engine, the Journeys cluster and the completion
 * card share.
 *
 * The defect this pins: `JourneyEngine.journeyProgress` and `buildCompletionCard` excluded dropped
 * Steps while `toJourneyView` counted the raw array, so a Journey whose replan dropped Steps read
 * one percentage on screen and another in the engine — and could show 80% while minting a card
 * built from a different denominator. The FIXTURE below is deliberately that Journey: 10 Steps, 2
 * of them dropped, 6 done. Every surface is asserted against it in the same test, so they cannot
 * drift apart again (same shape as the Milestone test next door).
 */
import { journeyStepCounts } from '../journeyProgress';
import { buildCompletionCard } from '../../celebration/completionCard';
import { toJourneyView } from '../../../components/journey/journeyView';
import type { Journey, Step } from '../../types/domain';

function step(id: string, over: Partial<Step> = {}): Step {
  return { id, title: `Step ${id}`, isStarterStep: false, cadence: 'daily', done: false, ...over };
}

/** THE fixture: 10 Steps — 6 done, 2 dropped (one of them done before it was dropped). */
function withDroppedSteps(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Drink a protein shake',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    status: 'active',
    steps: [
      step('s1', { done: true }),
      step('s2', { done: true }),
      step('s3', { done: true }),
      step('s4', { done: true }),
      step('s5', { done: true }),
      step('s6', { done: true, dropped: true }),
      step('s7'),
      step('s8'),
      step('s9', { dropped: true }),
      step('s10'),
    ],
    createdAt: 1_000,
    ...over,
  };
}

describe('Journey Step counts — one Journey, one answer on every surface', () => {
  it('excludes dropped Steps from BOTH the numerator and the denominator', () => {
    // 8 in scope (s6 and s9 dropped), 5 of them done — the dropped-but-done s6 counts nowhere.
    expect(journeyStepCounts(withDroppedSteps())).toEqual({
      totalSteps: 8,
      doneSteps: 5,
      progress: 5 / 8,
    });
  });

  it('reports the SAME totals to the Journeys card and to the shared count', () => {
    const journey = withDroppedSteps();

    const shared = journeyStepCounts(journey);
    const forTheCard = toJourneyView(journey, 2_000);

    expect(forTheCard.totalSteps).toBe(shared.totalSteps);
    expect(forTheCard.doneSteps).toBe(shared.doneSteps);
    expect(forTheCard.progress).toBe(shared.progress);
  });

  it('mints a completion card from the SAME denominator the card showed', () => {
    const journey = withDroppedSteps({ status: 'completed', completedAt: 5_000 });

    expect(buildCompletionCard(journey, 9_000).totalSteps).toBe(
      toJourneyView(journey, 9_000).totalSteps,
    );
  });

  it('measures a CANCELED Journey against what it carried when the user let it go', () => {
    // Canceling splices the unlived Steps away; counting the survivors would read 100% for a
    // Journey that was abandoned. The stamp is the honest denominator.
    const canceled = withDroppedSteps({
      status: 'abandoned',
      stepsAtAbandon: 12,
      steps: [step('s1', { done: true }), step('s2', { done: true }), step('s3', { done: true })],
    });

    expect(journeyStepCounts(canceled)).toEqual({
      totalSteps: 12,
      doneSteps: 3,
      progress: 3 / 12,
    });
    expect(toJourneyView(canceled, 2_000).progress).toBe(3 / 12);
  });

  it('reads 0 rather than dividing by nothing when a Journey has no Steps in scope', () => {
    const empty = withDroppedSteps({ steps: [step('s1', { dropped: true })] });

    expect(journeyStepCounts(empty)).toEqual({ totalSteps: 0, doneSteps: 0, progress: 0 });
  });
});
