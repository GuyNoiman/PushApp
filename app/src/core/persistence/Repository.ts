/**
 * Repository — the offline-first persistence boundary (Engineering Bible §3
 * vendor independence, §8 local-before-cloud). Engines depend on this interface,
 * never on a concrete provider. A cloud backend (e.g. Supabase, when the social
 * pillar lands) implements the SAME interface without touching any engine.
 * Pure TS — no vendor imports here.
 */
import type { AppState } from '../types/domain';

/**
 * WHY a stored snapshot could not be opened (Encryption_Design §6.1). The three
 * causes are kept apart because they mean very different things to the user and
 * to anyone diagnosing a report:
 *
 *   key-lost   — the snapshot is there, the key that opens it is not. Restoring a
 *                backup without the keychain, an Android Keystore reset, a device
 *                migration. NOTHING can decrypt it, but the bytes are still real.
 *   corrupt    — snapshot and key are both present and the snapshot still would
 *                not decrypt: a truncated write, a foreign blob, a wrong key
 *                generation, tampering.
 *   malformed  — it decrypted, but what came out is not valid AppState JSON. That
 *                is our bug, not the user's device.
 */
export type LoadFailureReason = 'key-lost' | 'corrupt' | 'malformed';

/**
 * The outcome of {@link Repository.load}.
 *
 * It replaces `AppState | null`, which conflated the two situations that must
 * never be conflated: "there is nothing here yet" and "there IS something here
 * and we cannot open it". Under the old shape both arrived as `null`, the app
 * started empty, and the next state change wrote that empty state straight over
 * the user's still-intact data. That is the data-loss path this type exists to
 * close (Encryption_Design D2/D5, Phase C0).
 *
 * Three outcomes, because three is what the CALLER has to behave differently
 * about; the finer classification of a failure rides along in `reason` and drives
 * the message, not the branch:
 *
 *   loaded     — a snapshot was read. Use it.
 *   first-run  — genuinely nothing stored. Seed, as before.
 *   unreadable — a snapshot exists and could not be opened. Do NOT seed, do NOT
 *                write, and tell the user. The bytes have been quarantined
 *                (see `quarantinedKey`), never deleted.
 */
export type LoadResult =
  | { kind: 'loaded'; state: AppState }
  | { kind: 'first-run' }
  | {
      kind: 'unreadable';
      reason: LoadFailureReason;
      /** When the failure was first seen (epoch ms) — survives relaunches. */
      at: number;
      /**
       * The storage key the untouched original bytes were copied to, or null if
       * the copy itself could not be made (a full disk). Null does NOT mean the
       * bytes were discarded: the live slot is only cleared once the copy exists.
       */
      quarantinedKey: string | null;
    };

/**
 * Thrown when a write is attempted against a quarantined store. Losing the ability
 * to save is strictly better than saving over data we could not open, so this is a
 * hard refusal rather than a silent no-op — a caller that sees it has skipped the
 * `unreadable` branch of {@link LoadResult}.
 */
export class RepositoryLockedError extends Error {
  constructor() {
    super(
      'PushApp: refusing to save — the stored data could not be opened on this device and has ' +
        'been quarantined. Writing now would overwrite it. Resolve the recovery state first.',
    );
    this.name = 'RepositoryLockedError';
  }
}

export interface Repository {
  /**
   * Read the persisted state. Never throws for an unreadable store — it reports
   * it, so the caller can protect the data instead of overwriting it.
   */
  load(): Promise<LoadResult>;
  /**
   * Persist the full state. An implementation MUST refuse (reject) while its
   * store is quarantined, so a caller that forgets the {@link LoadResult} still
   * cannot destroy an unreadable snapshot.
   */
  save(state: AppState): Promise<void>;
  /** Remove all persisted state, including anything quarantined. */
  clear(): Promise<void>;
}
