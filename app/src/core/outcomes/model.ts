/**
 * Building an outcome-evidence event — pure, so what is recorded about somebody
 * can be read and argued with without a database.
 *
 * ── THE AUTOMATIC HALF AND THE FELT HALF ─────────────────────────────────
 *
 * A Journey ending always produces evidence, even when nobody answers a
 * question: how it ended, how much of it was done, which authored version built
 * it. That is the automatic half, and it is written the moment the Journey ends.
 *
 * The felt half — did you like it, did anything change, was the effort what you
 * expected — arrives only if somebody answers, and stays NULL if they do not.
 * Null means "not asked or skipped". It never means zero, and nothing here is
 * allowed to make it mean zero, because a skipped survey is not a bad review.
 *
 * ── THREE OUTCOMES, NEVER ONE ────────────────────────────────────────────
 *
 * §5.4 forbids a blended success number, so this file computes none. There is no
 * `score` and no `success` — a Journey somebody loved and abandoned, and one
 * they finished and got nothing from, are both real and must stay tellable apart.
 *
 * Pure TypeScript — no React, no vendor imports.
 */
import {
  OUTCOME_SCHEMA_VERSION,
  isEffortAccuracy,
  isHelpedId,
  isIntendedDepth,
  isMismatchId,
  type JourneyEnding,
} from './taxonomy';

/** Everything the device knows without asking anybody. */
export interface AutomaticOutcome {
  ending: JourneyEnding;
  templateId?: string | null;
  definitionId?: string | null;
  variantId?: string | null;
  definitionVersion?: number | null;
  domain?: string | null;
  intendedDepth?: string | null;
  stepsTotal?: number | null;
  stepsDone?: number | null;
  daysActive?: number | null;
}

/** What a person said, when they said anything. Every field optional. */
export interface FeltOutcome {
  satisfaction?: number | null;
  realWorldChange?: number | null;
  effortAccuracy?: string | null;
  mismatch?: string[];
  helped?: string[];
  comment?: string | null;
}

/** The row as it will be written. Field names are the column names, deliberately. */
export interface OutcomeEvidence {
  schema_version: number;
  ending: JourneyEnding;
  template_id: string | null;
  definition_id: string | null;
  variant_id: string | null;
  definition_version: number | null;
  domain: string | null;
  intended_depth: string | null;
  steps_total: number | null;
  steps_done: number | null;
  days_active: number | null;
  satisfaction: number | null;
  real_world_change: number | null;
  effort_accuracy: string | null;
  mismatch: string[];
  helped: string[];
  comment: string | null;
}

const ENDINGS = new Set<JourneyEnding>(['completed', 'abandoned', 'expired', 'replaced']);

const int = (v: number | null | undefined): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;

/** 1..5, or null. A rating outside the scale is not clamped into it — it is dropped. */
const rating = (v: number | null | undefined): number | null => {
  const n = int(v);
  return n !== null && n >= 1 && n <= 5 ? n : null;
};

const text = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  return t ? t : null;
};

/**
 * Build the row.
 *
 * Like the crash and KPI contracts, it REBUILDS from an allowlist rather than
 * editing what it was handed: a field a future caller adds is gone by
 * construction rather than by having been anticipated. Unknown taxonomy ids are
 * dropped rather than stored, because an id nothing recognises is an id no
 * analysis can ever group by.
 */
export function buildOutcome(automatic: AutomaticOutcome, felt: FeltOutcome = {}): OutcomeEvidence | null {
  if (!ENDINGS.has(automatic.ending)) return null;
  return {
    schema_version: OUTCOME_SCHEMA_VERSION,
    ending: automatic.ending,
    template_id: automatic.templateId ?? null,
    definition_id: text(automatic.definitionId),
    variant_id: text(automatic.variantId),
    definition_version: int(automatic.definitionVersion),
    domain: text(automatic.domain),
    intended_depth:
      automatic.intendedDepth && isIntendedDepth(automatic.intendedDepth) ? automatic.intendedDepth : null,
    steps_total: int(automatic.stepsTotal),
    steps_done: int(automatic.stepsDone),
    days_active: int(automatic.daysActive),
    satisfaction: rating(felt.satisfaction),
    real_world_change: rating(felt.realWorldChange),
    effort_accuracy: felt.effortAccuracy && isEffortAccuracy(felt.effortAccuracy) ? felt.effortAccuracy : null,
    mismatch: (felt.mismatch ?? []).filter(isMismatchId),
    helped: (felt.helped ?? []).filter(isHelpedId),
    comment: text(felt.comment),
  };
}

/**
 * Adherence as a FRACTION OF WHAT THEY INTENDED, not of the plan.
 *
 * This is §5.2 as arithmetic. Somebody who set out to get one specific answer
 * and stopped at a third of the Steps did not achieve 33% of anything — they
 * finished. Returning null for the two non-completionist intents is not a gap;
 * it is a refusal to compute a number that would be read as failure.
 */
export function adherence(evidence: Pick<OutcomeEvidence, 'steps_total' | 'steps_done' | 'intended_depth'>): number | null {
  // Unknown intent is also null, and that is not pedantry. Nothing asks for
  // intended depth yet, so today this returns null for almost every row — which
  // is the honest state of the measure rather than a gap. The raw counts are in
  // the row either way, so plan-completion is always computable; what this
  // function refuses to do is CALL that adherence when there is nothing to
  // compare it against.
  if (evidence.intended_depth !== 'whole_thing') return null;
  const total = evidence.steps_total;
  const done = evidence.steps_done;
  if (!total || total <= 0 || done === null || done === undefined) return null;
  return Math.min(1, Math.max(0, done / total));
}

/**
 * Did somebody answer anything at all? Used to decide whether a row is worth
 * updating later, and to keep "skipped" visible in analysis rather than
 * indistinguishable from "answered neutrally".
 */
export function hasFelt(evidence: OutcomeEvidence): boolean {
  return (
    evidence.satisfaction !== null ||
    evidence.real_world_change !== null ||
    evidence.effort_accuracy !== null ||
    evidence.mismatch.length > 0 ||
    evidence.helped.length > 0 ||
    evidence.comment !== null
  );
}
