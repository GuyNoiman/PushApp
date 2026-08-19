/**
 * The week-by-day derivation. Most of these tests are about the ONE rule that is easy to get subtly
 * wrong and impossible to see afterwards: what happens to a Step that was not done.
 *
 * The founder's own case is the third test, and it is the reason the rule has two conditions rather
 * than one: three workouts a week, today already has a workout, so yesterday's does not jump onto
 * today and ask to be done twice.
 */
import { STREAK_CONFIG } from '../../config/streak';
import type { TodayStep } from '../../engines/JourneyEngine';
import type { Journey, Step } from '../../types/domain';
import { startOfLocalDay } from '../date';
import { setWeekStartDay } from '../week';
import { buildWeekByDay, pullForwardCandidates } from '../weekByDay';

const DAY = 24 * 60 * 60 * 1000;
// A Wednesday, mid-morning, in a week that starts on Sunday — so there are days on both sides.
const NOW = new Date(2026, 7, 19, 10, 0, 0).getTime();
const TODAY = startOfLocalDay(NOW);

beforeAll(() => setWeekStartDay(0));

function step(over: Partial<Step> = {}): Step {
  return {
    id: over.id ?? 's1',
    title: 'Do the thing',
    isStarterStep: false,
    cadence: 'weekly',
    done: false,
    ...over,
  };
}

function todayStep(over: Partial<Step>, journeyId = 'j1', extra: Partial<TodayStep> = {}): TodayStep {
  return {
    journeyId,
    journeyTitle: 'Get stronger',
    step: step({ ...over, id: over.id ?? `${journeyId}-${over.plannedFor ?? 'x'}` }),
    status: 'unreported',
    locked: false,
    ...extra,
  };
}

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    title: 'Get stronger',
    description: '',
    why: [],
    createdAt: NOW - 10 * DAY,
    durationDays: 60,
    rhythm: 'few-times-week',
    steps: [],
    ...over,
  } as Journey;
}

const build = (steps: TodayStep[], journeys: Journey[] = [journey()]) =>
  buildWeekByDay(steps, journeys, NOW, STREAK_CONFIG);

describe('the seven days', () => {
  it('is always seven days of the CURRENT week, with today among them', () => {
    const week = build([]);
    expect(week.days).toHaveLength(7);
    expect(week.days[week.todayIndex].isToday).toBe(true);
    expect(week.days.filter((d) => d.isPast)).toHaveLength(week.todayIndex);
  });

  it('marks a day empty, open or done — and empty is a real answer, not a missing one', () => {
    const week = build([
      todayStep({ plannedFor: TODAY + DAY }),
      todayStep({ plannedFor: TODAY + 2 * DAY, done: true, lastCheckInAt: TODAY + 2 * DAY }),
    ]);
    const tomorrow = week.days[week.todayIndex + 1];
    const after = week.days[week.todayIndex + 2];
    expect(tomorrow.mark).toBe('open');
    expect(after.mark).toBe('done');
    expect(week.days[week.todayIndex].mark).toBe('empty');
  });

  it('puts an undated Step (a frequency-based plan) on today, the only day it can be acted on', () => {
    const week = build([todayStep({})]);
    expect(week.days[week.todayIndex].steps).toHaveLength(1);
  });

  it('ignores a Step planned outside this week', () => {
    const week = build([todayStep({ plannedFor: TODAY + 20 * DAY })]);
    expect(week.days.every((d) => d.steps.length === 0)).toBe(true);
  });
});

describe('a Step that was not done', () => {
  it('travels to the next day when it was only recommended and that day is free', () => {
    const week = build([todayStep({ plannedFor: TODAY - DAY })]);
    const today = week.days[week.todayIndex];
    expect(today.steps).toHaveLength(1);
    expect(today.steps[0].carriedFrom).toBe(TODAY - DAY);
    expect(today.steps[0].missed).toBe(false);
    expect(week.days[week.todayIndex - 1].steps).toHaveLength(0);
  });

  it("does NOT travel onto a day that already has a Step of the same Journey — the founder's case", () => {
    // Three workouts a week; today already carries one; yesterday's must not land on top of it.
    const week = build([
      todayStep({ id: 'yesterday', plannedFor: TODAY - DAY }),
      todayStep({ id: 'today', plannedFor: TODAY }),
    ]);
    const yesterday = week.days[week.todayIndex - 1];
    expect(yesterday.steps).toHaveLength(1);
    expect(yesterday.steps[0].missed).toBe(true);
    expect(week.days[week.todayIndex].steps).toHaveLength(1);
  });

  it('does NOT travel when its Journey was already binding — a real miss stays a real miss', () => {
    // The founder's ruling, in his words: a Step travels because it was "recommended and not yet
    // required". A DAILY Journey on Wednesday needs seven sessions with four days left, so it is
    // binding — and a binding Step that was missed must not quietly reappear tomorrow as if nothing
    // had happened, because the streak rule has already reacted to it.
    const binding = journey({ rhythm: 'daily' });
    const week = build([todayStep({ plannedFor: TODAY - DAY })], [binding]);
    expect(week.days[week.todayIndex].steps).toHaveLength(0);
    expect(week.days[week.todayIndex - 1].steps[0].missed).toBe(true);
  });

  it('travels when the Journey has already met the week s target — nothing is at stake', () => {
    // `few-times-week` asks for three and three are done, so the week has all the slack there is:
    // the Step is recommended, missing it costs nothing, and it simply moves on.
    const done = (id: string) => step({ id, done: true, lastCheckInAt: TODAY - DAY });
    const met = journey({ steps: [done('a'), done('b'), done('c')] });
    const week = build([todayStep({ plannedFor: TODAY - DAY })], [met]);
    expect(week.days[week.todayIndex].steps).toHaveLength(1);
    expect(week.days[week.todayIndex].steps[0].carriedFrom).toBe(TODAY - DAY);
  });

  it('is not treated as missed once it was REPORTED — an answered Step stays on its own day', () => {
    const week = build([
      todayStep({ plannedFor: TODAY - DAY }, 'j1', { status: 'not_completed' }),
    ]);
    const yesterday = week.days[week.todayIndex - 1];
    expect(yesterday.steps).toHaveLength(1);
    expect(yesterday.steps[0].missed).toBe(false);
    expect(week.days[week.todayIndex].steps).toHaveLength(0);
  });

  it('walks forward day by day, and stops at the first day that is blocked', () => {
    // Monday's Step is missed; Tuesday already carries one of the same Journey; so Monday's stops
    // on Monday rather than appearing today.
    const week = build([
      todayStep({ id: 'mon', plannedFor: TODAY - 2 * DAY }),
      todayStep({ id: 'tue', plannedFor: TODAY - DAY }),
    ]);
    expect(week.days[week.todayIndex - 2].steps[0].missed).toBe(true);
    // Tuesday's own Step still travels to today, which is free.
    expect(week.days[week.todayIndex].steps.map((s) => s.item.step.id)).toEqual(['tue']);
  });
});

describe('a Step that was done', () => {
  it('stays on the day it was PLANNED for, and says when it actually happened', () => {
    const week = build([
      todayStep({ plannedFor: TODAY + 2 * DAY, done: true, lastCheckInAt: NOW }),
    ]);
    const planned = week.days[week.todayIndex + 2];
    expect(planned.steps[0].doneOn).toBe(TODAY);
    expect(planned.mark).toBe('done');
    // The day it was done on does NOT gain a copy: the plan is the record of what was planned.
    expect(week.days[week.todayIndex].steps).toHaveLength(0);
  });

  it('says nothing about the day when it was done on the day it was planned for', () => {
    const week = build([todayStep({ plannedFor: TODAY, done: true, lastCheckInAt: NOW })]);
    expect(week.days[week.todayIndex].steps[0].doneOn).toBeUndefined();
  });
});

describe('what can be pulled forward', () => {
  const steps = [
    todayStep({ id: 'a', plannedFor: TODAY + DAY }),
    todayStep({ id: 'b', plannedFor: TODAY + 2 * DAY }),
    todayStep({ id: 'c', plannedFor: TODAY + 3 * DAY }),
    todayStep({ id: 'd', plannedFor: TODAY + 4 * DAY }),
  ];

  it('offers later Steps, soonest first, and never more than the limit', () => {
    expect(pullForwardCandidates(steps, TODAY).map((s) => s.step.id)).toEqual(['a', 'b', 'c']);
  });

  it('never offers a missed Step as an optional extra — the carry rule already handles it', () => {
    const withPast = [...steps, todayStep({ id: 'past', plannedFor: TODAY - DAY })];
    expect(pullForwardCandidates(withPast, TODAY).map((s) => s.step.id)).not.toContain('past');
  });

  it('never offers a Step the user cannot do yet, or one already done', () => {
    const blocked = [
      todayStep({ id: 'locked', plannedFor: TODAY + DAY }, 'j1', { locked: true }),
      todayStep({ id: 'done', plannedFor: TODAY + DAY, done: true }),
      todayStep({ id: 'dropped', plannedFor: TODAY + DAY, dropped: true }),
      todayStep({ id: 'ok', plannedFor: TODAY + DAY }),
    ];
    expect(pullForwardCandidates(blocked, TODAY).map((s) => s.step.id)).toEqual(['ok']);
  });
});
