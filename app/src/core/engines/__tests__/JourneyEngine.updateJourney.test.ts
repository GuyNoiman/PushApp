/**
 * JourneyEngine.updateJourney tests (task J1) — the coach-led EDIT path. Verifies scalars, add/edit
 * Step, the drop-vs-splice removal rule (pristine → spliced; history → dropped-preserved), the
 * completed-Journey guard, that the create path is unchanged, and that JourneyUpdated is emitted.
 */
import { EventBus } from '../../events/EventBus';
import type { DomainEvent } from '../../events/events';
import type { AppState, Buddy } from '../../types/domain';
import { JourneyEngine } from '../JourneyEngine';

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
  const events: DomainEvent[] = [];
  const record = (event: DomainEvent) => events.push(event);
  bus.on('JourneyCreated', record);
  bus.on('JourneyUpdated', record);
  return { bus, state, engine, events };
}

function seedJourney(engine: JourneyEngine) {
  return engine.createJourney({
    title: 'Run 5km',
    why: ['Feel stronger'],
    durationDays: 30,
    rhythm: 'few-times-week',
    steps: [
      { title: 'Lace up and walk', isStarterStep: true, cadence: 'once' },
      { title: 'Jog 15 minutes', cadence: 'weekly' },
      { title: 'Run 2km', cadence: 'weekly' },
    ],
  });
}

describe('JourneyEngine.updateJourney', () => {
  it('applies scalar edits (title, why, rhythm, durationDays) and emits JourneyUpdated', () => {
    const { engine, events } = setup();
    const journey = seedJourney(engine);
    events.length = 0;

    const result = engine.updateJourney(journey.id, {
      title: 'Run 10km',
      why: ['Feel strong', 'Prove I follow through'],
      rhythm: 'daily',
      durationDays: 60,
    });

    expect(result).not.toBeNull();
    expect(journey.title).toBe('Run 10km');
    expect(journey.why).toEqual(['Feel strong', 'Prove I follow through']);
    expect(journey.rhythm).toBe('daily');
    expect(journey.durationDays).toBe(60);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'JourneyUpdated', journey: { id: journey.id } });
  });

  it('adds a Step through the shared builder (fresh id, defaults) and edits an existing Step by id', () => {
    const { engine } = setup();
    const journey = seedJourney(engine);
    const firstId = journey.steps[0].id;

    engine.updateJourney(journey.id, {
      addSteps: [{ title: 'Cool-down stretch', cadence: 'daily' }],
      editSteps: [{ stepId: firstId, title: 'Lace up and walk 10 min', cadence: 'weekly' }],
    });

    const added = journey.steps.find((s) => s.title === 'Cool-down stretch');
    expect(added).toBeDefined();
    expect(added?.id.length).toBeGreaterThan(0);
    expect(added?.done).toBe(false);
    expect(added?.cadence).toBe('daily');
    expect(added?.isStarterStep).toBe(false);

    const edited = journey.steps.find((s) => s.id === firstId);
    expect(edited?.title).toBe('Lace up and walk 10 min');
    expect(edited?.cadence).toBe('weekly');
  });

  it('splices out a pristine Step but DROP-preserves a Step with check-in history', () => {
    const { engine } = setup();
    const journey = seedJourney(engine);
    const pristineId = journey.steps[2].id; // never touched
    const doneId = journey.steps[1].id;
    engine.checkInStep(journey.id, doneId); // gives this Step history (done + lastCheckInAt)

    engine.updateJourney(journey.id, { removeStepIds: [pristineId, doneId] });

    // Pristine → gone entirely.
    expect(journey.steps.some((s) => s.id === pristineId)).toBe(false);
    // History → still present, marked dropped (record preserved).
    const dropped = journey.steps.find((s) => s.id === doneId);
    expect(dropped).toBeDefined();
    expect(dropped?.dropped).toBe(true);
    expect(dropped?.done).toBe(true);
  });

  it('drop-preserves a Step that only has reason-log history (no check-in)', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);
    const stepId = journey.steps[0].id;
    state.reasonLog = [
      { id: 'r1', stepId, journeyId: journey.id, reasonId: 'no_time', leverIds: [], outcome: 'logged', at: Date.now() },
    ];

    engine.updateJourney(journey.id, { removeStepIds: [stepId] });

    const step = journey.steps.find((s) => s.id === stepId);
    expect(step?.dropped).toBe(true);
  });

  it('ignores cross-Journey / unknown Step ids in editSteps and removeStepIds', () => {
    const { engine } = setup();
    const other = engine.createJourney({
      title: 'Other',
      why: ['x'],
      durationDays: 10,
      rhythm: 'weekly',
      steps: [{ title: 'Foreign step', isStarterStep: false, cadence: 'once' }],
    });
    const journey = seedJourney(engine);
    const foreignId = other.steps[0].id;
    const before = journey.steps.length;

    engine.updateJourney(journey.id, {
      editSteps: [{ stepId: foreignId, title: 'Hijacked' }],
      removeStepIds: [foreignId, 'step_does_not_exist'],
    });

    // The foreign Step is untouched and the target Journey's Steps are intact.
    expect(other.steps[0].title).toBe('Foreign step');
    expect(journey.steps).toHaveLength(before);
  });

  it('returns null and mutates nothing for an unknown id or a completed Journey', () => {
    const { engine, events } = setup();
    const journey = seedJourney(engine);

    expect(engine.updateJourney('nope', { title: 'x' })).toBeNull();

    // Complete the Journey, then editing is blocked.
    for (const step of journey.steps) engine.checkInStep(journey.id, step.id);
    expect(journey.completedAt).toBeDefined();
    events.length = 0;

    expect(engine.updateJourney(journey.id, { title: 'Should not apply' })).toBeNull();
    expect(journey.title).toBe('Run 5km');
    expect(events.some((e) => e.type === 'JourneyUpdated')).toBe(false);
  });

  it('authors a valid dependency via an edit and applies it in place (Step Dependencies, Slice 7)', () => {
    const { engine } = setup();
    const journey = seedJourney(engine);
    const [a, b] = journey.steps;

    engine.updateJourney(journey.id, {
      editSteps: [{ stepId: b.id, dependsOnStepId: a.id }],
    });

    expect(journey.steps.find((s) => s.id === b.id)?.dependsOnStepId).toBe(a.id);
  });

  it('unlinks dependents when their predecessor is removed (dangling → normal Step)', () => {
    const { engine } = setup();
    const journey = seedJourney(engine);
    const [a, b, c] = journey.steps;
    // Chain a → b → c, then remove the pristine predecessor a.
    engine.updateJourney(journey.id, {
      editSteps: [
        { stepId: b.id, dependsOnStepId: a.id },
        { stepId: c.id, dependsOnStepId: b.id },
      ],
    });
    expect(journey.steps.find((s) => s.id === b.id)?.dependsOnStepId).toBe(a.id);

    engine.updateJourney(journey.id, { removeStepIds: [a.id] });

    // a is gone (pristine → spliced); b no longer points at it — it became a normal Step. c still → b.
    expect(journey.steps.some((s) => s.id === a.id)).toBe(false);
    expect(journey.steps.find((s) => s.id === b.id)?.dependsOnStepId).toBeUndefined();
    expect(journey.steps.find((s) => s.id === c.id)?.dependsOnStepId).toBe(b.id);
  });

  it('leaves the create path unchanged (Steps still built the same way)', () => {
    const { engine, state } = setup();
    const journey = seedJourney(engine);
    expect(state.journeys).toHaveLength(1);
    expect(journey.steps).toHaveLength(3);
    expect(journey.steps[0].isStarterStep).toBe(true);
    expect(journey.steps.every((s) => !s.done && s.id.length > 0)).toBe(true);
  });
});
