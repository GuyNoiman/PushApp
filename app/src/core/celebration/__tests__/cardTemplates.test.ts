/**
 * Completion-card template config tests (Completion Celebration, I1) — the set is versioned, carries
 * at least one name-revealing and one name-omitting variant (privacy choice, PRD §3), and every id
 * is unique/stable.
 */
import { CARD_TEMPLATE_VERSION, CARD_TEMPLATE_VARIANTS, cardCopyKey } from '../cardTemplates';

// The i18n instance touches expo-localization at boot; pin a locale so importing resources is safe.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

/** Walk a dotted key (`card.classic.headline`) into a nested resource object; undefined if absent. */
function resolve(obj: unknown, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

describe('cardTemplates config', () => {
  it('exposes a positive integer version', () => {
    expect(Number.isInteger(CARD_TEMPLATE_VERSION)).toBe(true);
    expect(CARD_TEMPLATE_VERSION).toBeGreaterThan(0);
  });

  it('has at least one name-revealing and one name-omitting variant', () => {
    expect(CARD_TEMPLATE_VARIANTS.some((v) => v.revealsJourneyName)).toBe(true);
    expect(CARD_TEMPLATE_VARIANTS.some((v) => !v.revealsJourneyName)).toBe(true);
  });

  it('gives every variant a unique id and an i18n copy key', () => {
    const ids = CARD_TEMPLATE_VARIANTS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of CARD_TEMPLATE_VARIANTS) {
      expect(v.id).toBeTruthy();
      expect(v.copyKeyId).toBeTruthy();
    }
  });

  // Regression guard: cardCopyKey() is the ONE key-builder the card + share text both use. A doubled
  // namespace prefix (the earlier `card.card.classic.headline` bug) would resolve to undefined here.
  it('resolves every variant headline+body to real copy in en and he', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { resources } = require('@/i18n') as typeof import('@/i18n');
    for (const lang of ['en', 'he'] as const) {
      const ns = resources[lang].celebration;
      for (const v of CARD_TEMPLATE_VARIANTS) {
        for (const field of ['headline', 'body'] as const) {
          const value = resolve(ns, cardCopyKey(v, field));
          expect(typeof value).toBe('string');
          expect((value as string).length).toBeGreaterThan(0);
        }
      }
    }
  });
});
