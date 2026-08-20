/**
 * The Life Wheel — the first real tool in the Tools tab, and the template for every one after it.
 *
 * ── WHAT MAKES OURS DIFFERENT, and it is not decoration ─────────────────────────────────────────
 *
 * The classic life wheel asks ONE thing per area: how satisfied are you, nought to ten. It produces
 * a pretty shape and a conclusion nobody can act on, because a low score is not a problem — a low
 * score in something you do not currently care about is a life with priorities in it. Somebody who
 * scores Fun at 3 while they are six weeks from a deadline has not found a gap; they have found a
 * choice.
 *
 * So every area here is asked TWO questions: **how it is**, and **how much it matters right now**.
 * The finding is the DISTANCE between them. An area that matters a great deal and is going badly is
 * where a person is actually losing; an area that is going badly and does not matter is not a
 * problem to solve. That single change is what turns a picture into something a coach can act on,
 * and it is why the second question exists at all.
 *
 * ── WHAT IT GIVES THE PERSON, AND WHAT IT GIVES US ──────────────────────────────────────────────
 *
 * The founder's rule for every tool: it must be worth doing on its own AND teach the app something.
 * Here the person gets a reading of their own year in eight minutes. The app gets the one thing
 * onboarding never asks well — not which areas someone is interested in, but which one they are
 * quietly paying for. That becomes context for the coach ({@link ./signals}).
 *
 * NOT A DIAGNOSIS AND NOT A SCORE. There is no "balance percentage", no grade and no comparison to
 * anybody. The tool reflects; it never judges. The screen's closing line — "there are no right
 * answers" — is load-bearing copy, not politeness.
 *
 * SECURITY-PRIVACY G1: the answers are ON-DEVICE-ONLY raw signal. They are never synced, never
 * logged, and never turned into a DomainEvent. What somebody scores their family at is not ours.
 *
 * Pure TypeScript — no React, no i18n at module level, no clock reads of its own.
 */

/** The eight areas, in the order they sit on the wheel, clockwise from the top. */
export const LIFE_AREAS = [
  'health',
  'relationships',
  'family',
  'career',
  'money',
  'growth',
  'fun',
  'environment',
] as const;

export type LifeAreaId = (typeof LIFE_AREAS)[number];

/** The scale both questions use. Zero is a real answer, not a missing one. */
export const LIFE_WHEEL_MIN = 0;
export const LIFE_WHEEL_MAX = 10;

/** One area's two answers. */
export interface AreaAnswer {
  /** How it is right now, 0–10. */
  satisfaction: number;
  /** How much it matters right now, 0–10. */
  weight: number;
}

/** Answers so far, keyed by area. Partial while the person is still going. */
export type LifeWheelAnswers = Readonly<Partial<Record<LifeAreaId, AreaAnswer>>>;

/** Clamp a raw value into the scale. Used at the edges, so a bad input can never reach the maths. */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return LIFE_WHEEL_MIN;
  return Math.min(LIFE_WHEEL_MAX, Math.max(LIFE_WHEEL_MIN, Math.round(value)));
}

/** Record one area's answers. Returns a NEW map — the caller owns persistence. */
export function recordArea(
  answers: LifeWheelAnswers,
  area: LifeAreaId,
  answer: AreaAnswer,
): LifeWheelAnswers {
  return {
    ...answers,
    [area]: { satisfaction: clampScore(answer.satisfaction), weight: clampScore(answer.weight) },
  };
}

/** The next area still unanswered, in wheel order. `null` when the wheel is complete. */
export function nextArea(answers: LifeWheelAnswers): LifeAreaId | null {
  return LIFE_AREAS.find((area) => answers[area] === undefined) ?? null;
}

/** How many areas are answered — the "6 of 8" on the screen. */
export function answeredCount(answers: LifeWheelAnswers): number {
  return LIFE_AREAS.filter((area) => answers[area] !== undefined).length;
}

export function isComplete(answers: LifeWheelAnswers): boolean {
  return answeredCount(answers) === LIFE_AREAS.length;
}

// ── The reading ───────────────────────────────────────────────────────────────────────────────

/** One area, read. */
export interface AreaReading {
  area: LifeAreaId;
  satisfaction: number;
  weight: number;
  /**
   * How much this area is costing right now: how far short of what it is worth to this person it
   * currently falls. `weight - satisfaction`, floored at zero — an area doing BETTER than it matters
   * is not a surplus to be spent, it is simply fine, and treating it as slack is how a tool starts
   * telling people to care less about things that are going well.
   */
  gap: number;
}

/** What the completed wheel says. Every field is a fact about the answers, never a judgement. */
export interface LifeWheelReading {
  /** Every area, ordered by `gap` descending, then by weight — the costliest first. */
  areas: AreaReading[];
  /**
   * The one or two areas actually worth a conversation: the largest gaps, and only where the gap is
   * real. An empty list is a legitimate and good result, and the copy must be able to say so.
   */
  pressing: AreaReading[];
  /**
   * The area carrying the person right now — highest satisfaction among the ones that matter. It is
   * named because a reading that lists only what is wrong is a reading people stop taking.
   */
  strongest: AreaReading | null;
  /** Mean satisfaction across all eight, for the wheel's own shape. NOT a score and never labelled one. */
  averageSatisfaction: number;
}

/** A gap has to be at least this wide to be worth naming. Below it, it is noise, not a finding. */
export const PRESSING_GAP_THRESHOLD = 3;
/** At most this many areas are ever called pressing. A tool that finds eight problems has found none. */
export const MAX_PRESSING = 2;
/** An area has to matter at least this much before "you are doing well here" means anything. */
const STRENGTH_MIN_WEIGHT = 5;

/**
 * Read a completed wheel. Returns `null` for an incomplete one rather than reading half a life —
 * every finding here is comparative, so a missing area silently changes what looks worst.
 */
export function readWheel(answers: LifeWheelAnswers): LifeWheelReading | null {
  if (!isComplete(answers)) return null;

  const areas: AreaReading[] = LIFE_AREAS.map((area) => {
    const answer = answers[area]!;
    return {
      area,
      satisfaction: answer.satisfaction,
      weight: answer.weight,
      gap: Math.max(0, answer.weight - answer.satisfaction),
    };
  }).sort((a, b) => b.gap - a.gap || b.weight - a.weight);

  const pressing = areas.filter((a) => a.gap >= PRESSING_GAP_THRESHOLD).slice(0, MAX_PRESSING);

  const strongest =
    [...areas]
      .filter((a) => a.weight >= STRENGTH_MIN_WEIGHT)
      .sort((a, b) => b.satisfaction - a.satisfaction || b.weight - a.weight)[0] ?? null;

  const averageSatisfaction =
    areas.reduce((sum, a) => sum + a.satisfaction, 0) / areas.length;

  return { areas, pressing, strongest, averageSatisfaction };
}
