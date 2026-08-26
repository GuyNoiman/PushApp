/**
 * motivation/facts — turns the app's own record into the handful of numbers a card may speak.
 *
 * Every value here was COUNTED, not estimated. That is the whole reason this slice needs no baseline
 * screen, no formula disclosure and no "this is an estimate" caveat: there is nothing to estimate.
 * A fact the app cannot answer right now comes back `undefined`, and an item that needs it is not
 * eligible — so a sentence can never be shown with a hole or an invention in it.
 *
 * Pure — the clock is passed in, nothing is read from a module, nothing is written.
 */
import type { AppState, Journey, Step } from '../types/domain';
import { effectiveStartAt, isRunning } from '../util/journeyStatus';
import { startOfWeek } from '../util/week';
import type { MotivationFacts } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A Step that still counts toward this Journey — not finished, not shed by the planner. */
const isLive = (s: Step) => !s.dropped;
const isDone = (s: Step) => s.done && !s.dropped;

/** Whole days between two instants, floored and never negative. */
const daysBetween = (from: number, to: number) => Math.max(0, Math.floor((to - from) / DAY_MS));

/**
 * The Journey a card should be ABOUT, when one stands out: the running Journey with the soonest
 * pending Step, and failing that the one that has been running longest. Both are the same answer to
 * the same question — which of these is this person actually in the middle of.
 */
function focusJourney(journeys: readonly Journey[], now: number): Journey | undefined {
  const running = journeys.filter(isRunning);
  if (running.length === 0) return undefined;

  const nextPlanned = (j: Journey) => {
    const times = j.steps
      .filter((s) => isLive(s) && !s.done && typeof s.plannedFor === 'number')
      .map((s) => s.plannedFor!)
      .filter((t) => t >= now);
    return times.length > 0 ? Math.min(...times) : Number.MAX_SAFE_INTEGER;
  };

  return [...running].sort((a, b) => {
    const byPlan = nextPlanned(a) - nextPlanned(b);
    if (byPlan !== 0) return byPlan;
    return a.createdAt - b.createdAt;
  })[0];
}

/**
 * Steps left in the Journey's CURRENT Milestone — the one the earliest unfinished Step belongs to.
 * Undefined when the Journey has no Milestones, or nothing is left in the current one.
 */
function stepsToMilestone(journey: Journey): number | undefined {
  if (!journey.milestones || journey.milestones.length === 0) return undefined;
  const pending = journey.steps.filter((s) => isLive(s) && !s.done);
  const current = pending.find((s) => s.milestoneId)?.milestoneId;
  if (!current) return undefined;
  const left = pending.filter((s) => s.milestoneId === current).length;
  return left > 0 ? left : undefined;
}

/**
 * Whether somebody came BACK: a Step reported done in the last week, after a Step that was planned
 * and passed unfinished. Deliberately does not look at how many were missed, or how long the gap
 * was — the card built on this says nothing about the absence, and a fact nobody uses is a fact that
 * can leak into one later.
 */
function returnedAfterMiss(journeys: readonly Journey[], now: number): boolean {
  const weekAgo = now - 7 * DAY_MS;
  const fortnightAgo = now - 14 * DAY_MS;

  for (const journey of journeys) {
    const lastDoneAt = Math.max(
      0,
      ...journey.steps.filter(isDone).map((s) => s.lastCheckInAt ?? 0),
    );
    if (lastDoneAt < weekAgo) continue;
    const missedBefore = journey.steps.some(
      (s) =>
        isLive(s) &&
        !s.done &&
        typeof s.plannedFor === 'number' &&
        s.plannedFor < lastDoneAt &&
        s.plannedFor >= fortnightAgo,
    );
    if (missedBefore) return true;
  }
  return false;
}

/** Derive every fact a card may speak, for this exact moment. */
export function deriveMotivationFacts(
  state: Pick<AppState, 'journeys' | 'streak'>,
  now: number,
  weekStartsAt: number = startOfWeek(now),
): MotivationFacts {
  const journeys = state.journeys ?? [];
  const allDone = journeys.flatMap((j) => j.steps.filter(isDone));

  const doneTimes = allDone.map((s) => s.lastCheckInAt ?? 0).filter((t) => t > 0);
  const lastDoneAt = doneTimes.length > 0 ? Math.max(...doneTimes) : undefined;

  const focus = focusJourney(journeys, now);
  const live = focus?.steps.filter(isLive) ?? [];
  const progressPct =
    focus && live.length > 0 ? Math.round((live.filter((s) => s.done).length / live.length) * 100) : undefined;

  return {
    stepsDoneTotal: allDone.length,
    stepsDoneThisWeek: doneTimes.filter((t) => t >= weekStartsAt).length,
    streakDays: state.streak ?? 0,
    runningJourneys: journeys.filter(isRunning).length,
    ...(focus ? { journeyId: focus.id, journeyTitle: focus.title.trim() || undefined } : {}),
    ...(focus ? { daysMoving: daysBetween(effectiveStartAt(focus), now) } : {}),
    ...(progressPct !== undefined ? { journeyProgressPct: progressPct } : {}),
    ...(focus ? withStepsToMilestone(focus) : {}),
    ...(lastDoneAt !== undefined ? { daysSinceLastDone: daysBetween(lastDoneAt, now) } : {}),
    returnedAfterMiss: returnedAfterMiss(journeys, now),
  };
}

function withStepsToMilestone(journey: Journey): { stepsToMilestone?: number } {
  const left = stepsToMilestone(journey);
  return left === undefined ? {} : { stepsToMilestone: left };
}
