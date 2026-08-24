/**
 * useMirrorInvites — the Mirror rounds this person has been asked to answer and has not yet.
 *
 * It exists as its own hook because two surfaces need the same list and must never disagree: the
 * bell's badge and the Notification Center itself. Loading it twice from two places is how a badge
 * ends up claiming something the list does not show.
 *
 * It returns the ASK and not the questions — the round id, who asked, and when. What somebody chose
 * to ask about themselves is not something a notification carries.
 */
import { useCallback, useEffect, useState } from 'react';

import { getMirrorGateway } from '@/core/tools/mirror';
import { useFocusRefresh } from '@/hooks/use-focus-refresh';

export interface PendingMirrorInvite {
  roundId: string;
  ownerId: string;
  invitedAt: number;
}

export function useMirrorInvites(): PendingMirrorInvite[] {
  const [invites, setInvites] = useState<PendingMirrorInvite[]>([]);

  const load = useCallback(() => {
    const gateway = getMirrorGateway();
    if (!gateway.enabled) return;
    let mounted = true;
    void (async () => {
      try {
        const rows = await gateway.invitationsForMe();
        if (!mounted) return;
        setInvites(
          rows
            .filter((row) => row.invitation.status === 'sent' && row.round.status === 'open')
            .map((row) => ({
              roundId: row.round.id,
              ownerId: row.round.ownerId,
              invitedAt: row.invitation.invitedAt,
            })),
        );
      } catch {
        // Offline: keep whatever is already known rather than claiming there is nothing waiting.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Refreshes when the screen comes back into view, and works in a bare test render.
  useFocusRefresh(load);

  return invites;
}
