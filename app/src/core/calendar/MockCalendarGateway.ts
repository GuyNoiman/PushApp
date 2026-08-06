/**
 * DEV-ONLY mock calendar gateway (Miss-Recovery slice). Returned by the factory ONLY
 * when `featureFlags.devMockRecovery` is on, so a developer/founder can flip
 * busy/free in the dev panel and watch the reschedule gate drop or keep a proposed
 * slot — WITHOUT any native calendar read, OS permission, or cost.
 *
 * It stays `enabled: false` exactly like the Null gateway, so the dormant calendar
 * TRIGGER kind remains a no-op (nothing new fires; red-line R3 holds). It only
 * implements the transient, gating-only `isBusy()` read, answered from the in-memory
 * `mockEnv` — a coarse boolean, never event titles/times. That value is NEVER
 * persisted, emitted, or synced.
 */
import { getMockEnv } from '../recovery/mockEnv';
import { NullCalendarGateway, type CalendarGateway } from './CalendarGateway';

export const MockCalendarGateway: CalendarGateway = {
  // Trigger kind stays dormant — the mock only feeds the gating read below.
  ...NullCalendarGateway,
  isBusy() {
    return getMockEnv().busy;
  },
};
