/**
 * The real crash gateway — the only file in the app that imports the vendor.
 *
 * Everything that decides WHAT may be sent lives in `./telemetryContract` and `./CrashGateway`, and
 * is tested without this file. This one does three things: initialise the SDK with the options the
 * contract requires, hand it the `beforeSend` that rebuilds every event from the allowlist, and
 * translate two app-level calls into vendor ones.
 *
 * ── IT IS INERT WITHOUT A DSN, AND THAT IS THE NORMAL CASE ────────────────────────────────────
 *
 * The web preview, every jest run, and any build made before the DSN existed all resolve to
 * {@link NullCrashGateway}. Nothing is initialised, nothing is sent, and no screen behaves
 * differently — which is what lets the contract be tested and the app be developed without a vendor
 * in the loop.
 */
import * as Sentry from '@sentry/react-native';

import {
  beforeSend,
  NullCrashGateway,
  REQUIRED_SENTRY_OPTIONS,
  type CrashGateway,
} from './CrashGateway';
import { safeScreen } from './telemetryContract';

/** The DSN is public by design — compiled into every copy of the app, and send-only. */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Build the real gateway, or the inert one when there is no DSN.
 *
 * Called once, from the root layout, alongside the media gateway.
 */
export function resolveCrashGateway(): CrashGateway {
  if (!DSN) return NullCrashGateway;

  Sentry.init({
    dsn: DSN,
    ...REQUIRED_SENTRY_OPTIONS,
    // THE LAST THING THAT RUNS BEFORE BYTES LEAVE. It rebuilds the event from the allowlist rather
    // than editing what the SDK produced, so a field added by a future minor version is gone by
    // construction instead of by having been anticipated.
    beforeSend: (event) => beforeSend(event as unknown as Record<string, unknown>) as never,
    // Breadcrumbs are dropped wholesale. §11.4 forbids the ones derived from text, taps, form values,
    // route parameters and console output — which is all of them, once the automatic ones are off.
    beforeBreadcrumb: () => null,
  });

  return {
    enabled: true,
    setScreen: (route) => {
      const screen = safeScreen(route);
      if (screen) Sentry.setTag('screen', screen);
    },
    captureHandled: (error, context) => {
      // The error's MESSAGE is deliberately not passed: a thrown Error commonly interpolates whatever
      // failed, and what failed is frequently the user's own text.
      Sentry.captureException(error instanceof Error ? new Error(error.name) : new Error('Error'), {
        tags: {
          handled: 'true',
          ...(context?.module ? { module: context.module } : {}),
          ...(context?.function ? { function: context.function } : {}),
        },
      });
    },
  };
}
