/**
 * The week map: a hundred tiles that cannot overflow, time and energy kept apart, and no trend
 * claimed from too few weeks.
 */
import * as model from '../model';
import {
  addUnits,
  canCompare,
  canConfirm,
  confirmSnapshot,
  dominantAreas,
  draining,
  eligibleWeeks,
  energising,
  history,
  isCurrentContext,
  isCurrentLoadSnapshot,
  isEligibleWeek,
  MIN_WEEKS_FOR_TREND,
  remainingUnits,
  setEnergy,
  setExperiment,
  setUnderAllocated,
  startSnapshot,
  TOTAL_UNITS,
  usedUnits,
  type CurrentLoadSnapshot,
} from '../model';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 7, 19, 12, 0, 0).getTime(); // Wednesday
const WEEK = { weekStart: NOW - 9 * DAY, weekEnd: NOW - 3 * DAY };

function filled(units: [string, number][]): CurrentLoadSnapshot {
  let s = startSnapshot('s1', WEEK, NOW);
  for (const [code, n] of units) s = addUnits(s, code, n, NOW);
  return s;
}

describe('the hundred tiles', () => {
  it('start empty', () => {
    const s = startSnapshot('s1', WEEK, NOW);
    expect(usedUnits(s)).toBe(0);
    expect(remainingUnits(s)).toBe(TOTAL_UNITS);
    expect(canConfirm(s)).toBe(false);
  });

  it('cannot overflow past a hundred', () => {
    const s = filled([['work', 80], ['rest', 40]]);
    expect(usedUnits(s)).toBe(TOTAL_UNITS);
    expect(s.allocations.find((a) => a.code === 'rest')?.units).toBe(20);
  });

  it('cannot go below zero, and an emptied area disappears', () => {
    let s = filled([['work', 10]]);
    s = addUnits(s, 'work', -50, NOW);
    expect(s.allocations).toEqual([]);
    expect(remainingUnits(s)).toBe(TOTAL_UNITS);
  });

  it('confirms only at exactly a hundred', () => {
    const short = filled([['work', 99]]);
    expect(canConfirm(short)).toBe(false);
    expect(confirmSnapshot(short, NOW)).toEqual(short);

    const whole = filled([['work', 60], ['family', 40]]);
    expect(confirmSnapshot(whole, NOW).status).toBe('confirmed');
  });

  it('keeps the offered order so the mosaic does not reshuffle', () => {
    const s = filled([['rest', 10], ['work', 10], ['family', 10]]);
    expect(s.allocations.map((a) => a.code)).toEqual(['work', 'family', 'rest']);
  });

  it('carries a custom area’s own label', () => {
    const s = addUnits(startSnapshot('s1', WEEK, NOW), 'custom_1', 5, NOW, 'the move');
    expect(s.allocations[0]).toMatchObject({ code: 'custom_1', units: 5, customLabel: 'the move' });
  });
});

describe('energy stays separate from time', () => {
  it('records a rating per area, including the neutral middle', () => {
    let s = filled([['work', 50], ['rest', 50]]);
    s = setEnergy(s, 'work', -2, NOW);
    s = setEnergy(s, 'rest', 0, NOW);
    expect(draining(s)).toEqual(['work']);
    expect(energising(s)).toEqual([]);
  });

  it('forgets the rating of an area emptied of tiles', () => {
    let s = filled([['work', 20]]);
    s = setEnergy(s, 'work', 2, NOW);
    s = addUnits(s, 'work', -20, NOW);
    expect(s.energy.work).toBeUndefined();
  });

  it('exports nothing that combines time and energy into one number', () => {
    const forbidden = ['balance', 'score', 'index', 'productivity', 'optimal'];
    const exported = Object.keys(model).map((k) => k.toLowerCase());
    for (const word of forbidden) expect(exported.some((n) => n.includes(word))).toBe(false);
  });
});

describe('the missing space', () => {
  it('is optional, and clears when its area is emptied', () => {
    let s = filled([['health', 10], ['work', 90]]);
    s = setUnderAllocated(s, 'health', NOW);
    expect(s.underAllocated).toBe('health');
    s = addUnits(s, 'health', -10, NOW);
    expect(s.underAllocated).toBeUndefined();
  });

  it('an empty experiment is no experiment', () => {
    const s = setExperiment(filled([['work', 100]]), '   ', NOW);
    expect(s.experiment).toBeUndefined();
  });
});

describe('which weeks may be described', () => {
  it('never offers the week currently being lived', () => {
    const weeks = eligibleWeeks(NOW, 1);
    for (const week of weeks) expect(week.weekEnd).toBeLessThan(NOW);
  });

  it('refuses a week that has not finished', () => {
    expect(isEligibleWeek({ weekStart: NOW - 2 * DAY, weekEnd: NOW + 4 * DAY }, NOW)).toBe(false);
  });

  it('refuses a week older than about a month', () => {
    expect(isEligibleWeek({ weekStart: NOW - 60 * DAY, weekEnd: NOW - 53 * DAY }, NOW)).toBe(false);
    expect(isEligibleWeek(WEEK, NOW)).toBe(true);
  });
});

describe('description, not judgement', () => {
  it('names the biggest areas and keeps ties', () => {
    const s = filled([['work', 40], ['family', 40], ['rest', 20]]);
    expect(dominantAreas(s)).toEqual(expect.arrayContaining(['work', 'family']));
    expect(dominantAreas(s)).not.toContain('rest');
  });

  it('claims no trend from fewer than three comparable weeks', () => {
    const one = confirmSnapshot(filled([['work', 100]]), NOW);
    expect(canCompare([one, { ...one, id: 'b' }])).toBe(false);
    expect(
      canCompare([one, { ...one, id: 'b' }, { ...one, id: 'c' }]),
    ).toBe(true);
    expect(MIN_WEEKS_FOR_TREND).toBe(3);
  });

  it('does not count a week the person marked as unrepresentative', () => {
    const one = confirmSnapshot(filled([['work', 100]]), NOW);
    const odd = { ...one, id: 'b', representative: 'no' as const };
    expect(canCompare([one, odd, { ...one, id: 'c' }])).toBe(false);
  });
});

describe('history', () => {
  it('is confirmed weeks, newest week first', () => {
    const a = confirmSnapshot(filled([['work', 100]]), NOW);
    const b = { ...a, id: 'b', weekStart: a.weekStart - 7 * DAY };
    expect(history([b, a]).map((s) => s.id)).toEqual(['s1', 'b']);
  });

  it('stops being current context after thirty days', () => {
    const a = confirmSnapshot(filled([['work', 100]]), NOW);
    expect(isCurrentContext(a, NOW)).toBe(true);
    expect(isCurrentContext(a, NOW + 40 * DAY)).toBe(false);
  });
});

describe('isCurrentLoadSnapshot', () => {
  it('rejects a blob with broken allocations', () => {
    const s = filled([['work', 100]]);
    expect(isCurrentLoadSnapshot(s)).toBe(true);
    expect(isCurrentLoadSnapshot({ ...s, allocations: [{ code: 'work' }] })).toBe(false);
  });
});
