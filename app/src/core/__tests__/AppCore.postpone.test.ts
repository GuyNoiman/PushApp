/**
 * AppCore — Step Postponement orchestration (D37). Verifies the ONE-shot lifecycle end to end over
 * a mocked expo-notifications (permission GRANTED so a notification id is returned):
 *   • postponeStepReminder stamps the Step fields, schedules a DATE one-shot, stores its id;
 *   • a re-postpone cancels the prior one-shot before scheduling the new one;
 *   • a FINAL report (Done / Couldn't / Partial) cancels the pending one-shot + clears the fields;
 *   • freeze / delete cancel the pending one-shot;
 *   • the day-crossing shorten rule blocks with no_slot_today when under the 30-min floor.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockSchedule = jest.fn(async () => `notif_${Math.random().toString(36).slice(2)}`);
const mockCancel = jest.fn(async () => {});
const mockCancelAll = jest.fn(async () => {});
jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: (req: unknown) => mockSchedule(),
  cancelScheduledNotificationAsync: (id: string) => mockCancel(),
  cancelAllScheduledNotificationsAsync: () => mockCancelAll(),
}));

import { AppCore } from '../AppCore';
import type { AppState } from '../types/domain';
import type { Repository } from '../persistence/Repository';
import type { FirstRunFlag } from '../persistence/firstRunFlag';

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

function memFlag(): FirstRunFlag {
  let consumed = true; // consumed ⇒ no demo seed ⇒ a clean, empty store
  return {
    async isConsumed() {
      return consumed;
    },
    async markConsumed() {
      consumed = true;
    },
  };
}

async function coreWithStep(
  rhythm: 'daily' | 'few-times-week' | 'weekly' = 'few-times-week',
  cadence: 'once' | 'daily' | 'weekly' = 'once',
) {
  const core = new AppCore(memRepo(), memFlag());
  await core.start();
  await core.initReminders(); // grants permission via the mock
  const journey = core.createJourney({
    title: 'Run 5km',
    why: ['Feel stronger'],
    durationDays: 30,
    rhythm,
    steps: [{ title: 'Jog 15 minutes', cadence }],
  });
  return { core, journey, stepId: journey.steps[0].id };
}

/** The Step as currently held in the core's snapshot. */
function liveStep(core: AppCore, journeyId: string, stepId: string) {
  return core.getSnapshot().journeys.find((j) => j.id === journeyId)!.steps.find((s) => s.id === stepId)!;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('AppCore.postponeStepReminder — default 2h path', () => {
  it('stamps the Step fields, schedules a DATE one-shot, and stores its id', async () => {
    const { core, journey, stepId } = await coreWithStep();

    const result = await core.postponeStepReminder(journey.id, stepId);

    expect(result.ok).toBe(true);
    expect(result.scheduled).toBe(true);
    expect(result.at).toBeGreaterThan(Date.now());
    expect(mockSchedule).toHaveBeenCalledTimes(1);

    const step = liveStep(core, journey.id, stepId);
    expect(step.postponedUntil).toBe(result.at);
    expect(step.postponeCount).toBe(1);
    expect(step.postponedAt).toBeGreaterThan(0);
    expect(step.postponeNotificationId).toBeTruthy();
    expect(step.done).toBe(false); // action, not a status (D37.1)
  });

  it('a re-postpone cancels the prior one-shot before scheduling a new one', async () => {
    const { core, journey, stepId } = await coreWithStep();
    await core.postponeStepReminder(journey.id, stepId);
    const firstId = liveStep(core, journey.id, stepId).postponeNotificationId;

    await core.postponeStepReminder(journey.id, stepId);

    expect(mockCancel).toHaveBeenCalledTimes(1); // the prior id was cancelled
    expect(mockSchedule).toHaveBeenCalledTimes(2);
    expect(liveStep(core, journey.id, stepId).postponeCount).toBe(2);
    expect(liveStep(core, journey.id, stepId).postponeNotificationId).not.toBe(firstId);
  });
});

describe('AppCore.postponeStepReminder — final reports clear the one-shot', () => {
  it('Done (checkInStep) cancels the pending one-shot and clears the fields', async () => {
    const { core, journey, stepId } = await coreWithStep();
    await core.postponeStepReminder(journey.id, stepId);

    core.checkInStep(journey.id, stepId);

    expect(mockCancel).toHaveBeenCalled();
    const step = liveStep(core, journey.id, stepId);
    expect(step.postponeNotificationId).toBeUndefined();
    expect(step.postponedUntil).toBeUndefined();
    expect(step.postponeCount).toBeUndefined();
  });

  it('Couldn’t (a cancel report) cancels the pending one-shot and clears the fields', async () => {
    const { core, journey, stepId } = await coreWithStep();
    await core.postponeStepReminder(journey.id, stepId);

    await core.submitReason({ journeyId: journey.id, stepId, action: 'cancel', reasonId: 'couldnt' });

    expect(mockCancel).toHaveBeenCalled();
    expect(liveStep(core, journey.id, stepId).postponeNotificationId).toBeUndefined();
    expect(liveStep(core, journey.id, stepId).postponedUntil).toBeUndefined();
  });

  it('Partial (a final report of execution, §11.6a) cancels the pending one-shot', async () => {
    const { core, journey, stepId } = await coreWithStep();
    await core.postponeStepReminder(journey.id, stepId);

    await core.submitReason({ journeyId: journey.id, stepId, action: 'postpone', reasonId: 'did_partially' });

    expect(mockCancel).toHaveBeenCalled();
    expect(liveStep(core, journey.id, stepId).postponeNotificationId).toBeUndefined();
    expect(liveStep(core, journey.id, stepId).postponedUntil).toBeUndefined();
  });
});

describe('AppCore.postponeStepReminder — Journey lifecycle clears the one-shot', () => {
  it('freezing the Journey cancels the pending one-shot and clears the fields', async () => {
    const { core, journey, stepId } = await coreWithStep();
    await core.postponeStepReminder(journey.id, stepId);

    core.freezeJourney(journey.id);

    expect(mockCancel).toHaveBeenCalled();
    expect(liveStep(core, journey.id, stepId).postponeNotificationId).toBeUndefined();
  });

  it('deleting the Journey cancels the pending one-shot (id read before removal)', async () => {
    const { core, journey, stepId } = await coreWithStep();
    await core.postponeStepReminder(journey.id, stepId);

    core.deleteJourney(journey.id);

    expect(mockCancel).toHaveBeenCalled();
    expect(core.getSnapshot().journeys.find((j) => j.id === journey.id)).toBeUndefined();
  });
});

describe('AppCore.postponeStepReminder — no-op / crossing warnings', () => {
  it('returns { ok: false } and schedules nothing for an already-done Step (#3)', async () => {
    const { core, journey, stepId } = await coreWithStep();
    core.checkInStep(journey.id, stepId); // Done — no live occurrence to postpone
    mockSchedule.mockClear();

    const result = await core.postponeStepReminder(journey.id, stepId);

    expect(result.ok).toBe(false);
    expect(mockSchedule).not.toHaveBeenCalled();
    const step = liveStep(core, journey.id, stepId);
    expect(step.postponedUntil).toBeUndefined();
    expect(step.postponeNotificationId).toBeUndefined();
  });

  it('a FLEXIBLE-WEEKLY Step moved to another day in the SAME week warns nothing (#2)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 10, 0, 0)); // Tuesday (Mon-start week)
    const { core, journey, stepId } = await coreWithStep('few-times-week');
    const chosenTime = new Date(2026, 6, 15, 10, 0, 0).getTime(); // Wednesday, same week

    const result = await core.postponeStepReminder(journey.id, stepId, { chosenTime });

    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]); // no crosses_day for a flexible-weekly same-week move
    jest.useRealTimers();
  });

  it('a DAY-SPECIFIC Step moved to the next day warns crosses_day', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 10, 0, 0));
    const { core, journey, stepId } = await coreWithStep('daily', 'daily');
    const chosenTime = new Date(2026, 6, 15, 10, 0, 0).getTime(); // tomorrow

    const result = await core.postponeStepReminder(journey.id, stepId, { chosenTime });

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain('crosses_day');
    jest.useRealTimers();
  });
});

describe('AppCore.postponeStepReminder — day-crossing block', () => {
  it('returns no_slot_today and schedules nothing when under the 30-min floor', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 23, 50, 0)); // 10 minutes left in the day
    const { core, journey, stepId } = await coreWithStep();
    mockSchedule.mockClear();

    const result = await core.postponeStepReminder(journey.id, stepId);

    expect(result).toEqual({ ok: false, error: 'no_slot_today' });
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(liveStep(core, journey.id, stepId).postponedUntil).toBeUndefined();
    jest.useRealTimers();
  });
});
