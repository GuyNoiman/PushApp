/**
 * run.ts — a human-readable runner for the adaptive-coach closed-loop simulation (S1.13). It is
 * NOT a test: it runs each persona scenario and prints a compact, eyeball-friendly adaptation
 * timeline (what was due, what the user did, what slipped, and every coach re-plan + where its
 * nudges landed). Use it to SEE the loop adapt; the machine-checked proof lives in
 * `__tests__/Simulation.test.ts`.
 *
 * There is no bundler/OS here — it uses the MockReminderEngine — so it can be run with any TS
 * runner (e.g. `npx tsx src/core/learning/sim/run.ts`). Pure TypeScript; no vendor imports.
 */
import type { DayTrace, SimTrace } from './Simulation';
import { runSimulation } from './Simulation';
import { allScenarios } from './scenarios';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtOutcome(o: string): string {
  return { done: 'D', partial: 'P', couldnt: 'X', skip: '.' }[o] ?? o;
}

function printDay(d: DayTrace): void {
  const acted = d.actions.map((a) => `${fmtOutcome(a.outcome)}`).join('');
  const slips = d.slips.length > 0 ? ` slip×${d.slips.length}` : '';
  const head = `  d${String(d.dayIndex).padStart(2)} ${WEEKDAY[d.weekday]} due:${d.dueStepIds.length} [${acted}]${slips}`;
  const insight = ` pace=${d.insight.paceRatio.toFixed(2)} slip=${d.insight.slipRate.toFixed(2)}${d.insight.atRisk ? ' ATRISK' : ''}`;
  let line = head + insight;
  if (d.replan) {
    const r = d.replan;
    const kinds = `resched:${r.rescheduled} resize:${r.resized}${r.resizedDurations.length ? `(${r.resizedDurations.join(',')})` : ''} drop:${r.removed}`;
    const nudge = `nudge@${r.nudgeDaypart} days:[${r.nudgeDays.join(',')}]${r.nudgeExtra ? ' +extra' : ''} sched:[${r.scheduledWeekdays.join(',')}]${r.scheduledDaily ? '(daily)' : ''}`;
    line += `\n      ↳ REPLAN ${r.atRisk ? 'AT-RISK ' : ''}${kinds} | ${nudge}\n        "${r.narration}"`;
  }
  console.log(line);
}

function printTrace(t: SimTrace): void {
  console.log(`\n=== ${t.persona} — ${t.totalDays} days ===`);
  for (const d of t.days) printDay(d);
  console.log(
    `  → progress=${(t.finalProgress * 100).toFixed(0)}% completed=${t.completedAt != null} ` +
      `resched=${t.totalRescheduled} resize=${t.totalResized} drop=${t.totalRemoved} ` +
      `replanAtRisk=${t.everReplanAtRisk}(first d${t.firstReplanAtRiskDay ?? '-'}) ` +
      `insightAtRisk=${t.everInsightAtRisk}(first d${t.firstInsightAtRiskDay ?? '-'})`,
  );
}

export async function main(): Promise<void> {
  for (const config of allScenarios()) {
    printTrace(await runSimulation(config));
  }
}

// Run when invoked directly (best-effort; harmless under a bundler that lacks `require`).
declare const require: { main?: unknown } | undefined;
declare const module: unknown;
if (typeof require !== 'undefined' && require.main === module) {
  void main();
}
