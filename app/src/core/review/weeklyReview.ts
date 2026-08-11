/**
 * weeklyReview — the PURE analysis engine for Weekly Review (Weekly_Review_PRD, D40/D41). It turns
 * one closed week's evidence into a {@link WeeklyReview}: a past-week SUMMARY, a next-week plan that
 * is NEVER empty, and an OPTIONAL per-Journey change PROPOSAL. Deterministic — NO LLM this slice
 * (the CoachNarrator seam is reserved for future narration); the proposal reuses the on-device
 * {@link replan} verbatim.
 *
 * Three product rules are enforced here, straight from the PRD:
 *  - §7 frozen Journeys are NAMED in the summary but NEVER counted as non-completion and NEVER
 *    proposed changes; completed/abandoned Journeys are likewise excluded from next-week changes;
 *  - §8 "Never an empty next week" — the fallback chain remaining-Steps → coach-CTA → Dream-based
 *    suggestion, taking the FIRST that applies, so the user is always kept in motion;
 *  - §9/§11 the proposal is a forward-only diff (the AdaptivePlanner only ever touches not-done
 *    Steps and schedules from `now`) the user must approve before it applies.
 *
 * It NEVER mutates a Journey, touches the bus, or persists — AppCore owns those. `now`, the review
 * `id`, and the reviewed-week window are all injected so it is fully deterministic under test.
 *
 * Pure TS — no React, no vendor imports.
 */
import type { AdaptivePolicy } from '../config/adaptivePolicy';
import { replan } from '../learning/AdaptivePlanner';
import type { PlanConstraints } from '../learning/types';
import { deriveStepStatus } from '../status/stepStatus';
import type {
  Dream,
  InsightModel,
  Journey,
  ReasonEntry,
  WeeklyReview,
  WeeklyReviewJourneyProposal,
  WeeklyReviewNextWeek,
  WeeklyReviewSummary,
} from '../types/domain';
import { resolveJourneyStatus } from '../util/journeyStatus';
import { weekKey } from '../util/week';

/** Everything the pure builder needs; AppCore assembles it from AppState + the BehaviorModel. */
export interface WeeklyReviewInput {
  journeys: Journey[];
  dreams: Dream[];
  reasonLog: readonly ReasonEntry[];
  /** The on-device derived model (drives the AdaptivePlanner). */
  insight: InsightModel;
  /** Per-Journey planning constraints — AppCore passes `deriveConstraints(j, schedulingPrefs)`. */
  constraintsFor: (journey: Journey) => PlanConstraints;
  /** Immutable review-period id (AppCore mints it via createId). */
  id: string;
  /** Epoch ms of the start / exclusive end of the reviewed (closed) week (from the week gate). */
  windowStart: number;
  windowEnd: number;
  /** Optional AdaptivePolicy override — defaults to the shipped policy inside replan. */
  policy?: AdaptivePolicy;
}

/** A Journey the review may propose changes for: ACTIVE (not frozen/completed/abandoned). */
function isActive(journey: Journey): boolean {
  return !journey.completedAt && resolveJourneyStatus(journey) === 'active';
}

/**
 * The past-week SUMMARY (PRD §8). Counts the reviewed week's Steps across ACTIVE Journeys by their
 * derived status; a Step is attributed to the week by its `plannedFor` (falling back to
 * `lastCheckInAt` for an unscheduled Step that was completed). Frozen Journeys are NEVER counted —
 * only named (§7) — and Journeys that completed in-window get a celebratory mention.
 */
export function summarizeWeek(
  journeys: Journey[],
  reasonLog: readonly ReasonEntry[],
  windowStart: number,
  windowEnd: number,
): WeeklyReviewSummary {
  const summary: WeeklyReviewSummary = {
    completed: 0,
    partial: 0,
    notCompleted: 0,
    unreported: 0,
    frozenJourneyTitles: [],
    completedJourneyTitles: [],
  };

  const inWindow = (ms: number | undefined): boolean =>
    ms != null && ms >= windowStart && ms < windowEnd;

  for (const journey of journeys) {
    const status = resolveJourneyStatus(journey);
    if (status === 'frozen') {
      summary.frozenJourneyTitles.push(journey.title);
      continue; // never counted as non-completion (§7)
    }
    if (journey.completedAt != null && inWindow(journey.completedAt)) {
      summary.completedJourneyTitles.push(journey.title);
    }
    // Count Steps only for ACTIVE / just-completed Journeys; an abandoned Journey is out of scope.
    if (status !== 'active' && status !== 'completed') continue;
    for (const step of journey.steps) {
      if (step.dropped) continue;
      const occurrence = step.plannedFor ?? step.lastCheckInAt;
      if (!inWindow(occurrence)) continue;
      switch (deriveStepStatus(step, reasonLog)) {
        case 'completed':
          summary.completed += 1;
          break;
        case 'partially_completed':
          summary.partial += 1;
          break;
        case 'not_completed':
          summary.notCompleted += 1;
          break;
        default:
          summary.unreported += 1;
      }
    }
  }
  return summary;
}

/**
 * The "Never an empty next week" plan (PRD §8), taking the FIRST branch that applies:
 *  1. remaining (not-done, not-dropped) Steps across ACTIVE Journeys → `steps`;
 *  2. else, if any active Journey exists → `coachCta` (hand off to the Coach to build a plan);
 *  3. else (no active Journeys at all) → `dreamSuggestion` from an existing Dream, preferring one
 *     not yet addressed by an active Journey. If there is no Dream either, fall back to `coachCta`
 *     so the result is never empty and never fabricates a Journey/Step.
 */
export function planNextWeek(journeys: Journey[], dreams: Dream[]): WeeklyReviewNextWeek {
  const active = journeys.filter(isActive);
  const remaining = active.reduce(
    (n, j) => n + j.steps.filter((s) => !s.done && !s.dropped).length,
    0,
  );
  if (remaining > 0) return { kind: 'steps', stepCount: remaining };
  if (active.length > 0) return { kind: 'coachCta' };

  if (dreams.length > 0) {
    // "Addressed" = linked to ANY Journey (paused/finished counts) — a Dream whose only Journeys
    // are done/abandoned still reads as one the user has taken on, so we prefer to suggest a
    // genuinely NOT-yet-addressed Dream and phrase the chosen one honestly.
    const addressedIds = new Set(journeys.flatMap((j) => (j.dreamId ? [j.dreamId] : [])));
    const unaddressed = dreams.find((d) => !addressedIds.has(d.id));
    const chosen = unaddressed ?? dreams[0];
    return { kind: 'dreamSuggestion', dreamTitle: chosen.title, dreamAddressed: addressedIds.has(chosen.id) };
  }
  return { kind: 'coachCta' };
}

/**
 * The OPTIONAL change proposal (PRD §7/§8): run the on-device {@link replan} for each ACTIVE
 * Journey and keep only the ones that actually changed. Frozen / completed / abandoned Journeys are
 * excluded entirely. Forward-only by construction — replan touches only not-done Steps and
 * schedules from `now`.
 */
export function computeJourneyProposals(
  journeys: Journey[],
  insight: InsightModel,
  constraintsFor: (journey: Journey) => PlanConstraints,
  now: number,
  policy?: AdaptivePolicy,
): WeeklyReviewJourneyProposal[] {
  const proposals: WeeklyReviewJourneyProposal[] = [];
  for (const journey of journeys) {
    if (!isActive(journey)) continue;
    const result = replan(journey, insight, constraintsFor(journey), policy, now);
    if (!result.changed) continue;
    proposals.push({
      journeyId: journey.id,
      journeyTitle: journey.title,
      adjustments: result.adjustments,
      stepAdjustments: result.stepAdjustments,
      atRisk: result.atRisk,
    });
  }
  return proposals;
}

/** Build the full {@link WeeklyReview} for one closed week. Pure — no mutation, no side effects. */
export function buildWeeklyReview(input: WeeklyReviewInput, now: number): WeeklyReview {
  return {
    id: input.id,
    weekKey: weekKey(input.windowStart),
    generatedAt: now,
    summary: summarizeWeek(input.journeys, input.reasonLog, input.windowStart, input.windowEnd),
    nextWeek: planNextWeek(input.journeys, input.dreams),
    proposals: computeJourneyProposals(
      input.journeys,
      input.insight,
      input.constraintsFor,
      now,
      input.policy,
    ),
    status: 'pending',
  };
}
