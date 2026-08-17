/**
 * buildRecurring — turn a repeated goal into a plan made of the user's OWN action.
 *
 * This is the fix for the protein-shake failure, and it is deliberately small: pick an approach,
 * take its setup Steps, fill their `{ACTION}` holes with what the user actually asked for, and then
 * repeat the user's own sentence once per active day. No Milestone arc, no invented content, no
 * model call, no cost, works offline.
 *
 * WHAT THE USER SEES, for "drink a protein shake daily" on the `prepare` approach:
 *   1. Get everything drink a protein shake needs, and put it where you will see it
 *   2. Set up the spot where drink a protein shake is going to happen
 *   3. Drink a protein shake        ← every active day from here on
 *
 * The grammar of a filled sentence is imperfect, and that is a deliberate trade: a slightly awkward
 * sentence containing the user's real goal beats a fluent one about somebody else. The optional
 * phrasing pass (Stage 1 of the library PRD) smooths this when a model is available, and the plan is
 * already correct without it.
 *
 * SECURITY-PRIVACY G1: every title produced here contains the user's raw goal text and is
 * ON-DEVICE-ONLY. The approach ID is the only part that may ever travel outward.
 *
 * Pure TypeScript — no React, no i18n, no vendor imports, no clock reads.
 */
import type { PlanStructure, StepTemplate } from '../DomainExpert';
import type { GoalInput } from '../types';
import { fillSlots } from './slots';
import {
  DEFAULT_RECURRING_APPROACH,
  recurringApproach,
  toStepTemplate,
  type RecurringApproachId,
} from './recurringApproaches';

/** How the caller wants the repetitions laid out. */
export interface RecurringPlanInput {
  goal: GoalInput;
  /** Which of the three approaches to build. Unknown/absent falls back to the safe default. */
  approach?: RecurringApproachId;
  /**
   * How many times the user's own action is repeated — one per ACTIVE day, so the caller computes
   * it from the Journey length and the user's preferred days ({@link recurringOccurrences}).
   */
  occurrences: number;
  /** Minutes for one repetition of the action itself. */
  actionMinutes?: number;
  /** Relative difficulty 1..5 of one repetition. */
  actionDifficulty?: number;
}

/** A repetition is short by default — the action is meant to fit into a real day. */
const DEFAULT_ACTION_MINUTES = 10;
const DEFAULT_ACTION_DIFFICULTY = 2;

/**
 * A hard ceiling on repetitions, so a long Journey cannot mint an unbounded number of Steps. 200 is
 * well past any real plan (daily for eight months) and exists only to stop a bad `occurrences`
 * from filling the device.
 */
const MAX_OCCURRENCES = 200;

/**
 * Build the recurring {@link PlanStructure}: an EMPTY Milestone arc plus the unstaged Steps. The
 * empty arc is the point — every surface reads "no Milestones" and renders no stage line, rather
 * than showing the user a phase they never agreed to (Device QA A1).
 */
export function buildRecurringStructure(input: RecurringPlanInput): PlanStructure {
  const approach = recurringApproach(input.approach ?? DEFAULT_RECURRING_APPROACH)
    ?? recurringApproach(DEFAULT_RECURRING_APPROACH)!;
  const slots = { action: input.goal.title };

  const setup: StepTemplate[] = approach.setupSteps.map((authored) =>
    toStepTemplate(authored, fillSlots(authored.title, slots)),
  );

  // The spine: the user's own sentence, unchanged, once per active day. It is NOT built from a
  // template — there is nothing to add to "drink a protein shake" and every word we added would be
  // a word the user did not ask for.
  const repetitions = Math.max(0, Math.min(MAX_OCCURRENCES, Math.floor(input.occurrences)));
  const spine: StepTemplate[] = Array.from({ length: repetitions }, () => ({
    title: input.goal.title,
    estimatedMinutes: input.actionMinutes ?? DEFAULT_ACTION_MINUTES,
    difficulty: input.actionDifficulty ?? DEFAULT_ACTION_DIFFICULTY,
  }));

  return { milestones: [], stepsByMilestone: [], unstagedSteps: [...setup, ...spine] };
}

/**
 * How many repetitions fit in a Journey: one per ACTIVE day, minus the days the setup Steps take
 * (they are laid on the first active days, so they displace repetitions rather than doubling up).
 *
 * `preferredDays` empty means every day. Never negative, and never zero for a Journey with any
 * length at all — a plan whose setup eats every available day and leaves the user nothing to
 * actually do is worse than a plan with one repetition.
 */
export function recurringOccurrences(input: {
  durationDays: number;
  preferredDays: readonly number[];
  setupStepCount: number;
}): number {
  const activeDaysPerWeek = new Set(input.preferredDays.filter((d) => d >= 0 && d <= 6)).size || 7;
  const activeDays = Math.floor((Math.max(1, input.durationDays) * activeDaysPerWeek) / 7);
  return Math.max(1, activeDays - input.setupStepCount);
}
