/**
 * What Worked: one moment is the whole requirement, credit is optional, and the period a record is
 * about survives every later edit.
 */
import {
  addMoment,
  canAddMoment,
  canConfirm,
  confirmRecord,
  filledMoments,
  hasConditions,
  history,
  ideaIsFresh,
  MAX_MOMENTS,
  periodBounds,
  setMoment,
  setOptional,
  startRecord,
  toggleCondition,
} from '../model';

const NOON = new Date(2026, 7, 19, 12, 0, 0).getTime(); // Wednesday 2026-08-19
const DAY = 24 * 60 * 60 * 1000;

describe('periods', () => {
  it('a daily record covers the local day', () => {
    const { periodStart, periodEnd } = periodBounds('day', NOON);
    expect(new Date(periodStart).getDate()).toBe(19);
    expect(periodEnd - periodStart).toBe(DAY - 1);
  });

  it('a weekly record covers the local week', () => {
    const { periodStart, periodEnd } = periodBounds('week', NOON, 1);
    expect(new Date(periodStart).getDay()).toBe(1);
    expect(periodEnd - periodStart).toBe(7 * DAY - 1);
  });

  it('editing later never moves the period the record is about', () => {
    const r = startRecord('r', 'day', NOON);
    const edited = setMoment(r, 0, 'the call went well', NOON + 5 * DAY);
    expect(edited.periodStart).toBe(r.periodStart);
    expect(edited.updatedAt).toBe(NOON + 5 * DAY);
  });
});

describe('moments', () => {
  it('needs exactly one to finish', () => {
    const r = startRecord('r', 'day', NOON);
    expect(canConfirm(r)).toBe(false);
    expect(canConfirm(setMoment(r, 0, 'I went out', NOON))).toBe(true);
  });

  it('whitespace is not a moment', () => {
    expect(canConfirm(setMoment(startRecord('r', 'day', NOON), 0, '   ', NOON))).toBe(false);
  });

  it('only the weekly route collects more, and never more than three', () => {
    const daily = startRecord('r', 'day', NOON);
    expect(canAddMoment(daily)).toBe(false);
    expect(addMoment(daily, NOON).moments).toHaveLength(1);

    let weekly = startRecord('r', 'week', NOON, 1);
    for (let i = 0; i < 5; i += 1) weekly = addMoment(weekly, NOON);
    expect(weekly.moments).toHaveLength(MAX_MOMENTS);
  });

  it('confirming keeps the written moments and drops the blank ones', () => {
    let r = startRecord('r', 'week', NOON, 1);
    r = addMoment(r, NOON);
    r = setMoment(r, 0, ' first ', NOON);
    const confirmed = confirmRecord(r, NOON + 10);
    expect(confirmed.moments).toEqual(['first']);
    expect(confirmed.status).toBe('confirmed');
  });

  it('refuses to confirm an empty record instead of throwing', () => {
    const r = startRecord('r', 'day', NOON);
    expect(confirmRecord(r, NOON)).toEqual(r);
  });
});

describe('conditions and credit', () => {
  it('toggles conditions on and off', () => {
    let r = startRecord('r', 'day', NOON);
    r = toggleCondition(r, 'planning', NOON);
    r = toggleCondition(r, 'timing', NOON);
    expect(r.conditions).toEqual(['planning', 'timing']);
    r = toggleCondition(r, 'planning', NOON);
    expect(r.conditions).toEqual(['timing']);
  });

  it('lets a person decline credit — an empty contribution is a valid answer', () => {
    let r = startRecord('r', 'day', NOON);
    r = setOptional(r, 'ownContribution', 'I asked for help', NOON);
    r = setOptional(r, 'ownContribution', '   ', NOON);
    expect(r.ownContribution).toBeUndefined();
    expect(canConfirm(setMoment(r, 0, 'something', NOON))).toBe(true);
  });

  it('knows whether anything was said about what helped', () => {
    const r = startRecord('r', 'day', NOON);
    expect(hasConditions(r)).toBe(false);
    expect(hasConditions(setOptional(r, 'customCondition', 'quiet house', NOON))).toBe(true);
  });
});

describe('history and freshness', () => {
  it('is confirmed records only, newest first', () => {
    const a = confirmRecord(setMoment(startRecord('a', 'day', NOON), 0, 'x', NOON), 100);
    const b = confirmRecord(setMoment(startRecord('b', 'day', NOON), 0, 'y', NOON), 200);
    const draft = startRecord('c', 'day', NOON);
    expect(history([a, draft, b]).map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('an idea stops being current after ninety days but the record stays true', () => {
    const r = confirmRecord(setMoment(startRecord('a', 'day', NOON), 0, 'x', NOON), NOON);
    expect(ideaIsFresh(r, NOON + 89 * DAY)).toBe(true);
    expect(ideaIsFresh(r, NOON + 91 * DAY)).toBe(false);
    expect(history([r])).toHaveLength(1);
  });

  it('an unconfirmed record has no fresh idea', () => {
    expect(ideaIsFresh(startRecord('a', 'day', NOON), NOON)).toBe(false);
  });

  it('filledMoments trims', () => {
    const r = setMoment(startRecord('a', 'day', NOON), 0, '  hi  ', NOON);
    expect(filledMoments(r)).toEqual(['hi']);
  });
});
