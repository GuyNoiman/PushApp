/**
 * timingPolicy — every tunable number behind Smart Notification Timing
 * (Smart_Notification_Timing_PRD), as DATA. Config-before-code (Engineering Bible §3): the
 * outcome classifier and the proposal engine read these; they never hard-code a threshold, so the
 * founder can retune how the app learns without touching a line of logic.
 *
 * Most values are written verbatim in the PRD (§3/§4/§5/§7). The handful the PRD is SILENT on are
 * the approved defaults from the architect pass and are marked as such below, so a later reader can
 * tell "the product said this" from "we chose this".
 *
 * Pure TS — no React, no clock read, no vendor imports.
 */

/** One minute / one hour / one day in ms, so the durations below read as what they are. */
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * PRD §4: the response window. A foreground / Journey interaction inside this many minutes of the
 * send counts as a timely response. Measured from the actual delivery time where known, otherwise
 * from the scheduled time (local repeating triggers give no receipt, so in MVP it is always the
 * scheduled time).
 */
export const RESPONSE_WINDOW_MINUTES = 30;

/** {@link RESPONSE_WINDOW_MINUTES} in ms — the form the classifier compares timestamps in. */
export const RESPONSE_WINDOW_MS = RESPONSE_WINDOW_MINUTES * MINUTE_MS;

/**
 * PRD §4 "contaminated trials": another of OUR sends inside this many minutes of the trial makes
 * the response unattributable. Deliberately a SEPARATE constant from the response window even
 * though it holds the same value today — they answer different questions and may diverge.
 *
 * Silent-in-the-PRD default: contamination means our own overlapping sends only. Third-party
 * notifications and Focus/DND are invisible to us and are not modelled.
 */
export const CONTAMINATION_WINDOW_MINUTES = 30;

/** {@link CONTAMINATION_WINDOW_MINUTES} in ms. */
export const CONTAMINATION_WINDOW_MS = CONTAMINATION_WINDOW_MINUTES * MINUTE_MS;

/** PRD §5: evaluation uses "up to the last six eligible trials" per Journey/day model. */
export const MAX_TRIALS_PER_MODEL = 6;

/** PRD §5/§7: nothing older than four weeks is evidence, and nothing older is kept. */
export const TRIAL_RETENTION_WEEKS = 4;

/** {@link TRIAL_RETENTION_WEEKS} in ms — the hard-drop horizon for raw trials. */
export const TRIAL_RETENTION_MS = TRIAL_RETENTION_WEEKS * 7 * DAY_MS;

/**
 * PRD §5/AC3: "require at least two eligible samples" — sparse data can never move the time after
 * ONE sample. This is the first gate the proposal engine applies.
 */
export const MIN_ELIGIBLE_SAMPLES = 2;

/**
 * PRD §5: propose a new candidate only when MORE THAN this share of eligible trials are negative.
 * Strictly greater, so an exact 50/50 split yields NO proposal (PRD §9 names that case explicitly).
 */
export const NEGATIVE_SHARE_THRESHOLD = 0.5;

/** PRD §5: "a proposal moves at most 15 minutes per Weekly Review" — and always exactly this much. */
export const MOVE_MINUTES = 15;

/** PRD §5: total learned movement may reach three hours from the user's own anchor, never more. */
export const MAX_DRIFT_MINUTES = 3 * 60;

/**
 * Denominator of the display-only confidence reading (`eligibleCount / 6`, clamped to 1). PRD §7
 * names the field but not the maths; this is the approved default. Confidence is shown, never
 * gating — the sparse guard and the percentage rule are what decide.
 */
export const CONFIDENCE_DENOMINATOR = 6;

/** Schema version stamped on every {@link TimingModel}, so a shape change can migrate, not guess. */
export const TIMING_MODEL_VERSION = 1;

/**
 * PRD §3: default maximum ONE adaptive aggregate notification per local day. (Consumed by the
 * aggregate slice; defined here so the whole policy lives in one place.)
 */
export const MAX_ADAPTIVE_SENDS_PER_DAY = 1;

/** PRD §3: at most TWO, and only when the eligible Journeys occupy two completely separate windows. */
export const MAX_ADAPTIVE_SENDS_TWO_WINDOWS = 2;

/**
 * How far apart two candidate times must be to count as "completely separate windows" (PRD §3,
 * e.g. morning/evening) and so justify a second send. Silent-in-the-PRD default: four hours.
 */
export const SEPARATE_WINDOW_MINUTES = 4 * 60;
