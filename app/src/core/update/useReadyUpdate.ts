/**
 * Apply an update the phone has already downloaded, instead of waiting for a cold start.
 *
 * ── WHY THIS EXISTS, AND WHY IT IS NOT A NICETY ────────────────────────────────────────────────
 *
 * `app.json` sets `updates.fallbackToCacheTimeout: 0`, which is the right call for launch speed: the
 * app never blocks on the network at startup. It launches from the bundle it already has and fetches
 * the new one in the background. The consequence is the part nobody priced — **the update it just
 * downloaded does not run until the NEXT cold start**, and backgrounding the app and coming back is
 * not a cold start on iOS. The phone has to be told to kill it.
 *
 * So the honest description of the old behaviour is: open the app, and you are testing the previous
 * version. Every time. That is not a hypothetical — it is why the founder's recording on 2026-09-07
 * showed an opening line and a first-run screen that had both been replaced the day before, and it
 * is most of the week this project has lost to two people looking at different builds.
 *
 * ── WHAT IT DOES ───────────────────────────────────────────────────────────────────────────────
 *
 * When an update has finished downloading and the app comes back to the foreground, it reloads. One
 * background-and-return instead of a force-quit, and nothing to explain to a tester.
 *
 * ── WHY ONLY ON FOREGROUND ─────────────────────────────────────────────────────────────────────
 *
 * Reloading mid-session would take the screen away from somebody in the middle of a sentence. Coming
 * back from the background is the one moment where a reload is indistinguishable from the app simply
 * having been away. It is not free even so: somebody who backgrounds the app in the middle of a
 * coach conversation loses it, because the conversation lives in memory (Backlog O-18). That is a
 * real cost, accepted while this is a tester build, and it is the same gap the resume work closes.
 *
 * Inert in development and wherever updates are disabled, so `expo start` is untouched.
 */
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

export function useReadyUpdate(): void {
  const { isUpdatePending } = Updates.useUpdates();
  // Read through a ref so the AppState subscription is registered once rather than re-bound on
  // every change of the flag — a listener that re-subscribes can miss the transition it exists for.
  const pending = useRef(isUpdatePending);
  pending.current = isUpdatePending;

  useEffect(() => {
    if (!Updates.isEnabled) return;
    const onChange = (next: AppStateStatus) => {
      if (next !== 'active' || !pending.current) return;
      // Failure is fine and deliberately silent: the update is still downloaded, and the next cold
      // start applies it exactly as it did before this hook existed.
      Updates.reloadAsync().catch(() => {});
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);
}
