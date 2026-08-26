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
import enCelebration from './resources/en/celebration.json';
import enCircle from './resources/en/circle.json';
import enCoach from './resources/en/coach.json';
import enCoachContent from './resources/en/coachContent.json';
import enCommon from './resources/en/common.json';
import enCommunication from './resources/en/communication.json';
import enDreams from './resources/en/dreams.json';
import enExplore from './resources/en/explore.json';
import enFriendProfile from './resources/en/friendProfile.json';
import enHome from './resources/en/home.json';
import enInactivity from './resources/en/inactivity.json';
import enInbox from './resources/en/inbox.json';
import enLibrary from './resources/en/library.json';
import enJourney from './resources/en/journey.json';
import enJourneys from './resources/en/journeys.json';
import enMotivation from './resources/en/motivation.json';
import enNotify from './resources/en/notify.json';
import enOnboarding from './resources/en/onboarding.json';
import enRecovery from './resources/en/recovery.json';
import enSettings from './resources/en/settings.json';
import enTools from './resources/en/tools.json';
import enWeeklyReview from './resources/en/weeklyReview.json';
import heCelebration from './resources/he/celebration.json';
import heCircle from './resources/he/circle.json';
import heCoach from './resources/he/coach.json';
import heCoachContent from './resources/he/coachContent.json';
import heCommon from './resources/he/common.json';
import heCommunication from './resources/he/communication.json';
import heExplore from './resources/he/explore.json';
import heFriendProfile from './resources/he/friendProfile.json';
import heHome from './resources/he/home.json';
import heInactivity from './resources/he/inactivity.json';
import heInbox from './resources/he/inbox.json';
import heLibrary from './resources/he/library.json';
import heJourney from './resources/he/journey.json';
import heJourneys from './resources/he/journeys.json';
import heMotivation from './resources/he/motivation.json';
import heNotify from './resources/he/notify.json';
import heSettings from './resources/he/settings.json';
import heTools from './resources/he/tools.json';
import heWeeklyReview from './resources/he/weeklyReview.json';
import heDreams from './resources/he/dreams.json';
import heOnboarding from './resources/he/onboarding.json';
import heRecovery from './resources/he/recovery.json';

/** Every namespace we split copy into. `common` is the default. */
export const NAMESPACES = ['common', 'settings', 'home', 'journeys', 'journey', 'coach', 'coachContent', 'circle', 'inbox', 'friendProfile', 'explore', 'weeklyReview', 'dreams', 'notify', 'motivation', 'onboarding', 'communication', 'celebration', 'inactivity', 'recovery', 'library', 'tools'] as const;
export const DEFAULT_NAMESPACE = 'common';

export const resources = {
  en: { common: enCommon, settings: enSettings, home: enHome, journeys: enJourneys, journey: enJourney, coach: enCoach, coachContent: enCoachContent, circle: enCircle, inbox: enInbox, friendProfile: enFriendProfile, explore: enExplore, weeklyReview: enWeeklyReview, dreams: enDreams, notify: enNotify, motivation: enMotivation, onboarding: enOnboarding, communication: enCommunication, celebration: enCelebration, inactivity: enInactivity, recovery: enRecovery, library: enLibrary, tools: enTools },
  he: { common: heCommon, settings: heSettings, home: heHome, journeys: heJourneys, journey: heJourney, coach: heCoach, coachContent: heCoachContent, circle: heCircle, inbox: heInbox, friendProfile: heFriendProfile, explore: heExplore, weeklyReview: heWeeklyReview, dreams: heDreams, notify: heNotify, motivation: heMotivation, onboarding: heOnboarding, communication: heCommunication, celebration: heCelebration, inactivity: heInactivity, recovery: heRecovery, library: heLibrary, tools: heTools },
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
