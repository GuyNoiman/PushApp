/**
 * i18n — the app's single i18next instance. Framework-free at its core (any
 * engine/service can call `i18n.t(...)` outside React), with react-i18next wired
 * so components use `useTranslation(...)` and re-render on a language change.
 *
 * Boot language is resolved *synchronously* from the device locale (falling back
 * to English) so the first frame renders in a sensible language; the persisted
 * user choice — which needs an async AsyncStorage read — is reconciled a moment
 * later by LanguagePreference, which calls `changeLanguage`.
 *
 * Adding a language: drop `resources/<code>/common.json` + `settings.json`, add
 * the `resources` entries below, and add the catalogue row in `languages.ts`.
 */
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, isSupportedLanguage, type LanguageCode } from './languages';
import enAchievements from './resources/en/achievements.json';
import enBuddy from './resources/en/buddy.json';
import enCircle from './resources/en/circle.json';
import enCoach from './resources/en/coach.json';
import enCoachContent from './resources/en/coachContent.json';
import enCommon from './resources/en/common.json';
import enExplore from './resources/en/explore.json';
import enHome from './resources/en/home.json';
import enInbox from './resources/en/inbox.json';
import enJourney from './resources/en/journey.json';
import enJourneys from './resources/en/journeys.json';
import enMissions from './resources/en/missions.json';
import enSettings from './resources/en/settings.json';
import enShop from './resources/en/shop.json';
import enWeeklyReview from './resources/en/weeklyReview.json';
import heAchievements from './resources/he/achievements.json';
import heBuddy from './resources/he/buddy.json';
import heCircle from './resources/he/circle.json';
import heCoach from './resources/he/coach.json';
import heCoachContent from './resources/he/coachContent.json';
import heCommon from './resources/he/common.json';
import heExplore from './resources/he/explore.json';
import heHome from './resources/he/home.json';
import heInbox from './resources/he/inbox.json';
import heJourney from './resources/he/journey.json';
import heJourneys from './resources/he/journeys.json';
import heMissions from './resources/he/missions.json';
import heSettings from './resources/he/settings.json';
import heShop from './resources/he/shop.json';
import heWeeklyReview from './resources/he/weeklyReview.json';

/** Every namespace we split copy into. `common` is the default. */
export const NAMESPACES = ['common', 'settings', 'home', 'journeys', 'journey', 'coach', 'coachContent', 'circle', 'inbox', 'explore', 'buddy', 'shop', 'missions', 'achievements', 'weeklyReview'] as const;
export const DEFAULT_NAMESPACE = 'common';

export const resources = {
  en: { common: enCommon, settings: enSettings, home: enHome, journeys: enJourneys, journey: enJourney, coach: enCoach, coachContent: enCoachContent, circle: enCircle, inbox: enInbox, explore: enExplore, buddy: enBuddy, shop: enShop, missions: enMissions, achievements: enAchievements, weeklyReview: enWeeklyReview },
  he: { common: heCommon, settings: heSettings, home: heHome, journeys: heJourneys, journey: heJourney, coach: heCoach, coachContent: heCoachContent, circle: heCircle, inbox: heInbox, explore: heExplore, buddy: heBuddy, shop: heShop, missions: heMissions, achievements: heAchievements, weeklyReview: heWeeklyReview },
} as const;

/**
 * The device's language if we support it, else the fallback. Synchronous and
 * defensive — `getLocales()` can be empty or throw in edge/test environments,
 * and either way we degrade quietly to English rather than crashing at boot.
 */
export function resolveDeviceLanguage(): LanguageCode {
  try {
    const code = getLocales()[0]?.languageCode;
    if (isSupportedLanguage(code)) return code;
  } catch {
    // No usable locale — fall through to the default.
  }
  return DEFAULT_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  ns: NAMESPACES,
  defaultNS: DEFAULT_NAMESPACE,
  // React already escapes rendered strings — double-escaping would corrupt copy.
  interpolation: { escapeValue: false },
  // Missing keys should fall back to the key/fallback language, never render null.
  returnNull: false,
});

/** Switch the active language everywhere (returns the i18next load promise). */
export function changeLanguage(code: LanguageCode): Promise<unknown> {
  return i18n.changeLanguage(code);
}

export default i18n;
