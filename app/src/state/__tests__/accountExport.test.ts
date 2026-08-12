/**
 * accountExport — the O1 privacy guarantees (PRD §12): the data export CARRIES the private profile blob
 * (so `communicationProfile` + the other profile fields are portable), and account deletion wipes the
 * profile blob AND any in-progress Communication Style questionnaire (so nothing survives an erasure).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { ACCOUNT_STORAGE_KEYS, mergeProfileIntoExport } from '@/state/accountExport';
import { COMMUNICATION_QUIZ_KEY } from '@/state/useCommunicationQuiz';
import { PROFILE_KEY } from '@/state/ProfileProvider';
import { LANGUAGE_PREFERENCE_KEY } from '@/state/LanguagePreference';
import { THEME_PREFERENCE_KEY } from '@/state/ThemePreference';

describe('mergeProfileIntoExport (PRD §12 portability)', () => {
  const coreJson = JSON.stringify({ schemaVersion: 3, state: { journeys: [] } });

  it('attaches the profile blob as a top-level `profile` field, carrying communicationProfile', () => {
    const profileRaw = JSON.stringify({
      communicationProfile: 'direct',
      country: 'IL',
      addressForm: 'feminine',
    });
    const parsed = JSON.parse(mergeProfileIntoExport(coreJson, profileRaw)) as {
      schemaVersion: number;
      profile: { communicationProfile: string; country: string; addressForm: string };
    };
    expect(parsed.schemaVersion).toBe(3); // repo state is preserved
    expect(parsed.profile.communicationProfile).toBe('direct');
    expect(parsed.profile.country).toBe('IL');
    expect(parsed.profile.addressForm).toBe('feminine');
  });

  it('degrades to a null profile when nothing is stored (never throws)', () => {
    const parsed = JSON.parse(mergeProfileIntoExport(coreJson, null)) as { profile: unknown };
    expect(parsed.profile).toBeNull();
  });
});

describe('ACCOUNT_STORAGE_KEYS (PRD §12 erasure)', () => {
  it('wipes the profile blob AND the in-progress questionnaire on delete', () => {
    expect(ACCOUNT_STORAGE_KEYS).toContain(PROFILE_KEY);
    expect(ACCOUNT_STORAGE_KEYS).toContain(COMMUNICATION_QUIZ_KEY);
    // Still wipes the pre-existing theme + language prefs.
    expect(ACCOUNT_STORAGE_KEYS).toContain(THEME_PREFERENCE_KEY);
    expect(ACCOUNT_STORAGE_KEYS).toContain(LANGUAGE_PREFERENCE_KEY);
  });
});
