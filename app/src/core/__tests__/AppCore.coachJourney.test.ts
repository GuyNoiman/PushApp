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

const DAY = 24 * 60 * 60 * 1000;

/** In-memory Repository that captures the LAST saved snapshot for assertions. */
function capturingRepo(): { repo: Repository; lastSaved: () => AppState | null } {
  let saved: AppState | null = null;
  return {
    repo: {
      async load() {
        return saved ? { kind: 'loaded', state: saved } : { kind: 'first-run' };
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

  it('plans a SCHEDULED-start Journey across its real intended timeline, not from creation day', async () => {
    // Future Journey Management §5: the Planner is given the approved instant as its clock, so the
    // Steps land on the timeline the user actually chose. `createdAt` still records creation (§14.3).
    const { repo } = capturingRepo();
    const core = new AppCore(repo);
    await core.start();

    const spec: GoalSpec = {
      title: 'Train for a 10k',
      domain: 'general',
      processType: 'progressive',
      isHabit: false,
      milestones: [],
      failureRisks: [],
      // Named days ⇒ the Planner lays Steps on real dates (a frequency-based plan carries none).
      timing: { daypart: 'morning', sessionMinutes: 45, sessionsPerWeek: 3, preferredDays: [1, 3, 5] },
    };
    const at = Date.now() + 60 * DAY;

    const journey = core.createJourneyFromGoalSpec(spec, { mode: 'scheduled', at })!;

    expect(journey.status).toBe('future');
    expect(journey.startsAt).toBe(at);
    expect(journey.createdAt).toBeLessThan(at);
    // The first Step sits on the intended start's own day (the Planner snaps it to a day-part hour),
    // ~60 days after creation — NOT in the week the plan happened to be built.
    const planned = journey.steps.map((s) => s.plannedFor!).filter((p) => p != null);
    expect(planned.length).toBeGreaterThan(0);
    expect(Math.min(...planned)).toBeGreaterThan(at - DAY);
    expect(Math.min(...planned)).toBeGreaterThan(journey.createdAt + 55 * DAY);

    // AC #4: a Future Journey exposes no Home Steps before it starts.
    const snapshot = core.getSnapshot();
    expect(snapshot.todaySteps.some((t) => t.journeyId === journey.id)).toBe(false);
    expect(snapshot.weekSteps.some((t) => t.journeyId === journey.id)).toBe(false);
  });

  it('plans a MANUAL-start Journey from today and leaves it dateless', async () => {
    const { repo } = capturingRepo();
    const core = new AppCore(repo);
    await core.start();

    const spec: GoalSpec = {
      title: 'Learn to swim',
      domain: 'general',
      processType: 'progressive',
      isHabit: false,
      milestones: [],
      failureRisks: [],
      timing: { sessionMinutes: 30, sessionsPerWeek: 2, preferredDays: [2, 4] },
    };

    const journey = core.createJourneyFromGoalSpec(spec, { mode: 'manual' })!;

    expect(journey.status).toBe('future');
    expect(journey.startsAt).toBeUndefined();
    // Planned from today's clock; the rebase at startJourneyNow re-anchors it to the real start.
    const planned = journey.steps.map((s) => s.plannedFor!).filter((p) => p != null);
    expect(planned.length).toBeGreaterThan(0);
    expect(Math.min(...planned)).toBeGreaterThan(journey.createdAt - DAY);
    expect(Math.min(...planned)).toBeLessThan(journey.createdAt + 14 * DAY);
  });
});
