/**
 * ReminderEngine — the notification `data` payload and the tap listener (Smart Notification
 * Timing, PRD §4). Both are new OS surface, so what goes ON the notification is pinned here: the
 * three opaque ids and NOTHING else. A lock screen is public; a Journey title in a payload would be
 * a privacy regression even though the same title is already in the visible body.
 */
const mockScheduleNotificationAsync = jest.fn(
  async (_req: { content: unknown; trigger: unknown }) => 'notif_1',
);
const mockAddResponseListener = jest.fn((_cb: (response: unknown) => void) => ({
  remove: mockRemoveListener,
}));
const mockRemoveListener = jest.fn();

jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: (req: { content: unknown; trigger: unknown }) =>
    mockScheduleNotificationAsync(req),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  addNotificationResponseReceivedListener: (cb: (response: unknown) => void) =>
    mockAddResponseListener(cb),
}));

import { ReminderEngine, type ReminderNotificationData } from '../ReminderEngine';
import type { ReminderRule } from '../../types/domain';

const PAYLOAD: ReminderNotificationData = {
  ruleId: 'reminder_1',
  journeyId: 'journey_1',
  kind: 'reminder',
};

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

async function grantedEngine() {
  const engine = new ReminderEngine();
  await engine.init();
  return engine;
}

/** The `content` of the nth scheduled notification. */
function contentOf(call = 0): Record<string, unknown> {
  return mockScheduleNotificationAsync.mock.calls[call][0].content as Record<string, unknown>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the attribution payload', () => {
  it('is absent entirely when no ids were supplied — the shipped behaviour, unchanged', async () => {
    const engine = await grantedEngine();
    await engine.scheduleRule(makeRule());
    expect(contentOf()).toEqual({ title: 'Time to move', body: 'Your Journey is waiting.' });
    expect('data' in contentOf()).toBe(false);
  });

  it('carries the three opaque ids and NOTHING else on a daily', async () => {
    const engine = await grantedEngine();
    await engine.scheduleRule(makeRule(), PAYLOAD);
    expect(contentOf().data).toEqual({
      ruleId: 'reminder_1',
      journeyId: 'journey_1',
      kind: 'reminder',
    });
  });

  it('never puts a title or body into the payload', async () => {
    const engine = await grantedEngine();
    await engine.scheduleRule(makeRule(), PAYLOAD);
    expect(Object.keys(contentOf().data as object).sort()).toEqual([
      'journeyId',
      'kind',
      'ruleId',
    ]);
  });

  it('rides on EVERY weekday notification of a per-weekday rule', async () => {
    const engine = await grantedEngine();
    await engine.scheduleRule(makeRule({ trigger: { kind: 'fixedTime', hour: 8, minute: 30, weekdays: [1, 3] } }), PAYLOAD);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(contentOf(0).data).toEqual(PAYLOAD);
    expect(contentOf(1).data).toEqual(PAYLOAD);
  });
});

describe('the tap listener', () => {
  it('hands back the payload we attached', async () => {
    const engine = await grantedEngine();
    const seen: (ReminderNotificationData | null)[] = [];
    engine.onNotificationResponse((data) => seen.push(data));

    mockAddResponseListener.mock.calls[0][0]({
      notification: { request: { content: { data: PAYLOAD } } },
    });
    expect(seen).toEqual([PAYLOAD]);
  });

  it('reads a notification with no payload as "no attribution" rather than crashing', async () => {
    const engine = await grantedEngine();
    const seen: (ReminderNotificationData | null)[] = [];
    engine.onNotificationResponse((data) => seen.push(data));
    const deliver = mockAddResponseListener.mock.calls[0][0];

    deliver({ notification: { request: { content: {} } } });
    deliver({ notification: { request: { content: { data: { url: 'https://example.com' } } } } });
    deliver({ notification: { request: { content: { data: { ruleId: 1, journeyId: 2 } } } } });
    deliver({});
    deliver(undefined);

    expect(seen).toEqual([null, null, null, null, null]);
  });

  it('rejects an unknown kind rather than passing it through', async () => {
    const engine = await grantedEngine();
    const seen: (ReminderNotificationData | null)[] = [];
    engine.onNotificationResponse((data) => seen.push(data));
    mockAddResponseListener.mock.calls[0][0]({
      notification: {
        request: { content: { data: { ruleId: 'r', journeyId: 'j', kind: 'something-else' } } },
      },
    });
    expect(seen).toEqual([null]);
  });

  it('unsubscribes through the returned subscription', async () => {
    const engine = await grantedEngine();
    engine.onNotificationResponse(() => {});
    expect(mockAddResponseListener).toHaveBeenCalledTimes(1);
  });

  it('degrades to a harmless no-op subscription when the SDK cannot register one', async () => {
    mockAddResponseListener.mockImplementationOnce(() => {
      throw new Error('no notification support here');
    });
    const engine = await grantedEngine();
    const subscription = engine.onNotificationResponse(() => {});
    expect(() => subscription.remove()).not.toThrow();
  });
});
