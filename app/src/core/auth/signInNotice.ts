/**
 * Sign-in → what the PERSON is told. The screen-side twin of `./signInKpi`, and built on it.
 *
 * ── WHY THE SCREEN NEVER SHOWS AN ERROR'S MESSAGE (first device test, 2026-09-16) ──────────────
 *
 * The account screen printed `DEVELOPER_ERROR: Follow troubleshooting instructions at https://…` in
 * red under "Continue with Google". That line was written for a developer by a library, and it
 * reached a person because the screen rendered whatever `error.message` held. A message can also
 * carry a provider's own wording, a token claim or an address (see `./signInKpi`). So the screen gets
 * a word from a closed set, and the words are sentences in the locale files.
 *
 * ── WHY IT READS THE KPI REASON RATHER THAN DECIDING AGAIN ─────────────────────────────────────
 *
 * One classification of a thrown value, not two. The KPI buckets stay exactly what they are, and the
 * person hears the same distinction the measurement counts:
 *
 *   cancelled   → nothing. Closing the sheet was a choice.
 *   unavailable → this way of signing in does not work on this phone.
 *   rejected    → the generic "we couldn't sign you in right now".
 *   error       → the same generic sentence. Google's `DEVELOPER_ERROR` lands here, by its code
 *                 (`SignInMisconfiguredError` in `./nativeIdentity`), never as a cancel.
 *
 * Pure TypeScript: no React, no i18n, no vendor import.
 */
import type { SignInProvider } from '../kpi/taxonomy';
import { signInFailureReason } from './signInKpi';

/** The only things a sign-in screen may say about a failure. Each is one key in `settings.signIn.failure`. */
export type SignInNotice = 'unavailable' | 'failed';

/** A failed sign-in as the screen holds it: which button to retry, and which sentence to show. */
export interface SignInFailure {
  provider: SignInProvider;
  notice: SignInNotice;
}

/** The sentence for a thrown sign-in, or `null` when the person should be shown nothing. */
export function signInNotice(error: unknown): SignInNotice | null {
  const reason = signInFailureReason(error);
  if (reason === 'cancelled') return null;
  return reason === 'unavailable' ? 'unavailable' : 'failed';
}
