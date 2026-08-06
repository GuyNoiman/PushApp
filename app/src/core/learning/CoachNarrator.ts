/**
 * CoachNarrator — the SEAM that turns the adaptive coach's structured output into short,
 * human, first-person-plural coaching copy (adaptive coach, S1.12). It is deliberately a thin
 * interface with a deterministic, templated implementation so that at S2 a real LLM narrator can
 * be dropped in behind the SAME interface with no change to callers.
 *
 * The {@link DeterministicNarrator} is PURE and TEMPLATED — NO LLM, NO randomness, NO clock,
 * NO I/O: identical inputs → identical strings. It reads only the coarse, non-PII fields of a
 * {@link ReplanResult} / {@link InsightModel} (kinds, counts, atRisk, bands) — it never needs,
 * and never emits, a goal title, a note, or any raw signal (G1/G2). An optional
 * {@link NarrationContext.journeyTitle} may be supplied by an on-device caller for a warmer line;
 * it is used ONLY to render on-device copy and is never logged or synced.
 *
 * Voice: supportive and growth-oriented, never a scoreboard or a scold — the coach optimises for
 * the user becoming who they choose to be, and is HONEST when a plan is at risk.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { InsightModel } from '../types/domain';
import type { ReplanResult, StepAdjustment } from './types';

/**
 * Optional, non-PII context an on-device caller may pass to colour the narration. Everything
 * here is presentation-only; the deterministic narrator works fully without it.
 */
export interface NarrationContext {
  /** The Journey's title, for a warmer on-device line. On-device only — never logged/synced. */
  journeyTitle?: string;
}

/**
 * The narrator seam. `describeAdaptation` explains a re-plan the coach just applied;
 * `encourage` offers a short standalone nudge from the current on-device insight. A real-LLM
 * narrator (S2) implements this same interface.
 */
export interface CoachNarrator {
  /** One or two short sentences describing what the coach changed (or that nothing changed). */
  describeAdaptation(result: ReplanResult, context?: NarrationContext): string;
  /** A short standalone encouragement derived from the current {@link InsightModel}. */
  encourage(insight: InsightModel): string;
}

/**
 * Narration-only tone thresholds. These shape COPY, not the plan (planning bands live in
 * {@link ../config/adaptivePolicy}); kept local and small so the seam is self-contained.
 */
const TONE = {
  /** slipRate at/above this reads as "rebuilding momentum". */
  slipHigh: 0.3,
  /** reliability at/above this (best Milestone) reads as "strong". */
  strong: 0.8,
  /** daysSinceLastActivity at/above this reads as "welcome back". */
  awayDays: 4,
} as const;

/** Count the adjustments of a given kind within a result. */
function countKind(adjustments: StepAdjustment[], kind: StepAdjustment['kind']): number {
  return adjustments.filter((a) => a.kind === kind).length;
}

/** Pluralise "step" against a count. */
function steps(n: number): string {
  return n === 1 ? '1 step' : `${n} steps`;
}

/**
 * The default, deterministic narrator. Templated strings only — the S1 stand-in for the S2 LLM.
 */
export class DeterministicNarrator implements CoachNarrator {
  describeAdaptation(result: ReplanResult, context?: NarrationContext): string {
    const forGoal = context?.journeyTitle ? ` for ${context.journeyTitle}` : '';

    if (!result.changed) {
      return `Your plan${forGoal} still looks good — no changes needed.`;
    }

    const rescheduled = countKind(result.stepAdjustments, 'rescheduled');
    const resized = countKind(result.stepAdjustments, 'resized');
    const removed = countKind(result.stepAdjustments, 'removed');

    const clauses: string[] = [];
    if (rescheduled > 0) clauses.push(`moved ${steps(rescheduled)} to fit your rhythm`);
    if (resized > 0) clauses.push(`resized ${steps(resized)} to match your pace`);
    if (removed > 0) clauses.push(`set aside ${steps(removed)} to keep the goal within reach`);

    const summary = clauses.length > 0 ? joinClauses(clauses) : 'adjusted your plan';
    const head = `We tuned your plan${forGoal}: ${summary}.`;

    if (result.atRisk) {
      return `${head} Heads up — even after this, the deadline is tight. Let's keep at it together.`;
    }
    return head;
  }

  encourage(insight: InsightModel): string {
    if (insight.atRisk || insight.slipRate >= TONE.slipHigh) {
      return 'Momentum dipped a little — let’s start small and rebuild it one step at a time.';
    }
    if (insight.daysSinceLastActivity >= TONE.awayDays) {
      return 'Welcome back — one small step today is all it takes to pick things up again.';
    }
    const bestReliability = Math.max(0, ...Object.values(insight.reliabilityByMilestone));
    if (bestReliability >= TONE.strong) {
      return 'You’re showing up consistently — that’s real progress. Keep going.';
    }
    return 'Steady steps add up. Let’s take the next one.';
  }
}

/** Join clauses with commas and a trailing "and" for the last (deterministic, no Oxford comma). */
function joinClauses(clauses: string[]): string {
  if (clauses.length === 1) return clauses[0];
  return `${clauses.slice(0, -1).join(', ')} and ${clauses[clauses.length - 1]}`;
}
