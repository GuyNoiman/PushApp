/**
 * DEV-ONLY mock location gateway (Miss-Recovery slice). Returned by the factory ONLY
 * when `featureFlags.devMockRecovery` is on, so a developer/founder can flip
 * home/away in the dev panel and watch the reschedule gate respond — WITHOUT any
 * native geofencing, OS permission, or cost.
 *
 * It stays `enabled: false` exactly like the Null gateway, so the dormant location
 * TRIGGER kind remains a no-op (nothing new fires; red-line R3 holds). It only
 * implements the transient, gating-only `currentPlace()` read, which it answers from
 * the in-memory `mockEnv`. That value is NEVER persisted, emitted, or synced.
 */
import { getMockEnv } from '../recovery/mockEnv';
import { NullLocationGateway, type LocationGateway } from './LocationGateway';

export const MockLocationGateway: LocationGateway = {
  // Trigger kind stays dormant — the mock only feeds the gating read below.
  ...NullLocationGateway,
  currentPlace() {
    return getMockEnv().place;
  },
};
