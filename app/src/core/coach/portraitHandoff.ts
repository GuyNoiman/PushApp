/**
 * THE SECOND CONVERSATION CONTINUES FROM THE PORTRAIT (Stage 1 of
 * `04_Product/Planning_From_Portrait_Plan_2026-09-16.md`).
 *
 * The intro Journey's fourth Step opens the coach in `planning` mode, and until now that
 * conversation never saw the Portrait. Somebody who had just told the coach what they want, where
 * they are, what is in the way and what keeps them going was asked all four again. The founder's
 * spec forbids exactly that: the second conversation "must not restart discovery from zero".
 *
 * ── WHY TABLES AND NOT A MODEL ─────────────────────────────────────────────────────────────────
 *
 * Which planning questions the Portrait already answers is decided here, by lookup, at the moment
 * the goal is read. Not by asking a model whether it thinks the Portrait covers something. That is
 * what makes "never re-ask" hold offline: with every compose and reader call failing, a covered
 * question is still never put to the person, because nothing about covering it needed a call.
 *
 * ── WHY THIS FILE IS NOT IN `portrait/` ────────────────────────────────────────────────────────
 *
 * The Portrait module knows nothing about domain experts, question intents or the catalogue, and
 * that is a decision (D109): the first conversation is blind to what Journeys exist. This file maps a
 * Portrait ONTO the planning interview's intents, so it belongs to planning, beside the orchestrator
 * that uses it. Keeping it out of `portrait/` keeps that module expert-free.
 *
 * ── TRUST ──────────────────────────────────────────────────────────────────────────────────────
 *
 * A TEXT-TRUSTED field is held at medium or better. It is only ever used for wording, so a reading
 * we are reasonably sure of is enough.
 *
 * An ENUM-TRUSTED field (stage) was either SAID at medium or better, or INFERRED at high. It is held
 * to the higher bar because it becomes a closed answer the Planner builds from, and a guessed level
 * silently changes the plan.
 *
 * `low` covers nothing, anywhere.
 *
 * ── WHAT IS NEVER COVERED ──────────────────────────────────────────────────────────────────────
 *
 * Weekly time, how long the Journey runs and which days suit (`time`, `horizon`, `scheduling`) are
 * the D102 EXACT intents: they feed the Planner's arithmetic and are only ever taken from an exact
 * answer. A Portrait that says "only a couple of hours a week" in `constraints` is still not an
 * answer to them. Staging (`milestones`) and a Journey's own version and axis questions (`variant`)
 * are about the plan being built now, which the first conversation deliberately never discussed.
 *
 * SECURITY-PRIVACY G1: everything here reads a Portrait and returns names, indices and the person's
 * own lines for the model calls that already carry them. Nothing is logged, and nothing from here may
 * enter a DomainEvent, a KPI event or a technical note as a VALUE; notes name fields and intents only.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */
import type { QuestionIntent } from '../learning/DomainExpert';
import type { KnownFact } from './composeTurn';
import {
  atLeast,
  portraitFacts,
  portraitField,
  type Held,
  type Portrait,
  type PortraitDomain,
  type PortraitStage,
} from './portrait';

/**
 * The domains whose Portrait is handed to the second conversation. Career only, per the founder:
 * "קודם כל הכל יעבוד מושלם על מומחה אחד ואז נוסיף נוספים". Adding a domain here is the whole change
 * for the table below; the tokens coincide with the expert registry's for every domain listed.
 */
export const SEEDED_DOMAINS: readonly PortraitDomain[] = ['career'];

/** Held at medium or better, whatever its source. Enough for anything that only shapes wording. */
export function textTrusted(held: Held<unknown> | undefined): boolean {
  return held !== undefined && atLeast(held.confidence, 'medium');
}

/** Said at medium or better, or inferred at high. The bar for a value the Planner builds from. */
export function enumTrusted(held: Held<unknown> | undefined): boolean {
  if (!held) return false;
  return held.source === 'stated'
    ? atLeast(held.confidence, 'medium')
    : atLeast(held.confidence, 'high');
}

/** What the second conversation opens from: the want, whether it was said, and its domain. */
export interface PortraitResume {
  /** What they want, as the Portrait holds it. ON-DEVICE ONLY. */
  want: string;
  /**
   * True when they SAID it, so the opening may quote it. An inferred want is our reading and is
   * never put in quotation marks as if they had said it.
   */
  stated: boolean;
  domain: PortraitDomain;
}

/**
 * Whether the handoff applies at all, and what it opens with.
 *
 * It applies when the Portrait places the want in a seeded domain at medium or better AND the want
 * itself is text-trusted. A thin Portrait (no want, a low one, or a domain we do not seed) returns
 * undefined, and the conversation is exactly today's.
 */
export function resumeOf(portrait: Portrait | null | undefined): PortraitResume | undefined {
  if (!portrait) return undefined;
  const { domain, primaryWant } = portrait;
  if (!domain || !atLeast(domain.confidence, 'medium')) return undefined;
  if (!SEEDED_DOMAINS.includes(domain.value)) return undefined;
  if (!textTrusted(primaryWant) || !primaryWant || primaryWant.value.trim().length === 0) return undefined;
  return { want: primaryWant.value.trim(), stated: primaryWant.source === 'stated', domain: domain.value };
}

/**
 * THE COVERAGE TABLE. Which interview intent the Portrait already answers, and on what evidence.
 *
 * Only these four can ever be covered. An intent with no row is asked, which is the safe direction
 * to fail in.
 */
export const INTENT_COVERAGE: Readonly<Partial<Record<QuestionIntent, (portrait: Portrait) => boolean>>> = {
  // Why this matters: what they want AND what would be different if it moved.
  foundation: (p) => textTrusted(p.primaryWant) && textTrusted(p.desiredOutcome),
  // Where they are now: a stage we can place on the level scale, or their own account of it.
  baseline: (p) =>
    (enumTrusted(p.stage) && p.stage !== undefined && STAGE_TO_BASELINE_INDEX[p.stage.value] !== undefined) ||
    textTrusted(p.currentState),
  // What is in the way, when it is something rather than "we could not tell".
  obstacles: (p) => textTrusted(p.bottleneck) && p.bottleneck?.value !== 'unknown',
  // What keeps them going: what would be different.
  motivation: (p) => textTrusted(p.desiredOutcome),
};

/** Never covered, whatever the table above ever grows to say. A belt, not a second table. */
const NEVER_COVERED: ReadonlySet<QuestionIntent> = new Set<QuestionIntent>([
  'time',
  'horizon',
  'scheduling',
  'milestones',
  'variant',
]);

/** The intents this Portrait covers. Empty when the handoff does not apply. */
export function coveredIntents(portrait: Portrait | null | undefined): ReadonlySet<QuestionIntent> {
  const covered = new Set<QuestionIntent>();
  if (!portrait || !resumeOf(portrait)) return covered;
  for (const [intent, covers] of Object.entries(INTENT_COVERAGE) as [QuestionIntent, (p: Portrait) => boolean][]) {
    if (NEVER_COVERED.has(intent)) continue;
    if (covers(portrait)) covered.add(intent);
  }
  return covered;
}

/**
 * Stage → the baseline question's ORDERED options (just figuring it out → actively progressing).
 * `unblock` has no row: somebody already acting and blocked on one thing can sit anywhere on that
 * scale, so it is not placed.
 */
export const STAGE_TO_BASELINE_INDEX: Readonly<Partial<Record<PortraitStage, number>>> = {
  explore: 0,
  choose: 0,
  prepare: 1,
  act: 1,
  sustain: 1,
  grow: 2,
};

/**
 * The baseline answer the Portrait implies, as one of the question's own options, or undefined when
 * the stage is not trusted, not mapped, or points past the options offered.
 *
 * Written at the END of the conversation and only into an empty answer, so anything the person says
 * about where they are now always wins.
 */
export function baselineDefault(
  portrait: Portrait | null | undefined,
  options: readonly string[],
): string | undefined {
  const stage = portrait?.stage;
  if (!stage || !enumTrusted(stage)) return undefined;
  const index = STAGE_TO_BASELINE_INDEX[stage.value];
  return index === undefined ? undefined : options[index];
}

/**
 * The Portrait lines handed to the goal-reading call, so "yes, still that" can be read as the goal
 * it refers to. Text fields only, at medium or better, each marked as said or inferred.
 */
export function seedLines(portrait: Portrait): string[] {
  const lines: string[] = [];
  for (const id of ['primaryWant', 'currentState', 'desiredOutcome'] as const) {
    const held = portrait[id];
    if (!held || !textTrusted(held) || held.value.trim().length === 0) continue;
    const describe = portraitField(id)?.describe ?? id;
    const source = held.source === 'stated' ? 'they said this' : 'an earlier reading, not their words';
    lines.push(`- ${describe} (${source}): ${held.value.trim()}`);
  }
  return lines;
}

/**
 * The Portrait as the composer's known facts, labelled as coming from the first conversation so the
 * coach can say "you told me" about the right conversation, and never asks for any of it again.
 */
export function firstConversationFacts(portrait: Portrait): KnownFact[] {
  return portraitFacts(portrait).map((fact) => ({
    asked: `from your first conversation with them: ${fact.asked}`,
    answered: fact.answered,
  }));
}
