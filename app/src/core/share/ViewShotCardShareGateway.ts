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
 * SAVING writes the card into the user's photo library (founder decision, 2026-08-19: "if the user
 * wants to save to the gallery we will ask for gallery permission"). Two things about that permission
 * are deliberate. It is requested at the moment Save is TAPPED, never at startup — a permission asked
 * before the person has expressed the intent is a permission they cannot evaluate. And it is
 * ADD-ONLY: we never request read access, because the app has no reason to look at anyone's photos,
 * and asking for a capability we do not use is the over-ask a store review is right to flag.
 *
 * A refusal is not an error. Declining is an answer, so it resolves `cancelled` and nothing is shown.
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

/** The subset of `expo-media-library` used here — an ADD-ONLY permission and a single save call. */
type MediaLibraryModule = {
  requestPermissionsAsync: (writeOnly?: boolean) => Promise<{ granted: boolean }>;
  saveToLibraryAsync: (uri: string) => Promise<void>;
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

/** Same call-time load for the photo library — absent in Expo Go, on web and under jest. */
function loadMediaLibrary(): MediaLibraryModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-media-library') as MediaLibraryModule;
  } catch {
    return null;
  }
}

/**
 * Capture the card behind `ref` to a PNG at a NAMED path. Shared by share and save because the
 * recipient of a share and the photo in a library should be the same artifact, produced once.
 * PNG at full quality: the card is flat colour, type and glyphs — exactly what JPEG artefacts land on.
 */
async function captureCard(viewShot: ViewShotModule, ref: CardCaptureRef, file: File): Promise<void> {
  const uri = await viewShot.captureRef(ref.current, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });
  // Move it under a NAMED file: view-shot's own temp name is a random string, which would arrive as
  // a meaningless attachment and land in the photo library with no identity.
  if (file.exists) file.delete();
  new File(uri).move(file);
}

export const ViewShotCardShareGateway: CardShareGateway = {
  isImageExportAvailable(): boolean {
    return loadViewShot() !== null;
  },

  // Saving needs BOTH the capture and the photo library. Either one missing ⇒ do not offer the action.
  isImageSaveAvailable(): boolean {
    return loadViewShot() !== null && loadMediaLibrary() !== null;
  },

  async shareCardImage(ref: CardCaptureRef, opts?: ShareCardOptions): Promise<ShareOutcome> {
    const viewShot = loadViewShot();
    if (!viewShot || !ref.current) return { status: 'unavailable' };

    const file = new File(Paths.cache, SHARE_IMAGE_FILENAME);
    try {
      if (!(await Sharing.isAvailableAsync())) return { status: 'unavailable' };

      await captureCard(viewShot, ref, file);

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

  async saveCardImage(ref: CardCaptureRef, _opts?: ShareCardOptions): Promise<SaveOutcome> {
    const viewShot = loadViewShot();
    const media = loadMediaLibrary();
    if (!viewShot || !media || !ref.current) return { status: 'unavailable' };

    const file = new File(Paths.cache, SHARE_IMAGE_FILENAME);
    try {
      // Asked HERE, on the tap, and write-only. A person who just chose "save my card" can judge this
      // prompt; the same prompt at startup is one they have no way to evaluate.
      const { granted } = await media.requestPermissionsAsync(true);
      // Declining is an answer, not a failure — the caller shows nothing for it.
      if (!granted) return { status: 'cancelled' };

      await captureCard(viewShot, ref, file);
      await media.saveToLibraryAsync(file.uri);
      return { status: 'success' };
    } catch {
      return { status: 'failed' };
    } finally {
      // The library now holds the copy the user asked for; the working file has no reason to linger.
      try {
        if (file.exists) file.delete();
      } catch {
        // A cleanup failure must not mask the original outcome.
      }
    }
  },

  // Text sharing has no native part, so it is the Null gateway's implementation verbatim rather than
  // a second copy — the two must never drift on what a degraded share looks like.
  shareText: NullCardShareGateway.shareText,
};
