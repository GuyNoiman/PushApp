/**
 * buddy3d-spike runtime shims — imported FIRST (before three) so they run before
 * three's module code executes. Part of the throwaway 3D spike; not committed.
 *
 * three r180's GLTFLoader detects the browser via `navigator.userAgent`. In React
 * Native `navigator` exists but `.userAgent` is undefined, so `userAgent.match(...)`
 * threw `TypeError: Cannot read property 'match' of undefined`. A benign UA string
 * (no "safari"/"firefox") makes three take its default, non-browser path.
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

// GLTFLoader uses TextDecoder to read the GLB JSON chunk. Current Hermes ships it;
// log so we can confirm on-device, and this is where a polyfill would go if missing.
console.log(
  '[buddy3d-spike] runtime: typeof TextDecoder =',
  typeof (globalThis as { TextDecoder?: unknown }).TextDecoder,
  '· navigator.userAgent =',
  (globalThis.navigator as { userAgent?: string } | undefined)?.userAgent,
);

export {};
