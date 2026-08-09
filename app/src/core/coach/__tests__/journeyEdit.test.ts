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
