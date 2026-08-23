/**
 * The Gratitude Log's rules: five is a floor and not a target, a period is assigned once, and
 * nothing is ever discarded for being incomplete.
 */
import {
  addEntry,
  canAddEntry,
  canConfirm,
  chooseDeepened,
  confirmRecord,
  entryPoint,
  filledCount,
  history,
  MAX_ENTRIES,
  MIN_ENTRIES,
  perceivedLength,
  periodKeyFor,
  promptsFor,
  setEntryText,
  setWhyNote,
  startRecord,
  type GratitudeRecord,
} from '../model';

const ids = (i: number) => `e${i}`;
const MONDAY = new Date(2026, 7, 17, 10, 0, 0).getTime(); // 2026-08-17, a Monday
const TUESDAY_LATE = new Date(2026, 7, 18, 23, 30, 0).getTime();

function draftWith(texts: string[], now = MONDAY): GratitudeRecord {
  let r = startRecord('r1', 'daily', now, ids);
  texts.forEach((text, i) => {
    if (i >= r.entries.length) r = addEntry(r, `x${i}`, now);
    r = setEntryText(r, r.entries[i].id, text, now);
  });
  return r;
}

describe('starting a record', () => {
  it('opens with five blank lines, because the form is five', () => {
    const r = startRecord('r1', 'daily', MONDAY, ids);
    expect(r.entries).toHaveLength(MIN_ENTRIES);
    expect(r.status).toBe('draft');
    expect(filledCount(r)).toBe(0);
  });

  it('stamps the period from the cadence: a date for daily, a week for weekly', () => {
    expect(periodKeyFor('daily', MONDAY)).toBe('2026-08-17');
    expect(periodKeyFor('weekly', TUESDAY_LATE, 1)).toBe('2026-08-17');
  });
});

describe('confirming', () => {
  it('needs five non-empty entries; whitespace is not an entry', () => {
    expect(canConfirm(draftWith(['a', 'b', 'c', 'd', '   ']))).toBe(false);
    expect(canConfirm(draftWith(['a', 'b', 'c', 'd', 'e']))).toBe(true);
  });

  it('keeps an incomplete record as a draft rather than discarding it', () => {
    const four = draftWith(['a', 'b', 'c', 'd']);
    const unchanged = confirmRecord(four, MONDAY + 1000);
    expect(unchanged).toEqual(four);
    expect(unchanged.status).toBe('draft');
  });

  it('drops the blank lines and trims the kept ones', () => {
    let r = draftWith(['a', ' b ', 'c', 'd', 'e']);
    r = addEntry(r, 'x5', MONDAY);
    const confirmed = confirmRecord(r, MONDAY + 5);
    expect(confirmed.entries.map((e) => e.text)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(confirmed.confirmedAt).toBe(MONDAY + 5);
  });

  it('drops a note whose entry did not survive confirmation', () => {
    let r = draftWith(['a', 'b', 'c', 'd', 'e']);
    r = addEntry(r, 'x5', MONDAY);
    r = chooseDeepened(r, 'x5', MONDAY); // the blank sixth line
    r = setWhyNote(r, 'it mattered', MONDAY);
    const confirmed = confirmRecord(r, MONDAY + 5);
    expect(confirmed.deepenedEntryId).toBeUndefined();
    expect(confirmed.whyNote).toBeUndefined();
  });

  it('keeps the note when its entry survives', () => {
    let r = draftWith(['a', 'b', 'c', 'd', 'e']);
    r = chooseDeepened(r, 'e0', MONDAY);
    r = setWhyNote(r, 'because', MONDAY);
    expect(confirmRecord(r, MONDAY).whyNote).toBe('because');
  });
});

describe('entries', () => {
  it('caps at ten', () => {
    let r = startRecord('r1', 'daily', MONDAY, ids);
    for (let i = 0; i < 20; i += 1) r = addEntry(r, `x${i}`, MONDAY);
    expect(r.entries).toHaveLength(MAX_ENTRIES);
    expect(canAddEntry(r)).toBe(false);
  });

  it('clearing the chosen entry clears its orphaned note too', () => {
    let r = draftWith(['a', 'b', 'c', 'd', 'e']);
    r = chooseDeepened(r, 'e1', MONDAY);
    r = setWhyNote(r, 'note', MONDAY);
    r = chooseDeepened(r, undefined, MONDAY);
    expect(r.deepenedEntryId).toBeUndefined();
    expect(r.whyNote).toBeUndefined();
  });

  it('an all-whitespace note is no note', () => {
    const r = setWhyNote(draftWith(['a']), '   ', MONDAY);
    expect(r.whyNote).toBeUndefined();
  });
});

describe('perceivedLength', () => {
  it('counts what a person counts, not UTF-16 units', () => {
    expect(perceivedLength('abc')).toBe(3);
    expect(perceivedLength('שלום')).toBe(4);
    expect(perceivedLength('🙂')).toBe(1);
    expect('🙂'.length).toBe(2); // the wrong answer we are avoiding
  });
});

describe('prompts', () => {
  it('rotates deterministically, so a list does not reshuffle under the user', () => {
    expect(promptsFor(0)).toEqual(promptsFor(0));
    expect(promptsFor(0)).not.toEqual(promptsFor(1));
    expect(promptsFor(0)).toHaveLength(3);
  });

  it('wraps around the whole set', () => {
    expect(promptsFor(10)).toEqual(promptsFor(0));
  });
});

describe('entryPoint', () => {
  const confirmed = (id: string, period: string, at: number): GratitudeRecord => ({
    ...confirmRecord(draftWith(['a', 'b', 'c', 'd', 'e']), at),
    id,
    periodKey: period,
  });

  it('is empty for a first-time user', () => {
    expect(entryPoint([], 'daily', MONDAY).kind).toBe('empty');
  });

  it('prefers this period’s draft over any history', () => {
    const draft = { ...draftWith(['a']), periodKey: '2026-08-17' };
    const point = entryPoint([confirmed('old', '2026-08-16', MONDAY - 1000), draft], 'daily', MONDAY);
    expect(point.kind).toBe('draft');
  });

  it('offers to write this period when nothing has been written for it', () => {
    const point = entryPoint([confirmed('old', '2026-08-16', MONDAY - 1000)], 'daily', MONDAY);
    expect(point).toMatchObject({ kind: 'latest', canWriteThisPeriod: true });
  });

  it('does not offer to write the same period twice', () => {
    const point = entryPoint([confirmed('today', '2026-08-17', MONDAY)], 'daily', MONDAY);
    expect(point).toMatchObject({ kind: 'latest', canWriteThisPeriod: false });
  });

  it('a draft from another period does not block this one', () => {
    const old = { ...draftWith(['a']), periodKey: '2026-08-10' };
    expect(entryPoint([old], 'daily', MONDAY).kind).toBe('empty');
  });
});

describe('history', () => {
  it('is confirmed records only, newest first', () => {
    const a = { ...confirmRecord(draftWith(['a', 'b', 'c', 'd', 'e']), 100), id: 'a' };
    const b = { ...confirmRecord(draftWith(['a', 'b', 'c', 'd', 'e']), 200), id: 'b' };
    const drafting = draftWith(['a']);
    expect(history([a, drafting, b]).map((r) => r.id)).toEqual(['b', 'a']);
  });
});
