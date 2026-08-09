/**
 * Auth gateway tests — the vendor-free boundary (Auth_Backend_Proposal §2, E3).
 * Cover the NullAuthGateway contract (disabled pillar), the typed sign-in stub,
 * and that the factory returns a stable singleton whose `enabled` tracks the flag.
 */
// The factory transitively imports the Supabase client, which pulls in
// AsyncStorage — whose native module is null under jest. Use the package's
// official jest mock so the boundary is testable off-device.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { AuthNotAvailableError, NullAuthGateway } from '../AuthGateway';
import { getAuthGateway } from '../index';
import { featureFlags } from '../../config/featureFlags';

describe('NullAuthGateway', () => {
  it('is disabled', () => {
    expect(NullAuthGateway.enabled).toBe(false);
  });

  it('ensureSession returns an inert anonymous user (never crashes the app)', async () => {
    const user = await NullAuthGateway.ensureSession();
    expect(user.isAnonymous).toBe(true);
    expect(user.providers).toEqual([]);
  });

  it('getCurrentUser is null with no backend', async () => {
    await expect(NullAuthGateway.getCurrentUser()).resolves.toBeNull();
  });

  it('signOut and onAuthChange are no-ops', async () => {
    await expect(NullAuthGateway.signOut()).resolves.toBeUndefined();
    const unsub = NullAuthGateway.onAuthChange(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('deleteAccount is an inert no-op (nothing remote to delete)', async () => {
    await expect(NullAuthGateway.deleteAccount()).resolves.toBeUndefined();
  });

  it('real sign-in throws a typed AuthNotAvailableError', async () => {
    await expect(NullAuthGateway.signInWithApple()).rejects.toBeInstanceOf(AuthNotAvailableError);
    await expect(NullAuthGateway.signInWithGoogle()).rejects.toBeInstanceOf(AuthNotAvailableError);
  });
});

describe('getAuthGateway factory', () => {
  it('returns a stable singleton', () => {
    expect(getAuthGateway()).toBe(getAuthGateway());
  });

  it("gateway.enabled tracks featureFlags.auth", () => {
    // In this test env the flag mirrors the Supabase env; either way the gateway's
    // enabled flag must agree with the feature flag (no config drift).
    expect(getAuthGateway().enabled).toBe(featureFlags.auth);
  });
});
