/**
 * LocalRepository — Repository backed by on-device storage (AsyncStorage).
 * This is the ONLY core file that touches AsyncStorage; engines stay
 * provider-agnostic behind the Repository interface.
 *
 * It carries the SAME unreadable-data protection as the encrypted repository: a
 * snapshot that will not parse is quarantined and reported, never dropped and
 * never reported as "first run" (which is what let the next write destroy it —
 * Encryption_Design §6.2, Phase C0).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppState } from '../types/domain';
import type { KeyValueStore } from './keyValueStore';
import { clearQuarantine, quarantineSnapshot, readRecoveryMarker } from './quarantine';
import { RepositoryLockedError, type LoadResult, type Repository } from './Repository';

/**
 * The plaintext storage key. Exported so EncryptedLocalRepository can find and
 * migrate a legacy (pre-encryption) snapshot written here — single source of truth
 * for the key, no magic-string duplication.
 */
export const STORAGE_KEY = 'pushapp.state.v1';

export class LocalRepository implements Repository {
  private readonly kv: KeyValueStore;
  /** Set once a load found an unreadable snapshot; blocks every write until a wipe. */
  private locked = false;

  constructor(kv: KeyValueStore = AsyncStorage) {
    this.kv = kv;
  }

  async load(): Promise<LoadResult> {
    // A quarantine from an earlier launch outranks whatever is (not) in the live
    // slot: the slot is empty precisely BECAUSE the data was moved aside, and that
    // must never be mistaken for a first run.
    const marker = await readRecoveryMarker(this.kv);
    if (marker) {
      this.locked = true;
      return {
        kind: 'unreadable',
        reason: marker.reason,
        at: marker.at,
        quarantinedKey: marker.blobs[0] ?? null,
      };
    }

    const raw = await this.kv.getItem(STORAGE_KEY);
    if (raw == null) return { kind: 'first-run' };
    try {
      return { kind: 'loaded', state: JSON.parse(raw) as AppState };
    } catch {
      // Corrupt payload. It is still the user's only copy, so it is preserved
      // rather than parsed away.
      this.locked = true;
      const outcome = await quarantineSnapshot(this.kv, {
        sourceKey: STORAGE_KEY,
        raw,
        reason: 'malformed',
        now: Date.now(),
      });
      return {
        kind: 'unreadable',
        reason: outcome.reason,
        at: outcome.at,
        quarantinedKey: outcome.quarantinedKey,
      };
    }
  }

  async save(state: AppState): Promise<void> {
    if (this.locked) throw new RepositoryLockedError();
    await this.kv.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async clear(): Promise<void> {
    await this.kv.removeItem(STORAGE_KEY);
    await clearQuarantine(this.kv);
    this.locked = false;
  }
}
