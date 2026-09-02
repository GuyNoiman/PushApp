/**
 * Outcome evidence.
 *
 * The tests that matter are the refusals: no blended success number exists, a
 * skipped survey is not a zero, and adherence is not computed for somebody who
 * never intended to finish. Each is a place where a plausible simplification
 * would put a confident wrong fact into the evidence base the matching engine
 * will eventually be trained on — and unlike a dashboard, that is not something
 * a later fix can undo.
 */
import { adherence, buildOutcome, hasFelt, type AutomaticOutcome } from '../model';
import { automaticOutcomeFrom } from '../fromJourney';
import { feltFrom, isEmptyAnswer, questionsFor } from '../askModel';
import { HELPED_FACTORS, MISMATCH_DIMENSIONS, OUTCOME_SCHEMA_VERSION } from '../taxonomy';

const ended: AutomaticOutcome = { ending: 'completed', stepsTotal: 12, stepsDone: 12 };

describe('buildOutcome', () => {
  it('records an ending with no answers at all', () => {
    const out = buildOutcome(ended)!;
    expect(out.ending).toBe('completed');
    expect(out.schema_version).toBe(OUTCOME_SCHEMA_VERSION);
    expect(hasFelt(out)).toBe(false);
  });

  it('keeps the felt half null when nobody answered — never zero', () => {
    const out = buildOutcome(ended)!;
    expect(out.satisfaction).toBeNull();
    expect(out.real_world_change).toBeNull();
    expect(out.effort_accuracy).toBeNull();
    expect(out.comment).toBeNull();
  });

  it('has no success or score field of any kind (§5.4)', () => {
    // The PRD forbids training or ranking on one blended number. The way to keep
    // that true is for there to be nowhere to put one.
    const out = buildOutcome(ended, { satisfaction: 5, realWorldChange: 1 })!;
    expect(Object.keys(out)).not.toContain('score');
    expect(Object.keys(out)).not.toContain('success');
    // And the two disagree freely: loved it, nothing changed.
    expect(out.satisfaction).toBe(5);
    expect(out.real_world_change).toBe(1);
  });

  it('drops a taxonomy id nothing recognises rather than storing it', () => {
    const out = buildOutcome(ended, {
      mismatch: ['a_goal_fit', 'invented_reason'],
      helped: ['coach', 'also_invented'],
    })!;
    expect(out.mismatch).toEqual(['a_goal_fit']);
    expect(out.helped).toEqual(['coach']);
  });

  it('rebuilds from an allowlist, so a smuggled field cannot ride along', () => {
    const out = buildOutcome({ ...ended, journeyTitle: 'Quitting smoking' } as never, {
      note: 'because my father died',
    } as never)!;
    expect(JSON.stringify(out)).not.toContain('Quitting smoking');
    expect(JSON.stringify(out)).not.toContain('father');
  });

  it('drops a rating outside the scale instead of clamping it into one', () => {
    expect(buildOutcome(ended, { satisfaction: 9 })!.satisfaction).toBeNull();
    expect(buildOutcome(ended, { satisfaction: 0 })!.satisfaction).toBeNull();
    expect(buildOutcome(ended, { satisfaction: 3 })!.satisfaction).toBe(3);
  });

  it('refuses an ending it does not recognise', () => {
    expect(buildOutcome({ ending: 'vanished' } as never)).toBeNull();
  });

  it('keeps the person’s own words, and only theirs', () => {
    const out = buildOutcome(ended, { comment: '  the week-two Step was the one  ' })!;
    expect(out.comment).toBe('the week-two Step was the one');
    expect(buildOutcome(ended, { comment: '   ' })!.comment).toBeNull();
  });
});

describe('adherence', () => {
  it('is a fraction of the plan only for somebody who meant to finish it', () => {
    expect(adherence({ steps_total: 10, steps_done: 7, intended_depth: 'whole_thing' })).toBe(0.7);
  });

  it('is NOT computed for somebody who wanted one answer', () => {
    // They got what they came for in week two. 30% is not a fact about them, and
    // recording it would teach the engine that they failed.
    expect(adherence({ steps_total: 10, steps_done: 3, intended_depth: 'specific_answer' })).toBeNull();
    expect(adherence({ steps_total: 10, steps_done: 3, intended_depth: 'trying_it' })).toBeNull();
  });

  it('is null rather than zero when the intent was never recorded', () => {
    expect(adherence({ steps_total: 10, steps_done: 3, intended_depth: null })).toBeNull();
  });

  it('does not divide by a plan with no Steps', () => {
    expect(adherence({ steps_total: 0, steps_done: 0, intended_depth: 'whole_thing' })).toBeNull();
  });
});

describe('automaticOutcomeFrom', () => {
  const journey = {
    id: 'j1',
    createdAt: Date.UTC(2026, 7, 1),
    completedAt: Date.UTC(2026, 7, 29),
    steps: [{ done: true }, { done: true }, { done: false }],
    libraryRef: { definitionId: 'career.jobTarget.postingsFirst', variantId: 'v2', version: 3 },
  } as never;

  it('reports what the Journey holds and nothing it would have to infer', () => {
    const out = automaticOutcomeFrom(journey, 'completed');
    expect(out).toMatchObject({
      ending: 'completed',
      definitionId: 'career.jobTarget.postingsFirst',
      variantId: 'v2',
      definitionVersion: 3,
      stepsTotal: 3,
      stepsDone: 2,
      daysActive: 28,
    });
  });

  it('never assumes the person meant to finish', () => {
    // Defaulting this to `whole_thing` would silently assert that everybody
    // intended to complete, which is the assumption §5.2 exists to remove.
    expect(automaticOutcomeFrom(journey, 'completed').intendedDepth).toBeNull();
  });

  it('records a self-authored Journey as evidence too, with no library reference', () => {
    const own = { id: 'j2', createdAt: Date.UTC(2026, 7, 20), steps: [{ done: false }] } as never;
    const out = automaticOutcomeFrom(own, 'abandoned', { now: Date.UTC(2026, 7, 30) });
    expect(out.definitionId).toBeNull();
    expect(out.stepsDone).toBe(0);
    expect(out.daysActive).toBe(10);
  });
});

describe('the taxonomies', () => {
  it('covers all eleven of §6’s dimensions, A to K', () => {
    expect(MISMATCH_DIMENSIONS).toHaveLength(11);
    expect(MISMATCH_DIMENSIONS.map((d) => d.letter)).toEqual(['A','B','C','D','E','F','G','H','I','J','K']);
  });

  it('can record what helped, not only what went wrong', () => {
    // A taxonomy that only records complaints learns how to avoid harm and never
    // what to do more of.
    expect(HELPED_FACTORS.length).toBeGreaterThan(4);
  });
});

describe('the ask at an ending', () => {
  it('is at most three questions, and different for a completion and an abandonment', () => {
    // Asking "what helped?" of somebody who abandoned is tone-deaf; asking "what
    // did not fit?" of somebody who loved it wastes the one question they answer.
    const done = questionsFor('completed').map((q) => q.id);
    const left = questionsFor('abandoned').map((q) => q.id);
    expect(done.length).toBeLessThanOrEqual(3);
    expect(left.length).toBeLessThanOrEqual(3);
    expect(done).toContain('helped');
    expect(left).toContain('mismatch');
    expect(left).not.toContain('helped');
  });

  it('does not put satisfaction first on a completion', () => {
    // It is the outcome most vulnerable to novelty and relief, and asking it
    // first anchors everything after it.
    expect(questionsFor('completed')[0].id).toBe('real_world_change');
  });

  it('asks whether anything actually changed even of somebody who left', () => {
    // §5.3's primary outcome. A Journey somebody abandoned can still have
    // changed something, and non-completion is not failure.
    expect(questionsFor('abandoned').map((q) => q.id)).toContain('real_world_change');
  });

  it('offers only closed options, from the taxonomy', () => {
    for (const ending of ['completed', 'abandoned'] as const) {
      for (const q of questionsFor(ending)) {
        if (q.kind !== 'multi') continue;
        expect(q.options!.length).toBeGreaterThan(1);
        for (const o of q.options!) expect(typeof o.value).toBe('string');
      }
    }
  });

  it('recognises an answer that answered nothing', () => {
    expect(isEmptyAnswer({})).toBe(true);
    expect(isEmptyAnswer({ helped: [], satisfaction: null })).toBe(true);
    expect(isEmptyAnswer({ satisfaction: 3 })).toBe(false);
    expect(isEmptyAnswer({ mismatch: ['a_goal_fit'] })).toBe(false);
  });

  it('shapes answers into the felt half without inventing any of it', () => {
    const felt = feltFrom({ real_world_change: 4, helped: ['coach'] });
    expect(felt).toEqual({
      satisfaction: null,
      realWorldChange: 4,
      effortAccuracy: null,
      helped: ['coach'],
      mismatch: [],
      comment: null,
    });
  });
});
