/**
 * Account Inactivity Freeze policy (J5, LOCAL-FIRST POC) — the SINGLE source of the
 * inactivity threshold. When an authenticated user has not been active for at least
 * {@link INACTIVITY_POLICY.thresholdDays} days, the local {@link InactivityEngine}
 * freezes their active Journeys (reusing the J3 `status='frozen'` path, distinguished
 * only by a `freezeReason='account_inactivity'` provenance) so a returning user is not
 * greeted by a wall of "missed" days. The threshold lives ONLY here — config before
 * code (never inlined in an engine).
 *
 * The server-authoritative version (freezing while the app is closed) is DEFERRED; this
 * POC only detects the elapsed gap on the next local lifecycle beat (start / syncTime).
 *
 * Pure TS — no React, no vendor imports, no clock reads.
 */
export const INACTIVITY_POLICY = {
  /** Whole days of no authenticated activity after which the account's Journeys freeze. */
  thresholdDays: 21,
  /** The same threshold in epoch ms, the unit the engine actually compares gaps against. */
  thresholdMs: 21 * 24 * 60 * 60 * 1000,
} as const;
