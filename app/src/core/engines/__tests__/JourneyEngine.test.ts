/**
 * JourneyEngine unit tests — pure TS, no RN rendering needed. Verifies the
 * create + check-in flow and the events other engines depend on
 * (Engineering Bible §18: every major engine has independent tests).
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
  };
}

function setup() {
  const bus = new EventBus();
  const state = emptyState();
  const engine = new JourneyEngine(bus, () => state);
  const events: DomainEvent[] = [];
  const record = (event: DomainEvent) => events.push(event);
  bus.on('JourneyCreated', record);
  bus.on('StepCheckedIn', record);
  bus.on('JourneyCompleted', record);
  return { bus, state, engine, events };
}

describe('JourneyEngine.createJourney', () => {
  it('creates a Journey, stores it, and emits JourneyCreated', () => {
    const { engine, state, events } = setup();

    const journey = engine.createJourney({
      title: 'Run 5km',
      why: ['Feel stronger'],
      durationDays: 30,
      rhythm: 'few-times-week',
      steps: [
        { title: 'Lace up and walk', isStarterStep: true, cadence: 'once' },
        { title: 'Jog 15 minutes' },
      ],
    });

    expect(state.journeys).toHaveLength(1);
    expect(journey.title).toBe('Run 5km');
    expect(journey.why).toEqual(['Feel stronger']);
    expect(journey.steps).toHaveLength(2);
    expect(journey.steps.every((s) => s.id.length > 0)).toBe(true);
    expect(journey.steps.every((s) => !s.done)).toBe(true);
    expect(events.map((e) => e.type)).toEqual(['JourneyCreated']);
  });

  it('applies Step defaults: isStarterStep false and cadence once', () => {
    const { engine } = setup();

    const journey = engine.createJourney({
      title: 'Learn to draw',
      why: [],
      durationDays: 60,
      rhythm: 'daily',
      steps: [{ title: 'Sketch one shape' }],
    });

    expect(journey.steps[0].isStarterStep).toBe(false);
    expect(journey.steps[0].cadence).toBe('once');
  });
});

describe('JourneyEngine.checkInStep', () => {
  it('marks a Step done, records a CheckIn, and emits StepCheckedIn', () => {
    const { engine, state, events } = setup();
    const journey = engine.createJourney({
      title: 'Run 5km',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Walk' }, { title: 'Jog' }],
    });

    engine.checkInStep(journey.id, journey.steps[0].id);

    expect(journey.steps[0].done).toBe(true);
    expect(journey.steps[0].lastCheckInAt).toBeDefined();
    expect(state.checkIns).toHaveLength(1);
    expect(events.filter((e) => e.type === 'StepCheckedIn')).toHaveLength(1);
    expect(events.some((e) => e.type === 'JourneyCompleted')).toBe(false);
  });

  it('emits JourneyCompleted once every Step is done', () => {
    const { engine, events } = setup();
    const journey = engine.createJourney({
      title: 'Run 5km',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Walk' }, { title: 'Jog' }],
    });

    engine.checkInStep(journey.id, journey.steps[0].id);
    engine.checkInStep(journey.id, journey.steps[1].id);

    const completed = events.filter((e) => e.type === 'JourneyCompleted');
    expect(completed).toHaveLength(1);
    expect(journey.completedAt).toBeDefined();
  });

  it('is a no-op for a missing Journey/Step or an already-done Step', () => {
    const { engine, events } = setup();
    const journey = engine.createJourney({
      title: 'Run 5km',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Walk' }],
    });

    engine.checkInStep('missing', journey.steps[0].id);
    engine.checkInStep(journey.id, 'missing');
    engine.checkInStep(journey.id, journey.steps[0].id); // completes it
    engine.checkInStep(journey.id, journey.steps[0].id); // already done

    expect(events.filter((e) => e.type === 'StepCheckedIn')).toHaveLength(1);
  });
});

describe('JourneyEngine.getTodaySteps', () => {
  it('returns only not-done Steps of active Journeys', () => {
    const { engine } = setup();
    const a = engine.createJourney({
      title: 'Run 5km',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Walk' }, { title: 'Jog' }],
    });
    const b = engine.createJourney({
      title: 'Read daily',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ title: 'Read a page' }],
    });

    engine.checkInStep(a.id, a.steps[0].id); // one Step of A done
    engine.checkInStep(b.id, b.steps[0].id); // completes B entirely

    const today = engine.getTodaySteps();
    expect(today).toHaveLength(1);
    expect(today[0].journeyId).toBe(a.id);
    expect(today[0].step.title).toBe('Jog');
    expect(today[0].journeyTitle).toBe('Run 5km');
  });
});
