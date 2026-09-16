/**
 * Google's native sheet, and how each way it can end is classified — by CODE, never by message.
 *
 * The case that matters is the one from the first device test (2026-09-16): on Android the library
 * rejects with `code: "10"` (Play services' `DEVELOPER_ERROR`) and a message pointing at its
 * troubleshooting page. That is our build being configured wrongly. It must become a named failure
 * and must never be mistaken for a cancel, which would show the person nothing at all.
 */
const mockSignIn = jest.fn();
jest.mock(
  '@react-native-google-signin/google-signin',
  () => ({
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn(async () => true),
      signIn: (...args: unknown[]) => mockSignIn(...args),
    },
    statusCodes: {
      SIGN_IN_CANCELLED: '12501',
      IN_PROGRESS: 'ASYNC_OP_IN_PROGRESS',
      PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
      SIGN_IN_REQUIRED: '4',
    },
  }),
);

import { SignInCancelledError, SignInMisconfiguredError, googleIdentityToken } from '../nativeIdentity';

const DEVELOPER_ERROR_MESSAGE =
  'DEVELOPER_ERROR: Follow troubleshooting instructions at https://react-native-google-signin.github.io/docs/troubleshooting';

const env = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
beforeAll(() => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client-id';
});
afterAll(() => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = env;
});
beforeEach(() => mockSignIn.mockReset());

describe('googleIdentityToken', () => {
  it('returns the token on success', async () => {
    mockSignIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'tok' } });
    await expect(googleIdentityToken()).resolves.toEqual({ token: 'tok' });
  });

  it('reads a cancelled result as a cancel', async () => {
    mockSignIn.mockResolvedValueOnce({ type: 'cancelled' });
    await expect(googleIdentityToken()).rejects.toBeInstanceOf(SignInCancelledError);
  });

  it('reads the cancel status code as a cancel', async () => {
    mockSignIn.mockRejectedValueOnce(Object.assign(new Error('cancelled'), { code: '12501' }));
    await expect(googleIdentityToken()).rejects.toBeInstanceOf(SignInCancelledError);
  });

  it('turns DEVELOPER_ERROR into a named configuration failure, not a cancel', async () => {
    mockSignIn.mockRejectedValueOnce(Object.assign(new Error(DEVELOPER_ERROR_MESSAGE), { code: '10' }));
    const thrown = await googleIdentityToken().catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(SignInMisconfiguredError);
    expect(thrown).not.toBeInstanceOf(SignInCancelledError);
    // The library's developer text is not carried along.
    expect((thrown as Error).message).not.toContain('troubleshooting');
  });

  it('decides by the code, so the same words under another code are not a configuration fault', async () => {
    const other = Object.assign(new Error(DEVELOPER_ERROR_MESSAGE), { code: '7' });
    mockSignIn.mockRejectedValueOnce(other);
    await expect(googleIdentityToken()).rejects.toBe(other);
  });
});
