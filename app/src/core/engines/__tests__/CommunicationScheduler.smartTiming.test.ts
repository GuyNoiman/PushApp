/**
 * CommunicationScheduler — the attribution payload it plans (Smart Notification Timing, PRD §4).
 * The point of these tests is the FLAG: with Smart Timing off nothing new reaches the lock screen,
 * so a shipped build is byte-identical to what it was before this feature existed.
 */
jest.mock('../../config/featureFlags', () => {
  const actual = jest.requireActual('../../config/featureFlags');
  return { ...actual, featureFlags: { ...actual.featureFlags, smartTiming: true } };
});

import { CommunicationScheduler } from '../CommunicationScheduler';
import { featureFlags } from '../../config/featureFlags';
import { NullCalendarGateway } from '../../calendar/CalendarGateway';
import { NullLocationGateway } from '../../location/LocationGateway';
import { EventBus } from '../../events/EventBus';
import type { AppState, Journey, ReminderRule, SchedulingPrefs } from '../../types/domain';
import type { ReminderEngine } from '../ReminderEngine';

const NOW = new Date(2026, 2, 10, 12, 0, 0, 0);

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'journey_1',
    title: 'Move daily',
    why: ['because'],
    durationDays: 30,
    rhythm: 'daily',
    steps: [],
    createdAt: 1,
    ...over,
  } as Journey;
}

function rule(over: Partial<ReminderRule> = {}): ReminderRule {
  return {
    id: 'reminder_1',
    journeyId: 'journey_1',
    trigger: { kind: 'fixedTime', hour: 8, minute: 30 },
    title: 'Time to move',
    body: 'Your Journey is waiting.',
    enabled: true,
    scheduledNotificationIds: [],
    ...over,
  };
}

const prefs: SchedulingPrefs = { dayPart: 'either', preferredDays: [] };

/** A scheduler over one Journey + one rule, plus the calls its ReminderEngine received. */
function makeScheduler() {
  const scheduled: { ruleId: string; data: unknown }[] = [];
  const engine = {
    async scheduleRule(r: ReminderRule, data: unknown) {
      scheduled.push({ ruleId: r.id, data });
      return ['notif_1'];
    },
    async cancel() {},
    // The scheduler sweeps the OS before it rebuilds (the duplicate-reminder fix, 2026-08-23).
    // Nothing is pending in this fake, so the sweep finds nothing — it just has to exist.
    async cancelRepeating() {
      return 0;
    },
  } as unknown as ReminderEngine;

  const state = {
    reminderRules: [rule()],
    journeys: [journey()],
    schedulingPrefs: prefs,
  } as unknown as AppState;

  const scheduler = new CommunicationScheduler(
    new EventBus(),
    () => state,
    engine,
    { location: NullLocationGateway, calendar: NullCalendarGateway },
    () => NOW,
  );
  return { scheduler, scheduled };
}

describe('with Smart Timing ON', () => {
  it('plans opaque attribution ids alongside each notification', () => {
    const { scheduler } = makeScheduler();
    const planned = scheduler.planSchedule([rule()], [journey()], prefs, NOW);
    expect(planned[0].data).toEqual({
      ruleId: 'reminder_1',
      journeyId: 'journey_1',
      kind: 'reminder',
    });
  });

  it('passes them to the ReminderEngine at apply time', async () => {
    const { scheduler, scheduled } = makeScheduler();
    await scheduler.reconcile();
    expect(scheduled).toEqual([
      { ruleId: 'reminder_1', data: { ruleId: 'reminder_1', journeyId: 'journey_1', kind: 'reminder' } },
    ]);
  });
});

describe('with Smart Timing OFF', () => {
  const flags = featureFlags as { smartTiming: boolean };
  beforeEach(() => {
    flags.smartTiming = false;
  });
  afterEach(() => {
    flags.smartTiming = true;
  });

  it('plans no payload at all', () => {
    const { scheduler } = makeScheduler();
    const planned = scheduler.planSchedule([rule()], [journey()], prefs, NOW);
    expect(planned[0].data).toBeUndefined();
    expect('data' in planned[0]).toBe(false);
  });

  it('schedules exactly what it scheduled before this feature existed', async () => {
    const { scheduler, scheduled } = makeScheduler();
    await scheduler.reconcile();
    expect(scheduled).toEqual([{ ruleId: 'reminder_1', data: undefined }]);
  });
});
