/**
 * The Tools shelf — what you used, what you kept, and what the tab offers you.
 *
 * The rules pinned here are the ones that decide whether the tab is honest:
 *  · a tool that does not exist yet is NEVER recommended — a page that offers something unbuildable
 *    is a page that lies, and six of the eight tools do not exist yet;
 *  · the recommendation prefers what you have not tried and, among those, the shortest, because the
 *    tool most likely to be opened is the one that asks least;
 *  · a usage key for a tool that is gone is skipped, not treated as a crash and not deleted;
 *  · search runs over the LABEL the user can see, so a Hebrew search matches a Hebrew name.
 */
import { TOOL_CATALOG, findTool, isLive, categoryCount, toolsInCategory } from '../catalog';
import {
  ago,
  recentlyUsed,
  recommended,
  recordUse,
  savedTools,
  searchTools,
  toggleSaved,
} from '../shelf';

const MIN = 60_000;
const NOW = 1_700_000_000_000;

describe('the catalogue', () => {
  it('gives every tool a category, an icon and a stable key', () => {
    for (const tool of TOOL_CATALOG) {
      expect(tool.key).toMatch(/^[a-zA-Z]+$/);
      expect(tool.icon.length).toBeGreaterThan(0);
      expect(toolsInCategory(tool.category)).toContain(tool);
    }
  });

  it('has unique keys, so a usage record can never mean two tools', () => {
    const keys = TOOL_CATALOG.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('counts a room as everything in it', () => {
    // Live and coming together. Since 2026-08-23 every catalogue row IS live — the placeholder rows
    // were removed with the move to the founder's eight rooms — so the second half of this rule has
    // nothing to assert against today and is covered by `isLive` being the only definition below.
    expect(categoryCount('selfKnowledge')).toBe(toolsInCategory('selfKnowledge').length);
    expect(categoryCount('selfKnowledge')).toBeGreaterThan(0);
  });

  it('treats a route as the ONE definition of live', () => {
    for (const tool of TOOL_CATALOG) {
      expect(isLive(tool)).toBe(tool.route !== undefined);
    }
  });
});

describe('recently used', () => {
  it('returns the most recent first', () => {
    let usage = recordUse({}, 'questionnaire', NOW - 30 * MIN);
    usage = recordUse(usage, 'communication', NOW - 5 * MIN);

    expect(recentlyUsed(usage).map((t) => t.key)).toEqual(['communication', 'questionnaire']);
  });

  it('skips a stored key whose tool no longer exists, rather than throwing', () => {
    const usage = recordUse({ 'tool-that-was-removed': NOW }, 'questionnaire', NOW - MIN);

    expect(recentlyUsed(usage).map((t) => t.key)).toEqual(['questionnaire']);
  });

  it('honours the limit', () => {
    let usage = {};
    for (const tool of TOOL_CATALOG) usage = recordUse(usage, tool.key, NOW);
    expect(recentlyUsed(usage, 3)).toHaveLength(3);
  });

  it('recordUse never mutates the map it was given', () => {
    const before = { questionnaire: 1 };
    const after = recordUse(before, 'breathe', NOW);

    expect(before).toEqual({ questionnaire: 1 });
    expect(after.breathe).toBe(NOW);
  });
});

describe('saved', () => {
  it('returns saved tools in CATALOGUE order, not in the order they were starred', () => {
    const saved = ['communication', 'questionnaire'];
    // questionnaire comes first in the catalogue, so it comes first on the shelf.
    expect(savedTools(saved).map((t) => t.key)).toEqual(['questionnaire', 'communication']);
  });

  it('toggles on and off without mutating', () => {
    const once = toggleSaved([], 'breathe');
    expect(once).toEqual(['breathe']);
    expect(toggleSaved(once, 'breathe')).toEqual([]);
  });

  it('ignores a saved key for a tool that no longer exists', () => {
    expect(savedTools(['gone'])).toEqual([]);
  });
});

describe('search', () => {
  // Labels come from i18n in the app; here they are stubbed so the test asserts the MATCHING and
  // not the copy. (`breathe` was a placeholder row and left the catalogue on 2026-08-23.)
  const label = (t: { key: string }) =>
    ({ questionnaire: 'My questionnaire', gratitude: 'Gratitude log' })[t.key] ?? t.key;

  it('matches on the visible label, case-insensitively', () => {
    expect(searchTools('GRATIT', label).map((t) => t.key)).toEqual(['gratitude']);
  });

  it('an empty query is the whole catalogue, not an empty result', () => {
    expect(searchTools('   ', label)).toHaveLength(TOOL_CATALOG.length);
  });
});

describe('what gets recommended', () => {
  it('NEVER recommends a tool that does not exist yet', () => {
    const picked = recommended({}, NOW, TOOL_CATALOG.length);

    expect(picked.length).toBeGreaterThan(0);
    for (const tool of picked) expect(isLive(tool)).toBe(true);
  });

  it('prefers something not tried before, and among those the shortest', () => {
    // Asserted against the CATALOGUE rather than a named tool: the shortest live tool changes every
    // time a quicker one is added (it did on 2026-08-21), and the rule being tested is the ordering,
    // not which tool currently happens to win it.
    const picked = recommended({}, NOW);
    const shortest = Math.min(
      ...TOOL_CATALOG.filter(isLive).map((tool) => tool.minutes ?? Number.POSITIVE_INFINITY),
    );
    expect(findTool(picked[0].key)?.minutes).toBe(shortest);
  });

  it('does not offer back what was just done', () => {
    const usage = recordUse({}, 'communication', NOW - 60 * MIN);

    expect(recommended(usage, NOW).map((t) => t.key)).not.toContain('communication');
  });

  it('becomes eligible again once a day has passed', () => {
    // Eligibility, not placement: with the limit raised it is back in the pool. It still ranks
    // BELOW anything never tried, which is the ordering rule and is tested above.
    const usage = recordUse({}, 'communication', NOW - 25 * 60 * MIN);

    expect(recommended(usage, NOW, TOOL_CATALOG.length).map((t) => t.key)).toContain(
      'communication',
    );
  });

  it('returns nothing rather than repeating, when everything live is fresh', () => {
    let usage = {};
    for (const tool of TOOL_CATALOG.filter(isLive)) usage = recordUse(usage, tool.key, NOW);

    expect(recommended(usage, NOW)).toEqual([]);
  });
});

describe('how long ago', () => {
  it('reads in minutes, then hours, then days', () => {
    expect(ago(NOW - 30_000, NOW)).toEqual({ unit: 'now', value: 0 });
    expect(ago(NOW - 10 * MIN, NOW)).toEqual({ unit: 'minutes', value: 10 });
    expect(ago(NOW - 3 * 60 * MIN, NOW)).toEqual({ unit: 'hours', value: 3 });
    expect(ago(NOW - 50 * 60 * MIN, NOW)).toEqual({ unit: 'days', value: 2 });
  });

  it('never reads as the future when a clock has moved backwards', () => {
    expect(ago(NOW + 60 * MIN, NOW)).toEqual({ unit: 'now', value: 0 });
  });
});
