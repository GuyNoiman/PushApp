/**
 * EncryptedLocalRepository — a Repository backed by on-device AsyncStorage, but
 * the serialized AppState is AES-encrypted AT REST. The privacy model requires raw
 * personal data (Journeys, whys, reasons, Buddy state …) never to sit in cleartext
 * on device. Same interface as LocalRepository — engines and every caller are
 * unchanged; only the composition root swaps the concrete class.
 *
 * KEY MANAGEMENT
 *   A random 256-bit data-encryption key (DEK) is minted on first save and kept in
 *   the OS keychain/keystore via expo-secure-store — NEVER in AsyncStorage, never
 *   logged. AsyncStorage holds only ciphertext plus a non-secret random IV.
 *
 * MIGRATION (S0.4)
 *   A legacy PLAINTEXT snapshot (written by the old LocalRepository under
 *   STORAGE_KEY) is transparently read on first load, re-persisted encrypted, and
 *   the plaintext copy removed — one-time and non-destructive: the plaintext is
 *   only deleted AFTER a successful encrypted write, and never overwrites an
 *   already-encrypted store.
 *
 * CLEAR / KEY ROTATION (S0.4)
 *   clear() removes the ciphertext AND destroys the secure-store DEK, so any
 *   encrypted remnant that outlives the wipe (a stale OS backup, an undeleted
 *   fragment) becomes unrecoverable. The next save() mints a fresh key.
 *
 * INTERIM CRYPTO — see report / security-privacy
 *   AES-256-CBC via crypto-js (pure JS, no native module) — chosen over SQLCipher
 *   to avoid a native dependency for the POC. Two known interim limitations, both
 *   trivially upgradeable behind the injected CryptoProvider seam:
 *     1. CBC is unauthenticated (no MAC). Threat model here is device theft, not an
 *        online tamperer; a corrupt/forged blob simply fails to decrypt and we fall
 *        back to "first run". Authenticated encryption (GCM / encrypt-then-MAC) is
 *        the planned upgrade.
 *     2. Randomness prefers a CSPRNG (globalThis.crypto.getRandomValues — present in
 *        Node/tests, and on-device once a native secure-RNG polyfill lands) and
 *        falls back to a NON-cryptographic source otherwise. Adding a native secure
 *        RNG is the planned upgrade.
 *   Corrupt/undecryptable payloads degrade to null ("first run") rather than
 *   crashing, matching the old LocalRepository.
 *
 * WEB
 *   expo-secure-store has no real web backing (a browser has no OS keychain — its
 *   web module is a throwing no-op). On web we fall back to the same AsyncStorage
 *   (localStorage) for the key so dev/web builds don't crash; the encrypted-at-rest
 *   guarantee applies to the NATIVE builds where a real keychain exists. Same
 *   posture as supabaseClient.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AppState } from '../types/domain';
import { STORAGE_KEY } from './LocalRepository';
import type { Repository } from './Repository';

/** Where the ciphertext lives in AsyncStorage (distinct from the plaintext key). */
export const CIPHERTEXT_KEY = 'pushapp.state.enc.v1';
/** Where the data-encryption key lives in the OS keychain (via expo-secure-store). */
export const DEK_STORE_KEY = 'pushapp.dek.v1';

/** Minimal AsyncStorage-shaped key/value store (injected for testability). */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** The subset of expo-secure-store this repository needs (injected for testability). */
export interface SecureStoreBackend {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

/** Symmetric crypto seam — swappable to authenticated encryption / a native RNG. */
export interface CryptoProvider {
  /** A fresh 256-bit key as hex. */
  randomKeyHex(): string;
  /** Encrypt UTF-8 plaintext under a hex key → a self-describing payload string. */
  encrypt(plaintext: string, keyHex: string): string;
  /** Decrypt a payload; null when it cannot be decrypted/parsed under this key. */
  decrypt(payload: string, keyHex: string): string | null;
}

/**
 * Cryptographically-secure random bytes as hex. Prefers the platform CSPRNG
 * (Web Crypto — present under Node/Jest and jsdom, and on-device once a native
 * secure-RNG polyfill is added). Falls back to a NON-cryptographic source so a
 * device without such a polyfill still encrypts rather than crashing — an interim
 * weakness flagged for the security upgrade (see file header).
 */
function randomBytesHex(byteLength: number): string {
  const g = globalThis as unknown as {
    crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array };
  };
  const toHex = (arr: Uint8Array) =>
    Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  if (g.crypto && typeof g.crypto.getRandomValues === 'function') {
    return toHex(g.crypto.getRandomValues(new Uint8Array(byteLength)));
  }
  // INTERIM, non-CSPRNG fallback — replace with a native secure RNG (see header).
  const weak = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i += 1) weak[i] = Math.floor(Math.random() * 256);
  return toHex(weak);
}

/**
 * Default provider: AES-256-CBC (crypto-js). The IV is generated by OUR
 * randomBytesHex — never by crypto-js's own WordArray.random, which throws in
 * React Native when no secure crypto is present. The payload is a versioned
 * envelope carrying the (non-secret) IV alongside the ciphertext.
 */
export const aesCryptoProvider: CryptoProvider = {
  randomKeyHex() {
    return randomBytesHex(32); // 256-bit
  },

  encrypt(plaintext, keyHex) {
    const key = CryptoJS.enc.Hex.parse(keyHex);
    const iv = CryptoJS.enc.Hex.parse(randomBytesHex(16)); // 128-bit IV
    const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(plaintext), key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return JSON.stringify({
      v: 1,
      iv: iv.toString(CryptoJS.enc.Hex),
      ct: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
    });
  },

  decrypt(payload, keyHex) {
    try {
      const parsed = JSON.parse(payload) as { iv?: string; ct?: string };
      if (typeof parsed.iv !== 'string' || typeof parsed.ct !== 'string') return null;
      const key = CryptoJS.enc.Hex.parse(keyHex);
      const decrypted = CryptoJS.AES.decrypt(
        // crypto-js accepts a CipherParams-like object for raw ciphertext.
        CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Hex.parse(parsed.ct) }),
        key,
        { iv: CryptoJS.enc.Hex.parse(parsed.iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
      );
      const text = decrypted.toString(CryptoJS.enc.Utf8);
      // Wrong key / corrupt bytes → empty or garbage; treat empty as failure.
      return text.length > 0 ? text : null;
    } catch {
      return null;
    }
  },
};

/**
 * Default secure-store backend. On native it is expo-secure-store (OS keychain).
 * On web — where SecureStore is a throwing no-op — it falls back to the same
 * key/value store so dev/web builds don't crash (weaker at-rest posture, see header).
 */
function defaultSecureBackend(kv: KeyValueStore): SecureStoreBackend {
  if (Platform.OS === 'web') {
    return {
      getItemAsync: (k) => kv.getItem(k),
      setItemAsync: (k, v) => kv.setItem(k, v),
      deleteItemAsync: (k) => kv.removeItem(k),
    };
  }
  return {
    getItemAsync: (k) => SecureStore.getItemAsync(k),
    setItemAsync: (k, v) => SecureStore.setItemAsync(k, v),
    deleteItemAsync: (k) => SecureStore.deleteItemAsync(k),
  };
}

export interface EncryptedLocalRepositoryDeps {
  kv?: KeyValueStore;
  secure?: SecureStoreBackend;
  crypto?: CryptoProvider;
}

export class EncryptedLocalRepository implements Repository {
  private readonly kv: KeyValueStore;
  private readonly secure: SecureStoreBackend;
  private readonly crypto: CryptoProvider;

  constructor(deps: EncryptedLocalRepositoryDeps = {}) {
    this.kv = deps.kv ?? AsyncStorage;
    this.secure = deps.secure ?? defaultSecureBackend(this.kv);
    this.crypto = deps.crypto ?? aesCryptoProvider;
  }

  /** Read the DEK from the keychain, minting + persisting one on first use. */
  private async getOrCreateKey(): Promise<string> {
    const existing = await this.secure.getItemAsync(DEK_STORE_KEY);
    if (existing) return existing;
    const key = this.crypto.randomKeyHex();
    await this.secure.setItemAsync(DEK_STORE_KEY, key);
    return key;
  }

  async load(): Promise<AppState | null> {
    // 1) One-time migration of a legacy PLAINTEXT snapshot, if present.
    const legacy = await this.kv.getItem(STORAGE_KEY);
    if (legacy != null) {
      const alreadyEncrypted = await this.kv.getItem(CIPHERTEXT_KEY);
      if (alreadyEncrypted != null) {
        // Encrypted store already wins — the plaintext is a stale remnant from an
        // interrupted earlier migration. Remove it; never let old plaintext clobber
        // newer ciphertext.
        await this.kv.removeItem(STORAGE_KEY);
      } else {
        let state: AppState;
        try {
          state = JSON.parse(legacy) as AppState;
        } catch {
          // Corrupt plaintext — unrecoverable; drop it and continue as first run.
          await this.kv.removeItem(STORAGE_KEY);
          return null;
        }
        try {
          await this.save(state); // re-persist encrypted BEFORE deleting plaintext
          await this.kv.removeItem(STORAGE_KEY);
        } catch {
          // Encrypted re-persist failed — keep the plaintext for a retry next
          // launch (non-destructive) but still run this session from memory.
        }
        return state;
      }
    }

    // 2) Normal encrypted load.
    const raw = await this.kv.getItem(CIPHERTEXT_KEY);
    if (raw == null) return null;
    const keyHex = await this.secure.getItemAsync(DEK_STORE_KEY);
    if (!keyHex) return null; // key gone (e.g. after clear) → nothing recoverable
    const plaintext = this.crypto.decrypt(raw, keyHex);
    if (plaintext == null) return null;
    try {
      return JSON.parse(plaintext) as AppState;
    } catch {
      // Decrypted but not valid JSON — treat as first run rather than crash.
      return null;
    }
  }

  async save(state: AppState): Promise<void> {
    const keyHex = await this.getOrCreateKey();
    const payload = this.crypto.encrypt(JSON.stringify(state), keyHex);
    await this.kv.setItem(CIPHERTEXT_KEY, payload);
  }

  async clear(): Promise<void> {
    await this.kv.removeItem(CIPHERTEXT_KEY);
    // Belt-and-suspenders: drop any legacy plaintext remnant too.
    await this.kv.removeItem(STORAGE_KEY);
    // Rotate/destroy the key so surviving ciphertext remnants are unrecoverable.
    await this.secure.deleteItemAsync(DEK_STORE_KEY);
  }
}
