/**
 * CrashGateway — the seam between the app and a crash reporter, and the one place the telemetry
 * contract is enforced on the way out.
 *
 * ── WHY THE DEFAULTS ARE THE DANGER ───────────────────────────────────────────────────────────
 *
 * Sentry's own quickstart, verbatim, is a list of things this product forbids:
 *
 *   sendDefaultPii: true        → names, emails, IP addresses (§11.4)
 *   mobileReplayIntegration()   → session replay (§11.4, by name)
 *   replaysOnErrorSampleRate    → the same
 *   enableLogs: true            → breadcrumbs from console output (§11.4, by name)
 *   tracesSampleRate: 1.0       → performance spans carrying full URLs (§11.4)
 *
 * So the interesting part of this file is not what it turns on. Every one of those is off, named,
 * with the clause it would violate — because a future upgrade that flips a default back is a privacy
 * regression, and a reader has to be able to see that the omission was a decision.
 *
 * ── AND WHY `beforeSend` IS THE REAL GUARANTEE ────────────────────────────────────────────────
 *
 * Configuration is a promise about what the SDK will collect. `beforeSend` is the last thing that
 * runs before bytes leave the device, and it rebuilds the event from an ALLOWLIST
 * ({@link ./telemetryContract}) rather than editing the one Sentry produced. Anything the SDK added
 * that we did not ask for — a new context, a new default, a field introduced in a minor version —
 * is gone by construction rather than by having been anticipated.
 *
 * With no DSN this is inert: no SDK is initialised, nothing is sent, and the app behaves exactly as
 * it does today. That is also what every test gets.
 */
import { safeScreen, scrubEvent } from './telemetryContract';

/** What the app can ask of a crash reporter. Deliberately tiny. */
export interface CrashGateway {
  /** Whether anything is actually being reported. False with no DSN. */
  readonly enabled: boolean;
  /** Note which SCREEN the person is on, as an identifier with no route parameters. */
  setScreen: (route: string | undefined) => void;
  /** Report a handled error. The message is never sent — only its class and stack. */
  captureHandled: (error: unknown, context?: { module?: string; function?: string }) => void;
}

/** The gateway with no reporter behind it: inert, and the truth in every build without a DSN. */
export const NullCrashGateway: CrashGateway = {
  enabled: false,
  setScreen: () => {},
  captureHandled: () => {},
};

let gateway: CrashGateway = NullCrashGateway;

/** Install the real gateway at startup. Tests leave the null one in place. */
export function setCrashGateway(next: CrashGateway): void {
  gateway = next;
}

/** The installed gateway. */
export function getCrashGateway(): CrashGateway {
  return gateway;
}

/**
 * The options every initialisation must use, exported so a test can assert them rather than trusting
 * that somebody read the comment above.
 */
export const REQUIRED_SENTRY_OPTIONS = {
  /** Names, emails and IP addresses. §11.4 forbids all three. */
  sendDefaultPii: false,
  /** Session replay, by name in §11.4. */
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  /** Performance spans carry complete URLs, which §11.4 forbids. */
  tracesSampleRate: 0,
  /** Breadcrumbs derived from console output, taps and route parameters — §11.4, by name. */
  enableAutoBreadcrumbTracking: false,
  enableCaptureFailedRequests: false,
  /** No automatic screenshot or view hierarchy on an error. */
  attachScreenshot: false,
  attachViewHierarchy: false,
  /** No stack-local variables: they hold whatever the person typed. */
  includeLocalVariables: false,
} as const;

/**
 * The `beforeSend` every initialisation must use: rebuild the event from the allowlist, and send
 * nothing at all if that leaves nothing worth sending.
 *
 * Exported and pure so the canary suite can run the real function rather than a copy of it.
 */
export function beforeSend(event: Record<string, unknown>): Record<string, unknown> | null {
  const flat: Record<string, unknown> = {
    errorClass: firstString(event, ['type', 'errorClass']),
    handled: event.handled,
    fatal: event.level === 'fatal' || event.fatal === true,
    stack: firstString(event, ['stack']),
    appVersion: firstString(event, ['release', 'appVersion']),
    runtimeVersion: firstString(event, ['dist', 'runtimeVersion']),
    environment: firstString(event, ['environment']),
    platform: firstString(event, ['platform']),
    eventId: firstString(event, ['event_id', 'eventId']),
    timestamp: typeof event.timestamp === 'number' ? event.timestamp : undefined,
    screen: safeScreen(firstString(event, ['screen', 'transaction'])),
    installationId: firstString(event, ['installationId']),
  };
  const scrubbed = scrubEvent(flat);
  // An event with nothing but a timestamp tells us nothing and still costs a person's data budget.
  return scrubbed.errorClass || scrubbed.stack ? scrubbed : null;
}

function firstString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}
