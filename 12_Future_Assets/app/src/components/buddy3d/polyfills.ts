/**
 * buddy3d runtime shims — MUST be imported before `three` so they run before three's
 * module code executes. This is the ONE place these shims live for the 3D buddy module.
 *
 * three r180's GLTFLoader detects the browser via `navigator.userAgent`. In React Native
 * `navigator` exists but `.userAgent` is undefined, so `userAgent.match(...)` throws
 * `TypeError: Cannot read property 'match' of undefined`. A benign UA string (no
 * "safari"/"firefox") makes three take its default, non-browser path.
 */
const nav = globalThis.navigator as (Navigator & { userAgent?: string }) | undefined;
if (nav && !nav.userAgent) {
  try {
    (nav as { userAgent: string }).userAgent = 'ReactNative';
  } catch {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'ReactNative' },
      configurable: true,
    });
  }
} else if (!nav) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'ReactNative' },
    configurable: true,
  });
}

export {};
