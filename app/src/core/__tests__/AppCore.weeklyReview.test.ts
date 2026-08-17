/**
 * AppCore Weekly Review wiring (Weekly_Review_PRD, D40/D41) — with the adaptive loop ON, a review is
 * generated for a closed week, held as ONE pending proposal (idempotent, superseding rather than
 * stacking), applied FORWARD-ONLY on approve, kept out on dismiss, and excludes frozen Journeys. The
 * flag is force-mocked ON here; the last suite flips BOTH adaptive flags OFF to cover the PRODUCTION
 * split — the review still generates (summary, never-empty next week, 48h lifecycle) but carries an
 * empty proposal list, and the daily tactical auto-apply (D43) stays gated.
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

import { AppCore, WEEKLY_REVIEW_TTL_MS } from '../AppCore';
import { featureFlags } from '../config/featureFlags';
import { startOfLocalDay } from '../util/date';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';

function inMemoryRepo(): Repository {
  let saved: AppState | null = null;
  return {
    async load() {
      return saved ? { kind: 'loaded', state: saved } : { kind: 'first-run' };
    },
    async save(state: AppState) {
      saved = state;
    },
    async clear() {
      saved = null;
    },
  };
}

/** Like {@link inMemoryRepo} but exposes the last-saved snapshot, to inspect a NON-pending review
 *  (expired/superseded) that {@link AppCore.getPendingWeeklyReview} deliberately no longer returns. */
function capturingRepo(): { repo: Repository; saved: () => AppState | null } {
  let saved: AppState | null = null;
  const repo: Repository = {
    async load() {
      return saved ? { kind: 'loaded', state: saved } : { kind: 'first-run' };
    },
    async save(state: AppState) {
      saved = state; // same object reference as core's live state — reads reflect the latest write
    },
    async clear() {
      saved = null;
    },
  };
  return { repo, saved: () => saved };
}

function capturingCore(): { core: AppCore; saved: () => AppState | null } {
  const { repo, saved } = capturingRepo();
  return { core: new AppCore(repo), saved };
}

async function startedCore(): Promise<AppCore> {
  const core = new AppCore(inMemoryRepo());
  await core.start();
  // The demo data is DEV-ONLY since Device QA 2026-08-17 B2 (a fresh install opens empty), so this
  // suite — which reviews a realistic multi-Journey week — asks for the seed explicitly.
  core.seedDemoJourney();
  return core;
}

/**
 * Build a core with BOTH adaptive flags OFF — the PRODUCTION path. This suite force-mocks
 * `adaptiveCoach` ON, and `adaptiveEnabled` is captured at construction, so flip → build → restore,
 * leaving the flag ON for every other test in the file.
 */
function productionCore(repo: Repository): AppCore {
  const flags = featureFlags as { adaptiveCoach: boolean; adaptiveCoachDev: boolean };
  const prev = { adaptiveCoach: flags.adaptiveCoach, adaptiveCoachDev: flags.adaptiveCoachDev };
  flags.adaptiveCoach = false;
  flags.adaptiveCoachDev = false;
  try {
    return new AppCore(repo);
  } finally {
    Object.assign(flags, prev);
  }
}

/** Every Step's identity-relevant plan fields, to assert nothing was touched. */
function planOf(core: AppCore): string {
  return JSON.stringify(
    core.getSnapshot().journeys.map((j) => ({
      id: j.id,
      steps: j.steps.map((s) => ({
        id: s.id,
        done: s.done,
        dropped: s.dropped ?? false,
        plannedFor: s.plannedFor ?? null,
        estimatedDuration: s.estimatedDuration ?? null,
      })),
    })),
  );
}

// The authoritative week is Monday-start (DEFAULT_WEEK_START); Aug 3 & Aug 10 2026 are consecutive
// Mondays, so a syncTime beat at MON records the week key and one at NEXT_MON closes that week.
const MON = new Date(2026, 7, 3, 10, 0, 0);
const NEXT_MON = new Date(2026, 7, 10, 10, 0, 0);

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

describe('AppCore Weekly Review — adaptive flags OFF: the review runs in PLAIN PRODUCTION', () => {
  // The two halves are split: the week-close summary + never-empty next week + the 48h approval
  // lifecycle need no behaviour model and therefore ship; only the Step-plan PROPOSAL stays gated,
  // so a production review carries `proposals: []` and the screen shows its no-changes branch.
  afterEach(() => {
    jest.useRealTimers();
  });

  it('a week rollover generates a real review with an EMPTY proposal list', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(MON);
    const core = productionCore(inMemoryRepo());
    await core.start();
    // Dev-only demo data since Device QA 2026-08-17 B2 — asked for explicitly.
    core.seedDemoJourney();

    core.syncTime(); // records the current week key (no week has closed yet)
    expect(core.getPendingWeeklyReview()).toBeNull();

    jest.setSystemTime(NEXT_MON);
    core.syncTime(); // a week closed → a review IS generated, model or no model

    const review = core.getPendingWeeklyReview();
    expect(review).not.toBeNull();
    expect(review!.status).toBe('pending');
    expect(review!.proposals).toEqual([]); // the adaptive half stays gated
    // The always-on halves are real: a summary and a never-empty next week.
    expect(review!.summary.frozenJourneyTitles).toEqual([]);
    expect(review!.nextWeek.kind).toBe('steps');
    // …and the screen can actually open (the Home/auto-open path is live).
    expect(core.weeklyReviewNeedsAutoOpen()).toBe(true);
  });

  it('never runs the DAILY tactical auto-apply — D43 stays behind the adaptive flags', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(MON);
    const core = productionCore(inMemoryRepo());
    await core.start();

    let replanned = 0;
    core.bus.on('WeekReplanned', () => (replanned += 1));
    const planBefore = planOf(core);

    core.syncTime();
    jest.setSystemTime(NEXT_MON);
    core.syncTime(); // week rollover — generates the review, must NOT adapt any plan
    // Resolve the review: with the loop ON this is exactly when the daily loop resumes. OFF, it
    // must stay silent on every later beat too.
    expect(core.dismissWeeklyReview()).toBe(true);
    core.syncTime();

    expect(replanned).toBe(0);
    expect(planOf(core)).toBe(planBefore);
  });

  it('approving resolves the review without touching a single Step', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(MON);
    const core = productionCore(inMemoryRepo());
    await core.start();

    core.syncTime();
    jest.setSystemTime(NEXT_MON);
    core.syncTime();
    expect(core.getPendingWeeklyReview()).not.toBeNull();

    const planBefore = planOf(core);
    expect(core.approveWeeklyReview()).toBe(true);

    // Acknowledging a no-proposal review resolves it and leaves the plan exactly as it was.
    expect(core.getPendingWeeklyReview()).toBeNull();
    expect(planOf(core)).toBe(planBefore);
    // A second approve is a no-op (nothing pending) — the review is not left dangling.
    expect(core.approveWeeklyReview()).toBe(false);
  });

  it('still expires an unresolved review after the 48h window (§9)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(MON);
    const { repo, saved } = capturingRepo();
    const core = productionCore(repo);
    await core.start();

    core.syncTime();
    jest.setSystemTime(NEXT_MON);
    core.syncTime();
    expect(saved()!.weeklyReview!.status).toBe('pending');

    const expiryNow = NEXT_MON.getTime() + WEEKLY_REVIEW_TTL_MS + 60 * 60 * 1000;
    jest.setSystemTime(expiryNow);
    // PURE read already reflects the passed window; the persisted status is NOT yet written.
    expect(core.getPendingWeeklyReview()).toBeNull();
    expect(saved()!.weeklyReview!.status).toBe('pending');

    core.syncTime(); // the lifecycle beat flips it

    expect(saved()!.weeklyReview!.status).toBe('expired');
    expect(saved()!.weeklyReview!.resolvedAt).toBe(expiryNow);
  });
});

describe('AppCore Weekly Review — empty week still yields a never-empty review', () => {
  it('generates a review with a non-empty next week and a zeroed summary when no Journey is active', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(MON);
    const core = await startedCore();
    // Remove every seeded Journey so the closed week has NO active Journey to summarize or replan.
    // Snapshot the ids first — getSnapshot returns the live array that deleteJourney mutates.
    for (const id of core.getSnapshot().journeys.map((j) => j.id)) core.deleteJourney(id);
    expect(core.getSnapshot().journeys).toHaveLength(0);

    core.syncTime(); // record the current week key
    jest.setSystemTime(NEXT_MON);
    core.syncTime(); // the week closed → a review is still generated at the boundary

    const review = core.getPendingWeeklyReview();
    expect(review).not.toBeNull();
    // Never-empty (§8): with no active Journeys the fallback is a coach CTA or a Dream suggestion.
    expect(['coachCta', 'dreamSuggestion']).toContain(review!.nextWeek.kind);
    // Zeroed summary — nothing active to count, and no per-Journey change to propose.
    expect(review!.summary.completed).toBe(0);
    expect(review!.summary.partial).toBe(0);
    expect(review!.summary.notCompleted).toBe(0);
    expect(review!.proposals).toHaveLength(0);
    jest.useRealTimers();
  });
});

describe('AppCore Weekly Review — 48h expiry (§9)', () => {
  it('reads null past the TTL and a later syncTime flips the persisted status to expired without applying the plan', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(MON);
    const { core, saved } = capturingCore();
    await core.start();
    // Dev-only demo data since Device QA 2026-08-17 B2 — asked for explicitly.
    core.seedDemoJourney();

    // Report one Step Done — a closed occurrence expiry must never rewrite.
    const run = core.getSnapshot().journeys.find((j) => j.title === 'Run 5km')!;
    const doneStep = run.steps[1];
    core.checkInStep(run.id, doneStep.id);
    const doneAtBefore = core
      .getSnapshot()
      .journeys.find((j) => j.id === run.id)!
      .steps.find((s) => s.id === doneStep.id)!.lastCheckInAt;

    const review = core.devGenerateWeeklyReview()!;
    expect(review.status).toBe('pending');
    expect(saved()!.weeklyReview!.status).toBe('pending');

    // Move past the 48h retention window (still the same week — no new review is due).
    const expiryNow = MON.getTime() + WEEKLY_REVIEW_TTL_MS + 60 * 60 * 1000;
    jest.setSystemTime(expiryNow);
    // PURE read already reflects the passed window; the persisted status is NOT yet written.
    expect(core.getPendingWeeklyReview()).toBeNull();
    expect(saved()!.weeklyReview!.status).toBe('pending');

    core.syncTime(); // the lifecycle beat flips it

    const expired = saved()!.weeklyReview!;
    expect(expired.status).toBe('expired');
    expect(expired.resolvedAt).toBe(expiryNow);
    // Nothing was force-applied: the reported occurrence is untouched (the previous plan continues).
    const stillDone = core
      .getSnapshot()
      .journeys.find((j) => j.id === run.id)!
      .steps.find((s) => s.id === doneStep.id)!;
    expect(stillDone.done).toBe(true);
    expect(stillDone.lastCheckInAt).toBe(doneAtBefore);
    jest.useRealTimers();
  });
});

describe('AppCore Weekly Review — late approval rebases forward-only', () => {
  it('approving near the end of the window recomputes against now — no past-day occurrences, reported Steps untouched', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(MON);
    const core = await startedCore();
    const run = core.getSnapshot().journeys.find((j) => j.title === 'Run 5km')!;

    // A reported occurrence the rebase must not rewrite.
    const doneStep = run.steps[1];
    core.checkInStep(run.id, doneStep.id);
    const doneAtBefore = core
      .getSnapshot()
      .journeys.find((j) => j.id === run.id)!
      .steps.find((s) => s.id === doneStep.id)!.lastCheckInAt;

    const review = core.devGenerateWeeklyReview()!;
    expect(review.status).toBe('pending');

    // Approve LATE — one hour before the 48h window closes (still pending, recomputed against now).
    const lateNow = MON.getTime() + WEEKLY_REVIEW_TTL_MS - 60 * 60 * 1000;
    jest.setSystemTime(lateNow);
    expect(core.getPendingWeeklyReview()).not.toBeNull();

    const beforeApprove = core.getSnapshot().journeys.find((j) => j.id === run.id)!;
    const plannedBefore = new Map(beforeApprove.steps.map((s) => [s.id, s.plannedFor]));

    expect(core.approveWeeklyReview()).toBe(true);

    const after = core.getSnapshot().journeys.find((j) => j.id === run.id)!;
    // The already-reported occurrence is never rewritten (forward-only, D40/D41).
    const stillDone = after.steps.find((s) => s.id === doneStep.id)!;
    expect(stillDone.done).toBe(true);
    expect(stillDone.lastCheckInAt).toBe(doneAtBefore);
    // Any occurrence the rebase MOVED lands today or later — never on a past day.
    const dayFloor = startOfLocalDay(lateNow);
    for (const s of after.steps) {
      if (s.plannedFor != null && s.plannedFor !== plannedBefore.get(s.id)) {
        expect(s.plannedFor).toBeGreaterThanOrEqual(dayFloor);
      }
    }
    // Resolved — no longer surfaced.
    expect(core.getPendingWeeklyReview()).toBeNull();
    jest.useRealTimers();
  });
});
