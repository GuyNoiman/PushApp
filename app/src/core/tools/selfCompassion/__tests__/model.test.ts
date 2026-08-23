/**
 * The compassion practice: a fixed short sequence, a phrase that may be nothing, and a saved phrase
 * that survives a language change because it is stored by id.
 */
import {
  breathDurationMs,
  BREATH_IN_MS,
  BREATH_OUT_MS,
  BREATH_ROUNDS,
  canSave,
  COMPASSION_STEPS,
  hasPhrase,
  isSavedPhrase,
  KINDNESS_PHRASES,
  nextStep,
  previousStep,
} from '../model';

describe('the sequence', () => {
  it('runs acknowledge → humanity → kindness → breathe → finish', () => {
    expect([...COMPASSION_STEPS]).toEqual(['acknowledge', 'humanity', 'kindness', 'breathe', 'finish']);
  });

  it('ends rather than wrapping', () => {
    expect(nextStep('finish')).toBeNull();
    expect(previousStep('acknowledge')).toBeNull();
    expect(nextStep('acknowledge')).toBe('humanity');
    expect(previousStep('breathe')).toBe('kindness');
  });
});

describe('the phrase', () => {
  it('nothing to carry is a complete outcome, not an error', () => {
    expect(hasPhrase({ kind: 'none' })).toBe(false);
    expect(canSave({ kind: 'none' })).toBe(false);
  });

  it('whitespace is not a phrase', () => {
    expect(hasPhrase({ kind: 'custom', text: '   ' })).toBe(false);
  });

  it('an authored phrase is carried by id, so it can be re-read in another language', () => {
    expect(hasPhrase({ kind: 'authored', id: KINDNESS_PHRASES[0] })).toBe(true);
  });
});

describe('isSavedPhrase', () => {
  const base = { id: 'p1', createdAt: 1, updatedAt: 1 };

  it('accepts the three shapes', () => {
    expect(isSavedPhrase({ ...base, phrase: { kind: 'authored', id: 'allowedHuman' } })).toBe(true);
    expect(isSavedPhrase({ ...base, phrase: { kind: 'custom', text: 'hi' } })).toBe(true);
    expect(isSavedPhrase({ ...base, phrase: { kind: 'none' } })).toBe(true);
  });

  it('rejects an authored id this build does not know', () => {
    expect(isSavedPhrase({ ...base, phrase: { kind: 'authored', id: 'removedInV2' } })).toBe(false);
  });

  it('rejects anything that is not a saved phrase', () => {
    expect(isSavedPhrase(null)).toBe(false);
    expect(isSavedPhrase({ id: 'p1' })).toBe(false);
    expect(isSavedPhrase({ ...base, phrase: { kind: 'custom' } })).toBe(false);
  });
});

describe('the breath', () => {
  it('exhales longer than it inhales, which is the whole point', () => {
    expect(BREATH_OUT_MS).toBeGreaterThan(BREATH_IN_MS);
  });

  it('runs three rounds by default', () => {
    expect(breathDurationMs()).toBe(BREATH_ROUNDS * (BREATH_IN_MS + BREATH_OUT_MS));
    expect(breathDurationMs(1)).toBe(BREATH_IN_MS + BREATH_OUT_MS);
  });
});
