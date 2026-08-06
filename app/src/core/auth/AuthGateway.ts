/**
 * AuthGateway — the boundary for session/identity ownership
 * (Engineering Bible §3 vendor independence, Auth_Backend_Proposal.md / E3).
 *
 * Engines, providers and UI depend on THIS interface only. `SupabaseAuthGateway`
 * is the single file that imports the Supabase SDK — swapping the auth provider
 * later is one new file, no caller changes. Pure TS here: no vendor imports,
 * no React, no native modules.
 *
 * Phase 1–2 scope (Auth_Backend_Proposal §8): own the ANONYMOUS session bootstrap
 * (moved out of the social pillar) and the sign-out/observe surface. Real
 * Apple/Google sign-in is DECLARED here so the interface stays stable for P4/P5,
 * but its implementation needs a native dev build and is intentionally stubbed —
 * this file must never pull `expo-apple-authentication` / google-signin.
 */

/**
 * The authenticated principal. `id` is the Supabase `auth.uid()` — the same value
 * whether the session was born anonymous or via a real identity, so RLS is
 * unaffected by how the user signed in. NO PII here (no name, no email — those
 * stay quarantined in Supabase-managed `auth.users`, red-line R1).
 */
export type AuthUser = {
  id: string;
  isAnonymous: boolean;
  /** Linked identity providers, e.g. ['anonymous'] or ['apple','google']. */
  providers: string[];
};

/**
 * Thrown when a sign-in path exists in the interface but is not available in the
 * current build (e.g. Apple/Google require a native dev build — P3+). Typed so
 * callers can distinguish "not built yet" from a real backend failure.
 */
export class AuthNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthNotAvailableError';
  }
}

/**
 * Thrown when the single-user server sign-in succeeded but the returned identity is
 * NOT the expected user (uid mismatch). The gateway signs out before throwing this,
 * so the app is left unauthenticated rather than proceeding as the wrong identity.
 * Typed so callers can distinguish a verification failure from a transport error.
 */
export class AuthIdentityMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthIdentityMismatchError';
  }
}

export interface AuthGateway {
  /** Whether the pillar is configured/active (feature flag + env present). */
  readonly enabled: boolean;

  /**
   * Guarantee a session exists, minting an ANONYMOUS one if none is present.
   * Idempotent. This is the single place the anonymous bootstrap happens
   * (relinquished by SocialProvider in P2). Returns the current user.
   */
  ensureSession(): Promise<AuthUser>;

  /** The current user, or null if there is no session. Never mints one. */
  getCurrentUser(): Promise<AuthUser | null>;

  /** Sign out: revoke the session and clear local session state. */
  signOut(): Promise<void>;

  /**
   * Observe session changes (sign-in, sign-out, token refresh, uid change).
   * Returns an unsubscribe fn. The callback receives the new user, or null on
   * sign-out. Downstream pillars (social) react to this rather than owning auth.
   */
  onAuthChange(cb: (user: AuthUser | null) => void): () => void;

  /**
   * Real Apple sign-in. DECLARED for P4 — not available in this phase.
   * The Supabase impl throws {@link AuthNotAvailableError}; it must NOT import
   * any native module (that would break Expo Go / web).
   */
  signInWithApple(): Promise<AuthUser>;

  /**
   * Real Google sign-in. DECLARED for P5 — symmetric with Apple. Same stub
   * discipline as {@link signInWithApple}.
   */
  signInWithGoogle(): Promise<AuthUser>;
}

/**
 * No-op gateway used when the auth pillar is disabled (no env / flag off).
 * Mirrors NullSocialGateway: guarantees callers never branch on config. With no
 * backend there is no real uid, so `ensureSession` returns null — matching the
 * "nothing to sign into" reality — and providers treat that as anonymous/off.
 * The real anonymous session is only ever minted by SupabaseAuthGateway.
 */
export const NullAuthGateway: AuthGateway = {
  enabled: false,
  async ensureSession() {
    // No backend to mint a session; surface a stable inert user so the app still
    // boots (fully local). isAnonymous=true keeps every consumer in its offline path.
    return { id: '', isAnonymous: true, providers: [] };
  },
  async getCurrentUser() {
    return null;
  },
  async signOut() {},
  onAuthChange() {
    return () => {};
  },
  async signInWithApple() {
    throw new AuthNotAvailableError('Sign-in is unavailable: the auth backend is not configured.');
  },
  async signInWithGoogle() {
    throw new AuthNotAvailableError('Sign-in is unavailable: the auth backend is not configured.');
  },
};
