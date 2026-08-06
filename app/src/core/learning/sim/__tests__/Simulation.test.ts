/**
 * Simulation tests — the S1 PROOF that the adaptive coach's CLOSED LOOP works end to end
 * (S1.15). Each test runs a full headless {@link runSimulation} for one behaviour
 * {@link ../personas persona} over N weeks and asserts on the RECORDED ADAPTATION DECISIONS in
 * the returned trace (rescheduled / resized / dropped counts, `atRisk`, the derived InsightModel,
 * the NudgeHint, and where the CommunicationScheduler + MockReminderEngine actually placed the
 * nudges) — never on log strings. Fixed seeds + a virtual clock make every run reproducible, so
 * these assertions are exact and stable, not statistical.
 *
 * The four personas map to the four claims the loop must satisfy:
 *   - chronic-slipper → compresses + shrinks sessions, sheds scope, and is HONEST (at-risk) when a
 *     deadline becomes infeasible.
 *   - consistent      → stays steady, banks a pre-deadline buffer, and the coach barely churns it.
 *   - weekend-only    → work AND nudges concentrate on the days the user actually acts.
 *   - crams-late      → an EARLY at-risk warning and work repeatedly pulled forward.
 *
 * No OS, no network — the ReminderEngine is mocked. Pure, deterministic.
 */
import { runSimulation, type ReplanDecision, type SimTrace } from '../Simulation';
import {
  chronicSlipperScenario,
  consistentScenario,
  cramsLateScenario,
  weekendOnlyScenario,
} from '../scenarios';

/** All re-plan decisions the coach made across a run. */
function replans(trace: SimTrace): ReplanDecision[] {
  return trace.days.map((d) => d.replan).filter((r): r is ReplanDecision => r != null);
}

/** Every new session length the coach set via a `resized` adjustment, across the run. */
function resizedDurations(trace: SimTrace): number[] {
  return replans(trace).flatMap((r) => r.resizedDurations);
}

/** Count of days the on-device model read at-risk up to (and including) completion. */
function preCompletionAtRiskDays(trace: SimTrace): number {
  const end = trace.completedDayIndex ?? trace.totalDays;
  return trace.days.filter((d) => d.dayIndex <= end && d.insight.atRisk).length;
}

// Run every scenario once; the assertions below only read the resulting traces.
let consistentT: SimTrace;
let slipperT: SimTrace;
let weekendT: SimTrace;
let cramsT: SimTrace;

beforeAll(async () => {
  [consistentT, slipperT, weekendT, cramsT] = await Promise.all([
    runSimulation(consistentScenario()),
    runSimulation(chronicSlipperScenario()),
    runSimulation(weekendOnlyScenario()),
    runSimulation(cramsLateScenario()),
  ]);
});

describe('closed loop — chronic-slipper: compress, shrink, shed, then be honest (at-risk)', () => {
  it('compresses the remaining Steps earlier as the user keeps slipping', () => {
    expect(slipperT.totalRescheduled).toBeGreaterThan(0);
  });

  it('shrinks sessions toward the floor (a resized length below the original estimate)', () => {
    expect(slipperT.totalResized).toBeGreaterThan(0);
    const shrinks = resizedDurations(slipperT).filter((m) => m < 15); // original daily estimate = 15
    expect(shrinks.length).toBeGreaterThan(0);
    // Never below the policy floor.
    for (const m of resizedDurations(slipperT)) expect(m).toBeGreaterThanOrEqual(5);
  });

  it('sheds scope (drops Steps) when compression + shrinking still cannot fit the deadline', () => {
    expect(slipperT.totalRemoved).toBeGreaterThan(0);
    expect(slipperT.finalSteps.some((s) => s.dropped)).toBe(true);
  });

  it('sets atRisk and asks for an extra pre-reminder once the deadline is infeasible', () => {
    expect(slipperT.everReplanAtRisk).toBe(true);
    expect(slipperT.firstReplanAtRiskDay).not.toBeNull();
    const honest = replans(slipperT).some((r) => r.atRisk && r.nudgeExtra);
    expect(honest).toBe(true);
  });
});

describe('closed loop — consistent: steady, banks a pre-deadline buffer, minimal churn', () => {
  it('completes the Journey well before the deadline (banked buffer)', () => {
    expect(consistentT.finalProgress).toBe(1);
    expect(consistentT.completedDayIndex).not.toBeNull();
    // Deadline is 30 days out; finishing inside the first half is a real buffer.
    expect(consistentT.completedDayIndex!).toBeLessThan(consistentT.totalDays / 2);
  });

  it('is never flagged at-risk while active, and the coach never sheds scope', () => {
    expect(preCompletionAtRiskDays(consistentT)).toBe(0);
    expect(consistentT.everReplanAtRisk).toBe(false);
    expect(consistentT.totalRemoved).toBe(0);
  });

  it('only tunes the plan gently — grows sessions, never shrinks them', () => {
    const durs = resizedDurations(consistentT);
    expect(durs.length).toBeGreaterThan(0);
    for (const m of durs) expect(m).toBeGreaterThan(15); // grows only (banking), no shrink
  });

  it('churns far less than the chronically-slipping user', () => {
    expect(consistentT.totalRescheduled).toBeLessThan(slipperT.totalRescheduled);
    expect(consistentT.totalResized).toBeLessThan(slipperT.totalResized);
    expect(consistentT.totalRemoved).toBeLessThan(slipperT.totalRemoved);
  });
});

describe('closed loop — weekend-only: work and nudges concentrate on the acted days', () => {
  const WEEKEND = new Set([0, 6]);

  it('every due Step lands on a weekend', () => {
    const dueWeekdays = weekendT.days.filter((d) => d.dueStepIds.length > 0).map((d) => d.weekday);
    expect(dueWeekdays.length).toBeGreaterThan(0);
    for (const wd of dueWeekdays) expect(WEEKEND.has(wd)).toBe(true);
  });

  it('every nudge hint targets only the weekend', () => {
    const decisions = replans(weekendT);
    expect(decisions.length).toBeGreaterThan(0);
    for (const r of decisions) {
      expect(r.nudgeDays.length).toBeGreaterThan(0);
      for (const d of r.nudgeDays) expect(WEEKEND.has(d)).toBe(true);
    }
  });

  it('the CommunicationScheduler + ReminderEngine only schedule notifications on the weekend', () => {
    const scheduled = replans(weekendT).flatMap((r) => r.scheduledWeekdays);
    expect(scheduled.length).toBeGreaterThan(0);
    for (const wd of scheduled) expect(WEEKEND.has(wd)).toBe(true);
    expect(replans(weekendT).some((r) => r.scheduledDaily)).toBe(false);
  });

  it('the matched plan stays feasible — no at-risk, no shedding, and it completes', () => {
    expect(weekendT.everReplanAtRisk).toBe(false);
    expect(weekendT.totalRemoved).toBe(0);
    expect(weekendT.finalProgress).toBe(1);
  });
});

describe('closed loop — crams-late: an early at-risk warning and work pulled forward', () => {
  it('flags at-risk in the derived model almost immediately — long before the deadline', () => {
    expect(cramsT.firstInsightAtRiskDay).not.toBeNull();
    expect(cramsT.firstInsightAtRiskDay!).toBeLessThanOrEqual(3);
    // Well before the final two-week stretch the persona finally acts in.
    expect(cramsT.firstInsightAtRiskDay!).toBeLessThan(cramsT.totalDays - 14);
  });

  it('keeps reading at-risk for most of the run (a persistent, honest warning)', () => {
    expect(cramsT.insightAtRiskDayCount).toBeGreaterThan(cramsT.totalDays / 2);
  });

  it('repeatedly pulls the remaining work earlier (compression) to chase the deadline', () => {
    expect(cramsT.totalRescheduled).toBeGreaterThan(0);
    const compressingReplans = replans(cramsT).filter((r) => r.rescheduled > 0).length;
    expect(compressingReplans).toBeGreaterThan(1);
  });

  it('warns far earlier than the on-track consistent user is ever warned while active', () => {
    // The crammer is flagged at-risk almost at once; the consistent user is never flagged
    // at-risk while the Journey is still in progress.
    expect(cramsT.firstInsightAtRiskDay!).toBeLessThan(consistentT.completedDayIndex ?? Infinity);
    expect(preCompletionAtRiskDays(consistentT)).toBe(0);
  });
});

describe('simulation harness — deterministic and well-formed', () => {
  it('is reproducible: the same scenario yields an identical behaviour trace', async () => {
    // Step ids embed Date.now()+a counter (createId), so compare the id-INDEPENDENT behaviour:
    // per-day outcomes, slip counts, and every coach decision — all driven by the seed + clock.
    const shape = (t: SimTrace) => ({
      days: t.days.map((d) => ({
        dayIndex: d.dayIndex,
        weekday: d.weekday,
        due: d.dueStepIds.length,
        outcomes: d.actions.map((a) => a.outcome),
        slips: d.slips.length,
        replan: d.replan && {
          adjustments: d.replan.adjustments,
          atRisk: d.replan.atRisk,
          rescheduled: d.replan.rescheduled,
          resized: d.replan.resized,
          removed: d.replan.removed,
          resizedDurations: d.replan.resizedDurations,
          nudgeDays: d.replan.nudgeDays,
          nudgeExtra: d.replan.nudgeExtra,
          scheduledWeekdays: d.replan.scheduledWeekdays,
        },
        insight: d.insight,
      })),
      totalRescheduled: t.totalRescheduled,
      totalResized: t.totalResized,
      totalRemoved: t.totalRemoved,
      completedDayIndex: t.completedDayIndex,
    });
    const a = await runSimulation(consistentScenario());
    const b = await runSimulation(consistentScenario());
    expect(shape(b)).toEqual(shape(a));
  });

  it('records one well-formed day per simulated day', () => {
    expect(slipperT.days).toHaveLength(slipperT.totalDays);
    for (const d of slipperT.days) {
      expect(d.insight).toBeDefined();
      expect(Number.isFinite(d.insight.paceRatio)).toBe(true);
      expect(d.insight.slipRate).toBeGreaterThanOrEqual(0);
    }
  });
});
