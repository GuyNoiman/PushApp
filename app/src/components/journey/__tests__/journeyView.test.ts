/**
 * journeyView — status resolution + tab bucketing. The `status` field is the source of truth for
 * which tab a Journey appears under (Active · Completed · Future) and for freeze/resume (J3). These
 * tests pin: an explicit status wins; a Journey persisted BEFORE the field existed (no `status`) is
 * derived from `completedAt`; `frozen` stays under Active; and a not-yet-started Journey reads Future.
 */
import { computeWeekLayout, resolveJourneyStatus, toJourneyView } from '../journeyView';
import type { Journey, ReasonEntry, Step } from '@/core/types/domain';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

/** A minimal Journey; override any field per case. */
function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps: [{ id: 's1', title: 'Walk', isStarterStep: false, cadence: 'daily', done: false }],
    createdAt: 1_000,
    ...over,
  };
}

describe('resolveJourneyStatus', () => {
  it('trusts an explicit status', () => {
    expect(resolveJourneyStatus(journey({ status: 'frozen' }))).toBe('frozen');
    expect(resolveJourneyStatus(journey({ status: 'completed' }))).toBe('completed');
  });

  it('derives a legacy Journey (no status field) from completedAt', () => {
    // Persisted before `status` existed: completedAt present → completed, else active.
    expect(resolveJourneyStatus(journey({ completedAt: 2_000 }))).toBe('completed');
    expect(resolveJourneyStatus(journey())).toBe('active');
  });
});

describe('toJourneyView bucketing', () => {
  const now = 100_000;

  it('buckets completed / active by status', () => {
    expect(toJourneyView(journey({ status: 'completed' }), now).bucket).toBe('completed');
    expect(toJourneyView(journey({ status: 'active' }), now).bucket).toBe('active');
  });

  it('keeps a frozen Journey under the Active tab, marked by its status', () => {
    const view = toJourneyView(journey({ status: 'frozen' }), now);
    expect(view.bucket).toBe('active');
    expect(view.status).toBe('frozen');
  });

  it('reads a still-active Journey scheduled to begin later as Future', () => {
    const view = toJourneyView(journey({ status: 'active', createdAt: now + 14 * DAY }), now);
    expect(view.bucket).toBe('future');
  });

  it('still completes a legacy Journey with only completedAt', () => {
    expect(toJourneyView(journey({ completedAt: 50_000 }), now).bucket).toBe('completed');
  });
});

describe('computeWeekLayout — Step Dependencies stacks (Slice 5)', () => {
  // A fixed noon anchor so week bucketing is deterministic: same-week Steps share `C`, next-week Steps
  // sit exactly one week (7 days, same weekday) later — a clean +1 bucket regardless of TZ/week-start.
  const C = new Date(2026, 0, 5, 12, 0, 0).getTime(); // a Monday noon

  function step(id: string, over: Partial<Step> = {}): Step {
    return {
      id,
      title: id,
      isStarterStep: false,
      cadence: 'daily',
      done: false,
      milestoneId: 'm1',
      plannedFor: C,
      ...over,
    };
  }

  function chained(steps: Step[]): Journey {
    return {
      id: 'j1',
      title: 'Chained',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      milestones: [{ id: 'm1', title: 'M1', order: 0 }],
      steps,
      createdAt: C,
    };
  }

  function partialReason(stepId: string): ReasonEntry {
    return {
      id: `r_${stepId}`,
      stepId,
      journeyId: 'j1',
      reasonId: 'did_partially',
      leverIds: [],
      outcome: 'logged',
      at: C,
    };
  }

  it('stacks a same-week chain behind its actionable predecessor (depth = waiting count)', () => {
    const a = step('a');
    const b = step('b', { dependsOnStepId: 'a' });
    const c = step('c', { dependsOnStepId: 'b' });
    const units = computeWeekLayout(chained([a, b, c]), 0, C, []);

    expect(units).toEqual([{ kind: 'stack', top: a, hiddenChain: [b, c], depth: 2 }]);
  });

  it('promotes on unlock: a partial predecessor becomes normal, the next stacks behind the promoted', () => {
    const a = step('a');
    const b = step('b', { dependsOnStepId: 'a' });
    const c = step('c', { dependsOnStepId: 'b' });
    const units = computeWeekLayout(chained([a, b, c]), 0, C, [partialReason('a')]);

    expect(units).toEqual([
      { kind: 'step', step: a },
      { kind: 'stack', top: b, hiddenChain: [c], depth: 1 },
    ]);
  });

  it('cross-week UNDONE: pulls the predecessor into next week as the stack top (render-only)', () => {
    const a = step('a', { plannedFor: C }); // week 0
    const b = step('b', { dependsOnStepId: 'a', plannedFor: C + WEEK }); // week 1
    const j = chained([a, b]);

    // The current week does NOT stack across the boundary — only `a` shows.
    expect(computeWeekLayout(j, 0, C, [])).toEqual([{ kind: 'step', step: a }]);
    // Next week pulls the undone predecessor in as the top of the stack.
    expect(computeWeekLayout(j, 1, C, [])).toEqual([
      { kind: 'stack', top: a, hiddenChain: [b], depth: 1 },
    ]);
  });

  it('cross-week DONE: the dependent renders as a normal unit next week', () => {
    const a = step('a', { plannedFor: C, done: true }); // week 0, completed
    const b = step('b', { dependsOnStepId: 'a', plannedFor: C + WEEK }); // week 1, now unlocked
    const units = computeWeekLayout(chained([a, b]), 1, C, []);

    expect(units).toEqual([{ kind: 'step', step: b }]);
  });
});
