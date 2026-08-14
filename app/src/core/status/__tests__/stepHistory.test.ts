/**
 * stepHistory — the shared "did anything actually happen on this Step?" test, and the count the
 * cancel confirmation states before the user commits.
 *
 * The number in that confirmation is a promise about data removal, so it must match what the engine
 * removes a moment later, case for case: a done Step, a checked-in Step, a reversed report and a Step
 * that only appears in the reason log all COUNT AS LIVED and survive; only the pristine ones go.
 */
import { stepHasHistory, unlivedStepCount } from '../stepHistory';
import type { Journey, ReasonEntry, Step } from '@/core/types/domain';

function step(id: string, over: Partial<Step> = {}): Step {
  return { id, title: id, isStarterStep: false, cadence: 'daily', done: false, ...over };
}

function journey(steps: Step[]): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps,
    createdAt: 1_000,
  };
}

const partialOn = (stepId: string): ReasonEntry => ({
  id: `r_${stepId}`,
  stepId,
  journeyId: 'j1',
  reasonId: 'did_partially',
  leverIds: [],
  outcome: 'partial',
  at: 2_000,
});

describe('stepHasHistory', () => {
  it('is true for a done Step, a checked-in Step, and a reversed report', () => {
    expect(stepHasHistory(step('s', { done: true }))).toBe(true);
    expect(stepHasHistory(step('s', { lastCheckInAt: 1_000 }))).toBe(true);
    expect(stepHasHistory(step('s', { lastReportClearedAt: 1_000 }))).toBe(true);
  });

  it('is true for a Step that only appears in the reason log (a partial, a let-go)', () => {
    expect(stepHasHistory(step('s'), [partialOn('s')])).toBe(true);
    expect(stepHasHistory(step('s'), [partialOn('other')])).toBe(false);
  });

  it('is false for a pristine, never-touched Step', () => {
    expect(stepHasHistory(step('s'))).toBe(false);
  });
});

describe('unlivedStepCount', () => {
  it('counts only the Steps a cancel would actually remove', () => {
    const j = journey([
      step('s1', { done: true }),
      step('s2', { lastCheckInAt: 1_000 }),
      step('s3'),
      step('s4'),
      step('s5'),
    ]);
    expect(unlivedStepCount(j, [partialOn('s3')])).toBe(2);
  });

  it('is zero when every Step has a record, and is the whole plan when none has', () => {
    expect(unlivedStepCount(journey([step('s1', { done: true })]))).toBe(0);
    expect(unlivedStepCount(journey([step('s1'), step('s2'), step('s3')]))).toBe(3);
    expect(unlivedStepCount(journey([]))).toBe(0);
  });
});
