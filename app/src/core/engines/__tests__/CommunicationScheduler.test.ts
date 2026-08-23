/**
 * CommunicationScheduler tests. The pure planner (planSchedule) is exercised
 * directly with an injected clock and hand-built rules/journeys/prefs — no OS, no
 * async. The apply path (reconcile) is exercised through a REAL ReminderEngine with
 * expo-notifications mocked (same pattern as ReminderEngine.test.ts), asserting what
 * the SDK is CALLED with. The dormant calendar/location seams are proven to produce
 * nothing WITHOUT touching a gateway method (red-line R2).
 */

// Mock the SDK before importing anything that loads ReminderEngine.
//
// The mock keeps a real PENDING LIST, because the scheduler's teardown now goes through the OS
// (`getAllScheduledNotificationsAsync`) rather than through ids it remembered — which is the fix
// for the duplicate reminders on the founder's phone (2026-08-23). A mock that forgot what it
// scheduled could not tell a working sweep from a broken one.
const pendingNotifications: { identifier: string; trigger: unknown }[] = [];

const mockScheduleNotificationAsync = jest.fn(
  async (req: { content: unknown; trigger: unknown }) => {
    const identifier = `notif_${pendingNotifications.length}_${Math.random().toString(36).slice(2)}`;
    pendingNotifications.push({ identifier, trigger: req.trigger });
    return identifier;
  },
);
const mockGetAllScheduledNotificationsAsync = jest.fn(async () => [...pendingNotifications]);
const mockCancelScheduledNotificationAsync = jest.fn(async (id: string) => {
  const index = pendingNotifications.findIndex((n) => n.identifier === id);
  if (index >= 0) pendingNotifications.splice(index, 1);
});
const mockCancelAllScheduledNotificationsAsync = jest.fn(async () => {});
const mockGetPermissionsAsync = jest.fn(async () => ({ granted: true }));
const mockRequestPermissionsAsync = jest.fn(async () => ({ granted: true }));
const mockSetNotificationHandler = jest.fn();

// The reconcile block exercises the REAL copy builder (style → i18n key → delivered content), and
// i18n boots off expo-localization, which has no JS impl under jest. Pin it to English so the
// asserted strings are deterministic. The planner tests below touch none of this.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  getAllScheduledNotificationsAsync: () => mockGetAllScheduledNotificationsAsync(),
  setNotificationHandler: (arg: unknown) => mockSetNotificationHandler(arg),
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  scheduleNotificationAsync: (req: { content: unknown; trigger: unknown }) =>
    mockScheduleNotificationAsync(req),
  cancelScheduledNotificationAsync: (id: string) => mockCancelScheduledNotificationAsync(id),
  cancelAllScheduledNotificationsAsync: () => mockCancelAllScheduledNotificationsAsync(),
}));

import { NullCalendarGateway } from '../../calendar/CalendarGateway';
import {
  DEFAULT_COMMUNICATION_PROFILE,
  setCommunicationProfile,
} from '../../communication/communicationProfile';
import { MAX_PENDING } from '../../config/schedulerLimits';
import { EventBus } from '../../events/EventBus';
import type { EventOf } from '../../events/events';
import { NullLocationGateway } from '../../location/LocationGateway';
import { buildReminderCopy, type ReminderCopyBuilder } from '../../notify/reminderCopy';
import type {
  ActiveHours,
  AllowedWindow,
  AppState,
  Journey,
  ReminderRule,
  ReminderTrigger,
  SchedulingPrefs,
  Step,
} from '../../types/domain';
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

beforeEach(() => {
  jest.clearAllMocks();
  pendingNotifications.length = 0;
});

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

  it('excludes a FROZEN (paused) Journey — no reminders fire until it is resumed (J3)', () => {
    const { scheduler } = planner();
    const journeys = [
      journey({ id: 'j_active', createdAt: 1, status: 'active' }),
      journey({ id: 'j_frozen', createdAt: 2, status: 'frozen' }),
    ];
    const rules = [
      rule({ id: 'r_active', journeyId: 'j_active' }),
      rule({ id: 'r_frozen', journeyId: 'j_frozen' }),
    ];
    const plan = scheduler.planSchedule(rules, journeys, permissivePrefs(), NOW);
    expect(plan.map((p) => p.ruleId)).toEqual(['r_active']);
  });

  it('excludes a FUTURE Journey — an approved plan saved for later fires nothing before it starts', () => {
    // Future Journey Management §5/§14.4: the reminders are already saved with the plan, but a
    // Future Journey produces NO obligations until its one activation transition runs.
    const { scheduler } = planner();
    const journeys = [
      journey({ id: 'j_active', createdAt: 1, status: 'active' }),
      journey({ id: 'j_future', createdAt: 2, status: 'future', startsAt: NOW.getTime() + 86_400_000 }),
    ];
    const rules = [
      rule({ id: 'r_active', journeyId: 'j_active' }),
      rule({ id: 'r_future', journeyId: 'j_future' }),
    ];
    const plan = scheduler.planSchedule(rules, journeys, permissivePrefs(), NOW);
    expect(plan.map((p) => p.ruleId)).toEqual(['r_active']);
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

describe('planSchedule — per-day Active Hours (D40, clamp not disable)', () => {
  const win = (sh: number, sm: number, eh: number, em: number): AllowedWindow => ({
    start: { hour: sh, minute: sm },
    end: { hour: eh, minute: em },
  });
  const shared = (w: AllowedWindow): ActiveHours => ({
    mode: 'shared',
    days: Array.from({ length: 7 }, () => ({ enabled: true, window: w })),
  });

  it('a shared window keeps a plain daily as ONE daily, clamped into the window', () => {
    const { scheduler } = planner();
    const prefs: SchedulingPrefs = { ...permissivePrefs(), activeHours: shared(win(9, 0, 17, 0)) };
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 23, minute: 0 };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ hour: 16, minute: 59, weekday: undefined });
  });

  it('a per-day setting fans a daily out to seven weekdays, each clamped into ITS window', () => {
    const { scheduler } = planner();
    const hours = shared(win(9, 0, 17, 0));
    hours.mode = 'perDay';
    hours.days[3] = { enabled: true, window: win(6, 0, 8, 0) }; // Wednesday: early window
    const prefs: SchedulingPrefs = { ...permissivePrefs(), activeHours: hours };
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 12, minute: 0 };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW);
    expect(plan).toHaveLength(7);
    const wed = plan.find((p) => p.weekday === 3)!;
    expect(wed).toMatchObject({ hour: 7, minute: 59 }); // clamped down to Wed's 06:00–08:00
    const mon = plan.find((p) => p.weekday === 1)!;
    expect(mon).toMatchObject({ hour: 12, minute: 0 }); // inside Mon's 09:00–17:00, unchanged
  });

  it('drops a disabled day from a daily fan-out (no candidate that weekday)', () => {
    const { scheduler } = planner();
    const hours = shared(win(9, 0, 17, 0));
    hours.mode = 'perDay';
    hours.days[0] = { enabled: false, window: win(9, 0, 17, 0) }; // Sunday off
    const prefs: SchedulingPrefs = { ...permissivePrefs(), activeHours: hours };
    const plan = scheduler.planSchedule([rule()], [journey()], prefs, NOW);
    expect(plan.map((p) => p.weekday).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('clamps into a per-day cross-midnight window by nearest edge', () => {
    const { scheduler } = planner();
    const hours = shared(win(22, 0, 6, 0));
    const prefs: SchedulingPrefs = { ...permissivePrefs(), activeHours: hours };
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 12, minute: 0 };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW);
    // Shared + uniform ⇒ stays a single daily; 12:00 is nearer 05:59 than 22:00.
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ hour: 5, minute: 59, weekday: undefined });
  });

  it('produces nothing when every day is disabled (all-quiet)', () => {
    const { scheduler } = planner();
    const hours = shared(win(9, 0, 17, 0));
    hours.mode = 'perDay';
    for (let d = 0; d < 7; d++) hours.days[d] = { enabled: false, window: win(9, 0, 17, 0) };
    const prefs: SchedulingPrefs = { ...permissivePrefs(), activeHours: hours };
    expect(scheduler.planSchedule([rule()], [journey()], prefs, NOW)).toEqual([]);
  });

  it('a weekday rule keeps only its enabled days under per-day Active Hours', () => {
    const { scheduler } = planner();
    const hours = shared(win(9, 0, 17, 0));
    hours.mode = 'perDay';
    hours.days[3] = { enabled: false, window: win(9, 0, 17, 0) }; // Wednesday off
    const prefs: SchedulingPrefs = { ...permissivePrefs(), activeHours: hours };
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 10, minute: 0, weekdays: [1, 3, 5] };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW);
    expect(plan.map((p) => p.weekday).sort()).toEqual([1, 5]);
  });

  it('coalesces a daily to ONE daily when per-day windows all contain the requested time', () => {
    const { scheduler } = planner();
    // Per-day windows DIFFER (so isDayUniform is false ⇒ the fan-out path runs), but
    // every one contains 12:00, so all seven weekdays clamp to the same time.
    const hours: ActiveHours = {
      mode: 'perDay',
      days: Array.from({ length: 7 }, (_, d) => ({
        enabled: true,
        window: d % 2 === 0 ? win(8, 0, 18, 0) : win(9, 0, 17, 0),
      })),
    };
    const prefs: SchedulingPrefs = { ...permissivePrefs(), activeHours: hours };
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 12, minute: 0 };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ hour: 12, minute: 0, weekday: undefined });
  });

  it('does NOT collapse to a daily when one day is disabled (stays weekly on the rest)', () => {
    const { scheduler } = planner();
    const hours = shared(win(8, 0, 18, 0));
    hours.mode = 'perDay';
    hours.days[6] = { enabled: false, window: win(8, 0, 18, 0) }; // Saturday off
    const prefs: SchedulingPrefs = { ...permissivePrefs(), activeHours: hours };
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 12, minute: 0 };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW);
    expect(plan).toHaveLength(6);
    expect(plan.every((p) => p.weekday !== undefined)).toBe(true);
    expect(plan.map((p) => p.weekday).sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('activeHours is authoritative over a stale legacy window', () => {
    const { scheduler } = planner();
    const prefs: SchedulingPrefs = {
      ...permissivePrefs(),
      window: win(0, 0, 1, 0), // stale narrow legacy window …
      activeHours: shared({ start: { hour: 0, minute: 0 }, end: { hour: 0, minute: 0 } }), // all-day
    };
    const t: ReminderTrigger = { kind: 'fixedTime', hour: 14, minute: 0 };
    const plan = scheduler.planSchedule([rule({ trigger: t })], [journey()], prefs, NOW);
    expect(plan[0]).toMatchObject({ hour: 14, minute: 0 }); // not clamped to the legacy window
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

describe('planSchedule — Miss-Recovery location constraint gate (permissive)', () => {
  const homeStep = (done = false): Step => ({
    id: `step_${done ? 'done' : 'pending'}`,
    title: 'Home workout',
    isStarterStep: false,
    cadence: 'once',
    done,
    constraints: [{ kind: 'location', place: 'home' }],
  });

  /** A scheduler whose location gateway concretely reports the given place. */
  function schedulerAt(place: 'home' | 'away' | 'unknown') {
    return new CommunicationScheduler(
      new EventBus(),
      () => ({}) as AppState,
      new ReminderEngine(),
      {
        location: { ...NullLocationGateway, currentPlace: () => place },
        calendar: NullCalendarGateway,
      },
      () => NOW,
    );
  }

  it('suppresses a Journey whose every pending Step is home-only while away', () => {
    const j = journey({ steps: [homeStep()] });
    const plan = schedulerAt('away').planSchedule([rule()], [j], permissivePrefs(), NOW);
    expect(plan).toEqual([]);
  });

  it('keeps the reminder when home (permissive)', () => {
    const j = journey({ steps: [homeStep()] });
    const plan = schedulerAt('home').planSchedule([rule()], [j], permissivePrefs(), NOW);
    expect(plan).toHaveLength(1);
  });

  it('keeps the reminder on an unknown location signal (real Null-gateway default)', () => {
    const j = journey({ steps: [homeStep()] });
    const plan = schedulerAt('unknown').planSchedule([rule()], [j], permissivePrefs(), NOW);
    expect(plan).toHaveLength(1);
  });

  it('keeps the reminder while away when a pending Step is doable away', () => {
    const anywhere: Step = { ...homeStep(), id: 'step_anywhere', constraints: [] };
    const j = journey({ steps: [homeStep(), anywhere] });
    const plan = schedulerAt('away').planSchedule([rule()], [j], permissivePrefs(), NOW);
    expect(plan).toHaveLength(1);
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

  /**
   * The bug this pair exists to keep fixed (founder's phone, 2026-08-23): three identical reminders
   * arriving at once. Each cold start built a NEW scheduler whose list of owned ids began empty, so
   * the teardown cancelled nothing and the rebuild scheduled a second copy of the same daily — then
   * a third the next morning. The teardown now sweeps the OS instead of trusting our own memory.
   */
  function coldStart(getState: () => AppState) {
    const engine = new ReminderEngine();
    return new CommunicationScheduler(
      new EventBus(),
      getState,
      engine,
      { location: NullLocationGateway, calendar: NullCalendarGateway },
      () => NOW,
    );
  }

  it('does not add a second copy of the same reminder on the next cold start', async () => {
    const state = stateWith([rule()], [journey()]);

    for (const _launch of [1, 2, 3]) {
      const scheduler = coldStart(() => state);
      await scheduler.reconcile();
    }

    // One rule, one pending notification — not one per launch.
    expect(pendingNotifications).toHaveLength(1);
  });

  it('leaves a one-shot notification alone — that is somebody’s postponed Step', async () => {
    // The shape `scheduleOneShot` produces (D37): a DATE trigger that does not repeat.
    pendingNotifications.push({ identifier: 'one_shot', trigger: { type: 'date', repeats: false } });
    const state = stateWith([rule()], [journey()]);

    await coldStart(() => state).reconcile();

    expect(pendingNotifications.some((n) => n.identifier === 'one_shot')).toBe(true);
  });

  /**
   * The copy seam (Communication_Style_Profile_PRD §10/AC#4). Copy is resolved HERE, at apply time,
   * from an injected builder — never planned, never baked at rule-creation time — so a language,
   * form-of-address or style change reaches reminders that are already scheduled.
   */
  describe('reminder copy resolution', () => {
    /**
     * Since smart timing was switched on (2026-08-24) the scheduled content also carries an
     * attribution payload, so these assert the COPY rather than the whole object — and this one
     * guards what the payload may contain, which is the part that matters: ids, never words.
     */
    it('attaches ids only — never a title, a body or anything the user wrote', async () => {
      const scheduler = await reconcilerWith(({ journeyId, journeyTitle }) => ({
        title: `resolved:${journeyTitle}`,
        body: `resolved:${journeyId}`,
      }));
      await scheduler.reconcile();
      const data = (scheduledContent() as { data?: Record<string, unknown> }).data;
      expect(data).toBeDefined();
      expect(Object.keys(data!).sort()).toEqual(['journeyId', 'kind', 'ruleId']);
      expect(JSON.stringify(data)).not.toContain('Run 5km');
      expect(JSON.stringify(data)).not.toContain('resolved:');
    });

    /** A ready scheduler over one rule + its Journey, optionally given a copy builder. */
    async function reconcilerWith(buildCopy?: ReminderCopyBuilder) {
      const engine = new ReminderEngine();
      await engine.init(); // permission granted via the mock
      const state = stateWith([rule()], [journey()]);
      const scheduler = new CommunicationScheduler(
        new EventBus(),
        () => state,
        engine,
        { location: NullLocationGateway, calendar: NullCalendarGateway },
        () => NOW,
        buildCopy,
      );
      return scheduler;
    }

    /** The `content` the SDK was asked to schedule on the Nth (default first) call. */
    function scheduledContent(call = 0): { title: string; body: string } {
      const arg = mockScheduleNotificationAsync.mock.calls[call][0] as {
        content: { title: string; body: string };
      };
      return arg.content;
    }

    afterEach(() => setCommunicationProfile(DEFAULT_COMMUNICATION_PROFILE));

    it('schedules the BUILDER’s copy, not the copy baked on the rule', async () => {
      const scheduler = await reconcilerWith(({ journeyId, journeyTitle }) => ({
        title: `resolved:${journeyTitle}`,
        body: `resolved:${journeyId}`,
      }));

      await scheduler.reconcile();
      expect(scheduledContent()).toMatchObject({
        title: 'resolved:Run 5km',
        body: 'resolved:journey_1',
      });
    });

    it('falls back to the baked copy when no builder is injected (today’s behaviour)', async () => {
      const scheduler = await reconcilerWith();
      await scheduler.reconcile();
      // Byte-identical to what the shipped app sends: the rule's own title/body.
      expect(scheduledContent()).toMatchObject({
        title: 'Time to move',
        body: 'Your Journey is waiting.',
      });
    });

    it('falls back to the baked copy when the builder returns null', async () => {
      const scheduler = await reconcilerWith(() => null);
      await expect(scheduler.reconcile()).resolves.toBeUndefined();
      expect(scheduledContent()).toMatchObject({
        title: 'Time to move',
        body: 'Your Journey is waiting.',
      });
    });

    it('falls back to the baked copy when the builder throws, without aborting reconcile', async () => {
      const scheduler = await reconcilerWith(() => {
        throw new Error('copy exploded');
      });
      await expect(scheduler.reconcile()).resolves.toBeUndefined();
      expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
      expect(scheduledContent()).toMatchObject({
        title: 'Time to move',
        body: 'Your Journey is waiting.',
      });
    });

    it('delivers the Journey title through the REAL builder, styled by the current profile', async () => {
      const scheduler = await reconcilerWith(buildReminderCopy);

      setCommunicationProfile('direct');
      await scheduler.reconcile();
      const direct = scheduledContent();

      // Same rule, same plan — only the module-level style changed between the two reconciles.
      jest.clearAllMocks();
      setCommunicationProfile('warm');
      await scheduler.reconcile();
      const warm = scheduledContent();

      expect(direct.title).toBe('Run 5km is next');
      expect(warm.title).toBe('A little reminder for Run 5km');
      expect(direct.body).not.toBe(warm.body);
      // The Journey title reaches the lock screen (as it always has); the Step title does not.
      for (const content of [direct, warm]) {
        expect(content.title).toContain('Run 5km');
        expect(content.title).not.toContain('{{');
        expect(content.body).not.toContain('{{');
      }
    });
  });
});
