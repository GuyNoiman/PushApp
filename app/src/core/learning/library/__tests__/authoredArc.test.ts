/**
 * An authored arc is CONTENT — Milestones, Steps, minutes and i18n keys, written by whoever knows
 * the domain rather than by whoever knows the code. These tests are the guard rail for that: the
 * mistakes below would not crash anything, they would ship a Milestone the user can never complete
 * or a Step permanently locked behind one in another stage.
 *
 * The build test asserts the other half — that an arc reaches the Planner through the SAME
 * PlanStructure contract a domain expert returns, so nothing downstream has to know which it was.
 */
import { buildProcessStructure, validateAuthoredArc, type AuthoredArc } from '../authoredArc';

const ARC: AuthoredArc = {
  milestones: [
    { id: 'm0', title: 'Know what you are choosing between', titleKey: 'test.arc.m0', weight: 1 },
    { id: 'm1', title: 'Test the leading option', titleKey: 'test.arc.m1', weight: 2 },
  ],
  steps: [
    {
      id: 's0',
      milestoneId: 'm0',
      title: 'Name the two options',
      titleKey: 'test.arc.s0.title',
      description: 'Two real ones, not every possibility.',
      descriptionKey: 'test.arc.s0.description',
      estimatedMinutes: 10,
      difficulty: 1,
    },
    {
      id: 's1',
      milestoneId: 'm0',
      title: 'Write down what would make one of them right',
      titleKey: 'test.arc.s1.title',
      estimatedMinutes: 20,
      difficulty: 2,
      dependsOnStepId: 's0',
    },
    {
      id: 's2',
      milestoneId: 'm1',
      title: 'Try the smallest real version of the leading option',
      titleKey: 'test.arc.s2.title',
      estimatedMinutes: 30,
      difficulty: 3,
    },
  ],
};

describe('content mistakes that would otherwise ship silently', () => {
  it('accepts a well-formed arc', () => {
    expect(validateAuthoredArc(ARC)).toEqual([]);
  });

  it('rejects a Step in a Milestone that does not exist', () => {
    const arc = { ...ARC, steps: [{ ...ARC.steps[0], milestoneId: 'nope' }] };
    expect(validateAuthoredArc(arc).join(' ')).toContain('unknown Milestone');
  });

  it('rejects a Milestone with no Steps — a stage the user can never complete', () => {
    const arc = { ...ARC, steps: ARC.steps.filter((s) => s.milestoneId === 'm0') };
    expect(validateAuthoredArc(arc).join(' ')).toContain('m1 has no Steps');
  });

  it('rejects a dependency that runs forwards', () => {
    const steps = [{ ...ARC.steps[0], dependsOnStepId: 's1' }, ARC.steps[1], ARC.steps[2]];
    expect(validateAuthoredArc({ ...ARC, steps }).join(' ')).toContain('comes later');
  });

  it('rejects a dependency across a Milestone boundary', () => {
    const steps = [ARC.steps[0], ARC.steps[1], { ...ARC.steps[2], dependsOnStepId: 's1' }];
    expect(validateAuthoredArc({ ...ARC, steps }).join(' ')).toContain('another Milestone');
  });

  it('rejects an unknown predecessor and a duplicate id', () => {
    const missing = { ...ARC, steps: [{ ...ARC.steps[0], dependsOnStepId: 'ghost' }] };
    expect(validateAuthoredArc(missing).join(' ')).toContain('unknown predecessor');
    const duplicate = { ...ARC, steps: [ARC.steps[0], { ...ARC.steps[1], id: 's0' }, ARC.steps[2]] };
    expect(validateAuthoredArc(duplicate).join(' ')).toContain('duplicate Step id');
  });

  it('rejects impossible minutes and an out-of-range difficulty', () => {
    const zero = { ...ARC, steps: [{ ...ARC.steps[0], estimatedMinutes: 0 }] };
    expect(validateAuthoredArc(zero).join(' ')).toContain('non-positive minutes');
    const hard = { ...ARC, steps: [{ ...ARC.steps[0], difficulty: 9 }] };
    expect(validateAuthoredArc(hard).join(' ')).toContain('difficulty out of 1..5');
  });
});

describe('building the plan structure', () => {
  it('keeps the authored order, groups Steps under their own Milestone, and carries the copy', () => {
    const structure = buildProcessStructure(ARC);
    expect(structure.milestones.map((m) => m.title)).toEqual([
      'Know what you are choosing between',
      'Test the leading option',
    ]);
    expect(structure.milestones[1].weight).toBe(2);
    expect(structure.stepsByMilestone.map((steps) => steps.length)).toEqual([2, 1]);
    expect(structure.stepsByMilestone[0][0].description).toBe('Two real ones, not every possibility.');
    expect(structure.stepsByMilestone[0][0].estimatedMinutes).toBe(10);
  });

  it('carries the dependency by TEMPLATE ID, because no Step has been minted yet', () => {
    const structure = buildProcessStructure(ARC);
    expect(structure.stepsByMilestone[0][1].dependsOnTemplateId).toBe('s0');
    expect(structure.stepsByMilestone[0][1].id).toBe('s1');
    expect(structure.stepsByMilestone[0][0].dependsOnTemplateId).toBeUndefined();
  });

  it('falls back to the authored English when the cache has no translation for a key', () => {
    // The keys above exist in no resource file, which is exactly the missing-translation case: the
    // user must read a sentence, never a key.
    const structure = buildProcessStructure(ARC);
    expect(structure.stepsByMilestone[1][0].title).toBe(
      'Try the smallest real version of the leading option',
    );
  });
});
