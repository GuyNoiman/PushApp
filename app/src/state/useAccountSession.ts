/**
 * useAccountSession — signing out in a way that is safe for whoever signs in next.
 *
 * THE LEAK THIS CLOSES (found 2026-09-17, `04_Product/Dev_Accounts_And_Restore_Plan_2026-09-17.md`):
 * Settings › Sign out only ended the session. Everything on the phone stayed, so when another account
 * signed in afterwards, the previous person's Journeys were still there — and the backup then copied
 * them INTO the other account. Sign-out is now a switch of account: the phone goes back to a fresh
 * install, and the account that left keeps its backup on the server.
 *
 * THE ORDER, and why each step sits where it does:
 *
 *   1. **Flush the backup** (at most {@link SWITCH_FLUSH_TIMEOUT_MS}). The last changes go to the
 *      account before the phone forgets them. If that fails, the caller is asked whether to go on,
 *      because changes since the last backup will be lost.
 *   2. **Suspend backup writes, and hold the account stores' writes** (`accountStoreWrites.ts`). From
 *      here the device is being emptied: an empty device must never be written over the account's
 *      real backup, and the Profile and Tools stores, which still hold this account in memory, must
 *      not write it back after the wipe. If the switch fails before the wipe is done, the hold is
 *      released, because this account is then still the one on the phone.
 *   3. **Cancel scheduled notifications.** A reminder for the last person's Step must not arrive for
 *      the next one.
 *   4. **Reset the core to a first run**, and put the first run's resume point at
 *      {@link SWITCH_ACCOUNT_RESUME_STEP} straight away: the gate opens the first run the moment the
 *      reset lands, and that screen reads the resume point once, when it mounts. It also keeps a
 *      later launch from mistaking the emptied state for an old install that finished onboarding.
 *   5. **Wipe the account's local keys** (`accountWipe.wipeForAccountSwitch`): everything except
 *      language and theme, plus a new measurement install id.
 *   6. **Sign out**, then 7. **open a fresh anonymous session**, as a new install would have.
 *   8. **Wait for the core's writes to land, then restart the app** (`AccountScope`). The stores in
 *      memory still hold the account that left, and a relaunch is the only thing that empties every
 *      one of them, including stores added later. Where the app cannot relaunch itself (web, Expo
 *      Go), everything that belongs to the account is mounted again instead. Nothing runs after it.
 *
 * Only offered when there is more than one account to be: a build carrying the
 * `EXPO_PUBLIC_SINGLE_USER_*` config signs straight back in as that one user, so it keeps the plain
 * sign-out it always had.
 *
 * Orchestration only (Engineering Bible §19): the core owns its reset, the backup provider owns its
 * writes, the auth provider owns the session.
 */
import * as Notifications from 'expo-notifications';
import { useCallback, useMemo } from 'react';

import { getSingleUserConfig } from '@/core/auth/singleUser';
import type { OnboardingStep } from '@/core/onboarding/model';
import { useApp } from '@/state/AppProvider';
import { useAuth } from '@/state/AuthProvider';
import { useRestartForNextAccount } from '@/state/AccountScope';
import { holdAccountStoreWrites, releaseAccountStoreWrites } from '@/state/accountStoreWrites';
import { wipeForAccountSwitch } from '@/state/accountWipe';
import { useStateBackup, type FlushOutcome } from '@/state/StateBackupProvider';

/** How long the last backup may take before sign-out asks whether to go on without it. */
export const SWITCH_FLUSH_TIMEOUT_MS = 8_000;

/**
 * Where the first run resumes after a switch, and after Delete account (`useAccountActions`), which
 * saves the same point in the same place in its order. Stage 2 of the plan changes this to the
 * account choice ("Create a new account / Sign in"), which does not exist yet.
 */
export const SWITCH_ACCOUNT_RESUME_STEP: OnboardingStep = 'language';

export type SwitchAccountResult = 'switched' | 'cancelled';

export interface SwitchAccountOptions {
  /**
   * Asked only when the last backup could not be written. Resolve true to sign out anyway (changes
   * since the last backup are lost), false to stop with nothing changed. Absent ⇒ go on.
   */
  confirmUnbackedLoss?: () => Promise<boolean>;
}

/** `promise`, or `fallback` once `ms` have passed — whichever comes first. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise.catch(() => fallback), timeout]).finally(() => clearTimeout(timer));
}

export function useAccountSession() {
  const { core } = useApp();
  const { signOut, ensureSession } = useAuth();
  const backup = useStateBackup();
  const restartForNextAccount = useRestartForNextAccount();

  // Read once per mount: the config comes from the build's environment and cannot change at runtime.
  const canSwitchAccount = useMemo(() => getSingleUserConfig() === null, []);

  const switchAccount = useCallback(
    async (options: SwitchAccountOptions = {}): Promise<SwitchAccountResult> => {
      // 1) The last backup, bounded. Nothing has changed yet, so stopping here costs nothing.
      const flushed = await withTimeout<FlushOutcome>(
        backup.flushNow(),
        SWITCH_FLUSH_TIMEOUT_MS,
        'failed',
      );
      if (flushed === 'failed' && options.confirmUnbackedLoss) {
        if (!(await options.confirmUnbackedLoss())) return 'cancelled';
      }

      // 2) No backup write from here on for the account that is leaving, and no account-store write
      // until the app has let go of it.
      backup.suspendWrites();
      holdAccountStoreWrites();

      try {
        // 3) Reminders scheduled for this account's Steps.
        await Notifications.cancelAllScheduledNotificationsAsync();

        // 4) The core, back to a first run, with the resume point in place before the gate reads it.
        await core.resetToFirstRun();
        core.saveOnboardingProgress(SWITCH_ACCOUNT_RESUME_STEP, core.getOnboardingAnswers());

        // 5) The account's keys. Throws when storage refuses — and then the session is NOT ended, so
        // the next account cannot sign in onto a phone still holding this one's data.
        await wipeForAccountSwitch();
      } catch (error) {
        // The account is still the one on the phone, and its stores must go on saving what it does.
        releaseAccountStoreWrites();
        throw error;
      }

      // 6–7) End the session and open the fresh anonymous one a new install gets.
      await signOut();
      await ensureSession();

      // 8) Last, and nothing after it: the resume point and the emptied state on disk, then a fresh
      // start so no store keeps the account that left in memory.
      await core.flushSaves();
      restartForNextAccount();
      return 'switched';
    },
    [backup, core, signOut, ensureSession, restartForNextAccount],
  );

  return { canSwitchAccount, switchAccount };
}
