/**
 * Onboarding question configuration (PRD §6) — the six questions as pure data: their section, select
 * behaviour + limits, option ids, which option reveals free text, and whether an optional free-text
 * add-on exists. The exact user-facing copy lives in the `onboarding` i18n namespace (localized en/he);
 * this file holds only the STRUCTURE so the flow container + Coach-handoff deriver stay data-driven.
 *
 * Terminology note: Q4's "smallSteps" refers to the protected term **Step** (its label is authored in
 * i18n). Option ids are stable, language-agnostic keys — they are what persists in {@link OnboardingAnswers}.
 */
import type { OnboardingQuestionId, OnboardingStep } from './model';

/**
 * The three on-screen sections: Q1–Q4 (what you want), Q5–Q6 (what holds you back), and Q7–Q9 (how
 * you like to work — added 2026-08-18 alongside D62).
 */
export type OnboardingSection = 'help' | 'friction' | 'approach';

/** How a question is answered: pick one, pick up to a limit, or free text only (Q2). */
export type OnboardingSelect = 'single' | 'multi' | 'text';

/**
 * When a question exposes free text:
 *  - `onOther`  — revealed only when the "Other"/final option is chosen (Q1/Q3/Q4/Q5);
 *  - `optional` — always available as an optional add-on (Q6's "anything the Coach should know").
 */
export type OnboardingFreeText = 'onOther' | 'optional';

export interface OnboardingOption {
  /** Stable, language-agnostic id (what persists). */
  id: string;
  /** The terminal "Something else" / "None of these" option that reveals free text. */
  isOther?: boolean;
}

export interface OnboardingQuestion {
  id: OnboardingQuestionId;
  section: OnboardingSection;
  select: OnboardingSelect;
  /** Max selectable options (1 for single/text; 2 for the "up to two" questions — PRD §6). */
  maxSelect: number;
  /** Selectable options in display order; empty for the text-only question (Q2). */
  options: OnboardingOption[];
  /** Whether/how this question offers free text. */
  freeText?: OnboardingFreeText;
}

/**
 * Bump when the question SET changes, so a rebuilt Coach summary carries correct provenance (PRD §9).
 * v2 (2026-08-18): Q7–Q9 added — starting mode, how much structure helps, how much challenge is
 * wanted now (approved alongside D62). A v1 answer set stays valid and simply carries none of them.
 */
export const ONBOARDING_VERSION = 2;

/**
 * The nine questions (PRD §6, extended 2026-08-18). Option ids are semantic and stable; their copy
 * is in i18n (`onboarding:questions.<id>.options.<optionId>`). "Other" reveals free text; Q2 is
 * text-only; Q6 carries an optional free-text add-on rather than an "Other" option.
 *
 * Q7–Q9 ask how the person likes to WORK, and they exist because the matching layer had no way to
 * separate two people who want the same thing and need opposite plans. Each is single-select with a
 * real "I'm not sure" — an answer we can act on is worth more than a guess we cannot tell apart
 * from one. None of them offers free text: they are ranking signals that must stay coarse ids (G1),
 * and a free-text answer here could not reach a plan anyway.
 */
export const ONBOARDING_QUESTIONS: readonly OnboardingQuestion[] = [
  {
    id: 'q1',
    section: 'help',
    select: 'multi',
    maxSelect: 2,
    freeText: 'onOther',
    options: [
      { id: 'health' },
      { id: 'calm' },
      { id: 'work' },
      { id: 'money' },
      { id: 'relationships' },
      { id: 'habits' },
      { id: 'learning' },
      { id: 'other', isOther: true },
    ],
  },
  {
    id: 'q2',
    section: 'help',
    select: 'text',
    maxSelect: 1,
    options: [],
  },
  {
    id: 'q3',
    section: 'help',
    select: 'single',
    maxSelect: 1,
    freeText: 'onOther',
    options: [
      { id: 'takingAction' },
      { id: 'notStarted' },
      { id: 'noHowToBegin' },
      { id: 'tooManyDirections' },
      { id: 'triedInconsistent' },
      { id: 'noneFits', isOther: true },
    ],
  },
  {
    id: 'q4',
    section: 'help',
    select: 'multi',
    maxSelect: 2,
    freeText: 'onOther',
    options: [
      { id: 'clearPlan' },
      { id: 'smallSteps' },
      { id: 'flexibility' },
      { id: 'seeProgress' },
      { id: 'remindersEncouragement' },
      { id: 'supportClose' },
      { id: 'dontKnow' },
      { id: 'other', isOther: true },
    ],
  },
  {
    id: 'q5',
    section: 'friction',
    select: 'multi',
    maxSelect: 2,
    freeText: 'onOther',
    options: [
      { id: 'lifeBusy' },
      { id: 'excitementFades' },
      { id: 'noClearPlan' },
      { id: 'tooMuchAtOnce' },
      { id: 'hardToSeeProgress' },
      { id: 'hardToRestart' },
      { id: 'lackSupport' },
      { id: 'dontKnow' },
      { id: 'other', isOther: true },
    ],
  },
  {
    id: 'q6',
    section: 'friction',
    select: 'single',
    maxSelect: 1,
    freeText: 'optional',
    options: [
      { id: 'fewMinutes' },
      { id: 'shortFewTimes' },
      { id: 'halfHour' },
      { id: 'moreWhenNeeded' },
      { id: 'changesWeekly' },
      { id: 'dontKnow' },
    ],
  },
  {
    id: 'q7',
    section: 'approach',
    select: 'single',
    maxSelect: 1,
    options: [
      { id: 'clarityFirst' },
      { id: 'actionFirst' },
      { id: 'dependsGoal' },
      { id: 'dontKnow' },
    ],
  },
  {
    id: 'q8',
    section: 'approach',
    select: 'single',
    maxSelect: 1,
    options: [
      { id: 'detailedStructure' },
      { id: 'lightStructure' },
      { id: 'firmThenLoose' },
      { id: 'dontKnow' },
    ],
  },
  {
    id: 'q9',
    section: 'approach',
    select: 'single',
    maxSelect: 1,
    options: [
      { id: 'gentleNow' },
      { id: 'meaningfulPush' },
      { id: 'hardPush' },
      { id: 'dontKnow' },
    ],
  },
] as const;

/** The question ids in order (PRD §6). */
export const ONBOARDING_QUESTION_IDS: readonly OnboardingQuestionId[] = ONBOARDING_QUESTIONS.map(
  (q) => q.id,
);

/** Total question count for the "Question X of N" progress copy (PRD §8). */
export const ONBOARDING_QUESTION_COUNT = ONBOARDING_QUESTIONS.length;

/**
 * The FIRST-RUN flow in order — the language choice, then the founder's SEVEN approved screens
 * (design pack 2026-09-14,
 * transcribed as `04_Product/UX/Onboarding_Approved_Screens_Build_Spec_2026-09-15.md`).
 *
 * ── WHAT THIS LIST IS ──────────────────────────────────────────────────────────────────────────
 *
 * It is the whole first run, and nothing else is. Read it rather than any comment that claims to
 * describe the sequence; the two have disagreed before and the comment lost.
 *
 * ── WHAT CHANGED, AND WHY ──────────────────────────────────────────────────────────────────────
 *
 * The previous order (`language → acknowledge → promise → personalization → supportIntro → intro`)
 * was three screens of what we believe stacked in front of one screen of preparation. The approved
 * pack folds all of that into TWO screens — a welcome and a purpose — and spends the room it saves
 * on the two moments that were missing entirely: the **account**, which now comes before the
 * conversation and is mandatory (D104), and the **handoff + first Journey**, which give the person
 * somewhere to arrive instead of being dropped at Home.
 *
 * ── THE TWO NAMES THAT ARE NOT SCREENS IN THIS ROUTE ───────────────────────────────────────────
 *
 * `conversation` lives on `/coach` and `handoff`/`firstJourney` are reached from there too, because
 * the first-run gate closes when the coach finishes building. They are still steps: a step is a
 * RESUME POINT before it is a screen, and a device that closes mid-conversation has to come back to
 * the launcher rather than to the top of the flow.
 *
 * ── WHY `language` IS FIRST AND IS NOT ONE OF THE SEVEN (founder, 2026-09-15) ──────────────────
 *
 * The approved pack has no language screen. That is a gap in the pack, not a decision to drop it,
 * and the founder's reasoning settles it: **a person may not read English at all.** If the first
 * thing they meet is an English welcome, they cannot understand the onboarding well enough to go
 * looking for a language setting — so the choice cannot wait for Settings and cannot sit behind any
 * other screen. It is STEP ZERO: before screen 1, understandable without reading either language
 * (each option names itself in its own script), and it re-renders the flow in the chosen language
 * the same frame.
 *
 * It is deliberately NOT a pager dot. The pack has seven screens and the dots must read as seven —
 * see {@link ONBOARDING_PAGER_STEPS}. A language choice is the door, not the first room.
 *
 * Settings › Language is unchanged and reachable forever; this adds a moment, it removes nothing.
 */
export const ONBOARDING_STEP_ORDER: readonly OnboardingStep[] = [
  'language',
  'welcome',
  'purpose',
  'prepare',
  // BEFORE the conversation, and mandatory (D104). The conversation is saved against a real
  // identity or it is not had yet; there is no skip here and no anonymous path.
  'account',
  'conversation',
  'handoff',
  'firstJourney',
];

/**
 * The steps the PAGER counts — the seven approved screens, and only those.
 *
 * Derived from the order rather than written out, so a screen cannot be added to the flow and
 * missed in the dots. `language` is excluded for the reason given above: it precedes the seven.
 */
export const ONBOARDING_PAGER_STEPS: readonly OnboardingStep[] = ONBOARDING_STEP_ORDER.filter(
  (step) => step !== 'language',
);

/**
 * The steps that are no longer part of the first-run sequence but are still real pages: the nine
 * questions (reachable from the Tools tab), the profile page, the three product-promise screens the
 * approved pack replaced, and the tail that moved after the first Journey.
 *
 * This exists for ONE reason, and it is a live one: people are mid-flow on the shipped build right
 * now. A device that resumes at `q4`, or at `supportIntro`, after this update must not be handed a
 * step the order no longer contains — `nextStep` would return that same step forever and the person
 * would be stuck on a page with no way out. {@link resolveResumeStep} is what prevents that.
 */
const RETIRED_FIRST_RUN_STEPS: readonly OnboardingStep[] = [
  'acknowledge',
  'promise',
  'personalization',
  'supportIntro',
  'intro',
  'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9',
  'completion',
  'coachMemory',
  'notifications',
  // The profile page (founder, 2026-09-03). Everything on it was already pre-filled and confirmable
  // in one tap, and it was still a form standing between somebody and the reason they opened the
  // app — none of which has to be answered before the conversation. Its contents are now the Steps
  // of the "Getting to know PushApp" Journey (core/onboarding/introJourney), so the same fields are
  // asked for on Home, in the shape the product actually uses, by a Journey that can be ignored.
  // The PAGE still exists and is unchanged; it is simply no longer part of the first run.
  'personalInfo',
];

/**
 * Where a retired step lands in the approved seven — by MEANING, not by index.
 *
 * Somebody paused half-way through the old flow did not pause at "position 4"; they paused at a
 * particular moment, and the honest resume point is the new screen that does the same job. So the
 * three product-promise screens land on the one screen that replaced all three, the conversation
 * preparation lands on the new preparation, and anything that was a form or an ask lands on the
 * preparation too — because the next thing that should happen to them is the conversation, and
 * `prepare` is the last screen before the account gate that now guards it.
 *
 * Nobody is ever mapped PAST the account screen. A person who was mid-questionnaire yesterday has
 * no session today, and D104 says the conversation does not start without one.
 */
const RETIRED_STEP_LANDING: Partial<Record<OnboardingStep, OnboardingStep>> = {
  // "The problem was never that you did not care enough" — the screen that named the difficulty.
  // Its job is the welcome's kicker now.
  acknowledge: 'welcome',
  promise: 'purpose',
  personalization: 'purpose',
  supportIntro: 'purpose',
  intro: 'prepare',
};

/**
 * Where a persisted resume point should actually land.
 *
 * A step still in the flow resumes exactly where it was. Anything the flow no longer contains is
 * mapped through {@link RETIRED_STEP_LANDING}, and anything with no mapping falls to **prepare** —
 * the last screen before the account gate, which is the honest place to put somebody who was
 * part-way through a sequence that no longer exists. Their answers are kept either way (they are
 * still valid signals; nothing is discarded), they are simply not asked for the rest.
 */
export function resolveResumeStep(step: OnboardingStep | undefined): OnboardingStep {
  if (!step) return ONBOARDING_STEP_ORDER[0];
  if (ONBOARDING_STEP_ORDER.includes(step)) return step;
  const mapped = RETIRED_STEP_LANDING[step];
  if (mapped) return mapped;
  return RETIRED_FIRST_RUN_STEPS.includes(step) ? 'prepare' : ONBOARDING_STEP_ORDER[0];
}

/**
 * 1-based position of a step among the SEVEN approved screens, for the pager dots.
 *
 * 0 — which the scaffold reads as "no pager" — for the language choice and for every retired page,
 * because neither is one of the seven.
 */
export function stepPosition(step: OnboardingStep): number {
  return ONBOARDING_PAGER_STEPS.indexOf(step) + 1;
}

/** The config for a question id, or undefined for a non-question step. */
export function questionById(id: string): OnboardingQuestion | undefined {
  return ONBOARDING_QUESTIONS.find((q) => q.id === id);
}

/** Whether a step is one of the six questions. */
export function isQuestionStep(step: OnboardingStep): step is OnboardingQuestionId {
  return questionById(step) !== undefined;
}

/** 1-based position of a question for "Question X of 6" (PRD §8); 0 for a non-question step. */
export function questionNumber(step: OnboardingStep): number {
  const i = ONBOARDING_QUESTION_IDS.indexOf(step as OnboardingQuestionId);
  return i < 0 ? 0 : i + 1;
}

/** The next page in the linear flow (clamped at the end). Branches (e.g. "Maybe later") are the caller's. */
export function nextStep(step: OnboardingStep): OnboardingStep {
  const i = ONBOARDING_STEP_ORDER.indexOf(step);
  return i < 0 || i === ONBOARDING_STEP_ORDER.length - 1 ? step : ONBOARDING_STEP_ORDER[i + 1];
}

/** The previous page in the linear flow (clamped at the start). */
export function prevStep(step: OnboardingStep): OnboardingStep {
  const i = ONBOARDING_STEP_ORDER.indexOf(step);
  return i <= 0 ? step : ONBOARDING_STEP_ORDER[i - 1];
}
