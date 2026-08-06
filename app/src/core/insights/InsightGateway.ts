/**
 * InsightGateway — the boundary for publishing the minimal, server-eligible
 * OutreachInsight (the adaptive coach's outreach projection). Engines/UI depend on THIS
 * interface only; a real (Supabase) implementation is a single future file, no caller
 * changes — mirroring SocialGateway's vendor-independence pattern (Engineering Bible §3).
 *
 * The ONLY thing that ever reaches this gateway is an OutreachInsight, which by
 * construction (deriveOutreachInsight, the single chokepoint) carries nothing but enums,
 * buckets, booleans, opt-in prefs, a pseudonymous uid, and scalar timestamps
 * (SECURITY-PRIVACY G1/G2, data minimization Bible §8).
 *
 * Pure TS here: no vendor imports, no React.
 */
import type { OutreachInsight } from '../types/domain';

export interface InsightGateway {
  /** Whether the pillar is configured/active (feature flag + env present). */
  readonly enabled: boolean;
  /** Publish the current minimal outreach projection for this user. */
  publishInsight(outreach: OutreachInsight): Promise<void>;
  /** Withdraw any published projection (e.g. on opt-out / deletion). */
  clearInsight(): Promise<void>;
}

/**
 * No-op gateway used when the coach-outreach pillar is disabled (no env / flag off).
 * Phase 1 wires THIS one — nothing leaves the device, no network. Guarantees the local
 * pillars run untouched with the feature turned off (mirrors NullSocialGateway).
 */
export const NullInsightGateway: InsightGateway = {
  enabled: false,
  async publishInsight() {},
  async clearInsight() {},
};
