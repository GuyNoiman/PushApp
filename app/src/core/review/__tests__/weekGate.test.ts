/**
 * weekGate — the per-WEEK Weekly Review gate (Weekly_Review_PRD §5/§9, D40). It must generate
 * exactly ONE review per closed week: nothing on the first-ever observation, nothing within the
 * same week (idempotent), and one review with a correct closed-week window on a rollover.
 */
import { evaluateWeekGate } from '../weekGate';
import { startOfWeek, weekKey } from '../../util/week';

const DAY = 24 * 60 * 60 * 1000;

describe('evaluateWeekGate', () => {
  const now = Date.UTC(2026, 7, 12, 15, 0, 0); // a Wednesday mid-afternoon

  it('records the current week WITHOUT generating on the first-ever observation', () => {
    const result = evaluateWeekGate(undefined, now);
    expect(result.shouldGenerate).toBe(false);
    expect(result.nextKey).toBe(weekKey(now));
    expect(result.windowStart).toBeUndefined();
  });

  it('generates nothing when still inside the same week (idempotent)', () => {
    const result = evaluateWeekGate(weekKey(now), now);
    expect(result.shouldGenerate).toBe(false);
    expect(result.nextKey).toBe(weekKey(now));
  });

  it('generates ONE review for the just-closed week after a rollover', () => {
    // `now` sits in the current week; last accounted week was the previous one.
    const lastWeekKey = weekKey(now - 7 * DAY);
    const result = evaluateWeekGate(lastWeekKey, now);

    expect(result.shouldGenerate).toBe(true);
    expect(result.nextKey).toBe(weekKey(now));
    // The window is the whole previous week: [prev week start, current week start).
    expect(result.windowEnd).toBe(startOfWeek(now));
    expect(result.windowStart).toBe(startOfWeek(startOfWeek(now) - 1));
    expect(weekKey(result.windowStart!)).toBe(lastWeekKey);
  });

  it('still generates just ONE review even when several weeks elapsed', () => {
    const result = evaluateWeekGate(weekKey(now - 30 * DAY), now);
    expect(result.shouldGenerate).toBe(true);
    // The review covers the MOST-recently closed week, not each skipped one.
    expect(result.windowEnd).toBe(startOfWeek(now));
    expect(result.windowStart).toBe(startOfWeek(startOfWeek(now) - 1));
  });
});
