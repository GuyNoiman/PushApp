/**
 * JourneyEngine.deleteJourney tests (task J2) — the permanent delete/abandon path. Verifies the
 * Journey (and its Steps) are hard-removed, that JourneyDeleted (id only) is emitted, that an
 * unknown id is a no-op returning false, and that OTHER Journeys are left untouched.
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
  bus.on('JourneyDeleted', (event: DomainEvent) => events.push(event));
  return { bus, state, engine, events };
}

function seedJourney(engine: JourneyEngine, title = 'Run 5km') {
  return engine.createJourney({
    title,
    why: ['Feel stronger'],
    durationDays: 30,
    rhythm: 'few-times-week',
    steps: [
      { title: 'Lace up and walk', isStarterStep: true, cadence: 'once' },
      { title: 'Jog 15 minutes', cadence: 'weekly' },
    ],
  });
}

describe('JourneyEngine.deleteJourney', () => {
  it('hard-removes the Journey and its Steps, emits JourneyDeleted, and returns true', () => {
    const { engine, state, events } = setup();
    const journey = seedJourney(engine);
    expect(state.journeys).toHaveLength(1);

    const removed = engine.deleteJourney(journey.id);

    expect(removed).toBe(true);
    expect(state.journeys).toHaveLength(0);
    expect(state.journeys.some((j) => j.id === journey.id)).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'JourneyDeleted', journeyId: journey.id });
  });

  it('returns false and emits nothing for an unknown id', () => {
    const { engine, state, events } = setup();
    seedJourney(engine);

    const removed = engine.deleteJourney('journey_does_not_exist');

    expect(removed).toBe(false);
    expect(state.journeys).toHaveLength(1);
    expect(events).toHaveLength(0);
  });

  it('deletes only the target Journey, leaving others untouched', () => {
    const { engine, state } = setup();
    const keep = seedJourney(engine, 'Keep me');
    const drop = seedJourney(engine, 'Drop me');
    expect(state.journeys).toHaveLength(2);

    engine.deleteJourney(drop.id);

    expect(state.journeys).toHaveLength(1);
    expect(state.journeys[0].id).toBe(keep.id);
    expect(state.journeys[0].title).toBe('Keep me');
  });
});
