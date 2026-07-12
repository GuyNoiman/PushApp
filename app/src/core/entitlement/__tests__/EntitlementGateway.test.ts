/**
 * Entitlement gateway tests — the vendor-free boundary. Cover the
 * NullEntitlementGateway contract (disabled pillar reads as no-server ⇒ null, so
 * the caller falls back to the offline-first `free` default), that the interface
 * is READ-ONLY (no self-upgrade method exists), and that the factory returns a
 * stable singleton whose `enabled` tracks the feature flag.
 */
// The factory transitively imports the Supabase client, which pulls in
// AsyncStorage — whose native module is null under jest. Use the package's
// official jest mock so the boundary is testable off-device.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { NullEntitlementGateway } from '../EntitlementGateway';
import { getEntitlementGateway } from '../index';
import { featureFlags } from '../../config/featureFlags';

describe('NullEntitlementGateway', () => {
  it('is disabled', () => {
    expect(NullEntitlementGateway.enabled).toBe(false);
  });

  it('getEntitlement returns null (⇒ caller uses the free default)', async () => {
    await expect(NullEntitlementGateway.getEntitlement()).resolves.toBeNull();
  });

  it('exposes NO client-side write/upgrade method (server-authoritative writes)', () => {
    // Guard the security invariant: the gateway is read-only. If a future change
    // adds a setter, this test forces a conscious decision.
    const keys = Object.keys(NullEntitlementGateway);
    expect(keys).toEqual(expect.arrayContaining(['enabled', 'getEntitlement']));
    for (const forbidden of ['setEntitlement', 'upgrade', 'setTier', 'grant']) {
      expect(NullEntitlementGateway).not.toHaveProperty(forbidden);
    }
  });
});

describe('getEntitlementGateway factory', () => {
  it('returns a stable singleton', () => {
    expect(getEntitlementGateway()).toBe(getEntitlementGateway());
  });

  it('gateway.enabled tracks featureFlags.entitlements', () => {
    expect(getEntitlementGateway().enabled).toBe(featureFlags.entitlements);
  });
});
