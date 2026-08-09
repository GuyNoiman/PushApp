/**
 * AuthProvider — the React bridge for session/identity ownership (E3,
 * Auth_Backend_Proposal §2). It is the SINGLE place the anonymous session is
 * bootstrapped (relinquished by SocialProvider in P2); downstream pillars react
 * to the exposed session rather than minting their own.
 *
 * When featureFlags.auth is off (no Supabase env) it renders children with inert
 * EMPTY values — the local pillars are entirely unaffected (Bible §5/§14).
 * All gateway calls are guarded so a backend hiccup surfaces a string, never a
 * crash. No business logic here: consumers read this state and call these actions.
 *
 * Privacy (red-line R1): AuthUser carries NO PII — only the uid, an anonymous
 * flag, and provider names. Name/email never enter app state.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { getAuthGateway, type AuthUser } from '@/core/auth';
import { checkBackendHealth } from '@/core/social/backendHealth';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'signedOut';

interface AuthContextValue {
  enabled: boolean;
  user: AuthUser | null;
  status: AuthStatus;
  /** Last gateway error, for the UI to surface. Null when healthy. */
  error: string | null;
  ensureSession: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Permanently delete the account + all remote data (O1). UNLIKE the other
   * actions this is NOT wrapped in {@link guard} — it re-throws so the account-
   * deletion orchestrator can REFUSE the local wipe when the remote delete fails.
   */
  deleteAccount: () => Promise<void>;
}

const EMPTY: AuthContextValue = {
  enabled: false,
  user: null,
  // Off ⇒ fully local/anonymous; consumers stay in their offline path.
  status: 'anonymous',
  error: null,
  ensureSession: async () => {},
  signInWithApple: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
};

const AuthContext = createContext<AuthContextValue>(EMPTY);

export function AuthProvider({ children }: { children: ReactNode }) {
  const gateway = getAuthGateway();

  // Off: hand children the inert defaults so nothing branches on config.
  if (!gateway.enabled) {
    return <AuthContext.Provider value={EMPTY}>{children}</AuthContext.Provider>;
  }
  return <ActiveAuthProvider>{children}</ActiveAuthProvider>;
}

function ActiveAuthProvider({ children }: { children: ReactNode }) {
  const gateway = getAuthGateway();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  // Derive status from a user snapshot. NOTE: onAuthChange fires INITIAL_SESSION
  // with null before ensureSession() resolves, so status can briefly read
  // 'signedOut' on a cold start. Harmless today — there is no signed-out UI yet
  // (sign-in is P4); ensureSession then flips it to 'anonymous' within a tick.
  const applyUser = useCallback((u: AuthUser | null) => {
    setUser(u);
    setStatus(u ? (u.isAnonymous ? 'anonymous' : 'authenticated') : 'signedOut');
  }, []);

  /** Run a gateway call, surfacing any failure as a string instead of crashing. */
  const guard = useCallback(async (fn: () => Promise<void>) => {
    try {
      await fn();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, []);

  const ensureSession = useCallback(async () => {
    await guard(async () => {
      const u = await gateway.ensureSession();
      applyUser(u);
    });
  }, [gateway, guard, applyUser]);

  // ── Mount: bootstrap the session (anonymous by default) + observe changes ──
  useEffect(() => {
    let mounted = true;
    void (async () => {
      // Probe the backend BEFORE touching it. A configured-but-deleted project
      // (Free-tier projects are eventually removed) would otherwise let Supabase's
      // background token refresh fire an unguarded fetch and surface a red
      // "Network request failed" banner, even though every local pillar is fine.
      // Unreachable ⇒ the probe stops that timer and we skip session bootstrap
      // entirely, leaving the app in its normal no-backend state.
      const health = await checkBackendHealth();
      if (health === 'unreachable') return;

      await guard(async () => {
        const u = await gateway.ensureSession();
        if (mounted) applyUser(u);
      });
    })();
    const unsubscribe = gateway.onAuthChange((u) => {
      if (mounted) applyUser(u);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [gateway, guard, applyUser]);

  const signInWithApple = useCallback(async () => {
    await guard(async () => {
      const u = await gateway.signInWithApple();
      applyUser(u);
    });
  }, [gateway, guard, applyUser]);

  const signInWithGoogle = useCallback(async () => {
    await guard(async () => {
      const u = await gateway.signInWithGoogle();
      applyUser(u);
    });
  }, [gateway, guard, applyUser]);

  const signOut = useCallback(async () => {
    await guard(async () => {
      await gateway.signOut();
      // onAuthChange will also fire, but set optimistically for a snappy UI.
      setUser(null);
      setStatus('signedOut');
    });
  }, [gateway, guard]);

  // NOT guarded: re-throws so the deletion orchestrator can refuse the local wipe
  // when the remote delete fails (offline / server error).
  const deleteAccount = useCallback(async () => {
    await gateway.deleteAccount();
  }, [gateway]);

  const value: AuthContextValue = {
    enabled: true,
    user,
    status,
    error,
    ensureSession,
    signInWithApple,
    signInWithGoogle,
    signOut,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
