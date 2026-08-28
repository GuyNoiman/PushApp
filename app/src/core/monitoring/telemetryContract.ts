/**
 * The telemetry contract, as code — what a crash report is ALLOWED to contain, and what it may never
 * contain under any circumstances.
 *
 * ── WHY THIS FILE IS THE DELIVERABLE, AND THE SDK IS NOT ──────────────────────────────────────
 *
 * `Operational_Monitoring_Admin_Console_PRD` §11.5 is unambiguous: *"Proof, not promise."* Wiring a
 * crash reporter is an afternoon. The thing that makes it safe to wire is a rule the SDK cannot get
 * around, tested with planted strings for every prohibited category, applied to the FINAL serialized
 * payload rather than to the object we intended to send.
 *
 * So this module is written and tested BEFORE the vendor exists. `@sentry/react-native` is a native
 * dependency: adding it moves the runtime fingerprint and cuts every installed build off from
 * over-the-air updates until a new build ships. Everything that can be built without it, is —
 * leaving the vendor, the DSN and the build as one deliberate final step.
 *
 * ── THE SHAPE OF THE RULE ─────────────────────────────────────────────────────────────────────
 *
 * An ALLOWLIST, never a denylist. A denylist asks "does this look like a Journey title?", which is
 * unanswerable — a Journey title is a sentence and so is everything else. An allowlist asks "is this
 * key one of the twelve things §11.3 permits?", which is decidable, and makes the failure mode
 * *dropping something useful* instead of *sending something private*.
 *
 * Pure TypeScript — no vendor import, no React, no I/O.
 */

/**
 * Every key a diagnostic event may carry (§11.3). Anything not on this list is removed, whatever it
 * is called and whatever it holds.
 */
export const ALLOWED_KEYS: readonly string[] = [
  // What went wrong
  'errorClass',
  'errorCode',
  'handled',
  'fatal',
  'stack',
  'module',
  'function',
  // Which copy of the app
  'appVersion',
  'appBuild',
  'runtimeVersion',
  'updateId',
  'channel',
  'environment',
  // Which kind of device, never which device
  'platform',
  'osVersion',
  'deviceClass',
  'appState',
  // Where, coarsely
  'screen',
  // When, and roughly how connected
  'timestamp',
  'networkState',
  // Who, as a number that means nothing anywhere else
  'installationId',
  // What was switched on
  'featureFlags',
  // How much / how long, bucketed
  'durationBucket',
  'count',
  // The vendor's own correlation id
  'eventId',
];

/**
 * Screens may be reported by IDENTIFIER only (§11.3: "allowlisted screen identifier without route
 * parameters"). A route like `/journey/abc123` carries an id that ties a crash to one Journey, and
 * `/friend/xyz` ties it to a person — so a path is reduced to its shape before it is allowed out.
 */
export function safeScreen(route: string | undefined): string | undefined {
  if (!route) return undefined;
  const path = route.split('?')[0].split('#')[0];
  const shaped = path
    .split('/')
    .filter(Boolean)
    // ALLOWLISTED, exactly as §11.3 words it. The first version tried to RECOGNISE an id — "letters
    // then digits" — and `abc123` sailed straight through it, which is what a Journey id looks like.
    // Guessing which segments are secret is the same losing game as guessing which strings are; the
    // decidable question is whether this is one of the screens we named.
    .map((seg) => (KNOWN_SCREEN_SEGMENTS.has(seg) ? seg : ':id'))
    .join('/');
  return shaped ? `/${shaped}` : '/';
}

/**
 * Every route segment that is a SCREEN rather than a thing. Adding a screen means adding it here —
 * and forgetting to means its crashes are reported as `/:id`, which is a lost label rather than a
 * leaked id. That asymmetry is the point.
 */
const KNOWN_SCREEN_SEGMENTS = new Set<string>([
  'coach', 'journey', 'journeys', 'new', 'dream', 'my-dreams', 'dream-coach', 'friend', 'friends',
  'circle', 'inbox', 'new-message', 'conversation', 'notifications', 'tools', 'explore',
  'settings', 'profile', 'country', 'language', 'active-hours', 'coach-memory', 'report',
  'communication-style', 'communication-style-quiz', 'onboarding', 'questionnaire', 'completion',
  'weekly-review', 'return', 'data-recovery', 'mirror-answer', 'mirror', 'sign-in', 'dev-adaptive',
  'best-year', 'values', 'direction', 'passion-map', 'gratitude', 'what-worked', 'self-compassion',
  'decision-clarity', 'obstacle-to-action', 'life-wheel',
]);

/** A stack frame's file path, with anything outside the app's own tree reduced to its basename. */
export function safeStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  return stack
    .split('\n')
    // Absolute paths carry a username on a developer machine and a container path in CI.
    .map((line) => line.replace(/(\/[^\s():]*\/)+/g, ''))
    .slice(0, 40)
    .join('\n');
}

/**
 * A number, bucketed. Durations and counts are allowed (§11.3, "safe duration/count/bucket values");
 * exact ones are a fingerprint, and an exact millisecond count of a coach call is a fact about one
 * conversation.
 */
export function bucket(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return 'unknown';
  for (const edge of [100, 500, 1000, 3000, 10000, 30000]) if (ms < edge) return `<${edge}ms`;
  return '>=30000ms';
}

/**
 * Reduce anything to what may leave the device.
 *
 * Applied to the OUTBOUND OBJECT, recursively, and it keeps only allowlisted keys — so a nested
 * `extra.journey.title` is gone because `extra` was never allowed, not because anybody thought of
 * that particular path. Values are themselves constrained: only primitives survive, strings are
 * length-capped, and anything structured under an allowed key is dropped rather than walked.
 */
export function scrubEvent(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!ALLOWED_KEYS.includes(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
      continue;
    }
    if (typeof value === 'string') {
      out[key] = key === 'stack' ? safeStack(value) : value.slice(0, MAX_STRING);
      continue;
    }
    // `featureFlags` is the one structured value permitted, and only as flat booleans.
    if (key === 'featureFlags' && typeof value === 'object' && !Array.isArray(value)) {
      const flags: Record<string, boolean> = {};
      for (const [flag, on] of Object.entries(value as Record<string, unknown>)) {
        if (typeof on === 'boolean') flags[flag] = on;
      }
      out[key] = flags;
    }
    // Everything else — arrays, objects, functions — is dropped without inspection.
  }
  return out;
}

/** Strings are capped so a long value cannot smuggle a transcript through an allowed key. */
export const MAX_STRING = 512;
