/**
 * The intro Journey's Step destinations must be REAL screens.
 *
 * `INTRO_JOURNEY_LINKS` is a list of route strings, and a route string is the one kind of value
 * TypeScript cannot check: rename `settings/active-hours.tsx` and the link still compiles, still
 * ships, and takes the person to expo-router's "page could not be found" screen instead of to their
 * Active Hours. That is the one failure `useStepLink` cannot make quiet at runtime — it cannot know
 * which routes exist — so it is caught HERE, before it can ship, by reading the route tree off disk.
 *
 * Deliberately NOT an allowlist inside the app: a second copy of the route tree in `src/core` would
 * go stale the first time a screen moves, and it would silently kill a link that is perfectly valid.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { IN_APP_DESTINATIONS } from '../../journeys/linkedStepClosing';
import { INTRO_JOURNEY_LINKS } from '../introJourney';

const APP_DIR = join(__dirname, '../../../app');

/**
 * Every route this app answers, as expo-router resolves them: a file is its path without the
 * extension, `index` is its folder, and a `(group)` folder contributes nothing to the URL.
 */
function routesUnder(dir: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      // A (group) folder organizes files, not URLs — its children hang off the SAME prefix.
      const isGroup = entry.startsWith('(') && entry.endsWith(')');
      found.push(...routesUnder(full, isGroup ? prefix : `${prefix}/${entry}`));
      continue;
    }
    if (!entry.endsWith('.tsx') || entry.startsWith('_') || entry.startsWith('+')) continue;
    const name = entry.replace(/\.tsx$/, '');
    found.push(name === 'index' ? prefix || '/' : `${prefix}/${name}`);
  }
  return found;
}

describe('intro Journey links', () => {
  const routes = routesUnder(APP_DIR);

  it('reads the route tree at all (a guard on the guard)', () => {
    expect(routes).toContain('/settings/profile');
    expect(routes.length).toBeGreaterThan(10);
  });

  it.each([...INTRO_JOURNEY_LINKS])('%s is a screen this app actually has', (link) => {
    expect(routes).toContain(link);
  });

  // The closing rules read these too (Gap Register B2) — including Active Hours, which is no longer
  // an intro Step but is still on phones holding the old three-Step Journey, and must still close.
  it.each(Object.values(IN_APP_DESTINATIONS))('closing destination %s is a screen this app actually has', (link) => {
    expect(routes).toContain(link);
  });
});
