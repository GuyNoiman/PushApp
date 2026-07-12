/**
 * Entitlement types — the account-tier vocabulary as data structures.
 *
 * This is the $0 foundation for accepting multiple users and knowing each
 * account's tier (free / trial / subscriber). It is deliberately payment-free:
 * real App Store / Play billing is a separate later phase. Everyone defaults to
 * `free`, so shipping this changes no user-visible behavior.
 *
 * PRIVACY (critical): an Entitlement carries NO PII — no name, no email, no
 * receipt, no purchase token. It is a small, boolean-ish fact about what the
 * account may access. Identity stays quarantined in the auth pillar
 * (Auth_Backend_Proposal red-line R1); this type must never grow a PII field.
 *
 * Pure TypeScript. No React, no UI, no vendor imports.
 */

/**
 * The account tier. `trial` is a time-boxed elevation that resolves back to
 * `free` once it expires (computed on read — see EntitlementEngine, no timer).
 * `subscriber` is only ever granted SERVER-SIDE (verified receipt / service
 * role) — the client can never write itself into this tier (schema RLS).
 */
export type AccountTier = 'free' | 'trial' | 'subscriber';

/**
 * How the current tier was obtained. Kept for auditability/debugging; carries no
 * PII. `none` = the offline-first default (no server, no trial). `trial` = the
 * local dev/POC trial. `iap` = a verified in-app purchase (server-written, later
 * phase). `grant` = a manual server-side grant (e.g. support/comp).
 */
export type EntitlementSource = 'none' | 'trial' | 'iap' | 'grant';

/**
 * An account's entitlement snapshot. The `tier` here is the STORED tier; the
 * EFFECTIVE tier (a lapsed trial reads as `free`) is computed by the
 * EntitlementEngine against the runtime clock, never persisted stale.
 */
export interface Entitlement {
  tier: AccountTier;
  /** Epoch ms the trial ends. Only meaningful when `tier === 'trial'`. */
  trialEndsAt?: number;
  /** Epoch ms the paid period ends. Only meaningful when `tier === 'subscriber'`. */
  currentPeriodEnd?: number;
  source: EntitlementSource;
  /** Epoch ms this entitlement was last written. */
  updatedAt: number;
}

/** The offline-first default: no server, no trial, everyone is `free`. */
export const FREE_ENTITLEMENT: Entitlement = {
  tier: 'free',
  source: 'none',
  updatedAt: 0,
};
