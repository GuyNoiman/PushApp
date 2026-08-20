/**
 * The Life Wheel's reading.
 *
 * The thing worth protecting here is the DIFFERENCE from the classic wheel: a low score is not a
 * problem. A low score in something a person does not currently care about is a life with priorities
 * in it, and a tool that calls it a problem is a tool that tells someone to feel bad about a choice
 * they made on purpose. Everything below is a way of saying that precisely.
 */
import {
  LIFE_AREAS,
  MAX_PRESSING,
  PRESSING_GAP_THRESHOLD,
  answeredCount,
  clampScore,
  isComplete,
  nextArea,
  readWheel,
  recordArea,
  type LifeWheelAnswers,
} from '../model';
import { SUMMARY_FRESH_DAYS, contextArea, isFresh, summarise } from '../signals';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

/** A complete wheel where everything is fine, as the base for a one-area change. */
function evenWheel(satisfaction = 7, weight = 7): LifeWheelAnswers {
  let answers: LifeWheelAnswers = {};
  for (const area of LIFE_AREAS) answers = recordArea(answers, area, { satisfaction, weight });
  return answers;
}

describe('walking the wheel', () => {
  it('asks the eight areas in wheel order and counts as it goes', () => {
    let answers: LifeWheelAnswers = {};
    expect(nextArea(answers)).toBe(LIFE_AREAS[0]);
    expect(answeredCount(answers)).toBe(0);

    answers = recordArea(answers, LIFE_AREAS[0], { satisfaction: 5, weight: 5 });

    expect(nextArea(answers)).toBe(LIFE_AREAS[1]);
    expect(answeredCount(answers)).toBe(1);
    expect(isComplete(answers)).toBe(false);
  });

  it('is complete only when all eight are answered', () => {
    expect(isComplete(evenWheel())).toBe(true);
    expect(nextArea(evenWheel())).toBeNull();
  });

  it('treats zero as a real answer, not a missing one', () => {
    const answers = recordArea({}, 'money', { satisfaction: 0, weight: 0 });
    expect(answeredCount(answers)).toBe(1);
    expect(nextArea(answers)).not.toBe('money');
  });

  it('clamps anything outside the scale before it reaches the maths', () => {
    expect(clampScore(-4)).toBe(0);
    expect(clampScore(99)).toBe(10);
    expect(clampScore(NaN)).toBe(0);
    expect(clampScore(6.6)).toBe(7);
  });

  it('never mutates the answers it was given', () => {
    const before = recordArea({}, 'health', { satisfaction: 5, weight: 5 });
    recordArea(before, 'money', { satisfaction: 1, weight: 9 });
    expect(answeredCount(before)).toBe(1);
  });
});

describe('the reading — a low score is not automatically a problem', () => {
  it('refuses to read half a wheel', () => {
    expect(readWheel(recordArea({}, 'health', { satisfaction: 2, weight: 9 }))).toBeNull();
  });

  it('does NOT call an area pressing when it is low and does not matter right now', () => {
    // Fun at 2, and it matters 2. That is somebody with a deadline, not somebody in trouble.
    const answers = recordArea(evenWheel(), 'fun', { satisfaction: 2, weight: 2 });

    const reading = readWheel(answers)!;
    expect(reading.pressing.map((a) => a.area)).not.toContain('fun');
  });

  it('DOES call an area pressing when it matters and is going badly', () => {
    const answers = recordArea(evenWheel(), 'money', { satisfaction: 2, weight: 9 });

    const reading = readWheel(answers)!;
    expect(reading.pressing[0].area).toBe('money');
    expect(reading.pressing[0].gap).toBe(7);
  });

  it('ignores a gap too small to be a finding', () => {
    const answers = recordArea(evenWheel(), 'career', {
      satisfaction: 7 - (PRESSING_GAP_THRESHOLD - 1),
      weight: 7,
    });
    expect(readWheel(answers)!.pressing).toEqual([]);
  });

  it('names at most two, because a tool that finds eight problems has found none', () => {
    let answers = evenWheel();
    for (const area of LIFE_AREAS) answers = recordArea(answers, area, { satisfaction: 1, weight: 10 });

    expect(readWheel(answers)!.pressing).toHaveLength(MAX_PRESSING);
  });

  it('finds nothing pressing in a life that is going well, and that is a real result', () => {
    expect(readWheel(evenWheel(8, 8))!.pressing).toEqual([]);
  });

  it('never turns an area doing better than it matters into slack', () => {
    // Satisfaction 10, weight 2. The gap is zero, not minus eight — otherwise it would sort as the
    // healthiest thing in the person's life and, worse, read as spare capacity to spend.
    const answers = recordArea(evenWheel(), 'environment', { satisfaction: 10, weight: 2 });
    const environment = readWheel(answers)!.areas.find((a) => a.area === 'environment')!;

    expect(environment.gap).toBe(0);
  });

  it('names what is carrying the person, not only what is wrong', () => {
    let answers = evenWheel(4, 8);
    answers = recordArea(answers, 'relationships', { satisfaction: 10, weight: 9 });

    expect(readWheel(answers)!.strongest?.area).toBe('relationships');
  });

  it('does not call an area a strength when the person does not care about it', () => {
    let answers = evenWheel(3, 8);
    answers = recordArea(answers, 'fun', { satisfaction: 10, weight: 1 });

    expect(readWheel(answers)!.strongest?.area).not.toBe('fun');
  });

  it('orders the areas by what is costing most', () => {
    let answers = evenWheel();
    answers = recordArea(answers, 'money', { satisfaction: 3, weight: 9 });
    answers = recordArea(answers, 'health', { satisfaction: 5, weight: 8 });

    const [first, second] = readWheel(answers)!.areas;
    expect(first.area).toBe('money');
    expect(second.area).toBe('health');
  });
});

describe('what it tells the rest of the app', () => {
  const readingWithMoneyGap = () =>
    readWheel(recordArea(evenWheel(), 'money', { satisfaction: 2, weight: 9 }))!;

  it('summarises to a handful of fields, and no answers travel with it', () => {
    const summary = summarise(readingWithMoneyGap(), NOW);

    expect(summary).toEqual({
      takenAt: NOW,
      pressingArea: 'money',
      pressingGap: 7,
      strongestArea: expect.any(String),
    });
  });

  it('offers the pressing area as context while the reading is recent', () => {
    const summary = summarise(readingWithMoneyGap(), NOW);
    expect(contextArea(summary, NOW + 10 * DAY)).toBe('money');
  });

  it('stops offering it once the season it described is over', () => {
    // A gap reported in January that is still being raised in April is a coach that stopped
    // listening. The record stays; it just stops being used.
    const summary = summarise(readingWithMoneyGap(), NOW);
    const later = NOW + (SUMMARY_FRESH_DAYS + 1) * DAY;

    expect(isFresh(summary, later)).toBe(false);
    expect(contextArea(summary, later)).toBeNull();
  });

  it('offers nothing when the wheel found nothing, and nothing when it was never taken', () => {
    const calm = summarise(readWheel(evenWheel(8, 8))!, NOW);

    expect(contextArea(calm, NOW)).toBeNull();
    expect(contextArea(null, NOW)).toBeNull();
  });
});
