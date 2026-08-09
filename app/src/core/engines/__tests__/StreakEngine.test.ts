/**
 * StreakEngine unit tests — pure TS, a fixed injectable clock and hand-built AppState
 * fixtures (mirroring BehaviorModelEngine.test.ts). Verifies the day-count streak rule
 * (founder decision D26.4): a new-day check-in increments once per day, an ordinary miss
 * does NOT reset, an URGENT miss (no slack left this week) DOES reset, and the count
 * persists/restores through AppState.
 */
import { EventBus } from '../../events/EventBus';
import type { StreakChanged } from '../../events/events';
import type { AppState, Journey, Step } from '../../types/domain';
import { StreakEngine } from '../StreakEngine';

// A mutable "current time" the injected clock reads, so a test can advance the calendar day.
let clock = 0;
const now = () => clock;

// Anchor dates in the MIDDLE of a week (Wednesday 2026-07-15) so "days left in week" has slack
// for a few-times-week Journey but not for a weekly one — lets us exercise both miss branches.
const WED = new Date(2026, 6, 15, 10, 0, 0).getTime(); // Wed
const DAY = 24 * 60 * 60 * 1000;

function step(over: Partial<Step> = {}): Step {
  return { id: 'step_1', title: 'Do the thing', isStarterStep: false, cadence: 'once', done: false, ...over };
}

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'journey_1',
    title: 'Run 5km',
    why: ['because'],
    durationDays: 30,
    rhythm: 'few-times-week',
    steps: [step()],
    createdAt: 1000,
    ...over,
  };
}

function stateWith(journeys: Journey[], over: Partial<AppState> = {}): AppState {
  return {
    dreams: [],
    journeys,
    buddy: { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0, ownedCosmetics: [], equippedCosmetic: null },
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
    streak: 0,
    lastActiveDay: null,
    ...over,
  };
}

function harness(journeys: Journey[], over: Partial<AppState> = {}) {
  const bus = new EventBus();
  const state = stateWith(journeys, over);
  const engine = new StreakEngine(bus, () => state, now);
  engine.start();
  const changes: StreakChanged[] = [];
  bus.on('StreakChanged', (e) => changes.push(e));
  return { bus, state, engine, changes };
}

function checkIn(bus: EventBus, journeyId = 'journey_1', stepId = 'step_1') {
  bus.emit({
    type: 'StepCheckedIn',
    journeyId,
    step: step({ id: stepId, done: true, lastCheckInAt: clock }),
    checkIn: { id: 'c1', journeyId, stepId, at: clock },
  });
}

describe('StreakEngine — increment', () => {
  it('first-ever check-in sets the streak to 1', () => {
    clock = WED;
    const { bus, state, changes } = harness([journey()]);

    checkIn(bus);

    expect(state.streak).toBe(1);
    expect(state.lastActiveDay).toBe('2026-07-15');
    expect(changes).toEqual([{ type: 'StreakChanged', streak: 1 }]);
  });

  it('multiple check-ins on the SAME day increment only once', () => {
    clock = WED;
    const { bus, state, changes } = harness([journey()]);

    checkIn(bus);
    clock = WED + 3 * 60 * 60 * 1000; // later the same day
    checkIn(bus);

    expect(state.streak).toBe(1);
    expect(changes).toHaveLength(1);
  });

  it('a check-in on each NEW day increments by one per day', () => {
    clock = WED;
    const { bus, state } = harness([journey()]);

    checkIn(bus);
    clock = WED + DAY; // Thu
    checkIn(bus);
    clock = WED + 2 * DAY; // Fri
    checkIn(bus);

    expect(state.streak).toBe(3);
    expect(state.lastActiveDay).toBe('2026-07-17');
  });
});

describe('StreakEngine — miss', () => {
  it('an ORDINARY miss (slack left this week) does NOT reset the streak', () => {
    clock = WED; // Wed → 5 days left in the week; few-times-week needs 3 → slack remains
    const { bus, state, changes } = harness([journey()], { streak: 4, lastActiveDay: '2026-07-14' });

    bus.emit({ type: 'StepMissed', journeyId: 'journey_1', stepId: 'step_1' });

    expect(state.streak).toBe(4);
    expect(state.lastActiveDay).toBe('2026-07-14');
    expect(changes).toHaveLength(0);
  });

  it('an URGENT miss (no slack left) resets the streak to 0 and clears lastActiveDay', () => {
    // A weekly Journey needs 1 session; on Wed there are 5 days left, so still slack —
    // move the clock to Sunday, when only 1 day is left and the 1 required session is unmet.
    clock = new Date(2026, 6, 19, 10, 0, 0).getTime(); // Sun 2026-07-19
    const { bus, state, changes } = harness([journey({ rhythm: 'weekly' })], {
      streak: 6,
      lastActiveDay: '2026-07-18',
    });

    bus.emit({ type: 'StepMissed', journeyId: 'journey_1', stepId: 'step_1' });

    expect(state.streak).toBe(0);
    expect(state.lastActiveDay).toBeNull();
    expect(changes).toEqual([{ type: 'StreakChanged', streak: 0 }]);
  });

  it('a daily Journey miss is always urgent — resets even mid-week', () => {
    clock = WED; // Wed → 5 days left; daily needs 7 → no slack any day
    const { bus, state } = harness([journey({ rhythm: 'daily' })], { streak: 9, lastActiveDay: '2026-07-14' });

    bus.emit({ type: 'StepMissed', journeyId: 'journey_1', stepId: 'step_1' });

    expect(state.streak).toBe(0);
    expect(state.lastActiveDay).toBeNull();
  });

  it('after an urgent reset, the next new-day check-in starts a fresh streak at 1', () => {
    clock = new Date(2026, 6, 19, 10, 0, 0).getTime(); // Sun
    const { bus, state } = harness([journey({ rhythm: 'weekly' })], { streak: 6, lastActiveDay: '2026-07-18' });

    bus.emit({ type: 'StepMissed', journeyId: 'journey_1', stepId: 'step_1' });
    expect(state.streak).toBe(0);

    checkIn(bus); // same Sunday, but lastActiveDay was cleared → counts
    expect(state.streak).toBe(1);
    expect(state.lastActiveDay).toBe('2026-07-19');
  });
});

describe('StreakEngine — persistence', () => {
  it('restores a persisted streak and continues from it on the next new day', () => {
    clock = WED;
    // Simulate a reloaded snapshot: streak already at 2, last counted the day before.
    const { bus, state } = harness([journey()], { streak: 2, lastActiveDay: '2026-07-14' });

    checkIn(bus); // Wed — a new day after Tue

    expect(state.streak).toBe(3);
    expect(state.lastActiveDay).toBe('2026-07-15');
  });
});
