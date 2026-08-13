/**
 * Card-share pillar entry point (Completion Celebration, I1). Mirrors the dormant
 * `core/location/index.ts` seam: it resolves the single {@link CardShareGateway} implementation so
 * every caller depends on the interface, not the platform.
 *
 * TODAY: always returns the {@link NullCardShareGateway} — web / Expo Go have no native capture
 * module, so image export reports UNAVAILABLE and sharing degrades to text (PRD §0 deferred #2).
 *
 * TODO(native seam): once the Apple native dev build exists, install `react-native-view-shot` and
 * construct an `ExpoViewShotCardShareGateway` here (guarded like `getLocationGateway`'s feature
 * flag) so the real `captureRef` → share/save path lights up with NO caller changes. Do NOT install
 * the dep or wire it until that build is real (Apple account still pending; cost-guarded).
 */
import { NullCardShareGateway } from './NullCardShareGateway';
import type { CardShareGateway } from './CardShareGateway';

let instance: CardShareGateway | null = null;

export function getCardShareGateway(): CardShareGateway {
  if (!instance) {
    // Deferred: no native capture module yet. When the native build lands, construct the
    // view-shot gateway here; until then we stay inert (image export off, text share only).
    instance = NullCardShareGateway;
  }
  return instance;
}

export * from './CardShareGateway';
