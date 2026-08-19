/**
 * nativeIdentity — the NATIVE boundary for real Apple / Google sign-in (Auth_Backend_Proposal P4/P5).
 *
 * Both providers work the same way: the OS (or Google's SDK) authenticates the person and hands back
 * a signed **identity token**, which Supabase then exchanges for a session via `signInWithIdToken`.
 * This file is the only place either native module is touched, exactly as `SupabaseAuthGateway` is
 * the only place the Supabase SDK is touched. Keeping them apart is what lets that gateway keep its
 * standing rule: it must never import a native module, so Expo Go, web and jest stay unbroken.
 *
 * WHY THE MODULES ARE LOADED LAZILY, IN A TRY: they are native, so they exist only in a dev/release
 * build made after they were installed. On web, in Expo Go, and under jest they are absent or inert,
 * and a top-level import would take the whole app down at startup on surfaces that never asked to
 * sign in. Loading at CALL time turns "this build has no native module" into an honest
 * `AuthNotAvailableError` the caller can show, rather than a crash. `import type` is erased at
 * compile time, so the types cost nothing at runtime.
 *
 * PRIVACY (red-line R1): nothing here is stored. The identity token is passed straight to Supabase
 * and dropped; Apple's one-time full name and the Google profile are NOT read, NOT persisted and
 * NOT logged. PushApp's own tables hold no PII — identity stays in Supabase-managed `auth.users`.
 */
import type * as AppleAuthenticationModule from 'expo-apple-authentication';
import type { GoogleSignin as GoogleSigninType } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

import { AuthNotAvailableError } from './AuthGateway';

/** The Google OAuth client ids, read at call time so a test can set the env around a call. */
function googleClientIds(): { webClientId: string; iosClientId?: string } | null {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  // The WEB client is the one Supabase's provider is configured with, so it is the one that makes
  // the returned token verifiable. Without it there is nothing to exchange — fail honestly.
  if (!webClientId) return null;
  return { webClientId, iosClientId };
}

/**
 * The user dismissed the sheet themselves. Not a failure and never surfaced as an error — the caller
 * simply returns the user to where they were.
 */
export class SignInCancelledError extends Error {
  constructor() {
    super('Sign-in was cancelled.');
    this.name = 'SignInCancelledError';
  }
}

/** Load a native module at call time; `null` when this build does not carry it. */
function loadModule<T>(load: () => T): T | null {
  try {
    return load();
  } catch {
    return null;
  }
}

/**
 * Whether THIS build+device can offer Apple sign-in. iOS 13+ only, so it is false on Android, on web
 * and in any build made before `expo-apple-authentication` was installed. Apple requires the button
 * to be hidden where it cannot work, so the sign-in screen asks this before rendering it.
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const Apple = loadModule<typeof AppleAuthenticationModule>(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    () => require('expo-apple-authentication'),
  );
  if (!Apple) return false;
  try {
    return await Apple.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Run the Apple sheet and return the signed identity token for Supabase to verify.
 *
 * Throws {@link SignInCancelledError} when the person closed the sheet, and
 * {@link AuthNotAvailableError} when this build cannot do it at all — two different things, and the
 * UI must not show an error for the first.
 */
export async function appleIdentityToken(): Promise<string> {
  const Apple = loadModule<typeof AppleAuthenticationModule>(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    () => require('expo-apple-authentication'),
  );
  if (!Apple || !(await isAppleSignInAvailable())) {
    throw new AuthNotAvailableError('Apple sign-in is not available in this build.');
  }
  let credential: AppleAuthenticationModule.AppleAuthenticationCredential;
  try {
    credential = await Apple.signInAsync({
      // Requested so Apple shows the person what is being shared. We ask and then deliberately do
      // NOT read the name/email off the credential — see the privacy note at the top of this file.
      requestedScopes: [
        Apple.AppleAuthenticationScope.FULL_NAME,
        Apple.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new SignInCancelledError();
    throw e;
  }
  if (!credential.identityToken) {
    throw new AuthNotAvailableError('Apple returned no identity token.');
  }
  return credential.identityToken;
}

/** Whether this build can offer Google sign-in: the native module is present AND a client id is set. */
export function isGoogleSignInAvailable(): boolean {
  if (googleClientIds() === null) return false;
  return (
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loadModule<unknown>(() => require('@react-native-google-signin/google-signin')) !== null
  );
}

/**
 * Run Google's native sheet and return the signed identity token for Supabase to verify. Same two
 * failure shapes as {@link appleIdentityToken}: a cancel is not an error, a missing module is.
 */
export async function googleIdentityToken(): Promise<string> {
  const ids = googleClientIds();
  const mod = loadModule<{ GoogleSignin: typeof GoogleSigninType; statusCodes: Record<string, string> }>(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    () => require('@react-native-google-signin/google-signin'),
  );
  if (!ids || !mod) {
    throw new AuthNotAvailableError('Google sign-in is not available in this build.');
  }
  const { GoogleSignin, statusCodes } = mod;

  // `configure` is synchronous, idempotent and cheap, so it is done here rather than at startup —
  // a surface that never signs in never loads this module at all.
  GoogleSignin.configure({
    webClientId: ids.webClientId,
    iosClientId: ids.iosClientId,
    scopes: ['email', 'profile'],
  });

  try {
    // Android-only in practice; resolves immediately on iOS.
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    // v13+ returns a discriminated result: `{ type: 'cancelled' }` or `{ type: 'success', data }`.
    if (result.type === 'cancelled') throw new SignInCancelledError();
    const token = result.data?.idToken;
    if (!token) throw new AuthNotAvailableError('Google returned no identity token.');
    return token;
  } catch (e) {
    if (e instanceof SignInCancelledError) throw e;
    // Older versions signal a cancel through a status code instead of the result shape.
    if ((e as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED) throw new SignInCancelledError();
    throw e;
  }
}
