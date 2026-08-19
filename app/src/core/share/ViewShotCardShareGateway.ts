/**
 * ViewShotCardShareGateway — the REAL card-share gateway (Completion Celebration, I1). It renders the
 * completion card that is on screen to a PNG and hands that image to the OS share sheet, so what the
 * partner receives is the card the user was looking at.
 *
 * WHY THIS EXISTS AT ALL: sharing used to fall back to plain text — "You did it / Build core
 * strength" — which threw away the entire design. The card is the artifact; a sentence about it is
 * not the same object.
 *
 * WHY NATIVE, and why nothing installed could do it: rasterising an arbitrary React Native view needs
 * a native module. `react-native-svg` is present and can export ITSELF, but the card is icon-font
 * glyphs, theme tokens and custom fonts — re-authoring it as SVG would duplicate the design and
 * gamble on fidelity, which is the opposite of "identical to what was shown". `react-native-view-shot`
 * captures the real view, so the image cannot drift from the card by construction.
 *
 * The module is loaded at CALL time inside a try, exactly like `core/auth/nativeIdentity`: it exists
 * only in a build made after it was installed, so on web, in Expo Go and under jest a top-level
 * import would take down a screen that never asked to share. Absent ⇒ this gateway reports image
 * export unavailable and the caller degrades to the text share, which still works.
 *
 * SAFETY RED-LINE (PRD §7): every method RESOLVES a calm outcome and never throws. Journey completion
 * must not depend on a capture, a share sheet, or a filesystem.
 *
 * SAVING is deliberately NOT implemented here (resolves `unavailable`): writing to the user's photo
 * library needs another native dependency and a photo-library permission, which is a store-compliance
 * and privacy decision rather than a technical one. The UI reads
 * {@link CardShareGateway.isImageSaveAvailable} and simply does not offer the action, so nothing dead
 * is shown.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type {
  CardCaptureRef,
  CardShareGateway,
  SaveOutcome,
  ShareCardOptions,
  ShareOutcome,
} from './CardShareGateway';
import { NullCardShareGateway } from './NullCardShareGateway';

/** The filename the captured card is shared under — what the recipient sees attached. */
const SHARE_IMAGE_FILENAME = 'pushapp-completion.png';

/** The subset of `react-native-view-shot` used here, typed locally so nothing is imported at load. */
type ViewShotModule = {
  captureRef: (view: unknown, options: Record<string, unknown>) => Promise<string>;
};

/** Load the native module at call time; `null` when this build does not carry it. */
function loadViewShot(): ViewShotModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-view-shot') as ViewShotModule;
  } catch {
    return null;
  }
}

export const ViewShotCardShareGateway: CardShareGateway = {
  isImageExportAvailable(): boolean {
    return loadViewShot() !== null;
  },

  // Not offered — see the note at the top of this file. Honest `unavailable`, never a silent no-op.
  isImageSaveAvailable(): boolean {
    return false;
  },

  async shareCardImage(ref: CardCaptureRef, opts?: ShareCardOptions): Promise<ShareOutcome> {
    const viewShot = loadViewShot();
    if (!viewShot || !ref.current) return { status: 'unavailable' };

    const file = new File(Paths.cache, SHARE_IMAGE_FILENAME);
    try {
      if (!(await Sharing.isAvailableAsync())) return { status: 'unavailable' };

      // PNG at full quality: the card is flat colour, type and glyphs, which is exactly what JPEG
      // artefacts show up on. `tmpfile` keeps the bitmap out of memory and off the JS bridge.
      const uri = await viewShot.captureRef(ref.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Move it under a NAMED file, because the recipient sees the filename. view-shot's own temp
      // name is a random string, which would arrive as a meaningless attachment.
      if (file.exists) file.delete();
      new File(uri).move(file);

      await Sharing.shareAsync(file.uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: opts?.dialogTitle,
      });
      return { status: 'success' };
    } catch {
      // A capture, filesystem or share failure never breaks a completed Journey (PRD §7).
      return { status: 'failed' };
    } finally {
      // The card is a snapshot of the user's own record — never leave it sitting in the cache.
      try {
        if (file.exists) file.delete();
      } catch {
        // A cleanup failure must not mask the original outcome.
      }
    }
  },

  async saveCardImage(_ref: CardCaptureRef, _opts?: ShareCardOptions): Promise<SaveOutcome> {
    return { status: 'unavailable' };
  },

  // Text sharing has no native part, so it is the Null gateway's implementation verbatim rather than
  // a second copy — the two must never drift on what a degraded share looks like.
  shareText: NullCardShareGateway.shareText,
};
