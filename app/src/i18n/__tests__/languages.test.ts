/**
 * The language catalogue is a LIST, and the picker is an ordinary one (founder, 2026-09-15):
 *
 *   > מסך השפה צריך להיות מאוד רגיל כמו בכל אפליקציה אחרת — שואלים באיזו שפה נדבר ואז יש רשימה
 *   > ארוכה של הרבה שפות עם הדגלים שלהן כשהן מסודרות על פי סדר האותיות באנגלית
 *
 * Two languages ship today and a two-item list sorts itself. These tests exist for the twenty after
 * them: the order must come from the SORT, not from how the literal happens to be typed, and every
 * entry must carry a flag — because the first entry added without one would simply render a gap
 * that no other test would notice.
 */
import { LANGUAGES, LANGUAGES_ALPHABETICAL, DEFAULT_LANGUAGE, findLanguage } from '../languages';

describe('the language catalogue', () => {
  it('orders the picker alphabetically by ENGLISH name, whatever the reader reads', () => {
    const names = LANGUAGES_ALPHABETICAL.map((l) => l.englishName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('shows every language we ship, and loses none to the sort', () => {
    expect(LANGUAGES_ALPHABETICAL).toHaveLength(LANGUAGES.length);
    expect(new Set(LANGUAGES_ALPHABETICAL.map((l) => l.code))).toEqual(
      new Set(LANGUAGES.map((l) => l.code)),
    );
  });

  it('gives every language a flag, an endonym and an English name', () => {
    for (const lang of LANGUAGES) {
      expect(lang.flag.length).toBeGreaterThan(0);
      expect(lang.endonym.trim()).not.toBe('');
      expect(lang.englishName.trim()).not.toBe('');
    }
  });

  it('names each language in its OWN script, so a speaker recognises it on a screen they cannot read', () => {
    expect(findLanguage('he')?.endonym).toBe('עברית');
    expect(findLanguage('en')?.endonym).toBe('English');
  });

  it('defaults to English, and English is a language we actually ship', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
    expect(findLanguage(DEFAULT_LANGUAGE)).toBeDefined();
  });
});
