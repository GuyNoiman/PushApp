/**
 * The language the first run pre-selects from the phone's own setting.
 *
 * On Android `languageCode` is Java's `Locale#getLanguage()`, which still reports the OLD ISO code
 * for Hebrew: `iw`. Unrecognised, a Hebrew phone pre-selected English while React Native laid the app
 * out right-to-left from the same phone setting (first device test, 2026-09-16).
 */
const mockLocales: { current: { languageCode: string | null; languageTag: string }[] } = {
  current: [{ languageCode: 'en', languageTag: 'en-US' }],
};
jest.mock('expo-localization', () => ({ getLocales: () => mockLocales.current }));

import { resolveDeviceLanguage } from '@/i18n';

describe('resolveDeviceLanguage', () => {
  it.each([
    ['en', 'en-US', 'en'],
    ['he', 'he-IL', 'he'],
    // Android, Hebrew.
    ['iw', 'he-IL', 'he'],
    // A right-to-left language we do not ship falls back to English.
    ['ar', 'ar-EG', 'en'],
    [null, 'und', 'en'],
  ])('%s → %s', (languageCode, languageTag, expected) => {
    mockLocales.current = [{ languageCode, languageTag }];
    expect(resolveDeviceLanguage()).toBe(expected);
  });

  it('falls back to English with no locale at all', () => {
    mockLocales.current = [];
    expect(resolveDeviceLanguage()).toBe('en');
  });
});
