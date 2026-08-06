/**
 * RESERVED SEAM — boundary only; location-triggered reminders are deferred (POC
 * scope) and must go through security-privacy + store review before implementation.
 *
 * Location pillar entry point. Mirrors `core/profile/index.ts`: it would return a
 * real gateway when `featureFlags.location` is on, else the inert
 * NullLocationGateway. No real implementation exists yet (deferred) and
 * `expo-location` is intentionally NOT installed, so the factory returns the Null
 * gateway today — the flag is wired so a future gateway drops in with no caller
 * changes.
 */
import { featureFlags } from '../config/featureFlags';
import { MockLocationGateway } from './MockLocationGateway';
import { NullLocationGateway, type LocationGateway } from './LocationGateway';

let instance: LocationGateway | null = null;

export function getLocationGateway(): LocationGateway {
  if (!instance) {
    // Deferred: no real gateway exists yet. When the location domain is built
    // (after a security-privacy + store review), construct it here behind
    // `featureFlags.location`; until then the flag is off and we stay inert.
    void featureFlags.location;
    // DEV-ONLY (Miss-Recovery): when `devMockRecovery` is on, return the in-memory
    // mock so the recovery loop is exercisable in Expo Go. It stays enabled=false
    // (the trigger kind is still dormant); it only adds the gating-only currentPlace()
    // read. OFF in production ⇒ the inert Null gateway, unchanged behaviour.
    instance = featureFlags.devMockRecovery ? MockLocationGateway : NullLocationGateway;
  }
  return instance;
}

export * from './LocationGateway';
