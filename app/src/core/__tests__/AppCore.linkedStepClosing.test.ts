/**
 * AppCore.noteInAppAction — the action itself closes the Step (Gap Register B2, founder 2026-09-16:
 * "הפרופיל נשמר → הצעד נסגר").
 *
 * What this proves, against the real engines rather than a mock:
 *  - each of the five destinations closes its Step, and the two whose "it happened" moment lives in
 *    the core (Active Hours saved, a Journey built from the coach) close without a screen saying so;
 *  - the close goes through the SAME check-in a manual "Done" makes — same KPI events, same XP, same
 *    streak, same Journey completion;
 *  - a paused, cancelled or finished Journey is never touched, and nothing is ever paid twice;
 *  - the intro Journey the two test phones already hold (three Steps, Active Hours second) becomes
 *    completable without being rewritten.
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
import type { GoalSpec } from '../coach/interviewPlaybook';
import type { InAppAction } from '../journeys/linkedStepClosing';
import type { KpiInput } from '../kpi';
import { emptyOnboardingAnswers } from '../onboarding/answers';
import type { Repository } from '../persistence/Repository';
import type { FirstRunFlag } from '../persistence/firstRunFlag';
import type { AppState, Journey } from '../types/domain';
import en from '@/i18n/resources/en/onboarding.json';

function memRepo(): Repository {
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

/** A consumed first-run flag, so no demo Journeys are seeded around the one under test. */
function consumedFlag(): FirstRunFlag {
  return { async isConsumed() { return true; }, async markConsumed() {} };
}

async function freshCore(): Promise<{ core: AppCore; kpi: KpiInput[] }> {
  const core = new AppCore(memRepo(), consumedFlag());
  await core.start();
  const kpi: KpiInput[] = [];
  core.setKpiGateway({ enabled: true, record: (e) => void kpi.push(e) });
  return { core, kpi };
}

/** A new account's intro Journey, built from the shipped English copy. */
function newIntro(core: AppCore): Journey {
  core.completeOnboarding(emptyOnboardingAnswers(), en.introJourney);
  return core.getSnapshot().journeys.find((j) => j.title === en.introJourney.title)!;
}

/**
 * The intro Journey exactly as the two test phones already hold it: created before this change, with
 * three Steps and Active Hours second. Built with `createJourney` because that is what the old
 * `introJourneyInput` produced — an ordinary Journey with three linked Steps.
 */
function oldIntro(core: AppCore): Journey {
  return core.createJourney({
    title: 'Getting to know PushApp',
    why: ['Have the app set up the way I want it'],
    durationDays: 14,
    rhythm: 'few-times-week',
    steps: [
      { title: 'Fill in your profile', cadence: 'once', isStarterStep: true, appLink: '/settings/profile' },
      { title: 'Choose the hours we may reach you', cadence: 'once', appLink: '/settings/active-hours' },
      { title: 'Open Tools and try one', cadence: 'once', appLink: '/tools' },
    ],
  });
}

const live = (core: AppCore, id: string) => core.getSnapshot().journeys.find((j) => j.id === id)!;
const stepAt = (core: AppCore, id: string, link: string) => live(core, id).steps.find((s) => s.appLink === link)!;

const readSpec: GoalSpec = {
  title: 'Read before bed',
  domain: 'general',
  processType: 'fixed',
  isHabit: true,
  milestones: [],
  failureRisks: [],
  timing: { daypart: 'evening', sessionMinutes: 20, sessionsPerWeek: 7 },
};

describe('each destination closes its own Step', () => {
  it.each<[InAppAction, string]>([
    ['profileSaved', '/settings/profile'],
    ['toolUsed', '/tools'],
    ['friendsVisited', '/friends'],
  ])('%s closes the Step pointing at %s, and only that one', async (action, link) => {
    const { core } = await freshCore();
    const intro = newIntro(core);

    expect(core.noteInAppAction(action)).toBe(1);

    const steps = live(core, intro.id).steps;
    expect(steps.filter((s) => s.done).map((s) => s.appLink)).toEqual([link]);
  });

  it('Active Hours close their Step when they are saved, with no screen saying so', async () => {
    const { core } = await freshCore();
    const intro = oldIntro(core);

    core.setActiveHours(undefined);

    expect(stepAt(core, intro.id, '/settings/active-hours').done).toBe(true);
    expect(stepAt(core, intro.id, '/settings/profile').done).toBe(false);
  });

  it('the coach Step closes when a Journey is actually built from the coach', async () => {
    const { core } = await freshCore();
    const intro = newIntro(core);

    core.createJourneyFromGoalSpec(readSpec);

    expect(stepAt(core, intro.id, '/coach').done).toBe(true);
    expect(live(core, intro.id).steps.filter((s) => s.done)).toHaveLength(1);
  });

  it('a Future Journey the cap declines builds nothing, and so closes nothing', async () => {
    const { core } = await freshCore();
    const intro = newIntro(core);
    // Fill the Future list to its cap so the next "for later" build is declined.
    let declined = false;
    for (let i = 0; i < 50 && !declined; i += 1) {
      declined = core.createJourneyFromGoalSpec({ ...readSpec, title: `Later ${i}` }, { mode: 'manual' }) === null;
      // A Journey that WAS created closes the Step; reopen it so the declined call is what is tested.
      const coachStep = stepAt(core, intro.id, '/coach');
      if (!declined && coachStep.done) core.reverseReport(intro.id, coachStep.id);
    }
    expect(declined).toBe(true);
    expect(stepAt(core, intro.id, '/coach').done).toBe(false);
  });
});

describe('the SAME check-in path a manual Done uses', () => {
  it('records the same KPI events, the same XP and the same streak as reporting Done by hand', async () => {
    const byAction = await freshCore();
    const byHand = await freshCore();
    const a = newIntro(byAction.core);
    const h = newIntro(byHand.core);
    byAction.kpi.length = 0;
    byHand.kpi.length = 0;
    const xpBefore = byAction.core.getSnapshot().buddy.xp;

    byAction.core.noteInAppAction('profileSaved');
    byHand.core.checkInStep(h.id, stepAt(byHand.core, h.id, '/settings/profile').id);

    expect(byAction.kpi).toEqual(byHand.kpi);
    expect(byAction.kpi.length).toBeGreaterThan(0);
    expect(byAction.core.getSnapshot().buddy.xp).toBeGreaterThan(xpBefore);
    expect(byAction.core.getSnapshot().buddy.xp).toBe(byHand.core.getSnapshot().buddy.xp);
    expect(byAction.core.getSnapshot().streak).toBe(byHand.core.getSnapshot().streak);
    expect(stepAt(byAction.core, a.id, '/settings/profile').lastCheckInAt).toBeDefined();
  });

  it('completes the Journey when the last Step closes, exactly as a final Done would', async () => {
    const { core, kpi } = await freshCore();
    const intro = newIntro(core);

    core.noteInAppAction('profileSaved');
    core.noteInAppAction('toolUsed');
    core.noteInAppAction('friendsVisited');
    expect(live(core, intro.id).status).toBe('active');
    core.createJourneyFromGoalSpec(readSpec);

    const done = live(core, intro.id);
    expect(done.status).toBe('completed');
    expect(done.completedAt).toBeDefined();
    expect(done.completionCard).toBeDefined();
    expect(core.getPendingCompletionCeremony()?.id).toBe(intro.id);
    expect(kpi.map((e) => e.name)).toContain('journey_completed');
  });
});

describe('what is never touched', () => {
  it('leaves a paused Journey alone', async () => {
    const { core } = await freshCore();
    const intro = newIntro(core);
    core.freezeJourney(intro.id);

    expect(core.noteInAppAction('profileSaved')).toBe(0);
    expect(live(core, intro.id).steps.some((s) => s.done)).toBe(false);
  });

  it('leaves a cancelled Journey alone', async () => {
    const { core } = await freshCore();
    const intro = newIntro(core);
    core.abandonJourney(intro.id);
    const xp = core.getSnapshot().buddy.xp;

    expect(core.noteInAppAction('profileSaved')).toBe(0);
    expect(core.noteInAppAction('toolUsed')).toBe(0);
    expect(live(core, intro.id).status).toBe('abandoned');
    expect(live(core, intro.id).steps.some((s) => s.done)).toBe(false);
    expect(core.getSnapshot().buddy.xp).toBe(xp);
  });

  it('leaves a completed Journey alone, and never re-closes one of its Steps', async () => {
    const { core } = await freshCore();
    const intro = oldIntro(core);
    core.noteInAppAction('profileSaved');
    core.setActiveHours(undefined);
    core.noteInAppAction('toolUsed');
    expect(live(core, intro.id).status).toBe('completed');
    const xp = core.getSnapshot().buddy.xp;

    expect(core.noteInAppAction('profileSaved')).toBe(0);
    core.setActiveHours(undefined);
    expect(core.noteInAppAction('toolUsed')).toBe(0);
    expect(core.getSnapshot().buddy.xp).toBe(xp);
  });

  it('pays nothing twice: repeating the action closes nothing more', async () => {
    const { core, kpi } = await freshCore();
    newIntro(core);
    core.noteInAppAction('toolUsed');
    const xp = core.getSnapshot().buddy.xp;
    const events = kpi.length;

    expect(core.noteInAppAction('toolUsed')).toBe(0);
    expect(core.noteInAppAction('toolUsed')).toBe(0);
    expect(core.getSnapshot().buddy.xp).toBe(xp);
    expect(kpi.length).toBe(events);
  });

  it('pays nothing twice even after a report is reversed and the action closes it again', async () => {
    const { core } = await freshCore();
    const intro = newIntro(core);
    core.noteInAppAction('friendsVisited');
    const xp = core.getSnapshot().buddy.xp;
    core.reverseReport(intro.id, stepAt(core, intro.id, '/friends').id);

    expect(core.noteInAppAction('friendsVisited')).toBe(1);
    expect(stepAt(core, intro.id, '/friends').done).toBe(true);
    expect(core.getSnapshot().buddy.xp).toBe(xp);
  });
});

describe('the intro Journey the test phones already hold', () => {
  it('becomes completable by the destination rules, without being rewritten', async () => {
    const { core } = await freshCore();
    const intro = oldIntro(core);
    const before = live(core, intro.id).steps.map((s) => ({ id: s.id, title: s.title, appLink: s.appLink }));

    core.noteInAppAction('profileSaved');
    core.setActiveHours(undefined);
    // Neither of these points at anything on the old Journey.
    expect(core.noteInAppAction('friendsVisited')).toBe(0);
    core.createJourneyFromGoalSpec(readSpec);
    expect(live(core, intro.id).status).toBe('active');
    core.noteInAppAction('toolUsed');

    const after = live(core, intro.id);
    expect(after.status).toBe('completed');
    // Same three Steps, same words, same links: finished, not replaced.
    expect(after.steps.map((s) => ({ id: s.id, title: s.title, appLink: s.appLink }))).toEqual(before);
  });
});
