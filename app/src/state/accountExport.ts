/**
 * accountExport — the pure, testable pieces of the O1 "Your data" actions (PRD §12 erasure +
 * portability): which local preference keys an account deletion must wipe, and how the private profile
 * blob is folded into the data export. Kept out of {@link ./useAccountActions} (which pulls in the
 * file/share/notifications plumbing) so this logic is unit-testable in isolation and has one home.
 *
 * No React, no I/O — string-in/string-out + a static key list.
 */
import { COMMUNICATION_QUIZ_KEY } from '@/state/useCommunicationQuiz';
import { LANGUAGE_PREFERENCE_KEY } from '@/state/LanguagePreference';
import { PROFILE_KEY } from '@/state/ProfileProvider';
import { THEME_PREFERENCE_KEY } from '@/state/ThemePreference';

/**
 * Every AsyncStorage-backed preference key held OUTSIDE the AppCore repo, wiped on account deletion
 * (O1, PRD §12 erasure). The repo state is cleared separately by {@link AppCore.resetToFirstRun}; these
 * are the standalone preference blobs — theme, language, the private profile (form of address, country,
 * birth date, week start, communication style), and any in-progress Communication Style questionnaire.
 */
export const ACCOUNT_STORAGE_KEYS = [
  THEME_PREFERENCE_KEY,
  LANGUAGE_PREFERENCE_KEY,
  PROFILE_KEY,
  COMMUNICATION_QUIZ_KEY,
] as const;

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
