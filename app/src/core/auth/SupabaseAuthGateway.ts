/**
 * SupabaseAuthGateway — the Supabase implementation of AuthGateway and the ONLY
 * auth file that touches the vendor SDK. Reuses the EXISTING Supabase singleton
 * (`../social/supabaseClient`) — there must be exactly one client so session
 * persistence and realtime share the same auth state (Auth_Backend_Proposal §2).
 *
 * Phase 1–2 scope: own the anonymous session bootstrap (moved here from the
 * social pillar), plus getCurrentUser / signOut / onAuthChange. Apple/Google are
 * declared on the interface but stubbed — they need a native dev build (P3+) and
 * this file must NOT import any native module (keeps Expo Go + web working).
 */
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '../social/supabaseClient';
import {
  AuthIdentityMismatchError,
  AuthNotAvailableError,
  type AuthGateway,
  type AuthUser,
} from './AuthGateway';
import { toAuthUser } from './authUser';
import { getSingleUserConfig, type SingleUserConfig } from './singleUser';

export class SupabaseAuthGateway implements AuthGateway {
  readonly enabled = supabase !== null;
  /**
   * Coalesces concurrent ensureSession() calls so two callers (e.g. the mount
   * effect firing alongside an INITIAL_SESSION onAuthChange) can't each mint a
   * separate anonymous user. Cleared once the call settles.
   */
  private ensuring: Promise<AuthUser> | null = null;

  private client() {
    if (!supabase) throw new Error('Auth pillar is disabled (no Supabase env).');
    return supabase;
  }

  ensureSession(): Promise<AuthUser> {
    if (this.ensuring) return this.ensuring;
    this.ensuring = this.doEnsureSession().finally(() => {
      this.ensuring = null;
    });
    return this.ensuring;
  }

  private async doEnsureSession(): Promise<AuthUser> {
    const c = this.client();

    // Single-user POC path: when the EXPO_PUBLIC_SINGLE_USER_* env is present it
    // REPLACES the anonymous bootstrap and signs in as one known, server-verified
    // identity (no signup UI). Absent ⇒ today's anonymous behaviour, untouched.
    const singleUser = getSingleUserConfig();
    if (singleUser) return this.doEnsureSingleUser(c, singleUser);

    const { data: userData } = await c.auth.getUser();
    if (userData.user) return toAuthUser(userData.user)!; // session already present
    // No session yet → mint an anonymous one (single place this happens in the app).
    const { data, error } = await c.auth.signInAnonymously();
    if (error) throw error;
    const user = toAuthUser(data.user);
    if (!user) throw new Error('Anonymous sign-in returned no user.');
    return user;
  }

  /**
   * Sign in as the single known user and VERIFY it is really them.
   *
   * Reuses a persisted session only when it already belongs to the expected uid
   * (so we don't re-authenticate every launch, and never adopt a leftover anonymous
   * session as "the user"). Otherwise signs in with the env password. After sign-in
   * we assert the returned uid matches the expected one; on any mismatch — or if
   * sign-in fails — we sign out and throw, so the app is left UNAUTHENTICATED rather
   * than proceeding as the wrong identity. The password is read from env only and is
   * never logged.
   */
  private async doEnsureSingleUser(
    c: SupabaseClient,
    cfg: SingleUserConfig,
  ): Promise<AuthUser> {
    // Reuse an existing session ONLY if it is already the expected identity.
    const { data: existing } = await c.auth.getUser();
    if (existing.user && existing.user.id === cfg.uid) return toAuthUser(existing.user)!;

    const { data, error } = await c.auth.signInWithPassword({
      email: cfg.email,
      password: cfg.password,
    });
    // Sign-in failed (bad credentials, unconfirmed user, network): block — do not
    // fall back to anonymous, which would silently change who the user is.
    if (error) throw error;

    const signedInId = data.user?.id;
    if (signedInId !== cfg.uid) {
      // Wrong identity: revoke the session so nothing downstream can act as them,
      // then surface a clear, typed verification failure.
      await c.auth.signOut();
      throw new AuthIdentityMismatchError(
        'Sign-in identity did not match the expected user — signed out.',
      );
    }

    const user = toAuthUser(data.user);
    if (!user) throw new Error('Single-user sign-in returned no user.');
    return user;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data } = await this.client().auth.getUser();
    return toAuthUser(data.user);
  }

  async signOut(): Promise<void> {
    // Revoke the session + clear the locally persisted (secure-store) session.
    // Realtime teardown (the social `cheers` channel) is owned by SocialProvider,
    // which reacts to the resulting onAuthChange — we don't duplicate it here.
    await this.client().auth.signOut();
  }

  /**
   * Permanently delete the account + all server-side data (O1). Invokes the
   * `delete-account` Edge Function, which runs as service_role and calls
   * `auth.admin.deleteUser(auth.uid())` — cascading every `public.*` row. The
   * function verifies the caller's JWT server-side, so the client only needs the
   * current session (attached automatically). THROWS on any error so the caller
   * REFUSES the local wipe until the remote delete is confirmed gone.
   *
   * NOTE: the Edge Function must be DEPLOYED (`supabase functions deploy
   * delete-account`) before this works against real data — see
   * `supabase/functions/delete-account/index.ts`. Not yet deployed (deferred to
   * pre-release, a founder action).
   */
  async deleteAccount(): Promise<void> {
    const { error } = await this.client().functions.invoke('delete-account');
    if (error) throw error;
  }

  onAuthChange(cb: (user: AuthUser | null) => void): () => void {
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      cb(toAuthUser(session?.user ?? null));
    });
    return () => data.subscription.unsubscribe();
  }

  // ── Real sign-in — DECLARED, stubbed until the native dev build lands (P3+) ──
  // These intentionally import NO native module so the app keeps running in
  // Expo Go and on web. P4/P5 will replace the bodies with the ID-token exchange
  // (`supabase.auth.signInWithIdToken`) once the native modules are added.
  async signInWithApple(): Promise<AuthUser> {
    throw new AuthNotAvailableError('Apple/Google sign-in requires a native dev build (Phase 3+)');
  }

  async signInWithGoogle(): Promise<AuthUser> {
    throw new AuthNotAvailableError('Apple/Google sign-in requires a native dev build (Phase 3+)');
  }
}
