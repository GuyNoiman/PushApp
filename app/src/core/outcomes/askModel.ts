/**
 * What to ask when a Journey ends, and — more importantly — what not to.
 *
 * ── THE CONSTRAINT THAT SHAPES THIS ──────────────────────────────────────
 *
 * §3A.7: short, skippable. Somebody who just finished something is owed a
 * moment, not a form; somebody who just abandoned one is owed even less of an
 * interrogation. So this is at most three questions, every one skippable, and
 * skipping leaves the row's felt half null — which means "not asked", never zero.
 *
 * ── WHY THE QUESTIONS DIFFER BY ENDING ──────────────────────────────────
 *
 * Asking "what helped?" of somebody who abandoned is tone-deaf, and asking "what
 * did not fit?" of somebody who finished and loved it wastes the one question
 * they will answer. The endings are different events and get different asks —
 * but they write to the SAME columns, so the evidence stays comparable.
 *
 * Pure TypeScript — no React, no vendor imports.
 */
import { EFFORT_ACCURACY, HELPED_FACTORS, MISMATCH_DIMENSIONS } from './taxonomy';
import type { JourneyEnding } from './taxonomy';

export type AskId = 'satisfaction' | 'real_world_change' | 'helped' | 'mismatch' | 'effort_accuracy';

export interface OutcomeQuestion {
  id: AskId;
  /** i18n key under the `outcomes` namespace. Copy is never built here. */
  promptKey: string;
  kind: 'rating' | 'multi';
  /** For `multi`: the closed options, as {value, labelKey}. */
  options?: readonly { value: string; labelKey: string }[];
}

const helped = HELPED_FACTORS.map((f) => ({ value: f.value, labelKey: `helped.${f.value}` }));
const mismatch = MISMATCH_DIMENSIONS.map((d) => ({ value: d.value, labelKey: `mismatch.${d.value}` }));
const effort = EFFORT_ACCURACY.map((e) => ({ value: e.value, labelKey: `effort.${e.value}` }));

const Q: Record<AskId, OutcomeQuestion> = {
  satisfaction: { id: 'satisfaction', promptKey: 'ask.satisfaction', kind: 'rating' },
  // §5.3's primary outcome, and the one nothing else can stand in for. Asked of
  // every ending, including an abandoned one — a Journey somebody left can still
  // have changed something.
  real_world_change: { id: 'real_world_change', promptKey: 'ask.realWorldChange', kind: 'rating' },
  helped: { id: 'helped', promptKey: 'ask.helped', kind: 'multi', options: helped },
  mismatch: { id: 'mismatch', promptKey: 'ask.mismatch', kind: 'multi', options: mismatch },
  effort_accuracy: { id: 'effort_accuracy', promptKey: 'ask.effort', kind: 'multi', options: effort },
};

/**
 * The questions for one ending, in order. Three at most, and the first is the
 * one worth having if they answer nothing else.
 */
export function questionsFor(ending: JourneyEnding): OutcomeQuestion[] {
  switch (ending) {
    case 'completed':
      // Did anything actually change, what helped, and was the effort what we
      // promised. Satisfaction is deliberately NOT first: it is the outcome most
      // vulnerable to novelty and relief, and asking it first anchors the rest.
      return [Q.real_world_change, Q.helped, Q.effort_accuracy];
    case 'abandoned':
      // What did not fit is the whole point of asking somebody who left. One
      // rating after it, and nothing else — this is the moment to be brief.
      return [Q.mismatch, Q.real_world_change];
    default:
      return [Q.mismatch];
  }
}

/** True when nothing was answered — the sheet then writes nothing at all. */
export function isEmptyAnswer(answers: Partial<Record<AskId, unknown>>): boolean {
  return Object.values(answers).every(
    (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0),
  );
}

/** Shape the sheet's answers into the felt half of an outcome row. */
export function feltFrom(answers: {
  satisfaction?: number | null;
  real_world_change?: number | null;
  helped?: string[];
  mismatch?: string[];
  effort_accuracy?: string | null;
  comment?: string | null;
}) {
  return {
    satisfaction: answers.satisfaction ?? null,
    realWorldChange: answers.real_world_change ?? null,
    effortAccuracy: answers.effort_accuracy ?? null,
    helped: answers.helped ?? [],
    mismatch: answers.mismatch ?? [],
    comment: answers.comment ?? null,
  };
}
