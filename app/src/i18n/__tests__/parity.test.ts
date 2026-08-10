/**
 * Resource parity — every namespace must expose the SAME key shape in every language,
 * so a screen translated against `en` never renders a raw key (or crashes an
 * interpolation) when the app runs in `he`. Flattens each namespace to dotted leaf keys
 * and asserts the sets match both ways. This keeps the i18n rollout honest as keys grow.
 */
import { resources, NAMESPACES } from '@/i18n';

// The instance touches expo-localization at boot; give it a deterministic locale under
// jest (mirrors i18n.test.ts) so importing the resources never throws.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

/** Dotted leaf keys of a nested resource object (arrays are treated as leaves). */
function leafKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return leafKeys(v, key);
  });
}

/**
 * Strip the i18next FORM-OF-ADDRESS context suffix (`_feminine` / `_masculine`, D31) from a leaf key.
 * Gendered variants are inherently language-specific — Hebrew inflects address by gender, English does
 * not — so a variant may exist in one language and not another. Parity is enforced on the BASE keys;
 * a gendered variant is legitimate as long as its base key exists in both languages (which the base
 * always does, since it's the i18next fallback). Plurals (`_one`/`_other`) are NOT stripped — those
 * stay strict.
 */
function baseKey(key: string): string {
  return key.replace(/_(feminine|masculine)$/, '');
}

/** Base-key set (address-context variants collapsed onto their base). */
function baseKeySet(obj: unknown): string[] {
  return [...new Set(leafKeys(obj).map(baseKey))].sort();
}

describe('i18n resource parity (en ↔ he)', () => {
  for (const ns of NAMESPACES) {
    it(`"${ns}" has identical base keys in en and he (gendered variants may differ)`, () => {
      expect(baseKeySet(resources.he[ns])).toEqual(baseKeySet(resources.en[ns]));
    });
  }
});
