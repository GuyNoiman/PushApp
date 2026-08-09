/**
 * i18n infrastructure — the instance initializes, resolves real keys, falls back
 * for missing keys, switches language on demand, and the RTL locale check is
 * correct. Keeps the framework-free core honest (no React needed to test it).
 */

import i18n, { changeLanguage } from '@/i18n';
import { isRTLLocale } from '@/i18n/rtl';

// expo-localization has no JS implementation under jest — mock the one call our
// boot resolution makes so the instance initializes deterministically on English.
// (jest.mock is hoisted above the imports above by babel-jest.)
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

describe('i18n', () => {
  afterEach(async () => {
    // Leave the shared instance back on English for the next test/suite.
    await changeLanguage('en');
  });

  it('initializes on a supported language', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(['en', 'he']).toContain(i18n.language);
  });

  it('resolves a real key from the settings namespace', () => {
    expect(i18n.t('title', { ns: 'settings' })).toBe('Settings');
  });

  it('falls back to the key itself when it is missing', () => {
    expect(i18n.t('does.not.exist', { ns: 'settings' })).toBe('does.not.exist');
  });

  it('changeLanguage switches the active language and its copy', async () => {
    await changeLanguage('he');
    expect(i18n.language).toBe('he');
    expect(i18n.t('title', { ns: 'settings' })).toBe('הגדרות');
  });

  it('isRTLLocale is true for Hebrew and false for English', () => {
    expect(isRTLLocale('he')).toBe(true);
    expect(isRTLLocale('en')).toBe(false);
  });
});
