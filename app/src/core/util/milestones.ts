/**
 * milestones — the SINGLE pure read of WHERE a Journey (or one of its Steps) sits in its
 * {@link Milestone} arc, so Home, the Journeys card and the Journey detail can never report
 * different positions for the same Journey.
 *
 * They used to. Home read the real `journey.milestones`; the Journeys card derived a Milestone
 * count from the STEP count (`min(4, steps)`), so a Journey with 3 Milestones and 8 Steps read
 * "Milestone 1 of 3" on one screen and "Milestone 1 of 4" on the other — a number the user had
 * never seen or approved (Device QA 2026-08-17, A1). Milestones are a real domain object; a
 * position in the arc is only ever READ from it, never invented from Steps.
 *
 * A Journey with NO Milestones (manually built, or created before the Planner produced them) has
 * no position at all — every function here returns `undefined`, and each surface renders nothing.
 * Saying "Milestone 1 of 1" about an arc that does not exist is the same lie in a smaller number.
 *
 * Pure TS — no React, no vendor imports, no clock reads (Engineering Bible §19).
 */
import type { Journey, Step } from '../types/domain';

/** A position inside a Journey's Milestone arc: "Milestone {current} of {total}", 1-based. */
export interface MilestonePosition {
  /** 1-based position in the arc ({@link Milestone.order} + 1). */
  current: number;
  /** How many Milestones the Journey has — the REAL count, never a Step count. */
  total: number;
}

/**
 * The Milestone a given Step belongs to. `undefined` when the Journey has no Milestones, when the
 * Step is not placed in one, or when it points at a Milestone the Journey no longer has (a replan
 * can drop one) — in every case there is nothing honest to show. Accepts an undefined Journey so a
 * caller resolving one from a snapshot map can hand the result straight over.
 */
export function milestoneOfStep(
  journey: Journey | undefined,
  step: Step,
): MilestonePosition | undefined {
  const milestones = journey?.milestones;
  if (!milestones?.length || !step.milestoneId) return undefined;
  const milestone = milestones.find((m) => m.id === step.milestoneId);
  if (!milestone) return undefined;
  return { current: milestone.order + 1, total: milestones.length };
}

/**
 * The Milestone the Journey as a whole is IN: the earliest one that still holds unfinished work,
 * which is exactly the Milestone {@link milestoneOfStep} reports for the next Step the user has to
 * do — that shared definition is what keeps Home and the Journeys card in step.
 *
 * Once every placed Step is done the position is the LAST Milestone reached (a completed Journey
 * therefore reads "Milestone N of N"). Dropped Steps are out of scope and never counted, like every
 * other progress read. `undefined` when the Journey has no Milestones, or when no Step of it is
 * placed in one (an arc nothing sits in cannot say where the user is).
 */
export function currentMilestone(journey: Journey | undefined): MilestonePosition | undefined {
  const total = journey?.milestones?.length ?? 0;
  if (!journey || total === 0) return undefined;

  let firstOpen: number | undefined;
  let lastReached: number | undefined;
  for (const step of journey.steps) {
    if (step.dropped) continue;
    const position = milestoneOfStep(journey, step);
    if (!position) continue;
    lastReached = Math.max(lastReached ?? 0, position.current);
    if (!step.done) firstOpen = Math.min(firstOpen ?? position.current, position.current);
  }

  const current = firstOpen ?? lastReached;
  return current === undefined ? undefined : { current, total };
}
