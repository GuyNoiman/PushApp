/**
 * Communication scheduler limits — the caps that keep the on-device notification
 * set bounded, as DATA (Engineering Bible §3 configuration-before-code). Tuning
 * happens here, never inside the scheduler logic. Pure TS — no UI imports.
 *
 * The OS caps how many local notifications an app may have pending (iOS ~64), so
 * the planner coalesces duplicates and then trims to the highest-priority
 * `MAX_PENDING` — leaving headroom under the platform ceiling.
 */

/** Max number of pending scheduler-owned notifications; the planner trims to this. */
export const MAX_PENDING = 60;
