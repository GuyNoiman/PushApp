/**
 * Minimal ambient types for `upng-js` (a pure-JS PNG codec; ships no .d.ts).
 * We only use `decode` + `toRGBA8` to turn PNG bytes into a raw RGBA8 buffer that becomes a
 * THREE.DataTexture on device (the RN/expo-gl Image-based upload path renders blank — see
 * BuddyView.tsx). Kept local to the buddy3d module, the only place three/expo-gl is imported.
 */
declare module 'upng-js' {
  export interface UPNGImage {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    data: Uint8Array;
    frames: unknown[];
    tabs: Record<string, unknown>;
  }
  export function decode(buffer: ArrayBuffer | Uint8Array): UPNGImage;
  /** One ArrayBuffer of tightly-packed RGBA8 per frame (index 0 = the single still frame). */
  export function toRGBA8(img: UPNGImage): ArrayBuffer[];

  const UPNG: { decode: typeof decode; toRGBA8: typeof toRGBA8 };
  export default UPNG;
}
