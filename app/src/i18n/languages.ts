/**
 * languages — the static catalogue of languages PushApp ships. Built to render N
 * languages: the Settings picker maps over this list (searchable, alphabetical),
 * and every other i18n concern (default, support check, endonym lookup) derives
 * from it so a new language is a single entry here plus its resource files.
 *
 * `endonym` is the language's own name (what a speaker calls it); `englishName`
 * is its English name — the picker searches over both so an English speaker can
 * find "Hebrew" and a Hebrew speaker can find "עברית".
 */
export interface Language {
  /** BCP-47 base code (matches the resource folder + i18next `lng`). */
  code: string;
  /** The language's name in itself (e.g. "עברית"). */
  endonym: string;
  /** The language's name in English (e.g. "Hebrew"). */
  englishName: string;
  /**
   * The flag shown beside the language in the picker (founder, 2026-09-15: an ordinary language
   * screen, like every other app — the question, then a list of languages with their flags).
   *
   * A flag is a COUNTRY and a language is not, which is why English carries one rather than the
   * several it could: the flag is a landmark for the eye scanning a long list, not a claim about
   * who speaks what. It is one character to change per entry if a better one exists.
   */
  flag: string;
}

// `as const satisfies` keeps this a plain data list while still deriving a
// precise `LanguageCode` union ('en' | 'he') from it — no second source of truth.
export const LANGUAGES = [
  { code: 'en', endonym: 'English', englishName: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'he', endonym: 'עברית', englishName: 'Hebrew', flag: '\u{1F1EE}\u{1F1F1}' },
] as const satisfies readonly Language[];

/**
 * The catalogue ORDERED THE WAY THE PICKER SHOWS IT — alphabetically by English name, whatever the
 * reader's own language (founder, 2026-09-15). Two entries sort trivially today; the sort exists so
 * that adding the next twenty is a data change and nothing else, and so nobody has to remember to
 * keep the literal above in order.
 */
export const LANGUAGES_ALPHABETICAL: readonly Language[] = [...LANGUAGES].sort((a, b) =>
  a.englishName.localeCompare(b.englishName, 'en'),
);

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/** The fallback language — used whenever a resolved locale is unsupported. */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/** Narrowing guard: is this arbitrary string one of the languages we ship? */
export function isSupportedLanguage(code: string | null | undefined): code is LanguageCode {
  return code != null && LANGUAGES.some((l) => l.code === code);
}

/** The catalogue entry for a code, or undefined — e.g. to show its endonym. */
export function findLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}
