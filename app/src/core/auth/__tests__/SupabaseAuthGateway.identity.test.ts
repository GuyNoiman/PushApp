/**
 * SupabaseAuthGateway — real Apple / Google sign-in (P4/P5).
 *
 * The shape being pinned is the one the architecture depends on: the native sheet produces a signed
 * identity TOKEN, and this gateway does nothing with it but hand it to Supabase to verify. So:
 *   • the right provider name and token reach `signInWithIdToken`;
 *   • the returned identity is a normal AuthUser — a real uid, no longer anonymous, so every RLS
 *     policy behaves exactly as it did on the anonymous path;
 *   • a Supabase error propagates rather than resolving as a half-signed-in state;
 *   • a CANCEL propagates untouched, because the UI must show nothing for it, and it must never be
 *     confused with a failure.
 *
 * `./nativeIdentity` is mocked out: it is the native boundary, and the point of it existing as its
 * own module is that this file can be tested off-device.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../social/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInAnonymously: jest.fn(),
      signInWithIdToken: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    functions: { invoke: jest.fn() },
  },
}));

jest.mock('../nativeIdentity', () => ({
  appleIdentityToken: jest.fn(),
  googleIdentityToken: jest.fn(),
}));

import { AuthNotAvailableError } from '../AuthGateway';
import { SupabaseAuthGateway } from '../SupabaseAuthGateway';
import { appleIdentityToken, googleIdentityToken } from '../nativeIdentity';
import { supabase } from '../../social/supabaseClient';

const auth = (supabase as unknown as { auth: Record<string, jest.Mock> }).auth;
const mockApple = appleIdentityToken as jest.Mock;
const mockGoogle = googleIdentityToken as jest.Mock;

/**
 * A Supabase user as the SDK returns it after a successful identity-token exchange. Providers are
 * read off `identities` — the same field `toAuthUser` reads, and the same one that stays free of the
 * name/email that live in `identity_data` (red-line R1).
 */
function supabaseUser(provider: string) {
  return {
    id: 'uid-real-1',
    is_anonymous: false,
    identities: [{ provider }],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SupabaseAuthGateway — Apple sign-in', () => {
  it('exchanges the Apple identity token and returns the real (non-anonymous) user', async () => {
    mockApple.mockResolvedValue('apple-id-token');
    auth.signInWithIdToken.mockResolvedValue({ data: { user: supabaseUser('apple') }, error: null });

    const user = await new SupabaseAuthGateway().signInWithApple();

    expect(auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'apple-id-token',
    });
    expect(user.id).toBe('uid-real-1');
    expect(user.isAnonymous).toBe(false);
    expect(user.providers).toContain('apple');
  });

  it('propagates a Supabase error instead of resolving half-signed-in', async () => {
    const err = new Error('token rejected');
    mockApple.mockResolvedValue('apple-id-token');
    auth.signInWithIdToken.mockResolvedValue({ data: { user: null }, error: err });

    await expect(new SupabaseAuthGateway().signInWithApple()).rejects.toBe(err);
  });

  it('throws when the exchange succeeds but returns no user', async () => {
    mockApple.mockResolvedValue('apple-id-token');
    auth.signInWithIdToken.mockResolvedValue({ data: { user: null }, error: null });

    await expect(new SupabaseAuthGateway().signInWithApple()).rejects.toBeInstanceOf(
      AuthNotAvailableError,
    );
  });

  it('lets a cancel through untouched, and never reaches Supabase with it', async () => {
    const cancelled = Object.assign(new Error('cancelled'), { name: 'SignInCancelledError' });
    mockApple.mockRejectedValue(cancelled);

    await expect(new SupabaseAuthGateway().signInWithApple()).rejects.toBe(cancelled);
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });
});

describe('SupabaseAuthGateway — Google sign-in', () => {
  it('exchanges the Google identity token under the `google` provider', async () => {
    mockGoogle.mockResolvedValue('google-id-token');
    auth.signInWithIdToken.mockResolvedValue({ data: { user: supabaseUser('google') }, error: null });

    const user = await new SupabaseAuthGateway().signInWithGoogle();

    expect(auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'google-id-token',
    });
    expect(user.isAnonymous).toBe(false);
    expect(user.providers).toContain('google');
  });

  it('never falls back to the Apple token source', async () => {
    mockGoogle.mockResolvedValue('google-id-token');
    auth.signInWithIdToken.mockResolvedValue({ data: { user: supabaseUser('google') }, error: null });

    await new SupabaseAuthGateway().signInWithGoogle();

    expect(mockApple).not.toHaveBeenCalled();
  });
});
