/**
 * CoachNarrator tests — the deterministic, templated S1.12 stand-in for the S2 LLM narrator.
 * Pure: fixed inputs → identical strings, no clock, no randomness. We assert the template
 * BRANCHES (no-change / tuned / at-risk; the encourage tones) and that no PII is required.
 */
import type { InsightModel } from '../../types/domain';
import { DeterministicNarrator } from '../CoachNarrator';
import type { NudgeHint, ReplanResult, StepAdjustment } from '../types';

const NUDGE: NudgeHint = { daypart: 'morning', days: [2], leadMinutes: 30, extra: false };

function result(stepAdjustments: StepAdjustment[], over: Partial<ReplanResult> = {}): ReplanResult {
  return {
    changed: stepAdjustments.length > 0,
    adjustments: stepAdjustments.length > 0 ? ['rescheduled'] : ['none'],
    stepAdjustments,
    atRisk: false,
    nudge: NUDGE,
    ...over,
  };
}

function insight(over: Partial<InsightModel> = {}): InsightModel {
  return {
    reliabilityByMilestone: { m1: 0.6 },
    slipRate: 0.05,
    preferredDaypart: 'morning',
    typicalSessionMinutes: 25,
    paceRatio: 0.9,
    atRisk: false,
    lastActivityAt: 1000,
    daysSinceLastActivity: 0,
    ...over,
  };
}

const narrator = new DeterministicNarrator();

describe('DeterministicNarrator.describeAdaptation', () => {
  it('is deterministic — same input, same string', () => {
    const r = result([{ stepId: 's1', kind: 'rescheduled', plannedFor: 5000 }]);
    expect(narrator.describeAdaptation(r)).toBe(narrator.describeAdaptation(r));
  });

  it('reports no change when nothing was adjusted', () => {
    const text = narrator.describeAdaptation(result([]));
    expect(text).toContain('no changes needed');
  });

  it('summarises the kinds of change made', () => {
    const text = narrator.describeAdaptation(
      result([
        { stepId: 's1', kind: 'rescheduled', plannedFor: 5000 },
        { stepId: 's2', kind: 'resized', estimatedDuration: 20 },
        { stepId: 's3', kind: 'removed' },
      ]),
    );
    expect(text).toContain('moved 1 step');
    expect(text).toContain('resized 1 step');
    expect(text).toContain('set aside 1 step');
  });

  it('pluralises step counts', () => {
    const text = narrator.describeAdaptation(
      result([
        { stepId: 's1', kind: 'rescheduled', plannedFor: 5000 },
        { stepId: 's2', kind: 'rescheduled', plannedFor: 6000 },
      ]),
    );
    expect(text).toContain('moved 2 steps');
  });

  it('is honest when the plan is at risk', () => {
    const text = narrator.describeAdaptation(
      result([{ stepId: 's3', kind: 'removed' }], { atRisk: true }),
    );
    expect(text.toLowerCase()).toContain('tight');
  });

  it('uses an optional journey title without requiring it', () => {
    const r = result([{ stepId: 's1', kind: 'rescheduled', plannedFor: 5000 }]);
    expect(narrator.describeAdaptation(r, { journeyTitle: 'Run 5km' })).toContain('Run 5km');
    expect(narrator.describeAdaptation(r)).not.toContain('undefined');
  });
});

describe('DeterministicNarrator.encourage', () => {
  it('rebuilds momentum when slipping / at risk', () => {
    expect(narrator.encourage(insight({ slipRate: 0.5 }))).toContain('rebuild');
    expect(narrator.encourage(insight({ atRisk: true }))).toContain('rebuild');
  });

  it('welcomes the user back after a gap', () => {
    expect(narrator.encourage(insight({ daysSinceLastActivity: 6 }))).toContain('Welcome back');
  });

  it('celebrates a strong, consistent record', () => {
    const text = narrator.encourage(insight({ reliabilityByMilestone: { m1: 0.9 } }));
    expect(text.toLowerCase()).toContain('consistently');
  });

  it('gives steady encouragement in the middle case', () => {
    expect(narrator.encourage(insight())).toContain('Steady steps');
  });
});
