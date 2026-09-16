/**
 * The KPI definitions the console renders — the same taxonomy the app emits
 * against, repeated here because the two sides deploy separately.
 *
 * PRD §7.2 requires every KPI to show its exact definition, numerator,
 * denominator, exclusions, window, version and class. That is a lot of words to
 * keep in a dashboard, so they are kept as data and the view renders them. A
 * number whose definition lives only in the head of whoever wrote the query is
 * not a KPI.
 *
 * WHY THIS FILE IS A COPY. `app/src/core/kpi/taxonomy.ts` is the authority for
 * what the app SENDS. This is what the console SHOWS. They are separate
 * deployments — the console is a static site, the app is a build on a phone —
 * so a shared import is not possible without a bundler, and pretending otherwise
 * would mean the console silently describing a taxonomy the installed app is not
 * emitting. The version number is the seam: every event carries the taxonomy
 * version it was emitted under, and `kpi_versions_seen()` reports which versions
 * are actually in the data.
 */

export const TAXONOMY_VERSION = 0;

export const KPIS = Object.freeze([
  {
    id: 'activation',
    title: 'Successful activation',
    definition: 'Installations that finished onboarding and created a first Journey.',
    klass: 'primary',
    numerator: { event: 'first_journey_created', distinct: true },
    denominator: { event: 'app_first_open', distinct: true },
    exclusions: 'Counts installations, not accounts. A reinstall is a new installation and is counted again.',
  },
  {
    id: 'onboarding_completion',
    title: 'Onboarding completion',
    definition: 'Installations that reached the end of onboarding.',
    klass: 'supporting',
    numerator: { event: 'onboarding_completed', distinct: true },
    denominator: { event: 'app_first_open', distinct: true },
    exclusions: 'Same installation basis as activation.',
  },
  {
    id: 'journeys_truly_start',
    title: 'Journeys that truly start',
    definition: 'Created Journeys that received at least one genuine Step report.',
    klass: 'primary',
    numerator: { event: 'journey_first_report' },
    denominator: { event: 'journey_created' },
    exclusions:
      'A postponement is not a genuine report for this measure. Journeys created and completed inside ' +
      'the same window are in both counts.',
  },
  {
    id: 'journey_completion',
    title: 'Journey completion',
    definition: 'Completed Journeys as a share of Journeys that reached an end outcome.',
    klass: 'primary',
    numerator: { event: 'journey_completed' },
    denominator: { events: ['journey_completed', 'journey_abandoned'] },
    exclusions:
      'Future and frozen Journeys are excluded until they reach an outcome. Shown beside cancellation, ' +
      'so an unsuitable Journey is not hidden by a healthy-looking completion rate.',
  },
  {
    id: 'journey_cancellation',
    title: 'Journey cancellation',
    definition: 'Journeys deliberately let go, as a share of those that reached an end outcome.',
    klass: 'guardrail',
    numerator: { event: 'journey_abandoned' },
    denominator: { events: ['journey_completed', 'journey_abandoned'] },
    exclusions: 'The other half of completion. Deliberately shown beside it rather than behind a toggle.',
  },
  {
    id: 'step_follow_through',
    title: 'Step follow-through',
    definition: 'Reported Steps marked done.',
    klass: 'diagnostic',
    numerator: { event: 'step_reported', bucket: 'done' },
    denominator: { event: 'step_reported' },
    exclusions: 'Only Steps that were REPORTED. A Step nobody answered about is in neither count.',
  },
]);

/** §7.3's remaining headline KPIs, and what blocks each. Rendered, not omitted. */
export const NOT_YET_COMPUTABLE = Object.freeze([
  { title: 'Journeys moving forward', blockedBy: 'Needs a periodic snapshot of which Journeys were ELIGIBLE in the period, not a count of events.' },
  { title: 'Intervention efficiency', blockedBy: 'Interruptions are not counted anywhere, and "helped" has no recorded definition yet.' },
  { title: 'Support effectiveness', blockedBy: 'Needs a support event followed by a return-to-action window. Support events exist in the app and none reaches this stream.' },
  { title: 'Retention', blockedBy: 'Deliberate. Retention is diagnostic context (§7.3); computing it before the primary measures work would invite optimising it.' },
]);

/**
 * Fold the rows of `kpi_counts` into a lookup.
 *
 * The server returns one row per name AND bucket, so a name's total is the sum
 * across its buckets. Distinct installations cannot be summed that way — the
 * same installation may appear in two buckets — so a name's `installs` is taken
 * from its bucketless row when there is one, and otherwise reported as unknown
 * rather than guessed at by addition.
 */
export function indexCounts(rows) {
  const byName = new Map();
  for (const row of rows ?? []) {
    const entry = byName.get(row.name) ?? { events: 0, installs: null, buckets: new Map() };
    entry.events += Number(row.events) || 0;
    if (row.bucket === null || row.bucket === undefined) entry.installs = Number(row.installs) || 0;
    else entry.buckets.set(row.bucket, Number(row.events) || 0);
    byName.set(row.name, entry);
  }
  return byName;
}

const sideValue = (index, side) => {
  if (side.events) {
    return side.events.reduce((sum, name) => sum + (index.get(name)?.events ?? 0), 0);
  }
  const entry = index.get(side.event);
  if (!entry) return 0;
  if (side.bucket) return entry.buckets.get(side.bucket) ?? 0;
  if (side.distinct) return entry.installs ?? 0;
  return entry.events;
};

/**
 * One KPI's value.
 *
 * A zero denominator returns null rather than 0% — "no Journey has reached an
 * outcome yet" and "no Journey has been completed" are different facts, and only
 * one of them is about the product.
 */
export function computeKpi(kpi, index) {
  const numerator = sideValue(index, kpi.numerator);
  const denominator = sideValue(index, kpi.denominator);
  const percent = denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;
  return { ...kpi, numerator, denominator, percent };
}

// ── The first run (founder, 2026-09-16) ────────────────────────────────────

/**
 * The first run, in the order a person meets it: the steps of `ONBOARDING_STEP_ORDER`, with the
 * conversation's two moments between the step that opens it and the step that follows it. A stage is
 * either a step (`onboarding_step_reached` under that bucket) or an event of its own.
 */
export const FUNNEL_STAGES = Object.freeze([
  { id: 'language', label: 'Language', event: 'onboarding_step_reached', bucket: 'language' },
  { id: 'welcome', label: 'Welcome', event: 'onboarding_step_reached', bucket: 'welcome' },
  { id: 'purpose', label: 'Purpose', event: 'onboarding_step_reached', bucket: 'purpose' },
  { id: 'prepare', label: 'Prepare', event: 'onboarding_step_reached', bucket: 'prepare' },
  { id: 'account', label: 'Account (sign-in wall)', event: 'onboarding_step_reached', bucket: 'account' },
  { id: 'conversation', label: 'Conversation opened', event: 'onboarding_step_reached', bucket: 'conversation' },
  { id: 'introduction_started', label: 'Introduction started (first answer)', event: 'introduction_started' },
  { id: 'introduction_completed', label: 'Introduction completed (understanding confirmed)', event: 'introduction_completed' },
  { id: 'handoff', label: 'Handoff', event: 'onboarding_step_reached', bucket: 'handoff' },
  { id: 'firstJourney', label: 'First Journey', event: 'onboarding_step_reached', bucket: 'firstJourney' },
]);

/** The row of `kpi_counts` for one name and bucket (null bucket = the bucketless row). */
const rowFor = (rows, name, bucket = null) =>
  (rows ?? []).find((row) => row.name === name && (row.bucket ?? null) === bucket);

/**
 * The funnel: how many installations reached each stage, and how many were lost since the stage
 * before it.
 *
 * INSTALLATIONS, not events. `kpi_counts` returns a distinct-installation count per name AND bucket,
 * which is exact for one step — the sum-across-buckets problem `indexCounts` guards against does not
 * arise, because nothing here is added across buckets.
 *
 * The drop can be NEGATIVE, and that is shown rather than clamped. "I already have an account" goes
 * from the welcome straight to the account step, so more installations can reach `account` than
 * reached `prepare`; and a device that was already mid-flow when this build arrived starts counting
 * wherever it was. A funnel that hid that would be claiming a tidiness the data does not have.
 *
 * `dropPercent` is null where the previous stage has nobody in it — "nobody got there" is not 0%.
 */
export function computeFunnel(rows, stages = FUNNEL_STAGES) {
  let previous = null;
  return stages.map((stage, index) => {
    const installs = Number(rowFor(rows, stage.event, stage.bucket ?? null)?.installs) || 0;
    const drop = index === 0 ? null : previous - installs;
    const dropPercent = index === 0 || previous <= 0 ? null : Math.round((drop / previous) * 1000) / 10;
    previous = installs;
    return { ...stage, installs, drop, dropPercent };
  });
}

export const SIGN_IN_PROVIDERS = Object.freeze(['apple', 'google']);
export const SIGN_IN_FAILURE_REASONS = Object.freeze(['unavailable', 'rejected', 'error']);

/**
 * Sign-in, per provider: attempts, successes, cancels and failures by reason. EVENTS, not
 * installations — somebody who tries three times and gets in on the third is three attempts, and
 * that is the thing worth seeing.
 *
 * `unaccounted` is attempts that ended in none of the outcomes in the window: the app closed while
 * the sheet was up, or an attempt that straddles the window's edge. Shown, not hidden.
 */
export function computeSignIn(rows) {
  const events = (name, bucket) => Number(rowFor(rows, name, bucket)?.events) || 0;
  return SIGN_IN_PROVIDERS.map((provider) => {
    const failures = Object.fromEntries(
      SIGN_IN_FAILURE_REASONS.map((reason) => [reason, events('sign_in_failed', `${provider}:${reason}`)]),
    );
    const failed = Object.values(failures).reduce((sum, n) => sum + n, 0);
    const attempts = events('sign_in_attempted', provider);
    const succeeded = events('sign_in_succeeded', provider);
    const cancelled = events('sign_in_cancelled', provider);
    return {
      provider,
      attempts,
      succeeded,
      cancelled,
      failed,
      failures,
      unaccounted: Math.max(0, attempts - succeeded - cancelled - failed),
    };
  });
}

/** The account step's no-provider escape, by why it was offered. Should be zero on real devices. */
export function computeAccountEscape(rows) {
  return ['no_backend', 'no_provider'].map((bucket) => {
    const row = rowFor(rows, 'account_escape_used', bucket);
    return { bucket, events: Number(row?.events) || 0, installs: Number(row?.installs) || 0 };
  });
}

export const WINDOWS = Object.freeze([
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 3650, label: 'All time' },
]);

export const CLASS_LABELS = Object.freeze({
  primary: 'Primary',
  supporting: 'Supporting',
  diagnostic: 'Diagnostic',
  guardrail: 'Guardrail',
});
