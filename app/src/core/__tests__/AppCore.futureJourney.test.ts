/**
 * AppCore — Future Journey Management end to end over the facade. Verifies the pieces that only
 * exist once the engines are wired together: a scheduled start that elapsed while the app was CLOSED
 * is already active before the first snapshot is read (§9, no flicker); the plan's saved reminder
 * rules stay inert while the Journey is Future and begin scheduling the moment it starts (§14.4 →
 * §9); the early "Start Journey" rebase; rescheduling that never activates (§8); and the capacity
 * read on the snapshot (§10).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockSchedule = jest.fn(async () => `notif_${Math.random().toString(36).slice(2)}`);
const mockCancel = jest.fn(async (_id?: string) => {});
const mockCancelAll = jest.fn(async () => {});
jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: () => mockSchedule(),
  cancelScheduledNotificationAsync: (id: string) => mockCancel(id),
  cancelAllScheduledNotificationsAsync: () => mockCancelAll(),
}));

import { AppCore } from '../AppCore';
import { FUTURE_JOURNEY_POLICY } from '../config/futureJourneys';
import type { AppState, Buddy, Journey } from '../types/domain';
import type { Repository } from '../persistence/Repository';
import type { FirstRunFlag } from '../persistence/firstRunFlag';

function initialBuddy(): Buddy {
  return { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0, ownedCosmetics: [], equippedCosmetic: null };
}

/** A full, valid persisted snapshot to preload (so start() skips the demo seed and loads this). */
function baseState(overrides: Partial<AppState> = {}): AppState {
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
    onboardingCompletedAt: 1,
    lastAuthenticatedActivityAt: NOW,
    ...overrides,
  };
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

/** A Future Journey with three dated Steps a week apart from `startsAt`. */
function futureJourney(id: string, over: Partial<Journey> = {}): Journey {
  const startsAt = over.startsAt ?? NOW + 30 * DAY;
  return {
    id,
    title: id,
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    createdAt: NOW - DAY,
    status: 'future',
    startsAt,
    steps: [0, 1, 2].map((w) => ({
      id: `${id}_s${w}`,
      title: `step ${w}`,
      isStarterStep: w === 0,
      cadence: 'once' as const,
      done: false,
      plannedFor: startsAt + w * 7 * DAY,
    })),
    ...over,
  };
}

function preloadedRepo(state: AppState | null): { repo: Repository; saved: () => AppState | null } {
  let saved: AppState | null = state;
  return {
    repo: {
      async load() {
        return saved ? { kind: 'loaded', state: saved } : { kind: 'first-run' };
      },
      async save(next: AppState) {
        saved = next;
      },
      async clear() {
        saved = null;
      },
    },
    saved: () => saved,
  };
}

function consumedFlag(): FirstRunFlag {
  return {
    async isConsumed() {
      return true;
    },
    async markConsumed() {},
  };
}

/** Let the fire-and-forget reconcile (cancel-all → schedule) settle. */
async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('AppCore.start — reconciles a start that elapsed while the app was closed (§9)', () => {
  it('has the Journey ACTIVE before the first snapshot is read (no Future → Active flicker)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const startsAt = NOW - 10 * DAY; // came due while the app was killed
    const { repo, saved } = preloadedRepo(
      baseState({ journeys: [futureJourney('elapsed', { startsAt })] }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    const journey = core.getSnapshot().journeys[0];
    expect(journey.status).toBe('active');
    expect(journey.activatedAt).toBe(startsAt); // anchored on the APPROVED instant, not on `now`
    expect(journey.startsAt).toBe(startsAt); // the recorded intention is preserved
    // Persisted through JourneyActivated → onChanged.
    expect(saved()!.journeys[0].status).toBe('active');
  });

  it('leaves a start still in the future alone, and starts it on a later syncTime beat', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const startsAt = NOW + 2 * DAY;
    const { repo } = preloadedRepo(baseState({ journeys: [futureJourney('soon', { startsAt })] }));
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    expect(core.getSnapshot().journeys[0].status).toBe('future');

    jest.setSystemTime(startsAt + 1);
    core.syncTime();

    expect(core.getSnapshot().journeys[0].status).toBe('active');
    expect(core.getSnapshot().journeys[0].activatedAt).toBe(startsAt);
  });
});

describe("AppCore — a Future Journey's saved reminders stay inert until it starts", () => {
  it('plans nothing before activation and plans the saved rule right after (§9 "no burst")', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({ journeys: [futureJourney('later', { startsAt: NOW + 30 * DAY })] }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();
    await core.initReminders(); // OS permission granted (mocked) — the scheduler may schedule

    // The approved plan carries its reminders from the start (§6) — they simply schedule nothing.
    await core.addReminderRule({
      journeyId: 'later',
      trigger: { kind: 'fixedTime', hour: 8, minute: 30 },
      title: 'Time to move',
      body: 'Your Journey is waiting.',
    });
    await flush();
    expect(mockSchedule).not.toHaveBeenCalled();

    core.startJourneyNow('later');
    await flush();

    // One reconcile of the whole set — the previously-inert rule now plans a repeating notification.
    expect(mockSchedule).toHaveBeenCalled();
    // Repeating daily/weekly triggers only: there is no dated one-shot to fire for an elapsed day,
    // so a long wait can never produce a burst of stale notifications.
    expect(core.listReminderRules('later')).toHaveLength(1);
  });
});

describe('AppCore.startJourneyNow — the early start rebases the plan (§9)', () => {
  it('shifts every plannedFor back by exactly the head start and preserves order', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const startsAt = NOW + 10 * DAY;
    const { repo } = preloadedRepo(baseState({ journeys: [futureJourney('early', { startsAt })] }));
    const core = new AppCore(repo, consumedFlag());
    await core.start();
    const before = core.getSnapshot().journeys[0].steps.map((s) => s.plannedFor!);

    const started = core.startJourneyNow('early')!;

    expect(started.status).toBe('active');
    expect(started.activatedAt).toBe(NOW);
    expect(started.startsAt).toBe(startsAt); // the intention is still recorded honestly
    expect(started.steps.map((s) => s.plannedFor)).toEqual(before.map((p) => p - 10 * DAY));
    // Order + spacing unchanged: still one week apart, still ascending.
    expect(started.steps[1].plannedFor! - started.steps[0].plannedFor!).toBe(7 * DAY);
    expect(started.steps.map((s) => s.id)).toEqual(['early_s0', 'early_s1', 'early_s2']);
  });

  it('is a no-op on a Journey that already started (one activation, AC #5)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({ journeys: [futureJourney('once', { startsAt: NOW + DAY })] }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    expect(core.startJourneyNow('once')).not.toBeNull();
    expect(core.startJourneyNow('once')).toBeNull();
    expect(core.getSnapshot().journeys[0].steps).toHaveLength(3);
  });

  it('starts a manual ("when ready") Journey, which the clock never would', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const manual = futureJourney('when_ready');
    delete manual.startsAt;
    const { repo } = preloadedRepo(baseState({ journeys: [manual] }));
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    // A year of ticks changes nothing…
    jest.setSystemTime(NOW + 365 * DAY);
    core.syncTime();
    expect(core.getSnapshot().journeys[0].status).toBe('future');

    // …until the user starts it.
    expect(core.startJourneyNow('when_ready')!.status).toBe('active');
  });
});

describe('AppCore.rescheduleFutureJourney — editing never activates (§8)', () => {
  it('moves the planned start and keeps the Journey Future', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo, saved } = preloadedRepo(
      baseState({ journeys: [futureJourney('move', { startsAt: NOW + 5 * DAY })] }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    const moved = core.rescheduleFutureJourney('move', NOW + 20 * DAY, 'Asia/Jerusalem')!;

    expect(moved.status).toBe('future');
    expect(moved.startsAt).toBe(NOW + 20 * DAY);
    expect(moved.startTimeZone).toBe('Asia/Jerusalem');
    expect(moved.activatedAt).toBeUndefined();
    expect(saved()!.journeys[0].startsAt).toBe(NOW + 20 * DAY);
  });

  it('refuses to touch a Journey that already started', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({ journeys: [futureJourney('running', { status: 'active' })] }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    expect(core.rescheduleFutureJourney('running', NOW + 20 * DAY)).toBeNull();
  });
});

describe('AppCore — the Future list is real data + a capacity read (§10)', () => {
  it('exposes the capacity on the snapshot and refuses past the cap', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const journeys = Array.from({ length: FUTURE_JOURNEY_POLICY.max - 1 }, (_, i) =>
      futureJourney(`f${i}`),
    );
    const { repo } = preloadedRepo(baseState({ journeys }));
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    expect(core.getSnapshot().futureCapacity).toMatchObject({
      count: FUTURE_JOURNEY_POLICY.max - 1,
      slotsRemaining: 1,
      capReached: false,
      offerReview: true,
    });

    const input = {
      title: 'The last slot',
      why: [],
      durationDays: 30,
      rhythm: 'daily' as const,
      steps: [{ title: 'Step' }],
    };
    expect(core.createFutureJourney(input, { mode: 'manual' })).not.toBeNull();
    expect(core.getSnapshot().futureCapacity.capReached).toBe(true);
    expect(core.createFutureJourney(input, { mode: 'manual' })).toBeNull();
  });

  it('exposes no Home Steps, no active count and no progress for a Future Journey (AC #4)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({ journeys: [futureJourney('later'), futureJourney('running', { status: 'active' })] }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    const snapshot = core.getSnapshot();
    expect(snapshot.todaySteps.every((t) => t.journeyId === 'running')).toBe(true);
    expect(snapshot.weekSteps.every((t) => t.journeyId === 'running')).toBe(true);
    expect(snapshot.activeJourneyCount).toBe(1);
    // The Journey itself is still in the list — the Future tab renders REAL data (AC #2).
    expect(snapshot.journeys.map((j) => j.id)).toEqual(['later', 'running']);
  });
});
