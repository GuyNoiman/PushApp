/**
 * useAccountActions — the UI orchestration for the two "Your data" actions (O1):
 * exporting a local copy of your data, and permanently deleting your account.
 *
 * This is the ONE place that sequences the moving parts; the business/state pieces
 * live where they belong (AppCore owns the state wipe + export serialization, the
 * AuthGateway owns the remote delete). No engine logic here — just orchestration
 * of already-built capabilities (Engineering Bible §19).
 *
 * SAFETY MODEL (adopted decisions):
 *  · Export is LOCAL-ONLY: the JSON is written to the cache dir, shared via the OS
 *    share sheet, and the temp file is DELETED right after sharing returns.
 *  · Delete REFUSES to wipe local data until the remote delete is confirmed gone.
 *    When the backend is enabled but unreachable, it throws {@link BackendUnreachableError}
 *    and nothing local is touched (retry works once back online).
 */
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { checkBackendHealth } from '@/core/social/backendHealth';
import { getStateBackupGateway } from '@/core/backup';
import { ACCOUNT_STORAGE_KEYS, mergeProfileIntoExport } from '@/state/accountExport';
import { useApp } from '@/state/AppProvider';
import { useAuth } from '@/state/AuthProvider';
import { useSocial } from '@/state/SocialProvider';
import { PROFILE_KEY } from '@/state/ProfileProvider';

/** The temp filename the export is shared under (deleted right after). */
const EXPORT_FILENAME = 'pushapp-export.json';

/**
 * Thrown when the account backend is enabled but the server can't be reached, so
 * the remote delete could not run. The local data is left UNTOUCHED — the caller
 * surfaces a "try again when online" message and a retry works.
 */
export class BackendUnreachableError extends Error {
  constructor() {
    super('The account server could not be reached — no data was deleted.');
    this.name = 'BackendUnreachableError';
  }
}

export function useAccountActions() {
  const { core } = useApp();
  const { enabled, user, deleteAccount: deleteRemote, signOut } = useAuth();
  const { profile } = useSocial();

  /**
   * Build a local JSON export, hand it to the OS share sheet, then delete the temp
   * file. Resolves `false` when there is nothing to share with (share sheet
   * unavailable); throws only on an unexpected I/O failure.
   */
  const exportData = useCallback(async (): Promise<boolean> => {
    const coreJson = core.exportStateJson({
      appVersion: Constants.expoConfig?.version ?? '0.0.0',
      exportedAt: Date.now(),
      // Only meaningful once a real (non-anonymous) identity exists.
      uid: user && !user.isAnonymous ? user.id : null,
      handle: profile?.handle ?? null,
    });
    // Carry the private profile blob (form of address, country, birth date, week start, communication
    // style) alongside the repo state — the user's own copy must include everything on device (PRD §12).
    const profileRaw = await AsyncStorage.getItem(PROFILE_KEY);
    const json = mergeProfileIntoExport(coreJson, profileRaw);

    const file = new File(Paths.cache, EXPORT_FILENAME);
    try {
      // Overwrite any stale export left by an interrupted earlier attempt.
      if (file.exists) file.delete();
      file.create();
      file.write(json);

      if (!(await Sharing.isAvailableAsync())) return false;
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'Export my data',
      });
      return true;
    } finally {
      // Security: never leave the plaintext export sitting in the cache.
      try {
        if (file.exists) file.delete();
      } catch {
        // A cleanup failure must not mask the original outcome.
      }
    }
  }, [core, user, profile]);

  /**
   * Permanently delete the account. Remote FIRST (when there IS a remote account and it is
   * reachable); only after that is confirmed do we wipe everything local. Throws
   * {@link BackendUnreachableError} (offline) or the remote error (server failure) WITHOUT touching
   * local data, so a failed attempt is fully recoverable.
   *
   * THE DEAD END THIS FIXES (partner, 2026-08-20): he tried to start over, tapped Delete account,
   * and was told his data had NOT been deleted. It had not: the remote call was made with no session
   * to make it with, the server correctly answered 401, and the strict "remote before local" rule
   * did the rest. He was left holding data he had explicitly asked to be rid of, with no way to get
   * rid of it — the app refusing on behalf of an account that does not exist.
   *
   * So the remote step now runs only when there is a SESSION to run it with. The safety rule it was
   * protecting is intact and unchanged: whenever a server-side account exists, it is deleted first,
   * and a failure there still stops everything. What changed is that "there is nobody signed in" is
   * treated as what it is — nothing to delete remotely — instead of as a failure.
   */
  const deleteAccount = useCallback(async (): Promise<void> => {
    // 1) Remote delete must succeed before any local wipe — when there is one to do.
    if (enabled && user) {
      const health = await checkBackendHealth();
      if (health !== 'reachable') throw new BackendUnreachableError();
      await deleteRemote(); // throws on failure → we stop here, local intact
    }

    // 2) Remote is gone (or there was never a remote account). Now wipe local, in order.
    await Notifications.cancelAllScheduledNotificationsAsync();
    await signOut();
    // The account's server-side backup goes with the account (D73). Before the local wipe, so a
    // failure here is visible rather than leaving a copy nobody can see or reach.
    try {
      await getStateBackupGateway().clear();
    } catch {
      // A backup we could not delete belongs to an account that is being deleted anyway — the
      // cascade on `profiles` removes the row with it.
    }
    await core.resetToFirstRun();
    await AsyncStorage.multiRemove([...ACCOUNT_STORAGE_KEYS]);
  }, [enabled, user, deleteRemote, signOut, core]);

  return { exportData, deleteAccount };
}
