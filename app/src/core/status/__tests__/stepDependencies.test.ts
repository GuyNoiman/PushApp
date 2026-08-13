/**
 * stepDependencies unit tests — the single source of dependency truth (Step Dependencies, linear).
 * Proves the unlock truth table (fail-open on missing/dropped predecessors) and that
 * validateDependency accepts a valid ≤3 same-Milestone earlier-only chain while rejecting self,
 * forward, cycle, cross-Milestone, a 4th link, and a second predecessor. Pure TS.
 */
import type { Journey, PostponeAction, ReasonEntry, ReasonId, Step } from '../../types/domain';
import {
  dependencyChainOf,
  directDependentsOf,
  isStepLocked,
  validateDependency,
} from '../stepDependencies';

function makeStep(id: string, overrides: Partial<Step> = {}): Step {
  return {
    id,
    title: id,
    isStarterStep: false,
    cadence: 'once',
    done: false,
    ...overrides,
  };
}

function makeJourney(steps: Step[]): Journey {
  return {
    id: 'journey_1',
    title: 'Journey',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    steps,
    createdAt: 0,
    status: 'active',
  };
}

let seq = 0;
function reason(
  stepId: string,
  reasonId: ReasonId,
  action: PostponeAction,
  at: number,
): ReasonEntry {
  seq += 1;
  return {
    id: `reason_${seq}`,
    stepId,
    journeyId: 'journey_1',
    reasonId,
    leverIds: [],
    outcome: 'logged',
    at,
    action,
  };
}

describe('isStepLocked — unlock truth table', () => {
  it('is unlocked when the Step has no dependency', () => {
    const a = makeStep('a');
    const b = makeStep('b');
    expect(isStepLocked(b, makeJourney([a, b]))).toBe(false);
  });

  it('is LOCKED when the predecessor is unreported (no report yet)', () => {
    const a = makeStep('a');
    const b = makeStep('b', { dependsOnStepId: 'a' });
    expect(isStepLocked(b, makeJourney([a, b]))).toBe(true);
  });

  it('is LOCKED when the predecessor was let go (not_completed)', () => {
    const a = makeStep('a');
    const b = makeStep('b', { dependsOnStepId: 'a' });
    const log = [reason('a', 'couldnt', 'cancel', 100)];
    expect(isStepLocked(b, makeJourney([a, b]), log)).toBe(true);
  });

  it('is UNLOCKED when the predecessor is completed', () => {
    const a = makeStep('a', { done: true });
    const b = makeStep('b', { dependsOnStepId: 'a' });
    expect(isStepLocked(b, makeJourney([a, b]))).toBe(false);
  });

  it('is UNLOCKED when the predecessor is partially_completed', () => {
    const a = makeStep('a');
    const b = makeStep('b', { dependsOnStepId: 'a' });
    const log = [reason('a', 'did_partially', 'postpone', 100)];
    expect(isStepLocked(b, makeJourney([a, b]), log)).toBe(false);
  });

  // Closed-week dead-end guard: a not_completed predecessor stranded in a past read-only week is
  // unreachable, so its dependent must NOT stay permanently locked (fail-open, PRD §7 / D41).
  const DAY = 24 * 60 * 60 * 1000;
  const NOW = 1_600_000_000_000;

  it('stays LOCKED when the not_completed predecessor is in the CURRENT week (still reachable)', () => {
    const a = makeStep('a', { plannedFor: NOW });
    const b = makeStep('b', { dependsOnStepId: 'a', plannedFor: NOW });
    const log = [reason('a', 'couldnt', 'cancel', 100)];
    expect(isStepLocked(b, makeJourney([a, b]), log, NOW)).toBe(true);
  });

  it('fails open (UNLOCKED) when the not_completed predecessor sits in a CLOSED past week', () => {
    const a = makeStep('a', { plannedFor: NOW - 8 * DAY }); // a full week+ earlier → closed week
    const b = makeStep('b', { dependsOnStepId: 'a', plannedFor: NOW });
    const log = [reason('a', 'couldnt', 'cancel', 100)];
    expect(isStepLocked(b, makeJourney([a, b]), log, NOW)).toBe(false);
  });

  it('fails open (UNLOCKED) when the predecessor is dropped', () => {
    const a = makeStep('a', { dropped: true });
    const b = makeStep('b', { dependsOnStepId: 'a' });
    expect(isStepLocked(b, makeJourney([a, b]))).toBe(false);
  });

  it('fails open (UNLOCKED) when the predecessor id is missing/unknown', () => {
    const b = makeStep('b', { dependsOnStepId: 'ghost' });
    expect(isStepLocked(b, makeJourney([b]))).toBe(false);
  });
});

describe('directDependentsOf / dependencyChainOf', () => {
  it('lists the immediate dependents of a Step', () => {
    const a = makeStep('a');
    const b = makeStep('b', { dependsOnStepId: 'a' });
    const c = makeStep('c', { dependsOnStepId: 'b' });
    const journey = makeJourney([a, b, c]);
    expect(directDependentsOf(a, journey).map((s) => s.id)).toEqual(['b']);
    expect(directDependentsOf(b, journey).map((s) => s.id)).toEqual(['c']);
    expect(directDependentsOf(c, journey)).toEqual([]);
  });

  it('returns the full transitive chain in Journey order from any member', () => {
    const a = makeStep('a');
    const b = makeStep('b', { dependsOnStepId: 'a' });
    const c = makeStep('c', { dependsOnStepId: 'b' });
    const journey = makeJourney([a, b, c]);
    expect(dependencyChainOf(b, journey).map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(dependencyChainOf(a, journey).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('validateDependency', () => {
  // A three-Step, single-Milestone Journey in order [a, b, c].
  function chainJourney(): Journey {
    return makeJourney([
      makeStep('a', { milestoneId: 'm1' }),
      makeStep('b', { milestoneId: 'm1' }),
      makeStep('c', { milestoneId: 'm1' }),
    ]);
  }

  it('accepts a valid earlier-only, same-Milestone chain up to 3 Steps', () => {
    const journey = chainJourney();
    expect(validateDependency('b', 'a', journey)).toBe(true);
    // With b→a already linked, c→b keeps the chain at exactly 3.
    journey.steps[1].dependsOnStepId = 'a';
    expect(validateDependency('c', 'b', journey)).toBe(true);
  });

  it('rejects a self-dependency', () => {
    expect(validateDependency('a', 'a', chainJourney())).toBe(false);
  });

  it('rejects a forward dependency (predecessor is later in order)', () => {
    expect(validateDependency('a', 'b', chainJourney())).toBe(false);
  });

  it('rejects a cross-Milestone dependency', () => {
    const journey = makeJourney([
      makeStep('a', { milestoneId: 'm1' }),
      makeStep('b', { milestoneId: 'm2' }),
    ]);
    expect(validateDependency('b', 'a', journey)).toBe(false);
  });

  it('rejects a cycle', () => {
    // a→b already linked; making b depend on a would close the loop.
    const journey = chainJourney();
    journey.steps[0].dependsOnStepId = 'b'; // a depends on b
    expect(validateDependency('b', 'a', journey)).toBe(false);
  });

  it('rejects a 4th link that would exceed the max chain length', () => {
    const journey = makeJourney([
      makeStep('a', { milestoneId: 'm1' }),
      makeStep('b', { milestoneId: 'm1', dependsOnStepId: 'a' }),
      makeStep('c', { milestoneId: 'm1', dependsOnStepId: 'b' }),
      makeStep('d', { milestoneId: 'm1' }),
    ]);
    // a←b←c is already length 3; d→c would make 4.
    expect(validateDependency('d', 'c', journey)).toBe(false);
  });

  it('rejects a second predecessor for a dependent that already has one', () => {
    const journey = makeJourney([
      makeStep('a', { milestoneId: 'm1' }),
      makeStep('b', { milestoneId: 'm1' }),
      makeStep('c', { milestoneId: 'm1', dependsOnStepId: 'b' }),
    ]);
    // c already depends on b; it may not also depend on a.
    expect(validateDependency('c', 'a', journey)).toBe(false);
  });

  it('rejects a SECOND dependent for a predecessor that already has one (no fan-out, stays linear)', () => {
    const journey = makeJourney([
      makeStep('a', { milestoneId: 'm1' }),
      makeStep('b', { milestoneId: 'm1', dependsOnStepId: 'a' }),
      makeStep('c', { milestoneId: 'm1' }),
    ]);
    // a already has dependent b; c→a would fan a out to two dependents — rejected (each Step ≤1 dependent).
    expect(validateDependency('c', 'a', journey)).toBe(false);
  });
});
