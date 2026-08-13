/**
 * JourneyEngine — Step Dependency AUTHORING at creation (Step Dependencies, linear, Slice 2).
 * Proves that a Journey created with a valid positional chain gets correct `dependsOnStepId`s and
 * that invalid references (forward, cross-Milestone, a 4th link, self, a duplicate/second
 * predecessor) are dropped while the Journey itself stays valid. Pure TS.
 */
import { EventBus } from '../../events/EventBus';
import type { AppState, Buddy, Milestone } from '../../types/domain';
import { JourneyEngine, type NewStepInput } from '../JourneyEngine';

function initialBuddy(): Buddy {
  return { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0, ownedCosmetics: [], equippedCosmetic: null };
}

function emptyState(): AppState {
  return {
    dreams: [],
    journeys: [],
    buddy: initialBuddy(),
    checkIns: [],
    missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
    login: { lastClaimedKey: null, dayIndex: 0 },
    reminderRules: [],
    communicationPrefs: {
      remindersEnabled: true,
      socialCheerEnabled: true,
      socialNudgeEnabled: true,
      locationOptIn: false,
      calendarOptIn: false,
    },
    schedulingPrefs: { window: undefined, dayPart: 'either', preferredDays: [] },
  };
}

function setup() {
  const bus = new EventBus();
  const state = emptyState();
  const engine = new JourneyEngine(bus, () => state);
  return { engine, state };
}

const M1: Milestone = { id: 'm1', title: 'Milestone 1', order: 0 };
const M2: Milestone = { id: 'm2', title: 'Milestone 2', order: 1 };

function step(title: string, extra: Partial<NewStepInput> = {}): NewStepInput {
  return { title, milestoneId: 'm1', ...extra };
}

describe('JourneyEngine.createJourney — dependency authoring', () => {
  it('resolves a valid positional chain to real dependsOnStepIds', () => {
    const { engine } = setup();
    const journey = engine.createJourney({
      title: 'Chained',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      milestones: [M1],
      steps: [
        step('a'),
        step('b', { dependsOnStepIndex: 0 }),
        step('c', { dependsOnStepIndex: 1 }),
      ],
    });
    const [a, b, c] = journey.steps;
    expect(a.dependsOnStepId).toBeUndefined();
    expect(b.dependsOnStepId).toBe(a.id);
    expect(c.dependsOnStepId).toBe(b.id);
  });

  it('drops a FORWARD reference (index >= own index) and keeps the Journey valid', () => {
    const { engine } = setup();
    const journey = engine.createJourney({
      title: 'Forward',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      milestones: [M1],
      steps: [
        step('a', { dependsOnStepIndex: 1 }), // points forward → dropped
        step('b'),
      ],
    });
    expect(journey.steps[0].dependsOnStepId).toBeUndefined();
    expect(journey.steps).toHaveLength(2);
  });

  it('drops a SELF reference', () => {
    const { engine } = setup();
    const journey = engine.createJourney({
      title: 'Self',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      milestones: [M1],
      steps: [step('a'), step('b', { dependsOnStepIndex: 1 })], // index === own index → dropped
    });
    expect(journey.steps[1].dependsOnStepId).toBeUndefined();
  });

  it('drops a CROSS-MILESTONE reference', () => {
    const { engine } = setup();
    const journey = engine.createJourney({
      title: 'Cross',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      milestones: [M1, M2],
      steps: [
        step('a', { milestoneId: 'm1' }),
        step('b', { milestoneId: 'm2', dependsOnStepIndex: 0 }), // different Milestone → dropped
      ],
    });
    expect(journey.steps[1].dependsOnStepId).toBeUndefined();
  });

  it('drops the 4th link that would exceed the max chain length, keeping the first three', () => {
    const { engine } = setup();
    const journey = engine.createJourney({
      title: 'TooLong',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      milestones: [M1],
      steps: [
        step('a'),
        step('b', { dependsOnStepIndex: 0 }),
        step('c', { dependsOnStepIndex: 1 }),
        step('d', { dependsOnStepIndex: 2 }), // 4th link → dropped
      ],
    });
    const [a, b, c, d] = journey.steps;
    expect(b.dependsOnStepId).toBe(a.id);
    expect(c.dependsOnStepId).toBe(b.id);
    expect(d.dependsOnStepId).toBeUndefined();
  });
});

describe('JourneyEngine — locked Steps in the Home lists (Slice 3)', () => {
  function chained() {
    const { engine } = setup();
    const journey = engine.createJourney({
      title: 'Chained',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      milestones: [M1],
      steps: [step('a'), step('b', { dependsOnStepIndex: 0 })],
    });
    return { engine, journey };
  }

  it('EXCLUDES a locked Step from getTodaySteps', () => {
    const { engine, journey } = chained();
    const ids = engine.getTodaySteps().map((t) => t.step.id);
    expect(ids).toContain(journey.steps[0].id); // a — actionable
    expect(ids).not.toContain(journey.steps[1].id); // b — locked, excluded
  });

  it('KEEPS a locked Step in getWeekSteps, flagged locked:true', () => {
    const { engine, journey } = chained();
    const week = engine.getWeekSteps();
    const a = week.find((t) => t.step.id === journey.steps[0].id);
    const b = week.find((t) => t.step.id === journey.steps[1].id);
    expect(a?.locked).toBe(false);
    expect(b?.locked).toBe(true);
  });

  it('UNLOCKS the dependent once the predecessor is completed', () => {
    const { engine, journey } = chained();
    engine.checkInStep(journey.id, journey.steps[0].id); // complete a
    const todayIds = engine.getTodaySteps().map((t) => t.step.id);
    expect(todayIds).toContain(journey.steps[1].id); // b now actionable
    const b = engine.getWeekSteps().find((t) => t.step.id === journey.steps[1].id);
    expect(b?.locked).toBe(false);
  });
});

describe('JourneyEngine.deferDependents — cascade forward one week (Slice 6)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const WEEK = 7 * DAY;
  const T0 = 1_000_000_000_000;

  function chain3() {
    const { engine } = setup();
    const journey = engine.createJourney({
      title: 'Chained',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      milestones: [M1],
      steps: [
        step('a', { plannedFor: T0 }),
        step('b', { dependsOnStepIndex: 0, plannedFor: T0 + DAY }),
        step('c', { dependsOnStepIndex: 1, plannedFor: T0 + 2 * DAY }),
      ],
    });
    return { engine, journey };
  }

  it('moves the PREDECESSOR and its whole transitive chain +1 week (no dead-end)', () => {
    const { engine, journey } = chain3();
    engine.deferDependents(journey.id, journey.steps[0].id);
    const [a, b, c] = journey.steps;
    expect(a.plannedFor).toBe(T0 + WEEK); // predecessor re-appears next week WITH its chain
    expect(b.plannedFor).toBe(T0 + DAY + WEEK);
    expect(c.plannedFor).toBe(T0 + 2 * DAY + WEEK);
  });

  it('keeps the deferred predecessor reachable so the chain can still complete', () => {
    const { engine, journey } = chain3();
    const [a, b] = journey.steps;
    engine.deferDependents(journey.id, a.id);
    // a re-appears next week and is completable there; completing it unlocks its dependent b.
    engine.checkInStep(journey.id, a.id);
    const bRow = engine.getWeekSteps().find((t) => t.step.id === b.id);
    expect(bRow?.locked).toBe(false);
  });

  it('is a no-op for a Step with no dependents (predecessor stays put)', () => {
    const { engine, journey } = chain3();
    engine.deferDependents(journey.id, journey.steps[2].id); // c is the tail — nothing depends on it
    expect(journey.steps.map((s) => s.plannedFor)).toEqual([T0, T0 + DAY, T0 + 2 * DAY]);
  });

  it('cascades correctly in the EVEN-SPREAD case (no plannedFor) without error', () => {
    const { engine } = setup();
    const journey = engine.createJourney({
      title: 'Even spread',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      milestones: [M1],
      steps: [step('a'), step('b', { dependsOnStepIndex: 0 })], // neither carries a plannedFor
    });
    expect(() => engine.deferDependents(journey.id, journey.steps[0].id)).not.toThrow();
    // Nothing to move (no schedule) — the display-pull re-surfaces the undone predecessor visually.
    expect(journey.steps.map((s) => s.plannedFor)).toEqual([undefined, undefined]);
  });

  it('leaves an unscheduled dependent (no plannedFor) untouched', () => {
    const { engine } = setup();
    const journey = engine.createJourney({
      title: 'Chained',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      milestones: [M1],
      steps: [step('a', { plannedFor: T0 }), step('b', { dependsOnStepIndex: 0 })], // b has no schedule
    });
    engine.deferDependents(journey.id, journey.steps[0].id);
    expect(journey.steps[1].plannedFor).toBeUndefined();
  });
});
