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
import { NOTIFICATION_READS_KEY } from '@/core/social/notificationReads';
import { CELEBRATIONS_ENABLED_KEY } from '@/state/CelebrationPreference';
import { LIFE_WHEEL_ANSWERS_KEY, LIFE_WHEEL_SUMMARY_KEY } from '@/state/LifeWheelStore';
import { PASSION_DRAFT_KEY, PASSION_MAP_KEY } from '@/state/PassionMapStore';
import { REFLECTIONS_KEY } from '@/state/ReflectionsStore';
import { TOOLS_SAVED_KEY, TOOLS_USAGE_KEY } from '@/state/ToolsShelf';
import { VALUES_STATE_KEY } from '@/state/ValuesStore';
import { TOOL_RECORD_KEYS, TOOL_RECORD_STORAGE_KEYS, toolStorageKey } from '@/state/ToolRecordsStore';

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

  /**
   * The regression this file exists for (2026-08-21). The Tools landed after this list was written
   * and nothing widened it, so a Delete account left the Life Wheel answers, the Values sort, the
   * Passion Map and the reflections on the device — the most personal content in the product,
   * surviving the one action a user takes to be rid of it. Each key is named individually so a new
   * tool that forgets to register fails here instead of in someone's hands.
   */
  it('wipes everything the Tools tab stores — raw answers and derived summaries alike', () => {
    for (const key of [
      LIFE_WHEEL_ANSWERS_KEY,
      LIFE_WHEEL_SUMMARY_KEY,
      VALUES_STATE_KEY,
      PASSION_MAP_KEY,
      PASSION_DRAFT_KEY,
      REFLECTIONS_KEY,
      TOOLS_USAGE_KEY,
      TOOLS_SAVED_KEY,
    ]) {
      expect(ACCOUNT_STORAGE_KEYS).toContain(key);
    }
  });

  it('wipes the celebration preference and the notification read marks', () => {
    expect(ACCOUNT_STORAGE_KEYS).toContain(CELEBRATIONS_ENABLED_KEY);
    expect(ACCOUNT_STORAGE_KEYS).toContain(NOTIFICATION_READS_KEY);
  });

  it('wipes every record-keeping tool, including any added later', () => {
    // Generated rather than listed: a tool added to TOOL_RECORD_KEYS without its storage being
    // wiped on deletion is the exact regression this file exists for.
    for (const key of TOOL_RECORD_STORAGE_KEYS) expect(ACCOUNT_STORAGE_KEYS).toContain(key);
    expect(TOOL_RECORD_STORAGE_KEYS).toHaveLength(TOOL_RECORD_KEYS.length);
    expect(toolStorageKey('gratitude')).toBe('pushapp.tool.gratitude');
  });

  it('holds no duplicates — a repeated key is a merge accident, not a wipe twice', () => {
    expect(new Set(ACCOUNT_STORAGE_KEYS).size).toBe(ACCOUNT_STORAGE_KEYS.length);
  });
});
