/**
 * The facts a motivation card may speak. Every one is COUNTED from what the app recorded, which is
 * why the tests below are mostly about what the app does NOT claim: an unknown value comes back
 * `undefined` rather than as a zero, a guess, or an average.
 */
import type { AppState, Journey, Step } from '../../types/domain';
import { deriveMotivationFacts } from '../facts';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 6, 14, 12, 0, 0).getTime();
// 2026-07-14 is a Tuesday; the week starts on the Sunday two days earlier.
const WEEK_START = new Date(2026, 6, 12, 0, 0, 0).getTime();

const step = (over: Partial<Step> = {}): Step => ({
  id: 's1',
  title: 'A Step',
  isStarterStep: false,
  cadence: 'once',
  done: false,
  ...over,
});

const journey = (over: Partial<Journey> = {}): Journey => ({
  id: 'j1',
  title: 'Run 5km',
  why: ['because'],
  durationDays: 30,
  rhythm: 'daily',
  steps: [],
  createdAt: NOW - 20 * DAY,
  ...over,
});

const state = (journeys: Journey[], streak = 0): Pick<AppState, 'journeys' | 'streak'> => ({
  journeys,
  streak,
});

describe('deriveMotivationFacts', () => {
  it('claims nothing about an empty account', () => {
    const facts = deriveMotivationFacts(state([]), NOW, WEEK_START);
    expect(facts.stepsDoneTotal).toBe(0);
    expect(facts.runningJourneys).toBe(0);
    expect(facts.journeyId).toBeUndefined();
    expect(facts.daysSinceLastDone).toBeUndefined();
    expect(facts.journeyProgressPct).toBeUndefined();
    expect(facts.returnedAfterMiss).toBe(false);
  });

  it('counts Steps done in total and this week, and never a dropped one', () => {
    const j = journey({
      steps: [
        step({ id: 'a', done: true, lastCheckInAt: WEEK_START + DAY }),
        step({ id: 'b', done: true, lastCheckInAt: WEEK_START - 5 * DAY }),
        step({ id: 'c', done: true, dropped: true, lastCheckInAt: WEEK_START + DAY }),
        step({ id: 'd' }),
      ],
    });
    const facts = deriveMotivationFacts(state([j]), NOW, WEEK_START);
    expect(facts.stepsDoneTotal).toBe(2);
    expect(facts.stepsDoneThisWeek).toBe(1);
  });

  it('reports a Journey’s progress out of the Steps still in the plan', () => {
    const j = journey({
      steps: [
        step({ id: 'a', done: true, lastCheckInAt: NOW - DAY }),
        step({ id: 'b' }),
        step({ id: 'c' }),
        step({ id: 'd', dropped: true }),
      ],
    });
    const facts = deriveMotivationFacts(state([j]), NOW, WEEK_START);
    expect(facts.journeyProgressPct).toBe(33);
    expect(facts.journeyTitle).toBe('Run 5km');
    expect(facts.daysMoving).toBe(20);
  });

  it('counts what is left in the CURRENT Milestone, and nothing when there are none', () => {
    const withMilestones = journey({
      milestones: [
        { id: 'm1', title: 'First', order: 0 },
        { id: 'm2', title: 'Second', order: 1 },
      ],
      steps: [
        step({ id: 'a', done: true, milestoneId: 'm1', lastCheckInAt: NOW - DAY }),
        step({ id: 'b', milestoneId: 'm1' }),
        step({ id: 'c', milestoneId: 'm2' }),
      ],
    } as Partial<Journey>);
    expect(deriveMotivationFacts(state([withMilestones]), NOW, WEEK_START).stepsToMilestone).toBe(1);
    expect(deriveMotivationFacts(state([journey({ steps: [step()] })]), NOW, WEEK_START).stepsToMilestone).toBeUndefined();
  });

  it('sees a return: a Step done after one that was planned and passed unfinished', () => {
    const returned = journey({
      steps: [
        step({ id: 'missed', plannedFor: NOW - 5 * DAY }),
        step({ id: 'done', done: true, lastCheckInAt: NOW - DAY }),
      ],
    });
    expect(deriveMotivationFacts(state([returned]), NOW, WEEK_START).returnedAfterMiss).toBe(true);
  });

  it('does not call it a return when nothing was ever missed', () => {
    const steady = journey({
      steps: [
        step({ id: 'a', done: true, plannedFor: NOW - 5 * DAY, lastCheckInAt: NOW - 5 * DAY }),
        step({ id: 'b', done: true, lastCheckInAt: NOW - DAY }),
      ],
    });
    expect(deriveMotivationFacts(state([steady]), NOW, WEEK_START).returnedAfterMiss).toBe(false);
  });

  it('does not call it a return when the last Step done is older than a week', () => {
    const stale = journey({
      steps: [
        step({ id: 'missed', plannedFor: NOW - 30 * DAY }),
        step({ id: 'done', done: true, lastCheckInAt: NOW - 20 * DAY }),
      ],
    });
    expect(deriveMotivationFacts(state([stale]), NOW, WEEK_START).returnedAfterMiss).toBe(false);
  });

  it('is about a RUNNING Journey — a frozen one is not what somebody is in the middle of', () => {
    const frozen = journey({ id: 'j_frozen', status: 'frozen' } as Partial<Journey>);
    const facts = deriveMotivationFacts(state([frozen]), NOW, WEEK_START);
    expect(facts.runningJourneys).toBe(0);
    expect(facts.journeyId).toBeUndefined();
  });
});
