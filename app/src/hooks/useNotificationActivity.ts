/**
 * useNotificationActivity — how many things in the Notification Center are NEW, for the bell's badge.
 *
 * It exists so Home does not have to know how read marks are stored, and so the badge and the
 * centre's own heading can never disagree: both count through
 * {@link ../core/social/notifications.buildNotifications}, from the same social state and the same
 * stored read ids.
 *
 * WHY IT RELOADS ON FOCUS. Read marks are written when the centre unmounts. Without re-reading them
 * the badge would go on showing a number for things the person just looked at, which is the fastest
 * way to teach somebody to ignore a badge.
 *
 * Presentational glue (Engineering Bible §19): no business rules here — the engine owns them.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { notificationReadStore } from '@/core/social/notificationReads';
import { useFocusRefresh } from '@/hooks/use-focus-refresh';
import { buildNotifications, unreadNotificationCount } from '@/core/social/notifications';
import { useMirrorInvites } from '@/hooks/useMirrorInvites';
import { useSocial } from '@/state/SocialProvider';

export function useNotificationActivity(): number {
  const social = useSocial();
  const mirrorInvites = useMirrorInvites();
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(() => {
    let mounted = true;
    void (async () => {
      const stored = await notificationReadStore.load();
      if (mounted) setReadIds(stored);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Refreshes when the screen comes back into view, and works in a bare test render.
  useFocusRefresh(load);

  return useMemo(
    () =>
      unreadNotificationCount(
        buildNotifications({
          receivedCheers: social.incomingCheers,
          friends: social.friends,
          incomingAllyInvites: social.incomingAllyInvites,
          mirrorInvites,
          readIds,
        }),
      ),
    [social.incomingCheers, social.friends, social.incomingAllyInvites, mirrorInvites, readIds],
  );
}
