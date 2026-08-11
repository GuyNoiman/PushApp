/**
 * AppCore Weekly Review wiring (Weekly_Review_PRD, D40/D41) — with the adaptive loop ON, a review is
 * generated for a closed week, held as ONE pending proposal (idempotent, superseding rather than
 * stacking), applied FORWARD-ONLY on approve, kept out on dismiss, and excludes frozen Journeys. The
 * flag is force-mocked ON here; production (flag off) generates nothing (covered by the OFF path).
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
jest.mock('../config/featureFlags', () => {
  const actual = jest.requireActual('../config/featureFlags');
  return { ...actual, featureFlags: { ...actual.featureFlags, adaptiveCoach: true } };
});

import { AppCore } from '../AppCore';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';

function inMemoryRepo(): Repository {
  let saved: AppState | null = null;
  return {
    async load() {
      return saved;
    },
    async save(state: AppState) {
      saved = state;
    },
    async clear() {
      saved = null;
    },
  };
}

async function startedCore(): Promise<AppCore> {
  const core = new AppCore(inMemoryRepo()); // first run seeds the demo Dreams/Journeys
  await core.start();
  return core;
}

describe('AppCore Weekly Review — generation + single pending proposal', () => {
  it('generates a pending review that getPendingWeeklyReview returns idempotently', async () => {
    const core = await startedCore();

    const review = core.devGenerateWeeklyReview();
    expect(review).not.toBeNull();
    expect(review!.status).toBe('pending');

    // Reading twice does not regenerate — the same review id/generatedAt each time.
    const a = core.getPendingWeeklyReview()!;
    const b = core.getPendingWeeklyReview()!;
    expect(a.id).toBe(review!.id);
    expect(b.id).toBe(review!.id);
    expect(b.generatedAt).toBe(a.generatedAt);
  });

  it('supersedes the older proposal rather than stacking two', async () => {
    const core = await startedCore();
    const first = core.devGenerateWeeklyReview()!;
    const second = core.devGenerateWeeklyReview()!;

    expect(second.id).not.toBe(first.id);
    expect(first.status).toBe('superseded');
    // Only the newest is pending/surfaced.
    expect(core.getPendingWeeklyReview()!.id).toBe(second.id);
  });
});

describe('AppCore Weekly Review — approve is forward-only + atomic', () => {
  it('applies changes to remaining Steps but never mutates an already-reported one', async () => {
    const core = await startedCore();
    const run = core.getSnapshot().journeys.find((j) => j.title === 'Run 5km')!;

    // Report one Step Done — a closed/immutable occurrence that approval must NOT rewrite.
    const doneStep = run.steps[1];
    core.checkInStep(run.id, doneStep.id);
    const doneAtBefore = core
      .getSnapshot()
      .journeys.find((j) => j.id === run.id)!
      .steps.find((s) => s.id === doneStep.id)!.lastCheckInAt;

    const review = core.devGenerateWeeklyReview()!;
    expect(review.proposals.length).toBeGreaterThan(0);

    expect(core.approveWeeklyReview()).toBe(true);

    const after = core.getSnapshot().journeys.find((j) => j.id === run.id)!;
    const stillDone = after.steps.find((s) => s.id === doneStep.id)!;
    // The reported occurrence is untouched — forward-only (D40/D41).
    expect(stillDone.done).toBe(true);
    expect(stillDone.lastCheckInAt).toBe(doneAtBefore);

    // The review is resolved and no longer surfaced.
    expect(core.getPendingWeeklyReview()).toBeNull();
  });

  it('dismiss keeps the proposal out and resolves the review', async () => {
    const core = await startedCore();
    core.devGenerateWeeklyReview();

    expect(core.dismissWeeklyReview()).toBe(true);
    expect(core.getPendingWeeklyReview()).toBeNull();
    // A second dismiss is a no-op (nothing pending).
    expect(core.dismissWeeklyReview()).toBe(false);
  });
});

describe('AppCore Weekly Review — frozen Journeys excluded (§7)', () => {
  it('names a frozen Journey in the summary and proposes no change for it', async () => {
    const core = await startedCore();
    const strength = core.getSnapshot().journeys.find((j) => j.title === 'Build core strength')!;
    core.freezeJourney(strength.id);

    const review = core.devGenerateWeeklyReview()!;

    expect(review.summary.frozenJourneyTitles).toContain('Build core strength');
    expect(review.proposals.map((p) => p.journeyId)).not.toContain(strength.id);
  });
});

describe('AppCore Weekly Review — a pending proposal owns the plan (no silent daily apply)', () => {
  it('does not apply a replan on a later same-week syncTime while a review is pending', async () => {
    const core = await startedCore();
    core.devGenerateWeeklyReview(); // pending review; week key already advanced to current

    let replanned = 0;
    core.bus.on('WeekReplanned', () => (replanned += 1));

    core.syncTime(); // same week — must NOT regenerate AND must NOT run the daily auto-apply
    expect(replanned).toBe(0);
    // The proposal is still pending, so Approve remains meaningful (not a no-op).
    expect(core.getPendingWeeklyReview()).not.toBeNull();
  });

  it('resumes the daily tactical loop once the review is resolved', async () => {
    const core = await startedCore();
    core.devGenerateWeeklyReview();
    core.dismissWeeklyReview(); // no pending review anymore

    let replanned = 0;
    core.bus.on('WeekReplanned', () => (replanned += 1));

    core.syncTime();
    // With no pending proposal, the daily loop runs again and can adapt the seeded plan.
    expect(replanned).toBeGreaterThan(0);
  });
});

describe('AppCore Weekly Review — auto-open one-shot', () => {
  it('needs auto-open until the screen marks it opened', async () => {
    const core = await startedCore();
    core.devGenerateWeeklyReview();

    expect(core.weeklyReviewNeedsAutoOpen()).toBe(true);
    core.markWeeklyReviewOpened();
    expect(core.weeklyReviewNeedsAutoOpen()).toBe(false);
    // Still pending (opening is not resolving) — the Home card persists.
    expect(core.getPendingWeeklyReview()).not.toBeNull();
  });
});
