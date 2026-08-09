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

describe('i18n resource parity (en ↔ he)', () => {
  for (const ns of NAMESPACES) {
    it(`"${ns}" has identical keys in en and he`, () => {
      const en = leafKeys(resources.en[ns]).sort();
      const he = leafKeys(resources.he[ns]).sort();
      expect(he).toEqual(en);
    });
  }
});
