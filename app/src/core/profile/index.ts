/**
 * RESERVED SEAM — boundary only; profiling logic is deferred (POC scope) and must
 * go through security-privacy before implementation.
 *
 * Profile pillar entry point. Mirrors `core/auth/index.ts`: it would return a real
 * gateway when `featureFlags.profile` is on, else the inert NullProfileGateway.
 * No real implementation exists yet (deferred), so the factory returns the Null
 * gateway today — the flag is wired so a future gateway drops in with no caller
 * changes.
 */
import { featureFlags } from '../config/featureFlags';
import { NullProfileGateway, type ProfileGateway } from './ProfileGateway';

let instance: ProfileGateway | null = null;

export function getProfileGateway(): ProfileGateway {
  if (!instance) {
    // Deferred: no real gateway exists yet. When the profile domain is built
    // (after a security-privacy review), construct it here behind
    // `featureFlags.profile`; until then the flag is off and we stay inert.
    void featureFlags.profile;
    instance = NullProfileGateway;
  }
  return instance;
}

export * from './ProfileGateway';
