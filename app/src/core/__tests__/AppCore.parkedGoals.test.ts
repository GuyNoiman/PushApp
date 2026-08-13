/**
 * AppCore — Parked/deferred goals (L1). The coach detects MULTIPLE goals; the user builds one and
 * the rest are "parked" so the Journeys "For later" surface can offer them next.
 *
 * Covers:
 *   • building from a multi-goal spec parks the OTHER goals (with ids) in the same JourneyCreated
 *     save; the built goal is never double-parked; a single-goal spec parks nothing.
 *   • activateParkedGoal builds a Journey (JourneyCreated) + removes the parked goal (no
 *     double-activate); unknown id → null. removeParkedGoal removes + persists; unknown → false.
 *   • dedupe across two conversations; getSnapshot reflects state; activation with the coach flags
 *     OFF; export includes parkedGoals; resetToFirstRun clears them; migration backfills legacy → [].
 *   • SECURITY (L1): a SENSITIVE-domain deferred goal is NEVER parked.
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
import { featureFlags } from '../config/featureFlags';
import type { DeferredGoal, GoalSpec } from '../coach/interviewPlaybook';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';
import type { FirstRunFlag } from '../persistence/firstRunFlag';

/** In-memory Repository that captures the LAST saved snapshot. */
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

/** A Repository that LOADS a fixed (legacy-shaped) snapshot, for migration tests. */
function loadingRepo(state: unknown): Repository {
  return {
    async load() {
      return state as AppState;
    },
    async save() {},
    async clear() {},
  };
}

/** A consumed first-run flag so start() never seeds demo data — a clean slate for parking. */
function consumedFlag(): FirstRunFlag {
  return {
    async isConsumed() {
      return true;
    },
    async markConsumed() {},
  };
}

/** A finished GoalSpec (a recurring habit) with optional detected-but-not-chosen deferred goals. */
function specWith(deferredGoals?: DeferredGoal[], over: Partial<GoalSpec> = {}): GoalSpec {
  return {
    title: 'Meditate every morning',
    domain: 'general',
    processType: 'recurring',
    isHabit: true,
    milestones: [],
    failureRisks: [],
    timing: {},
    ...(deferredGoals ? { deferredGoals } : {}),
    ...over,
  };
}

async function freshCore(): Promise<{ core: AppCore; lastSaved: () => AppState | null }> {
  const { repo, lastSaved } = capturingRepo();
  const core = new AppCore(repo, consumedFlag());
  await core.start();
  return { core, lastSaved };
}

describe('createJourneyFromGoalSpec — parking deferred goals', () => {
  it('parks the OTHER goals (with ids) in the same save; never parks the built goal', async () => {
    const { core, lastSaved } = await freshCore();

    const journey = core.createJourneyFromGoalSpec(
      specWith([
        { title: 'Run 5k', processType: 'process', domain: 'body_image' },
        { title: 'Read more', processType: 'recurring', domain: 'general' },
        // Defensive: the built goal itself appears in the deferred list — it must NOT be parked.
        { title: 'Meditate every morning', processType: 'recurring', domain: 'general' },
      ]),
    );

    const parked = core.getSnapshot().parkedGoals;
    expect(parked.map((g) => g.title).sort()).toEqual(['Read more', 'Run 5k']);
    expect(parked.every((g) => typeof g.id === 'string' && g.id.length > 0)).toBe(true);
    expect(parked.some((g) => g.title === 'Meditate every morning')).toBe(false);

    // Persisted in the SAME JourneyCreated save.
    expect(lastSaved()?.parkedGoals).toHaveLength(2);
    expect(lastSaved()?.journeys.some((j) => j.id === journey.id)).toBe(true);
  });

  it('parks nothing for a single-goal spec (no deferred goals)', async () => {
    const { core } = await freshCore();
    core.createJourneyFromGoalSpec(specWith(undefined));
    expect(core.getSnapshot().parkedGoals).toEqual([]);
  });

  it('does not re-park the same goal across two conversations (dedupe)', async () => {
    const { core } = await freshCore();
    const runner: DeferredGoal = { title: 'Run 5k', processType: 'process', domain: 'general' };

    core.createJourneyFromGoalSpec(specWith([runner], { title: 'Goal A' }));
    core.createJourneyFromGoalSpec(specWith([runner], { title: 'Goal B' }));

    expect(core.getSnapshot().parkedGoals.filter((g) => g.title === 'Run 5k')).toHaveLength(1);
  });

  it('never parks a SENSITIVE-domain deferred goal (L1 security)', async () => {
    const { core } = await freshCore();

    core.createJourneyFromGoalSpec(
      specWith([
        { title: 'Quit smoking', processType: 'process', domain: 'addiction' },
        { title: 'Repair a relationship', processType: 'process', domain: 'relationships' },
        { title: 'Run 5k', processType: 'process', domain: 'general' },
      ]),
    );

    const parked = core.getSnapshot().parkedGoals;
    expect(parked.map((g) => g.title)).toEqual(['Run 5k']);
    expect(parked.some((g) => g.domain === 'addiction' || g.domain === 'relationships')).toBe(false);
  });
});

describe('activateParkedGoal / removeParkedGoal', () => {
  it('activates a parked goal into a Journey (JourneyCreated), removes it, and guards double-activate', async () => {
    const { core } = await freshCore();
    core.createJourneyFromGoalSpec(
      specWith([{ title: 'Run 5k', processType: 'process', domain: 'general' }]),
    );
    expect(core.getSnapshot().parkedGoals).toHaveLength(1);
    const id = core.getSnapshot().parkedGoals[0].id;

    const events: string[] = [];
    core.bus.on('JourneyCreated', () => events.push('JourneyCreated'));

    const journey = core.activateParkedGoal(id);
    expect(journey).not.toBeNull();
    expect(journey!.title).toBe('Run 5k');
    expect(events).toContain('JourneyCreated');
    expect(core.getSnapshot().parkedGoals).toEqual([]);

    // Second activation with the same id is a no-op (already removed), and an unknown id → null.
    expect(core.activateParkedGoal(id)).toBeNull();
    expect(core.activateParkedGoal('nope')).toBeNull();
  });

  it('removeParkedGoal removes + persists; unknown id → false', async () => {
    const { core, lastSaved } = await freshCore();
    core.createJourneyFromGoalSpec(
      specWith([{ title: 'Run 5k', processType: 'process', domain: 'general' }]),
    );
    const id = core.getSnapshot().parkedGoals[0].id;

    expect(core.removeParkedGoal('nope')).toBe(false);
    expect(core.removeParkedGoal(id)).toBe(true);
    expect(core.getSnapshot().parkedGoals).toEqual([]);
    expect(lastSaved()?.parkedGoals).toEqual([]);
  });

  it('refuses to activate a SENSITIVE-domain parked goal, leaving it parked (defense-in-depth, Fix 6)', async () => {
    // Simulate a future path that somehow got a sensitive goal into parkedGoals (capture filtering
    // should prevent this, but activation must not trust that). Preload one via a legacy snapshot.
    const core = new AppCore(
      loadingRepo({
        journeys: [],
        parkedGoals: [
          { id: 'sens', title: 'Quit drinking', processType: 'process', domain: 'addiction' },
        ],
      }),
      consumedFlag(),
    );
    await core.start();

    expect(core.activateParkedGoal('sens')).toBeNull();
    // It stays parked — never becomes an activatable Journey that bypasses the sensitive-domain stop.
    expect(core.getSnapshot().parkedGoals.map((g) => g.id)).toEqual(['sens']);
    expect(core.getSnapshot().journeys).toEqual([]);
  });

  it('activates with the adaptive/live coach flags OFF (default) — it is a normal Journey path', async () => {
    expect(featureFlags.adaptiveCoach).toBe(false);
    const { core } = await freshCore();
    core.createJourneyFromGoalSpec(
      specWith([{ title: 'Run 5k', processType: 'process', domain: 'general' }]),
    );
    const id = core.getSnapshot().parkedGoals[0].id;
    expect(core.activateParkedGoal(id)).not.toBeNull();
  });
});

describe('export / reset / migration', () => {
  it('exportStateJson includes parkedGoals; resetToFirstRun clears them', async () => {
    const { core } = await freshCore();
    core.createJourneyFromGoalSpec(
      specWith([{ title: 'Run 5k', processType: 'process', domain: 'general' }]),
    );

    const parsed = JSON.parse(core.exportStateJson({ appVersion: '1.0.0', exportedAt: 0 }));
    expect(Array.isArray(parsed.state.parkedGoals)).toBe(true);
    expect(parsed.state.parkedGoals).toHaveLength(1);

    await core.resetToFirstRun();
    expect(core.getSnapshot().parkedGoals).toEqual([]);
  });

  it('migrateState backfills a legacy snapshot (no parkedGoals) to []', async () => {
    const core = new AppCore(loadingRepo({ journeys: [] }), consumedFlag());
    await core.start();
    expect(core.getSnapshot().parkedGoals).toEqual([]);
  });

  it('migrateState keeps only the known ParkedGoal fields (drops junk)', async () => {
    const core = new AppCore(
      loadingRepo({
        journeys: [],
        parkedGoals: [
          { id: 'x', title: 'Run 5k', processType: 'process', domain: 'general', junk: 'nope' },
        ],
      }),
      consumedFlag(),
    );
    await core.start();

    const parked = core.getSnapshot().parkedGoals;
    expect(parked).toEqual([{ id: 'x', title: 'Run 5k', processType: 'process', domain: 'general' }]);
    expect((parked[0] as unknown as Record<string, unknown>).junk).toBeUndefined();
  });
});
