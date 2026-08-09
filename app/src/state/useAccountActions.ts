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
import { useApp } from '@/state/AppProvider';
import { useAuth } from '@/state/AuthProvider';
import { useSocial } from '@/state/SocialProvider';
import { LANGUAGE_PREFERENCE_KEY } from '@/state/LanguagePreference';
import { THEME_PREFERENCE_KEY } from '@/state/ThemePreference';

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
    const json = core.exportStateJson({
      appVersion: Constants.expoConfig?.version ?? '0.0.0',
      exportedAt: Date.now(),
      // Only meaningful once a real (non-anonymous) identity exists.
      uid: user && !user.isAnonymous ? user.id : null,
      handle: profile?.handle ?? null,
    });

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
   * Permanently delete the account. Remote FIRST (when enabled + reachable); only
   * after that is confirmed do we wipe everything local. Throws
   * {@link BackendUnreachableError} (offline) or the remote error (server failure)
   * WITHOUT touching local data, so a failed attempt is fully recoverable.
   */
  const deleteAccount = useCallback(async (): Promise<void> => {
    // 1) Remote delete must succeed before any local wipe.
    if (enabled) {
      const health = await checkBackendHealth();
      if (health !== 'reachable') throw new BackendUnreachableError();
      await deleteRemote(); // throws on failure → we stop here, local intact
    }

    // 2) Remote is gone (or there is no backend). Now wipe local, in order.
    await Notifications.cancelAllScheduledNotificationsAsync();
    await signOut();
    await core.resetToFirstRun();
    await AsyncStorage.multiRemove([THEME_PREFERENCE_KEY, LANGUAGE_PREFERENCE_KEY]);
  }, [enabled, deleteRemote, signOut, core]);

  return { exportData, deleteAccount };
}
