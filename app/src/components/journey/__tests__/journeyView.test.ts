/**
 * journeyView — status resolution + tab bucketing. The `status` field is the source of truth for
 * which tab a Journey appears under (Active · Completed · Future) and for freeze/resume (J3). These
 * tests pin: an explicit status wins; a Journey persisted BEFORE the field existed (no `status`) is
 * derived from `completedAt`; `frozen` stays under Active; and a not-yet-started Journey reads Future.
 */
import { resolveJourneyStatus, toJourneyView } from '../journeyView';
import type { Journey } from '@/core/types/domain';

const DAY = 24 * 60 * 60 * 1000;

/** A minimal Journey; override any field per case. */
function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps: [{ id: 's1', title: 'Walk', isStarterStep: false, cadence: 'daily', done: false }],
    createdAt: 1_000,
    ...over,
  };
}

describe('resolveJourneyStatus', () => {
  it('trusts an explicit status', () => {
    expect(resolveJourneyStatus(journey({ status: 'frozen' }))).toBe('frozen');
    expect(resolveJourneyStatus(journey({ status: 'completed' }))).toBe('completed');
  });

  it('derives a legacy Journey (no status field) from completedAt', () => {
    // Persisted before `status` existed: completedAt present → completed, else active.
    expect(resolveJourneyStatus(journey({ completedAt: 2_000 }))).toBe('completed');
    expect(resolveJourneyStatus(journey())).toBe('active');
  });
});

describe('toJourneyView bucketing', () => {
  const now = 100_000;

  it('buckets completed / active by status', () => {
    expect(toJourneyView(journey({ status: 'completed' }), now).bucket).toBe('completed');
    expect(toJourneyView(journey({ status: 'active' }), now).bucket).toBe('active');
  });

  it('keeps a frozen Journey under the Active tab, marked by its status', () => {
    const view = toJourneyView(journey({ status: 'frozen' }), now);
    expect(view.bucket).toBe('active');
    expect(view.status).toBe('frozen');
  });

  it('reads a still-active Journey scheduled to begin later as Future', () => {
    const view = toJourneyView(journey({ status: 'active', createdAt: now + 14 * DAY }), now);
    expect(view.bucket).toBe('future');
  });

  it('still completes a legacy Journey with only completedAt', () => {
    expect(toJourneyView(journey({ completedAt: 50_000 }), now).bucket).toBe('completed');
  });
});
