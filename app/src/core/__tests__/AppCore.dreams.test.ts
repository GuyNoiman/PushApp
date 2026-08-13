/**
 * AppCore Dreams tests (Dream Management, D40) — exercised through the public facade + persistence.
 * Verifies: a coach-created Dream + Journey link persist and re-load losslessly; a legacy
 * single-`dreamId` Journey migrates with that Dream still primary; the coach's Journey-creation path
 * creates-or-reuses a Dream and links it as primary (no user-approval gate); and journeysForDream
 * derives a Dream's Journeys across lifecycle states from the Journey side (no `journeyIds` store).
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
import type { GoalSpec } from '../coach/interviewPlaybook';

/** In-memory Repository that keeps the last saved snapshot, so a reload sees persisted state. */
function repoWith(loaded: unknown): { repo: Repository; saved: () => AppState | null } {
  let saved: AppState | null = null;
  return {
    repo: {
      async load() {
        return (saved ?? (loaded as AppState | null)) ?? null;
      },
      async save(state: AppState) {
        saved = state;
      },
      async clear() {
        saved = null;
      },
    },
    saved: () => saved,
  };
}

/** A minimal finished-interview spec, optionally carrying a coach-formulated Dream. */
function specWith(dream?: { title: string; why?: string }): GoalSpec {
  return {
    title: 'Run 5km',
    domain: 'general',
    processType: 'fixed',
    isHabit: true,
    milestones: [],
    failureRisks: [],
    timing: {},
    ...(dream ? { dream } : {}),
  };
}

describe('AppCore Dreams facade + persistence', () => {
  it('creates a Dream, links a Journey as primary, and reloads losslessly', async () => {
    const first = repoWith(null);
    const core = new AppCore(first.repo);
    await core.start();
    const journeyId = core.getSnapshot().journeys[0].id;

    const dream = core.createDream({ title: 'Be a runner', why: 'clear head' });
    expect(dream).not.toBeNull();
    expect(core.linkJourneyToDream(journeyId, dream!.id, { primary: true })).toBe(true);

    // Reload from the persisted snapshot into a fresh core.
    const reloaded = repoWith(first.saved());
    const core2 = new AppCore(reloaded.repo);
    await core2.start();

    const persistedDream = core2.getDreams().find((d) => d.id === dream!.id);
    expect(persistedDream?.title).toBe('Be a runner');
    expect(core2.getSnapshot().journeys.find((j) => j.id === journeyId)?.dreamId).toBe(dream!.id);
    // The Dream's Journeys are DERIVED from the Journey side, not a stored back-reference.
    expect(core2.journeysForDream(dream!.id).map((j) => j.id)).toContain(journeyId);
  });

  it('derives journeysForDream across lifecycle states (primary + secondary links)', async () => {
    const core = new AppCore(repoWith(null).repo);
    await core.start();
    const journeys = core.getSnapshot().journeys;
    const primaryJourney = journeys[0].id;
    const secondaryJourney = journeys[1].id;

    const dream = core.createDream({ title: 'Show up daily' })!;
    core.linkJourneyToDream(primaryJourney, dream.id, { primary: true });
    core.linkJourneyToDream(secondaryJourney, dream.id, { primary: false });

    const ids = core.journeysForDream(dream.id).map((j) => j.id);
    expect(ids).toEqual(expect.arrayContaining([primaryJourney, secondaryJourney]));
  });

  it('coach Journey creation creates-or-reuses a Dream and links it primary (no approval gate)', async () => {
    const core = new AppCore(repoWith(null).repo);
    await core.start();
    const before = core.getDreams().length;

    const j1 = core.createJourneyFromGoalSpec(specWith({ title: 'Become healthy', why: 'energy' }));
    expect(j1.dreamId).toBeDefined();
    expect(core.getDreams()).toHaveLength(before + 1);
    const dreamId = j1.dreamId!;

    // A second Journey with the SAME Dream title reuses the Dream, not a duplicate.
    const j2 = core.createJourneyFromGoalSpec(specWith({ title: '  become HEALTHY  ' }));
    expect(j2.dreamId).toBe(dreamId);
    expect(core.getDreams()).toHaveLength(before + 1);
  });

  it('links an UNLINKED Journey to an existing Dream (F1) — sets dreamId, notifies, persists, and never touches the plan', async () => {
    const first = repoWith(null);
    const core = new AppCore(first.repo);
    await core.start();

    // An unlinked Journey (coach spec carried no Dream signal) + a separately-created Dream — the
    // exact state the Journey-detail link-approval surface (JourneyDreamLink, T1) operates on.
    const journey = core.createJourneyFromGoalSpec(specWith());
    expect(journey.dreamId).toBeUndefined();
    const dream = core.createDream({ title: 'Be present' })!;

    // Snapshot the plan BEFORE the link so we can prove linking leaves it untouched (PRD §6/§9).
    const before = core.getSnapshot().journeys.find((j) => j.id === journey.id)!;
    const stepsBefore = JSON.stringify(before.steps);
    const scheduleBefore = { durationDays: before.durationDays, rhythm: before.rhythm, createdAt: before.createdAt };
    const statusBefore = before.status;

    // The JourneyDreamLinked → onChanged → save → notify chain is the facade-observable proof the
    // event fired (the raw JourneyDreamLinked shape is asserted in JourneyEngine.dreams.test.ts).
    let notified = 0;
    const stop = core.subscribe(() => {
      notified += 1;
    });
    expect(core.linkJourneyToDream(journey.id, dream.id, { primary: true })).toBe(true);
    stop();
    expect(notified).toBeGreaterThan(0);

    const linked = core.getSnapshot().journeys.find((j) => j.id === journey.id)!;
    expect(linked.dreamId).toBe(dream.id);
    // The link edits NONE of the Journey's Steps, schedule, or status.
    expect(JSON.stringify(linked.steps)).toBe(stepsBefore);
    expect({ durationDays: linked.durationDays, rhythm: linked.rhythm, createdAt: linked.createdAt }).toEqual(
      scheduleBefore,
    );
    expect(linked.status).toBe(statusBefore);

    // Persisted: a fresh core reloads the link losslessly.
    const reloaded = repoWith(first.saved());
    const core2 = new AppCore(reloaded.repo);
    await core2.start();
    expect(core2.getSnapshot().journeys.find((j) => j.id === journey.id)?.dreamId).toBe(dream.id);
  });

  it('creates an UNLINKED Journey when the coach spec carries no Dream signal (not a hard gate)', async () => {
    const core = new AppCore(repoWith(null).repo);
    await core.start();
    const before = core.getDreams().length;

    const journey = core.createJourneyFromGoalSpec(specWith());
    expect(journey.dreamId).toBeUndefined();
    expect(core.getDreams()).toHaveLength(before);
  });
});

describe('AppCore Dreams migration', () => {
  it('migrates a legacy single-dreamId Journey with its Dream still primary', async () => {
    const legacy: Record<string, unknown> = {
      // Legacy Dream shape carried a now-removed `journeyIds` back-reference; it is ignored on load.
      dreams: [{ id: 'd_old', title: 'Old dream', journeyIds: ['j_old'] }],
      journeys: [
        {
          id: 'j_old',
          title: 'Old Journey',
          why: [],
          durationDays: 30,
          rhythm: 'daily',
          steps: [{ id: 's1', title: 'Do it', isStarterStep: false, cadence: 'once', done: false }],
          createdAt: 1,
          dreamId: 'd_old',
        },
      ],
      buddy: { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0, ownedCosmetics: [], equippedCosmetic: null },
      checkIns: [],
      missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
      login: { lastClaimedKey: null, dayIndex: 0 },
    };
    const core = new AppCore(repoWith(legacy).repo);
    await core.start();

    expect(core.getSnapshot().journeys.find((j) => j.id === 'j_old')?.dreamId).toBe('d_old');
    expect(core.journeysForDream('d_old').map((j) => j.id)).toEqual(['j_old']);
  });
});
