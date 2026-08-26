/**
 * CommunicationScheduler — the ADAPTIVE AGGREGATE (Smart_Notification_Timing_PRD §3, founder's
 * decisions of 2026-08-26).
 *
 * The two claims the whole feature rests on are the first two tests here, because they are the two
 * ways it could quietly betray the person using it: three Journeys have to become ONE send (or the
 * feature built to make the app quieter made it louder), and a reminder somebody set BY HAND has to
 * fire at the time they set it (or the app overruled an explicit instruction to keep a count tidy).
 *
 * Planner-only: pure `planSchedule` with an injected clock, no OS. The copy builder here is a stub
 * that returns fixed strings — its presence is what enables the aggregate, and what it SAYS is the
 * business of the aggregateCopy tests.
 */
import { NullCalendarGateway } from '../../calendar/CalendarGateway';
import { EventBus } from '../../events/EventBus';
import { NullLocationGateway } from '../../location/LocationGateway';
import type { AggregateCopyBuilder } from '../../notify/aggregateCopy';
import type { AppState, Journey, ReminderRule, SchedulingPrefs, Step } from '../../types/domain';
import { CommunicationScheduler } from '../CommunicationScheduler';
import type { ReminderEngine } from '../ReminderEngine';

// 2026-07-14 is a Tuesday.
const NOW = new Date(2026, 6, 14, 10, 0, 0);

const prefs: SchedulingPrefs = { window: undefined, dayPart: 'either', preferredDays: [] };

const pendingStep = (id: string): Step => ({
  id,
  title: 'A Step',
  isStarterStep: false,
  cadence: 'once',
  done: false,
});

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'journey_1',
    title: 'Run 5km',
    why: ['because'],
    durationDays: 30,
    rhythm: 'daily',
    steps: [pendingStep('step_1')],
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

const stubCopy: AggregateCopyBuilder = ({ journeys }) => ({
  title: 'Aggregate',
  body: journeys.map((j) => j.journeyTitle).join(', '),
});

/**
 * A planner-only scheduler. Passing `null` reproduces a build with no aggregate copy builder — i.e.
 * exactly what this scheduler did before the feature existed.
 */
function planner(aggregateCopy: AggregateCopyBuilder | null = stubCopy) {
  return new CommunicationScheduler(
    new EventBus(),
    () => ({}) as AppState,
    {} as ReminderEngine,
    { location: NullLocationGateway, calendar: NullCalendarGateway },
    () => NOW,
    undefined,
    aggregateCopy ?? undefined,
  );
}

/** Three smart Journeys, each with a pending Step, at 08:00 / 08:30 / 09:15. */
function threeSmart() {
  const journeys = [
    journey({ id: 'j1', title: 'Run 5km', createdAt: 1 }),
    journey({ id: 'j2', title: 'Read', createdAt: 2 }),
    journey({ id: 'j3', title: 'Call Dad', createdAt: 3 }),
  ];
  const rules = [
    rule({ id: 'r1', journeyId: 'j1', mode: 'smart', trigger: { kind: 'fixedTime', hour: 8, minute: 0 } }),
    rule({ id: 'r2', journeyId: 'j2', mode: 'smart', trigger: { kind: 'fixedTime', hour: 8, minute: 30 } }),
    rule({ id: 'r3', journeyId: 'j3', mode: 'smart', trigger: { kind: 'fixedTime', hour: 9, minute: 15 } }),
  ];
  return { journeys, rules };
}

describe('planSchedule — the adaptive aggregate', () => {
  it('turns three smart Journeys into ONE send, at the earliest of their times', () => {
    const { journeys, rules } = threeSmart();
    const plan = planner().planSchedule(rules, journeys, prefs, NOW);

    expect(plan).toHaveLength(1);
    const [send] = plan;
    expect(send.hour).toBe(8);
    expect(send.minute).toBe(0);
    expect(send.aggregate?.ruleIds).toEqual(['r1', 'r2', 'r3']);
    expect(send.aggregate?.journeys.map((j) => j.journeyTitle)).toEqual(['Run 5km', 'Read', 'Call Dad']);
    // One pending Step in each of the three Journeys.
    expect(send.aggregate?.pendingStepCount).toBe(3);
    // The rules it replaces produce nothing of their own — that is what "replaces" means.
    expect(plan.filter((p) => !p.aggregate)).toEqual([]);
  });

  it('still fires a reminder the user set BY HAND, on the same day, at their time', () => {
    const { journeys, rules } = threeSmart();
    const fixedJourney = journey({ id: 'j_fixed', title: 'Meditate', createdAt: 4 });
    const fixedRule = rule({
      id: 'r_fixed',
      journeyId: 'j_fixed',
      mode: 'fixed',
      trigger: { kind: 'fixedTime', hour: 8, minute: 0 },
    });

    const plan = planner().planSchedule(
      [...rules, fixedRule],
      [...journeys, fixedJourney],
      prefs,
      NOW,
    );

    const byHand = plan.find((p) => p.ruleId === 'r_fixed');
    expect(byHand).toBeDefined();
    expect(byHand?.hour).toBe(8);
    expect(byHand?.minute).toBe(0);
    expect(byHand?.aggregate).toBeUndefined();
    // It shares the exact minute with the aggregate and survives anyway: an aggregate must never
    // coalesce away an instruction a person gave.
    expect(plan.filter((p) => p.aggregate)).toHaveLength(1);
  });

  it('opens a SECOND send only when a Journey sits three hours away', () => {
    const journeys = [
      journey({ id: 'j_morning', title: 'Run', createdAt: 1 }),
      journey({ id: 'j_evening', title: 'Journal', createdAt: 2 }),
    ];
    const rules = [
      rule({ id: 'r_m', journeyId: 'j_morning', mode: 'smart', trigger: { kind: 'fixedTime', hour: 8, minute: 0 } }),
      rule({ id: 'r_e', journeyId: 'j_evening', mode: 'smart', trigger: { kind: 'fixedTime', hour: 21, minute: 0 } }),
    ];

    const plan = planner().planSchedule(rules, journeys, prefs, NOW);
    expect(plan).toHaveLength(2);
    expect(plan.map((p) => p.hour).sort((a, b) => a - b)).toEqual([8, 21]);
  });

  it('leaves a Journey with nothing pending out of the send', () => {
    const journeys = [
      journey({ id: 'j1', title: 'Run 5km', createdAt: 1 }),
      journey({ id: 'j_done', title: 'Finished', createdAt: 2, steps: [{ ...pendingStep('s'), done: true }] }),
    ];
    const rules = [
      rule({ id: 'r1', journeyId: 'j1', mode: 'smart' }),
      rule({ id: 'r_done', journeyId: 'j_done', mode: 'smart' }),
    ];

    const plan = planner().planSchedule(rules, journeys, prefs, NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0].aggregate?.journeys.map((j) => j.journeyId)).toEqual(['j1']);
  });

  it('plans nothing at all when every smart Journey is finished for now', () => {
    const j = journey({ id: 'j1', steps: [{ ...pendingStep('s'), done: true }] });
    const plan = planner().planSchedule([rule({ id: 'r1', journeyId: 'j1', mode: 'smart' })], [j], prefs, NOW);
    expect(plan).toEqual([]);
  });

  it('without an injected copy builder, a smart rule behaves exactly like a fixed one', () => {
    const { journeys, rules } = threeSmart();
    const plan = planner(null).planSchedule(rules, journeys, prefs, NOW);

    expect(plan).toHaveLength(3);
    expect(plan.every((p) => !p.aggregate)).toBe(true);
    expect(plan.map((p) => p.ruleId).sort()).toEqual(['r1', 'r2', 'r3']);
  });

  it('honours the days the user is reachable, and groups per real weekday', () => {
    const journeys = [
      journey({ id: 'j1', title: 'Run', createdAt: 1 }),
      journey({ id: 'j2', title: 'Read', createdAt: 2 }),
    ];
    const rules = [
      // One daily, one Mondays-only: the daily must fan out so Monday still carries ONE send.
      rule({ id: 'r1', journeyId: 'j1', mode: 'smart', trigger: { kind: 'fixedTime', hour: 8, minute: 0 } }),
      rule({
        id: 'r2',
        journeyId: 'j2',
        mode: 'smart',
        trigger: { kind: 'fixedTime', hour: 8, minute: 30, weekdays: [1] },
      }),
    ];

    const plan = planner().planSchedule(rules, journeys, prefs, NOW);
    const monday = plan.filter((p) => p.weekday === 1);
    expect(monday).toHaveLength(1);
    expect(monday[0].aggregate?.ruleIds).toEqual(['r1', 'r2']);
    // Every other weekday carries the daily Journey alone, and there is no un-dayed daily left over.
    expect(plan).toHaveLength(7);
    expect(plan.every((p) => p.weekday !== undefined)).toBe(true);
  });

  it('marks the send as an aggregate in its attribution payload', () => {
    const { journeys, rules } = threeSmart();
    const [send] = planner().planSchedule(rules, journeys, prefs, NOW);
    expect(send.data?.kind).toBe('aggregate');
  });
});
