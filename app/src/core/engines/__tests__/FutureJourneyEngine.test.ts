/**
 * FutureJourneyEngine unit tests (Future Journey Management, §9) — pure TS, `now` injected so every
 * case is deterministic. Verifies the `now >= startsAt` boundary, that a long-past instant lands
 * exactly ONE activation however many beats have passed, that a manual-start Journey never activates
 * from the clock, and that an unresolved account-inactivity freeze blocks the sweep entirely
 * (Inactivity PRD §3.3) without touching the Journey's Future state or its planned start (§4).
 */
import { EventBus } from '../../events/EventBus';
import type { DomainEvent, JourneyActivated } from '../../events/events';
import type { AppState, Buddy, Journey } from '../../types/domain';
import { FutureJourneyEngine } from '../FutureJourneyEngine';
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

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

/** A Future Journey with one dated Step on its start day. */
function futureJourney(id: string, over: Partial<Journey> = {}): Journey {
  return {
    id,
    title: id,
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    createdAt: NOW - 30 * DAY,
    status: 'future',
    steps: [
      {
        id: `${id}_s0`,
        title: 'step',
        isStarterStep: false,
        cadence: 'once',
        done: false,
        plannedFor: NOW,
      },
    ],
    ...over,
  };
}

function setup() {
  const bus = new EventBus();
  const state = emptyState();
  const journeyEngine = new JourneyEngine(bus, () => state);
  const engine = new FutureJourneyEngine(bus, () => state, journeyEngine);
  const events: DomainEvent[] = [];
  bus.on('JourneyActivated', (e) => events.push(e));
  bus.on('PlanAdapted', (e) => events.push(e));
  return { state, engine, events };
}

describe('FutureJourneyEngine.tick — the scheduled boundary (§5: now >= startsAt)', () => {
  it('does NOT activate before the instant', () => {
    const { state, engine, events } = setup();
    state.journeys.push(futureJourney('later', { startsAt: NOW + 1 }));

    engine.tick(NOW);

    expect(state.journeys[0].status).toBe('future');
    expect(state.journeys[0].activatedAt).toBeUndefined();
    expect(events).toHaveLength(0);
  });

  it('activates exactly AT the instant', () => {
    const { state, engine, events } = setup();
    state.journeys.push(futureJourney('due', { startsAt: NOW }));

    engine.tick(NOW);

    expect(state.journeys[0].status).toBe('active');
    expect(state.journeys[0].activatedAt).toBe(NOW);
    expect(events).toHaveLength(1);
  });
});

describe('FutureJourneyEngine.tick — reconciles a long absence into ONE activation (§9)', () => {
  it('activates a long-past instant once, anchored on the APPROVED start (no rebase, no burst)', () => {
    const { state, engine, events } = setup();
    const startsAt = NOW - 45 * DAY;
    state.journeys.push(futureJourney('overdue', { startsAt, steps: [] }));

    engine.tick(NOW);

    const journey = state.journeys[0];
    expect(journey.status).toBe('active');
    // Anchored on the approved instant, not on `now` — existing recovery rules handle elapsed Steps.
    expect(journey.activatedAt).toBe(startsAt);
    expect(journey.startsAt).toBe(startsAt);
    expect((events[0] as JourneyActivated).early).toBe(false);
    // rebase:false ⇒ no Step was moved.
    expect(events.filter((e) => e.type === 'PlanAdapted')).toHaveLength(0);
  });

  it('a second (and third) tick changes nothing — the transition is idempotent', () => {
    const { state, engine, events } = setup();
    state.journeys.push(futureJourney('due', { startsAt: NOW - DAY }));

    engine.tick(NOW);
    engine.tick(NOW + DAY);
    engine.tick(NOW + 10 * DAY);

    expect(state.journeys[0].activatedAt).toBe(NOW - DAY);
    expect(events.filter((e) => e.type === 'JourneyActivated')).toHaveLength(1);
  });

  it('leaves the Steps of an activated Journey exactly where the plan put them', () => {
    const { state, engine } = setup();
    state.journeys.push(futureJourney('due', { startsAt: NOW - DAY }));

    engine.tick(NOW);

    expect(state.journeys[0].steps[0].plannedFor).toBe(NOW);
  });
});

describe('FutureJourneyEngine.tick — manual start never activates from the clock (§5)', () => {
  it('ignores a Future Journey with no instant, however long it has waited', () => {
    const { state, engine, events } = setup();
    state.journeys.push(futureJourney('when_ready'));

    engine.tick(NOW + 365 * DAY);

    expect(state.journeys[0].status).toBe('future');
    expect(events).toHaveLength(0);
  });
});

describe('FutureJourneyEngine.tick — blocked while the account is frozen away (Inactivity §3.3)', () => {
  it('activates nothing during an UNRESOLVED freeze and preserves the Future state + start', () => {
    const { state, engine, events } = setup();
    const startsAt = NOW - 5 * DAY;
    state.journeys.push(futureJourney('due', { startsAt }));
    state.accountInactivity = { frozenAt: NOW - DAY, returnedAt: NOW - DAY };

    engine.tick(NOW);

    expect(state.journeys[0].status).toBe('future');
    expect(state.journeys[0].startsAt).toBe(startsAt);
    expect(state.journeys[0].activatedAt).toBeUndefined();
    expect(events).toHaveLength(0);
  });

  it('resumes activating on the next tick once the return is resolved', () => {
    const { state, engine } = setup();
    state.journeys.push(futureJourney('due', { startsAt: NOW - 5 * DAY }));
    state.accountInactivity = { frozenAt: NOW - DAY, returnedAt: NOW - DAY };

    engine.tick(NOW);
    expect(state.journeys[0].status).toBe('future');

    state.accountInactivity.resolved = true;
    engine.tick(NOW + 1);

    expect(state.journeys[0].status).toBe('active');
    expect(state.journeys[0].activatedAt).toBe(NOW - 5 * DAY);
  });

  it('a RESOLVED marker never blocks the sweep', () => {
    const { state, engine } = setup();
    state.journeys.push(futureJourney('due', { startsAt: NOW - DAY }));
    state.accountInactivity = { frozenAt: NOW - DAY, returnedAt: NOW - DAY, resolved: true };

    engine.tick(NOW);

    expect(state.journeys[0].status).toBe('active');
  });
});

describe('FutureJourneyEngine.tick — touches nothing else', () => {
  it('leaves active, frozen and completed Journeys alone even with a past startsAt', () => {
    const { state, engine, events } = setup();
    state.journeys.push(
      { ...futureJourney('active', { startsAt: NOW - DAY }), status: 'active' },
      { ...futureJourney('frozen', { startsAt: NOW - DAY }), status: 'frozen' },
      {
        ...futureJourney('done', { startsAt: NOW - DAY }),
        status: 'completed',
        completedAt: NOW - DAY,
      },
    );

    engine.tick(NOW);

    expect(state.journeys.map((j) => j.status)).toEqual(['active', 'frozen', 'completed']);
    expect(events).toHaveLength(0);
  });

  it('activates several due Journeys in one tick, each exactly once', () => {
    const { state, engine, events } = setup();
    state.journeys.push(
      futureJourney('a', { startsAt: NOW - 2 * DAY }),
      futureJourney('b', { startsAt: NOW - DAY }),
      futureJourney('c', { startsAt: NOW + DAY }),
    );

    engine.tick(NOW);

    expect(state.journeys.map((j) => j.status)).toEqual(['active', 'active', 'future']);
    expect(events.filter((e) => e.type === 'JourneyActivated')).toHaveLength(2);
  });
});
