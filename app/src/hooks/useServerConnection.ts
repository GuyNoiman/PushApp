/**
 * useServerConnection — the ONE answer to "does this device hold a session right now?", plus the one
 * way to ask for one again.
 *
 * WHY IT EXISTS (2026-08-20). The app opens an anonymous session at launch, and that session is what
 * the coach's proxy, account deletion and the whole social pillar authenticate with. Anonymous
 * sign-ins turned out to be switched off on the project, so no device ever got one — and every
 * capability that needed it failed SILENTLY. The partner met it as three unrelated bugs. A capability
 * that fails without saying so is one nobody fixes, so the screens now say so, and they all read the
 * same fact from here rather than each re-deriving it.
 *
 * `disconnected` deliberately means "this build HAS a backend and there is NO session", not "the
 * network is down". A build with no Supabase env is not disconnected — it is a local app, and every
 * local pillar works exactly as designed (Bible §5/§14).
 *
 * `status` is `'loading'` until the bootstrap settles, so nothing flashes on a cold start.
 */
import { useCallback, useState } from 'react';

import { useAuth } from '@/state/AuthProvider';

export interface ServerConnection {
  /** True when the build has a backend and the device holds no session at all. */
  disconnected: boolean;
  /** True while a retry is in flight, so a surface can show it is working. */
  retrying: boolean;
  /**
   * Ask for a session again. This is the "retry that actually retries": the gateway's
   * `ensureSession` coalesces concurrent calls and mints an anonymous session when there is none, so
   * a user who was simply offline at first launch is not stuck until they reinstall.
   */
  retry: () => Promise<void>;
}

export function useServerConnection(): ServerConnection {
  const { enabled, status, ensureSession } = useAuth();
  const [retrying, setRetrying] = useState(false);

  const retry = useCallback(async () => {
    setRetrying(true);
    try {
      // ensureSession is already guarded inside AuthProvider — it resolves either way and surfaces a
      // failure as `error` rather than throwing, so this never needs its own catch.
      await ensureSession();
    } finally {
      setRetrying(false);
    }
  }, [ensureSession]);

  return { disconnected: enabled && status === 'signedOut', retrying, retry };
}
