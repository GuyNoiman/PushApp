/**
 * Planner tests. The pure planner (planJourney) is exercised directly with an injected
 * clock (`now`) and either the real GeneralExpert or a hand-built stub expert — no OS, no
 * async, no randomness. Fixed inputs → deterministic output. 2026-07-14 is a Tuesday
 * (getDay 2), matching the CommunicationScheduler tests' anchor.
 */
import type { DomainExpert, ProposedMilestone, StepTemplate } from '../DomainExpert';
import { GeneralExpert } from '../DomainExpert';
import { planJourney } from '../Planner';
import type { GoalInput, PlanConstraints } from '../types';

// A fixed clock so all scheduling maths is deterministic. Tue 2026-07-14, 10:00 local.
const NOW = new Date(2026, 6, 14, 10, 0, 0).getTime();

function goal(over: Partial<GoalInput> = {}): GoalInput {
  return { title: 'Run 5km', isHabit: false, ...over };
}

function constraints(over: Partial<PlanConstraints> = {}): PlanConstraints {
  return {
    weeklyAvailabilityMinutes: 120,
    preferredDays: [],
    daypart: 'morning',
    ...over,
  };
}

/** A stub expert with full control over the Milestones + Steps produced. */
function stubExpert(
  milestones: ProposedMilestone[],
  templatesFor: (m: ProposedMilestone) => StepTemplate[],
): DomainExpert {
  return {
    proposeMilestones: () => milestones.map((m) => ({ ...m })),
    stepTemplatesFor: (m) => templatesFor(m),
  };
}

/** Uniform template list of `count` Steps of `minutes` each. */
function uniform(count: number, minutes: number): (m: ProposedMilestone) => StepTemplate[] {
  return (m) =>
    Array.from({ length: count }, (_, n) => ({
      title: `${m.title} ${n + 1}`,
      estimatedMinutes: minutes,
      difficulty: 2,
    }));
}

const dayOf = (ms: number) => new Date(ms).getDay();
const startOfDayMs = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

describe('planJourney — structure', () => {
  it('produces Milestones and Steps wired together with the general expert', () => {
    const plan = planJourney(goal({ isHabit: true }), constraints(), GeneralExpert, { now: NOW });

    expect(plan.milestones).toHaveLength(3); // habit arc
    expect(plan.steps.length).toBeGreaterThan(0);

    const milestoneIds = new Set(plan.milestones!.map((m) => m.id));
    for (const step of plan.steps) {
      expect(step.milestoneId).toBeDefined();
      expect(milestoneIds.has(step.milestoneId!)).toBe(true);
      expect(step.difficulty).toBeGreaterThanOrEqual(1);
    }

    // Exactly one Starter Step, and it is the first.
    expect(plan.steps.filter((s) => s.isStarterStep)).toHaveLength(1);
    expect(plan.steps[0].isStarterStep).toBe(true);

    // Milestones are ordered 0..n and carry stable default ids.
    expect(plan.milestones!.map((m) => m.order)).toEqual([0, 1, 2]);
    expect(plan.milestones!.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('is deterministic — identical inputs yield identical output', () => {
    const a = planJourney(goal(), constraints(), GeneralExpert, { now: NOW });
    const b = planJourney(goal(), constraints(), GeneralExpert, { now: NOW });
    expect(a).toEqual(b);
  });
});

describe('planJourney — cadence respects availability & preferred days', () => {
  it('schedules only on preferred weekdays and packs to the daily budget', () => {
    const expert = stubExpert(
      [{ title: 'A', weight: 1 }, { title: 'B', weight: 2 }],
      uniform(3, 15), // 6 Steps of 15 min
    );
    // Mon/Wed/Fri, 90 min/week → 30 min/day → 2 Steps/day.
    const plan = planJourney(
      goal(),
      constraints({ preferredDays: [1, 3, 5], weeklyAvailabilityMinutes: 90 }),
      expert,
      { now: NOW },
    );

    const days = plan.steps.map((s) => dayOf(s.plannedFor!));
    for (const d of days) expect([1, 3, 5]).toContain(d);

    // Count Steps per calendar day — none should exceed the 2/day budget.
    const perDay = new Map<number, number>();
    for (const s of plan.steps) {
      const key = startOfDayMs(s.plannedFor!);
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    for (const count of perDay.values()) expect(count).toBeLessThanOrEqual(2);

    // Steps are scheduled at the morning day-part hour (08:00).
    for (const s of plan.steps) expect(new Date(s.plannedFor!).getHours()).toBe(8);
  });
});

describe('planJourney — back-solving to a targetDate', () => {
  it('compresses so the last Step lands on/before the deadline', () => {
    const expert = stubExpert([{ title: 'A' }], uniform(10, 60)); // 10 long Steps
    const targetDate = NOW + 4 * 24 * 60 * 60 * 1000; // 4 days out
    // Every day preferred but only 1 Step/day fits the tiny weekly budget → would overrun.
    const plan = planJourney(
      goal(),
      constraints({ targetDate, weeklyAvailabilityMinutes: 60, preferredDays: [] }),
      expert,
      { now: NOW },
    );

    const last = Math.max(...plan.steps.map((s) => s.plannedFor!));
    expect(startOfDayMs(last)).toBeLessThanOrEqual(startOfDayMs(targetDate));
  });

  it('keeps the natural cadence when the deadline is comfortably far', () => {
    const expert = stubExpert([{ title: 'A' }], uniform(4, 30));
    const targetDate = NOW + 365 * 24 * 60 * 60 * 1000; // a year out
    const withTarget = planJourney(
      goal(),
      constraints({ targetDate, weeklyAvailabilityMinutes: 120, preferredDays: [1, 3, 5] }),
      expert,
      { now: NOW },
    );
    const withoutTarget = planJourney(
      goal(),
      constraints({ weeklyAvailabilityMinutes: 120, preferredDays: [1, 3, 5] }),
      expert,
      { now: NOW },
    );
    // A far deadline does not disturb the budget layout of the Steps themselves.
    expect(withTarget.steps.map((s) => s.plannedFor)).toEqual(
      withoutTarget.steps.map((s) => s.plannedFor),
    );
  });
});

describe('planJourney — open-ended habit path', () => {
  it('lays Steps forward from today with no deadline compression', () => {
    const expert = stubExpert([{ title: 'A' }], uniform(4, 30));
    const plan = planJourney(
      goal({ isHabit: true, cadence: 'daily' }),
      constraints({ weeklyAvailabilityMinutes: 60, preferredDays: [] }),
      expert,
      { now: NOW },
    );

    // No specific days named → FREQUENCY-BASED: Steps carry no fixed dates, just a weekly target.
    expect(plan.steps.every((s) => s.plannedFor == null)).toBe(true);
    expect(plan.sessionsPerWeek).toBeGreaterThan(0);
    expect(plan.durationDays).toBeGreaterThan(1);
    expect(plan.steps[0].cadence).toBe('daily');
  });
});

describe('planJourney — edge cases', () => {
  it('no time available still schedules one Step per preferred day', () => {
    const expert = stubExpert([{ title: 'A' }], uniform(4, 30));
    const plan = planJourney(
      goal(),
      constraints({ weeklyAvailabilityMinutes: 0, preferredDays: [1, 2, 3, 4] }),
      expert,
      { now: NOW },
    );

    expect(plan.steps).toHaveLength(4);
    const distinctDays = new Set(plan.steps.map((s) => startOfDayMs(s.plannedFor!)));
    expect(distinctDays.size).toBe(4); // one per preferred day, four distinct days
  });

  it('a very near targetDate collapses all Steps on/before it', () => {
    const expert = stubExpert([{ title: 'A' }], uniform(6, 30));
    const targetDate = NOW + 24 * 60 * 60 * 1000; // tomorrow
    const plan = planJourney(
      goal(),
      constraints({ targetDate, weeklyAvailabilityMinutes: 30, preferredDays: [] }),
      expert,
      { now: NOW },
    );

    for (const s of plan.steps) {
      expect(startOfDayMs(s.plannedFor!)).toBeLessThanOrEqual(startOfDayMs(targetDate));
    }
  });

  it('an empty expert proposal yields a valid, Step-less plan', () => {
    const emptyExpert = stubExpert([], () => []);
    const plan = planJourney(goal(), constraints(), emptyExpert, { now: NOW });
    expect(plan.steps).toEqual([]);
    expect(plan.milestones).toEqual([]);
    expect(plan.durationDays).toBeGreaterThanOrEqual(1);
  });
});
