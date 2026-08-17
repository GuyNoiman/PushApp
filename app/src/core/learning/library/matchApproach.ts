/**
 * matchApproach — which of the three recurring approaches to build for THIS person.
 *
 * This is the matching layer's cold start (Plan_Library_and_Learning_PRD §7.5), and it is the first
 * thing in the app that has ever read the onboarding answers. Onboarding asks, in the user's own
 * first minutes, what tends to help them and what tends to get in their way; the answers were
 * stored, a summary was built for the coach, and `getOnboardingCoachSummary()` was then called by
 * nothing at all. Every plan the app has ever produced ignored them.
 *
 * WHAT IT IS NOT: a personality label, a score, or a prediction. It maps a stated obstacle onto the
 * approach designed for that obstacle, which is a hypothesis the user can overrule in one tap. The
 * moment there are real outcomes to learn from, this becomes the prior rather than the answer
 * (§7.2), and nothing here should ever grow into a classification of the user.
 *
 * WHY IT IS DETERMINISTIC AND EXPLAINS ITSELF: the `signal` it returns is the onboarding answer
 * that decided it. It exists so that the choice can be shown, questioned and — when the learning
 * loop eventually contradicts it — measured. A matcher that cannot say why it chose cannot be
 * checked, and one that cannot be checked will quietly drift toward recommending whatever is easy.
 *
 * SECURITY-PRIVACY G1: reads only the coarse option IDs. The free-text fields (`helpOther`,
 * `frictionOther`, `outcome`, `capacityConstraints`) are ON-DEVICE-ONLY raw signal and are
 * deliberately NOT read here — the returned approach travels outward eventually, and nothing that
 * reaches it may derive from the user's own words.
 *
 * Pure TypeScript — no React, no i18n, no clock reads, no vendor imports.
 */
import type { CoachOnboardingSummary } from '../../onboarding/model';
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
 * Which approach each onboarding answer argues for. CONFIG-BEFORE-CODE: this table IS the
 * hypothesis, written where it can be read and argued with rather than buried in branches.
 *
 *  - `tooMuchAtOnce` / `smallSteps` → start smaller than feels worth it. The user has told us that
 *    scale is what breaks them; the other two approaches do not change scale at all.
 *  - `lifeBusy` / `excitementFades` → attach it to an existing routine. Both are failures of
 *    OCCASION rather than of will: the action never found a moment in the day, or the moment
 *    stopped being motivating. An anchor supplies the occasion.
 *  - `noClearPlan` / `clearPlan` → prepare in advance. The user is telling us the friction is the
 *    deciding, not the doing; this approach moves all the deciding to the start.
 *
 * Answers with no entry (`seeProgress`, `supportClose`, `flexibility`, `dontKnow` …) genuinely do
 * not discriminate between these three, and are left out rather than assigned somewhere plausible.
 */
const SIGNAL_TO_APPROACH: Readonly<Record<string, RecurringApproachId>> = {
  // Q5 — what tends to get in the way.
  tooMuchAtOnce: 'tiny_start',
  lifeBusy: 'anchor',
  excitementFades: 'anchor',
  noClearPlan: 'prepare',
  // Q4 — what tends to help.
  smallSteps: 'tiny_start',
  clearPlan: 'prepare',
};

/**
 * Choose an approach from the onboarding profile.
 *
 * FRICTION OUTRANKS HELP, deliberately: what breaks someone is a better predictor than what they
 * believe helps them, and it is the thing they answered from experience rather than from
 * preference. Within each group the user's own answer order is respected — the first one they
 * picked is the one they thought of first.
 *
 * A null/empty profile returns the safe default with `signal: 'default'`. That is not a failure
 * case: most users at cold start are exactly this, and a plan built on no information must not
 * pretend otherwise.
 */
export function chooseRecurringApproach(
  profile: CoachOnboardingSummary | null | undefined,
): ApproachMatch {
  if (!profile) return { approach: DEFAULT_RECURRING_APPROACH, signal: 'default' };

  for (const id of profile.friction ?? []) {
    const approach = SIGNAL_TO_APPROACH[id];
    if (approach) return { approach, signal: id };
  }
  for (const id of profile.help ?? []) {
    const approach = SIGNAL_TO_APPROACH[id];
    if (approach) return { approach, signal: id };
  }
  return { approach: DEFAULT_RECURRING_APPROACH, signal: 'default' };
}
