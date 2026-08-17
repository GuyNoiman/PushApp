/**
 * AppCore — Smart Notification Timing signal capture (PRD §4) and its storage guarantees.
 *
 * The two things this file exists to prove:
 *  1. with the flag OFF, the feature is genuinely absent — not one byte of timing state is written
 *     and the OS tap listener is never even registered;
 *  2. because the learned state lives INSIDE AppState, the account export contains it and an
 *     account deletion erases it, with no extra code in either path. That is the whole reason it is
 *     stored there rather than behind its own key, so it is pinned here.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockAddResponseListener = jest.fn((_cb: (response: unknown) => void) => ({
  remove: mockRemoveListener,
}));
const mockRemoveListener = jest.fn();

jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  scheduleNotificationAsync: jest.fn(async () => 'notif'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  addNotificationResponseReceivedListener: (cb: (response: unknown) => void) =>
    mockAddResponseListener(cb),
}));
jest.mock('../config/featureFlags', () => {
  const actual = jest.requireActual('../config/featureFlags');
  return { ...actual, featureFlags: { ...actual.featureFlags, smartTiming: true } };
});

import { AppCore } from '../AppCore';
import { useFixedClock } from './fixedClock';
import { featureFlags } from '../config/featureFlags';
import type { AppState, TimingTrial } from '../types/domain';
import type { Repository } from '../persistence/Repository';

const MINUTE = 60 * 1000;

/** In-memory Repository that also exposes the last-saved snapshot. */
function capturingRepo(loaded?: unknown): { repo: Repository; saved: () => AppState | null } {
  let saved: AppState | null = null;
  const repo: Repository = {
    async load() {
      const found = saved ?? (loaded as AppState | undefined);
      return found ? { kind: 'loaded', state: found } : { kind: 'first-run' };
    },
    async save(state: AppState) {
      saved = state; // same object reference as core's live state
    },
    async clear() {
      saved = null;
    },
  };
  return { repo, saved: () => saved };
}

/** A persisted snapshot carrying pending trials, so the facades have something to record onto. */
function snapshotWithTrials(trials: TimingTrial[]): Record<string, unknown> {
  return {
    dreams: [],
    journeys: [],
    buddy: {
      name: 'Pip',
      xp: 0,
      level: 1,
      stage: 'egg',
      coins: 0,
      ownedCosmetics: [],
      equippedCosmetic: null,
    },
    checkIns: [],
    missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
    login: { lastClaimedKey: null, dayIndex: 0 },
    reminderRules: [],
    timingTrials: trials,
    timingModels: [],
  };
}

/** The core's LIVE state, read through the same export the user gets. */
function liveState(core: AppCore): AppState {
  return JSON.parse(core.exportStateJson({ appVersion: '1', exportedAt: 0 })).state as AppState;
}

function pendingTrial(over: Partial<TimingTrial> & { scheduledAt: number }): TimingTrial {
  return {
    modelKey: 'journey_1|*',
    outcome: 'pending',
    journeyIds: ['journey_1'],
    ...over,
  };
}

/** Build a core with the flag temporarily OFF (the gate is captured at construction). */
async function coreWithFlagOff(loaded?: unknown): Promise<{ core: AppCore; saved: () => AppState | null }> {
  const flags = featureFlags as { smartTiming: boolean };
  const previous = flags.smartTiming;
  flags.smartTiming = false;
  try {
    const { repo, saved } = capturingRepo(loaded);
    const core = new AppCore(repo);
    await core.start();
    return { core, saved };
  } finally {
    flags.smartTiming = previous;
  }
}

async function coreWithFlagOn(loaded?: unknown): Promise<{ core: AppCore; saved: () => AppState | null }> {
  const { repo, saved } = capturingRepo(loaded);
  const core = new AppCore(repo);
  await core.start();
  return { core, saved };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// Every test here derives `now` from the real clock while AppCore reads its own — and Smart Timing
// buckets a trial by DAY PART, so a run just before midnight could file a response under a
// different day than the one the test built. Pin `Date` (timers stay real).
useFixedClock();

describe('flag OFF — the feature is absent, not merely quiet', () => {
  it('writes nothing when the app comes to the foreground', async () => {
    const now = Date.now();
    const { core } = await coreWithFlagOff(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - 5 * MINUTE })]),
    );
    core.noteForeground({ at: now, viaTap: false });

    const state = liveState(core);
    expect(state.lastForegroundAt).toBeUndefined();
    expect(state.timingTrials![0].responseKind).toBeUndefined();
    expect(state.timingTrials![0].outcome).toBe('pending');
  });

  it('writes nothing when a Journey is viewed', async () => {
    const now = Date.now();
    const { core } = await coreWithFlagOff(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - 5 * MINUTE })]),
    );
    core.noteJourneyViewed('journey_1');

    const state = liveState(core);
    expect(state.timingTrials![0].outcome).toBe('pending');
  });

  it('never registers the OS tap listener', async () => {
    const { core } = await coreWithFlagOff();
    const unsubscribe = core.onNotificationResponse();
    expect(mockAddResponseListener).not.toHaveBeenCalled();
    // The returned unsubscribe is still safe to call.
    expect(() => unsubscribe()).not.toThrow();
    expect(mockRemoveListener).not.toHaveBeenCalled();
  });

  it('does not read the device time zone (a coarse location proxy)', async () => {
    const { core } = await coreWithFlagOff();
    expect(core.currentTimezoneName()).toBeUndefined();
  });
});

describe('flag ON — the foreground signal (§4)', () => {
  it('records when the app came forward', async () => {
    const now = Date.now();
    const { core } = await coreWithFlagOn();
    core.noteForeground({ at: now, viaTap: false });
    const state = liveState(core);
    expect(state.lastForegroundAt).toBe(now);
  });

  it('stamps an organic foreground on a trial still inside its window', async () => {
    const now = Date.now();
    const { core, saved } = await coreWithFlagOn(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - 10 * MINUTE })]),
    );
    core.noteForeground({ at: now, viaTap: false });
    expect(saved()!.timingTrials![0].responseKind).toBe('organic');
  });

  it('lets a tap UPGRADE the organic reading of the same arrival', async () => {
    const now = Date.now();
    const { core, saved } = await coreWithFlagOn(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - MINUTE })]),
    );
    core.noteForeground({ at: now, viaTap: false });
    core.noteForeground({ at: now + 20, viaTap: true });
    expect(saved()!.timingTrials![0].responseKind).toBe('tap');
  });

  it('never downgrades a recorded tap back to organic', async () => {
    const now = Date.now();
    const { core, saved } = await coreWithFlagOn(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - MINUTE })]),
    );
    core.noteForeground({ at: now, viaTap: true });
    core.noteForeground({ at: now + 20, viaTap: false });
    expect(saved()!.timingTrials![0].responseKind).toBe('tap');
  });

  it('leaves a trial whose window has passed alone', async () => {
    const now = Date.now();
    const { core, saved } = await coreWithFlagOn(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - 90 * MINUTE })]),
    );
    core.noteForeground({ at: now, viaTap: false });
    expect(saved()!.timingTrials![0].responseKind).toBeUndefined();
  });
});

describe('flag ON — the Journey-interaction signal (§4)', () => {
  it('turns a pending in-window trial POSITIVE for the Journey that was opened', async () => {
    const now = Date.now();
    const { core, saved } = await coreWithFlagOn(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - 10 * MINUTE })]),
    );
    core.noteJourneyViewed('journey_1');
    expect(saved()!.timingTrials![0].outcome).toBe('positive');
  });

  it('does not credit a Journey the send never covered', async () => {
    const now = Date.now();
    const { core } = await coreWithFlagOn(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - 10 * MINUTE })]),
    );
    core.noteJourneyViewed('journey_2');
    expect(liveState(core).timingTrials![0].outcome).toBe('pending');
  });

  it('does not credit an interaction that arrived too late', async () => {
    const now = Date.now();
    const { core } = await coreWithFlagOn(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - 45 * MINUTE })]),
    );
    core.noteJourneyViewed('journey_1');
    expect(liveState(core).timingTrials![0].outcome).toBe('pending');
  });

  it('never revisits a trial that already has a verdict', async () => {
    const now = Date.now();
    const { core } = await coreWithFlagOn(
      snapshotWithTrials([
        pendingTrial({ scheduledAt: now - 10 * MINUTE, outcome: 'contaminated' }),
      ]),
    );
    core.noteJourneyViewed('journey_1');
    expect(liveState(core).timingTrials![0].outcome).toBe('contaminated');
  });
});

describe('flag ON — the notification tap listener', () => {
  it('registers exactly one OS listener and removes it on unsubscribe', async () => {
    const { core } = await coreWithFlagOn();
    const unsubscribe = core.onNotificationResponse();
    expect(mockAddResponseListener).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(mockRemoveListener).toHaveBeenCalledTimes(1);
  });

  it('records a tap and hands the opaque ids to the caller', async () => {
    const now = Date.now();
    const { core, saved } = await coreWithFlagOn(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - MINUTE })]),
    );
    const seen: unknown[] = [];
    core.onNotificationResponse((data) => seen.push(data));

    const deliver = mockAddResponseListener.mock.calls[0][0];
    deliver({
      notification: {
        request: { content: { data: { ruleId: 'r1', journeyId: 'journey_1', kind: 'reminder' } } },
      },
    });

    expect(seen).toEqual([{ ruleId: 'r1', journeyId: 'journey_1', kind: 'reminder' }]);
    expect(saved()!.timingTrials![0].responseKind).toBe('tap');
  });

  it('a tap alone is a RESPONSE, not proof the Journey was seen', async () => {
    const now = Date.now();
    const { core, saved } = await coreWithFlagOn(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - MINUTE })]),
    );
    core.onNotificationResponse();
    mockAddResponseListener.mock.calls[0][0]({
      notification: {
        request: { content: { data: { ruleId: 'r1', journeyId: 'journey_1', kind: 'reminder' } } },
      },
    });
    expect(saved()!.timingTrials![0].outcome).toBe('pending');
  });

  it('still records the arrival when the notification carried no payload', async () => {
    const now = Date.now();
    const { core, saved } = await coreWithFlagOn(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - MINUTE })]),
    );
    const seen: unknown[] = [];
    core.onNotificationResponse((data) => seen.push(data));
    mockAddResponseListener.mock.calls[0][0]({
      notification: { request: { content: {} } },
    });
    expect(seen).toEqual([]);
    expect(saved()!.timingTrials![0].responseKind).toBe('tap');
  });
});

describe('flag ON — the device time zone', () => {
  it('reports an IANA zone name', async () => {
    const { core } = await coreWithFlagOn();
    const zone = core.currentTimezoneName();
    expect(typeof zone === 'string' && zone.length > 0).toBe(true);
  });
});

describe('storage: migration, export and deletion come for free', () => {
  it('backfills BOTH stores when loading a snapshot that predates them', async () => {
    const legacy = snapshotWithTrials([]) as Record<string, unknown>;
    delete legacy.timingTrials;
    delete legacy.timingModels;

    const { core } = await coreWithFlagOn(legacy);
    const state = liveState(core);
    expect(state.timingModels).toEqual([]);
    expect(state.timingTrials).toEqual([]);
  });

  it('includes the learned state in the account export', async () => {
    const now = Date.now();
    const trial = pendingTrial({ scheduledAt: now - MINUTE });
    const { core } = await coreWithFlagOn(snapshotWithTrials([trial]));
    core.noteForeground({ at: now, viaTap: false });

    const state = liveState(core);
    expect(state.timingTrials).toHaveLength(1);
    expect(state.timingTrials![0].modelKey).toBe('journey_1|*');
    expect(state.lastForegroundAt).toBe(now);
  });

  it('leaves nothing behind after an account deletion', async () => {
    const now = Date.now();
    const { core } = await coreWithFlagOn(
      snapshotWithTrials([pendingTrial({ scheduledAt: now - MINUTE })]),
    );
    core.noteForeground({ at: now, viaTap: false });
    await core.resetToFirstRun();

    const state = liveState(core);
    expect(state.timingModels).toEqual([]);
    expect(state.timingTrials).toEqual([]);
    expect(state.lastForegroundAt).toBeUndefined();
  });
});
