/**
 * Step Dependencies — COUNTING & COMPLETION invariants (Slice 4, characterization only).
 *
 * These tests pin down that adding a linear dependency chain changes NOTHING about how a Journey is
 * counted or completed: a LOCKED Step still counts in the total/denominator exactly as before, and a
 * chained Journey still completes only when every non-dropped Step is done — and stays reachable,
 * because a not-yet-done Step merely DEFERS its dependents (it never closes the Journey off). No
 * production logic changes here; if any of these break, a counting/completion invariant regressed.
 */
import { EventBus } from '../../events/EventBus';
import type { AppState, Buddy, Milestone } from '../../types/domain';
import type { DomainEvent } from '../../events/events';
import { JourneyEngine, type NewStepInput } from '../JourneyEngine';
import { toJourneyView } from '../../../components/journey/journeyView';

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

const M1: Milestone = { id: 'm1', title: 'Milestone 1', order: 0 };

function setup() {
  const bus = new EventBus();
  const state = emptyState();
  const engine = new JourneyEngine(bus, () => state);
  const events: DomainEvent[] = [];
  bus.on('JourneyCompleted', (e) => events.push(e));
  return { engine, state, events };
}

function step(title: string, extra: Partial<NewStepInput> = {}): NewStepInput {
  return { title, milestoneId: 'm1', ...extra };
}

/** A 3-Step chain a → b → c, all in one Milestone. */
function chainInput() {
  return {
    title: 'Chained',
    why: [],
    durationDays: 30,
    rhythm: 'daily' as const,
    milestones: [M1],
    steps: [step('a'), step('b', { dependsOnStepIndex: 0 }), step('c', { dependsOnStepIndex: 1 })],
  };
}

describe('Step Dependencies — counting invariants', () => {
  it('a locked Step STILL counts in totalSteps and the progress denominator', () => {
    const { engine } = setup();
    const journey = engine.createJourney(chainInput());
    const view = toJourneyView(journey, journey.createdAt);
    // All three Steps count in the total; b and c are locked yet still in the denominator.
    expect(view.totalSteps).toBe(3);
    expect(view.doneSteps).toBe(0);
    expect(view.progress).toBe(0);

    // Completing the head unlocks b but does NOT change the total; progress is done/total.
    engine.checkInStep(journey.id, journey.steps[0].id);
    const after = toJourneyView(journey, journey.createdAt);
    expect(after.totalSteps).toBe(3);
    expect(after.doneSteps).toBe(1);
    expect(after.progress).toBeCloseTo(1 / 3);
  });
});

describe('Step Dependencies — completion invariants', () => {
  it('completes ONLY when every non-dropped Step is done, and the chain stays reachable', () => {
    const { engine, state, events } = setup();
    const journey = engine.createJourney(chainInput());
    const [a, b, c] = journey.steps;

    engine.checkInStep(journey.id, a.id); // a done → b unlocks
    expect(state.journeys[0].completedAt).toBeUndefined();
    expect(events).toHaveLength(0);

    engine.checkInStep(journey.id, b.id); // b done → c unlocks
    expect(state.journeys[0].completedAt).toBeUndefined();
    expect(events).toHaveLength(0);

    engine.checkInStep(journey.id, c.id); // last Step done → Journey completes
    expect(state.journeys[0].completedAt).toBeDefined();
    expect(events).toHaveLength(1);
  });

  it('a dropped predecessor does not strand the Journey: the dependent still completes it', () => {
    const { engine, state } = setup();
    const journey = engine.createJourney(chainInput());
    const [a, b, c] = journey.steps;
    // Simulate the coach shedding the head Step from scope.
    a.dropped = true;
    // b fails open (dropped predecessor → unlocked) and can be actioned; complete the rest.
    engine.checkInStep(journey.id, b.id);
    engine.checkInStep(journey.id, c.id);
    // Every non-dropped Step is done → the Journey completes (a is out of scope).
    expect(state.journeys[0].completedAt).toBeDefined();
  });
});
