/**
 * RESERVED SEAM — boundary only; profiling logic is deferred (POC scope) and must
 * go through security-privacy before implementation.
 *
 * ProfileGateway — the reserved boundary for a future adaptive-profile domain: a
 * derived, privacy-safe picture of how a user tends to act (e.g. preferred check-in
 * time-of-day, follow-through tendency) that a later personalization/intervention
 * layer could read. It mirrors the existing gateway pattern (AuthGateway /
 * SocialGateway / EntitlementGateway): engines, providers and UI would depend on
 * THIS interface only, and a single vendor file would implement it later. Pure TS
 * here — no vendor imports, no React, no native modules.
 *
 * Nothing implements this beyond the inert NullProfileGateway today. It exists so
 * the boundary is stable when the deferred feature is built; NO profiling logic is
 * written here now.
 *
 * PRIVACY (critical): UserProfile carries NO PII — no name, no email, no free text,
 * no location, no raw event log. It holds DERIVED TRAITS only (coarse, aggregate
 * signals). Any future implementation that would collect or infer more must be
 * reviewed by security-privacy first.
 */

/**
 * A DERIVED, PII-free trait picture of the user. Every field is an aggregate the
 * app could compute on-device from existing local state — never raw personal data.
 * Kept intentionally minimal; grow it only through the security-privacy review.
 */
export type UserProfile = {
  /** Coarse part-of-day the user most often checks in, or null if unknown. */
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | null;
  /** Derived follow-through tendency in [0,1], or null if not enough signal yet. */
  consistency: number | null;
};

/**
 * A reserved signal a future profiling layer could record to refine the derived
 * traits. Deliberately abstract and PII-free — a `kind` tag plus an optional epoch
 * timestamp. No payload shape is fixed here; that is part of the deferred design.
 */
export type ProfileSignal = {
  kind: string;
  at?: number;
};

export interface ProfileGateway {
  /** Whether the pillar is configured/active (feature flag). */
  readonly enabled: boolean;

  /** Read the current derived profile, or null when none exists / pillar off. */
  getProfile(): Promise<UserProfile | null>;

  /** Record a signal that could refine the profile. No-op while deferred. */
  recordSignal(signal: ProfileSignal): Promise<void>;
}

/**
 * No-op gateway used while the profile pillar is deferred/disabled. Inert by
 * design: getProfile → null, recordSignal → noop. Mirrors NullAuthGateway so
 * callers never branch on config once the seam is wired.
 */
export const NullProfileGateway: ProfileGateway = {
  enabled: false,
  async getProfile() {
    return null;
  },
  async recordSignal() {
    // No profiling layer yet — recording a signal is intentionally a no-op.
  },
};
