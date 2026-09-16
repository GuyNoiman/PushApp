/**
 * Sign-in → KPI events.
 *
 * Two properties, and each has a way to be broken by a reasonable-looking change: a cancel must never
 * be counted as a failure, and the error's MESSAGE must never leave — it is the one part of a sign-in
 * failure that can carry a provider's wording, a token claim or an address.
 */
import { buildKpiEvent } from '../../kpi/KpiGateway';
import { AuthIdentityMismatchError, AuthNotAvailableError, AuthTokenRejectedError } from '../AuthGateway';
import { SignInCancelledError } from '../nativeIdentity';
import { signInAttempted, signInFailureReason, signInSucceeded, signInThrew } from '../signInKpi';

const ctx = { installId: 'install-1' };
const SECRET = 'apple: Passed nonce and nonce in id_token should either both exist or not. guy@example.com';

describe('the reason a sign-in failed', () => {
  it('is decided by the error type', () => {
    expect(signInFailureReason(new SignInCancelledError())).toBe('cancelled');
    expect(signInFailureReason(new AuthNotAvailableError(SECRET))).toBe('unavailable');
    expect(signInFailureReason(new AuthTokenRejectedError(SECRET))).toBe('rejected');
    expect(signInFailureReason(new AuthIdentityMismatchError(SECRET))).toBe('error');
    expect(signInFailureReason(new Error(SECRET))).toBe('error');
    expect(signInFailureReason('a thrown string')).toBe('error');
    expect(signInFailureReason(undefined)).toBe('error');
  });

  it('is never read from a message, even one that says "cancel"', () => {
    expect(signInFailureReason(new Error('The user cancelled the request'))).toBe('error');
  });
});

describe('each outcome, as the event that is sent', () => {
  it.each([
    ['apple', new SignInCancelledError(), 'sign_in_cancelled', 'apple'],
    ['google', new SignInCancelledError(), 'sign_in_cancelled', 'google'],
    ['apple', new AuthNotAvailableError(SECRET), 'sign_in_failed', 'apple:unavailable'],
    ['google', new AuthTokenRejectedError(SECRET), 'sign_in_failed', 'google:rejected'],
    ['apple', new Error(SECRET), 'sign_in_failed', 'apple:error'],
  ] as const)('%s + %p → %s / %s', (provider, error, name, bucket) => {
    const event = buildKpiEvent(signInThrew(provider, error), ctx);
    expect(event).not.toBeNull();
    expect(event!.name).toBe(name);
    expect(event!.bucket).toBe(bucket);
    const wire = JSON.stringify(event);
    expect(wire).not.toContain('nonce');
    expect(wire).not.toContain('example.com');
  });

  it('counts an attempt and a success under the provider', () => {
    expect(buildKpiEvent(signInAttempted('google'), ctx)).toMatchObject({ name: 'sign_in_attempted', bucket: 'google' });
    expect(buildKpiEvent(signInSucceeded('apple'), ctx)).toMatchObject({ name: 'sign_in_succeeded', bucket: 'apple' });
  });
});
