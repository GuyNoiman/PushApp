/**
 * RESERVED SEAM — boundary only; interests logic is deferred (POC scope) and must
 * go through security-privacy before implementation.
 *
 * Interests pillar entry point. Mirrors `core/auth/index.ts`: it would return a
 * real gateway when `featureFlags.interests` is on, else the inert
 * NullInterestsGateway. No real implementation exists yet (deferred), so the
 * factory returns the Null gateway today — the flag is wired so a future gateway
 * drops in with no caller changes.
 */
import { featureFlags } from '../config/featureFlags';
import { NullInterestsGateway, type InterestsGateway } from './InterestsGateway';

let instance: InterestsGateway | null = null;

export function getInterestsGateway(): InterestsGateway {
  if (!instance) {
    // Deferred: no real gateway exists yet. When the interests domain is built
    // (after a security-privacy review), construct it here behind
    // `featureFlags.interests`; until then the flag is off and we stay inert.
    void featureFlags.interests;
    instance = NullInterestsGateway;
  }
  return instance;
}

export * from './InterestsGateway';
