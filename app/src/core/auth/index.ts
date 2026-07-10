/**
 * Auth pillar entry point. Returns the real gateway when the feature flag is on
 * (Supabase env present), else the inert NullAuthGateway — so callers never
 * branch on config and the local pillars are unaffected when auth is off.
 * Mirrors `core/social/index.ts` (Auth_Backend_Proposal §2).
 */
import { featureFlags } from '../config/featureFlags';
import { NullAuthGateway, type AuthGateway } from './AuthGateway';
import { SupabaseAuthGateway } from './SupabaseAuthGateway';

let instance: AuthGateway | null = null;

export function getAuthGateway(): AuthGateway {
  if (!instance) {
    instance = featureFlags.auth ? new SupabaseAuthGateway() : NullAuthGateway;
  }
  return instance;
}

export * from './AuthGateway';
