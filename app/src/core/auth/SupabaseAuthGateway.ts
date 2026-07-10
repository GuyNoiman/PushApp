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
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../social/supabaseClient';
import { AuthNotAvailableError, type AuthGateway, type AuthUser } from './AuthGateway';
import { toAuthUser } from './authUser';

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
    const { data: userData } = await c.auth.getUser();
    if (userData.user) return toAuthUser(userData.user)!; // session already present
    // No session yet → mint an anonymous one (single place this happens in the app).
    const { data, error } = await c.auth.signInAnonymously();
    if (error) throw error;
    const user = toAuthUser(data.user);
    if (!user) throw new Error('Anonymous sign-in returned no user.');
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
