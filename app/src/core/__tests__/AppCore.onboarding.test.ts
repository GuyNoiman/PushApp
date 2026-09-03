/**
 * AppCore onboarding facade (Initial Onboarding Questionnaire, K2). Covers the first-run gate flag on
 * the Snapshot, mid-flow resume (step + answers persist), completion (never re-shows), the Coach
 * handoff summary seam, and the migration rule that EXISTING users are treated as already onboarded.
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
import { emptyOnboardingAnswers, toggleSelection } from '../onboarding/answers';
import { questionById } from '../onboarding/questions';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';
import type { FirstRunFlag } from '../persistence/firstRunFlag';

/** In-memory Repository that persists across "relaunches" (a second AppCore over the same store). */
function memRepo(initial: AppState | null = null): { repo: Repository; saved: () => AppState | null } {
  let saved = initial;
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
    saved: () => saved,
  };
}

/** A consumed first-run flag so the demo seed never runs — keeps these tests focused on onboarding. */
function consumedFlag(): FirstRunFlag {
  return { async isConsumed() { return true; }, async markConsumed() {} };
}

/** A genuine fresh-install flag (not consumed) so start() runs the demo seed — shared across relaunches. */
function freshFlag(): FirstRunFlag {
  let consumed = false;
  return {
    async isConsumed() {
      return consumed;
    },
    async markConsumed() {
      consumed = true;
    },
  };
}

describe('AppCore onboarding facade (K2)', () => {
  it('a brand-new run starts NOT onboarded, at the language step, with empty answers', async () => {
    const { repo } = memRepo();
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    expect(core.getSnapshot().onboardingCompleted).toBe(false);
    expect(core.getOnboardingStep()).toBe('language');
    expect(core.getOnboardingAnswers()).toEqual(emptyOnboardingAnswers());
    expect(core.getOnboardingCoachSummary()).toBeNull();
  });

  it('saveOnboardingProgress persists the resume step + answers WITHOUT completing', async () => {
    const { repo, saved } = memRepo();
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    let answers = emptyOnboardingAnswers();
    answers = toggleSelection(answers, questionById('q1')!, 'health');
    core.saveOnboardingProgress('q2', answers);

    expect(core.getSnapshot().onboardingCompleted).toBe(false);
    expect(saved()?.onboardingStep).toBe('q2');
    expect(saved()?.onboardingAnswers?.selections.q1).toEqual(['health']);
  });

  it('resumes mid-flow after a relaunch (same store, new AppCore)', async () => {
    const store = memRepo();
    const first = new AppCore(store.repo, consumedFlag());
    await first.start();
    let answers = emptyOnboardingAnswers();
    answers = toggleSelection(answers, questionById('q1')!, 'calm');
    // A step still IN the flow. `personalInfo` used to stand here and was retired on 2026-09-03;
    // where a retired step resumes is covered in core/onboarding (resolveResumeStep), and what this
    // test is about is that a live one comes back exactly where it was left.
    first.saveOnboardingProgress('personalization', answers);

    const second = new AppCore(store.repo, consumedFlag());
    await second.start();
    expect(second.getSnapshot().onboardingCompleted).toBe(false);
    expect(second.getOnboardingStep()).toBe('personalization');
    expect(second.getOnboardingAnswers().selections.q1).toEqual(['calm']);
  });

  it('rescues a device stranded mid-questionnaire by the v2 change, keeping its answers', async () => {
    // Two people were part-way through the nine questions on the shipped build when the flow became
    // three pages. Handing that device back a step the flow no longer contains would leave it there
    // forever, because `nextStep` clamps to itself for an unknown step.
    const store = memRepo();
    const first = new AppCore(store.repo, consumedFlag());
    await first.start();
    let answers = emptyOnboardingAnswers();
    answers = toggleSelection(answers, questionById('q3')!, 'notStarted');
    first.saveOnboardingProgress('q5', answers);
    expect(store.saved()?.onboardingStep).toBe('q5');

    const second = new AppCore(store.repo, consumedFlag());
    await second.start();
    // Resumed at the welcome — the last page before the conversation.
    expect(second.getOnboardingStep()).toBe('intro');
    expect(second.getSnapshot().onboardingCompleted).toBe(false);
    // And nothing they told us was thrown away: the answers are still valid signals for the coach.
    expect(second.getOnboardingAnswers().selections.q3).toEqual(['notStarted']);
  });

  it('the gate closes at the WELCOME now, which is what makes the coach reachable at all', async () => {
    // Onboarding v2: the conversation is part of onboarding, and the coach lives outside the
    // first-run gate — until onboarding is marked complete, `/coach` is not a reachable route.
    // Completing here is what opens that door, and it is also why walking away mid-conversation
    // lands on a working app rather than trapping somebody in a flow they did not want.
    const store = memRepo();
    const core = new AppCore(store.repo, consumedFlag());
    await core.start();

    let answers = emptyOnboardingAnswers();
    answers = toggleSelection(answers, questionById('q3')!, 'notStarted');
    core.saveOnboardingProgress('intro', answers);
    expect(core.getSnapshot().onboardingCompleted).toBe(false);

    core.completeOnboarding(answers);
    expect(core.getSnapshot().onboardingCompleted).toBe(true);
    expect(core.getOnboardingCoachSummary()?.startingPoint).toBe('notStarted');
  });

  it('completeOnboarding marks it complete forever and exposes the Coach summary', async () => {
    const store = memRepo();
    const core = new AppCore(store.repo, consumedFlag());
    await core.start();

    let answers = emptyOnboardingAnswers();
    answers = toggleSelection(answers, questionById('q3')!, 'notStarted');
    core.completeOnboarding(answers);

    expect(core.getSnapshot().onboardingCompleted).toBe(true);
    const summary = core.getOnboardingCoachSummary();
    expect(summary?.startingPoint).toBe('notStarted');

    // Never re-shows: a relaunch stays completed.
    const relaunch = new AppCore(store.repo, consumedFlag());
    await relaunch.start();
    expect(relaunch.getSnapshot().onboardingCompleted).toBe(true);
  });

  it('completion timestamp is stable across a re-call (idempotent)', async () => {
    const { repo, saved } = memRepo();
    const core = new AppCore(repo, consumedFlag());
    await core.start();
    core.completeOnboarding(emptyOnboardingAnswers());
    const first = saved()?.onboardingCompletedAt;
    core.completeOnboarding(emptyOnboardingAnswers());
    expect(saved()?.onboardingCompletedAt).toBe(first);
  });

  it('an EXISTING user (pre-onboarding snapshot) is treated as already onboarded (migration)', async () => {
    // A persisted snapshot with no onboardingCompletedAt AND no in-progress markers = a user who
    // predates onboarding (even one with real Journeys) — treat them as already onboarded.
    const legacy = memRepo({
      journeys: [{ id: 'j1', title: 'Old', steps: [] }],
      buddy: { xp: 0 },
    } as unknown as AppState);
    const core = new AppCore(legacy.repo, consumedFlag());
    await core.start();
    expect(core.getSnapshot().onboardingCompleted).toBe(true);
  });

  // Regression (code review #1, HIGH): a first run that PERSISTS a snapshot before the user advances
  // past the language step must NOT be mistaken for a legacy (already-onboarded) one — the fresh-run
  // onboardingStep marker keeps it distinguishable. The demo seed is the dev path that writes such a
  // snapshot (it is no longer part of a real first run — founder decision, Device QA 2026-08-17 B2),
  // so it is asked for explicitly here and the regression stays covered.
  it('a genuine first-run user who leaves before advancing STILL gets onboarding on relaunch (demo-seed path)', async () => {
    const store = memRepo();
    const flag = freshFlag();
    const first = new AppCore(store.repo, flag);
    await first.start();
    first.seedDemoJourney(); // persists — the user has NOT pressed Continue yet

    expect(first.getSnapshot().onboardingCompleted).toBe(false);
    expect((store.saved()?.journeys.length ?? 0)).toBeGreaterThan(0); // seed really persisted
    expect(store.saved()?.onboardingCompletedAt).toBeUndefined();
    expect(store.saved()?.onboardingStep).toBe('language'); // the marker that saves us

    // Relaunch over the same store/flag: onboarding must still show, resuming at the start.
    const second = new AppCore(store.repo, flag);
    await second.start();
    expect(second.getSnapshot().onboardingCompleted).toBe(false);
    expect(second.getOnboardingStep()).toBe('language');
  });
});

describe('the Journey the first run leaves behind (founder, 2026-09-03)', () => {
  /**
   * The profile page left the first run and its fields became a Journey instead. That only works if
   * the Journey is actually there when the person arrives at Home, exactly once, and never on a
   * device that has already been through this.
   */
  const intro = {
    title: 'Getting to know PushApp',
    why: ['Set up my way'],
    steps: [
      { title: 'Fill in your profile', description: 'Name, username, country.' },
      { title: 'Choose the hours', description: 'When a reminder may arrive.' },
      { title: 'Open Tools', description: 'Try one.' },
    ],
  };

  it('is created when onboarding completes, pointing at the screen it asks for', async () => {
    const { repo, saved } = memRepo();
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    core.completeOnboarding(emptyOnboardingAnswers(), intro);

    const created = (saved()?.journeys ?? []).find((j) => j.title === 'Getting to know PushApp');
    expect(created).toBeDefined();
    expect(created!.steps.map((s) => s.appLink)).toEqual([
      '/settings/profile',
      '/settings/active-hours',
      '/tools',
    ]);
  });

  it('is created ONCE, however many times completion is re-called', async () => {
    const { repo, saved } = memRepo();
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    core.completeOnboarding(emptyOnboardingAnswers(), intro);
    core.completeOnboarding(emptyOnboardingAnswers(), intro);

    const matches = (saved()?.journeys ?? []).filter((j) => j.title === 'Getting to know PushApp');
    expect(matches).toHaveLength(1);
  });

  it('is not created at all when the caller does not ask for one', async () => {
    // Every existing caller and test passes answers alone, and must keep behaving exactly as before.
    const { repo, saved } = memRepo();
    const core = new AppCore(repo, consumedFlag());
    await core.start();

    core.completeOnboarding(emptyOnboardingAnswers());
    expect(saved()?.journeys ?? []).toHaveLength(0);
  });
});
