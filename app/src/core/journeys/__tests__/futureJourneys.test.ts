/**
 * futureJourneys — the Future tab's display order (§7) and the capacity read (§10). Pure selectors,
 * so every case is a hand-built list with no clock, no engine and no state.
 */
import { FUTURE_JOURNEY_POLICY } from '../../config/futureJourneys';
import type { Journey, JourneyStatus } from '../../types/domain';
import { futureCapacity, listFutureJourneys } from '../futureJourneys';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

function journey(id: string, over: Partial<Journey> = {}): Journey {
  return {
    id,
    title: id,
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps: [],
    createdAt: NOW,
    ...over,
  };
}

/** `n` Future Journeys, all manual-start. */
function futures(n: number): Journey[] {
  return Array.from({ length: n }, (_, i) => journey(`f${i}`, { status: 'future' }));
}

describe('listFutureJourneys — display order (§7)', () => {
  it('sorts scheduled by NEAREST start, then manual-start in array order', () => {
    const list = listFutureJourneys([
      journey('manual_a', { status: 'future' }),
      journey('far', { status: 'future', startsAt: NOW + 30 * DAY }),
      journey('manual_b', { status: 'future' }),
      journey('near', { status: 'future', startsAt: NOW + 2 * DAY }),
    ]);
    expect(list.map((j) => j.id)).toEqual(['near', 'far', 'manual_a', 'manual_b']);
  });

  it('is stable for two Journeys sharing the same start instant', () => {
    const list = listFutureJourneys([
      journey('first', { status: 'future', startsAt: NOW + DAY }),
      journey('second', { status: 'future', startsAt: NOW + DAY }),
    ]);
    expect(list.map((j) => j.id)).toEqual(['first', 'second']);
  });

  it('includes ONLY the future status — never an active, frozen or completed Journey', () => {
    const list = listFutureJourneys([
      journey('active', { status: 'active' }),
      journey('frozen', { status: 'frozen' }),
      journey('done', { status: 'completed', completedAt: NOW }),
      journey('legacy'), // no status at all ⇒ resolves active
      journey('later', { status: 'future' }),
    ]);
    expect(list.map((j) => j.id)).toEqual(['later']);
  });
});

describe('futureCapacity — the focus cap (§10)', () => {
  it('reports the policy numbers at an empty list', () => {
    expect(futureCapacity([])).toEqual({
      count: 0,
      max: FUTURE_JOURNEY_POLICY.max,
      slotsRemaining: FUTURE_JOURNEY_POLICY.max,
      capReached: false,
      offerReview: false,
    });
  });

  it('flips offerReview at the review threshold and capReached at the max', () => {
    expect(futureCapacity(futures(4))).toMatchObject({ offerReview: false, capReached: false });
    expect(futureCapacity(futures(5))).toMatchObject({ offerReview: true, capReached: false });
    expect(futureCapacity(futures(9))).toMatchObject({
      count: 9,
      slotsRemaining: 1,
      offerReview: true,
      capReached: false,
    });
    expect(futureCapacity(futures(10))).toMatchObject({
      count: 10,
      slotsRemaining: 0,
      capReached: true,
    });
  });

  it('never counts another lifecycle state against the cap (§10)', () => {
    const others: JourneyStatus[] = ['active', 'frozen', 'completed', 'abandoned'];
    const journeys = [
      ...others.map((status) => journey(status, { status })),
      ...futures(2),
    ];
    expect(futureCapacity(journeys).count).toBe(2);
  });
});
