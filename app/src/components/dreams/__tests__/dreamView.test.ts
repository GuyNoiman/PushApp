/**
 * dreamView — a Dream's linked Journeys grouped by lifecycle state for the detail screen. These
 * tests pin: the four states are split correctly (active / frozen / future / completed), empty
 * groups are dropped, and the display order is stable regardless of input order. No Dream-level
 * completion/progress is derived here (PRD §4.2 guardrail) — only each Journey's own state.
 */
import { groupDreamJourneys } from '../dreamView';
import type { Journey } from '@/core/types/domain';

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
        journey({ id: 'u', status: 'active', createdAt: NOW + 14 * DAY }),
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
