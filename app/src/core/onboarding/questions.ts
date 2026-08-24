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
 * The whole flow in order (PRD §2). `notifications` is the terminal soft pre-prompt AFTER
 * `completion` (K1): "Maybe later" still converges on `completion` before the ask, and the
 * permission request never blocks finishing onboarding.
 */
export const ONBOARDING_STEP_ORDER: readonly OnboardingStep[] = [
  'language',
  'personalInfo',
  'intro',
  'q1',
  'q2',
  'q3',
  'q4',
  'q5',
  'q6',
  'q7',
  'q8',
  'q9',
  'completion',
  'coachMemory',
  'notifications',
];

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
