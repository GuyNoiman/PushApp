/**
 * DomainExpert first-cut tests (SX.1). Each expert must return non-empty, well-formed
 * Milestones + Step templates and at least one advisory risk signal; the registry must
 * resolve every id to its expert and fall back to the GeneralExpert for unknown ids. Also
 * checks each expert plans end-to-end through the domain-ignorant Planner. Fully deterministic
 * — no OS, no async, no randomness, no network.
 */
import { GeneralExpert, type DomainExpert } from '../../DomainExpert';
import { planJourney } from '../../Planner';
import type { GoalInput, PlanConstraints } from '../../types';
import {
  AddictionExpert,
  BodyImageExpert,
  CareerExpert,
  DOMAIN_IDS,
  DomainExpertRegistry,
  getExpert,
  isDomainId,
  RelationshipsExpert,
  type DomainId,
} from '..';

// Fixed clock so any scheduling maths stays deterministic. Tue 2026-07-14, 10:00 local.
const NOW = new Date(2026, 6, 14, 10, 0, 0).getTime();

function goal(over: Partial<GoalInput> = {}): GoalInput {
  return { title: 'Become who I choose to be', isHabit: true, ...over };
}

function constraints(over: Partial<PlanConstraints> = {}): PlanConstraints {
  return {
    weeklyAvailabilityMinutes: 120,
    preferredDays: [],
    daypart: 'morning',
    ...over,
  };
}

const SPECIALISTS: ReadonlyArray<readonly [DomainId, DomainExpert]> = [
  ['addiction', AddictionExpert],
  ['relationships', RelationshipsExpert],
  ['body_image', BodyImageExpert],
  ['career', CareerExpert],
];

describe.each(SPECIALISTS)('%s expert — shape', (_id, expert) => {
  const milestones = expert.proposeMilestones(goal(), constraints());

  it('proposes a non-empty, well-formed Milestone arc', () => {
    expect(milestones.length).toBeGreaterThan(0);
    for (const m of milestones) {
      expect(typeof m.title).toBe('string');
      expect(m.title.trim().length).toBeGreaterThan(0);
      if (m.weight !== undefined) expect(m.weight).toBeGreaterThan(0);
    }
  });

  it('returns non-empty, well-formed Step templates for every Milestone', () => {
    for (const m of milestones) {
      const steps = expert.stepTemplatesFor(m, goal());
      expect(steps.length).toBeGreaterThan(0);
      for (const s of steps) {
        expect(s.title.trim().length).toBeGreaterThan(0);
        expect(s.estimatedMinutes).toBeGreaterThan(0);
        expect(s.difficulty).toBeGreaterThanOrEqual(1);
        expect(s.difficulty).toBeLessThanOrEqual(5);
      }
    }
  });

  it('surfaces at least one well-formed risk signal', () => {
    const signals = expert.riskSignals?.(goal(), constraints()) ?? [];
    expect(signals.length).toBeGreaterThan(0);
    for (const r of signals) {
      expect(typeof r.code).toBe('string');
      expect(r.message.trim().length).toBeGreaterThan(0);
    }
  });

  it('does not leak the shared Milestone catalog (fresh copies each call)', () => {
    const a = expert.proposeMilestones(goal(), constraints());
    const b = expert.proposeMilestones(goal(), constraints());
    expect(a).not.toBe(b);
    a[0].title = 'mutated';
    expect(b[0].title).not.toBe('mutated');
  });

  it('plans end-to-end through the domain-ignorant Planner', () => {
    const plan = planJourney(goal(), constraints(), expert, { now: NOW });
    const planMilestones = plan.milestones ?? [];
    expect(planMilestones.length).toBe(milestones.length);
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps[0].isStarterStep).toBe(true);
    // Every Step is wired to a real Milestone.
    const ids = new Set(planMilestones.map((m) => m.id));
    for (const s of plan.steps) expect(ids.has(s.milestoneId!)).toBe(true);
  });
});

describe('DomainExpertRegistry', () => {
  it('lists every domain id, general included', () => {
    expect([...DOMAIN_IDS].sort()).toEqual(
      ['addiction', 'body_image', 'career', 'general', 'relationships'].sort(),
    );
  });

  it('resolves each id to its own expert instance', () => {
    expect(getExpert('addiction')).toBe(AddictionExpert);
    expect(getExpert('relationships')).toBe(RelationshipsExpert);
    expect(getExpert('body_image')).toBe(BodyImageExpert);
    expect(getExpert('career')).toBe(CareerExpert);
    expect(getExpert('general')).toBe(GeneralExpert);
  });

  it('every id in DOMAIN_IDS resolves via the registry table', () => {
    for (const id of DOMAIN_IDS) {
      expect(DomainExpertRegistry[id]).toBe(getExpert(id));
    }
  });

  it('falls back to the GeneralExpert for unknown, empty, or absent ids', () => {
    expect(getExpert('running')).toBe(GeneralExpert);
    expect(getExpert('')).toBe(GeneralExpert);
    expect(getExpert(undefined)).toBe(GeneralExpert);
    expect(getExpert(null)).toBe(GeneralExpert);
  });

  it('isDomainId narrows only known ids', () => {
    expect(isDomainId('body_image')).toBe(true);
    expect(isDomainId('general')).toBe(true);
    expect(isDomainId('unknown')).toBe(false);
    expect(isDomainId(42)).toBe(false);
    expect(isDomainId(undefined)).toBe(false);
  });
});
