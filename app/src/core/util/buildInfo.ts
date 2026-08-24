/**
 * buildInfo — which copy of the app is actually running right now.
 *
 * WHY it exists (founder, 2026-08-24): the app ships to the two testers in two different ways.
 * A BUILD carries a native binary and a JavaScript bundle inside it; an over-the-air UPDATE
 * replaces only the bundle, on a phone that already has the build. The version in `app.json`
 * moves with the build and stays completely still through every update — so the number Android
 * shows under "App info", and the number the About row used to show on its own, both keep saying
 * `1.0.0` long after the app on screen has changed twice over.
 *
 * That is fine until someone says "it doesn't work". Then the first question is *which copy of
 * the app are you looking at*, and nothing on the device could answer it. This module answers it:
 * the About row can name the update that is running and the day it was published.
 *
 * `expo-updates` is required LAZILY for the same reason `i18n/restart` does it — this is imported
 * by a screen that also renders on web and under jest, where the native module does not exist.
 * A missing module is not an error here; it means "we are not running an update", which is the
 * plain truth in development.
 */

/** The shape of `expo-updates` this module uses — declared so a test can hand one in. */
export type UpdatesLike = {
  isEnabled?: boolean;
  isEmbeddedLaunch?: boolean;
  updateId?: string | null;
  createdAt?: Date | null;
  channel?: string | null;
  runtimeVersion?: string | null;
};

/**
 * What the phone is running:
 *  - `development` — no updates mechanism at all (dev client, web, jest). Nothing to report.
 *  - `embedded`    — a real build, running the bundle that shipped inside it. No update has been
 *                    downloaded and applied yet, which is exactly the state to recognise when a
 *                    tester says "it still looks the same".
 *  - `update`      — a real build running a published update, named by id and publication date.
 */
export type RunningBundle =
  | { kind: 'development' }
  | { kind: 'embedded'; channel: string | null }
  | { kind: 'update'; id: string; createdAt: Date | null; channel: string | null };

/** Empty string, `null` and `undefined` all mean "not set" — collapse them to one. */
function orNull(value: string | null | undefined): string | null {
  return value ? value : null;
}

/**
 * Read the running bundle out of an `expo-updates`-shaped object.
 *
 * Kept pure and separate from the require() so it can be tested without a native module.
 * `isEnabled === false` is the dev client, where the module exists but does nothing.
 */
export function describeBundle(updates: UpdatesLike | null): RunningBundle {
  if (!updates || updates.isEnabled !== true) return { kind: 'development' };
  const channel = orNull(updates.channel);
  const id = orNull(updates.updateId);
  // An embedded launch has an updateId too (the id of the bundle baked into the build), so the
  // flag decides — not the presence of an id.
  if (updates.isEmbeddedLaunch === true || !id) return { kind: 'embedded', channel };
  return { kind: 'update', id, createdAt: updates.createdAt ?? null, channel };
}

/**
 * The first characters of an update id — enough to tell two updates apart when a tester reads it
 * out loud, short enough to sit on one line of a settings row. The full uuid says nothing more to
 * a human, and the dashboard finds an update by its prefix.
 */
export function shortUpdateId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8);
}

/** The `expo-updates` module, or null wherever it does not exist (web, Expo Go, jest). */
function updatesModule(): UpdatesLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-updates') as UpdatesLike;
  } catch {
    return null;
  }
}

/** What this phone is running, read at call time. */
export function readRunningBundle(): RunningBundle {
  return describeBundle(updatesModule());
}
