/**
 * The KPI taxonomy — version 0.
 *
 * PRD §7.2 requires every KPI to carry its exact definition, numerator,
 * denominator, exclusions, window, version, and its class. That is a lot of
 * words to keep in a dashboard, so it is kept HERE instead, as data, and the
 * console renders it. A number whose definition lives only in the head of the
 * person who wrote the query is not a KPI.
 *
 * ── TWO STRUCTURAL RULES ──────────────────────────────────────────────────
 *
 * 1. **The event set is CLOSED.** An event name not in {@link KPI_EVENTS} is
 *    refused rather than charted (PRD §7: "the console rejects an unknown name").
 *    A call site cannot invent one.
 * 2. **No event carries an identifier of anything but an installation.** There
 *    is no journey id, no dream id, no step id. Every ratio below is therefore
 *    computed from COUNTS of differently-named events — which is why, for
 *    example, `journey_first_report` exists as its own event instead of being
 *    derived by joining reports to journeys. That join would need a journey id,
 *    and a journey id is the first step toward a per-person timeline.
 *
 * Pure TypeScript — no React, no vendor imports.
 */

/** Bumped when a NAME's meaning changes. Historical values are never recomputed under a new meaning. */
export const TAXONOMY_VERSION = 0;

/**
 * PRD §7.2's classification. `guardrail` is the one worth explaining: a metric
 * that must NOT move in the wrong direction while another improves.
 */
export type KpiClass = 'primary' | 'supporting' | 'diagnostic' | 'guardrail';

/** One authored event name. Adding is free; repurposing is a version bump. */
export interface KpiEventDef {
  name: string;
  /** What happened, in one line, in the words a person would use. */
  meaning: string;
  /** The closed set of bucket labels this event may carry, or null for none. */
  buckets: readonly string[] | null;
  /** True when the event is emitted AT MOST ONCE per installation, ever. */
  oncePerInstall?: boolean;
}

export const KPI_EVENTS: readonly KpiEventDef[] = Object.freeze([
  { name: 'app_first_open', meaning: 'This installation ran the app for the first time.', buckets: null, oncePerInstall: true },
  { name: 'onboarding_completed', meaning: 'The person reached the end of onboarding.', buckets: null, oncePerInstall: true },
  { name: 'journey_created', meaning: 'A Journey was created.', buckets: null },
  { name: 'first_journey_created', meaning: 'The first Journey on this installation was created.', buckets: null, oncePerInstall: true },
  {
    name: 'journey_first_report',
    meaning: 'A Journey received its first genuine Step report — it did not only exist, it started.',
    buckets: null,
  },
  { name: 'journey_completed', meaning: 'A Journey reached its end and was completed.', buckets: null },
  { name: 'journey_abandoned', meaning: 'A Journey was deliberately let go.', buckets: null },
  {
    name: 'step_reported',
    meaning: 'A scheduled Step was reported.',
    // Exactly the report kinds the domain already has. `postponed` is here
    // because a postponement is a real answer about a real day, not a gap.
    buckets: ['done', 'partial', 'couldnt', 'slipped', 'postponed'],
  },
  { name: 'weekly_review_completed', meaning: 'A Weekly Review was completed.', buckets: null },
]);

const BY_NAME = new Map(KPI_EVENTS.map((e) => [e.name, e]));

export const isKnownEvent = (name: string): boolean => BY_NAME.has(name);

/** Is this bucket allowed for this event? An unknown bucket is refused, like an unknown name. */
export function isAllowedBucket(name: string, bucket?: string | null): boolean {
  const def = BY_NAME.get(name);
  if (!def) return false;
  if (bucket === undefined || bucket === null) return true;
  return def.buckets !== null && def.buckets.includes(bucket);
}

// ── The KPIs themselves (PRD §7.3, provisional version 0) ────────────────────

export interface KpiDef {
  id: string;
  /** The human-readable definition. This is the contract, not a caption. */
  title: string;
  klass: KpiClass;
  /** Event name counted in the numerator, and whether distinct installations. */
  numerator: { event: string; bucket?: string; distinctInstalls?: boolean };
  denominator: { event: string; bucket?: string; distinctInstalls?: boolean };
  /** Stated plainly, because an unstated exclusion is how two people read one number differently. */
  exclusions: string;
  /** Marked provisional until the founder confirms the formula (PRD §7.3). */
  provisional: boolean;
}

export const KPIS: readonly KpiDef[] = Object.freeze([
  {
    id: 'activation',
    title: 'Successful activation — installations that finished onboarding and created a first Journey',
    klass: 'primary',
    numerator: { event: 'first_journey_created', distinctInstalls: true },
    denominator: { event: 'app_first_open', distinctInstalls: true },
    exclusions: 'Counts installations, not accounts. A reinstall is a new installation and is counted again.',
    provisional: true,
  },
  {
    id: 'onboarding_completion',
    title: 'Onboarding completion — installations that reached the end of onboarding',
    klass: 'supporting',
    numerator: { event: 'onboarding_completed', distinctInstalls: true },
    denominator: { event: 'app_first_open', distinctInstalls: true },
    exclusions: 'Same installation basis as activation.',
    provisional: true,
  },
  {
    id: 'journeys_truly_start',
    title: 'Journeys that truly start — created Journeys that received at least one genuine Step report',
    klass: 'primary',
    numerator: { event: 'journey_first_report' },
    denominator: { event: 'journey_created' },
    exclusions:
      'A postponement is not a genuine report for this measure. Journeys created and completed inside ' +
      'the same window are included in both counts.',
    provisional: true,
  },
  {
    id: 'journey_completion',
    title: 'Journey completion — completed Journeys as a share of Journeys that reached an end outcome',
    klass: 'primary',
    numerator: { event: 'journey_completed' },
    denominator: { event: 'journey_completed' }, // plus abandoned; see resolveDenominator
    exclusions:
      'Future and frozen Journeys are excluded until they reach an outcome. Shown beside cancellation, ' +
      'so an unsuitable Journey is not hidden by a healthy-looking completion rate.',
    provisional: true,
  },
  {
    id: 'step_follow_through',
    title: 'Step follow-through — reported Steps marked done or partial',
    klass: 'diagnostic',
    numerator: { event: 'step_reported', bucket: 'done' },
    denominator: { event: 'step_reported' },
    exclusions: 'Only Steps that were REPORTED. A Step nobody answered about is not in either count.',
    provisional: true,
  },
]);

/**
 * The KPIs PRD §7.3 asks for that version 0 deliberately does NOT compute, and
 * why. The console renders this list rather than leaving four silent holes:
 * §3.4's rule that unknown is not healthy applies to product metrics too.
 */
export const NOT_YET_COMPUTABLE: readonly { title: string; blockedBy: string }[] = Object.freeze([
  {
    title: 'Journeys moving forward',
    blockedBy:
      'Needs a periodic snapshot of which Journeys were ELIGIBLE in the period, not a count of events. ' +
      'A snapshot event per Journey per week would give it, and is a deliberate next step rather than an oversight.',
  },
  {
    title: 'Intervention efficiency',
    blockedBy: 'Interruptions are not counted anywhere, and "helped" has no recorded definition yet.',
  },
  {
    title: 'Support effectiveness',
    blockedBy:
      'Needs a support event followed by a return-to-action window. Support events exist in the app and ' +
      'none of them reaches this stream.',
  },
  {
    title: 'Retention',
    blockedBy:
      'Deliberate. Retention is diagnostic context only (§7.3) and computing it before the primary ' +
      'measures work would invite optimising it.',
  },
]);
