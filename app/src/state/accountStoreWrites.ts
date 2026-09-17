/**
 * accountStoreWrites — the one write path for the account's on-device stores, and the hold that
 * stops them while the phone is being handed to another account.
 *
 * THE LEAK THIS CLOSES (2026-09-17, `04_Product/Dev_Accounts_And_Restore_Plan_2026-09-17.md`). The
 * Profile store, the Tools stores, the celebration switch, the Communication Style questionnaire and
 * the tester flag each keep their data IN MEMORY and write it back on the next change. The wipe that
 * switching or deleting an account runs removes their keys from storage, but not from memory, and
 * `ProfileProvider` writes its WHOLE profile on every edit. So one tap between the wipe and the app
 * restarting would have written the previous person's Personal Details straight back, for whoever
 * signs in next. `useAccountSession` and `useAccountActions` hold these writes from just before the
 * wipe; the restart that follows brings every store back up empty (see `AccountScope`).
 *
 * WHAT IT HOLDS AND WHAT IT DOES NOT: only the stores that belong to the account and hold it in
 * memory. Language and theme describe the phone and survive a switch, so they write directly.
 * `__tests__/accountStoreWrites.test.ts` fails when any file in the React layer (state, hooks,
 * components, screens) writes AsyncStorage any other way, so a store added later cannot quietly step
 * around the hold.
 *
 * A held write is dropped, not queued: whatever it would have written belongs to the account that is
 * leaving. No React and no React Native here, so the stores' key modules stay importable anywhere.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

let held = false;

/** Stop every account-store write until {@link releaseAccountStoreWrites} (or the app restarts). */
export function holdAccountStoreWrites(): void {
  held = true;
}

/** Let account-store writes through again. */
export function releaseAccountStoreWrites(): void {
  held = false;
}

/** Whether account-store writes are held right now. */
export function accountStoreWritesHeld(): boolean {
  return held;
}

/**
 * Write one account-store key, unless writes are held, in which case nothing is written. Rejects when
 * storage does, exactly as `AsyncStorage.setItem` would, so each store keeps its own `.catch`.
 */
export async function writeAccountStore(key: string, value: string): Promise<void> {
  if (held) return;
  await AsyncStorage.setItem(key, value);
}
