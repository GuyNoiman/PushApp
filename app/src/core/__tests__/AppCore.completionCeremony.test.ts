/**
 * AppCore Completion Celebration ceremony latch (Completion Celebration, I1) — mirrors the Weekly
 * Review pending/auto-open latch. A completed carded Journey is the pending major event; auto-open
 * stays true until markCompletionCeremonyShown; only ONE surfaces when several complete; a deleted
 * Journey never surfaces; card + ceremonyShownAt survive save→reload; and a pre-existing completed
 * Journey is marked already-shown by migration (never retro-flooded into a pending ceremony).
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
import type { AppState, Journey } from '../types/domain';
import type { Repository } from '../persistence/Repository';

/** In-memory Repository that DEEP-CLONES on save, so a reload is a genuine fresh load. */
function persistentRepo(seed: unknown = null): Repository {
  let saved: AppState | null = null;
  return {
    async load() {
      return saved ?? ((seed as AppState | null) ?? null);
    },
    async save(state: AppState) {
      saved = JSON.parse(JSON.stringify(state));
    },
    async clear() {
      saved = null;
    },
  };
}

async function startedCore(repo: Repository = persistentRepo()): Promise<AppCore> {
  const core = new AppCore(repo);
  await core.start();
  return core;
}

/** Create a one-Step Journey and complete it; returns the completed Journey view. */
function completeNewJourney(core: AppCore, title: string): Journey {
  const journey = core.createJourney({
    title,
    why: ['because'],
    durationDays: 10,
    rhythm: 'daily',
    steps: [{ title: 'Only step', isStarterStep: true, cadence: 'once' }],
  });
  core.checkInStep(journey.id, journey.steps[0].id);
  return journey;
}

describe('AppCore completion ceremony — pending getter + auto-open latch', () => {
  it('surfaces the completed carded Journey as the pending ceremony', async () => {
    const core = await startedCore();
    expect(core.getPendingCompletionCeremony()).toBeUndefined(); // fresh: only active demo Journeys

    const journey = completeNewJourney(core, 'Learn to swim');
    const pending = core.getPendingCompletionCeremony();
    expect(pending?.id).toBe(journey.id);
    expect(pending?.completionCard?.journeyTitleSnapshot).toBe('Learn to swim');
    expect(core.getCompletionCard(journey.id)?.ceremonyShownAt).toBeUndefined();
  });

  it('needs auto-open until markCompletionCeremonyShown, then not', async () => {
    const core = await startedCore();
    const journey = completeNewJourney(core, 'Read 5 books');

    expect(core.completionCeremonyNeedsAutoOpen()).toBe(true);
    core.markCompletionCeremonyShown(journey.id);
    expect(core.completionCeremonyNeedsAutoOpen()).toBe(false);
    expect(core.getPendingCompletionCeremony()).toBeUndefined();
    expect(core.getCompletionCard(journey.id)?.ceremonyShownAt).toBeDefined();
  });

  it('markCompletionCeremonyShown is idempotent (no-op on unknown / already-shown)', async () => {
    const core = await startedCore();
    const journey = completeNewJourney(core, 'Meditate daily');
    core.markCompletionCeremonyShown(journey.id);
    const stampedAt = core.getCompletionCard(journey.id)?.ceremonyShownAt;

    core.markCompletionCeremonyShown(journey.id); // second call: no change
    expect(core.getCompletionCard(journey.id)?.ceremonyShownAt).toBe(stampedAt);
    expect(() => core.markCompletionCeremonyShown('nope')).not.toThrow();
  });

  it('returns only ONE pending ceremony when several complete (earliest-completed wins)', async () => {
    const core = await startedCore();
    const first = completeNewJourney(core, 'Alpha');
    const second = completeNewJourney(core, 'Beta');

    // Force a deterministic completion order on the durable cards.
    const snap = core.getSnapshot();
    snap.journeys.find((j) => j.id === first.id)!.completionCard!.completedAt = 100;
    snap.journeys.find((j) => j.id === second.id)!.completionCard!.completedAt = 200;

    expect(core.getPendingCompletionCeremony()?.id).toBe(first.id);
    // After showing the first, the second becomes the single pending event.
    core.markCompletionCeremonyShown(first.id);
    expect(core.getPendingCompletionCeremony()?.id).toBe(second.id);
  });

  it('never surfaces a deleted Journey as a pending ceremony', async () => {
    const core = await startedCore();
    const journey = completeNewJourney(core, 'To be deleted');
    expect(core.getPendingCompletionCeremony()?.id).toBe(journey.id);

    core.deleteJourney(journey.id);
    expect(core.getPendingCompletionCeremony()).toBeUndefined();
    expect(core.getCompletionCard(journey.id)).toBeUndefined();
  });
});

describe('AppCore completion ceremony — persistence + willCompleteJourney facade', () => {
  it('card + ceremonyShownAt survive a save → reload', async () => {
    const repo = persistentRepo();
    const core = await startedCore(repo);
    const journey = completeNewJourney(core, 'Persisted Journey');
    core.markCompletionCeremonyShown(journey.id);
    const shownAt = core.getCompletionCard(journey.id)?.ceremonyShownAt;

    // Reload from the same repo into a fresh core.
    const reloaded = await startedCore(repo);
    const card = reloaded.getCompletionCard(journey.id);
    expect(card).toBeDefined();
    expect(card?.journeyTitleSnapshot).toBe('Persisted Journey');
    expect(card?.ceremonyShownAt).toBe(shownAt);
    // Already shown → not pending after reload.
    expect(reloaded.getPendingCompletionCeremony()?.id).not.toBe(journey.id);
  });

  it('a genuinely-pending ceremony (card, no ceremonyShownAt) survives a save → reload', async () => {
    const repo = persistentRepo();
    const core = await startedCore(repo);
    const journey = completeNewJourney(core, 'Pending across restart');
    // Do NOT mark shown — simulate app killed during the ceremony.

    const reloaded = await startedCore(repo);
    expect(reloaded.getPendingCompletionCeremony()?.id).toBe(journey.id);
    expect(reloaded.completionCeremonyNeedsAutoOpen()).toBe(true);
  });

  it('exposes willCompleteJourney through the facade', async () => {
    const core = await startedCore();
    const journey = core.createJourney({
      title: 'Two steps',
      why: ['because'],
      durationDays: 10,
      rhythm: 'daily',
      steps: [
        { title: 'First', isStarterStep: true, cadence: 'once' },
        { title: 'Last', isStarterStep: false, cadence: 'once' },
      ],
    });
    expect(core.willCompleteJourney(journey.id, journey.steps[1].id)).toBe(false);
    core.checkInStep(journey.id, journey.steps[0].id);
    expect(core.willCompleteJourney(journey.id, journey.steps[1].id)).toBe(true);
  });
});

describe('AppCore getOrBuildCompletionCard — reopen lazy card (Slice 6)', () => {
  it('returns the durable card when one already exists (no re-mint)', async () => {
    const core = await startedCore();
    const journey = completeNewJourney(core, 'Has a card');
    const existing = core.getCompletionCard(journey.id);

    expect(existing).toBeDefined();
    // Same reference back — idempotent, never rebuilt over the live card.
    expect(core.getOrBuildCompletionCard(journey.id)).toBe(existing);
  });

  it('lazily mints a card for a completed Journey that lacks one, stamped already-shown', async () => {
    const core = await startedCore();
    const journey = completeNewJourney(core, 'Legacy no card');
    // Simulate a legacy completed Journey whose card never existed.
    const live = core.getSnapshot().journeys.find((j) => j.id === journey.id)!;
    const completedAt = live.completedAt!;
    delete live.completionCard;
    expect(core.getCompletionCard(journey.id)).toBeUndefined();

    const built = core.getOrBuildCompletionCard(journey.id);
    expect(built).toBeDefined();
    expect(built?.journeyTitleSnapshot).toBe('Legacy no card');
    // Stamped shown at completion time — a reopen must never retro-flood a pending ceremony.
    expect(built?.ceremonyShownAt).toBe(completedAt);
    expect(core.getPendingCompletionCeremony()?.id).not.toBe(journey.id);
    // Idempotent — a second call returns the same minted card.
    expect(core.getOrBuildCompletionCard(journey.id)).toBe(built);
  });

  it('does not mutate a non-completed Journey (returns undefined)', async () => {
    const core = await startedCore();
    const journey = core.createJourney({
      title: 'Still going',
      why: ['because'],
      durationDays: 10,
      rhythm: 'daily',
      steps: [{ title: 'Only step', isStarterStep: true, cadence: 'once' }],
    });

    expect(core.getOrBuildCompletionCard(journey.id)).toBeUndefined();
    expect(core.getCompletionCard(journey.id)).toBeUndefined();
  });

  it('returns undefined for an unknown Journey', async () => {
    const core = await startedCore();
    expect(core.getOrBuildCompletionCard('nope')).toBeUndefined();
  });
});

describe('AppCore completion ceremony — migration of pre-existing completions', () => {
  /** A snapshot with a Journey completed BEFORE this feature existed (no completionCard). */
  function legacyCompletedSnapshot(): Record<string, unknown> {
    return {
      dreams: [],
      journeys: [
        {
          id: 'journey_legacy',
          title: 'Already completed long ago',
          why: ['because'],
          durationDays: 30,
          rhythm: 'daily',
          createdAt: 1,
          completedAt: 5_000,
          status: 'completed',
          completionRewarded: true,
          steps: [{ id: 's', title: 'Done', isStarterStep: false, cadence: 'once', done: true }],
        },
      ],
      buddy: { name: 'Pip', xp: 10, level: 1, stage: 'egg', coins: 5, ownedCosmetics: [], equippedCosmetic: null },
      checkIns: [],
      missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
      login: { lastClaimedKey: null, dayIndex: 0 },
    };
  }

  it('marks a pre-existing completed Journey already-shown and never floods a pending ceremony', async () => {
    const core = await startedCore(persistentRepo(legacyCompletedSnapshot()));

    const card = core.getCompletionCard('journey_legacy');
    expect(card).toBeDefined();
    expect(card?.ceremonyShownAt).toBe(5_000); // stamped at its completion time
    expect(card?.journeyTitleSnapshot).toBe('Already completed long ago');

    expect(core.getPendingCompletionCeremony()).toBeUndefined();
    expect(core.completionCeremonyNeedsAutoOpen()).toBe(false);
  });
});
