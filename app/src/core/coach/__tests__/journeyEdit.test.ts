/**
 * journeyEdit tests (task J1) — the defensive parser + summariser behind the coach-led edit. The
 * parser must validate EVERY field against the real Journey: an unknown Step id is dropped, an unknown
 * rhythm/cadence ignored, blank titles rejected, and an empty/unparseable answer yields an empty edit.
 * summarizeEdit turns a validated edit into the language-free EditChange[] the approval card renders.
 */
import {
  extractJourneyEdit,
  isEmptyEdit,
  summarizeEdit,
  type JourneyEditContext,
} from '../journeyEdit';

function context(): JourneyEditContext {
  return {
    id: 'journey_1',
    title: 'Run 5km',
    why: ['Feel stronger'],
    rhythm: 'few-times-week',
    durationDays: 30,
    steps: [
      { id: 'step_a', title: 'Lace up and walk', cadence: 'once', done: false, dropped: false },
      { id: 'step_b', title: 'Jog 15 minutes', cadence: 'weekly', done: false, dropped: false },
    ],
  };
}

describe('extractJourneyEdit', () => {
  it('validates scalars, addSteps, editSteps and removeStepIds against the Journey', () => {
    const json = JSON.stringify({
      title: '  Run 10km  ',
      why: ['Feel strong', '  ', 'Follow through'],
      rhythm: 'daily',
      durationDays: 45.6,
      addSteps: [{ title: 'Cool-down', cadence: 'daily' }, { description: 'no title' }],
      editSteps: [{ stepId: 'step_a', title: 'Walk 10 min' }],
      removeStepIds: ['step_b'],
    });

    const edit = extractJourneyEdit(json, context());

    expect(edit.title).toBe('Run 10km');
    expect(edit.why).toEqual(['Feel strong', 'Follow through']); // blank entry dropped
    expect(edit.rhythm).toBe('daily');
    expect(edit.durationDays).toBe(46); // rounded
    expect(edit.addSteps).toEqual([{ title: 'Cool-down', cadence: 'daily' }]); // nameless add dropped
    expect(edit.editSteps).toEqual([{ stepId: 'step_a', title: 'Walk 10 min' }]);
    expect(edit.removeStepIds).toEqual(['step_b']);
  });

  it('drops unknown Step ids (edit + remove) and ignores an unknown rhythm/cadence', () => {
    const json = JSON.stringify({
      rhythm: 'hourly', // not a Rhythm
      editSteps: [{ stepId: 'ghost', title: 'x' }, { stepId: 'step_a', cadence: 'monthly' }],
      removeStepIds: ['ghost', 'step_b'],
    });

    const edit = extractJourneyEdit(json, context());

    expect(edit.rhythm).toBeUndefined();
    // ghost dropped; step_a kept but its invalid cadence ignored → no usable field → dropped too.
    expect(edit.editSteps).toBeUndefined();
    expect(edit.removeStepIds).toEqual(['step_b']); // ghost dropped, real id kept
  });

  it('returns an empty edit for unparseable, empty-object, or no-op input', () => {
    expect(isEmptyEdit(extractJourneyEdit('not json at all', context()))).toBe(true);
    expect(isEmptyEdit(extractJourneyEdit('{}', context()))).toBe(true);
    expect(isEmptyEdit(extractJourneyEdit('{ "title": "   " }', context()))).toBe(true);
    // Rejects zero / negative duration.
    expect(extractJourneyEdit('{ "durationDays": 0 }', context()).durationDays).toBeUndefined();
  });
});

describe('a change request never becomes a duplicate Step (device, 2026-08-27)', () => {
  // Somebody with a Journey called "drink a protein shake" asked for it "every day". The model read
  // that as ADD A STEP called "drink a shake" with cadence daily — which parses perfectly, applies
  // cleanly, and is not what was asked. They pressed Apply, got a second copy of a Step they already
  // had, and reported that nothing had happened, because the thing they wanted had not.

  it('refuses a Step the Journey already has', () => {
    const json = JSON.stringify({ addSteps: [{ title: 'Jog 15 minutes', cadence: 'daily' }] });
    expect(extractJourneyEdit(json, context()).addSteps).toBeUndefined();
  });

  it('matches on the words, not the punctuation or the case', () => {
    for (const title of ['jog 15 minutes', 'Jog 15 minutes.', '  JOG 15 MINUTES  ']) {
      const json = JSON.stringify({ addSteps: [{ title }] });
      expect(extractJourneyEdit(json, context()).addSteps).toBeUndefined();
    }
  });

  it('still adds something genuinely new', () => {
    const json = JSON.stringify({ addSteps: [{ title: 'Stretch afterwards' }] });
    expect(extractJourneyEdit(json, context()).addSteps).toEqual([{ title: 'Stretch afterwards' }]);
  });

  it('does not count a DROPPED Step as already there — it left scope, so it can come back', () => {
    const ctx = context();
    ctx.steps[1].dropped = true;
    const json = JSON.stringify({ addSteps: [{ title: 'Jog 15 minutes' }] });
    expect(extractJourneyEdit(json, ctx).addSteps).toHaveLength(1);
  });

  it('leaves the RIGHT reading of that request untouched', () => {
    // Changing how often an existing Step happens is what was actually meant, and it must still work.
    const json = JSON.stringify({ editSteps: [{ stepId: 'step_b', cadence: 'daily' }] });
    expect(extractJourneyEdit(json, context()).editSteps).toEqual([
      { stepId: 'step_b', cadence: 'daily' },
    ]);
    expect(extractJourneyEdit(JSON.stringify({ rhythm: 'daily' }), context()).rhythm).toBe('daily');
  });
});

describe('extractJourneyEdit — dependency authoring (Step Dependencies, Slice 7)', () => {
  it('authors a VALID dependency on an existing Step (predecessor earlier, same Milestone)', () => {
    const json = JSON.stringify({ editSteps: [{ stepId: 'step_b', dependsOnStepId: 'step_a' }] });
    const edit = extractJourneyEdit(json, context());
    expect(edit.editSteps).toEqual([{ stepId: 'step_b', dependsOnStepId: 'step_a' }]);
  });

  it('resolves a POSITIONAL predecessor index to the Step id', () => {
    const json = JSON.stringify({ editSteps: [{ stepId: 'step_b', dependsOnStepIndex: 0 }] });
    const edit = extractJourneyEdit(json, context());
    expect(edit.editSteps).toEqual([{ stepId: 'step_b', dependsOnStepId: 'step_a' }]);
  });

  it('rejects a FORWARD reference (predecessor later in order)', () => {
    const json = JSON.stringify({ editSteps: [{ stepId: 'step_a', dependsOnStepId: 'step_b' }] });
    // No other field changes → the whole edit is dropped as a no-op.
    expect(extractJourneyEdit(json, context()).editSteps).toBeUndefined();
  });

  it('rejects a CROSS-Milestone dependency', () => {
    const ctx: JourneyEditContext = {
      ...context(),
      steps: [
        { id: 'step_a', title: 'A', cadence: 'once', done: false, dropped: false, milestoneId: 'm1' },
        { id: 'step_b', title: 'B', cadence: 'weekly', done: false, dropped: false, milestoneId: 'm2' },
      ],
    };
    const json = JSON.stringify({ editSteps: [{ stepId: 'step_b', dependsOnStepId: 'step_a' }] });
    expect(extractJourneyEdit(json, ctx).editSteps).toBeUndefined();
  });

  it('rejects a link that would exceed the max chain length (>3)', () => {
    const ctx: JourneyEditContext = {
      ...context(),
      steps: [
        { id: 'a', title: 'A', cadence: 'daily', done: false, dropped: false },
        { id: 'b', title: 'B', cadence: 'daily', done: false, dropped: false, dependsOnStepId: 'a' },
        { id: 'c', title: 'C', cadence: 'daily', done: false, dropped: false, dependsOnStepId: 'b' },
        { id: 'd', title: 'D', cadence: 'daily', done: false, dropped: false },
      ],
    };
    // a→b→c is already 3 long; making d depend on c would make a 4-chain → rejected.
    const json = JSON.stringify({ editSteps: [{ stepId: 'd', dependsOnStepId: 'c' }] });
    expect(extractJourneyEdit(json, ctx).editSteps).toBeUndefined();
  });

  it('keeps a KNOWN predecessor id on an added Step, drops an unknown one', () => {
    const known = extractJourneyEdit(
      JSON.stringify({ addSteps: [{ title: 'Cool-down', dependsOnStepId: 'step_a' }] }),
      context(),
    );
    expect(known.addSteps).toEqual([{ title: 'Cool-down', dependsOnStepId: 'step_a' }]);

    const unknown = extractJourneyEdit(
      JSON.stringify({ addSteps: [{ title: 'Cool-down', dependsOnStepId: 'ghost' }] }),
      context(),
    );
    expect(unknown.addSteps).toEqual([{ title: 'Cool-down' }]); // unknown predecessor dropped
  });
});

describe('summarizeEdit', () => {
  it('produces language-free EditChange[] resolving Step titles from context', () => {
    const ctx = context();
    const edit = extractJourneyEdit(
      JSON.stringify({
        title: 'Run 10km',
        why: ['a', 'b'],
        rhythm: 'weekly',
        durationDays: 40,
        addSteps: [{ title: 'Cool-down' }],
        editSteps: [{ stepId: 'step_a', title: 'Walk 10 min' }],
        removeStepIds: ['step_b'],
      }),
      ctx,
    );

    const changes = summarizeEdit(edit, ctx);

    expect(changes).toEqual([
      { kind: 'rename', title: 'Run 10km' },
      { kind: 'why', count: 2 },
      { kind: 'rhythm', rhythm: 'weekly' },
      { kind: 'duration', durationDays: 40 },
      { kind: 'addStep', title: 'Cool-down' },
      { kind: 'editStep', title: 'Walk 10 min' },
      { kind: 'removeStep', title: 'Jog 15 minutes' }, // resolved from context, not the id
    ]);
  });

  it('summarises nothing for an empty edit', () => {
    expect(summarizeEdit({}, context())).toEqual([]);
  });
});
