/**
 * RESERVED SEAM — boundary only; calendar-triggered reminders are deferred (POC
 * scope) and must go through security-privacy + store review before implementation.
 *
 * Calendar pillar entry point. Mirrors `core/profile/index.ts`: it would return a
 * real gateway when `featureFlags.calendar` is on, else the inert
 * NullCalendarGateway. No real implementation exists yet (deferred) and
 * `expo-calendar` is intentionally NOT installed, so the factory returns the Null
 * gateway today — the flag is wired so a future gateway drops in with no caller
 * changes.
 */
import { featureFlags } from '../config/featureFlags';
import { MockCalendarGateway } from './MockCalendarGateway';
import { NullCalendarGateway, type CalendarGateway } from './CalendarGateway';

let instance: CalendarGateway | null = null;

export function getCalendarGateway(): CalendarGateway {
  if (!instance) {
    // Deferred: no real gateway exists yet. When the calendar domain is built
    // (after a security-privacy + store review), construct it here behind
    // `featureFlags.calendar`; until then the flag is off and we stay inert.
    void featureFlags.calendar;
    // DEV-ONLY (Miss-Recovery): when `devMockRecovery` is on, return the in-memory
    // mock so the recovery loop is exercisable in Expo Go. It stays enabled=false
    // (the trigger kind is still dormant); it only adds the gating-only isBusy()
    // read. OFF in production ⇒ the inert Null gateway, unchanged behaviour.
    instance = featureFlags.devMockRecovery ? MockCalendarGateway : NullCalendarGateway;
  }
  return instance;
}

export * from './CalendarGateway';
