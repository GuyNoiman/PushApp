/**
 * Social pillar entry point. Returns the real gateway when the feature flag is on
 * (Supabase env present), else the inert NullSocialGateway — so callers never
 * branch on config and the four local pillars are unaffected when social is off.
 */
import { featureFlags } from '../config/featureFlags';
import { NullSocialGateway, type SocialGateway } from './SocialGateway';
import { SupabaseSocialGateway } from './SupabaseSocialGateway';

let instance: SocialGateway | null = null;

export function getSocialGateway(): SocialGateway {
  if (!instance) {
    instance = featureFlags.social ? new SupabaseSocialGateway() : NullSocialGateway;
  }
  return instance;
}

export * from './SocialGateway';
