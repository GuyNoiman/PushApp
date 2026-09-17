/**
 * accountExport — the pure, testable pieces of the O1 "Your data" actions (PRD §12 erasure +
 * portability): which local preference keys an account deletion must wipe, and how the private profile
 * blob is folded into the data export. Kept out of {@link ./useAccountActions} (which pulls in the
 * file/share/notifications plumbing) so this logic is unit-testable in isolation and has one home.
 *
 * No React, no I/O — string-in/string-out + a static key list.
 */
import { BUDGET_KEY_PREFIX } from '@/core/llm/conversationBudgetStore';
import { TRACE_KEY_PREFIX } from '@/core/llm/conversationTrace';
import { NOTIFICATION_READS_KEY } from '@/core/social/notificationReads';
import { TOOL_RECORD_STORAGE_KEYS } from '@/state/ToolRecordsStore';
import { CELEBRATIONS_ENABLED_KEY } from '@/state/CelebrationPreference';
import { COMMUNICATION_QUIZ_KEY } from '@/state/useCommunicationQuiz';
import { LANGUAGE_PREFERENCE_KEY } from '@/state/LanguagePreference';
import { LIFE_WHEEL_ANSWERS_KEY, LIFE_WHEEL_SUMMARY_KEY } from '@/state/LifeWheelStore';
import { PASSION_DRAFT_KEY, PASSION_MAP_KEY } from '@/state/PassionMapStore';
import { LEGACY_ADDRESS_KEY, LEGACY_WEEK_START_KEY, PROFILE_KEY } from '@/state/ProfileProvider';
import { REFLECTIONS_KEY } from '@/state/ReflectionsStore';
// TEMPORARY tester tools — remove this import and its key below with `state/TesterTools.ts`.
import { TESTER_TOOLS_KEY } from '@/state/TesterTools';
import { THEME_PREFERENCE_KEY } from '@/state/ThemePreference';
import { TOOLS_SAVED_KEY, TOOLS_USAGE_KEY } from '@/state/ToolsShelf';
import { VALUES_STATE_KEY } from '@/state/ValuesStore';

/**
 * Every AsyncStorage-backed blob held OUTSIDE the AppCore repo, wiped on account deletion
 * (O1, PRD §12 erasure). The repo state is cleared separately by {@link AppCore.resetToFirstRun}; these
 * are the standalone keys — theme, language, the private profile (form of address, country,
 * birth date, week start, communication style), any in-progress Communication Style questionnaire,
 * and **everything the Tools tab stores**.
 *
 * THE TOOL KEYS WERE MISSING (found 2026-08-21, while writing the privacy contract). The list was
 * written before the Tools existed and was never widened when they landed, so a Delete account left
 * the Life Wheel answers, the Values sort, the Passion Map and the reflections sitting on the
 * device. Those are the most personal things in the product and they are exactly what the promise
 * in `04_Product/Privacy_Contract_With_The_User.md` §0 says deletion removes.
 *
 * **Adding a new AsyncStorage key means adding it here in the same commit.** The test in
 * `__tests__/accountExport.test.ts` names each one so a missing key fails CI rather than quietly
 * surviving a deletion.
 */
export const ACCOUNT_STORAGE_KEYS = [
  THEME_PREFERENCE_KEY,
  LANGUAGE_PREFERENCE_KEY,
  PROFILE_KEY,
  COMMUNICATION_QUIZ_KEY,
  CELEBRATIONS_ENABLED_KEY,
  // Tools — raw answers and the derived summaries alike (Tool Addition Protocol §2.3: on-device
  // only, which is exactly why deletion has to reach them).
  LIFE_WHEEL_ANSWERS_KEY,
  LIFE_WHEEL_SUMMARY_KEY,
  VALUES_STATE_KEY,
  PASSION_MAP_KEY,
  PASSION_DRAFT_KEY,
  REFLECTIONS_KEY,
  TOOLS_USAGE_KEY,
  TOOLS_SAVED_KEY,
  // Every record-keeping tool at once — the list is generated from the tool keys, so a new tool
  // cannot be added without its storage being wiped on deletion.
  ...TOOL_RECORD_STORAGE_KEYS,
  // The bell's read marks.
  NOTIFICATION_READS_KEY,
  // TEMPORARY: the hidden tester-tools switch. A wiped device is a fresh install, and a fresh install
  // has the tools off.
  TESTER_TOOLS_KEY,
  // The two keys the profile blob replaced. ProfileProvider still reads them whenever the profile
  // blob is missing — which is exactly what a wipe leaves behind (added 2026-09-17).
  LEGACY_ADDRESS_KEY,
  LEGACY_WEEK_START_KEY,
] as const;

/**
 * Key PREFIXES wiped with the account, for stores that write one key per conversation rather than
 * one key in total (added 2026-09-17). They were missing from the deletion: how much of the coach's
 * allowance a conversation had used, and the random id that groups its cost, both outlived the
 * account. Neither holds anything a person wrote, but a wiped device is a fresh install, and a
 * fresh install starts with neither.
 */
export const ACCOUNT_STORAGE_PREFIXES = [BUDGET_KEY_PREFIX, TRACE_KEY_PREFIX] as const;

/**
 * The account keys a SWITCH of account keeps (Settings › Sign out, `useAccountSession`). Language
 * and theme describe the phone and the person holding it right now, not the account: whoever signs
 * in next is almost always the same person, and meeting the first run in a language they did not
 * choose is not a privacy gain.
 *
 * Deletion keeps nothing, so {@link ACCOUNT_STORAGE_KEYS} still lists both.
 */
export const DEVICE_PREFERENCE_KEYS = [LANGUAGE_PREFERENCE_KEY, THEME_PREFERENCE_KEY] as const;

/**
 * Everything a switch of account removes from AsyncStorage by exact key: every account key except
 * the device preferences. Personal Details, the Tools, the bell's read marks and the tester flag all
 * belong to the account that is leaving.
 *
 * `__tests__/accountKeyClassification.test.ts` scans the source for every `pushapp.` key and fails
 * when one is neither wiped nor deliberately kept — so a new key cannot quietly follow the phone
 * into somebody else's account.
 */
export const SWITCH_ACCOUNT_STORAGE_KEYS: readonly string[] = ACCOUNT_STORAGE_KEYS.filter(
  (key) => !(DEVICE_PREFERENCE_KEYS as readonly string[]).includes(key),
);

/**
 * Fold the private profile blob into the data export (O1, PRD §12 portability). The AppCore export
 * covers repo state only; the profile (a separate AsyncStorage key) carries the user's form of address,
 * country, birth date, week start, and communication style — so it must ride along as a top-level
 * `profile` field. Pure string-in/string-out so it is testable without the file/share plumbing.
 */
export function mergeProfileIntoExport(coreJson: string, profileRaw: string | null): string {
  const base = JSON.parse(coreJson) as Record<string, unknown>;
  const profile = profileRaw ? (JSON.parse(profileRaw) as unknown) : null;
  return JSON.stringify({ ...base, profile }, null, 2);
}
