/**
 * AdaptivePlanner tests. The pure re-planner (replan) is exercised directly with an injected
 * clock (`now`) and hand-built Journey / InsightModel / PlanConstraints fixtures — no OS, no
 * async, no bus, no randomness. Fixed inputs → deterministic output. 2026-07-14 is a Tuesday
 * (getDay 2), matching the Planner + CommunicationScheduler anchors.
 *
 * replan only COMPUTES intended stepAdjustments; nothing here asserts a side effect (mutation,
 * persistence and event emission are S1.11, out of scope).
 */
import { defaultAdaptivePolicy } from '../../config/adaptivePolicy';
import type { InsightModel, Journey, Step } from '../../types/domain';
import { replan } from '../AdaptivePlanner';
import type { PlanConstraints } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// A fixed clock so all scheduling maths is deterministic. Tue 2026-07-14, 10:00 local.
const NOW = new Date(2026, 6, 14, 10, 0, 0).getTime();

let stepSeq = 0;
function step(over: Partial<Step> = {}): Step {
  return {
    id: `step_${stepSeq++}`,
    title: 'Practice',
    isStarterStep: false,
    cadence: 'daily',
    done: false,
    milestoneId: 'm1',
    ...over,
  };
}

function journey(steps: Step[], over: Partial<Journey> = {}): Journey {
  return {
    id: 'journey_1',
    title: 'Run 5km',
    why: ['because'],
    durationDays: 60,
    rhythm: 'daily',
    steps,
    createdAt: 1000,
    milestones: [{ id: 'm1', title: 'Core', order: 0 }],
    ...over,
  };
}

function insight(over: Partial<InsightModel> = {}): InsightModel {
  return {
    reliabilityByMilestone: { m1: 0.7 },
    slipRate: 0.05,
    preferredDaypart: 'morning',
    typicalSessionMinutes: 0,
    paceRatio: 0.8,
    atRisk: false,
    lastActivityAt: NOW,
    daysSinceLastActivity: 0,
    ...over,
  };
}

function constraints(over: Partial<PlanConstraints> = {}): PlanConstraints {
  return {
    weeklyAvailabilityMinutes: 600,
    preferredDays: [],
    daypart: 'morning',
    ...over,
  };
}

const dayOf = (ms: number) => new Date(ms).getDay();
const startOfDayMs = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

beforeEach(() => {
  stepSeq = 0;
});

describe('replan — on-track goal makes no change', () => {
  it('leaves a well-scheduled, feasible, mid-reliability plan untouched', () => {
    const targetDate = NOW + 40 * MS_PER_DAY;
    const steps = [
      step({ plannedFor: NOW + 3 * MS_PER_DAY, estimatedDuration: 20, difficulty: 3 }),
      step({ plannedFor: NOW + 6 * MS_PER_DAY, estimatedDuration: 20, difficulty: 3 }),
    ];
    const result = replan(journey(steps), insight(), constraints({ targetDate }), undefined, NOW);

    expect(result.changed).toBe(false);
    expect(result.stepAdjustments).toEqual([]);
    expect(result.adjustments).toEqual(['none']);
    expect(result.atRisk).toBe(false);
  });

  it('ignores already-done Steps entirely', () => {
    const steps = [
      step({ done: true, plannedFor: NOW - 5 * MS_PER_DAY }),
      step({ plannedFor: NOW + 3 * MS_PER_DAY, estimatedDuration: 20 }),
    ];
    const result = replan(journey(steps), insight(), constraints({ targetDate: NOW + 40 * MS_PER_DAY }), undefined, NOW);
    expect(result.changed).toBe(false);
  });
});

describe('replan — behind a deadline compresses the remaining Steps earlier', () => {
  it('reschedules remaining Steps toward the deadline without shedding load when it still fits', () => {
    const targetDate = NOW + 30 * MS_PER_DAY;
    // Steps currently laid out very late, near the deadline → compression should pull them earlier.
    const steps = [
      step({ plannedFor: NOW + 25 * MS_PER_DAY, estimatedDuration: 20 }),
      step({ plannedFor: NOW + 27 * MS_PER_DAY, estimatedDuration: 20 }),
      step({ plannedFor: NOW + 29 * MS_PER_DAY, estimatedDuration: 20 }),
    ];
    const behind = insight({ paceRatio: 0.3 });
    const result = replan(journey(steps), behind, constraints({ targetDate }), undefined, NOW);

    expect(result.changed).toBe(true);
    expect(result.adjustments).toContain('rescheduled');
    expect(result.adjustments).not.toContain('removed');
    expect(result.atRisk).toBe(false);

    // Every reschedule lands on/before the deadline and earlier than the original late layout.
    const reslots = result.stepAdjustments.filter((a) => a.kind === 'rescheduled');
    expect(reslots.length).toBeGreaterThan(0);
    for (const a of reslots) {
      expect(startOfDayMs(a.plannedFor!)).toBeLessThanOrEqual(startOfDayMs(targetDate));
      expect(a.plannedFor!).toBeLessThan(NOW + 25 * MS_PER_DAY);
    }
  });
});

describe('replan — deadline load-shedding, then at-risk honesty', () => {
  it('shrinks sessions and drops scope when compression alone cannot fit the work, flagging at-risk', () => {
    // 6 long Steps, tiny weekly budget, a near deadline → cannot possibly hold full scope.
    const targetDate = NOW + 7 * MS_PER_DAY; // effective deadline (−2 buffer) = NOW+5d, ~5 days capacity
    const steps = Array.from({ length: 6 }, () =>
      step({ plannedFor: NOW + 6 * MS_PER_DAY, estimatedDuration: 60 }),
    );
    // weeklyAvailability 140 → capacity ≈ 140 * 5/7 = 100 min; 6×60 cannot fit even shrunk to 45.
    const result = replan(
      journey(steps),
      insight({ paceRatio: 0.3 }),
      constraints({ targetDate, weeklyAvailabilityMinutes: 140 }),
      undefined,
      NOW,
    );

    expect(result.atRisk).toBe(true);
    expect(result.adjustments).toContain('resized'); // sessions shrunk (load-shed)
    expect(result.adjustments).toContain('removed'); // scope dropped
    // The surviving Steps were shrunk toward the floor.
    const resized = result.stepAdjustments.filter((a) => a.kind === 'resized');
    for (const a of resized) expect(a.estimatedDuration!).toBeLessThan(60);
    // At-risk plan asks for an extra pre-reminder.
    expect(result.nudge.extra).toBe(true);
  });

  it('sets at-risk when the deadline is already within the buffer (no time left)', () => {
    const targetDate = NOW + 1 * MS_PER_DAY; // inside the 2-day buffer → zero real capacity
    const steps = [step({ plannedFor: NOW + 0.5 * MS_PER_DAY, estimatedDuration: 30 })];
    const result = replan(
      journey(steps),
      insight({ paceRatio: 0.4 }),
      constraints({ targetDate, weeklyAvailabilityMinutes: 600 }),
      undefined,
      NOW,
    );
    expect(result.atRisk).toBe(true);
    expect(result.adjustments).toContain('removed');
    // A reschedule is never placed past the hard target date.
    for (const a of result.stepAdjustments.filter((x) => x.kind === 'rescheduled')) {
      expect(a.plannedFor!).toBeLessThanOrEqual(targetDate);
    }
  });
});

describe('replan — open-ended habit that is slipping shrinks the session', () => {
  it('shrinks every remaining Step toward the floor and never reschedules or drops scope', () => {
    const steps = [
      step({ plannedFor: NOW + 1 * MS_PER_DAY, estimatedDuration: 40 }),
      step({ plannedFor: NOW + 2 * MS_PER_DAY, estimatedDuration: 40 }),
    ];
    // No targetDate → open-ended; high slipRate → slipping.
    const result = replan(journey(steps), insight({ slipRate: 0.5 }), constraints(), undefined, NOW);

    expect(result.changed).toBe(true);
    expect(result.adjustments).toEqual(['resized']); // only smaller sessions — no reschedule, no removal
    expect(result.atRisk).toBe(false); // open-ended plans have no deadline to miss
    for (const a of result.stepAdjustments) {
      expect(a.kind).toBe('resized');
      expect(a.estimatedDuration!).toBe(30); // 40 * (1 − 0.25)
    }
  });

  it('leaves an on-track open-ended habit untouched', () => {
    const steps = [step({ plannedFor: NOW + 1 * MS_PER_DAY, estimatedDuration: 40 })];
    const result = replan(journey(steps), insight(), constraints(), undefined, NOW);
    expect(result.changed).toBe(false);
    expect(result.atRisk).toBe(false);
  });
});

describe('replan — low Milestone reliability lowers difficulty and eases the session', () => {
  it('drops difficulty by the policy step and shrinks the struggling Milestone, sparing others', () => {
    const steps = [
      step({ milestoneId: 'm_hard', estimatedDuration: 40, difficulty: 4, plannedFor: NOW + 1 * MS_PER_DAY }),
      step({ milestoneId: 'm_ok', estimatedDuration: 40, difficulty: 4, plannedFor: NOW + 2 * MS_PER_DAY }),
    ];
    const j = journey(steps, {
      milestones: [
        { id: 'm_hard', title: 'Hard', order: 0 },
        { id: 'm_ok', title: 'OK', order: 1 },
      ],
    });
    // Open-ended, not slipping globally → isolates the per-Milestone reliability response.
    const model = insight({ reliabilityByMilestone: { m_hard: 0.2, m_ok: 0.7 }, slipRate: 0.05 });
    const result = replan(j, model, constraints(), undefined, NOW);

    expect(result.adjustments).toEqual(['resized']);
    expect(result.stepAdjustments).toHaveLength(1); // only the struggling Milestone's Step
    const adj = result.stepAdjustments[0];
    expect(adj.stepId).toBe(steps[0].id);
    expect(adj.difficulty).toBe(3); // 4 − 1 policy step
    expect(adj.estimatedDuration).toBe(30); // 40 * (1 − 0.25)
  });
});

describe('replan — a consistently strong Milestone grows and is pulled earlier', () => {
  it('grows the session and reschedules earlier to bank buffer', () => {
    const targetDate = NOW + 40 * MS_PER_DAY;
    const steps = [
      step({ estimatedDuration: 20, difficulty: 2, plannedFor: NOW + 35 * MS_PER_DAY }),
      step({ estimatedDuration: 20, difficulty: 2, plannedFor: NOW + 38 * MS_PER_DAY }),
    ];
    const strong = insight({ paceRatio: 0.95, reliabilityByMilestone: { m1: 0.95 } });
    const result = replan(journey(steps), strong, constraints({ targetDate }), undefined, NOW);

    expect(result.changed).toBe(true);
    expect(result.adjustments).toContain('resized');
    expect(result.adjustments).toContain('rescheduled');
    expect(result.adjustments).not.toContain('removed');
    expect(result.atRisk).toBe(false);

    const resized = result.stepAdjustments.filter((a) => a.kind === 'resized');
    for (const a of resized) expect(a.estimatedDuration!).toBe(25); // 20 * (1 + 0.25)
    // Pulled earlier than the original late layout.
    for (const a of result.stepAdjustments.filter((x) => x.kind === 'rescheduled')) {
      expect(a.plannedFor!).toBeLessThan(NOW + 35 * MS_PER_DAY);
    }
  });
});

describe('replan — nudge hints reflect the observed day-part and scheduled days', () => {
  it('emits the preferred day-part, the policy lead time, and the weekdays the plan lands on', () => {
    // Tue 2026-07-14; +2d = Thu(4), +4d = Sat(6).
    const steps = [
      step({ plannedFor: NOW + 2 * MS_PER_DAY, estimatedDuration: 20 }),
      step({ plannedFor: NOW + 4 * MS_PER_DAY, estimatedDuration: 20 }),
    ];
    const result = replan(journey(steps), insight({ preferredDaypart: 'evening' }), constraints(), undefined, NOW);

    expect(result.nudge.daypart).toBe('evening');
    expect(result.nudge.leadMinutes).toBe(defaultAdaptivePolicy.nudge.leadMinutes);
    expect(result.nudge.extra).toBe(false);
    expect(result.nudge.days).toEqual([dayOf(NOW + 2 * MS_PER_DAY), dayOf(NOW + 4 * MS_PER_DAY)].sort((a, b) => a - b));
  });
});

describe('replan — determinism & empty input', () => {
  it('is deterministic — identical inputs yield identical output', () => {
    const steps = [step({ plannedFor: NOW + 20 * MS_PER_DAY, estimatedDuration: 20 })];
    const c = constraints({ targetDate: NOW + 30 * MS_PER_DAY });
    const a = replan(journey(steps), insight({ paceRatio: 0.3 }), c, undefined, NOW);
    stepSeq = 0;
    const steps2 = [step({ plannedFor: NOW + 20 * MS_PER_DAY, estimatedDuration: 20 })];
    const b = replan(journey(steps2), insight({ paceRatio: 0.3 }), c, undefined, NOW);
    expect(a).toEqual(b);
  });

  it('handles a Journey whose Steps are all done — no changes, neutral nudge', () => {
    const steps = [step({ done: true }), step({ done: true })];
    const result = replan(journey(steps), insight(), constraints(), undefined, NOW);
    expect(result.changed).toBe(false);
    expect(result.stepAdjustments).toEqual([]);
    expect(result.adjustments).toEqual(['none']);
    expect(result.nudge.days).toEqual([]);
  });
});
