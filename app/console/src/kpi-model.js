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
