/**
 * Milestone position — the ONE derivation Home, the Journeys card and the Journey detail share
 * (Device QA 2026-08-17, A1).
 *
 * The defect this pins: Home read the real `journey.milestones` while the Journeys card derived its
 * count from the STEP count (`min(4, steps)`), so a Journey with 3 Milestones and 8 Steps reported
 * "Milestone 1 of 3" on one screen and "Milestone 1 of 4" on the other — a Milestone the user had
 * never seen or approved. The FIXTURE below is deliberately that Journey: 3 real Milestones, 8
 * Steps. Both surfaces are asserted against it in the same test, so they cannot drift apart again.
 */
import { currentMilestone, milestoneOfStep } from '../milestones';
import type { Journey, Step } from '../../types/domain';

function step(id: string, over: Partial<Step> = {}): Step {
  return { id, title: `Step ${id}`, isStarterStep: false, cadence: 'daily', done: false, ...over };
}

/**
 * THE fixture: 3 real Milestones, 8 Steps spread across them (3 / 3 / 2). `doneCount` marks the
 * first N Steps done, in order — the shape a user actually works through.
 */
function threeMilestones(doneCount = 0, over: Partial<Journey> = {}): Journey {
  const placement = ['m1', 'm1', 'm1', 'm2', 'm2', 'm2', 'm3', 'm3'];
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    status: 'active',
    milestones: [
      { id: 'm1', title: 'Get moving', order: 0 },
      { id: 'm2', title: 'Build the habit', order: 1 },
      { id: 'm3', title: 'Go the distance', order: 2 },
    ],
    steps: placement.map((milestoneId, i) =>
      step(`s${i + 1}`, { milestoneId, done: i < doneCount }),
    ),
    createdAt: 1_000,
    ...over,
  };
}

/** The Step Home shows for a Journey: the next one that still needs doing. */
function nextStep(journey: Journey): Step {
  const next = journey.steps.find((s) => !s.done && !s.dropped);
  if (!next) throw new Error('fixture has no open Step');
  return next;
}

describe('Milestone position — one Journey, one answer on every surface', () => {
  it('reports the SAME position for the Journey (card/detail) and for its next Step (Home)', () => {
    // Four of the eight Steps are done, so the user is inside the second Milestone.
    const journey = threeMilestones(4);

    const forTheCard = currentMilestone(journey);
    const forHome = milestoneOfStep(journey, nextStep(journey));

    expect(forTheCard).toEqual({ current: 2, total: 3 });
    expect(forHome).toEqual(forTheCard);
  });

  it('counts the REAL Milestones, never the Steps (the "1 of 4" that was invented)', () => {
    const journey = threeMilestones();

    expect(journey.steps).toHaveLength(8);
    expect(currentMilestone(journey)?.total).toBe(3);
    expect(currentMilestone(journey)?.total).not.toBe(4);
    expect(currentMilestone(journey)).toEqual({ current: 1, total: 3 });
  });

  it('says NOTHING about a Journey with no Milestones — no invented "1 of 1"', () => {
    const journey = threeMilestones(0, { milestones: undefined });

    expect(currentMilestone(journey)).toBeUndefined();
    expect(milestoneOfStep(journey, journey.steps[0])).toBeUndefined();
    // An empty arc is no arc: it says nothing either.
    expect(currentMilestone(threeMilestones(0, { milestones: [] }))).toBeUndefined();
  });

  it('says nothing when no Step of the Journey is placed in the arc', () => {
    // Milestones exist but nothing sits in them — there is no honest "where you are" to report.
    const journey = threeMilestones();
    journey.steps.forEach((s) => delete s.milestoneId);

    expect(currentMilestone(journey)).toBeUndefined();
  });

  it('advances to the Milestone holding the next open Step, and rests on the last when all are done', () => {
    expect(currentMilestone(threeMilestones(0))).toEqual({ current: 1, total: 3 });
    expect(currentMilestone(threeMilestones(3))).toEqual({ current: 2, total: 3 });
    expect(currentMilestone(threeMilestones(6))).toEqual({ current: 3, total: 3 });
    expect(currentMilestone(threeMilestones(8))).toEqual({ current: 3, total: 3 });
  });

  it('ignores dropped Steps, like every other progress read', () => {
    // The adaptive coach shed the whole first Milestone: the user is in the second, not the first.
    const journey = threeMilestones();
    journey.steps.slice(0, 3).forEach((s) => (s.dropped = true));

    expect(currentMilestone(journey)).toEqual({ current: 2, total: 3 });
  });

  it('reports nothing for a Step pointing at a Milestone the Journey no longer has', () => {
    // A replan can drop a Milestone; a dangling reference must not invent a position.
    const journey = threeMilestones();
    const orphan = step('sx', { milestoneId: 'gone' });

    expect(milestoneOfStep(journey, orphan)).toBeUndefined();
    // …and the Journey still answers from the Steps that ARE placed.
    expect(currentMilestone({ ...journey, steps: [orphan, ...journey.steps] })).toEqual({
      current: 1,
      total: 3,
    });
  });

  it('handles an unknown Journey and an unplaced Step without guessing', () => {
    expect(currentMilestone(undefined)).toBeUndefined();
    expect(milestoneOfStep(undefined, step('s1'))).toBeUndefined();
    expect(milestoneOfStep(threeMilestones(), step('s9'))).toBeUndefined();
  });
});
