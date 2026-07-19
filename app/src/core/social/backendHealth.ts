/**
 * backendHealth — a cheap liveness probe for the Supabase backend.
 *
 * WHY THIS EXISTS (2026-07-19): `featureFlags` turns the social / auth /
 * entitlement pillars on whenever the Supabase env vars are PRESENT. That is the
 * right default, but it cannot distinguish "configured and healthy" from
 * "configured and pointing at a project that no longer exists". A Free-tier
 * project pauses after inactivity and is eventually deleted — at which point the
 * host stops resolving entirely (DNS NXDOMAIN, observed on this project).
 *
 * When that happened the app still created a Supabase client, and the client's
 * background token refresh (`autoRefreshToken`) fired a fetch OUTSIDE any of our
 * try/catch blocks. The rejection surfaced as a red "Network request failed"
 * banner at startup even though every local pillar worked fine.
 *
 * So: probe once, cheaply, with a short timeout. If the backend is unreachable,
 * stop the refresh timer (the actual source of the unhandled rejection) and report
 * it, so callers can degrade quietly instead of erroring. This is the runtime
 * complement to the compile-time `featureFlags` gate — flags answer "is a backend
 * configured?", this answers "is it actually alive?".
 *
 * Deliberately dependency-free and non-blocking: never await this on the startup
 * path, and never let it throw.
 */
import { supabase } from '@/core/social/supabaseClient';

/** How long to wait before declaring the backend unreachable. */
const PROBE_TIMEOUT_MS = 4000;

export type BackendHealth = 'unconfigured' | 'reachable' | 'unreachable';

let cached: BackendHealth | null = null;
let inFlight: Promise<BackendHealth> | null = null;

/**
 * `/auth/v1/health` is the cheapest endpoint that proves the project exists: it
 * needs no table, no row-level-security policy and no valid session. Any HTTP
 * response at all (even 401) means the project is alive — only a transport-level
 * failure means it is gone.
 */
function healthUrl(): string | null {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return base ? `${base.replace(/\/+$/, '')}/auth/v1/health` : null;
}

async function probe(): Promise<BackendHealth> {
  const url = healthUrl();
  if (!url || !supabase) return 'unconfigured';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    // A 4xx proves the ORIGIN answered and merely refused this unauthenticated
    // request — the project is up, which is what we are testing for.
    //
    // A 5xx must NOT count as reachable. Observed 2026-07-19 while a paused project
    // was restoring: DNS resolved and Cloudflare's edge served 401/521 while the
    // origin was still booting. Treating that as healthy would let the app proceed
    // to real auth calls that then fail — reintroducing the exact startup error
    // this module exists to prevent. Cloudflare 52x specifically means
    // "edge reachable, origin down".
    return res.status >= 500 ? 'unreachable' : 'reachable';
  } catch {
    // Transport-level failure: DNS gone (deleted project), offline, or timeout.
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probe once per app session and remember the answer. Safe to call from anywhere;
 * concurrent callers share the same in-flight request and it never rejects.
 */
export async function checkBackendHealth(): Promise<BackendHealth> {
  if (cached) return cached;
  if (!inFlight) {
    inFlight = probe()
      .then((result) => {
        cached = result;
        if (result === 'unreachable' && supabase) {
          // The background refresh timer is what threw the unhandled rejection.
          // Stopping it is the difference between "pillar quietly off" and "red
          // banner every time the timer fires".
          try {
            void supabase.auth.stopAutoRefresh();
          } catch {
            // Never let cleanup of a failure path become a second failure.
          }
          console.warn(
            '[backendHealth] Supabase is configured but unreachable — social/auth/entitlement ' +
              'pillars will stay off for this session. The local pillars are unaffected. ' +
              'If the Free-tier project was paused or deleted, create a new one and update .env.',
          );
        }
        return result;
      })
      .catch(() => {
        cached = 'unreachable';
        return cached;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Last known health without triggering a probe — `null` if never checked. */
export function lastKnownBackendHealth(): BackendHealth | null {
  return cached;
}

/** Test-only: forget the cached verdict so a fresh probe runs. */
export function resetBackendHealthForTests(): void {
  cached = null;
  inFlight = null;
}
