/**
 * AppCore account-data facade (O1) — the pure data export and the first-run reset.
 *
 * Covers:
 *   • exportStateJson stamps a header + carries the on-device data (journeys /
 *     checkIns / reasonLog / behaviorLog / prefs), and is empty-state safe.
 *   • resetToFirstRun clears the repo, resets in-memory state, notifies, and —
 *     critically — the demo seed does NOT re-run after a deletion (adopted O1
 *     decision), even on a fresh relaunch (a new AppCore over the same store/flag).
 */
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
import type { FirstRunFlag } from '../persistence/firstRunFlag';

/** In-memory Repository that captures the LAST saved snapshot + tracks clear(). */
function capturingRepo(): { repo: Repository; lastSaved: () => AppState | null; cleared: () => number } {
  let saved: AppState | null = null;
  let clears = 0;
  return {
    repo: {
      async load() {
        return saved;
      },
      async save(state: AppState) {
        saved = state;
      },
      async clear() {
        clears += 1;
        saved = null;
      },
    },
    lastSaved: () => saved,
    cleared: () => clears,
  };
}

/** In-memory first-run flag (shared across "relaunches" to mimic AsyncStorage). */
function memFlag(initial = false): FirstRunFlag {
  let consumed = initial;
  return {
    async isConsumed() {
      return consumed;
    },
    async markConsumed() {
      consumed = true;
    },
  };
}

describe('AppCore.exportStateJson', () => {
  it('stamps a header and carries the on-device data', async () => {
    const { repo } = capturingRepo();
    const core = new AppCore(repo, memFlag()); // first run seeds demo Journeys
    await core.start();

    const raw = core.exportStateJson({ appVersion: '9.9.9', exportedAt: 1234, uid: 'u1', handle: 'pip' });
    const parsed = JSON.parse(raw);

    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.appVersion).toBe('9.9.9');
    expect(parsed.exportedAt).toBe(1234);
    expect(parsed.uid).toBe('u1');
    expect(parsed.handle).toBe('pip');

    // The full on-device state is present, including the privacy-sensitive logs.
    expect(Array.isArray(parsed.state.journeys)).toBe(true);
    expect(parsed.state.journeys.length).toBeGreaterThan(0);
    expect(Array.isArray(parsed.state.checkIns)).toBe(true);
    expect(Array.isArray(parsed.state.reasonLog)).toBe(true);
    expect(Array.isArray(parsed.state.behaviorLog)).toBe(true);
    expect(parsed.state.communicationPrefs).toBeDefined();
    expect(parsed.state.schedulingPrefs).toBeDefined();
  });

  it('includes account-level Active Hours once set (D40)', async () => {
    const { repo } = capturingRepo();
    const core = new AppCore(repo, memFlag());
    await core.start();

    core.setActiveHours({
      mode: 'perDay',
      days: Array.from({ length: 7 }, (_, d) => ({
        enabled: d !== 6, // Saturday off
        window: { start: { hour: 7, minute: 30 }, end: { hour: 21, minute: 0 } },
      })),
    });

    const parsed = JSON.parse(core.exportStateJson({ appVersion: '1.0.0', exportedAt: 0 }));
    expect(parsed.state.schedulingPrefs.activeHours.mode).toBe('perDay');
    expect(parsed.state.schedulingPrefs.activeHours.days[6].enabled).toBe(false);
    expect(parsed.state.schedulingPrefs.activeHours.days[0].window.start).toEqual({ hour: 7, minute: 30 });
  });

  it('is empty-state safe and defaults uid/handle to null', async () => {
    const { repo } = capturingRepo();
    // Flag already consumed ⇒ no demo seed ⇒ genuinely empty state.
    const core = new AppCore(repo, memFlag(true));
    await core.start();

    const parsed = JSON.parse(core.exportStateJson({ appVersion: '1.0.0', exportedAt: 0 }));

    expect(parsed.uid).toBeNull();
    expect(parsed.handle).toBeNull();
    expect(parsed.state.journeys).toEqual([]);
    expect(parsed.state.checkIns).toEqual([]);
    expect(parsed.state.reasonLog).toEqual([]);
    expect(parsed.state.behaviorLog).toEqual([]);
  });
});

describe('AppCore.resetToFirstRun', () => {
  it('clears the repo, resets state, notifies, and does not re-seed after deletion', async () => {
    const { repo, cleared } = capturingRepo();
    const flag = memFlag();
    const core = new AppCore(repo, flag);
    await core.start();
    expect(core.getSnapshot().journeys.length).toBeGreaterThan(0); // seeded

    let notified = 0;
    core.subscribe(() => {
      notified += 1;
    });

    await core.resetToFirstRun();

    expect(cleared()).toBe(1);
    expect(core.getSnapshot().journeys).toEqual([]);
    expect(notified).toBeGreaterThan(0);

    // A fresh relaunch over the SAME store + flag must stay clean — the demo seed
    // is guarded off once first-run has been consumed by a deletion.
    const relaunched = new AppCore(repo, flag);
    await relaunched.start();
    expect(relaunched.getSnapshot().journeys).toEqual([]);
  });
});
