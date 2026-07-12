/**
 * Entitlement pillar entry point. Returns the real gateway when the feature flag
 * is on (Supabase env present), else the inert NullEntitlementGateway — so callers
 * never branch on config and the local free-tier default is unaffected when the
 * pillar is off. Mirrors `core/auth/index.ts` and `core/social/index.ts`.
 */
import { featureFlags } from '../config/featureFlags';
import { NullEntitlementGateway, type EntitlementGateway } from './EntitlementGateway';
import { SupabaseEntitlementGateway } from './SupabaseEntitlementGateway';

let instance: EntitlementGateway | null = null;

export function getEntitlementGateway(): EntitlementGateway {
  if (!instance) {
    instance = featureFlags.entitlements ? new SupabaseEntitlementGateway() : NullEntitlementGateway;
  }
  return instance;
}

export * from './EntitlementGateway';
