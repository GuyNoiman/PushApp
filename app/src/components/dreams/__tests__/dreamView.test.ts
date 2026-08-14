/**
 * dreamView — a Dream's linked Journeys grouped by lifecycle state for the detail screen. These
 * tests pin: the four states are split correctly (active / frozen / future / completed), empty
 * groups are dropped, and the display order is stable regardless of input order. No Dream-level
 * completion/progress is derived here (PRD §4.2 guardrail) — only each Journey's own state.
 */
import { groupDreamJourneys, visibleDreamJourneys } from '../dreamView';
import type { Journey, ReasonEntry, Step } from '@/core/types/domain';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_000_000;

/** A minimal Journey; override any field per case. */
function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps: [{ id: 's1', title: 'Walk', isStarterStep: false, cadence: 'daily', done: false }],
    createdAt: NOW - DAY,
    ...over,
  };
}

describe('groupDreamJourneys', () => {
  it('splits Journeys into active / frozen / future / completed', () => {
    const groups = groupDreamJourneys(
      [
        journey({ id: 'a', status: 'active' }),
        journey({ id: 'f', status: 'frozen' }),
        // A Journey saved for later carries the STORED `future` status (Future Journey Management
        // §3) — it is no longer inferred from a creation date in the future.
        journey({ id: 'u', status: 'future', startsAt: NOW + 14 * DAY }),
        journey({ id: 'c', status: 'completed', completedAt: NOW }),
      ],
      NOW,
    );
    expect(groups.map((g) => g.state)).toEqual(['active', 'frozen', 'future', 'completed']);
    for (const g of groups) expect(g.journeys).toHaveLength(1);
  });

  it('drops empty groups', () => {
    const groups = groupDreamJourneys([journey({ id: 'a', status: 'active' })], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].state).toBe('active');
  });

  it('keeps a stable display order regardless of input order', () => {
    const groups = groupDreamJourneys(
      [
        journey({ id: 'c', status: 'completed', completedAt: NOW }),
        journey({ id: 'a', status: 'active' }),
      ],
      NOW,
    );
    expect(groups.map((g) => g.state)).toEqual(['active', 'completed']);
  });

  it('returns nothing for a Dream with no linked Journeys', () => {
    expect(groupDreamJourneys([], NOW)).toEqual([]);
  });
});

/**
 * A CANCELED Journey under its Dream (founder decision, 2026-08-14): it stays, in its own group, and
 * ONLY when at least one Step was actually done. It must never be filed among the completed ones —
 * `bucketOf` puts it in the `completed` BUCKET (History is that tab), which is exactly the trap.
 */
describe('groupDreamJourneys — canceled Journeys', () => {
  const canceledWithWork = journey({
    id: 'cw',
    status: 'abandoned',
    stepsAtAbandon: 12,
    steps: [{ id: 's1', title: 'Sketch', isStarterStep: false, cadence: 'daily', done: true }],
  });
  const canceledWithNothing = journey({
    id: 'cn',
    status: 'abandoned',
    stepsAtAbandon: 12,
    steps: [],
  });

  it('keeps a canceled Journey that had at least one Step done, in its OWN group', () => {
    const groups = groupDreamJourneys([canceledWithWork], NOW);
    expect(groups.map((g) => g.state)).toEqual(['canceled']);
    expect(groups[0].journeys.map((j) => j.id)).toEqual(['cw']);
  });

  it('never files a canceled Journey under completed', () => {
    const groups = groupDreamJourneys(
      [canceledWithWork, journey({ id: 'c', status: 'completed', completedAt: NOW })],
      NOW,
    );
    expect(groups.map((g) => g.state)).toEqual(['completed', 'canceled']);
    expect(groups.find((g) => g.state === 'completed')!.journeys.map((j) => j.id)).toEqual(['c']);
  });

  it('hides a canceled Journey with ZERO Steps done', () => {
    expect(groupDreamJourneys([canceledWithNothing], NOW)).toEqual([]);
  });

  // A cancel keeps every Step carrying a record and marks it `dropped`. The rule counts a Step
  // reported DONE **or PARTIALLY done** (founder, 2026-08-14 — widened from done-only). A partial is
  // real work; a "couldn't" records that the Step did not happen, so it is honest history on the
  // Journey but nothing the Dream can show as progress toward itself.
  const keptStep = (over: Partial<Step> = {}): Step => ({
    id: 's1',
    title: 'Sketch',
    isStarterStep: false,
    cadence: 'daily',
    done: false,
    dropped: true,
    // NOW is a small synthetic clock in this file, so NOW - DAY is NEGATIVE and would sort before
    // the derivation's `lastReportClearedAt ?? 0` floor. Keep report stamps positive.
    lastCheckInAt: NOW - 1_000,
    ...over,
  });
  const reasonFor = (reasonId: ReasonEntry['reasonId']): ReasonEntry => ({
    id: 'r1',
    stepId: 's1',
    journeyId: 'cr',
    reasonId,
    leverIds: [],
    outcome: 'logged',
    at: NOW - 1_000,
  });
  const reportedOnly = journey({
    id: 'cr',
    status: 'abandoned',
    stepsAtAbandon: 4,
    steps: [keptStep()],
  });

  it('SHOWS a canceled Journey whose kept Step was reported partially done', () => {
    // Reading past `dropped` is what makes this visible at all — the plain derivation reads a
    // dropped Step as unreported, which would hide exactly the partials this rule exists to count.
    expect(visibleDreamJourneys([reportedOnly], [reasonFor('did_partially')])).toEqual([
      reportedOnly,
    ]);
  });

  it('hides a canceled Journey whose only report was a "couldn\'t"', () => {
    expect(visibleDreamJourneys([reportedOnly], [reasonFor('couldnt')])).toEqual([]);
  });

  it('hides a canceled Journey whose kept Step carries no reason entry at all', () => {
    expect(groupDreamJourneys([reportedOnly], NOW)).toEqual([]);
  });

  it('never hides a Journey that is not canceled, however little was done on it', () => {
    const untouched = journey({ id: 'a', status: 'active' });
    expect(visibleDreamJourneys([untouched])).toEqual([untouched]);
    expect(visibleDreamJourneys([canceledWithNothing])).toEqual([]);
    expect(visibleDreamJourneys([canceledWithWork])).toEqual([canceledWithWork]);
  });
});
