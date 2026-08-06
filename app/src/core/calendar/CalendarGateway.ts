/**
 * RESERVED SEAM — boundary only; calendar-triggered reminders are deferred (POC
 * scope) and must go through security-privacy + store review before any real
 * implementation. The `featureFlags.calendar` flag stays OFF until then.
 *
 * CalendarGateway — the reserved boundary for a future calendar-triggered reminder
 * ("before your event"). It mirrors the existing gateway pattern (AuthGateway /
 * SocialGateway / ProfileGateway): engines and UI depend on THIS interface only,
 * and a single vendor file (an ExpoCalendarGateway, NOT created yet — the dep is
 * not installed and the flag is off) would implement it later. Pure TS here — no
 * `expo-calendar` import, no React, no native modules.
 *
 * PRIVACY RED-LINE (R3, D21): a future implementation must wrap DEVICE calendar APIs
 * ONLY. Calendar data is ON-DEVICE ONLY — it must NEVER be sent to Supabase, put in
 * a ProgressSummary, or leave the device in any form, and this seam must never
 * import from `../social/`, `../profile/`, or `../interests/`. Saved data must be
 * minimal; the payloads here are placeholders while the feature is dormant. The
 * `isBusy()` READ below is likewise on-device only: its return value is transient,
 * gating-only, and must NEVER be persisted, emitted, or synced (G3/G4).
 */

/**
 * A minimal placeholder description of a calendar-relative trigger. Coarse and
 * on-device only — no event title, no attendees, no PII. Grow it only through the
 * security-privacy review when the feature is actually built.
 */
export type CalendarWatch = {
  /** Opaque local id for a saved watch (never a server id). */
  id: string;
  /** Minutes before a matching event to fire the reminder. */
  minutesBefore: number;
};

export interface CalendarGateway {
  /** Whether the pillar is configured/active (feature flag + granted opt-in). */
  readonly enabled: boolean;

  /**
   * Register interest in a calendar-relative trigger, returning an OS notification
   * id if one was scheduled, or null. No-op (null) while the seam is dormant.
   */
  watchEvents(watch: CalendarWatch): Promise<string | null>;

  /** Stop a previously registered watch. No-op while dormant. */
  clearWatch(watch: CalendarWatch): Promise<void>;

  /**
   * A COARSE, TRANSIENT free/busy read for a proposed time window — used ONLY to
   * gate whether a reschedule candidate is worth proposing (Miss-Recovery slice).
   * `window` bounds are epoch ms. Optional so existing callers (and inline test
   * doubles) stay valid; a missing method OR a `'unknown'` return is the PERMISSIVE
   * default (never drops a candidate). The real gateway returns `'unknown'` (no
   * calendar read yet); only the dev mock returns `true|false`.
   *
   * PRIVACY (R3/G4): the return value is on-device only and gating-only — it must
   * NEVER be persisted, put in a DomainEvent/ProgressSummary, or synced. It exposes
   * no event titles, times, or attendees — only a boolean busy/free verdict.
   */
  isBusy?(window: { start: number; end: number }): boolean | 'unknown';
}

/**
 * No-op gateway used while the calendar pillar is deferred/disabled. Inert by
 * design: enabled=false, every method a no-op. Mirrors NullProfileGateway so
 * callers never branch on config once the seam is wired. It touches NO device
 * calendar API and imports nothing (red-line R3).
 */
export const NullCalendarGateway: CalendarGateway = {
  enabled: false,
  async watchEvents() {
    return null;
  },
  async clearWatch() {
    // No calendar layer yet — clearing a watch is intentionally a no-op.
  },
  // Permissive: no calendar read yet, so we never claim a slot is busy. Gating
  // treats 'unknown' as "don't drop" — reschedule behaves exactly as before.
  isBusy() {
    return 'unknown';
  },
};
