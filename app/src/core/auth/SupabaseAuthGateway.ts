/**
 * SupabaseAuthGateway — the Supabase implementation of AuthGateway and the ONLY
 * auth file that touches the vendor SDK. Reuses the EXISTING Supabase singleton
 * (`../social/supabaseClient`) — there must be exactly one client so session
 * persistence and realtime share the same auth state (Auth_Backend_Proposal §2).
 *
 * Scope: own the anonymous session bootstrap (moved here from the social pillar), plus
 * getCurrentUser / signOut / onAuthChange, and the real Apple/Google sign-in exchange (P4/P5).
 *
 * THIS FILE STILL IMPORTS NO NATIVE MODULE, and that rule has not been relaxed by Apple/Google
 * landing: the native sheets live behind `./nativeIdentity`, which loads them at call time. All that
 * arrives here is a signed identity token — a string — which is exactly what Supabase's
 * `signInWithIdToken` wants. So Expo Go, web and jest keep working, and a build without the native
 * modules degrades to an honest AuthNotAvailableError instead of failing to start.
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
import { appleIdentityToken, googleIdentityToken } from './nativeIdentity';
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

  // ── Real sign-in (P4/P5) — the native sheet runs behind `./nativeIdentity`; only a token lands here ──

  /**
   * Apple sign-in. The OS sheet returns a signed identity token, which Supabase verifies against
   * Apple and exchanges for a session. The uid that comes back is a real `auth.uid()`, so every RLS
   * policy behaves identically to the anonymous path — nothing downstream branches on how someone
   * signed in.
   *
   * A cancel propagates as `SignInCancelledError` (the caller shows nothing); a build without the
   * native module propagates as `AuthNotAvailableError`.
   */
  async signInWithApple(): Promise<AuthUser> {
    return this.exchangeIdToken('apple', await appleIdentityToken());
  }

  /** Google sign-in — symmetric with {@link signInWithApple}; same token exchange, same guarantees. */
  async signInWithGoogle(): Promise<AuthUser> {
    return this.exchangeIdToken('google', await googleIdentityToken());
  }

  /**
   * Trade a provider identity token for a Supabase session. The token is verified SERVER-SIDE
   * against the provider, so a forged one cannot mint a session; nothing about the person is read
   * off it here (red-line R1 — no PII in PushApp's own tables).
   */
  private async exchangeIdToken(provider: 'apple' | 'google', token: string): Promise<AuthUser> {
    const { data, error } = await this.client().auth.signInWithIdToken({ provider, token });
    if (error) throw error;
    const user = toAuthUser(data.user);
    if (!user) throw new AuthNotAvailableError(`${provider} sign-in returned no user.`);
    return user;
  }
}
