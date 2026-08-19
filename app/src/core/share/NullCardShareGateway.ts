/**
 * NullCardShareGateway (Completion Celebration, I1) — the INERT card-share gateway used on web /
 * Expo Go, where no native image-capture module exists yet (`react-native-view-shot` is not
 * installed — PRD §0 deferred #2). It reports image export as UNAVAILABLE and degrades sharing to
 * plain text via the already-present `expo-sharing` (mirrors `state/useAccountActions.ts`).
 *
 * SAFETY (PRD §7): every method resolves a calm outcome and NEVER throws — a share failure must
 * never bubble up and break Journey completion. Image ops are no-ops that resolve `unavailable`;
 * text sharing writes a throwaway file, hands it to the OS share sheet, and deletes it right after.
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

/** The temp filename the text share is written under (deleted right after sharing returns). */
const SHARE_TEXT_FILENAME = 'pushapp-completion.txt';

export const NullCardShareGateway: CardShareGateway = {
  // No native capture module on web / Expo Go — image export is off until the native build lands.
  isImageExportAvailable(): boolean {
    return false;
  },

  // Nothing to capture here, so nothing to save either.
  isImageSaveAvailable(): boolean {
    return false;
  },

  // Image ops are inert here: there is nothing to render to, so report `unavailable` (never throw).
  async shareCardImage(_ref: CardCaptureRef, _opts?: ShareCardOptions): Promise<ShareOutcome> {
    return { status: 'unavailable' };
  },

  async saveCardImage(_ref: CardCaptureRef, _opts?: ShareCardOptions): Promise<SaveOutcome> {
    return { status: 'unavailable' };
  },

  // Degraded text share — the card's copy + optional caption through the OS share sheet. Mirrors the
  // export flow in useAccountActions: write a temp file, share it, delete it in `finally`. Any I/O or
  // share failure resolves to a calm outcome instead of throwing (PRD §7).
  async shareText(text: string, opts?: ShareCardOptions): Promise<ShareOutcome> {
    const file = new File(Paths.cache, SHARE_TEXT_FILENAME);
    try {
      if (!(await Sharing.isAvailableAsync())) return { status: 'unavailable' };
      // Overwrite any stale file left by an interrupted earlier attempt.
      if (file.exists) file.delete();
      file.create();
      file.write(text);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/plain',
        UTI: 'public.plain-text',
        dialogTitle: opts?.dialogTitle,
      });
      return { status: 'success' };
    } catch {
      // A share/I-O failure never breaks completion — report it calmly.
      return { status: 'failed' };
    } finally {
      // Never leave the throwaway text sitting in the cache.
      try {
        if (file.exists) file.delete();
      } catch {
        // A cleanup failure must not mask the original outcome.
      }
    }
  },
};
