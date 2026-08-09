/**
 * FirstRunFlag — a tiny persisted marker that records whether the app's one-time
 * first-run demo seed has been "consumed", so it is NEVER re-seeded after an
 * account deletion (O1 adopted decision: post-deletion lands on a CLEAN first-run
 * state, no demo Journeys).
 *
 * WHY IT LIVES OUTSIDE THE Repository: `AppCore.start()` seeds the demo data when
 * `repo.load()` returns null (genuine first run). After {@link AppCore.resetToFirstRun}
 * the repository is cleared, so the NEXT launch would also load null and re-seed —
 * bringing the demo Journeys back. This flag survives `repo.clear()` (it is a
 * separate AsyncStorage key the EncryptedLocalRepository never touches) and is set
 * by resetToFirstRun, so a post-deletion relaunch skips the seed and stays clean.
 *
 * Injectable (like every other persistence seam) so engines/tests stay off-device.
 * Reads/writes never throw — a storage hiccup must not crash launch or a deletion.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Single source of truth for the persisted key — no magic-string duplication. */
export const FIRST_RUN_CONSUMED_KEY = 'pushapp.firstRunConsumed.v1';

/** The seam AppCore reads to decide whether the first-run demo seed may run. */
export interface FirstRunFlag {
  /** True once the first-run seed has been consumed (e.g. after a deletion). */
  isConsumed(): Promise<boolean>;
  /** Mark the first-run seed consumed so it never runs again. */
  markConsumed(): Promise<void>;
}

/** Default AsyncStorage-backed flag. A read/write failure degrades to "not consumed". */
export const asyncStorageFirstRunFlag: FirstRunFlag = {
  async isConsumed() {
    try {
      return (await AsyncStorage.getItem(FIRST_RUN_CONSUMED_KEY)) === '1';
    } catch {
      return false;
    }
  },
  async markConsumed() {
    try {
      await AsyncStorage.setItem(FIRST_RUN_CONSUMED_KEY, '1');
    } catch {
      // A write failure only means the guard won't survive a relaunch — never crash.
    }
  },
};
