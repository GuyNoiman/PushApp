/**
 * weekByDay — the week as SEVEN DAYS, which is how a person actually holds a week.
 *
 * Home used to tell the same week twice: "Today's focus" (the next Step of each active Journey) and
 * "This week" (everything else, grouped by Dream). Neither answered the question someone opens the
 * app with — *what does my week look like, and what is on today* — and the empty days, which are
 * real information, were invisible in both. This derivation is the answer: the current week, one
 * bucket per day, each Step on the day it is planned for.
 *
 * THREE RULES LIVE HERE, and they are the whole of the founder's specification
 * (`04_Product/PRD/Week_By_Day_Home_PRD.md`):
 *
 *  1. **A day's mark.** Open Steps → a dot. Every Step done → a check. No Steps at all → nothing,
 *     and the day reads as empty rather than as unfinished.
 *  2. **What can be pulled forward.** Every day offers the Steps of LATER days that could be done
 *     now — always, not only once the day is finished, because someone with time this evening
 *     should not have to complete today to be offered the next thing.
 *  3. **What happens to a Step that was missed.** It moves to the next day only if it was merely
 *     RECOMMENDED — the week still had slack, so missing it cost nothing — AND that next day does
 *     not already carry a Step of the same Journey. Otherwise it stays on its own day, marked not
 *     done. Two founder rulings meet here: a Step that was already BINDING has been genuinely
 *     missed and must not quietly reappear tomorrow as if nothing happened, and the second
 *     condition is his own test case — three workouts a week, today already has one, so yesterday's
 *     does not jump onto today.
 *
 * WHY (a) IS LITERALLY `streakRole` AND NOT A PARAPHRASE OF IT: the badge on the card already tells
 * the user which side of the streak rule this Step is on, and the card's MOVEMENT now says the same
 * thing. `recommended` means the week can still absorb it, so it travels; `binding` means every
 * remaining day has to carry a session, so a miss is a miss. One predicate, one meaning — a second
 * definition is exactly how a shown label and an applied rule come to disagree.
 *
 * IT MOVES NOTHING. This is a pure view over the plan: a carried Step is REPORTED on a later day,
 * never rescheduled. The Step's own `plannedFor` is untouched, so the record of what was planned
 * stays true, and the adaptive planner remains the only thing that ever moves a Step.
 *
 * Pure TypeScript — no React, no vendor imports; the caller injects `now`.
 */
import type { StreakConfig } from '../config/streak';
import type { TodayStep } from '../engines/JourneyEngine';
import type { Journey } from '../types/domain';
import { startOfLocalDay, startOfNextLocalDay } from './date';
import { streakRole } from './urgency';
import { startOfWeek } from './week';

/** How a day's pill is marked. */
export type DayMark = 'empty' | 'open' | 'done';

/** One Step as it appears on a day. */
export interface DayStep {
  item: TodayStep;
  /**
   * The day this Step was PLANNED for, when that is not the day it is being shown on — i.e. it was
   * missed and carried forward. The UI says which day it came from; the Step itself never moved.
   */
  carriedFrom?: number;
  /**
   * The day the Step was actually reported done, when that is not the day it was planned for. A
   * Step pulled forward and done early stays on its own day and says when it really happened.
   */
  doneOn?: number;
  /** True when the day has passed, the Step is not done, and it did not travel forward. */
  missed: boolean;
}

/** One day of the week. */
export interface WeekDay {
  /** Local midnight of this day. */
  dayStart: number;
  /** `Date.getDay()` weekday — 0=Sunday … 6=Saturday, so a caller can label it. */
  weekday: number;
  isToday: boolean;
  isPast: boolean;
  mark: DayMark;
  steps: DayStep[];
}

/** The current week, and where today sits in it. */
export interface WeekByDay {
  days: WeekDay[];
  /** Index into `days` of today — always 0..6, because the week is the one `now` falls in. */
  todayIndex: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** A Step is settled when it is done — the only state that turns a day's dot into a check. */
function isDone(item: TodayStep): boolean {
  return item.step.done;
}

/**
 * A Step that will never be acted on again: done, or given a final report saying it did not happen.
 * A postponed or unreported Step is still live, which is why it is the one that can travel.
 */
function isSettled(item: TodayStep): boolean {
  return item.step.done || item.status === 'partially_completed' || item.status === 'not_completed';
}

/** The day a Step belongs to, or undefined for a frequency-based plan that pins no dates. */
function plannedDay(item: TodayStep): number | undefined {
  return item.step.plannedFor === undefined ? undefined : startOfLocalDay(item.step.plannedFor);
}

/**
 * Build the seven days of the week `now` falls in.
 *
 * `steps` is the display superset (the snapshot's `weekSteps`): it keeps done Steps, which is what
 * lets a finished day show a check instead of reading as empty. Steps with no planned date belong to
 * a frequency-based plan and are laid on TODAY — they are due "this week, on a day you choose", and
 * today is the only day the user can act on right now.
 */
export function buildWeekByDay(
  steps: readonly TodayStep[],
  journeys: readonly Journey[],
  now: number,
  config: StreakConfig,
): WeekByDay {
  const weekStart = startOfWeek(now);
  const today = startOfLocalDay(now);
  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    // Calendar arithmetic, not a fixed number of milliseconds: a DST change would otherwise slide
    // a day's boundary by an hour and put its Steps on the wrong pill.
    const dayStart = startOfLocalDay(weekStart + i * DAY_MS + DAY_MS / 2);
    days.push({
      dayStart,
      weekday: new Date(dayStart).getDay(),
      isToday: dayStart === today,
      isPast: dayStart < today,
      mark: 'empty',
      steps: [],
    });
  }
  const todayIndex = days.findIndex((d) => d.isToday);
  const indexOfDay = new Map(days.map((d, i) => [d.dayStart, i]));

  const push = (index: number, entry: DayStep) => {
    days[index].steps.push(entry);
  };

  // TWO PASSES, and the order is load-bearing. Condition (b) of the carry rule asks whether the
  // target day ALREADY holds a Step of the same Journey — and "already holds" must mean the day's
  // own planned Steps, not merely whatever happened to be processed first. So every Step is placed
  // on the day it was planned for, and only then do the missed ones look for somewhere to go.
  const carried: { item: TodayStep; home: number }[] = [];

  for (const item of steps) {
    const planned = plannedDay(item);
    // Undated (frequency-based) Steps are actionable today and nowhere else.
    const home = planned === undefined ? today : planned;
    const index = indexOfDay.get(home);
    if (index === undefined) continue; // outside this week — it belongs to another week's strip.

    if (isDone(item)) {
      const doneDay =
        item.step.lastCheckInAt === undefined ? undefined : startOfLocalDay(item.step.lastCheckInAt);
      push(index, {
        item,
        ...(doneDay !== undefined && doneDay !== home ? { doneOn: doneDay } : {}),
        missed: false,
      });
      continue;
    }
    // A Step that was REPORTED (a partial, a couldn't) is not a missed one — it was answered, and
    // its own chip says what the answer was — so it never travels and never carries the flag.
    const open = home < today && !isSettled(item);
    push(index, { item, missed: open });
    if (open) carried.push({ item, home });
  }

  // Oldest first: the days are walked in the order they happened.
  carried.sort((a, b) => a.home - b.home);
  for (const { item, home } of carried) {
    const landed = carryForward(item, home, today, days, journeys, now, config);
    if (landed === home) continue; // it stays where it was planned, still marked missed.
    const source = days[indexOfDay.get(home)!];
    source.steps = source.steps.filter((s) => s.item.step.id !== item.step.id);
    push(indexOfDay.get(landed)!, { item, carriedFrom: home, missed: false });
  }

  for (const day of days) {
    day.mark = day.steps.length === 0 ? 'empty' : day.steps.every((s) => isDone(s.item)) ? 'done' : 'open';
  }
  return { days, todayIndex };
}

/**
 * Where a missed Step ends up. It advances one day at a time, and stops the moment either condition
 * fails — so a Step that could not move on Tuesday does not silently reappear on Thursday.
 */
function carryForward(
  item: TodayStep,
  from: number,
  today: number,
  days: readonly WeekDay[],
  journeys: readonly Journey[],
  now: number,
  config: StreakConfig,
): number {
  const journey = journeys.find((j) => j.id === item.journeyId);
  // (a) Was this Step only RECOMMENDED, and not yet required? That is the founder's own wording for
  // the condition, and it is `streakRole` itself rather than a paraphrase of it: while the week
  // still has slack, missing the Step costs nothing and it simply moves to the next day. Once the
  // Journey is BINDING — every remaining day has to carry a session — a miss is a real miss, and it
  // stays on its own day marked not done rather than quietly reappearing tomorrow.
  //
  // A Journey we cannot find is treated as recommended: the calm side, because a surface must never
  // strand a Step on the strength of data it does not have.
  if (journey && streakRole(journey, now, config) !== 'recommended') return from;

  let day = from;
  while (day < today) {
    const next = startOfNextLocalDay(day);
    const target = days.find((d) => d.dayStart === next);
    if (!target) return day; // the week ended — it stays where it was planned.
    // (b) The target day must not already carry a Step of the same Journey. The founder's case:
    // three workouts a week, today already has one, so yesterday's does not land on top of it.
    if (target.steps.some((s) => s.item.journeyId === item.journeyId && s.item.step.id !== item.step.id)) {
      return day;
    }
    day = next;
  }
  return day;
}

/**
 * How far ahead an offer is still an OFFER. Beyond this it is somebody's plan for next week, and
 * putting it under "you could also do today" is noise rather than an opportunity.
 */
export const PULL_FORWARD_HORIZON_DAYS = 3;

/**
 * The Steps of LATER days that could be done now — the "you could also do today" list, shown at the
 * end of every day and not only a finished one.
 *
 * Later days only, never earlier ones: a missed Step is handled by the carry rule and must not also
 * be offered here as an optional extra, which would let the app ask for the same thing twice in two
 * different tones. A locked Step (an unmet dependency) is not offered either — it is not something
 * the user can choose to do early.
 *
 * THREE RULES ADDED 2026-08-24, from what the founder actually saw on his phone: the list offered
 * him the same thing three times, offered something his day already held, and offered something from
 * the far end of the week.
 *
 *  1. **One Step per Journey.** A Journey with three identical sessions this week is ONE offer. Three
 *     rows reading "workout · workout · workout" are the same ask wearing three hats.
 *  2. **Nothing from a Journey the day already carries.** If today already asks something of a
 *     Journey, offering more of it is not an extra — it is the app asking twice, which is exactly
 *     what the carry rule refuses to do one function above.
 *  3. **A horizon.** Only the next {@link PULL_FORWARD_HORIZON_DAYS} days. Tomorrow is an offer; next
 *     Sunday is a plan.
 *
 * `todaysSteps` is what the day itself is showing. It is a parameter rather than something derived
 * here because the day's list is built by {@link buildWeekByDay} with its own carry rules, and this
 * function must exclude what the person is ACTUALLY looking at, not what it recomputes.
 */
export function pullForwardCandidates(
  steps: readonly TodayStep[],
  dayStart: number,
  limit = 3,
  todaysSteps: readonly TodayStep[] = [],
): TodayStep[] {
  const after = startOfNextLocalDay(dayStart);
  const horizonEnd = dayStart + (PULL_FORWARD_HORIZON_DAYS + 1) * DAY_MS;
  const journeysAlreadyToday = new Set(todaysSteps.map((item) => item.journeyId));
  const offeredJourneys = new Set<string>();

  return steps
    .filter((item) => {
      if (item.step.done || item.step.dropped || item.locked) return false;
      if (journeysAlreadyToday.has(item.journeyId)) return false;
      const planned = plannedDay(item);
      return planned !== undefined && planned >= after && planned < horizonEnd;
    })
    .sort((a, b) => (a.step.plannedFor ?? 0) - (b.step.plannedFor ?? 0))
    .filter((item) => {
      // Soonest wins the Journey's single slot, because the sort above put it first.
      if (offeredJourneys.has(item.journeyId)) return false;
      offeredJourneys.add(item.journeyId);
      return true;
    })
    .slice(0, limit);
}

/** The week in three numbers — what Home's summary card shows. */
export interface WeekSummary {
  /** Steps reported DONE since the week began, up to now. */
  done: number;
  /** Every Step this week holds, done or not — the denominator the founder specified. */
  total: number;
  /** `done / total` in [0,1]; 0 when the week holds nothing, never NaN. */
  progress: number;
}

/**
 * Summarise the current week (founder's definitions, 2026-08-19): **steps done** is how many were
 * completed from the start of the week until now, and **weekly progress** is the share of the
 * week's Steps that were completed — completed out of everything the week holds.
 *
 * The denominator is the week's OWN Steps, not the Journey's and not the plan's: a person's sense of
 * "how is my week going" is about this week, and a number that quietly counted next month's Steps
 * would read as failure for no reason. Steps with no date belong to a frequency-based plan and are
 * counted in the current week, because that is the week the user can act in.
 */
export function summariseWeek(steps: readonly TodayStep[], now: number): WeekSummary {
  const weekStart = startOfWeek(now);
  const nextWeek = startOfWeek(now) + 7 * DAY_MS;
  const inWeek = steps.filter((item) => {
    if (item.step.dropped) return false;
    const planned = plannedDay(item);
    if (planned === undefined) return true;
    return planned >= weekStart && planned < nextWeek;
  });
  const done = inWeek.filter(
    (item) => item.step.done && (item.step.lastCheckInAt ?? weekStart) >= weekStart,
  ).length;
  const total = inWeek.length;
  return { done, total, progress: total > 0 ? done / total : 0 };
}

/** Which sentence the week has earned. Named states, so the copy is content and not a formula. */
export type WeekMood = 'empty' | 'starting' | 'building' | 'strong' | 'complete';

/**
 * The mood for a week's numbers — what Home's summary card says out loud.
 *
 * It lives here, beside the numbers themselves, because it is a DERIVATION and not decoration: the
 * rule is that the card reports the week back rather than flattering the person. Deliberately blunt
 * at the edges — a week with nothing planned is empty and not a failure, zero done is a week that
 * has not started, and done is done. "Strong" begins only at three quarters, so the word keeps
 * meaning something.
 */
export function moodFor(done: number, total: number): WeekMood {
  if (total === 0) return 'empty';
  if (done === 0) return 'starting';
  if (done >= total) return 'complete';
  return done / total >= 0.75 ? 'strong' : 'building';
}
