/**
 * CommunicationScheduler tests. The pure planner (planSchedule) is exercised
 * directly with an injected clock and hand-built rules/journeys/prefs — no OS, no
 * async. The apply path (reconcile) is exercised through a REAL ReminderEngine with
 * expo-notifications mocked (same pattern as ReminderEngine.test.ts), asserting what
 * the SDK is CALLED with. The dormant calendar/location seams are proven to produce
 * nothing WITHOUT touching a gateway method (red-line R2).
 */

// Mock the SDK before importing anything that loads ReminderEngine.
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
import { MAX_PENDING } from '../../config/schedulerLimits';
import { EventBus } from '../../events/EventBus';
import type { EventOf } from '../../events/events';
import { NullLocationGateway } from '../../location/LocationGateway';
import type { AppState, Journey, ReminderRule, ReminderTrigger, SchedulingPrefs } from '../../types/domain';
import { CommunicationScheduler } from '../CommunicationScheduler';
import { ReminderEngine } from '../ReminderEngine';

// A fixed clock so fire-time maths is deterministic. 2026-07-14 is a Tuesday.
const NOW = new Date(2026, 6, 14, 10, 0, 0);

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'journey_1',
    title: 'Run 5km',
    why: ['because'],
    durationDays: 30,
    rhythm: 'daily',
    steps: [],
    createdAt: 1000,
    ...over,
  };
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

const permissivePrefs = (): SchedulingPrefs => ({
  window: undefined,
  dayPart: 'either',
  preferredDays: [],
});

/** A planner-only scheduler (reconcile/apply never called), with the Null seams. */
function planner(bus = new EventBus()) {
  const engine = new ReminderEngine();
  const scheduler = new CommunicationScheduler(
    bus,
    () => ({}) as AppState,
    engine,
    { location: NullLocationGateway, calendar: NullCalendarGateway },
    () => NOW,
  );
  return { scheduler, bus };
}

beforeEach(() => jest.clearAllMocks());

describe('planSchedule — aggregation', () => {
  it('excludes disabled rules, completed Journeys, and rules with no Journey', () => {
    const { scheduler } = planner();
    const journeys = [
      journey({ id: 'j_active', createdAt: 1 }),
      journey({ id: 'j_done', createdAt: 2, completedAt: 123 }),
    ];
    const rules = [
      rule({ id: 'r_ok', journeyId: 'j_active' }),
      rule({ id: 'r_disabled', journeyId: 'j_active', enabled: false }),
      rule({ id: 'r_done', journeyId: 'j_done' }),
      rule({ id: 'r_orphan', journeyId: 'j_missing' }),
    ];
    const plan = scheduler.planSchedule(rules, journeys, permissivePrefs(), NOW);
    expect(plan.map((p) => p.ruleId)).toEqual(['r_ok']);
  });
});

describe('planSchedule — all-permissive default is a passthrough', () => {
  it('a plain daily stays a single daily notification with the same time', () => {
    const { scheduler } = planner();
    const plan = scheduler.planSchedule([rule()], [journey()], permissivePrefs(), NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ hour: 8, minute: 30, weekday: undefined });
  });

  it('a weekday rule keeps exactly its weekdays and time', () => {
    const { scheduler } = planner();
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 7, minute: 0, weekdays: [1, 3] };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], permissivePrefs(), NOW);
    expect(plan.map((p) => p.weekday).sort()).toEqual([1, 3]);
    plan.forEach((p) => expect(p).toMatchObject({ hour: 7, minute: 0 }));
  });
});

describe('planSchedule — preferredDays HARD filter (D-A)', () => {
  it('fans a plain daily out to the preferred weekdays', () => {
    const { scheduler } = planner();
    const prefs = { ...permissivePrefs(), preferredDays: [1, 3, 5] };
    const plan = scheduler.planSchedule([rule()], [journey()], prefs, NOW);
    expect(plan.map((p) => p.weekday).sort()).toEqual([1, 3, 5]);
  });

  it('intersects a weekday rule with the preferred days', () => {
    const { scheduler } = planner();
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 8, minute: 0, weekdays: [1, 2, 3] };
    const prefs = { ...permissivePrefs(), preferredDays: [3, 5] };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW);
    expect(plan.map((p) => p.weekday)).toEqual([3]);
  });

  it('produces nothing when the intersection is empty', () => {
    const { scheduler } = planner();
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 8, minute: 0, weekdays: [2] };
    const prefs = { ...permissivePrefs(), preferredDays: [4] };
    expect(scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW)).toEqual([]);
  });
});

describe('planSchedule — window / day-part clamp (D-B, never drop)', () => {
  it('clamps an early time up to the morning band start', () => {
    const { scheduler } = planner();
    const prefs = { ...permissivePrefs(), dayPart: 'morning' as const };
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 3, minute: 0 };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW);
    expect(plan[0]).toMatchObject({ hour: 6, minute: 0 });
  });

  it('clamps a late time down to the last allowed minute of a window', () => {
    const { scheduler } = planner();
    const prefs: SchedulingPrefs = {
      window: { start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } },
      dayPart: 'either',
      preferredDays: [],
    };
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 23, minute: 0 };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW);
    expect(plan[0]).toMatchObject({ hour: 16, minute: 59 });
  });

  it('clamps into a cross-midnight window by nearest edge', () => {
    const { scheduler } = planner();
    const prefs: SchedulingPrefs = {
      window: { start: { hour: 22, minute: 0 }, end: { hour: 6, minute: 0 } },
      dayPart: 'either',
      preferredDays: [],
    };
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 12, minute: 0 };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW);
    // 12:00 is nearer the last-allowed edge (05:59) than the start (22:00).
    expect(plan[0]).toMatchObject({ hour: 5, minute: 59 });
  });
});

describe('planSchedule — coalesce duplicates', () => {
  it('merges two rules that resolve to the same weekday+hour+minute', () => {
    const { scheduler } = planner();
    const rules = [
      rule({ id: 'r_a', journeyId: 'j', trigger: { kind: 'fixedTime', hour: 8, minute: 0 } }),
      rule({ id: 'r_b', journeyId: 'j', trigger: { kind: 'fixedTime', hour: 8, minute: 0 } }),
    ];
    const plan = scheduler.planSchedule(rules, [journey({ id: 'j' })], permissivePrefs(), NOW);
    expect(plan).toHaveLength(1);
  });
});

describe('planSchedule — cap to MAX_PENDING by priority', () => {
  it('keeps the highest-priority MAX_PENDING and fires SchedulerCapped for the rest', () => {
    const bus = new EventBus();
    let capped: EventOf<'SchedulerCapped'> | null = null;
    bus.on('SchedulerCapped', (e) => (capped = e));
    const { scheduler } = planner(bus);

    // 65 distinct daily notifications (unique hour/minute so none coalesce). Journey
    // createdAt = index, so the comparator keeps the earliest Journeys first; the 5
    // latest (createdAt 60..64) are the ones dropped.
    const count = MAX_PENDING + 5;
    const journeys: Journey[] = [];
    const rules: ReminderRule[] = [];
    for (let i = 0; i < count; i++) {
      const jid = `j_${i}`;
      journeys.push(journey({ id: jid, createdAt: i }));
      rules.push(
        rule({
          id: `r_${i}`,
          journeyId: jid,
          trigger: { kind: 'fixedTime', hour: Math.floor(i / 60), minute: i % 60 },
        }),
      );
    }
    const plan = scheduler.planSchedule(rules, journeys, permissivePrefs(), NOW);

    expect(plan).toHaveLength(MAX_PENDING);
    expect(capped).not.toBeNull();
    expect(capped!.dropped).toBe(5);
    expect(capped!.ruleIds.sort()).toEqual(['r_60', 'r_61', 'r_62', 'r_63', 'r_64'].sort());
    // The dropped (latest) rules are absent from the kept plan.
    expect(plan.map((p) => p.ruleId)).not.toContain('r_64');
  });

  it('does not fire SchedulerCapped when the set is within the cap', () => {
    const bus = new EventBus();
    const fired = jest.fn();
    bus.on('SchedulerCapped', fired);
    const { scheduler } = planner(bus);
    scheduler.planSchedule([rule()], [journey()], permissivePrefs(), NOW);
    expect(fired).not.toHaveBeenCalled();
  });
});

describe('planSchedule — dormant calendar/location seams (R2)', () => {
  it('calendar trigger produces nothing without touching the gateway method', () => {
    const bus = new EventBus();
    const engine = new ReminderEngine();
    const watchEvents = jest.fn();
    const scheduler = new CommunicationScheduler(
      bus,
      () => ({}) as AppState,
      engine,
      {
        location: NullLocationGateway,
        calendar: { enabled: false, watchEvents, clearWatch: jest.fn() },
      },
      () => NOW,
    );
    const plan = scheduler.planSchedule(
      [rule({ trigger: { kind: 'calendar', minutesBefore: 15 } })],
      [journey()],
      permissivePrefs(),
      NOW,
    );
    expect(plan).toEqual([]);
    expect(watchEvents).not.toHaveBeenCalled();
  });

  it('location trigger produces nothing without touching the gateway method', () => {
    const bus = new EventBus();
    const engine = new ReminderEngine();
    const watchPlace = jest.fn();
    const scheduler = new CommunicationScheduler(
      bus,
      () => ({}) as AppState,
      engine,
      {
        location: { enabled: false, watchPlace, clearPlace: jest.fn() },
        calendar: NullCalendarGateway,
      },
      () => NOW,
    );
    const plan = scheduler.planSchedule(
      [rule({ trigger: { kind: 'location', transition: 'enter' } })],
      [journey()],
      permissivePrefs(),
      NOW,
    );
    expect(plan).toEqual([]);
    expect(watchPlace).not.toHaveBeenCalled();
  });
});

describe('reconcile — apply through the ReminderEngine', () => {
  function stateWith(rules: ReminderRule[], journeys: Journey[]): AppState {
    return {
      dreams: [],
      journeys,
      buddy: { name: 'Pip', xp: 0, level: 1, stage: 'egg', coins: 0, ownedCosmetics: [], equippedCosmetic: null },
      checkIns: [],
      missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
      login: { lastClaimedKey: null, dayIndex: 0 },
      reminderRules: rules,
      communicationPrefs: {
        remindersEnabled: true,
        socialCheerEnabled: true,
        socialNudgeEnabled: true,
        locationOptIn: false,
        calendarOptIn: false,
      },
      schedulingPrefs: permissivePrefs(),
    };
  }

  it('schedules the planned set, then tears it down and rebuilds on the next reconcile', async () => {
    const engine = new ReminderEngine();
    await engine.init(); // permission granted via the mock
    let state = stateWith([rule()], [journey()]);
    const scheduler = new CommunicationScheduler(
      new EventBus(),
      () => state,
      engine,
      { location: NullLocationGateway, calendar: NullCalendarGateway },
      () => NOW,
    );

    await scheduler.reconcile();
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const arg = mockScheduleNotificationAsync.mock.calls[0][0] as any;
    expect(arg.trigger).toMatchObject({ type: 'daily', hour: 8, minute: 30 });

    // Remove the rule and reconcile again: the previously-owned id is cancelled and
    // nothing new is scheduled.
    jest.clearAllMocks();
    state = stateWith([], []);
    await scheduler.reconcile();
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
