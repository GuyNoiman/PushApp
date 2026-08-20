/**
 * Every tool in the catalogue must have a NAME and a SENTENCE, in every language we ship.
 *
 * The sentence is not decoration. The founder's page shows a name and an icon and expects a person
 * to be curious: "Breathe" means nothing, "two minutes to get out of your own head" is something
 * somebody chooses. A missing one renders the raw i18n key to a user, which no other test in this
 * repo would catch — i18n parity only checks that en and he agree with EACH OTHER, so a tool added
 * with no copy at all passes it in both languages.
 */
import en from '@/i18n/resources/en/tools.json';
import he from '@/i18n/resources/he/tools.json';

import { TOOL_CATALOG, TOOL_CATEGORY_IDS } from '../catalog';

const RESOURCES = { en, he } as const;

describe.each(Object.keys(RESOURCES) as (keyof typeof RESOURCES)[])('tools copy — %s', (lang) => {
  const copy = RESOURCES[lang] as unknown as {
    items: Record<string, string>;
    blurbs: Record<string, string>;
    categories: Record<string, string>;
  };

  it('names every tool', () => {
    for (const tool of TOOL_CATALOG) {
      expect(copy.items[tool.key]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('gives every tool its one sentence', () => {
    for (const tool of TOOL_CATALOG) {
      expect(copy.blurbs[tool.key]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('names every category', () => {
    for (const id of TOOL_CATEGORY_IDS) {
      expect(copy.categories[id]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('carries no copy for a tool or category that does not exist', () => {
    // A stale entry is how a renamed tool keeps its old sentence alive and confusing.
    const keys = new Set(TOOL_CATALOG.map((t) => t.key));
    for (const key of Object.keys(copy.blurbs)) expect(keys.has(key)).toBe(true);
    for (const key of Object.keys(copy.items)) expect(keys.has(key)).toBe(true);
    const categories = new Set<string>(TOOL_CATEGORY_IDS);
    for (const key of Object.keys(copy.categories)) expect(categories.has(key)).toBe(true);
  });
});
