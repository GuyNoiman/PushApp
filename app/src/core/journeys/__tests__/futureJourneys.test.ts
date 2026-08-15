/**
 * futureJourneys — the Future tab's display order (§7) and the capacity read (§10). Pure selectors,
 * so every case is a hand-built list with no clock, no engine and no state.
 */
import { FUTURE_JOURNEY_POLICY } from '../../config/futureJourneys';
import type { Journey, JourneyStatus } from '../../types/domain';
import {
  futureCapacity,
  futureStartState,
  listFutureJourneys,
  previewStartNow,
  startInstantInDays,
} from '../futureJourneys';

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

describe('futureStartState — which not-started-yet state a Future Journey is in (§7)', () => {
  it('is `scheduled` while its instant is still ahead', () => {
    expect(futureStartState(journey('j', { status: 'future', startsAt: NOW + DAY }), NOW)).toEqual({
      kind: 'scheduled',
      at: NOW + DAY,
    });
  });

  it('is `ready` once the instant has passed — never late, never overdue', () => {
    // The activation may have been blocked (app closed, account inside an inactivity freeze). The
    // plan is simply waiting, and the state carries no urgency of any kind.
    expect(futureStartState(journey('j', { status: 'future', startsAt: NOW - 9 * DAY }), NOW)).toEqual({
      kind: 'ready',
      at: NOW - 9 * DAY,
    });
  });

  it('is `ready` exactly at the instant (the same boundary the clock reconciler uses)', () => {
    expect(futureStartState(journey('j', { status: 'future', startsAt: NOW }), NOW).kind).toBe('ready');
  });

  it('is `manual` when there is no date at all', () => {
    expect(futureStartState(journey('j', { status: 'future' }), NOW)).toEqual({ kind: 'manual' });
  });
});

describe('startInstantInDays — a date chosen without a native picker', () => {
  it('lands on the calendar day `days` from now, at the policy hour', () => {
    const at = new Date(startInstantInDays(7, NOW));
    const today = new Date(NOW);
    const expected = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    expect(at.getFullYear()).toBe(expected.getFullYear());
    expect(at.getMonth()).toBe(expected.getMonth());
    expect(at.getDate()).toBe(expected.getDate());
    expect(at.getHours()).toBe(FUTURE_JOURNEY_POLICY.defaultStartHour);
    expect(at.getMinutes()).toBe(0);
  });

  it('adds days on the CALENDAR, so a month-end rollover still lands on a real day', () => {
    // Jan 30 + 30 days rolls through a 28-day February: Mar 1, 2026. The Date constructor does the
    // carrying, which is why days are never added as milliseconds here (that is also what keeps a
    // start that crosses a DST boundary on the day the user picked).
    const at = new Date(startInstantInDays(30, new Date(2026, 0, 30, 15, 0, 0).getTime()));
    expect(at.getMonth()).toBe(2); // March
    expect(at.getDate()).toBe(1);
  });

  it('is strictly increasing in `days`', () => {
    expect(startInstantInDays(14, NOW)).toBeGreaterThan(startInstantInDays(7, NOW));
    expect(startInstantInDays(30, NOW)).toBeGreaterThan(startInstantInDays(14, NOW));
  });
});

describe('previewStartNow — what "Start Journey" would mean (§9)', () => {
  it('reports today as the effective start and the window that follows', () => {
    const preview = previewStartNow(journey('j', { status: 'future', durationDays: 30 }), NOW);
    expect(preview.startsAt).toBe(NOW);
    expect(preview.endsAt).toBe(NOW + 30 * DAY);
  });

  it('reports how many whole days EARLY a scheduled start would be', () => {
    const preview = previewStartNow(
      journey('j', { status: 'future', startsAt: NOW + 10 * DAY }),
      NOW,
    );
    expect(preview.earlyByDays).toBe(10);
  });

  it('never reports a bare zero for a start that really is ahead', () => {
    const preview = previewStartNow(
      journey('j', { status: 'future', startsAt: NOW + 3 * 60 * 60 * 1000 }),
      NOW,
    );
    expect(preview.earlyByDays).toBe(1);
  });

  it('is NOT early for a manual-start Journey, or for one whose day has passed', () => {
    expect(previewStartNow(journey('j', { status: 'future' }), NOW).earlyByDays).toBe(0);
    expect(
      previewStartNow(journey('j', { status: 'future', startsAt: NOW - 5 * DAY }), NOW).earlyByDays,
    ).toBe(0);
  });
});
