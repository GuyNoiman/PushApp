/**
 * week — the single authoritative week-boundary service (D33). Pins the configurable start day, the
 * calendar (not fixed-ms) arithmetic, and weeksBetween. Dates are built with `new Date(y, m, d)` (local
 * midnight) and asserted in local terms, so the tests are time-zone independent.
 */
import {
  DEFAULT_WEEK_START,
  dayIndexInWeek,
  getWeekStartDay,
  isInClosedWeek,
  remainingDaysInWeek,
  setWeekStartDay,
  startOfNextWeek,
  startOfWeek,
  weekKey,
  weeksBetween,
} from '../week';

/** Local-midnight epoch for a Y/M(0-based)/D. */
const at = (y: number, m: number, d: number) => new Date(y, m, d).getTime();

// 2026-01-07 is a Wednesday (getDay() === 3).
const WED = at(2026, 0, 7);

afterEach(() => setWeekStartDay(DEFAULT_WEEK_START));

describe('startOfWeek — configurable start day', () => {
  it('aligns to Monday / Sunday / Saturday as chosen', () => {
    expect(startOfWeek(WED, 1)).toBe(at(2026, 0, 5)); // Monday
    expect(startOfWeek(WED, 0)).toBe(at(2026, 0, 4)); // Sunday
    expect(startOfWeek(WED, 6)).toBe(at(2026, 0, 3)); // Saturday
  });

  it('defaults its start day to the applied module value', () => {
    expect(getWeekStartDay()).toBe(DEFAULT_WEEK_START); // Monday
    expect(startOfWeek(WED)).toBe(at(2026, 0, 5));
    setWeekStartDay(0);
    expect(getWeekStartDay()).toBe(0);
    expect(startOfWeek(WED)).toBe(at(2026, 0, 4));
  });
});

describe('dayIndexInWeek / remainingDaysInWeek', () => {
  it('measures the offset from the start day and the days left (incl. today)', () => {
    expect(dayIndexInWeek(WED, 1)).toBe(2); // Wed is 2 days after Monday
    expect(remainingDaysInWeek(WED, 1)).toBe(5); // Wed..Sun inclusive
    expect(remainingDaysInWeek(at(2026, 0, 5), 1)).toBe(7); // on the start day
    expect(remainingDaysInWeek(at(2026, 0, 11), 1)).toBe(1); // Sunday, the last day
  });
});

describe('startOfNextWeek — calendar-correct across a month boundary', () => {
  it('steps a full calendar week (not 7 fixed ms)', () => {
    // Week of Mon 2026-01-26 → next start Mon 2026-02-02 (crosses into February).
    expect(startOfNextWeek(at(2026, 0, 28), 1)).toBe(at(2026, 1, 2));
  });
});

describe('isInClosedWeek — past-week reporting guard (D36)', () => {
  const now = at(2026, 0, 14); // Wed of the week of Mon 2026-01-12

  it('locks a Step planned in an earlier week', () => {
    expect(isInClosedWeek(at(2026, 0, 7), now, 1)).toBe(true); // prior week
  });

  it('does NOT lock a Step planned in the current week', () => {
    expect(isInClosedWeek(at(2026, 0, 12), now, 1)).toBe(false); // this week's Monday
    expect(isInClosedWeek(now, now, 1)).toBe(false); // today
  });

  it('does NOT lock a Step planned in a future week', () => {
    expect(isInClosedWeek(at(2026, 0, 20), now, 1)).toBe(false); // next week
  });

  it('never locks a legacy Step with no plannedFor', () => {
    expect(isInClosedWeek(undefined, now, 1)).toBe(false);
    expect(isInClosedWeek(null, now, 1)).toBe(false);
  });

  it('uses the real clock by default — the shape Home\'s swipe/report guard calls it with', () => {
    // Home calls isInClosedWeek(step.plannedFor) with the default `now`, so gate on that path too.
    const lastWeek = startOfWeek(Date.now(), 1) - 1; // one ms before this week's start = prior week
    const thisWeek = Date.now();
    expect(isInClosedWeek(lastWeek)).toBe(true);
    expect(isInClosedWeek(thisWeek)).toBe(false);
    expect(isInClosedWeek(undefined)).toBe(false); // legacy Step stays reportable
  });

  it('is not closed at the exact week-start boundary of the current week', () => {
    // A Step planned at the current week's start instant is in THIS week, not a closed one.
    const monday = at(2026, 0, 12);
    expect(isInClosedWeek(monday, monday, 1)).toBe(false);
    // One ms before the current week's start falls in the prior (closed) week.
    expect(isInClosedWeek(monday - 1, monday, 1)).toBe(true);
  });
});

describe('weekKey / weeksBetween', () => {
  it('keys a week by its start date', () => {
    expect(weekKey(WED, 1)).toBe('2026-01-05');
    expect(weekKey(WED, 0)).toBe('2026-01-04');
  });

  it('counts whole week boundaries between two instants', () => {
    expect(weeksBetween(WED, WED, 1)).toBe(0); // same week
    expect(weeksBetween(at(2026, 0, 5), at(2026, 0, 20), 1)).toBe(2); // Jan5 → Jan19 = 2 steps
    expect(weeksBetween(at(2026, 0, 20), at(2026, 0, 5), 1)).toBe(0); // reversed → 0
  });
});
