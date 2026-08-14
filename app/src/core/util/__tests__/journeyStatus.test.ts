/**
 * journeyStatus — the single lifecycle resolution + the positive gates every consumer reads
 * (Future Journey Management). These tests pin the two invariants the whole feature rests on:
 * a snapshot persisted BEFORE `future` existed can never resolve to `future`, and `isRunning`
 * is true for `active` ONLY — so no new lifecycle state can silently leak into Home, reminders,
 * the weekly review, or the active count.
 */
import { effectiveStartAt, isFuture, isRunning, resolveJourneyStatus } from '../journeyStatus';
import type { Journey } from '../../types/domain';

const DAY = 24 * 60 * 60 * 1000;

/** A minimal Journey; override any field per case. */
function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps: [],
    createdAt: 1_000,
    ...over,
  };
}

describe('resolveJourneyStatus — unchanged by the new status', () => {
  it('trusts an explicit status', () => {
    expect(resolveJourneyStatus(journey({ status: 'frozen' }))).toBe('frozen');
    expect(resolveJourneyStatus(journey({ status: 'completed' }))).toBe('completed');
    expect(resolveJourneyStatus(journey({ status: 'abandoned' }))).toBe('abandoned');
  });

  it('derives a legacy Journey (no status field) from completedAt', () => {
    expect(resolveJourneyStatus(journey({ completedAt: 2_000 }))).toBe('completed');
    expect(resolveJourneyStatus(journey())).toBe('active');
  });

  it('returns future ONLY for an explicit future status (never derived)', () => {
    expect(resolveJourneyStatus(journey({ status: 'future' }))).toBe('future');
    // A legacy snapshot with a creation date in the future is still `active` — the old
    // createdAt-derived Future bucket is gone (PRD §3).
    expect(resolveJourneyStatus(journey({ createdAt: Date.now() + 14 * DAY }))).toBe('active');
  });
});

describe('isRunning / isFuture', () => {
  it('is true for active and for a legacy statusless incomplete Journey', () => {
    expect(isRunning(journey({ status: 'active' }))).toBe(true);
    expect(isRunning(journey())).toBe(true);
  });

  it('is false for future, frozen, completed and abandoned', () => {
    expect(isRunning(journey({ status: 'future' }))).toBe(false);
    expect(isRunning(journey({ status: 'frozen' }))).toBe(false);
    expect(isRunning(journey({ status: 'completed', completedAt: 2_000 }))).toBe(false);
    expect(isRunning(journey({ status: 'abandoned' }))).toBe(false);
    expect(isRunning(journey({ completedAt: 2_000 }))).toBe(false); // legacy completed
  });

  it('isFuture is true only for the stored future status', () => {
    expect(isFuture(journey({ status: 'future' }))).toBe(true);
    expect(isFuture(journey({ status: 'active' }))).toBe(false);
    expect(isFuture(journey())).toBe(false);
  });
});

describe('effectiveStartAt', () => {
  const startsAt = 5_000;
  const activatedAt = 7_000;

  it('prefers the actual activation over the intended start', () => {
    expect(effectiveStartAt(journey({ startsAt, activatedAt }))).toBe(activatedAt);
  });

  it('falls back to the intended start while still Future', () => {
    expect(effectiveStartAt(journey({ status: 'future', startsAt }))).toBe(startsAt);
  });

  it('falls back to createdAt for a legacy Journey carrying neither', () => {
    expect(effectiveStartAt(journey())).toBe(1_000);
  });
});
