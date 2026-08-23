/**
 * When to back up, and which copy wins — the pure decisions behind the account backup.
 *
 * They live apart from the gateway because they are the part that can be reasoned about and tested:
 * a gateway can be mocked, but "should this overwrite what the server holds" is a rule, and getting
 * it wrong silently destroys somebody's week.
 *
 * THE RULE, stated once: the NEWER write wins, and when the two are the same age the LOCAL copy
 * wins. A tie means the two clocks agree to the second, which in practice means this device just
 * wrote it — and preferring the copy in front of the person is the one choice that never surprises
 * them.
 *
 * Pure TypeScript — no React, no storage, no clock reads except what a caller passes in.
 */

/** How long after a change before it is worth writing to the server. */
export const BACKUP_DEBOUNCE_MS = 20_000;

/** How stale a backup may get before it is written regardless of debouncing. */
export const BACKUP_MAX_AGE_MS = 5 * 60_000;

export type RestoreDecision =
  /** Take the server's copy: this device has nothing, or the server's is newer. */
  | { kind: 'restore'; reason: 'noLocalState' | 'serverIsNewer' }
  /** Keep what is here. */
  | { kind: 'keepLocal'; reason: 'noBackup' | 'localIsNewerOrSame' };

/**
 * Which copy to open the app with.
 *
 * `localUpdatedAt` is undefined when this install has never written state — a fresh install, which
 * is exactly the lost-phone case and the one this whole feature exists for.
 */
export function decideRestore(
  localUpdatedAt: number | undefined,
  serverUpdatedAt: number | undefined,
): RestoreDecision {
  if (serverUpdatedAt === undefined) return { kind: 'keepLocal', reason: 'noBackup' };
  if (localUpdatedAt === undefined) return { kind: 'restore', reason: 'noLocalState' };
  return serverUpdatedAt > localUpdatedAt
    ? { kind: 'restore', reason: 'serverIsNewer' }
    : { kind: 'keepLocal', reason: 'localIsNewerOrSame' };
}

/**
 * Whether it is time to write a backup.
 *
 * Two reasons to write: the change has settled (nothing else for {@link BACKUP_DEBOUNCE_MS}), or the
 * server's copy has simply gone stale. The debounce is not a performance trick — it is what stops a
 * person's every tap becoming a network write, on their battery and their data.
 */
export function shouldBackUp(
  lastChangeAt: number | undefined,
  lastBackupAt: number | undefined,
  now: number,
): boolean {
  if (lastChangeAt === undefined) return false; // nothing has changed since the last write
  if (lastBackupAt === undefined) return true; // never backed up, and there is something to keep
  if (lastChangeAt <= lastBackupAt) return false; // the change is already in the backup
  return now - lastChangeAt >= BACKUP_DEBOUNCE_MS || now - lastBackupAt >= BACKUP_MAX_AGE_MS;
}
