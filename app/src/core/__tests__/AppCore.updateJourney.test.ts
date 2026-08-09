/**
 * AppCore.updateJourney (task J1) — the coach-led edit facade. An edit must mutate the Journey IN
 * PLACE, persist through the JourneyUpdated → onChanged → repo.save path, and notify subscribers, with
 * NO dependency on any adaptive flag. A completed / unknown Journey is a null no-op. Mirrors
 * AppCore.coachJourney.test.ts's in-memory Repository harness.
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

describe('AppCore.updateJourney (flag-independent)', () => {
  it('applies an edit in place, persists it, and notifies subscribers', async () => {
    const { repo, lastSaved } = capturingRepo();
    const core = new AppCore(repo); // first run seeds demo Journeys
    await core.start();

    const target = core.getSnapshot().journeys[0];
    const originalStepId = target.steps[0].id;
    let notified = 0;
    core.subscribe(() => {
      notified += 1;
    });

    const updated = core.updateJourney(target.id, {
      title: 'Renamed Journey',
      addSteps: [{ title: 'A brand new Step' }],
    });

    expect(updated?.title).toBe('Renamed Journey');
    // Existing Step ids are preserved (edit-in-place, not a rebuild).
    expect(updated?.steps.some((s) => s.id === originalStepId)).toBe(true);
    expect(updated?.steps.some((s) => s.title === 'A brand new Step')).toBe(true);

    // Reflected in the live snapshot the UI renders…
    const snapshot = core.getSnapshot();
    const inSnapshot = snapshot.journeys.find((j) => j.id === target.id);
    expect(inSnapshot?.title).toBe('Renamed Journey');

    // …persisted through JourneyUpdated → onChanged → repo.save…
    expect(lastSaved()?.journeys.find((j) => j.id === target.id)?.title).toBe('Renamed Journey');
    // …and subscribers were notified.
    expect(notified).toBeGreaterThan(0);
  });

  it('returns null for an unknown id and does not throw', async () => {
    const { repo } = capturingRepo();
    const core = new AppCore(repo);
    await core.start();

    expect(core.updateJourney('does_not_exist', { title: 'x' })).toBeNull();
  });
});
