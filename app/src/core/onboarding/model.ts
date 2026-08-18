/**
 * Onboarding model (Initial Onboarding Questionnaire, K2 — Onboarding_Questionnaire_PRD).
 *
 * Pure TypeScript data shapes for the first-run flow: the ordered `OnboardingStep`s, the
 * six question ids, the on-device `OnboardingAnswers` the Coach later reads as its opening
 * context (PRD §9), and the derived `CoachOnboardingSummary` the handoff seam exposes.
 *
 * PRIVACY (PRD §10): structured selections are private adaptation preferences and free text is
 * sensitive raw disclosure — both stay ON DEVICE (they ride the existing encrypted AppState blob),
 * are never social/analytics, and are cascade-deleted/exported under the account rules. Nothing
 * here is sent to the cloud; the Coach receives only the minimum derived summary, under the same
 * live-Coach gates as any Coach use. No React, no UI, no vendor imports.
 */

/**
 * Every page of the first-run flow, in order. `completion` recaps the starting point; the final
 * `notifications` soft pre-prompt then opens the first Coach conversation (permission is optional
 * and never blocks completion — K1).
 */
export type OnboardingStep =
  | 'language'
  | 'personalInfo'
  | 'intro'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'q5'
  | 'q6'
  | 'q7'
  | 'q8'
  | 'q9'
  | 'completion'
  | 'notifications';

/**
 * The nine questions (PRD §6; Q7–Q9 added 2026-08-18 alongside D62). Every question is skippable;
 * none is a diagnosis or score.
 */
export type OnboardingQuestionId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'q9';

/**
 * The user's answers, stored ON DEVICE (PRD §9/§10). Keyed generically by question id so the flow
 * container and the Coach-handoff deriver stay data-driven:
 *  - `selections` — chosen option ids per choice question (single = one id; multi = up to its limit).
 *  - `freeText`   — optional free text per question: Q2's outcome, an "Other" clarification, or Q6's
 *    optional constraints. Kept verbatim in the language/script entered (PRD §3) — never translated.
 *  - `skipped`    — questions the user explicitly skipped (advances progress, never guilt — PRD §8).
 *  - `version`    — provenance so a rebuilt summary knows which question set produced it.
 */
export interface OnboardingAnswers {
  version: number;
  selections: Partial<Record<OnboardingQuestionId, string[]>>;
  freeText: Partial<Record<OnboardingQuestionId, string>>;
  skipped: OnboardingQuestionId[];
}

/**
 * The minimal, named summary the Coach handoff reads (PRD §9). Derived from {@link OnboardingAnswers}
 * — hypothesis-shaped, never a personality label. Absent fields mean "skipped / not answered"; the
 * `skipped` list + `version` carry provenance so the Coach can ask a grounded opening question rather
 * than state a conclusion.
 */
export interface CoachOnboardingSummary {
  version: number;
  /** Q1 — desired life areas (option ids), plus any "Something else" text. */
  areas: string[];
  areasOther?: string;
  /** Q2 — the user's optional desired-outcome text. */
  outcome?: string;
  /** Q3 — current starting-point category (option id), plus any own-words text. */
  startingPoint?: string;
  startingPointOther?: string;
  /** Q4 — preferred-help categories (a preference hypothesis, not a binding setting). */
  help: string[];
  helpOther?: string;
  /** Q5 — likely-friction categories + optional clarification (tentative hypothesis only). */
  friction: string[];
  frictionOther?: string;
  /** Q6 — realistic-capacity category + optional constraints the Coach should account for. */
  capacity?: string;
  capacityConstraints?: string;
  /**
   * Q7–Q9 — how this person likes to WORK, as opposed to what they want (Q1–Q3) or what has broken
   * them before (Q5). Added with D62, and each earns its place by the partner's own rule: if
   * changing the answer would not change which Journey or which of its versions we build, the
   * question does not belong in core onboarding.
   *
   *  - `startingMode` — clarity first, or action first.
   *  - `structure`    — how much structure actually helps them.
   *  - `challenge`    — how much of a push they want RIGHT NOW (a statement about this season of
   *    their life, never a trait, and never carried forward as one).
   *
   * They reach a plan as ranking signals in an OPEN set (D62 §3): a Journey declares which of them
   * it reads, and one that reads none of them is unaffected.
   */
  startingMode?: string;
  structure?: string;
  challenge?: string;
  /** Questions the user skipped (PRD §9 skipped/unknown markers). */
  skipped: OnboardingQuestionId[];
}
