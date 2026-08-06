/**
 * Mock device environment (Miss-Recovery slice) — DEV-ONLY, in-memory toggles that
 * let a developer/founder drive the recovery loop end-to-end in Expo Go at $0 while
 * the real Location/Calendar gateways stay deferred. It stands in for the two device
 * reads the reschedule gate consults: where the user is (home/away) and whether a
 * proposed slot is busy.
 *
 * PRIVACY (G4): this is a transient, gating-only signal. It is NEVER persisted, put
 * in a DomainEvent/ProgressSummary, or synced — it lives only in memory for the
 * current session and resets on reload. It is read ONLY through the mock gateways
 * (which the factories return only when `featureFlags.devMockRecovery` is on) and
 * written ONLY by the hidden dev panel. Pure TS — no imports.
 */

export type MockPlace = 'home' | 'away';

interface MockEnv {
  /** Where the mock says the user is right now. */
  place: MockPlace;
  /** Whether the mock calendar reports the user as busy. */
  busy: boolean;
}

// Sensible demo defaults: at home, not busy — so the loop works out of the box and
// the founder toggles to 'away' / busy to watch the gate drop candidates.
const env: MockEnv = { place: 'home', busy: false };

/** Set the mock "where am I now" place (dev panel). Not persisted. */
export function setMockLocation(place: MockPlace): void {
  env.place = place;
}

/** Set the mock "am I busy" calendar flag (dev panel). Not persisted. */
export function setMockBusy(busy: boolean): void {
  env.busy = busy;
}

/** The current mock env — read by the dev mock gateways only. */
export function getMockEnv(): Readonly<MockEnv> {
  return env;
}
