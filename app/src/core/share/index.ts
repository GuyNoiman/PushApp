/**
 * Card-share pillar entry point (Completion Celebration, I1). Mirrors the dormant
 * `core/location/index.ts` seam: it resolves the single {@link CardShareGateway} implementation so
 * every caller depends on the interface, not the platform.
 *
 * It resolves the REAL {@link ViewShotCardShareGateway} whenever this build carries
 * `react-native-view-shot`, and the inert {@link NullCardShareGateway} otherwise — web, Expo Go, jest,
 * and any build made before the dependency was added. That check is the gateway's own
 * `isImageExportAvailable()`, so there is exactly one place that decides whether capture is possible
 * and no caller changes either way: with capture, sharing sends the card as an image; without it,
 * sharing degrades to text and still works.
 */
import { NullCardShareGateway } from './NullCardShareGateway';
import { ViewShotCardShareGateway } from './ViewShotCardShareGateway';
import type { CardShareGateway } from './CardShareGateway';

let instance: CardShareGateway | null = null;

export function getCardShareGateway(): CardShareGateway {
  if (!instance) {
    instance = ViewShotCardShareGateway.isImageExportAvailable()
      ? ViewShotCardShareGateway
      : NullCardShareGateway;
  }
  return instance;
}

export * from './CardShareGateway';
