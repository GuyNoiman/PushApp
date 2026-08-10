/**
 * countries — the Own Profile country dataset. Pins the country→week-start mapping (the data behind
 * "country supplies the default week-start day", D33) across the three worldwide conventions, and that
 * every listed code resolves to a valid weekday. Names come from Intl.DisplayNames at runtime, so they
 * are not asserted here.
 */
import { getLocales } from 'expo-localization';

import { COUNTRY_CODES, deviceCountry, weekStartForCountry } from '../countries';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ regionCode: 'IL', languageCode: 'he' }]),
}));

describe('weekStartForCountry', () => {
  it('maps the three worldwide conventions', () => {
    // Sunday-start
    expect(weekStartForCountry('US')).toBe(0);
    expect(weekStartForCountry('IL')).toBe(0);
    expect(weekStartForCountry('JP')).toBe(0);
    // Saturday-start
    expect(weekStartForCountry('SA')).toBe(6);
    expect(weekStartForCountry('AE')).toBe(6);
    // Monday-start (the default for everyone else)
    expect(weekStartForCountry('GB')).toBe(1);
    expect(weekStartForCountry('DE')).toBe(1);
    expect(weekStartForCountry('ZZ')).toBe(1); // unknown → Monday
  });

  it('is case-insensitive on the code', () => {
    expect(weekStartForCountry('us')).toBe(0);
  });

  it('covers all countries with a valid weekday', () => {
    expect(COUNTRY_CODES.length).toBeGreaterThan(150); // effectively the whole world
    for (const code of COUNTRY_CODES) {
      expect([0, 1, 6]).toContain(weekStartForCountry(code));
    }
  });
});

describe('deviceCountry', () => {
  it('reads the device region', () => {
    expect(deviceCountry()).toBe('IL');
  });

  it('falls back to US when no region is available', () => {
    (getLocales as jest.Mock).mockReturnValueOnce([{}]);
    expect(deviceCountry()).toBe('US');
  });
});
