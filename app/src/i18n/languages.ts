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
}

// `as const satisfies` keeps this a plain data list while still deriving a
// precise `LanguageCode` union ('en' | 'he') from it — no second source of truth.
export const LANGUAGES = [
  { code: 'en', endonym: 'English', englishName: 'English' },
  { code: 'he', endonym: 'עברית', englishName: 'Hebrew' },
] as const satisfies readonly Language[];

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
