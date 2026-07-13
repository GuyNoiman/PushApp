/**
 * ReminderEngine unit tests — the only engine that talks to expo-notifications, so
 * we mock the SDK and assert what it is CALLED with (not real OS scheduling).
 * Covers: permission gating, fixedTime (daily + per-weekday WEEKLY) scheduling,
 * cancelRule, and the dormant calendar/location seams being graceful no-ops via
 * the Null gateways (red-line R2 — nothing leaves the device).
 */

// Mock the SDK before importing the engine (the engine imports it at module load).
// `mock`-prefixed so jest allows the hoisted jest.mock factory to reference them.
const mockScheduleNotificationAsync = jest.fn(
  async (_req: { content: unknown; trigger: unknown }) =>
    `notif_${Math.random().toString(36).slice(2)}`,
);
const mockCancelScheduledNotificationAsync = jest.fn(async (_id: string) => {});
const mockCancelAllScheduledNotificationsAsync = jest.fn(async () => {});
const mockGetPermissionsAsync = jest.fn(async () => ({ granted: true }));
const mockRequestPermissionsAsync = jest.fn(async () => ({ granted: true }));
const mockSetNotificationHandler = jest.fn();

jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationHandler: (arg: unknown) => mockSetNotificationHandler(arg),
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  scheduleNotificationAsync: (req: { content: unknown; trigger: unknown }) =>
    mockScheduleNotificationAsync(req),
  cancelScheduledNotificationAsync: (id: string) => mockCancelScheduledNotificationAsync(id),
  cancelAllScheduledNotificationsAsync: () => mockCancelAllScheduledNotificationsAsync(),
}));

import { NullCalendarGateway } from '../../calendar/CalendarGateway';
import { NullLocationGateway } from '../../location/LocationGateway';
import type { ReminderRule } from '../../types/domain';
import { ReminderEngine } from '../ReminderEngine';

function makeRule(over: Partial<ReminderRule> = {}): ReminderRule {
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

beforeEach(() => {
  jest.clearAllMocks();
});

async function grantedEngine() {
  const engine = new ReminderEngine();
  await engine.init(); // permission granted via the mock
  return engine;
}

describe('ReminderEngine.init', () => {
  it('returns true when permission is already granted and configures the handler', async () => {
    const engine = new ReminderEngine();
    await expect(engine.init()).resolves.toBe(true);
    expect(mockSetNotificationHandler).toHaveBeenCalledTimes(1);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests permission when not yet granted', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const engine = new ReminderEngine();
    await engine.init();
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

describe('ReminderEngine.scheduleRule — fixedTime', () => {
  it('schedules ONE daily notification when no weekdays are given', async () => {
    const engine = await grantedEngine();
    const ids = await engine.scheduleRule(makeRule());

    expect(ids).toHaveLength(1);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const arg = mockScheduleNotificationAsync.mock.calls[0][0] as any;
    expect(arg.trigger).toMatchObject({ type: 'daily', hour: 8, minute: 30 });
    expect(arg.content).toMatchObject({ title: 'Time to move' });
  });

  it('schedules one WEEKLY notification per weekday and returns all ids', async () => {
    const engine = await grantedEngine();
    // JS convention: 1=Mon, 3=Wed, 5=Fri → expo weekday jsDay+1 = 2,4,6.
    const ids = await engine.scheduleRule(
      makeRule({ trigger: { kind: 'fixedTime', hour: 7, minute: 0, weekdays: [1, 3, 5] } }),
    );

    expect(ids).toHaveLength(3);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(3);
    const weekdays = mockScheduleNotificationAsync.mock.calls.map((c) => (c[0] as any).trigger.weekday);
    expect(weekdays).toEqual([2, 4, 6]);
    mockScheduleNotificationAsync.mock.calls.forEach((c) => {
      expect((c[0] as any).trigger.type).toBe('weekly');
      expect((c[0] as any).trigger).toMatchObject({ hour: 7, minute: 0 });
    });
  });

  it('schedules nothing when the rule is disabled', async () => {
    const engine = await grantedEngine();
    const ids = await engine.scheduleRule(makeRule({ enabled: false }));
    expect(ids).toEqual([]);
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules nothing when permission was never granted', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ granted: false });
    mockRequestPermissionsAsync.mockResolvedValueOnce({ granted: false });
    const engine = new ReminderEngine();
    await engine.init();

    expect(await engine.scheduleRule(makeRule())).toEqual([]);
    expect(
      await engine.scheduleRule(
        makeRule({ trigger: { kind: 'fixedTime', hour: 7, minute: 0, weekdays: [1] } }),
      ),
    ).toEqual([]);
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('ReminderEngine.cancelRule', () => {
  it('cancels every stored notification id', async () => {
    const engine = await grantedEngine();
    const rule = makeRule({ scheduledNotificationIds: ['a', 'b', 'c'] });
    await engine.cancelRule(rule);
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
    expect(mockCancelScheduledNotificationAsync.mock.calls.map((c) => c[0])).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op with no stored ids', async () => {
    const engine = await grantedEngine();
    await engine.cancelRule(makeRule({ scheduledNotificationIds: [] }));
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('ReminderEngine — dormant calendar/location seams (R2)', () => {
  it('calendar trigger is a graceful no-op with the Null gateway (nothing scheduled)', async () => {
    const engine = new ReminderEngine(undefined, { calendar: NullCalendarGateway });
    await engine.init();
    const ids = await engine.scheduleRule(
      makeRule({ trigger: { kind: 'calendar', minutesBefore: 15 } }),
    );
    expect(ids).toEqual([]);
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('location trigger is a graceful no-op with the Null gateway (nothing scheduled)', async () => {
    const engine = new ReminderEngine(undefined, { location: NullLocationGateway });
    await engine.init();
    const ids = await engine.scheduleRule(
      makeRule({ trigger: { kind: 'location', transition: 'enter' } }),
    );
    expect(ids).toEqual([]);
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
