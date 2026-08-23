/**
 * The messaging pillar's entry point — mirrors `core/social/index.ts`: one factory, one flag, one
 * inert fallback, so no caller ever has to know whether the backend is configured.
 *
 * The DEVICE KEY lives behind `expo-secure-store`, not AsyncStorage: it is the one secret in the
 * app, and the store the OS protects is where a secret belongs. Losing it means losing the ability
 * to read old messages, which is exactly what the PRD says to be honest about rather than to work
 * around (§14.2).
 */
import * as SecureStore from 'expo-secure-store';

import { generateDeviceKeys, type DeviceKeyPair } from './crypto';
import { NullMessagingGateway, type MessagingGateway } from './MessagingGateway';
import { SupabaseMessagingGateway } from './SupabaseMessagingGateway';

export * from './MessagingGateway';
export * from './model';
export { boxFor, generateDeviceKeys, open, seal, type SealedMessage } from './crypto';

const DEVICE_KEY_STORE = 'pushapp.messageDeviceKey.v1';

let gateway: MessagingGateway | null = null;

export function getMessagingGateway(): MessagingGateway {
  if (!gateway) {
    const supabaseGateway = new SupabaseMessagingGateway();
    gateway = supabaseGateway.enabled ? supabaseGateway : NullMessagingGateway;
  }
  return gateway;
}

/**
 * This device's keypair, generated once and then read from the secure store.
 *
 * Returns null when the secure store is unavailable — messaging then degrades to unreadable rather
 * than to unencrypted, which is the correct direction to fail in.
 */
export async function deviceKeys(): Promise<DeviceKeyPair | null> {
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_KEY_STORE);
    if (stored) {
      const parsed = JSON.parse(stored) as DeviceKeyPair;
      if (typeof parsed?.publicKey === 'string' && typeof parsed?.secretKey === 'string') return parsed;
    }
    const fresh = generateDeviceKeys();
    await SecureStore.setItemAsync(DEVICE_KEY_STORE, JSON.stringify(fresh));
    return fresh;
  } catch {
    return null;
  }
}

/** Forget this device's key — part of account deletion. Old messages become unreadable, by design. */
export async function forgetDeviceKeys(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(DEVICE_KEY_STORE);
  } catch {
    // Nothing to do: a key we cannot delete is a key we also cannot read.
  }
}
