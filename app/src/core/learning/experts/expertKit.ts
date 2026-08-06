/**
 * expertKit — tiny shared helpers for the first-cut {@link DomainExpert} implementations
 * (SX.1). Keeps each expert focused on its DOMAIN CONTENT (Milestone arc, Step titles, risks)
 * rather than repeating the same materialization boilerplate. Mirrors the conventions of the
 * reference {@link GeneralExpert}: fresh copies out (no shared-catalog mutation), difficulty
 * derived from Milestone weight, minutes derived from the cadence hint.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type {
  FeasibilityAssessment,
  FeasibilityVerdict,
  InterviewAnswers,
  PlanStructure,
  ProposedMilestone,
  StepTemplate,
} from '../DomainExpert';
import type { GoalInput, PlanConstraints } from '../types';

/** Clamp a Milestone weight to a Step difficulty (1..5), same rule as {@link GeneralExpert}. */
export function difficultyFor(weight?: number): number {
  return Math.min(5, Math.max(1, weight ?? 1));
}

/**
 * Base Step length in minutes from the pace hint — shorter daily reps, longer weekly blocks.
 * `daily`/`weekly` are the domain's own two anchors; the hint (or the isHabit default) picks one.
 */
export function minutesFor(
  cadence: GoalInput['cadence'],
  isHabit: boolean,
  daily: number,
  weekly: number,
): number {
  const c = cadence ?? (isHabit ? 'daily' : 'weekly');
  return c === 'daily' ? daily : weekly;
}

/** Return fresh copies of a Milestone catalog so callers can't mutate the shared source. */
export function copyMilestones(catalog: readonly ProposedMilestone[]): ProposedMilestone[] {
  return catalog.map((m) => ({ ...m }));
}

/** Materialize a list of Step titles into templates of a uniform length + difficulty. */
export function stepsFrom(
  titles: readonly string[],
  estimatedMinutes: number,
  difficulty: number,
): StepTemplate[] {
  return titles.map((title) => ({ title, estimatedMinutes, difficulty }));
}

// ── Interview helpers (SX redesign) ────────────────────────────────────────────

/** A starting level derived from a baseline answer: 0 novice · 1 middle · 2 experienced. */
export type StartLevel = 0 | 1 | 2;

/**
 * The trimmed answer for a question id; '' when unanswered. A multi-select answer (`string[]`)
 * coerces to its FIRST value — single-intent reads (baseline / milestones) are never multi-select,
 * so this only guards against a stray array.
 */
export function answerFor(answers: InterviewAnswers, id: string): string {
  const value = answers[id];
  if (Array.isArray(value)) return (value[0] ?? '').trim();
  return (value ?? '').trim();
}

/**
 * Map an ORDERED baseline answer (novice → experienced) to a {@link StartLevel}. A free-text
 * ("Other") or unmatched answer returns the middle level 1 — we assume neither extreme.
 */
export function levelFromOrderedOptions(answer: string, ordered: readonly string[]): StartLevel {
  const i = ordered.indexOf(answer.trim());
  if (i < 0 || ordered.length <= 1) return 1;
  const frac = i / (ordered.length - 1);
  return frac <= 0.34 ? 0 : frac >= 0.67 ? 2 : 1;
}

/** Ease Step difficulty for novices, raise it for the experienced; clamp to 1..5. */
export function difficultyForLevel(weight: number | undefined, level: StartLevel): number {
  return Math.min(5, Math.max(1, (weight ?? 1) + level - 1));
}

/** Scale session length by level — shorter for novices, longer for the experienced. */
export function minutesForLevel(baseMinutes: number, level: StartLevel): number {
  const scaled = level === 0 ? baseMinutes * 0.7 : level === 2 ? baseMinutes * 1.2 : baseMinutes;
  return Math.max(1, Math.round(scaled));
}

/**
 * Grade a goal on ONE honest, shared scale from a starting level + weekly time. A novice with
 * little time set aside is the least likely to reach an ambitious goal; an experienced user
 * with ample time, the most. `comfortable` is the domain's "enough weekly minutes" threshold.
 */
export function assessFrom(
  level: StartLevel,
  constraints: PlanConstraints,
  comfortable: number,
  notes: Record<FeasibilityVerdict, string>,
): FeasibilityAssessment {
  const time = constraints.weeklyAvailabilityMinutes;
  const timePenalty = time <= 0 ? 2 : time < comfortable ? 1 : 0;
  const score = timePenalty + (level === 0 ? 1 : 0) - (level === 2 ? 1 : 0);
  const verdict: FeasibilityVerdict =
    score <= 0 ? 'reasonable' : score <= 2 ? 'ambitious' : 'tooAmbitious';
  return { verdict, note: notes[verdict] };
}

/** Whether the user wants intermediate Milestones — false only for the explicit "keep simple" choice. */
export function usesMilestonesFrom(
  answers: InterviewAnswers,
  milestonesId: string,
  keepSimpleOption: string,
): boolean {
  const a = answerFor(answers, milestonesId);
  if (!a) return true; // default: staged
  return a !== keepSimpleOption;
}

/**
 * Build an answer-aware {@link PlanStructure} from a domain's Milestone arc + Step-title map.
 * Reflects the user's baseline: novices get easier, shorter Steps (and keep the gentle intro
 * Milestone); the experienced start harder (and skip it). When the user prefers no stages the
 * arc collapses to a single ongoing-practice Milestone.
 */
export function buildStructureFromArc(args: {
  goal: GoalInput;
  answers: InterviewAnswers;
  milestones: readonly ProposedMilestone[];
  stepTitles: Record<string, readonly string[]>;
  defaultTitles: readonly string[];
  baselineId: string;
  baselineOptions: readonly string[];
  dailyMinutes: number;
  weeklyMinutes: number;
  staged: boolean;
}): PlanStructure {
  const level = levelFromOrderedOptions(answerFor(args.answers, args.baselineId), args.baselineOptions);
  const base = minutesFor(args.goal.cadence, args.goal.isHabit, args.dailyMinutes, args.weeklyMinutes);
  const minutes = minutesForLevel(base, level);

  let arc: ProposedMilestone[];
  if (!args.staged) {
    // One ongoing practice — reuse the arc's final "sustain" Milestone as its content home.
    arc = [{ ...args.milestones[args.milestones.length - 1], weight: 1 }];
  } else {
    arc = args.milestones.map((m) => ({ ...m }));
    if (level === 2 && arc.length > 2) arc = arc.slice(1); // experienced skip the gentlest intro
  }

  const stepsByMilestone = arc.map((m) => {
    const titles = args.stepTitles[m.title] ?? args.defaultTitles;
    return stepsFrom(titles, minutes, difficultyForLevel(m.weight, level));
  });
  return { milestones: arc, stepsByMilestone };
}
