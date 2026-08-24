/**
 * Sixty days, and any number inside it (founder, 2026-08-25).
 *
 * The wizard used to offer 30 / 60 / 90 and the coach's horizon question offered the same three,
 * against his own guidance that a Journey is planned for up to two months. The ninety was never a
 * considered exception — it was the third chip in a row of three. One ceiling now, in one file, read
 * by both.
 */
import { HORIZON_DAYS } from '../../coach/horizonQuestion';
import {
  clampJourneyDays,
  MAX_JOURNEY_DAYS,
  MIN_JOURNEY_DAYS,
  OFFERED_JOURNEY_DAYS,
} from '../journeyLength';

describe('the ceiling', () => {
  it('is sixty days', () => {
    expect(MAX_JOURNEY_DAYS).toBe(60);
  });

  it('is never exceeded by anything the coach offers', () => {
    for (const days of HORIZON_DAYS) {
      if (days !== undefined) expect(days).toBeLessThanOrEqual(MAX_JOURNEY_DAYS);
    }
  });

  it('is never exceeded by a one-tap option in the wizard', () => {
    for (const days of OFFERED_JOURNEY_DAYS) {
      expect(days).toBeLessThanOrEqual(MAX_JOURNEY_DAYS);
      expect(days).toBeGreaterThanOrEqual(MIN_JOURNEY_DAYS);
    }
  });
});

describe('any number inside it', () => {
  it('keeps a number that is already in range — ten days is a Journey, fifty days is a Journey', () => {
    expect(clampJourneyDays(10)).toBe(10);
    expect(clampJourneyDays(50)).toBe(50);
  });

  it('corrects rather than refuses', () => {
    // Somebody who types 90 gets 60 and sees that they did, which beats an error about a rule they
    // did not know they were breaking.
    expect(clampJourneyDays(90)).toBe(MAX_JOURNEY_DAYS);
    expect(clampJourneyDays(1)).toBe(MIN_JOURNEY_DAYS);
    expect(clampJourneyDays(Number.NaN)).toBe(MAX_JOURNEY_DAYS);
    expect(clampJourneyDays(42.6)).toBe(43);
  });
});
