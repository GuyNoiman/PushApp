/**
 * End to end: what the user said about themselves in their first two minutes reaches the plan.
 *
 * This is the gap the founder's verdict came out of — "the plan that was built for me didn't help
 * me at all". Onboarding asked him what tends to get in his way, stored the answer, built a coach
 * summary from it, and then no code path in the app ever read it. Two users who answered
 * differently received byte-identical plans.
 *
 * These tests run the REAL AppCore: answer onboarding, build a Journey through the coach path, and
 * assert the plan differs. They deliberately assert on the STEP TITLES rather than on the internal
 * approach id, because the titles are what the user actually meets.
 */
import { AppCore } from '../AppCore';
import type { GoalSpec } from '../coach/interviewPlaybook';
import type { AppState } from '../types/domain';
import type { OnboardingAnswers } from '../onboarding/model';
import type { Repository } from '../persistence/Repository';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  scheduleNotificationAsync: jest.fn(async () => 'notif_1'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));

/** An in-memory Repository — no persistence, no crypto, no I/O. */
function memRepo(): Repository {
  let saved: AppState | null = null;
  return {
    load: async () => ({ kind: 'ok', state: saved }),
    save: async (state: AppState) => {
      saved = state;
    },
  } as unknown as Repository;
}

/** Onboarding answered with ONE friction, which is all the matcher needs. */
function answeredWith(friction: string): OnboardingAnswers {
  return { version: 1, selections: { q5: [friction] }, freeText: {}, skipped: [] };
}

const SHAKE: GoalSpec = {
  title: 'Drink a protein shake',
  domain: 'body_image',
  processType: 'recurring',
  isHabit: true,
  milestones: [],
  failureRisks: [],
  timing: { preferredDays: [1, 3, 5] },
};

async function planFor(friction?: string): Promise<string[]> {
  const core = new AppCore(memRepo());
  await core.start();
  if (friction) core.completeOnboarding(answeredWith(friction));
  return core.createJourneyFromGoalSpec(SHAKE).steps.map((s) => s.title);
}

describe('the onboarding answers shape the plan', () => {
  it('builds a DIFFERENT plan for someone who said "too much at once"', async () => {
    const tooMuch = await planFor('tooMuchAtOnce');
    const busy = await planFor('lifeBusy');

    // Two users, same goal, same domain, same days — and now genuinely different plans. Swap the
    // user and the Journey changes, which is the partner's own QA rule and the one our code failed
    // absolutely: it used to be identical for every user in a domain.
    expect(tooMuch).not.toEqual(busy);
    // Each one is the approach their own answer argued for.
    expect(tooMuch.join(' ')).toContain('smallest version');
    expect(busy.join(' ')).toContain('already do every day');
  });

  it('keeps the user’s own words in every plan, whichever approach was matched', async () => {
    for (const friction of ['tooMuchAtOnce', 'lifeBusy', 'noClearPlan', undefined]) {
      const titles = await planFor(friction);

      expect(titles.every((t) => t.includes('Drink a protein shake'))).toBe(true);
    }
  });

  it('falls back to the safe default for a user who skipped onboarding, and still plans', async () => {
    const skipped = await planFor(undefined);
    const anchored = await planFor('lifeBusy');

    // `anchor` IS the default, so these agree — the point is that no onboarding still produces a
    // real, complete plan rather than an empty or a broken one.
    expect(skipped).toEqual(anchored);
    expect(skipped.length).toBeGreaterThan(1);
  });
});
