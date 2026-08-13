/**
 * AppCore — Account Inactivity Freeze wiring (J5, LOCAL-FIRST POC). Verifies the local detector end
 * to end over the facade: a returning user whose persisted activity anchor is older than the
 * threshold has their active Journeys frozen (provenance-tagged) on the next lifecycle beat; the
 * return read-model groups Journeys by provenance; resume/keep/resolve drive the return; a long-gap
 * syncTime freeze cancels reminders + clears postpones; migration backfills a legacy frozen Journey
 * to 'manual' and seeds the anchor without an instant freeze; export includes the new fields and
 * resetToFirstRun clears them.
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
import { INACTIVITY_POLICY } from '../config/inactivityPolicy';
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
    ...overrides,
  };
}

function makeJourney(id: string, createdAt: number, extra: Partial<Journey> = {}): Journey {
  return {
    id,
    title: id,
    why: [],
    durationDays: 30,
    rhythm: 'daily',
    createdAt,
    status: 'active',
    steps: [{ id: `${id}_s0`, title: 'step', isStarterStep: false, cadence: 'once', done: false }],
    ...extra,
  };
}

/** A repo preloaded with `state` (load returns it once), capturing subsequent saves. */
function preloadedRepo(state: AppState | null): { repo: Repository; saved: () => AppState | null } {
  let saved: AppState | null = state;
  return {
    repo: {
      async load() {
        return saved;
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

const NOW = 1_800_000_000_000;
const LONG_AGO = NOW - INACTIVITY_POLICY.thresholdMs * 2;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('AppCore — inactivity freeze on launch (returning user)', () => {
  it('freezes active Journeys with account_inactivity provenance and opens a return', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({
        lastAuthenticatedActivityAt: LONG_AGO,
        journeys: [makeJourney('a', LONG_AGO), makeJourney('b', LONG_AGO)],
      }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    const journeys = core.getSnapshot().journeys;
    expect(journeys.every((j) => j.status === 'frozen')).toBe(true);
    expect(journeys.every((j) => j.freezeReason === 'account_inactivity')).toBe(true);

    const ret = core.getInactivityReturn()!;
    expect(ret.frozenJourneyIds.sort()).toEqual(['a', 'b']);
    expect(ret.manualFrozenJourneyIds).toEqual([]);
    expect(ret.futureJourneyIds).toEqual([]);
  });

  it('does NOT freeze a fresh user on first sight (no anchor yet)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo, saved } = preloadedRepo(
      baseState({ journeys: [makeJourney('a', LONG_AGO)] }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    expect(core.getSnapshot().journeys[0].status).toBe('active');
    expect(core.getInactivityReturn()).toBeNull();
    // The anchor was seeded (in-memory now; persisted on the next change/syncTime).
    core.syncTime();
    expect(saved()!.lastAuthenticatedActivityAt).toBe(NOW);
  });
});

describe('AppCore — getInactivityReturn groups by provenance', () => {
  it('separates away-frozen, manual-frozen, and future Journeys', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({
        lastAuthenticatedActivityAt: LONG_AGO,
        journeys: [
          makeJourney('away', LONG_AGO),
          makeJourney('paused', LONG_AGO, { status: 'frozen', freezeReason: 'manual' }),
          makeJourney('future', NOW + INACTIVITY_POLICY.thresholdMs),
        ],
      }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    const ret = core.getInactivityReturn()!;
    expect(ret.frozenJourneyIds).toEqual(['away']);
    expect(ret.manualFrozenJourneyIds).toEqual(['paused']);
    expect(ret.futureJourneyIds).toEqual(['future']);
  });
});

describe('AppCore — resume / keep / resolve the return', () => {
  async function frozenCore() {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({
        lastAuthenticatedActivityAt: LONG_AGO,
        journeys: [makeJourney('a', LONG_AGO), makeJourney('b', LONG_AGO)],
      }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();
    return core;
  }

  it('resumeInactivityJourney flips ONE back to active + clears its provenance; others stay frozen', async () => {
    const core = await frozenCore();

    const resumed = core.resumeInactivityJourney('a');
    expect(resumed).not.toBeNull();
    const a = core.getSnapshot().journeys.find((j) => j.id === 'a')!;
    const b = core.getSnapshot().journeys.find((j) => j.id === 'b')!;
    expect(a.status).toBe('active');
    expect(a.freezeReason).toBeUndefined();
    expect(b.status).toBe('frozen'); // untouched
    // One still away-frozen ⇒ the return is still pending.
    expect(core.getInactivityReturn()!.frozenJourneyIds).toEqual(['b']);
  });

  it('auto-resolves the return once the last away-frozen Journey is resumed', async () => {
    const core = await frozenCore();
    core.resumeInactivityJourney('a');
    core.resumeInactivityJourney('b');
    expect(core.getInactivityReturn()).toBeNull();
  });

  it('never resumes a manual pause via the inactivity path', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({
        lastAuthenticatedActivityAt: LONG_AGO,
        journeys: [makeJourney('paused', LONG_AGO, { status: 'frozen', freezeReason: 'manual' })],
      }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    expect(core.resumeInactivityJourney('paused')).toBeNull();
    expect(core.getSnapshot().journeys[0].status).toBe('frozen');
  });

  it('keepInactivityJourneyFrozen converts to a manual pause and resolves when none away-frozen remain', async () => {
    const core = await frozenCore();
    core.keepInactivityJourneyFrozen('a');
    const a = core.getSnapshot().journeys.find((j) => j.id === 'a')!;
    expect(a.status).toBe('frozen');
    expect(a.freezeReason).toBe('manual'); // no longer in the resume set
    core.keepInactivityJourneyFrozen('b');
    expect(core.getInactivityReturn()).toBeNull();
  });

  it('resolveInactivityReturn clears the pending return outright', async () => {
    const core = await frozenCore();
    expect(core.getInactivityReturn()).not.toBeNull();
    core.resolveInactivityReturn();
    expect(core.getInactivityReturn()).toBeNull();
  });
});

describe('AppCore — zero-frozen cycle leaves no lingering CTA (Fix 2)', () => {
  it('records a RESOLVED marker (getInactivityReturn null) when only a Future Journey exists', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({
        lastAuthenticatedActivityAt: LONG_AGO,
        // Nothing active to freeze on return, only a Future Journey that begins later.
        journeys: [makeJourney('future', NOW + INACTIVITY_POLICY.thresholdMs)],
      }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    // The Future Journey is untouched, and there is NO undismissable "welcome back" CTA.
    expect(core.getSnapshot().journeys[0].status).toBe('active');
    expect(core.getInactivityReturn()).toBeNull();
    expect(core.inactivityReturnNeedsAutoOpen()).toBe(false);
  });
});

describe('AppCore — re-arms across cycles (Fix 1)', () => {
  it('freezes AGAIN on a fresh long gap after the first return was resolved', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({ lastAuthenticatedActivityAt: LONG_AGO, journeys: [makeJourney('a', LONG_AGO)] }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    // First cycle froze + opened a return; user resumes, which auto-resolves the return.
    expect(core.getSnapshot().journeys[0].status).toBe('frozen');
    core.resumeInactivityJourney('a');
    expect(core.getInactivityReturn()).toBeNull();
    expect(core.getSnapshot().journeys[0].status).toBe('active');

    // A SECOND full absence must re-arm and freeze the (now active) Journey again.
    jest.setSystemTime(NOW + INACTIVITY_POLICY.thresholdMs * 2);
    core.syncTime();

    const again = core.getSnapshot().journeys[0];
    expect(again.status).toBe('frozen');
    expect(again.freezeReason).toBe('account_inactivity');
    expect(core.getInactivityReturn()!.frozenJourneyIds).toEqual(['a']);
  });
});

describe('AppCore — auto-open latch (one-shot)', () => {
  it('needs auto-open until markInactivityReturnOpened stamps it', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({ lastAuthenticatedActivityAt: LONG_AGO, journeys: [makeJourney('a', LONG_AGO)] }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    expect(core.inactivityReturnNeedsAutoOpen()).toBe(true);
    core.markInactivityReturnOpened();
    expect(core.inactivityReturnNeedsAutoOpen()).toBe(false);
    // Still pending (opening is not resolving) — the Home CTA persists.
    expect(core.getInactivityReturn()).not.toBeNull();
  });
});

describe('AppCore — long-gap syncTime cancels reminders + clears postpones', () => {
  it('freezes on syncTime after a long gap; a pending postpone one-shot is cancelled + cleared', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    // Preload a Step already carrying a postpone one-shot, and the anchor at NOW so start() does NOT
    // freeze (gap 0). Then jump past the threshold and let syncTime detect it.
    const journey = makeJourney('a', NOW - 1000);
    journey.steps[0].postponedUntil = NOW + 1000;
    journey.steps[0].postponeCount = 1;
    journey.steps[0].postponedAt = NOW;
    journey.steps[0].postponeNotificationId = 'notif_pending';
    const { repo } = preloadedRepo(baseState({ lastAuthenticatedActivityAt: NOW, journeys: [journey] }));
    const core = new AppCore(repo, consumedFlag());
    await core.start();
    expect(core.getSnapshot().journeys[0].status).toBe('active'); // no freeze at NOW

    jest.setSystemTime(NOW + INACTIVITY_POLICY.thresholdMs + 1);
    mockCancel.mockClear();
    core.syncTime();

    const frozen = core.getSnapshot().journeys[0];
    expect(frozen.status).toBe('frozen');
    expect(frozen.freezeReason).toBe('account_inactivity');
    // The pending one-shot was cancelled and every postpone field wiped (reused J3 → onJourneyClearsPostpone).
    expect(mockCancel).toHaveBeenCalledWith('notif_pending');
    expect(frozen.steps[0].postponeNotificationId).toBeUndefined();
    expect(frozen.steps[0].postponedUntil).toBeUndefined();
    expect(frozen.steps[0].postponeCount).toBeUndefined();
  });
});

describe('AppCore — migration backfills legacy frozen + seeds the anchor', () => {
  it('backfills a legacy frozen Journey to manual and never instant-freezes', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    // A legacy snapshot: a frozen Journey with NO freezeReason, an active one, and NO activity anchor.
    const { repo, saved } = preloadedRepo(
      baseState({
        journeys: [
          makeJourney('legacyFrozen', LONG_AGO, { status: 'frozen' }),
          makeJourney('active', LONG_AGO),
        ],
      }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    const legacy = core.getSnapshot().journeys.find((j) => j.id === 'legacyFrozen')!;
    expect(legacy.status).toBe('frozen');
    expect(legacy.freezeReason).toBe('manual'); // safe default, never auto-resumed
    // First sight seeded the anchor and froze nothing — the active Journey stays active.
    expect(core.getSnapshot().journeys.find((j) => j.id === 'active')!.status).toBe('active');
    expect(core.getInactivityReturn()).toBeNull();
    core.syncTime();
    expect(saved()!.lastAuthenticatedActivityAt).toBe(NOW);
  });
});

describe('AppCore — export includes the new fields, reset clears them', () => {
  it('exportStateJson carries the anchor + accountInactivity; resetToFirstRun wipes them', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const { repo } = preloadedRepo(
      baseState({ lastAuthenticatedActivityAt: LONG_AGO, journeys: [makeJourney('a', LONG_AGO)] }),
    );
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    const dump = JSON.parse(core.exportStateJson({ appVersion: '1.0.0', exportedAt: NOW }));
    expect(dump.state.lastAuthenticatedActivityAt).toBe(NOW);
    expect(dump.state.accountInactivity).toMatchObject({ frozenAt: NOW });
    expect(dump.state.journeys[0].freezeReason).toBe('account_inactivity');

    await core.resetToFirstRun();
    const cleared = JSON.parse(core.exportStateJson({ appVersion: '1.0.0', exportedAt: NOW }));
    expect(cleared.state.lastAuthenticatedActivityAt).toBeUndefined();
    expect(cleared.state.accountInactivity).toBeUndefined();
    expect(core.getInactivityReturn()).toBeNull();
  });
});
