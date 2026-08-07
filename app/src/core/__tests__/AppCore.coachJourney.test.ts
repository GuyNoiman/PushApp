/**
 * AppCore.createJourneyFromGoalSpec — the live coach's "Build my Journey" bridge. A completed
 * interview {@link GoalSpec} must yield a PERSISTED Journey through the SAME JourneyCreated path as
 * any other Journey (plan → persist → notify), with NO dependency on the `adaptiveCoach` flag (the
 * flag stays at its default OFF here). Uses an in-memory Repository that captures the last save.
 */
// AsyncStorage + expo-notifications load through AppCore's module graph even with an injected
// in-memory Repository (mirrors the other AppCore suites).
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
import type { GoalSpec } from '../coach/interviewPlaybook';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';

/** In-memory Repository that captures the LAST saved snapshot for assertions. */
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

describe('AppCore.createJourneyFromGoalSpec (flag-independent)', () => {
  it('creates a persisted Journey from a GoalSpec and notifies subscribers', async () => {
    const { repo, lastSaved } = capturingRepo();
    const core = new AppCore(repo); // first run also seeds the demo Journeys
    await core.start();

    const before = core.getSnapshot().journeys.length;
    let notified = 0;
    core.subscribe(() => {
      notified += 1;
    });

    const spec: GoalSpec = {
      title: 'Read before bed',
      domain: 'general',
      processType: 'fixed',
      isHabit: true,
      milestones: [],
      failureRisks: [],
      timing: { daypart: 'evening', sessionMinutes: 20, sessionsPerWeek: 7 },
    };

    const journey = core.createJourneyFromGoalSpec(spec);

    expect(journey.title).toBe('Read before bed');
    expect(journey.steps.length).toBeGreaterThan(0);

    // Present in the live snapshot the UI renders…
    const snapshot = core.getSnapshot();
    expect(snapshot.journeys.length).toBe(before + 1);
    expect(snapshot.journeys.some((j) => j.id === journey.id)).toBe(true);

    // …persisted through the JourneyCreated → onChanged → repo.save path…
    expect(lastSaved()?.journeys.some((j) => j.id === journey.id)).toBe(true);
    // …and subscribers were notified (Home re-renders).
    expect(notified).toBeGreaterThan(0);
  });
});
