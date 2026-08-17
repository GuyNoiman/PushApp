/**
 * fixedClock — pin `Date` to one fixed instant for a suite, WITHOUT faking any timer.
 *
 * WHY: several AppCore suites read the real clock, and AppCore reads it again internally. Any
 * assertion whose meaning depends on the time of day (a 2-hour postpone that crosses midnight and
 * earns a day-crossing warning; a Smart Timing trial bucketed by day part) therefore passed all day
 * and failed for whoever ran the suite late at night. A test that depends on when it is run is not
 * a test.
 *
 * WHY NOT plain `jest.useFakeTimers()`: these suites are async and rely on real `setTimeout` /
 * microtask scheduling — faking those hangs them. `doNotFake` leaves every timer API real and fakes
 * ONLY `Date`, which is the single thing the flake came from.
 *
 * The instant is a Wednesday, 10:00 LOCAL time — deliberately mid-week and mid-morning, so nothing
 * lands on a weekend, a month boundary, or near midnight in any timezone the suite runs in. Local,
 * not UTC, because the day-part logic under test is local by definition.
 */

/** Wednesday 2026-03-11, 10:00 local. */
export const FIXED_NOW = new Date(2026, 2, 11, 10, 0, 0, 0).getTime();

/**
 * Pin `Date.now()` and `new Date()` to {@link FIXED_NOW} for the calling suite, and restore the
 * real clock afterwards. Call once at the top level of a `describe` (or of the file).
 */
export function useFixedClock(at: number = FIXED_NOW): void {
  beforeEach(() => {
    jest.useFakeTimers({
      // Everything except Date stays REAL — see the header.
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
        'performance',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'hrtime',
      ],
      now: at,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
}
