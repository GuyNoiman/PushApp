/**
 * CardShareGateway (Completion Celebration, I1) — the platform BOUNDARY for sharing/saving a
 * rendered completion card. Engines and UI depend on THIS interface only; a single vendor file
 * implements it (the Null gateway today; a native `react-native-view-shot` gateway once the Apple
 * dev build exists — see `./index.ts`). Mirrors the AuthGateway / LocationGateway seam pattern.
 *
 * FRAMEWORK-FREE at its core (Engineering Bible §19): this file imports no React and no native
 * module — only type shapes. The capture handle is kept opaque so `core/` never depends on
 * react-native types; the presentational card forwards its `ref` and the native gateway reads
 * `.current` at capture time.
 *
 * SAFETY RED-LINE (PRD §7): Journey completion NEVER depends on sharing, rendering, or saving.
 * Every method RESOLVES a calm {@link ShareOutcome}/{@link SaveOutcome} — it must never throw up to
 * the caller and break the completion. A cancelled or failed share leaves the completed Journey
 * untouched.
 */

/**
 * An opaque handle to the on-screen completion-card view for a future native capture. Kept
 * framework-agnostic (a read-only `current`, like a React ref) so `core/` stays free of React/RN
 * types; the card component passes its `ref` here and the native gateway reads `.current`.
 */
export type CardCaptureRef = { readonly current: unknown };

/** How a share ended — always calm, never an exception (PRD §7). */
export type ShareStatus = 'success' | 'cancelled' | 'unavailable' | 'failed';

/** How a save-to-device ended — always calm, never an exception (PRD §7). */
export type SaveStatus = 'success' | 'cancelled' | 'unavailable' | 'failed';

/** The resolved result of a share attempt. */
export interface ShareOutcome {
  status: ShareStatus;
}

/** The resolved result of a save-to-device attempt. */
export interface SaveOutcome {
  status: SaveStatus;
}

/** Options carried through a card share/save. */
export interface ShareCardOptions {
  /**
   * The user's transient personal caption. Passed to the destination when supported but NEVER
   * persisted on the card or in PushApp history (PRD §3). Optional.
   */
  caption?: string;
  /** Localized title for the OS share dialog (shown on Android). Optional. */
  dialogTitle?: string;
}

/**
 * The platform gateway for the completion card's share/save actions. A single implementation is
 * resolved via {@link getCardShareGateway}; callers branch on {@link isImageExportAvailable} to
 * decide whether to offer image export or degrade to text-only sharing.
 */
export interface CardShareGateway {
  /**
   * Whether rendering the card to an image is available on this build/platform. False on web /
   * Expo Go (no native capture module) — the UI then degrades to text share (PRD §0 deferred #2).
   */
  isImageExportAvailable(): boolean;

  /**
   * Whether the card can be SAVED to the device. Separate from {@link isImageExportAvailable} on
   * purpose: capturing the card and writing it into the user's photo library are different
   * capabilities, and the second one needs a photo-library permission. Collapsing them into one flag
   * is what puts a Save button on screen that can only ever answer "unavailable" — the UI asks this
   * before offering the action, so nothing dead is shown.
   */
  isImageSaveAvailable(): boolean;

  /**
   * Render the card behind `ref` to an image and hand it to the OS share sheet. Resolves
   * `{ status: 'unavailable' }` when image export is off; never throws (PRD §7).
   */
  shareCardImage(ref: CardCaptureRef, opts?: ShareCardOptions): Promise<ShareOutcome>;

  /**
   * Render the card behind `ref` to an image and SAVE it to the device (where permitted). Resolves
   * `{ status: 'unavailable' }` when image export is off; never throws (PRD §7).
   */
  saveCardImage(ref: CardCaptureRef, opts?: ShareCardOptions): Promise<SaveOutcome>;

  /**
   * Share plain TEXT (the card's copy plus the optional caption) through the OS share sheet — the
   * degraded fallback when image export is unavailable. Resolves `{ status: 'unavailable' }` when
   * no share sheet exists; never throws (PRD §7).
   */
  shareText(text: string, opts?: ShareCardOptions): Promise<ShareOutcome>;
}
