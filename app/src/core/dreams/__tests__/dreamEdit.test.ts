/**
 * Reading the coach's Dream changes — the validation layer that makes D40 safe.
 *
 * D40 removed the approval gate: what comes back from the model is APPLIED. So every guarantee that
 * used to be "the user will see it first" is now "this function refused it", which is why the
 * interesting tests here are all about refusal — an unknown id, a merge into itself, an empty title,
 * a change kind we do not implement.
 */
import { extractDreamEdit, summarizeDreamEdit, type DreamEditContext } from '../dreamEdit';

const context: DreamEditContext = {
  dreams: [
    { id: 'd1', title: 'Be someone my body can rely on' },
    { id: 'd2', title: 'Be present with my kids' },
  ],
  journeys: [{ id: 'j1', title: 'Run three times a week', dreamIds: ['d1'] }],
};

const json = (changes: unknown[]) => JSON.stringify({ changes, reply: 'ok' });

describe('extractDreamEdit', () => {
  it('reads the changes it knows, with ids that exist', () => {
    const edit = extractDreamEdit(
      json([
        { kind: 'reword', dreamId: 'd1', title: '  Be   someone my body trusts  ' },
        { kind: 'link', journeyId: 'j1', dreamId: 'd2', primary: false },
        { kind: 'merge', keepId: 'd1', mergedId: 'd2' },
        { kind: 'remove', dreamId: 'd2' },
        { kind: 'unlink', journeyId: 'j1', dreamId: 'd1' },
        { kind: 'create', title: 'Learn to sit still', why: 'because I never have' },
      ]),
      context,
    );
    expect(edit.changes).toHaveLength(6);
    // Titles are normalised on the way in, so a model's stray whitespace never reaches storage.
    expect(edit.changes[0]).toEqual({ kind: 'reword', dreamId: 'd1', title: 'Be someone my body trusts' });
  });

  it('drops a change naming a Dream or Journey that does not exist', () => {
    const edit = extractDreamEdit(
      json([
        { kind: 'reword', dreamId: 'nope', title: 'Something' },
        { kind: 'link', journeyId: 'ghost', dreamId: 'd1', primary: true },
        { kind: 'unlink', journeyId: 'j1', dreamId: 'ghost' },
      ]),
      context,
    );
    expect(edit.changes).toEqual([]);
  });

  it('drops a merge of a Dream into itself, and a rewording with no words', () => {
    expect(
      extractDreamEdit(json([{ kind: 'merge', keepId: 'd1', mergedId: 'd1' }]), context).changes,
    ).toEqual([]);
    expect(
      extractDreamEdit(json([{ kind: 'reword', dreamId: 'd1', title: '   ' }]), context).changes,
    ).toEqual([]);
  });

  it('drops a kind it does not implement rather than guessing what was meant', () => {
    expect(
      extractDreamEdit(json([{ kind: 'deleteJourney', journeyId: 'j1' }]), context).changes,
    ).toEqual([]);
  });

  it('reads nothing out of unreadable output instead of throwing', () => {
    expect(extractDreamEdit('the coach said something friendly', context)).toEqual({ changes: [] });
    expect(extractDreamEdit('{ not json at all', context)).toEqual({ changes: [] });
  });

  it('keeps the good changes when only some of them are nonsense', () => {
    const edit = extractDreamEdit(
      json([
        { kind: 'reword', dreamId: 'd1', title: 'Be someone my body trusts' },
        { kind: 'remove', dreamId: 'nope' },
      ]),
      context,
    );
    expect(edit.changes).toHaveLength(1);
  });
});

describe('summarizeDreamEdit', () => {
  it('names things by their titles, so the person reads their own words back', () => {
    const edit = extractDreamEdit(
      json([
        { kind: 'reword', dreamId: 'd1', title: 'Be someone my body trusts' },
        { kind: 'merge', keepId: 'd1', mergedId: 'd2' },
        { kind: 'unlink', journeyId: 'j1', dreamId: 'd1' },
      ]),
      context,
    );
    const lines = summarizeDreamEdit(edit, context);
    expect(lines[0]).toContain('Be someone my body can rely on');
    expect(lines[0]).toContain('Be someone my body trusts');
    expect(lines[1]).toContain('Be present with my kids');
    expect(lines[2]).toContain('Run three times a week');
  });
});
