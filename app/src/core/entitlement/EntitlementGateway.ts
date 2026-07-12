/**
 * EntitlementGateway — the boundary for READING the current user's account tier
 * from the backend (Engineering Bible §3 vendor independence). Mirrors
 * AuthGateway / SocialGateway: engines, providers and UI depend on THIS interface
 * only; `SupabaseEntitlementGateway` is the single file that touches the SDK, so
 * swapping the backend later is one new file with no caller changes. Pure TS here:
 * no vendor imports, no React, no native modules.
 *
 * SECURITY (critical): this interface is READ-ONLY. There is deliberately NO
 * method to set/upgrade the tier — a `subscriber` entitlement is written ONLY
 * server-side (verified receipt / service role), never by the client, and the
 * `entitlements` table RLS grants `authenticated` SELECT-on-own-row but NO
 * insert/update/delete (schema.sql). The one client-writable elevation is the
 * LOCAL dev trial, which lives in EntitlementEngine.startTrial and is persisted
 * on-device only — it never flows through this gateway.
 *
 * PRIVACY: the returned Entitlement carries NO PII (Auth_Backend_Proposal R1).
 */
import { FREE_ENTITLEMENT, type Entitlement } from '../types/entitlement';

export interface EntitlementGateway {
  /** Whether the pillar is configured/active (feature flag + env present). */
  readonly enabled: boolean;

  /**
   * Read the CURRENT user's stored entitlement from the backend. Returns null
   * when there is no session / no row yet (the caller then falls back to the
   * offline-first `free` default). Never writes — reads are user-scoped by RLS.
   */
  getEntitlement(): Promise<Entitlement | null>;
}

/**
 * No-op gateway used when the entitlement pillar is disabled (no env / flag off).
 * Mirrors NullAuthGateway: guarantees callers never branch on config. With no
 * backend there is nothing to read, so `getEntitlement` returns null and the
 * effective tier resolves to the offline-first `free` default.
 */
export const NullEntitlementGateway: EntitlementGateway = {
  enabled: false,
  async getEntitlement() {
    // No backend ⇒ no server entitlement. The engine's offline-first default
    // (FREE_ENTITLEMENT) applies. Returning null (not free) lets a local trial
    // persisted on-device still win over "no server said anything".
    return null;
  },
};

export { FREE_ENTITLEMENT };
