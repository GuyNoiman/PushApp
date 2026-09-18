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
  /**
   * True when the event is emitted AT MOST ONCE per installation, ever.
   *
   * For an event that carries buckets, the limit is once per installation PER BUCKET: each step of
   * the first run is reached at most once, but reaching `welcome` does not use up `account`.
   */
  oncePerInstall?: boolean;
}

/**
 * The first run's steps, exactly as `ONBOARDING_STEP_ORDER` in `core/onboarding/questions.ts` has
 * them, followed by any step the flow has RETIRED. Written out rather than imported, and pinned to
 * that array by a test: a screen added to the flow must be a deliberate change to what we count, not
 * a bucket that appears on its own.
 *
 * A retired step keeps its bucket. Rows written under it are real history — `firstJourney` was
 * screen 07 until the founder dropped it on 2026-09-18 — and a taxonomy that could no longer name a
 * bucket it holds would leave the console with rows it cannot label. Nothing records it any more.
 */
export const ONBOARDING_STEP_BUCKETS = [
  'language',
  'welcome',
  'purpose',
  'prepare',
  'account',
  'conversation',
  'handoff',
  // Retired 2026-09-18 (see above). Never recorded again; kept so the rows already written have a name.
  'firstJourney',
] as const;

/** The two providers a person can sign in with. */
export const SIGN_IN_PROVIDERS = ['apple', 'google'] as const;
export type SignInProvider = (typeof SIGN_IN_PROVIDERS)[number];

/**
 * Why a sign-in failed, decided ON THE DEVICE from the error's type and never from its message.
 *
 *  - `unavailable` — this build or device could not run the provider, or it handed back nothing
 *    (`AuthNotAvailableError`).
 *  - `rejected`    — the provider said yes and our server refused the token
 *    (`AuthTokenRejectedError`). The nonce mismatch of 2026-09-07 is this reason.
 *  - `error`       — anything else: the native sheet failing, the network, the unexpected.
 *
 * A CANCEL IS NOT HERE. It has its own event, because a person closing the sheet is a choice and an
 * error is a bug, and a count that adds them together hides the bug.
 */
export const SIGN_IN_FAILURE_REASONS = ['unavailable', 'rejected', 'error'] as const;
export type SignInFailureReason = (typeof SIGN_IN_FAILURE_REASONS)[number];

/** `apple:rejected` — the one bucket a failure carries, because a row has room for only one. */
export const signInFailureBucket = (provider: SignInProvider, reason: SignInFailureReason): string =>
  `${provider}:${reason}`;

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

  // ── The first run (founder, 2026-09-16) ────────────────────────────────────
  //
  // D104 put a mandatory account in front of the conversation, and nothing could say whether it
  // costs us people. These answer "where do people stop" and "has sign-in ever worked for anybody".
  {
    name: 'onboarding_step_reached',
    meaning: 'A step of the first run was shown to this installation for the first time.',
    buckets: ONBOARDING_STEP_BUCKETS,
    oncePerInstall: true,
  },
  {
    name: 'sign_in_attempted',
    meaning: 'The person pressed a sign-in button, from any screen.',
    buckets: SIGN_IN_PROVIDERS,
  },
  {
    name: 'sign_in_succeeded',
    meaning: 'A sign-in returned a real session.',
    buckets: SIGN_IN_PROVIDERS,
  },
  {
    name: 'sign_in_cancelled',
    meaning: 'The person closed the provider sheet themselves. A choice, not a failure.',
    buckets: SIGN_IN_PROVIDERS,
  },
  {
    name: 'sign_in_failed',
    meaning: 'A sign-in failed for a reason that was not the person cancelling.',
    buckets: SIGN_IN_PROVIDERS.flatMap((provider) =>
      SIGN_IN_FAILURE_REASONS.map((reason) => signInFailureBucket(provider, reason)),
    ),
  },
  {
    name: 'account_escape_used',
    // The broken-build escape on the account step: it advances with NO session. It should never
    // happen on a real device, and this is how we find out whether it does.
    meaning: 'The account step offered no way to sign in, and the person continued without a session.',
    buckets: ['no_backend', 'no_provider'],
  },
  {
    name: 'introduction_started',
    meaning: 'The person answered the first conversation for the first time (opening it is not starting it).',
    buckets: null,
    oncePerInstall: true,
  },
  {
    name: 'introduction_completed',
    meaning: 'The first conversation reached its understanding check and the person confirmed it.',
    buckets: null,
    oncePerInstall: true,
  },
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
