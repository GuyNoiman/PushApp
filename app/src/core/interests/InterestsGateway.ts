/**
 * RESERVED SEAM — boundary only; interests logic is deferred (POC scope) and must
 * go through security-privacy before implementation.
 *
 * InterestsGateway — the reserved boundary for a future interests/discovery domain:
 * the coarse topic tags a user opts into (e.g. "fitness", "learning") that a later
 * recommendation layer could use to suggest Journeys or Explore content. Mirrors
 * the existing gateway pattern (AuthGateway / SocialGateway / EntitlementGateway):
 * engines, providers and UI would depend on THIS interface only, with a single
 * vendor file implementing it later. Pure TS — no vendor imports, no React, no
 * native modules.
 *
 * Nothing implements this beyond the inert NullInterestsGateway today. It exists so
 * the boundary is stable when the deferred feature is built; NO interests logic is
 * written here now.
 *
 * PRIVACY (critical): topics are USER-CHOSEN, coarse category tags — NOT PII and
 * NOT inferred sensitive attributes. No free text, no identity, no location. Any
 * future implementation that would infer interests rather than accept explicit
 * opt-in must be reviewed by security-privacy first.
 */

/** A coarse, user-chosen interest topic tag (e.g. 'fitness'). Not PII. */
export type InterestTopic = string;

/**
 * Optional context a future recommender could consider. Deliberately abstract and
 * PII-free; no shape is fixed here — that is part of the deferred design.
 */
export type InterestsContext = {
  surface?: string;
};

export interface InterestsGateway {
  /** Whether the pillar is configured/active (feature flag). */
  readonly enabled: boolean;

  /** The user's chosen topics, or an empty list when none / pillar off. */
  getInterests(): Promise<InterestTopic[]>;

  /** Replace the user's chosen topics. No-op while deferred. */
  setInterests(topics: InterestTopic[]): Promise<void>;

  /**
   * Reserved: recommend topics/content for a context. Optional so a first
   * implementation can ship storage-only, adding recommendations later.
   */
  recommend?(context: InterestsContext): Promise<InterestTopic[]>;
}

/**
 * No-op gateway used while the interests pillar is deferred/disabled. Inert by
 * design: getInterests → [], setInterests → noop. Mirrors NullAuthGateway so
 * callers never branch on config once the seam is wired.
 */
export const NullInterestsGateway: InterestsGateway = {
  enabled: false,
  async getInterests() {
    return [];
  },
  async setInterests() {
    // No interests layer yet — setting topics is intentionally a no-op.
  },
};
