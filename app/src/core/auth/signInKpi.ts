/**
 * Sign-in → KPI events. The whole mapping, in one place, decided on the device.
 *
 * ── WHAT MAY LEAVE (G1) ─────────────────────────────────────────────────────
 *
 * An event name and a bucket from a closed set. The error's MESSAGE never does: it can carry a
 * provider's own wording, a token claim, an address. So the reason is read from the error's TYPE,
 * which is something this codebase wrote, and a type this file does not know becomes `error` rather
 * than anything more specific that would need its message to be read.
 *
 * ── WHY A CANCEL IS ITS OWN EVENT ──────────────────────────────────────────
 *
 * A person closing Apple's sheet made a choice. A token our server refused is a bug. A single
 * "failed" count that holds both is a number that goes up when people change their minds and hides
 * the day sign-in breaks for everyone.
 */
import type { KpiInput } from '../kpi/KpiGateway';
import {
  signInFailureBucket,
  type SignInFailureReason,
  type SignInProvider,
} from '../kpi/taxonomy';
import { AuthNotAvailableError, AuthTokenRejectedError } from './AuthGateway';
import { SignInCancelledError } from './nativeIdentity';

/** Which closed reason a thrown value maps to, or `cancelled` when it was the person's own choice. */
export function signInFailureReason(error: unknown): SignInFailureReason | 'cancelled' {
  if (error instanceof SignInCancelledError) return 'cancelled';
  if (error instanceof AuthNotAvailableError) return 'unavailable';
  if (error instanceof AuthTokenRejectedError) return 'rejected';
  return 'error';
}

export const signInAttempted = (provider: SignInProvider): KpiInput => ({
  name: 'sign_in_attempted',
  bucket: provider,
});

export const signInSucceeded = (provider: SignInProvider): KpiInput => ({
  name: 'sign_in_succeeded',
  bucket: provider,
});

/** The one event a thrown sign-in produces: a cancel, or a failure with its reason. */
export function signInThrew(provider: SignInProvider, error: unknown): KpiInput {
  const reason = signInFailureReason(error);
  return reason === 'cancelled'
    ? { name: 'sign_in_cancelled', bucket: provider }
    : { name: 'sign_in_failed', bucket: signInFailureBucket(provider, reason) };
}
