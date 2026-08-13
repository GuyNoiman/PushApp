/**
 * goalSpecToJourney (S2.6) — the conversation → Journey bridge. These are PURE, network-free unit
 * tests: they assert the GoalSpec → (GoalInput, PlanConstraints) mapping, that a fixed spec plans a
 * habit-shaped Journey while a progressive spec plans a Milestone-shaped one, that missing/edge
 * timing degrades safely, and that ON-DEVICE-ONLY motivation/failureRisks never leak into the plan.
 */
import { EventBus } from '../../events/EventBus';
import { JourneyEngine } from '../../engines/JourneyEngine';
import { GeneralExpert } from '../../learning/DomainExpert';
import { BodyImageExpert } from '../../learning/experts/BodyImageExpert';
import type { AppState, ParkedGoal } from '../../types/domain';
import type { GoalSpec } from '../interviewPlaybook';
import {
  buildJourneyInput,
  createJourneyFromGoalSpec,
  dreamSignalFromSpec,
  goalSpecToPlan,
  parkedGoalToSpec,
} from '../goalSpecToJourney';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** A fixed local-midnight clock so the deterministic Planner lays identical dates every run. */
const NOW = new Date(2026, 7, 4).getTime();

/** The generic habit arc the GeneralExpert lays for an open-ended (isHabit) goal. */
const HABIT_ARC = ['Get started', 'Build the routine', 'Make it stick'];
/** The generic finite-goal arc the GeneralExpert lays for a progressive goal. */
const GOAL_ARC = ['Foundations', 'Core practice', 'Deepen', 'Finish strong'];

/** A minimal AppState just sufficient for JourneyEngine.createJourney (only touches `journeys`). */
function freshState(): AppState {
  return { journeys: [] } as unknown as AppState;
}

describe('goalSpecToPlan', () => {
  it('maps a fixed habit spec to a habit-shaped plan', () => {
    const spec: GoalSpec = {
      title: 'Meditate every morning',
      domain: 'general',
      processType: 'fixed',
      isHabit: true,
      milestones: [],
      motivation: 'a calmer, clearer mind',
      failureRisks: ['mornings get rushed'],
      timing: { daypart: 'morning', sessionMinutes: 15, sessionsPerWeek: 5, preferredDays: [1, 3, 5] },
    };

    const { goal, constraints } = goalSpecToPlan(spec);

    expect(goal.title).toBe('Meditate every morning');
    expect(goal.isHabit).toBe(true);
    expect(constraints.weeklyAvailabilityMinutes).toBe(75); // 15 × 5
    expect(constraints.daypart).toBe('morning');
    expect(constraints.preferredDays).toEqual([1, 3, 5]);
    expect(constraints.targetDate).toBeUndefined();

    // G1: on-device-only motivation / failure risks must NOT leak into the scheduling inputs.
    expect(JSON.stringify({ goal, constraints })).not.toContain('calmer');
    expect(JSON.stringify({ goal, constraints })).not.toContain('rushed');

    const plan = buildJourneyInput(spec, GeneralExpert, { now: NOW });
    expect(plan.milestones?.map((m) => m.title)).toEqual(HABIT_ARC);
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps.every((s) => s.cadence === 'daily')).toBe(true); // open-ended habit → daily Steps
    expect(plan.steps[0].isStarterStep).toBe(true);
  });

  it('maps a progressive spec to a Milestone-shaped, deadline-bound plan', () => {
    const targetDate = NOW + 60 * MS_PER_DAY;
    const spec: GoalSpec = {
      title: 'Run a 10k',
      domain: 'general',
      processType: 'progressive',
      isHabit: false,
      milestones: [
        { title: 'Build an aerobic base', order: 0 },
        { title: 'Add distance', order: 1 },
      ],
      motivation: 'prove to myself I can',
      failureRisks: [],
      timing: { daypart: 'evening', sessionMinutes: 30, sessionsPerWeek: 3, preferredDays: [2, 4, 6], targetDate },
    };

    const { goal, constraints } = goalSpecToPlan(spec);

    expect(goal.isHabit).toBe(false);
    expect(constraints.weeklyAvailabilityMinutes).toBe(90); // 30 × 3
    expect(constraints.daypart).toBe('evening');
    expect(constraints.targetDate).toBe(targetDate);

    const plan = buildJourneyInput(spec, GeneralExpert, { now: NOW });
    // A progressive goal is Milestone-shaped: the finite-goal arc, not the habit arc.
    expect(plan.milestones?.map((m) => m.title)).toEqual(GOAL_ARC);
    expect((plan.milestones?.length ?? 0)).toBeGreaterThan(HABIT_ARC.length);
    // Every scheduled Step lands on/before the deadline (Planner back-solves).
    const last = Math.max(...plan.steps.map((s) => s.plannedFor ?? 0));
    expect(last).toBeLessThanOrEqual(targetDate);
  });

  it('handles missing / edge timing without inventing availability', () => {
    const spec: GoalSpec = {
      title: 'Something vague',
      domain: 'general',
      processType: 'unknown',
      isHabit: false,
      milestones: [],
      failureRisks: [],
      timing: {},
    };

    const { goal, constraints } = goalSpecToPlan(spec);
    expect(goal.isHabit).toBe(false); // unknown resolves to a finite goal for now
    expect(constraints.weeklyAvailabilityMinutes).toBe(0);
    expect(constraints.preferredDays).toEqual([]);
    expect(constraints.daypart).toBe('either');
    expect(constraints.targetDate).toBeUndefined();

    // A half-answered timing (length but no frequency) still carries no invented availability.
    const partial = goalSpecToPlan({ ...spec, timing: { sessionMinutes: 20 } });
    expect(partial.constraints.weeklyAvailabilityMinutes).toBe(0);

    // The Planner still produces a valid, non-empty plan from the degraded inputs.
    const plan = buildJourneyInput(spec, GeneralExpert, { now: NOW });
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.title).toBe('Something vague');
  });

  it('does not mutate the source preferredDays array', () => {
    const preferredDays = [1, 2, 3];
    const spec: GoalSpec = {
      title: 'Immutability check',
      domain: 'general',
      processType: 'fixed',
      isHabit: true,
      milestones: [],
      failureRisks: [],
      timing: { sessionMinutes: 10, sessionsPerWeek: 3, preferredDays },
    };
    const { constraints } = goalSpecToPlan(spec);
    constraints.preferredDays.push(6);
    expect(preferredDays).toEqual([1, 2, 3]); // the spec's array is untouched
  });
});

describe('createJourneyFromGoalSpec', () => {
  it('creates a live Journey through the JourneyEngine', () => {
    const spec: GoalSpec = {
      title: 'Read before bed',
      domain: 'general',
      processType: 'fixed',
      isHabit: true,
      milestones: [],
      failureRisks: [],
      timing: { daypart: 'evening', sessionMinutes: 20, sessionsPerWeek: 7 },
    };
    const state = freshState();
    const engine = new JourneyEngine(new EventBus(), () => state);

    const journey = createJourneyFromGoalSpec(engine, spec, GeneralExpert, { now: NOW });

    expect(journey.title).toBe('Read before bed');
    expect(state.journeys).toHaveLength(1);
    expect(journey.steps.length).toBeGreaterThan(0);
    expect(journey.milestones?.map((m) => m.title)).toEqual(HABIT_ARC);
  });

  it('marks the Journey createdVia "coach" so it may offer the Companion bundle (D2)', () => {
    const spec: GoalSpec = {
      title: 'Read before bed',
      domain: 'general',
      processType: 'fixed',
      isHabit: true,
      milestones: [],
      failureRisks: [],
      timing: { daypart: 'evening', sessionMinutes: 20, sessionsPerWeek: 7 },
    };
    const state = freshState();
    const engine = new JourneyEngine(new EventBus(), () => state);

    const journey = createJourneyFromGoalSpec(engine, spec, GeneralExpert, { now: NOW });

    expect(journey.createdVia).toBe('coach');
  });
});

describe('domain routing (SX.2)', () => {
  /** The BodyImageExpert's arc — proves the SAME engine built domain-specific Milestones. */
  const BODY_IMAGE_ARC = [
    'Build gentle baseline habits',
    'Add movement you enjoy',
    'Nourish and fuel steadily',
    'Make it a lasting routine',
  ];

  it('routes to the DomainExpert named by the spec.domain (no explicit expert passed)', () => {
    const spec: GoalSpec = {
      title: 'Train for a 5K',
      domain: 'body_image',
      processType: 'progressive',
      isHabit: false,
      milestones: [],
      failureRisks: [],
      timing: { daypart: 'morning', sessionMinutes: 30, sessionsPerWeek: 3 },
    };

    // Default expert is now ROUTED from spec.domain via the registry — BodyImageExpert, not GeneralExpert.
    const plan = buildJourneyInput(spec, undefined, { now: NOW });
    expect(plan.milestones?.map((m) => m.title)).toEqual(BODY_IMAGE_ARC);
  });

  it('falls back to the GeneralExpert for an unrecognized domain', () => {
    const spec = {
      title: 'Something odd',
      domain: 'not_a_domain', // junk → getExpert falls back to the GeneralExpert
      processType: 'progressive',
      isHabit: false,
      milestones: [],
      failureRisks: [],
      timing: {},
    } as unknown as GoalSpec;

    const plan = buildJourneyInput(spec, undefined, { now: NOW });
    expect(plan.milestones?.map((m) => m.title)).toEqual(GOAL_ARC);
    expect(plan.milestones?.map((m) => m.title)).not.toEqual(BODY_IMAGE_ARC);
  });

  it('creates a domain-routed live Journey through the JourneyEngine', () => {
    const spec: GoalSpec = {
      title: 'Get stronger',
      domain: 'body_image',
      processType: 'progressive',
      isHabit: false,
      milestones: [],
      failureRisks: [],
      timing: { sessionMinutes: 30, sessionsPerWeek: 3 },
    };
    const state = freshState();
    const engine = new JourneyEngine(new EventBus(), () => state);

    // No explicit expert — createJourneyFromGoalSpec routes by domain too.
    const journey = createJourneyFromGoalSpec(engine, spec, undefined, { now: NOW });
    expect(journey.milestones?.map((m) => m.title)).toEqual(BODY_IMAGE_ARC);
  });
});

describe('parkedGoalToSpec (Parked/deferred goals, L1)', () => {
  it('plans a recurring parked goal via the generic habit path (isHabit true)', () => {
    const goal: ParkedGoal = { id: 'p1', title: 'Stretch every day', processType: 'recurring', domain: 'general' };
    const spec = parkedGoalToSpec(goal);

    expect(spec.title).toBe('Stretch every day');
    expect(spec.domain).toBe('general');
    expect(spec.processType).toBe('recurring');
    expect(spec.isHabit).toBe(true);
    expect(spec.milestones).toEqual([]);
    expect(spec.failureRisks).toEqual([]);
    expect(spec.timing).toEqual({});

    // No interview answers ⇒ the generic planJourney path lays the habit arc (not an answer-aware one).
    const plan = buildJourneyInput(spec, GeneralExpert, { now: NOW });
    expect(plan.milestones?.map((m) => m.title)).toEqual(HABIT_ARC);
  });

  it('plans a process parked goal via the generic finite-goal path (isHabit false)', () => {
    const goal: ParkedGoal = { id: 'p2', title: 'Write a short story', processType: 'process', domain: 'general' };
    const spec = parkedGoalToSpec(goal);

    expect(spec.isHabit).toBe(false);
    const plan = buildJourneyInput(spec, GeneralExpert, { now: NOW });
    expect(plan.milestones?.map((m) => m.title)).toEqual(GOAL_ARC);
  });

  it('carries no Dream signal — an activated parked goal is created UNLINKED', () => {
    const goal: ParkedGoal = { id: 'p3', title: 'Learn guitar', processType: 'process', domain: 'general' };
    expect(dreamSignalFromSpec(parkedGoalToSpec(goal))).toBeNull();
  });
});

describe('answer-aware build path (buildStructure)', () => {
  /** A body-image spec carrying the active expert's interview answers (the two-layer coach output). */
  function specWithAnswers(overrides: Partial<GoalSpec> = {}): GoalSpec {
    return {
      title: 'Get fit and feel better',
      domain: 'body_image',
      processType: 'progressive',
      isHabit: false,
      milestones: [],
      failureRisks: [],
      timing: {},
      answers: {
        'body_image.foundation': 'More energy and health',
        'body_image.baseline': 'Some movement and balance, but not consistent',
        'body_image.time': '1–3 hours',
        'body_image.obstacles': 'No time or too busy',
        'body_image.motivation': 'Feeling stronger and more energetic',
        'body_image.milestones': 'Build up in clear stages',
      },
      ...overrides,
    };
  }

  it('derives weekly availability from the expert time answer', () => {
    // "1–3 hours" is option index 1 of the body_image time question → the 120-minute bucket.
    const { constraints } = goalSpecToPlan(specWithAnswers(), BodyImageExpert);
    expect(constraints.weeklyAvailabilityMinutes).toBe(120);
  });

  it('uses buildStructure and builds a FREQUENCY-BASED plan when no specific days are set', () => {
    const spy = jest.spyOn(BodyImageExpert, 'buildStructure');
    const plan = buildJourneyInput(specWithAnswers(), BodyImageExpert, { now: NOW });
    expect(spy).toHaveBeenCalled(); // the answer-aware path, not the generic proposeMilestones one

    expect(plan.steps.length).toBeGreaterThan(1);
    // No specific days named → frequency-based: a weekly session target, no fixed dates pinned.
    expect(plan.sessionsPerWeek).toBeGreaterThan(0);
    expect(plan.steps.every((s) => s.plannedFor == null)).toBe(true);
    spy.mockRestore();
  });

  it('honours a target date, back-solving so every Step lands on/before it — still spread', () => {
    const targetDate = NOW + 40 * MS_PER_DAY;
    const plan = buildJourneyInput(
      specWithAnswers({ timing: { targetDate, preferredDays: [2, 4] } }),
      BodyImageExpert,
      { now: NOW },
    );
    const last = Math.max(...plan.steps.map((s) => s.plannedFor ?? 0));
    expect(last).toBeLessThanOrEqual(targetDate);
    const distinctDays = new Set(plan.steps.map((s) => new Date(s.plannedFor!).toDateString()));
    expect(distinctDays.size).toBeGreaterThan(1);
  });

  it('falls back to the generic path (no buildStructure) when the spec carries no answers', () => {
    const spy = jest.spyOn(BodyImageExpert, 'buildStructure');
    buildJourneyInput(
      { ...specWithAnswers(), answers: undefined },
      BodyImageExpert,
      { now: NOW },
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
