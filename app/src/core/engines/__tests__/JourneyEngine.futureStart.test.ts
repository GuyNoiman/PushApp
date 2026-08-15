/**
 * JourneyEngine — creating a Journey saved for LATER (Future Journey Management, §5/§10). Pins the
 * two entry points: `createJourney` is untouched (still an immediate, `active` Journey with no start
 * fields), while `createFutureJourney` stores the chosen start mode and refuses at the cap.
 *
 * The invariant these tests exist to protect: `createdAt` records CREATION and never start time
 * (§14.3), even when the intended start is months away.
 */
import { EventBus } from '../../events/EventBus';
import type { DomainEvent } from '../../events/events';
import { FUTURE_JOURNEY_POLICY } from '../../config/futureJourneys';
import type { AppState, Buddy } from '../../types/domain';
import { JourneyEngine, type NewJourneyInput } from '../JourneyEngine';

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
  bus.on('JourneyCreated', (e) => events.push(e));
  return { bus, state, engine, events };
}

const DAY = 24 * 60 * 60 * 1000;

function input(over: Partial<NewJourneyInput> = {}): NewJourneyInput {
  return {
    title: 'Run 5km',
    why: ['because'],
    durationDays: 30,
    rhythm: 'daily',
    steps: [{ title: 'Walk' }, { title: 'Jog' }],
    ...over,
  };
}

describe('createJourney — the immediate path is unchanged (regression)', () => {
  it('still yields an active Journey with no start fields', () => {
    const { engine, events } = setup();

    const journey = engine.createJourney(input());

    expect(journey.status).toBe('active');
    expect(journey.startsAt).toBeUndefined();
    expect(journey.startTimeZone).toBeUndefined();
    expect(journey.activatedAt).toBeUndefined();
    expect(events).toHaveLength(1);
  });
});

describe('createFutureJourney — scheduled start', () => {
  it('stores the status, the intended instant and its zone context, and keeps createdAt = creation', () => {
    const { engine, state, events } = setup();
    const at = Date.now() + 60 * DAY;

    const journey = engine.createFutureJourney(input(), {
      mode: 'scheduled',
      at,
      timeZone: 'Europe/Berlin',
    })!;

    expect(journey.status).toBe('future');
    expect(journey.startsAt).toBe(at);
    expect(journey.startTimeZone).toBe('Europe/Berlin');
    expect(journey.activatedAt).toBeUndefined();
    // §14.3 — createdAt is creation time, NOT the start.
    expect(journey.createdAt).not.toBe(at);
    expect(journey.createdAt).toBeLessThanOrEqual(Date.now());
    expect(state.journeys).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('JourneyCreated');
  });

  it('keeps the full approved structure (Steps + Milestones), exactly like an immediate Journey (§6)', () => {
    const { engine } = setup();

    const journey = engine.createFutureJourney(
      input({ milestones: [{ id: 'm1', title: 'Base', order: 0 }] }),
      { mode: 'scheduled', at: Date.now() + DAY },
    )!;

    expect(journey.steps.map((s) => s.title)).toEqual(['Walk', 'Jog']);
    expect(journey.milestones).toEqual([{ id: 'm1', title: 'Base', order: 0 }]);
  });
});

describe('createFutureJourney — manual start', () => {
  it('is future with NO date (it never activates from the clock, §5)', () => {
    const { engine, events } = setup();

    const journey = engine.createFutureJourney(input(), { mode: 'manual' })!;

    expect(journey.status).toBe('future');
    expect(journey.startsAt).toBeUndefined();
    expect(journey.startTimeZone).toBeUndefined();
    expect(events).toHaveLength(1);
  });
});

describe('createFutureJourney — the capacity cap (§10)', () => {
  it('accepts the 10th and refuses the 11th without pushing or emitting anything', () => {
    const { engine, state, events } = setup();

    for (let i = 0; i < FUTURE_JOURNEY_POLICY.max; i++) {
      expect(engine.createFutureJourney(input({ title: `later ${i}` }), { mode: 'manual' })).not.toBeNull();
    }
    expect(state.journeys).toHaveLength(FUTURE_JOURNEY_POLICY.max);
    expect(events).toHaveLength(FUTURE_JOURNEY_POLICY.max);

    // At the cap the system cannot silently replace one — it simply declines.
    expect(engine.createFutureJourney(input({ title: 'one too many' }), { mode: 'manual' })).toBeNull();
    expect(state.journeys).toHaveLength(FUTURE_JOURNEY_POLICY.max);
    expect(events).toHaveLength(FUTURE_JOURNEY_POLICY.max);
  });

  it('does not let active / frozen / completed Journeys consume Future slots', () => {
    const { engine, state } = setup();
    for (let i = 0; i < FUTURE_JOURNEY_POLICY.max; i++) engine.createJourney(input());
    state.journeys[0].status = 'frozen';
    state.journeys[1].status = 'completed';
    state.journeys[1].completedAt = Date.now();

    expect(engine.createFutureJourney(input(), { mode: 'manual' })).not.toBeNull();
  });

  it('frees a slot again once a Future Journey is deleted', () => {
    const { engine, state } = setup();
    for (let i = 0; i < FUTURE_JOURNEY_POLICY.max; i++) {
      engine.createFutureJourney(input(), { mode: 'manual' });
    }
    expect(engine.createFutureJourney(input(), { mode: 'manual' })).toBeNull();

    engine.deleteJourney(state.journeys[0].id);

    expect(engine.createFutureJourney(input(), { mode: 'manual' })).not.toBeNull();
  });
});

describe('a Future Journey stays Future until it is deliberately started (§8)', () => {
  it('REFUSES to freeze one — pausing a Journey that never started is meaningless', () => {
    // A Future Journey already produces nothing to pause, and freezing it would overwrite the very
    // `future` state its planned start lives in (Inactivity PRD §4 says to preserve it, not convert
    // it). The detail screen hides Pause; the engine refuses it whoever asks.
    const { engine, state } = setup();
    const journey = engine.createFutureJourney(input(), { mode: 'scheduled', at: Date.now() + 7 * DAY });

    expect(engine.freezeJourney(journey!.id)).toBeNull();
    expect(state.journeys[0].status).toBe('future');
    expect(state.journeys[0].startsAt).toBeDefined();
  });

  it('REFUSES to freeze a completed or canceled Journey too (the same positive gate)', () => {
    const { engine, state } = setup();
    const done = engine.createJourney(input());
    done.status = 'completed';
    done.completedAt = Date.now();
    const stopped = engine.createJourney(input());
    stopped.status = 'abandoned';

    expect(engine.freezeJourney(done.id)).toBeNull();
    expect(engine.freezeJourney(stopped.id)).toBeNull();
    expect(state.journeys.map((j) => j.status)).toEqual(['completed', 'abandoned']);
  });

  it('EDITING a Future Journey never activates it (§8)', () => {
    const { engine, state } = setup();
    const at = Date.now() + 21 * DAY;
    const journey = engine.createFutureJourney(input(), { mode: 'scheduled', at })!;

    engine.updateJourney(journey.id, {
      title: 'Run 10km',
      durationDays: 60,
      addSteps: [{ title: 'Sprint' }],
    });

    const saved = state.journeys[0];
    expect(saved.status).toBe('future');
    expect(saved.startsAt).toBe(at);
    expect(saved.activatedAt).toBeUndefined();
    expect(saved.title).toBe('Run 10km');
  });

  it('RESCHEDULING never activates it either, and dropping the date makes it manual-start', () => {
    const { engine, state } = setup();
    const journey = engine.createFutureJourney(input(), {
      mode: 'scheduled',
      at: Date.now() + 7 * DAY,
    })!;
    const moved = Date.now() + 40 * DAY;

    expect(engine.setJourneyStart(journey.id, moved, 'Asia/Jerusalem')).not.toBeNull();
    expect(state.journeys[0]).toMatchObject({
      status: 'future',
      startsAt: moved,
      startTimeZone: 'Asia/Jerusalem',
    });

    engine.setJourneyStart(journey.id, undefined);
    expect(state.journeys[0].status).toBe('future');
    expect(state.journeys[0].startsAt).toBeUndefined();
    expect(state.journeys[0].startTimeZone).toBeUndefined();
  });
});
