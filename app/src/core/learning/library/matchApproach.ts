/**
 * matchApproach — the PROFILE half of choosing which version of a Journey this person gets.
 *
 * This is the matching layer's cold start (Plan_Library_and_Learning_PRD §7.5), and it was the first
 * thing in the app that ever read the onboarding answers: they were collected, summarised for the
 * coach, and `getOnboardingCoachSummary()` was then called by nothing at all.
 *
 * WHAT CHANGED WITH D62. The mapping "this answer means that approach" used to live here, in code,
 * as a table this file owned. It now lives in the JOURNEY that depends on it (`./definitions`),
 * because nothing about what separates two versions is fixed in advance — one Journey's versions
 * differ on friction, another's on certainty, another's on urgency, and a table here would have to
 * know all of them. What is left in this file is the one thing that is genuinely about the USER and
 * not about any Journey: **the order in which their answers are trusted.**
 *
 * FRICTION OUTRANKS HELP, deliberately: what breaks someone is a better predictor than what they
 * believe helps them, and it is the thing they answered from experience rather than from preference.
 * Within each group the user's own answer order is respected — the first one they picked is the one
 * they thought of first. That ordering is what {@link ./selectVariant} reads as priority, so a
 * Journey never has to re-state it.
 *
 * WHAT IT IS NOT: a personality label, a score, or a prediction. It hands a Journey the ids the user
 * gave us, in order; the Journey decides what, if anything, they mean to it. The moment there are
 * real outcomes to learn from, the rating becomes the tie-break (§7.2) — and never more than that,
 * so a thin sample can never overrule something the user actually said.
 *
 * SECURITY-PRIVACY G1: reads only the coarse option IDs. The free-text fields (`helpOther`,
 * `frictionOther`, `outcome`, `capacityConstraints`) are ON-DEVICE-ONLY raw signal and are
 * deliberately NOT read — the chosen variant travels outward eventually, and nothing that reaches it
 * may derive from the user's own words.
 *
 * Pure TypeScript — no React, no i18n, no clock reads, no vendor imports.
 */
import type { CoachOnboardingSummary } from '../../onboarding/model';
import { RECURRING_GENERIC } from './definitions';
import type { ProfileSignalId } from './journeyDefinition';
import { selectVariant, type VariantChoice, type VariantContext } from './selectVariant';
import { DEFAULT_RECURRING_APPROACH, type RecurringApproachId } from './recurringApproaches';

/** The chosen approach, and the onboarding answer that chose it. */
export interface ApproachMatch {
  approach: RecurringApproachId;
  /**
   * The option ID that decided it, or `'default'` when nothing in the profile pointed anywhere —
   * which is the honest answer for a user who skipped onboarding, and must never be dressed up as
   * a match.
   */
  signal: string;
}

/**
 * The profile as an ORDERED bag of ids, most telling first — the only shape the selector accepts,
 * and the reason it needs no taxonomy of signal types (D62 §3).
 *
 * The order IS the priority: what breaks them, then what helps them, then the three matching
 * questions that describe how they like to work (Q7 starting mode, Q8 structure, Q9 challenge).
 * The last three are ranking signals rather than lived failures, which is why they sit at the end
 * and can only decide a question the first two left open.
 *
 * Q1 (areas), Q2/Q3 (the goal itself and where they stand) and Q6 (capacity) are deliberately
 * absent: the first two are about WHAT they want rather than how they work, and capacity already
 * reaches the plan as real scheduling constraints rather than as a hint.
 */
export function profileSignals(
  profile: CoachOnboardingSummary | null | undefined,
): ProfileSignalId[] {
  if (!profile) return [];
  return [
    ...(profile.friction ?? []),
    ...(profile.help ?? []),
    ...(profile.startingMode ? [profile.startingMode] : []),
    ...(profile.structure ? [profile.structure] : []),
    ...(profile.challenge ? [profile.challenge] : []),
  ];
}

/**
 * Choose the version of the generic recurring Journey for this person — the full choice, with the
 * Journey + version ids and the reason.
 *
 * `answers` are the user's own answers to THIS Journey's declared questions and outrank the profile;
 * `ratings` are observed outcomes and are the weakest rung. A null/empty profile with nothing asked
 * returns the declared default, reported as `'default'`: most users at cold start are exactly this,
 * and a plan built on no information must not pretend otherwise.
 */
export function chooseRecurringVariant(
  profile: CoachOnboardingSummary | null | undefined,
  context: Omit<VariantContext, 'signals'> = {},
): VariantChoice {
  return selectVariant(RECURRING_GENERIC, { ...context, signals: profileSignals(profile) });
}

/**
 * The same choice, reduced to the approach the plan builder needs. Kept as its own export because
 * most callers want only "which of the three do I build", and because it is the signature every
 * existing caller already uses.
 */
export function chooseRecurringApproach(
  profile: CoachOnboardingSummary | null | undefined,
  context: Omit<VariantContext, 'signals'> = {},
): ApproachMatch {
  const choice = chooseRecurringVariant(profile, context);
  return {
    approach:
      choice.variant.build.kind === 'recurring'
        ? choice.variant.build.approach
        : DEFAULT_RECURRING_APPROACH,
    signal: choice.signal,
  };
}
