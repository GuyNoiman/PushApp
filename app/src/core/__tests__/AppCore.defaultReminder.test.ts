/**
 * AppCore — every new Journey arrives with a reminder, ON (founder, 2026-08-17: "by default I should
 * be receiving notifications, not have it be off").
 *
 * The device pass found that no notification had EVER arrived. The chain had two breaks: the coach's
 * creation path never created a reminder rule at all (so the Journey screen honestly read "Off"), and
 * only the manual wizard remembered to add one. The rule now belongs to Journey CREATION — wired to
 * the `JourneyCreated` event, which the single JourneyEngine construction path emits — so no caller
 * can forget it. These tests hold that down for EACH creation path, end to end through a mocked
 * expo-notifications, and pin the one thing that must stay silent:
 *
 *   · manual (wizard) path      → rule, enabled, at the shared default time, actually SCHEDULED;
 *   · coach path (GoalSpec)     → the same;
 *   · FUTURE Journey            → rule saved with the plan, but NOTHING scheduled until it starts;
 *   · a Journey that already has a rule is never given a second one (the wizard's own time wins).
 */
// AsyncStorage + expo-notifications load through AppCore's module graph even with an injected
// in-memory Repository (mirrors the other AppCore suites).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockSchedule = jest.fn(async () => `notif_${Math.random().toString(36).slice(2)}`);
jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: (req: unknown) => mockSchedule(),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));

import { AppCore } from '../AppCore';
import type { GoalSpec } from '../coach/interviewPlaybook';
import type { NewJourneyInput } from '../engines/JourneyEngine';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';
import type { FirstRunFlag } from '../persistence/firstRunFlag';
import { DEFAULT_REMINDER_HOUR, DEFAULT_REMINDER_MINUTE } from '../util/reminderView';

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

/** Consumed ⇒ no demo seed ⇒ a clean store, so each test owns every Journey in it. */
function memFlag(): FirstRunFlag {
  return {
    async isConsumed() {
      return true;
    },
    async markConsumed() {},
  };
}

const JOURNEY: NewJourneyInput = {
  title: 'Run 5km',
  why: ['Feel stronger'],
  durationDays: 30,
  rhythm: 'daily',
  steps: [{ title: 'Jog 15 minutes', cadence: 'daily' }],
};

const SPEC: GoalSpec = {
  title: 'Read before bed',
  domain: 'general',
  processType: 'fixed',
  isHabit: true,
  milestones: [],
  failureRisks: [],
  timing: { daypart: 'evening', sessionMinutes: 20, sessionsPerWeek: 7 },
};

/** A started core with notification permission granted (via the mock) and nothing scheduled yet. */
async function grantedCore() {
  const core = new AppCore(memRepo(), memFlag());
  await core.start();
  await core.initReminders();
  mockSchedule.mockClear();
  return core;
}

/** Let the fire-and-forget reconcile that follows Journey creation settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AppCore — a new Journey arrives with its reminder ON', () => {
  it('the MANUAL path: an enabled Fixed rule at the shared default time, actually scheduled', async () => {
    const core = await grantedCore();

    const journey = core.createJourney(JOURNEY);
    await settle();

    const rules = core.listReminderRules(journey.id);
    expect(rules).toHaveLength(1);
    expect(rules[0].enabled).toBe(true);
    expect(rules[0].trigger).toMatchObject({
      kind: 'fixedTime',
      hour: DEFAULT_REMINDER_HOUR,
      minute: DEFAULT_REMINDER_MINUTE,
    });
    // The Journey screen must show the truth — never "Off" for a Journey that has a live reminder.
    expect(core.getJourneyReminder(journey.id).mode).toBe('fixed');
    // …and the whole chain ran: a notification is really pending with the OS.
    expect(mockSchedule).toHaveBeenCalled();
  });

  it('reminds at the hour the PLAN says the user does this, not at a fixed default', async () => {
    // The interview captured "evenings", so the Planner schedules every Step in the evening. A
    // reminder at any other hour would be the app disagreeing with a plan the user just approved —
    // which is exactly what the old fixed 09:00 (and the wizard's fixed 08:00) did.
    const core = await grantedCore();

    const journey = core.createJourneyFromGoalSpec({
      ...SPEC,
      timing: { ...SPEC.timing, preferredDays: [1, 2, 3, 4, 5] },
    });
    await settle();

    const firstStepHour = new Date(journey.steps[0].plannedFor!).getHours();
    expect(core.listReminderRules(journey.id)[0].trigger).toMatchObject({
      kind: 'fixedTime',
      hour: firstStepHour,
    });
    expect(firstStepHour).not.toBe(DEFAULT_REMINDER_HOUR);
  });

  it('the COACH path: the same reminder, without the screen having to ask for it', async () => {
    const core = await grantedCore();

    const journey = core.createJourneyFromGoalSpec(SPEC);
    await settle();

    expect(core.listReminderRules(journey.id)).toHaveLength(1);
    expect(core.getJourneyReminder(journey.id).mode).toBe('fixed');
    expect(mockSchedule).toHaveBeenCalled();
  });

  it('never mints a second rule for a Journey that already has one (an explicit time wins)', async () => {
    const core = await grantedCore();
    const journey = core.createJourney(JOURNEY);
    await settle();

    // What the wizard does when the user picks their own time: update, never duplicate.
    await core.setJourneyReminderFixed(
      journey.id,
      { hour: 19, minute: 30, weekdays: [] },
      { title: 'Evening run', body: 'Your Journey is waiting.' },
    );

    const rules = core.listReminderRules(journey.id);
    expect(rules).toHaveLength(1);
    expect(rules[0].trigger).toMatchObject({ kind: 'fixedTime', hour: 19, minute: 30 });
  });

  it('an explicit Off stays off — the default never overrides the user', async () => {
    const core = await grantedCore();
    const journey = core.createJourney(JOURNEY);
    await settle();

    await core.setJourneyReminderOff(journey.id);

    expect(core.getJourneyReminder(journey.id).mode).toBe('off');
    expect(core.listReminderRules(journey.id)[0].enabled).toBe(false);
  });
});

describe('AppCore — a FUTURE Journey saves its reminder but stays silent', () => {
  it('creates the rule with the plan and schedules NOTHING until it starts', async () => {
    const core = await grantedCore();

    const journey = core.createFutureJourney(JOURNEY, { mode: 'manual' })!;
    await settle();

    // The rule belongs to the plan…
    expect(core.listReminderRules(journey.id)).toHaveLength(1);
    expect(core.listReminderRules(journey.id)[0].enabled).toBe(true);
    // …but an approved plan saved for later must never nudge (the scheduler's isRunning gate).
    expect(mockSchedule).not.toHaveBeenCalled();

    // Starting it is what lets the reminder begin.
    core.startJourneyNow(journey.id);
    await settle();
    expect(mockSchedule).toHaveBeenCalled();
  });
});
