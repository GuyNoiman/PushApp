/**
 * Strength Evidence — the rules that keep it a reflection rather than an assessment.
 *
 * The promises worth testing are all refusals: a strength with no evidence behind it cannot be
 * confirmed, a smaller result is a result rather than a failure, deleting a story does not delete
 * the strength it was holding up, and NOTHING leaves the tool unless the person confirmed it and
 * then said it may.
 */
import {
  APPLICATION_MAX_CHARS,
  LABEL_MAX_CHARS,
  MAX_STRENGTHS,
  STORY_MAX_CHARS,
  acceptStrength,
  addStory,
  addStrength,
  canConfirm,
  confirmResult,
  derivedSummary,
  mergeStrengths,
  removeStory,
  renameStrength,
  setApplication,
  setPersonalisation,
  startStrengthEvidence,
  toggleEvidence,
  type StrengthEvidenceState,
} from '../model';

const AT = 1_800_000_000_000;

function withStories(count = 3): StrengthEvidenceState {
  let s = startStrengthEvidence();
  for (let i = 0; i < count; i += 1) {
    s = addStory(s, { id: `e${i}`, text: `The time I ${i}`, context: 'workOrLearning', at: AT + i });
  }
  return s;
}

function oneStrength(): StrengthEvidenceState {
  let s = withStories();
  s = addStrength(s, { id: 's1', label: 'Steady when it matters', evidenceIds: ['e0', 'e1'] });
  return s;
}

describe('evidence', () => {
  it('keeps the person’s words and caps the length', () => {
    const s = addStory(startStrengthEvidence(), { id: 'e', text: `  ${'x'.repeat(900)}  `, at: AT });
    expect(s.stories[0].text).toHaveLength(STORY_MAX_CHARS);
  });

  it('ignores an empty story rather than storing a blank card', () => {
    expect(addStory(startStrengthEvidence(), { id: 'e', text: '   ', at: AT }).stories).toEqual([]);
  });

  it('does not delete a strength when the story behind it goes', () => {
    // The tool has no standing to decide that somebody's strength stopped being true because they
    // tidied up one example. It goes back to needing repair, and says so by refusing to confirm.
    const s = removeStory(removeStory(oneStrength(), 'e0'), 'e1');
    expect(s.strengths).toHaveLength(1);
    expect(s.strengths[0].evidenceIds).toEqual([]);
    expect(canConfirm(s)).toBe(false);
  });
});

describe('strengths', () => {
  it('caps the label and refuses an empty one', () => {
    const s = addStrength(withStories(), { id: 's', label: 'y'.repeat(80), evidenceIds: ['e0'] });
    expect(s.strengths[0].label).toHaveLength(LABEL_MAX_CHARS);
    expect(addStrength(withStories(), { id: 's2', label: '  ' }).strengths).toEqual([]);
  });

  it('treats a coach proposal as nothing until it is accepted or renamed', () => {
    let s = addStrength(withStories(), {
      id: 'p1',
      label: 'Calm under pressure',
      evidenceIds: ['e0'],
      proposed: true,
    });
    expect(canConfirm(s)).toBe(false); // a proposal is not a result

    s = acceptStrength(s, 'p1');
    expect(canConfirm(s)).toBe(true);
  });

  it('accepts a proposal by renaming it, because that is what renaming means', () => {
    let s = addStrength(withStories(), { id: 'p1', label: 'Calm', evidenceIds: ['e0'], proposed: true });
    s = renameStrength(s, 'p1', 'Steady when it matters');
    expect(s.strengths[0].proposed).toBeUndefined();
    expect(s.strengths[0].label).toBe('Steady when it matters');
  });

  it('merges evidence without duplicating it, and keeps the label they merged INTO', () => {
    let s = oneStrength();
    s = addStrength(s, { id: 's2', label: 'Reliable', evidenceIds: ['e1', 'e2'] });
    s = mergeStrengths(s, 's1', 's2');
    expect(s.strengths).toHaveLength(1);
    expect(s.strengths[0].label).toBe('Steady when it matters');
    expect(s.strengths[0].evidenceIds).toEqual(['e0', 'e1', 'e2']);
  });

  it('attaches and detaches a story', () => {
    let s = toggleEvidence(oneStrength(), 's1', 'e2');
    expect(s.strengths[0].evidenceIds).toContain('e2');
    s = toggleEvidence(s, 's1', 'e2');
    expect(s.strengths[0].evidenceIds).not.toContain('e2');
  });

  it('caps an application reflection and removes it when emptied', () => {
    let s = setApplication(oneStrength(), 's1', 'helpsWhen', 'z'.repeat(400));
    expect(s.strengths[0].helpsWhen).toHaveLength(APPLICATION_MAX_CHARS);
    s = setApplication(s, 's1', 'helpsWhen', '   ');
    expect(s.strengths[0].helpsWhen).toBeUndefined();
  });
});

describe('confirming', () => {
  it('accepts fewer than five — a smaller honest result, never filler', () => {
    const s = confirmResult(oneStrength(), AT, 'manual');
    expect(s.confirmedAt).toBe(AT);
    expect(s.strengths).toHaveLength(1);
    expect(MAX_STRENGTHS).toBe(5);
  });

  it('refuses a strength standing on nothing', () => {
    const s = addStrength(withStories(), { id: 's', label: 'Brave' });
    expect(canConfirm(s)).toBe(false);
    expect(confirmResult(s, AT, 'manual').confirmedAt).toBeUndefined();
  });
});

describe('what may leave the tool', () => {
  it('is nothing at all until the result is confirmed', () => {
    expect(derivedSummary(oneStrength())).toBeNull();
  });

  it('is nothing at all until they allow personalisation', () => {
    const confirmed = confirmResult(oneStrength(), AT, 'manual');
    expect(derivedSummary(confirmed)).toBeNull();
  });

  it('is a label and a count, and nothing else', () => {
    let s = confirmResult(oneStrength(), AT, 'manual');
    s = setApplication(s, 's1', 'helpsWhen', 'when the room is tense');
    s = setPersonalisation(s, true);

    const summary = derivedSummary(s);

    expect(summary).toEqual({
      takenAt: AT,
      analysisMode: 'manual',
      strengths: [{ userLabel: 'Steady when it matters', evidenceCount: 2 }],
    });
    // Not the stories, not the contexts, not the reflection they wrote about it.
    expect(JSON.stringify(summary)).not.toContain('The time I');
    expect(JSON.stringify(summary)).not.toContain('tense');
  });

  it('stops the moment permission is withdrawn', () => {
    let s = setPersonalisation(confirmResult(oneStrength(), AT, 'manual'), true);
    expect(derivedSummary(s)).not.toBeNull();

    s = setPersonalisation(s, false);

    // A reader that cached it would be holding something they revoked, which is why this returns
    // null rather than a "revoked" flag somebody has to remember to check.
    expect(derivedSummary(s)).toBeNull();
  });
});
