/**
 * The writing surface. What is worth protecting here is mostly restraint: a letter that keeps
 * arriving stops being a letter, a checkpoint that lands after the letter is not a checkpoint, and
 * a reflection with one paragraph in it is finished.
 */
import {
  REFLECTION_EXERCISES,
  REFLECTION_IDS,
  buildReflection,
  deliveryInstant,
  dueKind,
  dueNow,
  hasContent,
  wordCount,
  type Reflection,
} from '../model';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

const write = (over: Partial<Parameters<typeof buildReflection>[0]> = {}) =>
  buildReflection({
    id: 'r1',
    exercise: 'bestYear',
    writtenAt: NOW,
    sections: { personal: 'I slept properly.' },
    ...over,
  });

describe('the exercises', () => {
  it('are a catalogue, so the next four are content rather than four more screens', () => {
    expect(REFLECTION_IDS).toEqual(['bestYear', 'daily', 'weekStart', 'birthday', 'moment']);
    for (const id of REFLECTION_IDS) expect(REFLECTION_EXERCISES[id].id).toBe(id);
  });

  it('gives the best possible year four angles, a year’s horizon and a halfway note', () => {
    const e = REFLECTION_EXERCISES.bestYear;
    expect(e.prompts).toEqual(['personal', 'work', 'relationships', 'ordinaryDay']);
    expect(e.horizons[0]).toBe(365);
    expect(e.checkpointDays).toBe(180);
  });

  it('lets an exercise have no horizon at all — a daily page is for today', () => {
    expect(REFLECTION_EXERCISES.daily.horizons).toEqual([]);
    expect(REFLECTION_EXERCISES.daily.scheduled).toBe(false);
  });
});

describe('writing one', () => {
  it('keeps only the prompts that were actually written in', () => {
    const r = write({ sections: { personal: 'Something.', work: '   ', relationships: '' } });
    expect(Object.keys(r.sections)).toEqual(['personal']);
  });

  it('treats one paragraph as a finished reflection', () => {
    expect(hasContent({ personal: 'Just this.' })).toBe(true);
    expect(hasContent({ personal: '  ', work: '' })).toBe(false);
  });

  it('counts words as a fact about the page, not a judgement', () => {
    expect(wordCount({ a: 'one two', b: 'three' })).toBe(3);
    expect(wordCount({})).toBe(0);
  });
});

describe('when it comes back', () => {
  it('lands the letter a horizon away', () => {
    const r = write({ horizonDays: 365 });
    expect(r.deliverAt).toBe(deliveryInstant(NOW, 365));
  });

  it('keeps the halfway note when it lands BEFORE the letter', () => {
    const r = write({ horizonDays: 365, keepCheckpoint: true });
    expect(r.checkpointAt).toBe(deliveryInstant(NOW, 180));
    expect(r.checkpointAt!).toBeLessThan(r.deliverAt!);
  });

  it('drops it when the horizon is already the halfway point', () => {
    // A "halfway" note arriving after the letter is not a checkpoint, it is a second letter.
    const r = write({ horizonDays: 180, keepCheckpoint: true });
    expect(r.checkpointAt).toBeUndefined();
  });

  it('never schedules anything when nothing was asked for', () => {
    const r = write({ keepCheckpoint: true });
    expect(r.deliverAt).toBeUndefined();
    expect(r.checkpointAt).toBeUndefined();
  });
});

describe('reading it back', () => {
  const letter = write({ horizonDays: 365, keepCheckpoint: true });

  it('offers nothing before its time', () => {
    expect(dueNow([letter], NOW + 10 * DAY)).toEqual([]);
    expect(dueKind(letter, NOW + 10 * DAY)).toBeNull();
  });

  it('offers the checkpoint first, and calls it a checkpoint', () => {
    const at = NOW + 200 * DAY;
    expect(dueNow([letter], at)).toHaveLength(1);
    expect(dueKind(letter, at)).toBe('checkpoint');
  });

  it('calls the letter the letter once the horizon arrives', () => {
    expect(dueKind(letter, NOW + 400 * DAY)).toBe('letter');
  });

  it('never returns one that has been read — a letter that keeps arriving is not a letter', () => {
    const read: Reflection = { ...letter, readBackAt: NOW + 210 * DAY };
    expect(dueNow([read], NOW + 400 * DAY)).toEqual([]);
    expect(dueKind(read, NOW + 400 * DAY)).toBeNull();
  });
});
