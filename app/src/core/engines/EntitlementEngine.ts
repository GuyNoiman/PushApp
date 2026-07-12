/**
 * EntitlementEngine — computes an account's EFFECTIVE tier and answers feature
 * gates. Pure TS (no React, no vendor, no UI): the same isolation as every other
 * engine (Engineering Bible §19).
 *
 * Time-boxed elevation (a `trial`) is resolved against an INJECTED clock, exactly
 * like MissionEngine's day/week rollover: there is NO background timer — a lapsed
 * trial simply READS as `free` the next time the tier is computed. Reads
 * (`getEffectiveTier`/`isActive`) are PURE — they compute for the current clock
 * without mutating stored state, so they are safe to call during React render.
 *
 * SECURITY (critical): this engine can only ever move an account UP to `trial`
 * (the local dev/POC courtesy trial). It has NO path to `subscriber` — that tier
 * is SERVER-AUTHORITATIVE only (verified receipt / service role), enforced by the
 * `entitlements` table RLS (schema.sql). A compromised client therefore cannot
 * grant itself paid access; the worst it can do is start a free local trial.
 */
import { featureUnlockedAt, type GatedFeature, type TierLimits, TIERS } from '../config/tiers';
import { FREE_ENTITLEMENT, type AccountTier, type Entitlement } from '../types/entitlement';

export class EntitlementEngine {
  constructor(
    /** Reads the STORED entitlement (offline-first default is FREE_ENTITLEMENT). */
    private readonly getEntitlement: () => Entitlement,
    /** Persists a new STORED entitlement (local trial only — see startTrial). */
    private readonly setEntitlement: (e: Entitlement) => void,
    /** Injected clock (defaults to the real one) — overridden in tests. */
    private readonly now: () => number = () => Date.now(),
  ) {}

  /**
   * The account's EFFECTIVE tier for the current clock. A `trial` whose
   * `trialEndsAt` is in the past resolves to `free`; a `subscriber` whose
   * `currentPeriodEnd` has passed likewise lapses to `free`. PURE — never
   * mutates stored state, so a stale trial reads as `free` even before any write.
   */
  getEffectiveTier(): AccountTier {
    const e = this.getEntitlement();
    const t = this.now();
    if (e.tier === 'trial') {
      return e.trialEndsAt != null && e.trialEndsAt > t ? 'trial' : 'free';
    }
    if (e.tier === 'subscriber') {
      // currentPeriodEnd unset ⇒ treat as active (server keeps it fresh); only a
      // KNOWN past end lapses. Server is authoritative for renewals.
      return e.currentPeriodEnd == null || e.currentPeriodEnd > t ? 'subscriber' : 'free';
    }
    return 'free';
  }

  /** Whether a feature is unlocked at the account's effective tier. PURE. */
  isActive(feature: GatedFeature): boolean {
    return featureUnlockedAt(this.getEffectiveTier(), feature);
  }

  /** The numeric limits for the effective tier (e.g. max active Journeys). PURE. */
  getLimits(): TierLimits {
    return TIERS[this.getEffectiveTier()].limits;
  }

  /**
   * Start a LOCAL trial for `days` days (dev/POC only). This is the single
   * client-writable elevation and it can ONLY reach `trial` — never `subscriber`.
   * No-op (returns false) when the account is already an ACTIVE subscriber (never
   * downgrade a paid user) or already inside an active trial. On success it stamps
   * a fresh trial entitlement and persists it via the injected setter.
   */
  startTrial(days: number): boolean {
    const t = this.now();
    const current = this.getEffectiveTier();
    if (current === 'subscriber') return false; // don't clobber a paid tier
    if (current === 'trial') return false; // already trialing
    if (!Number.isFinite(days) || days <= 0) return false;

    const trialEndsAt = t + Math.floor(days) * DAY_MS;
    this.setEntitlement({
      tier: 'trial',
      trialEndsAt,
      source: 'trial',
      updatedAt: t,
    });
    return true;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Re-export the offline-first default for callers that need a starting value. */
export { FREE_ENTITLEMENT };
