/**
 * StateBackupProvider — renders nothing, and is the reason a lost phone is survivable.
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
 */
import { useCallback, useEffect, useRef } from 'react';

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

export function StateBackupProvider() {
  const { core, ready } = useApp();
  const { user } = useAuth();
  const gateway = getStateBackupGateway();

  const lastChangeAt = useRef<number | undefined>(undefined);
  const lastBackupAt = useRef<number | undefined>(undefined);
  const restoreChecked = useRef(false);
  const writing = useRef(false);

  /** Write the current state up, unless a write is already in flight. */
  const backUpNow = useCallback(async () => {
    if (writing.current || !gateway.enabled || !user) return;
    writing.current = true;
    try {
      const at = await gateway.save(core.backupStateJson(), 1);
      lastBackupAt.current = at;
    } catch {
      // A failed backup must never disturb the app. The change stays marked and the next tick
      // retries; the state itself is safe on the device either way.
    } finally {
      writing.current = false;
    }
  }, [core, gateway, user]);

  // ── Restore, once per sign-in ──────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !gateway.enabled || !user || restoreChecked.current) return;
    restoreChecked.current = true;
    void (async () => {
      try {
        const backup = await gateway.fetch();
        // A device that has never written anything has no local timestamp — which is exactly the
        // new-phone case this exists for.
        const localUpdatedAt = core.getSnapshot().journeys.length > 0 ? Date.now() : undefined;
        const decision = decideRestore(localUpdatedAt, backup?.updatedAt);
        if (decision.kind === 'restore' && backup) {
          await core.restoreFromBackup(backup.state);
          lastBackupAt.current = backup.updatedAt;
          return;
        }
        lastBackupAt.current = backup?.updatedAt;
        // Nothing on the server yet, and something here worth keeping: make the first backup now
        // rather than waiting for the next change.
        if (!backup && core.getSnapshot().journeys.length > 0) await backUpNow();
      } catch {
        // Offline at launch: the app opens on what the device holds, which is the right behaviour.
      }
    })();
  }, [ready, gateway, user, core, backUpNow]);

  // ── Notice changes ─────────────────────────────────────────────────────────
  useEffect(() => core.subscribe(() => {
    lastChangeAt.current = Date.now();
  }), [core]);

  // ── Write when a change has settled, or when the copy has gone stale ────────
  useEffect(() => {
    if (!gateway.enabled || !user) return;
    const timer = setInterval(() => {
      if (shouldBackUp(lastChangeAt.current, lastBackupAt.current, Date.now())) void backUpNow();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [gateway, user, backUpNow]);

  return null;
}

export { BACKUP_DEBOUNCE_MS };
