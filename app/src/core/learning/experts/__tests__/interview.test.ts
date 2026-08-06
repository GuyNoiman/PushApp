/**
 * DomainExpert interview tests (coach redesign, SX). Every expert OWNS its interview: an
 * ordered (general → specific) set of closed-option questions with an "Other" escape, an honest
 * feasibility check, a usesMilestones decision, and answer-aware structure-building (a beginner
 * baseline yields an easier, shorter start than an advanced one). Fully deterministic — no OS,
 * no async, no randomness, no network.
 */
import {
  GeneralExpert,
  type DomainExpert,
  type DomainQuestion,
  type InterviewAnswers,
  type QuestionIntent,
} from '../../DomainExpert';
import type { GoalInput, PlanConstraints } from '../../types';
import {
  AddictionExpert,
  BodyImageExpert,
  CareerExpert,
  RelationshipsExpert,
} from '..';

function goal(over: Partial<GoalInput> = {}): GoalInput {
  return { title: 'Become who I choose to be', isHabit: true, ...over };
}

function constraints(over: Partial<PlanConstraints> = {}): PlanConstraints {
  return { weeklyAvailabilityMinutes: 120, preferredDays: [], daypart: 'morning', ...over };
}

/** The funnel order the interviews walk — general → specific. */
const INTENT_RANK: Record<QuestionIntent, number> = {
  foundation: 0,
  baseline: 1,
  time: 2,
  obstacles: 3,
  motivation: 4,
  milestones: 5,
};

const EXPERTS: ReadonlyArray<readonly [string, DomainExpert]> = [
  ['addiction', AddictionExpert],
  ['relationships', RelationshipsExpert],
  ['body_image', BodyImageExpert],
  ['career', CareerExpert],
  ['general', GeneralExpert],
];

const baselineQuestion = (qs: DomainQuestion[]) => qs.find((q) => q.intent === 'baseline')!;
const milestonesQuestion = (qs: DomainQuestion[]) => qs.find((q) => q.intent === 'milestones')!;

describe.each(EXPERTS)('%s expert — interview', (_id, expert) => {
  const questions = expert.interviewQuestions!(goal());

  it('exposes all four interview methods', () => {
    expect(typeof expert.interviewQuestions).toBe('function');
    expect(typeof expert.assessFeasibility).toBe('function');
    expect(typeof expert.usesMilestones).toBe('function');
    expect(typeof expert.buildStructure).toBe('function');
  });

  it('asks a well-formed, ordered (general → specific) question set', () => {
    expect(questions.length).toBeGreaterThan(0);
    let lastRank = -1;
    const ids = new Set<string>();
    for (const q of questions) {
      expect(q.id.trim().length).toBeGreaterThan(0);
      expect(ids.has(q.id)).toBe(false); // ids are unique within the expert
      ids.add(q.id);
      expect(q.prompt.trim().length).toBeGreaterThan(0);
      expect(q.options.length).toBeGreaterThanOrEqual(2); // ≥2 closed options
      for (const o of q.options) expect(o.trim().length).toBeGreaterThan(0);
      expect(q.allowOther).toBe(true); // always an "Other" escape
      // Funnel is non-decreasing: never a more-specific intent before a more-general one.
      expect(INTENT_RANK[q.intent]).toBeGreaterThanOrEqual(lastRank);
      lastRank = INTENT_RANK[q.intent];
    }
  });

  it('covers the funnel with a foundation, a baseline and a time question', () => {
    const intents = new Set(questions.map((q) => q.intent));
    expect(intents.has('foundation')).toBe(true);
    expect(intents.has('baseline')).toBe(true);
    expect(intents.has('time')).toBe(true);
  });

  it('returns fresh question copies (no shared-config mutation)', () => {
    const a = expert.interviewQuestions!(goal());
    const b = expert.interviewQuestions!(goal());
    expect(a).not.toBe(b);
    a[0].options.push('mutated');
    expect(b[0].options).not.toContain('mutated');
  });

  it('assessFeasibility returns one of the three verdicts with a note', () => {
    const result = expert.assessFeasibility!({}, constraints());
    expect(['reasonable', 'ambitious', 'tooAmbitious']).toContain(result.verdict);
    expect(result.note.trim().length).toBeGreaterThan(0);
  });

  it('grades an experienced user with ample time easier than a novice with none', () => {
    const baseline = baselineQuestion(questions);
    const novice: InterviewAnswers = { [baseline.id]: baseline.options[0] };
    const advanced: InterviewAnswers = {
      [baseline.id]: baseline.options[baseline.options.length - 1],
    };
    const noviceVerdict = expert.assessFeasibility!(
      novice,
      constraints({ weeklyAvailabilityMinutes: 0 }),
    ).verdict;
    const advancedVerdict = expert.assessFeasibility!(
      advanced,
      constraints({ weeklyAvailabilityMinutes: 600 }),
    ).verdict;
    expect(noviceVerdict).toBe('tooAmbitious');
    expect(advancedVerdict).toBe('reasonable');
  });

  it('usesMilestones is a boolean and honours the "keep it simple" choice', () => {
    expect(typeof expert.usesMilestones!({})).toBe('boolean');
    expect(expert.usesMilestones!({})).toBe(true); // default: staged
    const ms = milestonesQuestion(questions);
    const keepSimple: InterviewAnswers = { [ms.id]: ms.options[1] };
    expect(expert.usesMilestones!(keepSimple)).toBe(false);
  });

  it('builds an easier, shorter start for a beginner than for an advanced user', () => {
    const baseline = baselineQuestion(questions);
    const beginner = expert.buildStructure!(
      goal(),
      { [baseline.id]: baseline.options[0] },
      constraints(),
    );
    const advanced = expert.buildStructure!(
      goal(),
      { [baseline.id]: baseline.options[baseline.options.length - 1] },
      constraints(),
    );

    // Structure is internally consistent: one Step list per Milestone, all non-empty.
    for (const s of [beginner, advanced]) {
      expect(s.milestones.length).toBeGreaterThan(0);
      expect(s.stepsByMilestone.length).toBe(s.milestones.length);
      for (const list of s.stepsByMilestone) expect(list.length).toBeGreaterThan(0);
    }

    const firstStep = (structure: typeof beginner) => structure.stepsByMilestone[0][0];
    expect(firstStep(beginner).difficulty).toBeLessThan(firstStep(advanced).difficulty);
    expect(firstStep(beginner).estimatedMinutes).toBeLessThan(firstStep(advanced).estimatedMinutes);
  });

  it('collapses to a single Milestone when the user prefers no stages', () => {
    const ms = milestonesQuestion(questions);
    const structure = expert.buildStructure!(goal(), { [ms.id]: ms.options[1] }, constraints());
    expect(structure.milestones.length).toBe(1);
    expect(structure.stepsByMilestone.length).toBe(1);
    expect(structure.stepsByMilestone[0].length).toBeGreaterThan(0);
  });
});
