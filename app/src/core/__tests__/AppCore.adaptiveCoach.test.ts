/**
 * AppCore adaptive-coach wiring (S1.16) — with the `adaptiveCoach` flag ON, the pivot engages:
 * generateJourney plans + creates a real Journey, and a Step check-in records an on-device
 * behaviour signal that is persisted through the existing onChanged → repo.save path (so it
 * survives a reload). The flag is force-mocked ON here; the OFF/dormant path is covered in
 * AppCore.migration.test.ts.
 */
// Same native-module stubs as AppCore.migration.test.ts (AsyncStorage + expo-notifications load
// through AppCore's module graph even with an injected in-memory Repository).
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
// Force the pivot ON for this suite only (production/other suites keep it off).
jest.mock('../config/featureFlags', () => {
  const actual = jest.requireActual('../config/featureFlags');
  return { ...actual, featureFlags: { ...actual.featureFlags, adaptiveCoach: true } };
});

import { AppCore } from '../AppCore';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';

/** In-memory Repository that also captures the LAST saved snapshot for assertions. */
function capturingRepo(): { repo: Repository; lastSaved: () => AppState | null } {
  let saved: AppState | null = null;
  return {
    repo: {
      async load() {
        return saved;
      },
      async save(state: AppState) {
        saved = state;
      },
      async clear() {
        saved = null;
      },
    },
    lastSaved: () => saved,
  };
}

describe('AppCore adaptive coach — ENGAGED (flag on)', () => {
  it('generateJourney plans and creates a real Journey', async () => {
    const { repo } = capturingRepo();
    const core = new AppCore(repo); // first run also seeds ONE demo Journey
    await core.start();
    const before = core.getSnapshot().journeys.length;

    const journey = core.generateJourney(
      { title: 'Learn guitar', isHabit: true },
      { weeklyAvailabilityMinutes: 120, preferredDays: [1, 3, 5], daypart: 'evening' },
    );

    expect(journey).not.toBeNull();
    expect(journey!.title).toBe('Learn guitar');
    expect(journey!.steps.length).toBeGreaterThan(0);
    expect(journey!.milestones?.length).toBeGreaterThan(0);
    expect(core.getSnapshot().journeys.length).toBe(before + 1);
  });

  it('persists the on-device behaviour log when a Step is checked in', async () => {
    const { repo, lastSaved } = capturingRepo();
    const core = new AppCore(repo);
    await core.start();

    const journey = core.generateJourney(
      { title: 'Run 5km', isHabit: false },
      { weeklyAvailabilityMinutes: 90, preferredDays: [2, 4], daypart: 'morning' },
    )!;
    core.checkInStep(journey.id, journey.steps[0].id);

    const saved = lastSaved();
    expect(saved?.behaviorLog?.length).toBeGreaterThan(0);
    expect(saved?.behaviorLog?.[0].kind).toBe('done');
    // The derived model is cached alongside the raw log through the same save path.
    expect(saved?.insightModel).toBeDefined();
  });
});
