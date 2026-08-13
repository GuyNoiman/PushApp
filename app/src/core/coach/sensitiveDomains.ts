/**
 * sensitiveDomains — the domains too sensitive for an app-shaped plan (SafetyLayer). The live coach
 * HANDS OFF instead of interviewing when a goal routes to one of these, and a deferred goal in one of
 * them is NEVER parked or activatable (Parked/deferred goals, L1 security): parking one would let it
 * become an activatable Journey that bypassed the coach's sensitive-domain stop.
 *
 * Single source of truth so the live-coach stop and the parked-goal capture filter can never drift.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { DomainId } from '../learning/experts/registry';

/** The domains the coach hands off rather than plans for. */
export const SENSITIVE_DOMAINS = new Set<DomainId>(['addiction', 'relationships']);

/** True when a domain is too sensitive for an app-shaped plan (see {@link SENSITIVE_DOMAINS}). */
export function isSensitiveDomain(domain: DomainId): boolean {
  return SENSITIVE_DOMAINS.has(domain);
}
