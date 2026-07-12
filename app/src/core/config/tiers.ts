/**
 * Tier catalog — what each account tier unlocks, as DATA (Engineering Bible §3
 * configuration-before-code). Gating decisions live HERE, never inside engine or
 * UI logic, so a feature can be moved between tiers by editing this map alone.
 *
 * This is the $0 foundation. It is deliberately minimal but real: today it exists
 * so `useFeatureGate` / EntitlementEngine.isActive have something to read. Nothing
 * here is gated ON for real users yet — every feature listed defaults to being
 * available to `free` so shipping this changes no user-visible behavior. Add real
 * paywalled features to `subscriber` only when the Commercial phase lands.
 *
 * Pure TS — no UI, no vendor imports.
 */
import type { AccountTier } from '../types/entitlement';

/**
 * A gateable capability. String-keyed (not an enum) so callers can reference a
 * feature that may not be defined yet without a compile break — an unknown
 * feature is treated as "not gated" (available to everyone), the safe default.
 */
export type GatedFeature = string;

/**
 * Numeric limits per tier (e.g. how many active Journeys). `null` = unlimited.
 * Kept alongside the boolean feature flags so a tier definition is one object.
 */
export interface TierLimits {
  /** Max concurrently-active Journeys. `null` = unlimited. */
  maxActiveJourneys: number | null;
  /** Max Allies per Journey. `null` = unlimited. */
  maxAlliesPerJourney: number | null;
}

export interface TierDef {
  tier: AccountTier;
  /** Human label for debug/admin surfaces (not user-facing copy). */
  label: string;
  /** Capabilities unlocked at this tier. Absent/false ⇒ locked. */
  features: Record<GatedFeature, boolean>;
  limits: TierLimits;
}

/**
 * The declarative tier map. Higher tiers should be a SUPERSET of lower ones —
 * `trial` mirrors `subscriber` (a trial is a taste of the paid experience), and
 * `free` is the always-available floor.
 *
 * POC state: to guarantee zero behavior change, no feature is locked away from
 * `free` today. The keys below are placeholders that show the SHAPE of future
 * gating (advanced insights, unlimited Journeys) while every tier still returns
 * `true` — so the gate is wired and testable without hiding anything from anyone.
 */
export const TIERS: Record<AccountTier, TierDef> = {
  free: {
    tier: 'free',
    label: 'Free',
    features: {
      // Everything the app ships today is free. Placeholders default to available
      // so no real user loses access when this foundation lands.
      advancedInsights: true,
      unlimitedJourneys: true,
    },
    limits: {
      // `null` (unlimited) today — a real free-tier cap is a Commercial decision,
      // not shipped here.
      maxActiveJourneys: null,
      maxAlliesPerJourney: null,
    },
  },
  trial: {
    tier: 'trial',
    label: 'Trial',
    features: {
      advancedInsights: true,
      unlimitedJourneys: true,
    },
    limits: {
      maxActiveJourneys: null,
      maxAlliesPerJourney: null,
    },
  },
  subscriber: {
    tier: 'subscriber',
    label: 'Subscriber',
    features: {
      advancedInsights: true,
      unlimitedJourneys: true,
    },
    limits: {
      maxActiveJourneys: null,
      maxAlliesPerJourney: null,
    },
  },
};

/**
 * Whether a feature is unlocked at a given tier. Unknown features (not present in
 * the map) are treated as ungated ⇒ available to everyone — the safe default that
 * keeps a not-yet-configured feature from silently locking users out.
 */
export function featureUnlockedAt(tier: AccountTier, feature: GatedFeature): boolean {
  const def = TIERS[tier];
  if (!(feature in def.features)) return true;
  return def.features[feature] === true;
}
