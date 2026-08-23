/**
 * StateBackupGateway — the boundary for the account's state backup.
 *
 * WHAT IT IS FOR: a person who loses their phone signs in on a new one and finds their Journeys,
 * their Dreams, their history and their Buddy where they left them. Until 2026-08-24 that was not
 * possible at all — everything lived on one device and nowhere else.
 *
 * WHAT IT IS NOT: multi-device sync. There is no merge here and no conflict resolution beyond "the
 * newer write wins", which is the honest shape of a BACKUP. Two devices editing at once is a case
 * this cannot resolve, and the engine says so rather than quietly discarding somebody's evening.
 *
 * Vendor-independent (Engineering Bible §3): engines and UI depend on this interface; one
 * implementation file touches the SDK.
 */

/** One stored backup, as the server holds it. */
export interface StateBackup {
  /** The AppState blob, exactly as the device serialised it. */
  state: string;
  schemaVersion: number;
  /** When the server accepted it. The single clock both devices compare against. */
  updatedAt: number;
  /** Which device wrote it, for a restore that can say where it came from. */
  deviceLabel?: string;
}

export interface StateBackupGateway {
  /** Whether the pillar is configured (backend present and a session exists). */
  readonly enabled: boolean;
  /** The newest backup for the signed-in account, or null when there has never been one. */
  fetch(): Promise<StateBackup | null>;
  /** Store a backup. Returns the timestamp the server recorded. */
  save(state: string, schemaVersion: number, deviceLabel?: string): Promise<number>;
  /** Remove it — part of account deletion. */
  clear(): Promise<void>;
}

/** The inert gateway used when there is no backend. Every call is a safe no-op. */
export const NullStateBackupGateway: StateBackupGateway = {
  enabled: false,
  async fetch() {
    return null;
  },
  async save() {
    return 0;
  },
  async clear() {},
};
