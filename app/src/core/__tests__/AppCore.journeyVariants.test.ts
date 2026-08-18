/**
 * End to end: the chosen Journey's own question decides which VERSION is built, the version is
 * stamped on the Journey, and the user's verdict at the end is counted for it (D62).
 *
 * The chain matters more than any link in it. A version that is chosen but not recorded produces a
 * verdict that can be counted for nothing, and a library that can compare only on completion rate
 * is a library that learns to recommend whatever is easiest to finish. These tests run the REAL
 * AppCore over that whole chain.
 */
import { AppCore } from '../AppCore';
import type { GoalSpec } from '../coach/interviewPlaybook';
import { variantInterviewQuestions, variantQuestionId } from '../coach/variantQuestions';
import { RECURRING_GENERIC } from '../learning/library/definitions';
import { rateLibrary } from '../learning/library/variantRatings';
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

function memRepo(): Repository {
  let saved: AppState | null = null;
  return {
    load: async () => ({ kind: 'ok', state: saved }),
    save: async (state: AppState) => {
      saved = state;
    },
  } as unknown as Repository;
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

const FRICTION_QUESTION = variantQuestionId(RECURRING_GENERIC.id, 'friction');

async function core(): Promise<AppCore> {
  const instance = new AppCore(memRepo());
  await instance.start();
  return instance;
}

/** Onboarding answered with the three "how do you like to work" questions (Q7–Q9). */
function workingStyle(startingMode: string): OnboardingAnswers {
  return { version: 2, selections: { q7: [startingMode] }, freeText: {}, skipped: [] };
}

describe('the Journey’s own question decides which version is built', () => {
  it('builds the version the user’s answer argued for, over the profile’s hypothesis', async () => {
    const app = await core();
    // Onboarding said scale was the problem…
    app.completeOnboarding({ version: 2, selections: { q5: ['tooMuchAtOnce'] }, freeText: {}, skipped: [] });

    // …but asked about THIS Journey, the user said the deciding was.
    const [question] = variantInterviewQuestions(RECURRING_GENERIC);
    const deciding = question.options[2];
    const journey = app.createJourneyFromGoalSpec({
      ...SHAKE,
      answers: { [FRICTION_QUESTION]: deciding },
    });

    expect(journey.libraryRef).toEqual({
      definitionId: 'recurring.generic',
      variantId: 'prepare',
      version: RECURRING_GENERIC.version,
    });
    expect(journey.steps.map((s) => s.title).join(' ')).toContain('Set up the spot');
  });

  it('stamps the version on every library-built Journey, so a verdict can be counted for it', async () => {
    const app = await core();
    const journey = app.createJourneyFromGoalSpec(SHAKE);

    // Nothing was known and nothing was asked: the declared default, recorded honestly as itself.
    expect(journey.libraryRef).toEqual({
      definitionId: 'recurring.generic',
      variantId: 'anchor',
      version: RECURRING_GENERIC.version,
    });
  });

  it('lets the new "how do you like to work" answers choose a version on their own', async () => {
    // Q7–Q9 were added alongside D62 for exactly this: two people who want the same thing and need
    // opposite plans, with nothing in their friction answers to tell them apart.
    const clarityFirst = await core();
    clarityFirst.completeOnboarding(workingStyle('clarityFirst'));
    const actionFirst = await core();
    actionFirst.completeOnboarding(workingStyle('actionFirst'));

    expect(clarityFirst.createJourneyFromGoalSpec(SHAKE).libraryRef?.variantId).toBe('prepare');
    expect(actionFirst.createJourneyFromGoalSpec(SHAKE).libraryRef?.variantId).toBe('tiny_start');
  });

  it('feeds the end-of-Journey verdict to the version AND to its Journey', async () => {
    const app = await core();
    const journey = app.createJourneyFromGoalSpec(SHAKE);
    app.abandonJourney(journey.id);
    app.submitJourneyFeedback(journey.id, { helped: 'no' });

    const ratings = rateLibrary(app.getSnapshot().journeys);
    const variant = ratings.byVariant.find((r) => r.variantId === 'anchor');
    const definition = ratings.byJourney.find((r) => r.definitionId === 'recurring.generic');

    expect(variant?.labelled).toBe(1);
    expect(variant?.worked).toBe(0);
    // One event, counted for both objects — never two collections that can disagree.
    expect(definition?.labelled).toBe(1);
    expect(definition?.variants.map((v) => v.variantId)).toEqual(['anchor']);
  });
});
