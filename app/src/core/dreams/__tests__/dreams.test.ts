/**
 * Dreams selectors (Dream Management, D40) — the pure, framework-free read model shared by the
 * engine + UI. Covers `dreamsForJourney`: the Journey→Dreams resolution behind the Journey detail
 * "Part of your Dream" surface (primary-first order, de-duplication, stale-id dropping).
 */
import { dreamsForJourney } from '../dreams';
import type { Dream, Journey } from '../../types/domain';

/** A minimal Dream — only the fields the selector reads. */
function dream(id: string, title = id): Dream {
  return { id, title };
}

/** A minimal Journey carrying only the Dream-link fields under test. */
function journey(dreamId?: string, secondaryDreamIds?: string[]): Journey {
  return {
    id: 'j1',
    title: 'A Journey',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps: [],
    createdAt: 1,
    ...(dreamId ? { dreamId } : {}),
    ...(secondaryDreamIds ? { secondaryDreamIds } : {}),
  };
}

describe('dreamsForJourney', () => {
  const dreams = [dream('d1', 'Be a runner'), dream('d2', 'Be calm'), dream('d3', 'Write daily')];

  it('resolves the primary Dream only', () => {
    expect(dreamsForJourney(journey('d2'), dreams)).toEqual([dream('d2', 'Be calm')]);
  });

  it('resolves primary + secondaries with the primary first', () => {
    const result = dreamsForJourney(journey('d1', ['d3', 'd2']), dreams);
    expect(result.map((d) => d.id)).toEqual(['d1', 'd3', 'd2']);
  });

  it('returns [] for an unlinked Journey', () => {
    expect(dreamsForJourney(journey(), dreams)).toEqual([]);
  });

  it('drops unknown/stale ids (a Dream the coach has since removed)', () => {
    const result = dreamsForJourney(journey('gone', ['d2', 'also-gone']), dreams);
    expect(result.map((d) => d.id)).toEqual(['d2']);
  });

  it('de-dupes an id listed as BOTH primary and secondary to a single Dream', () => {
    const result = dreamsForJourney(journey('d1', ['d1', 'd2']), dreams);
    expect(result.map((d) => d.id)).toEqual(['d1', 'd2']);
  });
});
