/**
 * SupabaseAuthGateway single-user sign-in tests (POC server sign-in).
 *
 * Covers the verified single-user path added on top of the anonymous bootstrap:
 *   • env present + sign-in ok + uid matches      → authenticated, no signOut
 *   • env present + sign-in ok + uid MISMATCH      → signed out + typed error
 *   • env present + sign-in FAILS                  → blocked (no anonymous fallback)
 *   • env present + persisted matching session     → reused, no re-sign-in
 *   • env ABSENT                                    → unchanged anonymous behaviour
 *
 * The Supabase SDK is replaced by a controllable mock client so the boundary is
 * testable off-device; the single-user config is driven via process.env, which
 * `getSingleUserConfig()` reads at call time.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The gateway is the one file that touches the SDK; replace the client singleton
// with a controllable stub. Defined INSIDE the factory (not an outer const) to
// avoid the temporal-dead-zone trap when jest hoists the mock above module init.
jest.mock('../../social/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInAnonymously: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

import { AuthIdentityMismatchError } from '../AuthGateway';
import { SupabaseAuthGateway } from '../SupabaseAuthGateway';
import { supabase } from '../../social/supabaseClient';

// Same object reference the gateway sees — its methods are the jest.fn()s above.
const mockAuth = (supabase as unknown as { auth: Record<string, jest.Mock> }).auth;

const UID = 'd87033dc-254d-4b95-92ba-10c8ba62a87f';
const EMAIL = 'founder@example.com';
const PASSWORD = 'correct horse battery staple';

function setSingleUserEnv() {
  process.env.EXPO_PUBLIC_SINGLE_USER_EMAIL = EMAIL;
  process.env.EXPO_PUBLIC_SINGLE_USER_PASSWORD = PASSWORD;
  process.env.EXPO_PUBLIC_SINGLE_USER_UID = UID;
}

function clearSingleUserEnv() {
  delete process.env.EXPO_PUBLIC_SINGLE_USER_EMAIL;
  delete process.env.EXPO_PUBLIC_SINGLE_USER_PASSWORD;
  delete process.env.EXPO_PUBLIC_SINGLE_USER_UID;
}

beforeEach(() => {
  jest.clearAllMocks();
  clearSingleUserEnv();
  // Default: no pre-existing session.
  mockAuth.getUser.mockResolvedValue({ data: { user: null } });
});

describe('SupabaseAuthGateway — single-user sign-in', () => {
  it('signs in and authenticates when the returned uid matches', async () => {
    setSingleUserEnv();
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: { id: UID, is_anonymous: false, identities: [{ provider: 'email' }] } },
      error: null,
    });

    const user = await new SupabaseAuthGateway().ensureSession();

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: EMAIL,
      password: PASSWORD,
    });
    expect(user).toEqual({ id: UID, isAnonymous: false, providers: ['email'] });
    expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
    expect(mockAuth.signOut).not.toHaveBeenCalled();
  });

  it('blocks and signs out when the returned uid does NOT match', async () => {
    setSingleUserEnv();
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'some-other-uid', is_anonymous: false, identities: [{ provider: 'email' }] } },
      error: null,
    });

    await expect(new SupabaseAuthGateway().ensureSession()).rejects.toBeInstanceOf(
      AuthIdentityMismatchError,
    );
    expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
  });

  it('blocks (no anonymous fallback) when sign-in fails', async () => {
    setSingleUserEnv();
    const authError = new Error('Invalid login credentials');
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: authError });

    await expect(new SupabaseAuthGateway().ensureSession()).rejects.toBe(authError);
    expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('reuses a persisted session that already belongs to the expected user', async () => {
    setSingleUserEnv();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: UID, is_anonymous: false, identities: [{ provider: 'email' }] } },
    });

    const user = await new SupabaseAuthGateway().ensureSession();

    expect(user.id).toBe(UID);
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('does NOT adopt a leftover anonymous session — signs in as the real user', async () => {
    setSingleUserEnv();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: 'leftover-anon', is_anonymous: true } },
    });
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: { id: UID, is_anonymous: false, identities: [{ provider: 'email' }] } },
      error: null,
    });

    const user = await new SupabaseAuthGateway().ensureSession();

    expect(mockAuth.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(user.id).toBe(UID);
  });

  it('falls back to the anonymous bootstrap when the single-user env is absent', async () => {
    // No env set (cleared in beforeEach).
    mockAuth.signInAnonymously.mockResolvedValue({
      data: { user: { id: 'anon-42', is_anonymous: true } },
      error: null,
    });

    const user = await new SupabaseAuthGateway().ensureSession();

    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
    expect(mockAuth.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(user).toEqual({ id: 'anon-42', isAnonymous: true, providers: ['anonymous'] });
  });
});
