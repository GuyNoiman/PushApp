/**
 * JourneyEngine.activateJourney — the ONE Future → Active transition (Future Journey Management,
 * §9). These tests pin the invariants the whole feature rests on: activation happens EXACTLY once
 * (a duplicate tick / double tap / second device changes nothing), it preserves every id and the
 * recorded `startsAt` intention, and an early start rebases the dated Steps without reordering,
 * respacing, or duplicating anything.
 */
import { EventBus } from '../../events/EventBus';
import type { DomainEvent, JourneyActivated, PlanAdapted } from '../../events/events';
import type { AppState, Buddy, Journey, Step } from '../../types/domain';
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
const CREATED = 1_800_000_000_000;
const STARTS_AT = CREATED + 30 * DAY;

function step(id: string, over: Partial<Step> = {}): Step {
  return { id, title: id, isStarterStep: false, cadence: 'once', done: false, ...over };
}

/** A scheduled Future Journey with three dated Steps a week apart, plus one undated Step. */
function futureJourney(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Run 5km',
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    createdAt: CREATED,
    status: 'future',
    startsAt: STARTS_AT,
    milestones: [{ id: 'm1', title: 'Base', order: 0 }],
    steps: [
      step('s1', { plannedFor: STARTS_AT }),
      step('s2', { plannedFor: STARTS_AT + 7 * DAY }),
      step('s3', { plannedFor: STARTS_AT + 14 * DAY }),
      step('s_undated'),
    ],
    ...over,
  };
}

function setup(journey: Journey = futureJourney()) {
  const bus = new EventBus();
  const state = emptyState();
  state.journeys.push(journey);
  const engine = new JourneyEngine(bus, () => state);
  const events: DomainEvent[] = [];
  bus.on('JourneyActivated', (e) => events.push(e));
  bus.on('PlanAdapted', (e) => events.push(e));
  return { bus, state, engine, events, journey };
}

describe('activateJourney — the single transition', () => {
  it('flips future → active, stamps activatedAt, and leaves startsAt/createdAt alone', () => {
    const { engine, journey, events } = setup();

    const activated = engine.activateJourney('j1', STARTS_AT)!;

    expect(activated.status).toBe('active');
    expect(activated.activatedAt).toBe(STARTS_AT);
    expect(activated.startsAt).toBe(STARTS_AT); // the recorded intention is immutable
    expect(activated.createdAt).toBe(CREATED); // creation time is never rewritten (§14.3)
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: 'JourneyActivated',
      journey,
      startedAt: STARTS_AT,
      early: false,
    });
  });

  it('preserves every Step / Milestone id and never duplicates a Step (AC #5)', () => {
    const { engine, journey } = setup();
    const stepIds = journey.steps.map((s) => s.id);

    engine.activateJourney('j1', STARTS_AT);

    expect(journey.steps.map((s) => s.id)).toEqual(stepIds);
    expect(journey.milestones).toEqual([{ id: 'm1', title: 'Base', order: 0 }]);
  });

  it('is IDEMPOTENT: a second call is a no-op with no second event and no duplicated Steps', () => {
    const { engine, journey, events } = setup();

    engine.activateJourney('j1', STARTS_AT);
    const secondCall = engine.activateJourney('j1', STARTS_AT + DAY);

    expect(secondCall).toBeNull();
    expect(journey.activatedAt).toBe(STARTS_AT); // the first activation stands
    expect(journey.steps).toHaveLength(4);
    expect(events.filter((e) => e.type === 'JourneyActivated')).toHaveLength(1);
  });

  it('does nothing for an unknown id or a Journey that is not Future', () => {
    const { engine, state, events } = setup();
    state.journeys.push(
      { ...futureJourney({ id: 'active' }), status: 'active' },
      { ...futureJourney({ id: 'frozen' }), status: 'frozen' },
      { ...futureJourney({ id: 'done' }), status: 'completed', completedAt: CREATED },
    );

    expect(engine.activateJourney('nope', STARTS_AT)).toBeNull();
    expect(engine.activateJourney('active', STARTS_AT)).toBeNull();
    expect(engine.activateJourney('frozen', STARTS_AT)).toBeNull();
    expect(engine.activateJourney('done', STARTS_AT)).toBeNull();
    expect(events).toHaveLength(0);
  });

  it('marks an EARLY start, and never marks a manual-start Journey early (it has no instant)', () => {
    const early = setup();
    const at = STARTS_AT - 10 * DAY;
    early.engine.activateJourney('j1', at);
    expect((early.events[0] as JourneyActivated).early).toBe(true);

    const manual = setup(futureJourney({ startsAt: undefined }));
    manual.engine.activateJourney('j1', CREATED + DAY);
    expect((manual.events[0] as JourneyActivated).early).toBe(false);
  });
});

describe('activateJourney — rebase (manual / early start)', () => {
  it('shifts every DATED Step by exactly at - startsAt, preserving order and gaps', () => {
    const { engine, journey, events } = setup();
    const at = STARTS_AT - 10 * DAY;

    engine.activateJourney('j1', at, { rebase: true });

    expect(journey.steps.map((s) => s.plannedFor)).toEqual([
      at,
      at + 7 * DAY,
      at + 14 * DAY,
      undefined, // the undated Step is left alone
    ]);
    // One PlanAdapted per moved Step, through the same seam deferDependents uses.
    const adapted = events.filter((e): e is PlanAdapted => e.type === 'PlanAdapted');
    expect(adapted).toHaveLength(3);
    expect(adapted.map((e) => e.stepId)).toEqual(['s1', 's2', 's3']);
  });

  it('rebases FORWARD too when the start is later than the recorded instant', () => {
    const { engine, journey } = setup();
    const at = STARTS_AT + 3 * DAY;

    engine.activateJourney('j1', at, { rebase: true });

    expect(journey.steps.map((s) => s.plannedFor)).toEqual([
      at,
      at + 7 * DAY,
      at + 14 * DAY,
      undefined,
    ]);
  });

  it('leaves every plannedFor alone without rebase — the approved start stays the anchor (§9)', () => {
    const { engine, journey, events } = setup();

    engine.activateJourney('j1', STARTS_AT + 5 * DAY);

    expect(journey.steps.map((s) => s.plannedFor)).toEqual([
      STARTS_AT,
      STARTS_AT + 7 * DAY,
      STARTS_AT + 14 * DAY,
      undefined,
    ]);
    expect(events.filter((e) => e.type === 'PlanAdapted')).toHaveLength(0);
  });

  it('is a plain activation for a manual-start Journey — nothing to rebase against', () => {
    const { engine, journey, events } = setup(
      futureJourney({ startsAt: undefined, steps: [step('s1', { plannedFor: CREATED + DAY })] }),
    );

    engine.activateJourney('j1', CREATED + 5 * DAY, { rebase: true });

    expect(journey.steps[0].plannedFor).toBe(CREATED + DAY);
    expect(events.filter((e) => e.type === 'PlanAdapted')).toHaveLength(0);
  });
});

describe('setJourneyStart — reschedule never activates (§8)', () => {
  it('rewrites the intended instant + zone and keeps the Journey Future', () => {
    const { engine, journey } = setup();

    const updated = engine.setJourneyStart('j1', STARTS_AT + 7 * DAY, 'Asia/Jerusalem')!;

    expect(updated.status).toBe('future');
    expect(updated.startsAt).toBe(STARTS_AT + 7 * DAY);
    expect(updated.startTimeZone).toBe('Asia/Jerusalem');
    expect(journey.activatedAt).toBeUndefined();
  });

  it('clears the date (back to manual start) when no instant is given', () => {
    const { engine } = setup();

    const updated = engine.setJourneyStart('j1')!;

    expect(updated.startsAt).toBeUndefined();
    expect(updated.startTimeZone).toBeUndefined();
    expect(updated.status).toBe('future');
  });

  it('refuses on a Journey that is not Future', () => {
    const { engine, state } = setup();
    state.journeys.push({ ...futureJourney({ id: 'active' }), status: 'active' });

    expect(engine.setJourneyStart('active', STARTS_AT)).toBeNull();
    expect(engine.setJourneyStart('nope', STARTS_AT)).toBeNull();
  });
});
