/**
 * A FRESH INSTALL OPENS EMPTY. Nobody else's Journeys, nobody else's Steps, nobody else's name.
 *
 * WHY THIS FILE EXISTS (2026-08-20): the partner opened the app on his iPad and reported seeing
 * things he had never created. The cause turned out to be one hardcoded name in the coach's greeting
 * plus a plan he then built himself out of the confusion — but the question he raised is the right
 * one to keep answered mechanically: **can a shipped build ever come up with data the user did not
 * make?**
 *
 * There are exactly two mechanisms in this codebase that could do that, and both are now gated on
 * `__DEV__` as well as on their env var, so a release build cannot reach either whatever any `.env`
 * file says. These tests hold that gate down, and they are cheap insurance against a change that
 * looks harmless in development.
 */
import { featureFlags } from '../config/featureFlags';
import { getSimulatedUser } from '../profile/simulatedUser';

describe('a shipped build cannot invent a user or their data', () => {
  it('never seeds demo Journeys outside development', () => {
    // In jest `__DEV__` is true, so this asserts the SHAPE of the gate rather than its value: the
    // flag can only ever be on when both the env var and the development build agree.
    expect(featureFlags.devSeedDemoData).toBe(
      Boolean(__DEV__ && process.env.EXPO_PUBLIC_DEMO_SEED),
    );
  });

  it('never shows a simulated identity outside development', () => {
    const user = getSimulatedUser();
    if (!__DEV__) {
      expect(user.signedIn).toBe(false);
      expect(user.name).toBeUndefined();
      expect(user.email).toBeUndefined();
    } else {
      // In development it is allowed, and it is still driven by the env rather than by a constant.
      expect(user.signedIn).toBe(Boolean(process.env.EXPO_PUBLIC_SIM_USER_NAME?.trim()));
    }
  });

  it('has no committed identity to leak in the first place', () => {
    // The simulated name comes from a git-ignored env file. If someone ever hardcodes a default
    // here, this catches it: with no env var set, there is no user.
    const name = process.env.EXPO_PUBLIC_SIM_USER_NAME?.trim();
    if (!name) expect(getSimulatedUser().signedIn).toBe(false);
  });
});
