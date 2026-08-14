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
 *   Key material comes ONLY from a platform CSPRNG (see randomBytesHex); if none
 *   can be reached we throw rather than encrypt under a guessable key.
 *
 * KEY GENERATIONS / ROTATION (S0.5)
 *   Both the DEK and the ciphertext carry a generation number in their storage
 *   slot. Generation v1 keys were minted before the CSPRNG fix and may be weak,
 *   so a v1 store is transparently re-encrypted under a fresh v2 key on the first
 *   load after the upgrade. The two generations live in SEPARATE slots so the old
 *   copy stays readable until the new one is committed — see rotateLegacyKey().
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
 * UNREADABLE DATA (Encryption_Design §6, Phase C0)
 *   A snapshot we cannot open is NOT a first run, and saying so was how real data
 *   got destroyed: the app started empty and the next state change wrote that empty
 *   state over the still-intact ciphertext. load() now classifies the failure
 *   (key-lost / corrupt / malformed), copies the bytes into quarantine, refuses
 *   every subsequent save, and reports it so the app can tell the user the truth.
 *   Nothing is ever deleted — the DEK is kept too, because a blob we cannot read
 *   today may be readable once the reason is understood.
 *
 * INTERIM CRYPTO — see report / security-privacy
 *   AES-256-CBC via crypto-js (pure JS, no native module) — chosen over SQLCipher
 *   to avoid a native dependency for the POC. One known interim limitation, left
 *   trivially upgradeable behind the injected CryptoProvider seam: CBC is
 *   unauthenticated (no MAC). Threat model here is device theft, not an online
 *   tamperer. The absent MAC also means "wrong key", "corrupt" and "tampered" are
 *   not truly distinguishable — they all surface as `corrupt`; authenticated
 *   encryption (the planned upgrade, tracked separately) is what makes that
 *   classification trustworthy.
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
import * as ExpoCrypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AppState } from '../types/domain';
import type { KeyValueStore } from './keyValueStore';
import { STORAGE_KEY } from './LocalRepository';
import { clearQuarantine, quarantineSnapshot, readRecoveryMarker } from './quarantine';
import {
  RepositoryLockedError,
  type LoadFailureReason,
  type LoadResult,
  type Repository,
} from './Repository';

/** Where the ciphertext lives in AsyncStorage (distinct from the plaintext key). */
export const CIPHERTEXT_KEY = 'pushapp.state.enc.v2';
/** Where the data-encryption key lives in the OS keychain (via expo-secure-store). */
export const DEK_STORE_KEY = 'pushapp.dek.v2';
/** Pre-rotation ciphertext slot — encrypted under a possibly-weak generation-1 DEK. */
export const LEGACY_CIPHERTEXT_KEY = 'pushapp.state.enc.v1';
/** Pre-rotation DEK slot — minted before the CSPRNG fix, so it may be guessable. */
export const LEGACY_DEK_STORE_KEY = 'pushapp.dek.v1';

/**
 * The injected key/value seam. Re-exported from its own module so this repository,
 * LocalRepository and the quarantine helper all share one definition — importers
 * that already reach for it here are unaffected.
 */
export type { KeyValueStore };

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
 * Thrown when no cryptographically secure random source can be reached. There is
 * deliberately no fallback: silently degrading to a weak source hands the caller a
 * key it believes is strong, which is strictly worse than not starting. The message
 * is verbose on purpose — it has to be unmistakable in a crash report.
 */
export class InsecureRandomnessError extends Error {
  constructor(reason: string) {
    super(
      `PushApp: refusing to generate encryption material — no cryptographically secure ` +
        `random source is available (${reason}). Nothing was encrypted and nothing was ` +
        `written; existing data is untouched.`,
    );
    this.name = 'InsecureRandomnessError';
  }
}

/**
 * Fill a buffer from a platform CSPRNG. Two sources, in order:
 *
 *   1. Web Crypto (globalThis.crypto.getRandomValues) — spec-guaranteed to be
 *      cryptographically strong. This is the browser/web path and the Node path
 *      the test suite runs on.
 *   2. expo-crypto's getRandomValues — the on-device path. Hermes ships no Web
 *      Crypto and Expo's winter runtime does not polyfill it, so on a real device
 *      source 1 is absent and this is what actually runs. Deliberately NOT
 *      Crypto.getRandomBytes(), which documents a Math.random() fallback when
 *      remote JS debugging is attached — exactly the weakness we are removing.
 *
 * Anything else throws.
 */
function fillWithSecureRandom(bytes: Uint8Array): void {
  // globalThis.crypto is typed as the DOM Crypto by our "DOM" lib, but it is
  // genuinely absent under Hermes — cast so the absence is expressible.
  const g = globalThis as unknown as {
    crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array };
  };
  if (g.crypto && typeof g.crypto.getRandomValues === 'function') {
    g.crypto.getRandomValues(bytes);
  } else if (typeof ExpoCrypto.getRandomValues === 'function') {
    ExpoCrypto.getRandomValues(bytes);
  } else {
    throw new InsecureRandomnessError('Web Crypto absent and expo-crypto unavailable');
  }

  // A stubbed or unlinked RNG (a mocked native module, a no-op shim) returns
  // without touching the buffer, leaving it all zeros — which looks like a
  // perfectly ordinary key. A real CSPRNG produces an all-zero buffer with
  // probability 2^-(8*byteLength), i.e. never at these sizes. So treat all-zero
  // as a broken source rather than mint a key an attacker already knows.
  if (bytes.every((b) => b === 0)) {
    throw new InsecureRandomnessError('the random source returned all-zero bytes');
  }
}

/** Cryptographically-secure random bytes as hex. Throws if no CSPRNG is reachable. */
function randomBytesHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  fillWithSecureRandom(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
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

/** What the storage slots hold: a complete pair, ciphertext with no key, or nothing. */
type CiphertextSlot =
  | { kind: 'pair'; slotKey: string; raw: string; keyHex: string }
  | { kind: 'keyless'; slotKey: string; raw: string }
  | { kind: 'none' };

/** An attempt to open the live store that did not produce an AppState. */
interface LiveReadFailure {
  kind: 'failed';
  reason: LoadFailureReason;
  /** Which slot the bytes came from, so the right one is quarantined. */
  slotKey: string;
  /** The bytes exactly as read — preserved unmodified. */
  raw: string;
}

/** The side-effect-free result of reading the live store. */
type LiveRead = { kind: 'loaded'; state: AppState } | { kind: 'none' } | LiveReadFailure;

export interface EncryptedLocalRepositoryDeps {
  kv?: KeyValueStore;
  secure?: SecureStoreBackend;
  crypto?: CryptoProvider;
}

export class EncryptedLocalRepository implements Repository {
  private readonly kv: KeyValueStore;
  private readonly secure: SecureStoreBackend;
  private readonly crypto: CryptoProvider;
  /**
   * Set the moment a load finds an unreadable store, and cleared only by clear().
   * It is the last line of defence: even a caller that ignores the LoadResult
   * cannot write over data it could not open (see {@link RepositoryLockedError}).
   */
  private locked = false;

  constructor(deps: EncryptedLocalRepositoryDeps = {}) {
    this.kv = deps.kv ?? AsyncStorage;
    this.secure = deps.secure ?? defaultSecureBackend(this.kv);
    this.crypto = deps.crypto ?? aesCryptoProvider;
  }

  /**
   * Read the CURRENT-generation DEK from the keychain, minting + persisting one on
   * first use. It never returns a legacy key: once rotation has run there is no
   * legacy key left, and if rotation has not run yet, load() runs it first.
   */
  private async getOrCreateKey(): Promise<string> {
    const existing = await this.secure.getItemAsync(DEK_STORE_KEY);
    if (existing) return existing;
    const key = this.crypto.randomKeyHex();
    await this.secure.setItemAsync(DEK_STORE_KEY, key);
    return key;
  }

  /**
   * The live ciphertext and the key it is encrypted under, newest generation
   * first. Falling through to the legacy generation is what makes an interrupted
   * rotation harmless: if the new key was never committed, the old pair is still
   * a complete, readable store.
   *
   * A slot holding ciphertext with NO key behind it is reported as `key-lost`
   * rather than as nothing-here — that is the restored-backup / keystore-reset
   * case, and calling it "first run" is what used to destroy the data. A complete
   * pair always wins over a keyless slot: readable data outranks a diagnosis.
   */
  private async readCiphertextAndKey(): Promise<CiphertextSlot> {
    const keyHex = await this.secure.getItemAsync(DEK_STORE_KEY);
    const raw = await this.kv.getItem(CIPHERTEXT_KEY);
    if (keyHex && raw != null) return { kind: 'pair', slotKey: CIPHERTEXT_KEY, raw, keyHex };

    const legacyKeyHex = await this.secure.getItemAsync(LEGACY_DEK_STORE_KEY);
    const legacyRaw = await this.kv.getItem(LEGACY_CIPHERTEXT_KEY);
    if (legacyKeyHex && legacyRaw != null) {
      return { kind: 'pair', slotKey: LEGACY_CIPHERTEXT_KEY, raw: legacyRaw, keyHex: legacyKeyHex };
    }

    if (raw != null) return { kind: 'keyless', slotKey: CIPHERTEXT_KEY, raw };
    if (legacyRaw != null) return { kind: 'keyless', slotKey: LEGACY_CIPHERTEXT_KEY, raw: legacyRaw };
    return { kind: 'none' };
  }

  /**
   * Read + decrypt + parse the live store, with NO side effects. Kept separate from
   * the quarantine handling so the same read can be retried (see load()) without
   * moving anything around.
   */
  private async readLiveSnapshot(): Promise<LiveRead> {
    const slot = await this.readCiphertextAndKey();
    if (slot.kind === 'none') return { kind: 'none' };
    if (slot.kind === 'keyless') {
      return { kind: 'failed', reason: 'key-lost', slotKey: slot.slotKey, raw: slot.raw };
    }

    const plaintext = this.crypto.decrypt(slot.raw, slot.keyHex);
    if (plaintext == null) {
      return { kind: 'failed', reason: 'corrupt', slotKey: slot.slotKey, raw: slot.raw };
    }
    try {
      return { kind: 'loaded', state: JSON.parse(plaintext) as AppState };
    } catch {
      // It decrypted and then did not parse, so the bytes on disk are fine and our
      // shape is not. Preserve them anyway — this is recoverable by a later fix.
      return { kind: 'failed', reason: 'malformed', slotKey: slot.slotKey, raw: slot.raw };
    }
  }

  /**
   * Copy the unreadable bytes aside, lock the store against every further write,
   * and report it. `sourceKey` is null for `key-lost`, i.e. copy but do NOT empty
   * the live slot: an unreachable keychain (a device still locked when the app was
   * woken in the background) looks exactly like a lost key, and that must be able
   * to heal itself on the next launch instead of stranding a healthy store.
   */
  private async quarantineAndReport(read: LiveReadFailure): Promise<LoadResult> {
    this.locked = true;
    const outcome = await quarantineSnapshot(this.kv, {
      sourceKey: read.reason === 'key-lost' ? null : read.slotKey,
      raw: read.raw,
      reason: read.reason,
      now: Date.now(),
    });
    return {
      kind: 'unreadable',
      reason: outcome.reason,
      at: outcome.at,
      quarantinedKey: outcome.quarantinedKey,
    };
  }

  /** Drop the superseded generation. Only ever called once the new one is readable. */
  private async discardLegacyGeneration(): Promise<void> {
    await this.kv.removeItem(LEGACY_CIPHERTEXT_KEY);
    await this.secure.deleteItemAsync(LEGACY_DEK_STORE_KEY);
  }

  /**
   * KEY ROTATION (S0.5) — retire a generation-1 DEK, which may have been minted
   * from the old non-cryptographic RNG. A weak key stays weak forever, so it has
   * to be replaced; but the founder's device holds real data, so the rotation must
   * be impossible to lose data to.
   *
   * The two generations occupy SEPARATE slots, which is what makes the sequence
   * safe. Rotating in place cannot be: whichever of {new ciphertext, new key} you
   * write first, a crash before the second write leaves a blob and a key that do
   * not match, and the data is gone. With two slots there is exactly one commit
   * point — publishing the new key — and every intermediate state is readable:
   *
   *   write new ciphertext (new slot)   old slot + old key still complete
   *   publish new key       ← COMMIT    readers switch to the new generation
   *   delete old slot + key             tidy-up only; safe to fail
   *
   * A crash before COMMIT leaves an orphaned new blob that the next attempt simply
   * overwrites. A crash after COMMIT leaves a stale legacy pair that the next load
   * tidies away. Either way the next launch retries, and nothing is destroyed.
   */
  private async rotateLegacyKey(): Promise<void> {
    const legacyKeyHex = await this.secure.getItemAsync(LEGACY_DEK_STORE_KEY);
    if (!legacyKeyHex) return; // the steady state — nothing to rotate

    // A current key already exists: either rotation committed and only the
    // clean-up was interrupted, or a fresh store was created alongside a stale
    // legacy remnant. Only tidy the legacy pair away once the current generation
    // is actually on disk — never delete the last readable copy.
    const currentKeyHex = await this.secure.getItemAsync(DEK_STORE_KEY);
    if (currentKeyHex) {
      if ((await this.kv.getItem(CIPHERTEXT_KEY)) != null) await this.discardLegacyGeneration();
      return;
    }

    const legacyCiphertext = await this.kv.getItem(LEGACY_CIPHERTEXT_KEY);
    if (legacyCiphertext == null) {
      // A key with no data behind it — nothing to preserve, so retiring it is free.
      await this.secure.deleteItemAsync(LEGACY_DEK_STORE_KEY);
      return;
    }

    const plaintext = this.crypto.decrypt(legacyCiphertext, legacyKeyHex);
    if (plaintext == null) {
      // Already unreadable under its own key (corrupt or foreign blob). Rotation
      // cannot rescue it, and deleting it could destroy something a later fix
      // might recover — so leave both the key and the blob exactly as they are and
      // let the normal load path classify it and move it into quarantine.
      return;
    }

    const freshKeyHex = this.crypto.randomKeyHex();
    await this.kv.setItem(CIPHERTEXT_KEY, this.crypto.encrypt(plaintext, freshKeyHex));
    await this.secure.setItemAsync(DEK_STORE_KEY, freshKeyHex); // COMMIT
    await this.discardLegacyGeneration();
  }

  async load(): Promise<LoadResult> {
    // 0) A quarantine recorded on an earlier launch outranks everything below: the
    //    live slot may now look empty precisely BECAUSE the data was moved aside,
    //    and that must never read as a first run.
    const marker = await readRecoveryMarker(this.kv);
    if (marker) {
      // `key-lost` is the one classification that can be transient — a keychain that
      // was merely unavailable (device still locked while the app was woken in the
      // background) is indistinguishable from a key that is truly gone. So retry the
      // real slot, and if it opens now, the store was never damaged: drop the
      // quarantine copy and carry on as a normal load.
      if (marker.reason === 'key-lost') {
        const retry = await this.readLiveSnapshot();
        if (retry.kind === 'loaded') {
          await clearQuarantine(this.kv);
          this.locked = false;
          return retry;
        }
      }
      this.locked = true;
      return {
        kind: 'unreadable',
        reason: marker.reason,
        at: marker.at,
        quarantinedKey: marker.blobs[0] ?? null,
      };
    }

    // 1) Retire a possibly-weak legacy DEK before anything else reads the store.
    try {
      await this.rotateLegacyKey();
    } catch {
      // Best-effort and never destructive: on failure the legacy generation is
      // still whole and readable below, and we retry on the next launch.
    }

    // 2) One-time migration of a legacy PLAINTEXT snapshot, if present.
    const legacy = await this.kv.getItem(STORAGE_KEY);
    if (legacy != null) {
      const alreadyEncrypted = await this.readCiphertextAndKey();
      if (alreadyEncrypted.kind !== 'none') {
        // Encrypted store already wins — the plaintext is a stale remnant from an
        // interrupted earlier migration. Remove it; never let old plaintext clobber
        // newer ciphertext.
        await this.kv.removeItem(STORAGE_KEY);
      } else {
        let state: AppState;
        try {
          state = JSON.parse(legacy) as AppState;
        } catch {
          // Corrupt plaintext. It is still the user's only copy, so it is
          // quarantined rather than deleted, and reported rather than passed off
          // as a first run.
          return this.quarantineAndReport({
            kind: 'failed',
            reason: 'malformed',
            slotKey: STORAGE_KEY,
            raw: legacy,
          });
        }
        try {
          await this.save(state); // re-persist encrypted BEFORE deleting plaintext
          await this.kv.removeItem(STORAGE_KEY);
        } catch {
          // Encrypted re-persist failed — keep the plaintext for a retry next
          // launch (non-destructive) but still run this session from memory.
        }
        return { kind: 'loaded', state };
      }
    }

    // 3) Normal encrypted load. Reads the current generation, or the legacy one
    //    when a rotation has not managed to commit yet.
    const read = await this.readLiveSnapshot();
    if (read.kind === 'loaded') return read;
    if (read.kind === 'none') return { kind: 'first-run' }; // genuinely nothing stored
    return this.quarantineAndReport(read);
  }

  async save(state: AppState): Promise<void> {
    // The store holds something we could not open. Writing now would replace it, so
    // we give up the ability to save instead of giving up the user's history.
    if (this.locked) throw new RepositoryLockedError();
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
    // …and the pre-rotation generation, which a wipe must not leave behind either.
    await this.discardLegacyGeneration();
    // A wipe is the ONE place quarantined snapshots are destroyed: the user asked
    // for everything to go (account deletion, or starting fresh after a failure).
    // It also releases the write lock, so the fresh store is usable immediately.
    await clearQuarantine(this.kv);
    this.locked = false;
  }
}
