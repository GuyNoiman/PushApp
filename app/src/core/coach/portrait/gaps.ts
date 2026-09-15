/**
 * THE GAPS DRIVE THE CONVERSATION.
 *
 * The introduction used to walk a list: the domain expert supplied four questions and the engine
 * asked them until it ran out. This replaces the list with a question the engine can actually
 * answer after every message — *what do we still not know about this person, and which of those is
 * worth asking about?*
 *
 * ── THE WEIGHT IS AUTHORED, NOT PROMPTED (spec §15) ────────────────────────────────────────────
 *
 * The spec's own phrasing is "what missing information is most likely to change what happens next",
 * and the honest way to answer that is a table somebody wrote and can argue with — not an
 * instruction to a model to please prioritise well. A table is inspectable, testable, and identical
 * on every device. Config before code.
 *
 * ── THE RULE THAT STOPS THIS BECOMING A FORM ───────────────────────────────────────────────────
 *
 * Four fields carry weight ZERO: support need, readiness, previous attempts and constraints. They
 * are filled happily when somebody mentions them and they NEVER create a question of their own.
 * The spec says it twice (§12 "do not ask this automatically", §13 "these are not mandatory
 * standalone onboarding questions") and §22 says it again about support need and readiness. Without
 * that single rule the Portrait would quietly grow into the questionnaire the whole redesign exists
 * to remove — ten fields, ten questions, in a nicer voice.
 *
 * They are still OFFERED to the reader, which is the entire difference between opportunistic and
 * ignored: if the person says "I have tried three times and quit", we keep it.
 *
 * (Each of them still has an authored prompt in `coachContent`, unused today. The weights are meant
 * to be edited without touching this file, and a table you cannot change without also remembering to
 * write four strings is not really config.)
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */
import {
  PORTRAIT_FIELDS,
  atLeast,
  type Confidence,
  type Portrait,
  type PortraitFieldId,
  type PortraitFieldSpec,
} from './types';

/** What one field is worth asking about, and how well we need to know it. */
export interface GapPolicy {
  /**
   * The value of asking. Higher is asked first; ZERO means never asked at all, only listened for.
   * The numbers are spacing, not science — they exist so the order is editable without touching
   * logic.
   */
  weight: number;
  /**
   * How confident we need to be before this stops counting as missing. Spec §22: the want and the
   * area of life have to be CLEAR; the rest have to be clear enough.
   */
  target: Confidence;
}

/**
 * THE TABLE. The suggested order, in the founder's words: primary want > domain > bottleneck >
 * current state > desired outcome > stage; and the last four never asked.
 */
export const GAP_POLICY: Record<PortraitFieldId, GapPolicy> = {
  primaryWant: { weight: 100, target: 'high' },
  domain: { weight: 90, target: 'high' },
  bottleneck: { weight: 80, target: 'medium' },
  currentState: { weight: 70, target: 'medium' },
  desiredOutcome: { weight: 60, target: 'medium' },
  stage: { weight: 50, target: 'medium' },
  // Opportunistic. Listened for, never asked for.
  supportNeed: { weight: 0, target: 'medium' },
  readiness: { weight: 0, target: 'medium' },
  previousAttempts: { weight: 0, target: 'medium' },
  constraints: { weight: 0, target: 'medium' },
};

/** One thing we still do not know well enough, with everything a reader or a question needs. */
export interface PortraitGap {
  field: PortraitFieldId;
  spec: PortraitFieldSpec;
  weight: number;
  target: Confidence;
  /** How well we know it today. `unknown` when the field is empty. */
  held: Confidence;
}

/** How confidently a field is held right now. */
export function confidenceOf(portrait: Portrait, field: PortraitFieldId): Confidence {
  return portrait[field]?.confidence ?? 'unknown';
}

/**
 * Everything still missing, best-first.
 *
 * This is what the reader is shown, so it includes the weight-zero fields: they can be FILLED by
 * anything the person happens to say, they simply cannot be ASKED. The ordering is weight, then the
 * registry's declaration order as a stable tiebreak.
 */
export function outstandingGaps(portrait: Portrait): PortraitGap[] {
  return PORTRAIT_FIELDS.filter((spec) => {
    const policy = GAP_POLICY[spec.id];
    return !atLeast(confidenceOf(portrait, spec.id), policy.target);
  })
    .map((spec, index) => ({
      field: spec.id,
      spec,
      weight: GAP_POLICY[spec.id].weight,
      target: GAP_POLICY[spec.id].target,
      held: confidenceOf(portrait, spec.id),
      index,
    }))
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map(({ index: _index, ...gap }) => gap);
}

/**
 * The gap a QUESTION may be built from — the most valuable one still missing, weight zero excluded.
 *
 * `preferred` is the reader's suggestion, and it is honoured only when it is genuinely one of the
 * askable gaps. The engine keeps the veto here for the same reason it keeps it over every other
 * model output: a suggestion is a suggestion.
 */
export function nextGap(portrait: Portrait, preferred?: PortraitFieldId): PortraitGap | undefined {
  const askable = outstandingGaps(portrait).filter((gap) => gap.weight > 0);
  return askable.find((gap) => gap.field === preferred) ?? askable[0];
}

/**
 * THE STOP CONDITION (spec §22).
 *
 * > Do NOT stop because exactly 3 minutes passed, a fixed number of questions was reached, or every
 * > optional profile field is filled. Stop when the system knows enough.
 *
 * Which is exactly "no askable gap is left": the table above IS §22's minimum understanding, with
 * the want and the domain needing to be clear and the other four clear enough. Saying it once means
 * the stop condition and the next question can never disagree with each other.
 */
export function minimumUnderstanding(portrait: Portrait): boolean {
  return nextGap(portrait) === undefined;
}

/**
 * How many consecutive turns may add nothing before the conversation stops anyway.
 *
 * Some people answer three questions without telling us anything we can hold. Asking them a fourth
 * is not persistence, it is an interrogation — and the introduction's job is to meet somebody, not
 * to complete a record about them.
 */
export const QUIET_TURNS_TO_STOP = 2;

/**
 * Is the introduction finished?
 *
 * TWO WAYS TO BE DONE, and only two: we understand enough (§22), or the conversation has stopped
 * producing understanding.
 *
 * NOTE WHAT IS NOT HERE: the budget. Crossing a budget changes how we ASK — closed cards instead of
 * open text — and never how much we need to understand (D103). A stop condition that read the
 * budget would mean two people got different Portraits for the same conversation depending on how
 * expensive their tokens happened to be, and neither would ever know.
 */
export function readyToFinish(portrait: Portrait, quietTurns: number): boolean {
  return minimumUnderstanding(portrait) || quietTurns >= QUIET_TURNS_TO_STOP;
}
