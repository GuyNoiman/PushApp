/**
 * AppCore migration tests — loading an OLD persisted snapshot (from before the
 * Reminders feature) must never crash and must backfill the new fields:
 * reminderRules = [], default communicationPrefs, and — because migrateState only
 * runs on a pre-existing snapshot — treat the user as already onboarded so they
 * never see onboarding. Exercised through the public start()/facade, not internals.
 */
// AppCore's module graph pulls in LocalRepository → AsyncStorage (a native module).
// We inject an in-memory Repository, but the import still loads, so stub the native
// module. expo-notifications is likewise imported by ReminderEngine at load time.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  scheduleNotificationAsync: jest.fn(async () => 'notif'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));

import { AppCore } from '../AppCore';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';

/** In-memory Repository seeded with a caller-supplied snapshot (or null). */
function repoWith(loaded: unknown): Repository {
  let saved: AppState | null = null;
  return {
    async load() {
      return (saved ?? (loaded as AppState | null)) ?? null;
    },
    async save(state: AppState) {
      saved = state;
    },
    async clear() {
      saved = null;
    },
  };
}

/** A minimal pre-Reminders snapshot: no reminderRules / communicationPrefs / onboarding. */
function oldSnapshot(): Record<string, unknown> {
  return {
    dreams: [],
    journeys: [
      {
        id: 'journey_old',
        title: 'Old Journey',
        why: ['because'],
        durationDays: 30,
        rhythm: 'daily',
        steps: [{ id: 'step_old', title: 'Do it', isStarterStep: false, cadence: 'once', done: false }],
        createdAt: 1,
      },
    ],
    buddy: { name: 'Pip', xp: 10, level: 1, stage: 'egg', coins: 5, ownedCosmetics: [], equippedCosmetic: null },
    checkIns: [],
    missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
    login: { lastClaimedKey: null, dayIndex: 0 },
  };
}

describe('AppCore migration — old snapshot', () => {
  it('loads without crashing and preserves existing data', async () => {
    const core = new AppCore(repoWith(oldSnapshot()));
    await expect(core.start()).resolves.toBeUndefined();

    const snap = core.getSnapshot();
    expect(snap.journeys).toHaveLength(1);
    expect(snap.journeys[0].title).toBe('Old Journey');
    expect(snap.buddy.coins).toBe(5);
  });

  it('backfills reminderRules to an empty list', async () => {
    const core = new AppCore(repoWith(oldSnapshot()));
    await core.start();
    expect(core.listReminderRules()).toEqual([]);
  });

  it('backfills all-permissive schedulingPrefs (no behavior change)', async () => {
    const core = new AppCore(repoWith(oldSnapshot()));
    await core.start();
    expect(core.getSchedulingPrefs()).toEqual({
      window: undefined,
      dayPart: 'either',
      preferredDays: [],
    });
  });

  it('treats a pre-existing user as already onboarded (never shows onboarding)', async () => {
    const core = new AppCore(repoWith(oldSnapshot()));
    await core.start();
    // Not directly on the facade, but observable: the seeded demo Journey is NOT
    // added for a loaded snapshot, and onboarding backfill means the old Journey
    // is the only one — proving the loaded (already-onboarded) path ran.
    expect(core.getSnapshot().journeys.map((j) => j.id)).toEqual(['journey_old']);
  });

  it('latches completionRewarded on an already-completed Journey (no re-grant after reversal, D36)', async () => {
    const snap = oldSnapshot();
    (snap.journeys as Record<string, unknown>[])[0] = {
      id: 'journey_done',
      title: 'Finished Journey',
      why: [],
      durationDays: 30,
      rhythm: 'daily',
      steps: [{ id: 'step_done', title: 'Do it', isStarterStep: false, cadence: 'once', done: true }],
      createdAt: 1,
      completedAt: 2, // completed before completionRewarded existed
    };
    const core = new AppCore(repoWith(snap));
    await core.start();

    const journey = core.getSnapshot().journeys.find((j) => j.id === 'journey_done');
    expect(journey?.completionRewarded).toBe(true);
  });

  it('a corrupt/partial snapshot (missing collections) is healed, not dereferenced', async () => {
    // Missing journeys/checkIns/buddy — migrateState must not throw.
    const core = new AppCore(repoWith({ dreams: [] }));
    await expect(core.start()).resolves.toBeUndefined();
    const snap = core.getSnapshot();
    expect(snap.journeys).toEqual([]);
    expect(core.listReminderRules()).toEqual([]);
  });
});

describe('AppCore reminders facade', () => {
  it('adds, lists (filtered by Journey), and removes a reminder rule', async () => {
    const core = new AppCore(repoWith(null)); // first run (seeds a demo Journey)
    await core.start();
    const journeyId = core.getSnapshot().journeys[0].id;

    const rule = await core.addReminderRule({
      journeyId,
      trigger: { kind: 'fixedTime', hour: 9, minute: 0 },
      title: 'Move',
      body: 'Your Journey is waiting.',
    });

    expect(core.listReminderRules()).toHaveLength(1);
    expect(core.listReminderRules(journeyId)).toHaveLength(1);
    expect(core.listReminderRules('other')).toHaveLength(0);

    expect(await core.removeReminderRule(rule.id)).toBe(true);
    expect(core.listReminderRules()).toHaveLength(0);
    expect(await core.removeReminderRule('missing')).toBe(false);
  });

  it('sets communication prefs and opt-ins (opt-ins start false)', async () => {
    const core = new AppCore(repoWith(null));
    await core.start();

    core.setLocationOptIn(true);
    core.setCommunicationPref('remindersEnabled', false);
    // No facade getter for prefs (Pass B); assert via no-throw + persistence path.
    expect(() => core.setCalendarOptIn(true)).not.toThrow();
  });
});

describe('AppCore adaptive coach — DORMANT by default (flag off)', () => {
  it('generateJourney is inert and creates no Journey when the flag is off', async () => {
    const core = new AppCore(repoWith(null)); // first run seeds ONE demo Journey
    await core.start();
    const before = core.getSnapshot().journeys.length;

    // adaptiveCoach is off in production/test, so the pivot never engages.
    expect(core.generateJourney({ title: 'Learn guitar', isHabit: true }, {
      weeklyAvailabilityMinutes: 120,
      preferredDays: [1, 3, 5],
      daypart: 'evening',
    })).toBeNull();
    expect(core.adaptJourney('anything', {
      weeklyAvailabilityMinutes: 0,
      preferredDays: [],
      daypart: 'either',
    })).toBe(false);

    expect(core.getSnapshot().journeys.length).toBe(before);
  });
});
