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

/**
 * Thrown when the session in front of the gateway belongs to a different account than the caller
 * meant to read or write. The window is short (the session has changed and React has not caught up
 * yet), and it is exactly the window in which one account's device state could be written into
 * another account's row. So the gateway refuses rather than guesses.
 */
export class StateBackupAccountChangedError extends Error {
  constructor() {
    super('The signed-in account changed before the backup call ran.');
    this.name = 'StateBackupAccountChangedError';
  }
}

export interface StateBackupGateway {
  /** Whether the pillar is configured (backend present and a session exists). */
  readonly enabled: boolean;
  /**
   * The newest backup for the signed-in account, or null when there has never been one.
   *
   * `expectedUserId`, when given, must be the account the session currently holds, or the call
   * throws {@link StateBackupAccountChangedError} without touching the server.
   */
  fetch(expectedUserId?: string): Promise<StateBackup | null>;
  /** Store a backup. Returns the timestamp the server recorded. Same `expectedUserId` rule as fetch. */
  save(
    state: string,
    schemaVersion: number,
    deviceLabel?: string,
    expectedUserId?: string,
  ): Promise<number>;
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
