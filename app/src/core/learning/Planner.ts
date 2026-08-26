/**
 * Planner — the deterministic, pure Journey generator (adaptive coach, S1). It is
 * DOMAIN-IGNORANT: it asks a {@link DomainExpert} for Milestones + Step templates, then lays
 * the Steps across the calendar honouring the user's weekly availability, preferred days and
 * day-part. With a `targetDate` it back-solves so the last Step lands on/before the deadline;
 * without one it lays an open-ended cadence forward. Its output is a {@link NewJourneyInput}
 * — exactly what {@link JourneyEngine.createJourney} consumes.
 *
 * NO LLM, NO randomness: same inputs → identical output. `now` is injected (defaults to
 * Date.now) and Milestone ids follow a stable scheme, so tests are fully deterministic.
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { NewJourneyInput, NewStepInput } from '../engines/JourneyEngine';
import type { Cadence, DayPart, Milestone, Rhythm } from '../types/domain';
import type { DomainExpert, PlanStructure, ProposedMilestone, StepTemplate } from './DomainExpert';
import type { GoalInput, PlanConstraints } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The local wall-clock hour a Step is scheduled at, by preferred day-part. */
const DAYPART_HOUR: Record<DayPart, number> = { morning: 8, evening: 19, either: 12 };

/** Optional injection points that keep the Planner pure and deterministic in tests. */
export interface PlanOptions {
  /** The clock back-solving and `plannedFor` are computed from. Defaults to Date.now(). */
  now?: number;
  /** Milestone id factory (0-based index). Defaults to a stable `m1`, `m2`, … scheme. */
  milestoneId?: (index: number) => string;
  /**
   * How long a RECURRING Journey runs, in days. Ignored for a `process` shape, whose length falls
   * out of its Steps and any deadline. Defaults to {@link RECURRING_DEFAULT_DAYS}.
   */
  durationDays?: number;
  /**
   * The ACCOUNT-level capacity answer from onboarding's Q6 (D82), passed through so the constraint
   * derivation can fall back to it. It is the weakest of the three time signals on purpose: this
   * Journey's own interview answers were given about THIS Journey, now, and outrank a profile
   * answer given once about life in general. Absent ⇒ nothing changes.
   */
  accountCapacity?: string;
}

/**
 * The default length of a recurring Journey when the user named no deadline: eight weeks. Long
 * enough for a repeated action to stop feeling like a project, short enough to stay a commitment
 * somebody can actually see the end of.
 */
export const RECURRING_DEFAULT_DAYS = 56;

/**
 * One scheduled unit: a Step template and the Milestone that owns it — `undefined` for an
 * UNSTAGED Step, which is every Step of a recurring Journey. A recurring Journey has no Milestone
 * arc at all (there is no "second phase" of changing the pillowcases), and inventing a single
 * wrapper Milestone so the data shape stays uniform would put a stage on the user's screen that
 * they never agreed to — the exact defect Device QA A1 found.
 */
interface Entry {
  milestone?: Milestone;
  template: StepTemplate;
}

/**
 * Build a complete, deterministic Journey plan for a goal. Pure: given the same goal,
 * constraints, expert and options it returns an identical {@link NewJourneyInput}.
 */
export function planJourney(
  goal: GoalInput,
  constraints: PlanConstraints,
  expert: DomainExpert,
  options: PlanOptions = {},
): NewJourneyInput {
  // Ask the expert for its generic (non-answer-aware) Milestone arc + Step templates, then lay them.
  const proposed = expert.proposeMilestones(goal, constraints);
  const stepsByMilestone = proposed.map((m) => expert.stepTemplatesFor(m, goal));
  return planJourneyFromStructure(goal, constraints, { milestones: proposed, stepsByMilestone }, options);
}

/**
 * Lay a PRE-BUILT {@link PlanStructure} (Milestone arc + Step templates per Milestone) across the
 * calendar — the coach path. The structure is answer-aware (from {@link DomainExpert.buildStructure}),
 * so the user's real baseline + choices already shaped it; this only schedules it, honouring weekly
 * availability, preferred days, day-part and any target date. Same deterministic scheduling as
 * {@link planJourney}; both share {@link layoutStructure}.
 */
export function planJourneyFromStructure(
  goal: GoalInput,
  constraints: PlanConstraints,
  structure: PlanStructure,
  options: PlanOptions = {},
): NewJourneyInput {
  return layoutStructure(goal, constraints, structure, options);
}

/** Materialize a {@link PlanStructure} into a scheduled {@link NewJourneyInput}. Pure + deterministic. */
function layoutStructure(
  goal: GoalInput,
  constraints: PlanConstraints,
  structure: PlanStructure,
  options: PlanOptions,
): NewJourneyInput {
  const now = options.now ?? Date.now();
  const milestoneId = options.milestoneId ?? ((i: number) => `m${i + 1}`);

  // 1. Materialize the Milestone arc (assign id + order).
  const milestones: Milestone[] = structure.milestones.map((m, i) => ({
    id: milestoneId(i),
    title: m.title,
    order: i,
    ...(m.weight !== undefined ? { weight: m.weight } : {}),
  }));

  // 2. Flatten the Step templates in Milestone order, each paired with its owning Milestone, then
  //    append the UNSTAGED Steps (a recurring Journey's entire plan) which own no Milestone.
  const entries: Entry[] = [];
  milestones.forEach((milestone, i) => {
    for (const template of structure.stepsByMilestone[i] ?? []) {
      entries.push({ milestone, template });
    }
  });
  for (const template of structure.unstagedSteps ?? []) {
    entries.push({ template });
  }

  // 3. Schedule.
  //    A RECURRING Journey is dated by CADENCE, never by minute budget: the whole point is that the
  //    same action comes round again on the next active day. Packing it by available minutes would
  //    stack a week of five-minute repetitions onto one afternoon, which is not what "daily" means.
  //    Otherwise: when the user named NO specific days and set NO deadline, the plan is
  //    FREQUENCY-BASED — we do NOT pin Steps to calendar dates (they may act on any day) and
  //    express a weekly session target instead. Failing both, we lay Steps on real dates by budget.
  const recurring = goal.shape === 'recurring';
  const flexible =
    !recurring && constraints.preferredDays.length === 0 && constraints.targetDate == null;
  const plannedFor = recurring
    ? scheduleOnePerActiveDay(entries, constraints, now)
    : flexible
      ? []
      : schedule(entries, constraints, now);
  const sessionsPerWeek = flexible ? deriveSessionsPerWeek(constraints, entries) : undefined;

  // 4. Emit NewStepInputs. The first Step is the deliberately-easy Starter Step.
  //    A template dependency is authored by TEMPLATE ID (an arc is written before any Step exists),
  //    so it is resolved to the positional index the engine expects now that the flattened order is
  //    known. An unresolvable id is simply dropped: a plan must never fail to build because one
  //    authored dependency does not match, and an unlinked Step is merely unordered, not broken.
  const indexOfTemplate = new Map<string, number>();
  entries.forEach((e, i) => {
    if (e.template.id !== undefined) indexOfTemplate.set(e.template.id, i);
  });
  const stepCadence: Cadence = goal.cadence ?? (flexible ? 'weekly' : goal.isHabit ? 'daily' : 'once');
  const steps: NewStepInput[] = entries.map((e, i) => ({
    title: e.template.title,
    isStarterStep: i === 0,
    cadence: stepCadence,
    estimatedDuration: e.template.estimatedMinutes,
    difficulty: e.template.difficulty,
    ...(e.template.description !== undefined ? { description: e.template.description } : {}),
    ...(dependencyIndex(e.template, indexOfTemplate, i) !== undefined
      ? { dependsOnStepIndex: dependencyIndex(e.template, indexOfTemplate, i) }
      : {}),
    // Omitted entirely for an unstaged Step — it belongs to no Milestone, and an empty string
    // would read as a Milestone the surfaces then try to resolve.
    ...(e.milestone ? { milestoneId: e.milestone.id } : {}),
    // Frequency-based plans carry no fixed date — the user acts on whatever days they choose.
    ...(flexible ? {} : { plannedFor: plannedFor[i] }),
  }));

  const durationDays = recurring
    ? recurringDurationDays(constraints, options, now)
    : flexible
      ? REVIEW_WINDOW_DAYS
      : computeDurationDays(constraints, plannedFor, now);

  return {
    title: goal.title,
    description: goal.description,
    why: [],
    durationDays,
    rhythm: flexible ? rhythmForFrequency(sessionsPerWeek ?? 3) : rhythmFor(constraints.preferredDays),
    steps,
    milestones,
    ...(sessionsPerWeek !== undefined ? { sessionsPerWeek } : {}),
  };
}

/**
 * The positional predecessor for a template, or undefined when it has none / names one that is not
 * in this plan / would point forwards. The engine drops an invalid dependency anyway; refusing to
 * emit one here keeps the reason for it visible at the place the intent was authored.
 */
function dependencyIndex(
  template: StepTemplate,
  indexOfTemplate: ReadonlyMap<string, number>,
  ownIndex: number,
): number | undefined {
  const dependsOn = template.dependsOnTemplateId;
  if (dependsOn === undefined) return undefined;
  const index = indexOfTemplate.get(dependsOn);
  return index !== undefined && index < ownIndex ? index : undefined;
}

// ── Scheduling ───────────────────────────────────────────────────────────────

/**
 * Return the `plannedFor` epoch ms for each entry, in order. Lays Steps by weekly
 * availability across preferred days; when a `targetDate` is set and the budget layout would
 * overrun it, compresses the Steps evenly across the preferred days that remain before the
 * deadline. Never drops a Step.
 */
function schedule(entries: Entry[], constraints: PlanConstraints, now: number): number[] {
  if (entries.length === 0) return [];

  const budget = packByBudget(entries, constraints, now);
  if (constraints.targetDate == null) return budget;

  const lastDay = startOfDay(Math.max(...budget)).getTime();
  const targetDay = startOfDay(constraints.targetDate).getTime();
  if (lastDay <= targetDay) return budget; // the natural cadence already fits.

  return packToDeadline(entries, constraints, now, constraints.targetDate);
}

/**
 * RECURRING dating: one Step per active day, in order, starting today.
 *
 * This is the whole difference between "drink a protein shake daily" and what the app used to
 * produce. The budget packer asks "how many minutes fit in a day" and would put Monday through
 * Friday's five-minute repetitions on Monday afternoon; this asks "when does it come round again"
 * and answers with the next day the user is available. Setup Steps come first in the entry list, so
 * they take the first active days and the repetitions follow — which is also the honest order.
 *
 * Preferred days are respected: someone who reads twice a week gets their two days, not a daily
 * plan they will miss five times a week. An empty preference means every day (see
 * {@link normalizedPreferredDays}).
 */
function scheduleOnePerActiveDay(
  entries: Entry[],
  constraints: PlanConstraints,
  now: number,
): number[] {
  if (entries.length === 0) return [];
  const preferred = normalizedPreferredDays(constraints.preferredDays);

  let cursor = firstPreferredOnOrAfter(startOfDay(now), preferred);
  const planned: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    planned.push(atDaypart(cursor, constraints.daypart));
    cursor = nextPreferred(cursor, preferred);
  }
  return planned;
}

/**
 * How long a recurring Journey runs: the user's own deadline when they gave one, else the caller's
 * explicit length, else {@link RECURRING_DEFAULT_DAYS}. Deliberately NOT derived from the last
 * scheduled Step the way a staged plan's is — a recurring Journey's length is a commitment the user
 * makes, and the repetitions are laid inside it. Reading it back off the Steps would let the number
 * of occurrences silently redefine what the user agreed to.
 */
function recurringDurationDays(
  constraints: PlanConstraints,
  options: PlanOptions,
  now: number,
): number {
  if (constraints.targetDate != null) {
    const days =
      Math.ceil((startOfDay(constraints.targetDate).getTime() - startOfDay(now).getTime()) / MS_PER_DAY) + 1;
    return Math.max(1, days);
  }
  return Math.max(1, Math.round(options.durationDays ?? RECURRING_DEFAULT_DAYS));
}

/**
 * Open-ended packing: fill each preferred day up to its share of the weekly minutes
 * (weeklyAvailabilityMinutes / preferred-day count), then move to the next preferred day. A
 * Step is always placed even if it alone exceeds the daily share (so we make progress);
 * with zero availability we fall back to one Step per preferred day.
 */
function packByBudget(entries: Entry[], constraints: PlanConstraints, now: number): number[] {
  const preferred = normalizedPreferredDays(constraints.preferredDays);
  const perDay =
    constraints.weeklyAvailabilityMinutes > 0
      ? constraints.weeklyAvailabilityMinutes / preferred.length
      : 0;

  let cursor = firstPreferredOnOrAfter(startOfDay(now), preferred);
  let used = 0;
  const planned: number[] = [];

  for (const e of entries) {
    const mins = e.template.estimatedMinutes;
    if (perDay > 0 && used > 0 && used + mins > perDay) {
      cursor = nextPreferred(cursor, preferred);
      used = 0;
    }
    planned.push(atDaypart(cursor, constraints.daypart));
    used += mins;
    if (perDay <= 0) {
      // No budget signal: one Step per preferred day so the plan still advances.
      cursor = nextPreferred(cursor, preferred);
      used = 0;
    }
  }
  return planned;
}

/**
 * Deadline packing (back-solve): spread the Steps as evenly as possible across the preferred
 * days that fall on/before `targetDate`, so the last Step lands no later than the deadline.
 * When no preferred day remains before the deadline, every Step is placed on the earliest
 * available slot, clamped to `targetDate`.
 */
function packToDeadline(
  entries: Entry[],
  constraints: PlanConstraints,
  now: number,
  targetDate: number,
): number[] {
  const preferred = normalizedPreferredDays(constraints.preferredDays);
  const targetDay = startOfDay(targetDate).getTime();

  const available: Date[] = [];
  let d = firstPreferredOnOrAfter(startOfDay(now), preferred);
  while (d.getTime() <= targetDay) {
    available.push(d);
    d = nextPreferred(d, preferred);
  }

  if (available.length === 0) {
    const earliest = firstPreferredOnOrAfter(startOfDay(now), preferred);
    const slot = Math.min(atDaypart(earliest, constraints.daypart), targetDate);
    return entries.map(() => slot);
  }

  const perDay = Math.ceil(entries.length / available.length);
  return entries.map((_, i) => {
    const dayIndex = Math.min(Math.floor(i / perDay), available.length - 1);
    return atDaypart(available[dayIndex], constraints.daypart);
  });
}

// ── Date helpers (local wall-clock) ────────────────────────────────────────────

/** Preferred weekdays as a unique, sorted set; an empty preference means every day. */
function normalizedPreferredDays(preferredDays: number[]): number[] {
  const unique = [...new Set(preferredDays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  return unique.length > 0 ? unique : [0, 1, 2, 3, 4, 5, 6];
}

/** Midnight (local) of the day containing `ms`. */
function startOfDay(ms: number): Date {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** The epoch ms of `d` at the day-part hour. */
function atDaypart(d: Date, daypart: DayPart): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), DAYPART_HOUR[daypart]).getTime();
}

/** The first preferred day on or after `d` (returns `d` itself when it qualifies). */
function firstPreferredOnOrAfter(d: Date, preferred: number[]): Date {
  let c = d;
  for (let i = 0; i < 7; i++) {
    if (preferred.includes(c.getDay())) return c;
    c = addDays(c, 1);
  }
  return d; // unreachable — `preferred` is never empty.
}

/** The first preferred day strictly after `d`. */
function nextPreferred(d: Date, preferred: number[]): Date {
  let c = addDays(d, 1);
  for (let i = 0; i < 7; i++) {
    if (preferred.includes(c.getDay())) return c;
    c = addDays(c, 1);
  }
  return c; // unreachable — `preferred` is never empty.
}

// ── Derived Journey fields ─────────────────────────────────────────────────────

/**
 * Journey duration in whole days. With a target date it spans now → deadline (inclusive);
 * otherwise it spans now → the last scheduled Step. Always ≥ 1.
 */
function computeDurationDays(
  constraints: PlanConstraints,
  plannedFor: number[],
  now: number,
): number {
  const end =
    constraints.targetDate != null
      ? constraints.targetDate
      : plannedFor.length > 0
        ? Math.max(...plannedFor)
        : now;
  const days = Math.ceil((startOfDay(end).getTime() - startOfDay(now).getTime()) / MS_PER_DAY) + 1;
  return Math.max(1, days);
}

/** Map the count of preferred days to the Journey's overall {@link Rhythm}. */
function rhythmFor(preferredDays: number[]): Rhythm {
  const n = normalizedPreferredDays(preferredDays).length;
  if (n >= 6) return 'daily';
  if (n >= 2) return 'few-times-week';
  return 'weekly';
}

// ── Frequency-based (flexible) plans ───────────────────────────────────────────

/** Review window (days) for an open-ended, frequency-based plan — no deadline, no fixed days. */
const REVIEW_WINDOW_DAYS = 14;

/**
 * Weekly session target for a frequency-based plan: available weekly minutes ÷ a typical session,
 * clamped 1–7. This is how the plan HONOURS the user's stated time without pinning specific dates.
 * Falls back to 3 when no usable time signal was captured.
 */
function deriveSessionsPerWeek(constraints: PlanConstraints, entries: Entry[]): number {
  const avg = averageSessionMinutes(entries);
  if (constraints.weeklyAvailabilityMinutes > 0 && avg > 0) {
    return clampInt(Math.round(constraints.weeklyAvailabilityMinutes / avg), 1, 7);
  }
  return 3;
}

/** Mean Step length in minutes (defaults to 30 when there are no entries). */
function averageSessionMinutes(entries: Entry[]): number {
  if (entries.length === 0) return 30;
  const total = entries.reduce((sum, e) => sum + (e.template.estimatedMinutes || 0), 0);
  return Math.max(1, Math.round(total / entries.length));
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Map a weekly session count to the Journey's overall {@link Rhythm}. */
function rhythmForFrequency(sessionsPerWeek: number): Rhythm {
  if (sessionsPerWeek >= 6) return 'daily';
  if (sessionsPerWeek >= 2) return 'few-times-week';
  return 'weekly';
}
