/**
 * THE MERGE RULES — what may overwrite what, and why the answer is mostly "nothing".
 *
 * The Portrait is the only place in the app where a model's reading of somebody sits beside that
 * person's own words in the same field. These four rules are what keep the two apart:
 *
 *   · an INFERRED reading never overwrites something STATED;
 *   · an inferred reading may fill an EMPTY field;
 *   · onto a field that already holds something, an inferred reading may only LOWER the confidence;
 *   · a LATER stated value beats an earlier one, because people correct themselves and the
 *     correction is the truth.
 *
 * And the fifth thing these tests hold, which is not a rule but a consequence: a merge that only
 * restates what we already knew did not teach us anything. That is what the "two quiet turns" stop
 * counts, and getting it wrong would mean the stop could never fire.
 */
import { mergePortrait } from '../merge';
import type { Portrait, PortraitUpdate } from '../types';

const NOW = 1_700_000_000_000;

function update(over: Partial<PortraitUpdate> = {}): PortraitUpdate {
  return {
    field: 'primaryWant',
    value: 'change career',
    confidence: 'high',
    source: 'stated',
    ...over,
  };
}

/** A Portrait holding one field, as if an earlier turn had merged it. */
function holding(over: Partial<PortraitUpdate> = {}): Portrait {
  return mergePortrait({}, [update(over)], NOW).portrait;
}

describe('an inference never overwrites what somebody said', () => {
  it('leaves a stated value exactly where it was', () => {
    const before = holding({ value: 'change career', confidence: 'high', source: 'stated' });

    const { portrait } = mergePortrait(
      before,
      [update({ value: 'get promoted', confidence: 'high', source: 'inferred' })],
      NOW + 1,
    );

    expect(portrait.primaryWant?.value).toBe('change career');
    expect(portrait.primaryWant?.source).toBe('stated');
  });

  it('fills an empty field happily', () => {
    const { portrait, landed } = mergePortrait(
      {},
      [update({ confidence: 'medium', source: 'inferred' })],
      NOW,
    );

    expect(portrait.primaryWant?.value).toBe('change career');
    expect(portrait.primaryWant?.source).toBe('inferred');
    expect(landed).toEqual(['primaryWant']);
  });

  it('may LOWER the confidence of what is held, and never raise it', () => {
    const before = holding({ confidence: 'high', source: 'stated' });

    const lowered = mergePortrait(
      before,
      [update({ confidence: 'low', source: 'inferred' })],
      NOW + 1,
    ).portrait;
    // Less sure of the same thing they said. The value is untouched; only the claim shrinks.
    expect(lowered.primaryWant?.confidence).toBe('low');
    expect(lowered.primaryWant?.value).toBe('change career');

    const raised = mergePortrait(
      lowered,
      [update({ value: 'something else', confidence: 'high', source: 'inferred' })],
      NOW + 2,
    ).portrait;
    expect(raised.primaryWant?.confidence).toBe('low');
    expect(raised.primaryWant?.value).toBe('change career');
  });
});

describe('a later statement is the truth', () => {
  it('replaces an earlier stated value', () => {
    const before = holding({ value: 'change career', confidence: 'high' });

    const { portrait } = mergePortrait(
      before,
      [update({ value: 'stay and change roles', confidence: 'high' })],
      NOW + 1,
    );

    expect(portrait.primaryWant?.value).toBe('stay and change roles');
    expect(portrait.primaryWant?.updatedAt).toBe(NOW + 1);
  });

  it('replaces an inferred value, even a more confident one', () => {
    const before = holding({ value: 'get promoted', confidence: 'high', source: 'inferred' });

    const { portrait } = mergePortrait(
      before,
      [update({ value: 'leave the industry', confidence: 'medium', source: 'stated' })],
      NOW + 1,
    );

    expect(portrait.primaryWant?.value).toBe('leave the industry');
    expect(portrait.primaryWant?.source).toBe('stated');
  });
});

describe('what a merge counts as having learned', () => {
  it('counts a field that arrives at medium or better', () => {
    const { landed } = mergePortrait({}, [update({ confidence: 'medium' })], NOW);
    expect(landed).toEqual(['primaryWant']);
  });

  it('does not count a low-confidence reading', () => {
    const { landed } = mergePortrait({}, [update({ confidence: 'low' })], NOW);
    expect(landed).toEqual([]);
  });

  it('does not count the same thing being read again', () => {
    const before = holding({ confidence: 'medium' });

    const { landed } = mergePortrait(before, [update({ confidence: 'medium' })], NOW + 1);

    // The reader re-reads the whole transcript every turn, so it will report this again and again.
    // Counting a restatement as progress would mean the two-quiet-turns stop could never fire.
    expect(landed).toEqual([]);
  });

  it('counts a reading that is more confident than the one before it', () => {
    const before = holding({ confidence: 'medium', source: 'inferred' });

    const { landed } = mergePortrait(
      before,
      [update({ confidence: 'high', source: 'stated' })],
      NOW + 1,
    );

    expect(landed).toEqual(['primaryWant']);
  });
});

describe('nothing unusable is ever written', () => {
  it('ignores a reading that claims nothing', () => {
    const before = holding({ confidence: 'medium' });

    const { portrait, landed } = mergePortrait(
      before,
      [update({ value: 'anything at all', confidence: 'unknown', source: 'stated' })],
      NOW + 1,
    );

    expect(portrait.primaryWant?.value).toBe('change career');
    expect(landed).toEqual([]);
  });

  it('bounds a free-text value the way the coach memory is bounded', () => {
    const paragraph = 'x'.repeat(900);

    const { portrait } = mergePortrait({}, [update({ value: paragraph })], NOW);

    // A field with no ceiling becomes a transcript the moment somebody pastes one in.
    expect((portrait.primaryWant?.value as string).length).toBeLessThan(paragraph.length);
    expect(portrait.primaryWant?.value).toMatch(/…$/);
  });

  it('drops a list value handed to a single-valued field, and keeps one on the list field', () => {
    const wrongShape = mergePortrait({}, [update({ value: ['a', 'b'] })], NOW).portrait;
    expect(wrongShape.primaryWant).toBeUndefined();

    const rightShape = mergePortrait(
      {},
      [update({ field: 'constraints', value: ['two small children', 'no money for a course'] })],
      NOW,
    ).portrait;
    expect(rightShape.constraints?.value).toEqual(['two small children', 'no money for a course']);
  });

  it('never mutates the Portrait it was given', () => {
    const before = holding({ confidence: 'medium' });
    const copy = JSON.parse(JSON.stringify(before));

    mergePortrait(before, [update({ value: 'something new' })], NOW + 1);

    expect(before).toEqual(copy);
  });
});
