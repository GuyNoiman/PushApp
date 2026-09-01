/**
 * Finding out that a newer build exists — including on a phone that can no
 * longer receive one.
 *
 * ── THE PROBLEM THIS SOLVES ──────────────────────────────────────────────
 *
 * An over-the-air update reaches only installations built for its runtime. So a
 * phone can be permanently cut off and have no way to know: from the device,
 * "you are up to date" and "nothing can ever reach you again" look identical.
 * It cost a tester three days of reporting bugs that had been fixed twice.
 *
 * An update cannot tell them, but a network request can. `current-build.json`
 * sits on the public site that already hosts the installer — no session, no key,
 * reachable by every build that ever shipped.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ───────────────────────────────────
 *
 * It never says "you are behind" from a failure. A fetch that times out, a
 * malformed manifest, a platform the manifest does not mention, or a device that
 * cannot report its own runtime all resolve to `unknown` — and `unknown` renders
 * as nothing at all. Telling somebody to reinstall when they do not need to is
 * how a notice like this stops being believed, and it only has to be wrong once.
 *
 * Pure TypeScript apart from `fetch`. No React, no vendor imports.
 */

/** One platform's newest build, as published in the manifest. */
export interface BuildManifestEntry {
  runtimeVersion: string | null;
  appVersion: string | null;
  buildNumber: string | null;
  builtAt: string | null;
  installUrl: string | null;
  installPage: string | null;
}

export interface BuildManifest {
  generatedAt?: string;
  platforms: Partial<Record<'ios' | 'android' | 'web', BuildManifestEntry>>;
}

export type UpdateStanding =
  /** Running the newest build there is. */
  | { state: 'current' }
  /** A newer build exists and cannot arrive on its own — it has to be installed. */
  | { state: 'behind'; latest: BuildManifestEntry }
  /** Not enough was known to say. Renders as nothing. */
  | { state: 'unknown'; reason: 'no-manifest' | 'no-runtime' | 'no-entry' | 'development' };

export interface StandingInput {
  /** The runtime this app is running, or null when it cannot be read. */
  runtime: string | null;
  platform: 'ios' | 'android' | 'web' | null;
  /** True in a dev client, on web, and under jest — where there is nothing to install. */
  development: boolean;
  manifest: BuildManifest | null;
}

/**
 * Compare what is running with what is published.
 *
 * The comparison is on the RUNTIME and nothing else. Not the app version — 1.0.0
 * was two different Android builds a week apart. Not the build number — Android's
 * was 2 for both. The runtime is a fingerprint of the native side, so it changes
 * exactly when the thing that must be reinstalled changes, which is the question.
 */
export function updateStanding({ runtime, platform, development, manifest }: StandingInput): UpdateStanding {
  if (development) return { state: 'unknown', reason: 'development' };
  if (!manifest || !manifest.platforms) return { state: 'unknown', reason: 'no-manifest' };
  if (!platform) return { state: 'unknown', reason: 'no-entry' };
  const latest = manifest.platforms[platform];
  if (!latest || !latest.runtimeVersion) return { state: 'unknown', reason: 'no-entry' };
  // A device that cannot report its own runtime is not evidence of being behind.
  if (!runtime) return { state: 'unknown', reason: 'no-runtime' };
  return runtime === latest.runtimeVersion ? { state: 'current' } : { state: 'behind', latest };
}

/** Where the manifest lives — the same site that hosts the installer. */
export const MANIFEST_URL = 'https://pushapp-invite.expo.app/current-build.json';

/**
 * Read the manifest. Returns null on anything at all going wrong, because every
 * failure here means "we do not know", never "you are behind".
 */
export async function fetchBuildManifest(
  url: string = MANIFEST_URL,
  timeoutMs = 6000,
): Promise<BuildManifest | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = (await res.json()) as BuildManifest;
    return body && typeof body === 'object' && body.platforms ? body : null;
  } catch {
    return null;
  }
}
