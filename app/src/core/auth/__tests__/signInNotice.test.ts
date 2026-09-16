/**
 * What a failed sign-in may say to the person — and that saying it did not move a single KPI bucket.
 *
 * The screen-side mapping (`core/auth/signInNotice`) is built on the KPI reason rather than beside
 * it, so these two assertions run on the same inputs: the sentence each outcome gets, and the bucket
 * it was already counted under before the sentence existed.
 */
import { AuthNotAvailableError, AuthTokenRejectedError, AuthIdentityMismatchError } from '../AuthGateway';
import { SignInCancelledError, SignInMisconfiguredError } from '../nativeIdentity';
import { signInFailureReason } from '../signInKpi';
import { signInNotice } from '../signInNotice';

/** Exactly what the library rejects with on Android when Google's configuration does not match. */
function developerErrorShaped(): Error {
  return Object.assign(
    new Error('DEVELOPER_ERROR: Follow troubleshooting instructions at https://react-native-google-signin.github.io/docs/troubleshooting'),
    { code: '10' },
  );
}

describe('signInNotice', () => {
  it.each([
    ['a cancel', new SignInCancelledError(), null, 'cancelled'],
    ['an unavailable provider', new AuthNotAvailableError('x'), 'unavailable', 'unavailable'],
    ['a server refusal', new AuthTokenRejectedError('x'), 'failed', 'rejected'],
    ['Google DEVELOPER_ERROR, named by its code', new SignInMisconfiguredError('google'), 'failed', 'error'],
    ['a DEVELOPER_ERROR that reached here unnamed', developerErrorShaped(), 'failed', 'error'],
    ['an identity mismatch', new AuthIdentityMismatchError('x'), 'failed', 'error'],
    ['a plain Error', new Error('x'), 'failed', 'error'],
    ['something that is not an Error at all', 'boom', 'failed', 'error'],
  ])('%s', (_label, thrown, notice, reason) => {
    expect(signInNotice(thrown)).toBe(notice);
    // The KPI bucket is what it always was.
    expect(signInFailureReason(thrown)).toBe(reason);
  });

  it('never treats a configuration fault as the person closing the sheet', () => {
    expect(signInNotice(new SignInMisconfiguredError('google'))).not.toBeNull();
    expect(signInNotice(developerErrorShaped())).not.toBeNull();
  });
});
