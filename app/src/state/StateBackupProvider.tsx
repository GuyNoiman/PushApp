/**
 * StateBackupProvider — the reason a lost phone is survivable.
 *
 * WHAT IT DOES. On sign-in it asks the server whether this account has a backup and, when this
 * device has nothing of its own, restores it. From then on it writes the state back up when a change
 * has settled, or when the stored copy has simply gone stale.
 *
 * WHY IT IS A COMPONENT AND NOT PART OF AppCore: the core is framework-free and knows nothing about
 * sessions. Whether there is an account to back up to is a React-level fact, and this is the seam
 * where the two meet.
 *
 * WHAT IT IS NOT — and the honesty matters more here than anywhere: this is a BACKUP, not
 * multi-device sync. The newer write wins, ties go to the device in front of the person, and two
 * devices editing at the same time is a case it does not resolve. Building it as a merge would mean
 * pretending to a guarantee we do not have.
 *
 * PRIVACY. This is the founder's decision of 2026-08-24 (D73): the account's own content lives on
 * the server, the way the large apps do it, so that signing in on a new phone brings it back. The
 * row is reachable by that account and nothing else (RLS), and direct messages are NOT part of it —
 * they stay end-to-end encrypted, because they are somebody else's words as well as this person's.
 *
 * ── THE THREE RULES ADDED 2026-09-17 (04_Product/Dev_Accounts_And_Restore_Plan_2026-09-17.md) ────
 *
 * Restoring on a new phone had never worked for anybody, and the causes were all here:
 *
 *  1. **The restore check is per ACCOUNT, not per app life.** It used to be one flag, and the one
 *     check it allowed was spent on the anonymous session the app opens at launch. A later Apple or
 *     Google sign-in was never checked. Now the check runs again whenever the account changes.
 *  2. **Nothing is written for an account until its restore check has finished.** Otherwise the
 *     first write after a sign-in can land before the check and replace the account's real backup
 *     with whatever an empty device holds. A check that fails (offline) is retried, and writes stay
 *     off until one succeeds.
 *  3. **No backups for anonymous accounts.** An anonymous account is minted fresh on every install,
 *     so its backup can never be reached again after a reinstall — it only ever cost a write.
 *
 * It also exposes three controls (see {@link StateBackupControls}) for signing out and switching
 * account, which is why it wraps the screens now instead of rendering nothing beside them.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

import type { AuthUser } from '@/core/auth';
import {
  BACKUP_DEBOUNCE_MS,
  decideRestore,
  getStateBackupGateway,
  shouldBackUp,
} from '@/core/backup';
import { useApp } from '@/state/AppProvider';
import { useAuth } from '@/state/AuthProvider';

/** How often the timer looks at whether a write is due. Cheap: it is one comparison. */
const TICK_MS = 10_000;

/** How long after a failed restore check (offline, server down) before it is tried again. */
export const RESTORE_RETRY_MS = 60_000;

/** What a restore check ended in. `skipped` covers "nothing to check": no backend, no real account. */
export type RestoreOutcome = 'restored' | 'keptLocal' | 'noBackup' | 'skipped' | 'failed';

/**
 * What an immediate backup ended in. `nothingToBackUp` means this device has no account a backup
 * could belong to (no backend, or an anonymous session) — not that a write failed.
 */
export type FlushOutcome = 'saved' | 'nothingToBackUp' | 'failed';

export interface StateBackupControls {
  /** Run the restore check for the signed-in account now, even if it already ran. */
  restoreNow(): Promise<RestoreOutcome>;
  /** Write the current state for the signed-in account now, waiting for any write in flight. */
  flushNow(): Promise<FlushOutcome>;
  /**
   * Stop every backup write for the account signed in right now. It holds for as long as that
   * account is the signed-in one; the next account starts with its own restore check.
   */
  suspendWrites(): void;
}

/** Without the provider (no backend, or a test) there is nothing to restore or write. */
const INERT_CONTROLS: StateBackupControls = {
  restoreNow: async () => 'skipped',
  flushNow: async () => 'nothingToBackUp',
  suspendWrites: () => {},
};

const StateBackupContext = createContext<StateBackupControls>(INERT_CONTROLS);

/** An account a backup can belong to: a real id, and not an anonymous session. */
function isBackupAccount(user: AuthUser | null | undefined): user is AuthUser {
  return Boolean(user && user.id && !user.isAnonymous);
}

export function StateBackupProvider({ children }: { children?: ReactNode }) {
  const { core, ready } = useApp();
  const { user } = useAuth();
  const gateway = getStateBackupGateway();

  // The account in front of the device at the last render. Read by the timer and the controls,
  // which must act on who is signed in NOW rather than on whoever it was when they were created.
  const userRef = useRef<AuthUser | null>(user);
  userRef.current = user;

  const lastChangeAt = useRef<number | undefined>(undefined);
  const lastBackupAt = useRef<number | undefined>(undefined);
  /** The account whose restore check has COMPLETED. Writes are allowed for this id and no other. */
  const restoredFor = useRef<string | null>(null);
  /** The restore check in flight, so two callers for the same account share one. */
  const restoring = useRef<{ uid: string; promise: Promise<RestoreOutcome> } | null>(null);
  /** When the last restore check failed, so the timer retries without hammering an offline phone. */
  const restoreFailedAt = useRef<number | undefined>(undefined);
  /** The account whose writes are suspended (a sign-out is in progress), or null. */
  const suspendedFor = useRef<string | null>(null);
  /** The write in flight, so writes never overlap and a flush can wait for one. */
  const inFlight = useRef<Promise<void> | null>(null);

  /** Whether a write for this account may go to the server right now. */
  const mayWrite = useCallback(
    (u: AuthUser) =>
      gateway.enabled &&
      isBackupAccount(u) &&
      restoredFor.current === u.id &&
      suspendedFor.current !== u.id,
    [gateway],
  );

  /**
   * Write the current state up for `u`. Resolves true when it was written, false when it was not
   * allowed. Throws when the server refused, so a flush can tell the two apart.
   */
  const writeNow = useCallback(
    async (u: AuthUser): Promise<boolean> => {
      while (inFlight.current) {
        await inFlight.current.catch(() => undefined);
      }
      if (!mayWrite(u)) return false;
      const run = (async () => {
        // The expected account travels with the call: if the session has already moved on to a
        // different account, the gateway refuses instead of writing this device into it.
        lastBackupAt.current = await gateway.save(core.backupStateJson(), 1, undefined, u.id);
      })();
      inFlight.current = run;
      try {
        await run;
        return true;
      } finally {
        inFlight.current = null;
      }
    },
    [core, gateway, mayWrite],
  );

  /** The restore check for one account. `force` runs it again even when it already completed. */
  const checkRestore = useCallback(
    (u: AuthUser, force: boolean): Promise<RestoreOutcome> => {
      if (!ready || !gateway.enabled || !isBackupAccount(u)) return Promise.resolve('skipped');
      if (suspendedFor.current === u.id) return Promise.resolve('skipped');
      if (restoring.current?.uid === u.id) return restoring.current.promise;
      if (!force && restoredFor.current === u.id) return Promise.resolve('skipped');

      // Writes stop here and resume only when this check completes.
      restoredFor.current = null;
      const promise = (async (): Promise<RestoreOutcome> => {
        try {
          while (inFlight.current) {
            await inFlight.current.catch(() => undefined);
          }
          const backup = await gateway.fetch(u.id);
          // The account changed, or a sign-out began, while the server was answering. Restoring now
          // would put this account's life onto a device that is being handed to someone else.
          if (userRef.current?.id !== u.id || suspendedFor.current === u.id) return 'skipped';

          // A device that has never written anything has no local timestamp — which is exactly the
          // new-phone case this exists for.
          const localUpdatedAt = core.getSnapshot().journeys.length > 0 ? Date.now() : undefined;
          const decision = decideRestore(localUpdatedAt, backup?.updatedAt);
          if (decision.kind === 'restore' && backup) {
            const restored = await core.restoreFromBackup(backup.state);
            lastBackupAt.current = backup.updatedAt;
            restoredFor.current = u.id;
            restoreFailedAt.current = undefined;
            return restored ? 'restored' : 'keptLocal';
          }
          lastBackupAt.current = backup?.updatedAt;
          restoredFor.current = u.id;
          restoreFailedAt.current = undefined;
          // Nothing on the server yet, and something here worth keeping: make the first backup now
          // rather than waiting for the next change.
          if (!backup && core.getSnapshot().journeys.length > 0) {
            try {
              await writeNow(u);
            } catch {
              // The timer retries; the state is safe on the device either way.
            }
          }
          return backup ? 'keptLocal' : 'noBackup';
        } catch {
          // Offline at launch: the app opens on what the device holds, which is the right behaviour.
          // Writes stay off for this account until a check succeeds; the timer tries again.
          restoreFailedAt.current = Date.now();
          return 'failed';
        } finally {
          if (restoring.current?.uid === u.id) restoring.current = null;
        }
      })();
      restoring.current = { uid: u.id, promise };
      return promise;
    },
    [ready, gateway, core, writeNow],
  );

  // ── A suspension belongs to one account ────────────────────────────────────
  useEffect(() => {
    if (suspendedFor.current !== null && suspendedFor.current !== user?.id) {
      suspendedFor.current = null;
    }
  }, [user]);

  // ── Restore, once per account ──────────────────────────────────────────────
  useEffect(() => {
    if (user) void checkRestore(user, false);
  }, [user, checkRestore]);

  // ── Notice changes ─────────────────────────────────────────────────────────
  useEffect(() => core.subscribe(() => {
    lastChangeAt.current = Date.now();
  }), [core]);

  // ── Write when a change has settled, or when the copy has gone stale ────────
  useEffect(() => {
    if (!gateway.enabled) return;
    const timer = setInterval(() => {
      const u = userRef.current;
      if (!isBackupAccount(u) || suspendedFor.current === u.id) return;
      if (restoredFor.current !== u.id) {
        const failedAt = restoreFailedAt.current;
        if (failedAt !== undefined && Date.now() - failedAt >= RESTORE_RETRY_MS) {
          void checkRestore(u, false);
        }
        return;
      }
      if (inFlight.current) return;
      if (shouldBackUp(lastChangeAt.current, lastBackupAt.current, Date.now())) {
        // A failed backup must never disturb the app. The change stays marked and the next tick
        // retries; the state itself is safe on the device either way.
        void writeNow(u).catch(() => undefined);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [gateway, checkRestore, writeNow]);

  // ── The controls sign-out and account switching use ────────────────────────
  const restoreNow = useCallback(async (): Promise<RestoreOutcome> => {
    const u = userRef.current;
    return u ? checkRestore(u, true) : 'skipped';
  }, [checkRestore]);

  const flushNow = useCallback(async (): Promise<FlushOutcome> => {
    const u = userRef.current;
    if (!gateway.enabled || !isBackupAccount(u)) return 'nothingToBackUp';
    if (suspendedFor.current === u.id) return 'failed';
    // Not checked yet (offline since launch, say): check first. Writing blind could replace a newer
    // backup with an older device.
    if (restoredFor.current !== u.id) await checkRestore(u, false);
    try {
      return (await writeNow(u)) ? 'saved' : 'failed';
    } catch {
      return 'failed';
    }
  }, [gateway, checkRestore, writeNow]);

  const suspendWrites = useCallback(() => {
    suspendedFor.current = userRef.current?.id ?? null;
  }, []);

  const controls = useMemo<StateBackupControls>(
    () => ({ restoreNow, flushNow, suspendWrites }),
    [restoreNow, flushNow, suspendWrites],
  );

  return <StateBackupContext.Provider value={controls}>{children}</StateBackupContext.Provider>;
}

/** The backup controls. Inert outside the provider. */
export function useStateBackup(): StateBackupControls {
  return useContext(StateBackupContext);
}

export { BACKUP_DEBOUNCE_MS };
