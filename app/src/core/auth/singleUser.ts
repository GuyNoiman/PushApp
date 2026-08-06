/**
 * singleUser — the config seam for the POC's single-user server sign-in.
 *
 * The founder created exactly ONE real Supabase user and wants the app to sign in
 * as that known identity instead of minting an anonymous session — with NO signup
 * UI. This module reads the three `EXPO_PUBLIC_SINGLE_USER_*` env vars and returns
 * a config ONLY when all three are present; absent ⇒ null and the gateway keeps
 * today's anonymous behaviour (nothing breaks for anyone without the env).
 *
 * SECURITY (POC-only, red-line acknowledged): `EXPO_PUBLIC_*` vars are inlined into
 * the client bundle, so the password IS extractable from a shipped build. This is
 * acceptable ONLY for the founder's personal single-user POC on their own device.
 * Production needs real auth with no client-side password. The password lives in
 * env alone and is NEVER logged (do not add it to any console/telemetry call).
 */
export type SingleUserConfig = {
  email: string;
  /** POC-only, read from env; never log this. See the security note above. */
  password: string;
  /** The expected Supabase `auth.uid()` — the server verifies against this. */
  uid: string;
};

/**
 * The single-user config, or null when the env is not fully set. Read at call time
 * (not module load) so tests and the app pick up the current environment. All three
 * vars are required — a partial config falls back to anonymous rather than guessing.
 */
export function getSingleUserConfig(): SingleUserConfig | null {
  const email = process.env.EXPO_PUBLIC_SINGLE_USER_EMAIL;
  const password = process.env.EXPO_PUBLIC_SINGLE_USER_PASSWORD;
  const uid = process.env.EXPO_PUBLIC_SINGLE_USER_UID;
  if (email && password && uid) return { email, password, uid };
  return null;
}
