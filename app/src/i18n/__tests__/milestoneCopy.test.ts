/**
 * Milestone copy — three surfaces, one sentence (Device QA 2026-08-17, A1).
 *
 * Home, the Journeys card and the Journey detail each own their namespace's Milestone line. They now
 * share ONE derivation (`core/util/milestones`), so the numbers cannot drift; this pins the WORDS to
 * match too, in every language, and pins the placeholders to the Milestone-based names that replaced
 * the superseded "phase" ones. If someone rewords one of them, this fails rather than shipping a
 * Journey that reads three different ways in three places.
 */
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

import i18n, { changeLanguage } from '@/i18n';
import { LANGUAGES } from '@/i18n/languages';

const POSITION = { current: 2, total: 3 };

/** The Milestone line each surface renders for the same position. */
function milestoneLines(): Record<string, string> {
  return {
    home: i18n.t('milestone', { ns: 'home', ...POSITION }),
    card: i18n.t('card.milestone', { ns: 'journeys', ...POSITION }),
    detail: i18n.t('detail.milestone', { ns: 'journey', ...POSITION }),
  };
}

describe('Milestone copy reads the same on every surface', () => {
  afterAll(async () => {
    await changeLanguage('en');
  });

  for (const language of LANGUAGES) {
    it(`says one thing in "${language.code}", with both numbers filled in`, async () => {
      await changeLanguage(language.code);
      const lines = milestoneLines();

      expect(lines.card).toBe(lines.home);
      expect(lines.detail).toBe(lines.home);
      // Real numbers, not a leftover `{{phase}}` placeholder the renamed field no longer fills.
      expect(lines.home).toContain('2');
      expect(lines.home).toContain('3');
      expect(lines.home).not.toContain('{{');
    });
  }
});
