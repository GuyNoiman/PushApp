/**
 * simulatedUser — a DEV SIMULATION of a Google sign-in, for founder testing only.
 *
 * It gives the app a real display name + email (instead of the "there" placeholder)
 * without any OAuth, network, or SDK. The values come from two git-ignored env vars
 * the founder sets in `app/.env.local`:
 *
 *   EXPO_PUBLIC_SIM_USER_NAME   e.g. "Guy"
 *   EXPO_PUBLIC_SIM_USER_EMAIL  e.g. "guy@example.com"
 *
 * Only `EXPO_PUBLIC_*` vars reach the client bundle, and Metro INLINES them at build
 * time only when read as VERBATIM `process.env.EXPO_PUBLIC_…` member access — so the
 * two reads below are written out literally and must stay that way. When the name is
 * absent the user is treated as signed-out and callers fall back to prior behaviour.
 *
 * Pure / framework-free (Engineering Bible §19): no React, no native modules.
 *
 * TODO(auth): a REAL OAuth flow (Sign in with Apple / Google) will replace this whole
 * file with a proper identity/session; this simulation is a temporary stand-in.
 */

/** A simulated signed-in identity (or a signed-out state when no name is set). */
export interface SimulatedUser {
  signedIn: boolean;
  name?: string;
  email?: string;
  provider: 'google';
}

/**
 * Read the simulated identity from the build-time env. `signedIn` is true only when a
 * non-empty name is present; email is optional. Both reads are verbatim literals so
 * Metro can inline them (see the header note).
 */
export function getSimulatedUser(): SimulatedUser {
  const name = process.env.EXPO_PUBLIC_SIM_USER_NAME?.trim() || undefined;
  const email = process.env.EXPO_PUBLIC_SIM_USER_EMAIL?.trim() || undefined;
  return {
    signedIn: Boolean(name),
    name,
    email,
    provider: 'google',
  };
}

/** The first token of a full name ("Guy Noiman" → "Guy"); '' for empty input. */
export function firstName(full: string | undefined): string {
  return full?.trim().split(/\s+/)[0] ?? '';
}
