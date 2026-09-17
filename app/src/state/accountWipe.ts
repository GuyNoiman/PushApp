/**
 * accountWipe — the device-side wipes that deleting an account and switching account share.
 *
 * The LISTS of what goes live in {@link ./accountExport} (pure, testable). This file is the I/O that
 * acts on them, kept apart so both orchestrators (`useAccountActions.deleteAccount` and
 * `useAccountSession.switchAccount`) run the same code rather than two copies that drift.
 *
 * WHAT WAS MISSING UNTIL 2026-09-17: the per-conversation budget and trace keys, and the messaging
 * device key in the secure store, all survived Delete account. Nothing in them is a person's words,
 * but a wiped phone is supposed to be a fresh install, and those three said otherwise.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { asyncStorageConversationTrace, CONVERSATION_KINDS } from '@/core/llm/conversationTrace';
import { startNewKpiInstallation } from '@/core/kpi/wireKpi';
import { forgetDeviceKeys } from '@/core/messaging';
import { ACCOUNT_STORAGE_PREFIXES, SWITCH_ACCOUNT_STORAGE_KEYS } from '@/state/accountExport';

/** Remove every AsyncStorage key that starts with one of `prefixes`. Throws if storage does. */
export async function removeKeysWithPrefixes(prefixes: readonly string[]): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const doomed = keys.filter((key) => prefixes.some((prefix) => key.startsWith(prefix)));
  if (doomed.length > 0) await AsyncStorage.multiRemove(doomed);
}

/**
 * The conversation budget and trace keys, and this device's messaging key.
 *
 * The trace store also holds each conversation's id IN MEMORY (its failure plan when storage is
 * broken), so removing the keys alone would let the running app keep grouping the next account's
 * cost under the last account's conversation. `clear` drops both.
 */
export async function wipeConversationAndMessagingKeys(): Promise<void> {
  await removeKeysWithPrefixes(ACCOUNT_STORAGE_PREFIXES);
  for (const kind of CONVERSATION_KINDS) await asyncStorageConversationTrace.clear(kind);
  // Old messages become unreadable on this phone, by design: the key belonged to the account that
  // is leaving, and publishing it again for the next one would tie the two accounts together.
  await forgetDeviceKeys();
}

/**
 * Everything a SWITCH of account removes beyond the AppCore state: every account key except the
 * device preferences (language, theme), the conversation and messaging keys, and the measurement
 * identity — a fresh install id and no memory of once-per-install events, in storage AND in the
 * running KPI stream.
 *
 * Throws when storage refuses. The caller must then NOT go on to sign out: a phone handed to the
 * next account with the last one's keys still on it is the leak this exists to prevent.
 */
export async function wipeForAccountSwitch(): Promise<void> {
  await AsyncStorage.multiRemove([...SWITCH_ACCOUNT_STORAGE_KEYS]);
  await wipeConversationAndMessagingKeys();
  await startNewKpiInstallation();
}
