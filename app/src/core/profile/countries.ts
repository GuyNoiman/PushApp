/**
 * countries — the country dataset behind the Own Profile `country` field (Own_Profile_PRD, D33/D31
 * follow-on). Covers ALL countries (founder): a full ISO 3166-1 alpha-2 code list, localized names via
 * `Intl.DisplayNames` (so the picker reads in the user's language, RTL-safe, with no hand-typed name
 * table), and each country's default WEEK-START day — which worldwide is only ever Sunday, Monday, or
 * Saturday, so it is encoded as a Sunday-set + a Saturday-set with everyone else defaulting to Monday.
 *
 * The country supplies the DEFAULT week-start day; a manual override still wins (owned by
 * `Week_Boundary_Preference_PRD.md`, D33). Pure TS — no React; `Intl`/`expo-localization` are read
 * defensively so an environment without them degrades gracefully.
 */
import { getLocales } from 'expo-localization';

import type { Weekday } from '../util/week';
import { DEFAULT_WEEK_START } from '../util/week';

/** ISO 3166-1 alpha-2 country code (uppercase). */
export type CountryCode = string;

/** Every ISO 3166-1 alpha-2 code — the full set the picker offers. */
export const COUNTRY_CODES: readonly CountryCode[] = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AT', 'AU', 'AW', 'AZ', 'BA', 'BB', 'BD', 'BE',
  'BF', 'BG', 'BH', 'BI', 'BJ', 'BN', 'BO', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CD', 'CF', 'CG',
  'CH', 'CI', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FM', 'FR', 'GA', 'GB', 'GD', 'GE', 'GH', 'GM', 'GN',
  'GQ', 'GR', 'GT', 'GW', 'GY', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IN', 'IQ', 'IR', 'IS', 'IT',
  'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KZ', 'LA', 'LB', 'LC', 'LI',
  'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN',
  'MR', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NE', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NZ',
  'OM', 'PA', 'PE', 'PG', 'PH', 'PK', 'PL', 'PS', 'PT', 'PW', 'PY', 'QA', 'RO', 'RS', 'RU', 'RW', 'SA',
  'SB', 'SC', 'SD', 'SE', 'SG', 'SI', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SY', 'SZ',
  'TD', 'TG', 'TH', 'TJ', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY',
  'UZ', 'VA', 'VC', 'VE', 'VN', 'VU', 'WS', 'YE', 'ZA', 'ZM', 'ZW',
];

// Week-start conventions (CLDR-derived). Everyone not listed starts the week on MONDAY.
const SUNDAY_START: ReadonlySet<CountryCode> = new Set([
  'AG', 'AS', 'AU', 'BD', 'BR', 'BS', 'BT', 'BW', 'BZ', 'CA', 'CN', 'CO', 'DM', 'DO', 'ET', 'GT', 'GU',
  'HK', 'HN', 'ID', 'IL', 'IN', 'JM', 'JP', 'KE', 'KH', 'KR', 'LA', 'MH', 'MM', 'MO', 'MT', 'MX', 'MZ',
  'NI', 'NP', 'PA', 'PE', 'PH', 'PK', 'PR', 'PT', 'PY', 'SG', 'SV', 'TH', 'TT', 'TW', 'US', 'VE',
  'VN', 'WS', 'ZA', 'ZW',
]);
const SATURDAY_START: ReadonlySet<CountryCode> = new Set([
  'AE', 'AF', 'BH', 'DJ', 'DZ', 'EG', 'IQ', 'IR', 'JO', 'KW', 'LY', 'OM', 'QA', 'SA', 'SD', 'SY', 'YE',
]);

/** The default week-start day for a country (Sunday / Saturday sets, else Monday). */
export function weekStartForCountry(code: CountryCode): Weekday {
  const c = code.toUpperCase();
  if (SUNDAY_START.has(c)) return 0;
  if (SATURDAY_START.has(c)) return 6;
  return 1; // Monday — the worldwide default
}

/** The device region's country code (e.g. "IL"), or the app default when unavailable. */
export function deviceCountry(): CountryCode {
  try {
    const region = getLocales()[0]?.regionCode;
    if (typeof region === 'string' && region.length === 2) return region.toUpperCase();
  } catch {
    // No usable locale — fall through.
  }
  return 'US';
}

/** The default week-start day derived from the device region (used before a country is chosen). */
export function deviceWeekStart(): Weekday {
  const country = deviceCountry();
  return country ? weekStartForCountry(country) : DEFAULT_WEEK_START;
}

/**
 * A country's localized display name (e.g. "IL" → "ישראל" in Hebrew), via `Intl.DisplayNames`. Falls
 * back to the raw code if the platform lacks `Intl.DisplayNames` (older Hermes) so the picker never
 * renders blank.
 */
export function countryName(code: CountryCode, locale: string): string {
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region' });
    return dn.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
