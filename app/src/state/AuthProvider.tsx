/**
 * AuthProvider — the React bridge for session/identity ownership (E3,
 * Auth_Backend_Proposal §2). It is the SINGLE place the anonymous session is
 * bootstrapped (relinquished by SocialProvider in P2); downstream pillars react
 * to the exposed session rather than minting their own.
 *
 * When featureFlags.auth is off (no Supabase env) it renders children with inert
 * EMPTY values — the local pillars are entirely unaffected (Bible §5/§14).
 * All gateway calls are guarded so a backend hiccup never crashes. No business logic here: consumers
 * read this state and call these actions.
 *
 * NO ERROR MESSAGE LEAVES THIS FILE FOR A SCREEN (first device test, 2026-09-16). A failed sign-in is
 * exposed as {@link SignInFailure} — a provider and a word from a closed set — and the screen turns
 * the word into a sentence from the locale files. The message itself goes only to the crash reporter,
 * which sends the error's name and never its text.
 *
 * Privacy (red-line R1): AuthUser carries NO PII — only the uid, an anonymous
 * flag, and provider names. Name/email never enter app state.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { getAuthGateway, type AuthUser } from '@/core/auth';
import { signInAttempted, signInSucceeded, signInThrew } from '@/core/auth/signInKpi';
import { signInNotice, type SignInFailure } from '@/core/auth/signInNotice';
import { appKpi } from '@/core/kpi/appKpi';
import type { SignInProvider } from '@/core/kpi/taxonomy';
import { getCrashGateway } from '@/core/monitoring/CrashGateway';
import { checkBackendHealth } from '@/core/social/backendHealth';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'signedOut';

interface AuthContextValue {
  enabled: boolean;
  user: AuthUser | null;
  status: AuthStatus;
  /**
   * The last sign-in that FAILED, as the screen may show it: which provider to offer again, and which
   * sentence to say. Null after a success, a cancel, or when a new attempt starts. Never a message.
   */
  signInFailure: SignInFailure | null;
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
  signInFailure: null,
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
  const [signInFailure, setSignInFailure] = useState<SignInFailure | null>(null);

  // Derive status from a user snapshot. NOTE: onAuthChange fires INITIAL_SESSION
  // with null before ensureSession() resolves, so status can briefly read
  // 'signedOut' on a cold start. Harmless: the app has no signed-out wall — an
  // anonymous session is a full session — and ensureSession flips it to
  // 'anonymous' within a tick.
  const applyUser = useCallback((u: AuthUser | null) => {
    setUser(u);
    setStatus(u ? (u.isAnonymous ? 'anonymous' : 'authenticated') : 'signedOut');
  }, []);

  /**
   * Run a gateway call without letting a failure crash the tree. Before 2026-09-16 the failure's
   * message was kept as `error`, and the only screens that read it were the two sign-in screens —
   * which meant a session-bootstrap failure appeared under the sign-in buttons as raw text before
   * anybody had pressed one. The status these calls set is what the app actually acts on.
   */
  const guard = useCallback(async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch {
      // Nothing to show: see above.
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

  /**
   * Run a sign-in, treating a CANCEL as a non-event. Closing the provider's sheet is a decision, not
   * a failure, so it must leave nothing behind — it even CLEARS a previous failure, because the
   * screen the person is looking at is now in a clean state. Anything else becomes a
   * {@link SignInFailure}: a closed word the screen turns into a human sentence (`core/auth/signInNotice`).
   *
   * Every outcome is also COUNTED (founder, 2026-09-16): nothing else can say whether sign-in has
   * ever worked for anybody. What is counted is the provider and a closed reason decided from the
   * error's type — never the message this function shows (see `core/auth/signInKpi`).
   */
  const runSignIn = useCallback(
    async (provider: SignInProvider, signIn: () => Promise<AuthUser>) => {
      appKpi.record(signInAttempted(provider));
      // A new attempt is a clean slate: the old sentence goes, so a retry that fails again visibly
      // says so again rather than leaving the same line sitting there unchanged.
      setSignInFailure(null);
      try {
        applyUser(await signIn());
        appKpi.record(signInSucceeded(provider));
      } catch (e) {
        appKpi.record(signInThrew(provider, e));
        const notice = signInNotice(e);
        if (notice === null) return;
        // The developer detail goes where developer detail belongs. The reporter sends the error's
        // NAME (e.g. `SignInMisconfiguredError`) and never its message — see CrashGateway.
        getCrashGateway().captureHandled(e, {
          module: 'auth',
          function: provider === 'apple' ? 'signInWithApple' : 'signInWithGoogle',
        });
        setSignInFailure({ provider, notice });
      }
    },
    [applyUser],
  );

  const signInWithApple = useCallback(
    () => runSignIn('apple', () => gateway.signInWithApple()),
    [gateway, runSignIn],
  );

  const signInWithGoogle = useCallback(
    () => runSignIn('google', () => gateway.signInWithGoogle()),
    [gateway, runSignIn],
  );

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
    signInFailure,
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
