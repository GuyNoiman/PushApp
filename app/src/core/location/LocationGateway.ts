/**
 * RESERVED SEAM — boundary only; location-triggered reminders are deferred (POC
 * scope) and must go through security-privacy + store review before any real
 * implementation. The `featureFlags.location` flag stays OFF until then.
 *
 * LocationGateway — the reserved boundary for a future location-triggered reminder
 * (arrive at / leave a place). It mirrors the existing gateway pattern (AuthGateway
 * / SocialGateway / ProfileGateway): engines and UI depend on THIS interface only,
 * and a single vendor file (an ExpoLocationGateway, NOT created yet — the dep is
 * not installed and the flag is off) would implement it later. Pure TS here — no
 * `expo-location` import, no React, no native modules.
 *
 * PRIVACY RED-LINE (R3, D21): a future implementation must wrap DEVICE location APIs
 * ONLY. Location data is ON-DEVICE ONLY — it must NEVER be sent to Supabase, put in
 * a ProgressSummary, or leave the device in any form, and this seam must never
 * import from `../social/`, `../profile/`, or `../interests/`. Saved data must be
 * minimal; the payloads here are placeholders while the feature is dormant. The
 * `currentPlace()` READ below is likewise on-device only: its return value is
 * transient, gating-only, and must NEVER be persisted, emitted, or synced (G3/G4).
 */

/**
 * A minimal placeholder description of a place a reminder could key off. Coarse
 * and on-device only — no address, no history, no PII. Grow it only through the
 * security-privacy review when the feature is actually built.
 */
export type LocationPlace = {
  /** Opaque local id for a saved place (never a server id). */
  id: string;
  /** Whether to fire on arriving at or leaving the place. */
  transition: 'enter' | 'exit';
};

export interface LocationGateway {
  /** Whether the pillar is configured/active (feature flag + granted opt-in). */
  readonly enabled: boolean;

  /**
   * Register interest in a place-based trigger, returning an OS notification id if
   * one was scheduled, or null. No-op (null) while the seam is dormant.
   */
  watchPlace(place: LocationPlace): Promise<string | null>;

  /** Stop watching a previously registered place. No-op while dormant. */
  clearPlace(place: LocationPlace): Promise<void>;

  /**
   * A COARSE, TRANSIENT read of where the user is now — used ONLY to gate whether a
   * home-only Step's reminder is worth firing/proposing (Miss-Recovery slice).
   * Optional so existing callers (and inline test doubles) stay valid; a missing
   * method OR a `'unknown'` return is the PERMISSIVE default (never drops a
   * candidate). The real gateway returns `'unknown'` (no geofencing yet); only the
   * dev mock returns `'home'|'away'`.
   *
   * PRIVACY (R3/G4): the return value is on-device only and gating-only — it must
   * NEVER be persisted, put in a DomainEvent/ProgressSummary, or synced.
   */
  currentPlace?(): 'home' | 'away' | 'unknown';
}

/**
 * No-op gateway used while the location pillar is deferred/disabled. Inert by
 * design: enabled=false, every method a no-op. Mirrors NullProfileGateway so
 * callers never branch on config once the seam is wired. It touches NO device
 * location API and imports nothing (red-line R3).
 */
export const NullLocationGateway: LocationGateway = {
  enabled: false,
  async watchPlace() {
    return null;
  },
  async clearPlace() {
    // No location layer yet — clearing a place is intentionally a no-op.
  },
  // Permissive: no geofencing yet, so we never claim to know where the user is.
  // Gating treats 'unknown' as "don't drop" — reminders behave exactly as before.
  currentPlace() {
    return 'unknown';
  },
};
