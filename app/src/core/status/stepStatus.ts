/**
 * stepStatus — the SINGLE pure derivation of a Step's Daily-Reporting status (D35 §5 / D36).
 *
 * There is no stored `Step.status` enum: the four product statuses are DERIVED from the existing
 * model — `done` / `dropped`, the append-only `reasonLog`, and the {@link Step.lastReportClearedAt}
 * marker a reversal stamps. Keeping this in one pure function means Home, the Journey detail, and the
 * snapshot all read the same status and can never drift.
 *
 * Progress stays BINARY (D35.4): a partial carries no numeric weight; this helper only classifies.
 *
 * Pure TS — no React, no vendor imports, no clock reads (a caller passes the log).
 */
import type { ReasonEntry, Step } from '../types/domain';

/**
 * A Step's product-level reporting status, DERIVED (never stored):
 * - `unreported` — the default; no terminal report stands (a postpone is an ACTION, not a status — D37);
 * - `completed` — the Step was checked in (`done === true`);
 * - `partially_completed` — a `did_partially` (Partial) report; `done` stays `false`, a NON-failure state;
 * - `not_completed` — a "couldn't"/let-go report (a `cancel` action; `StepCancelled`).
 */
export type StepStatus = 'unreported' | 'completed' | 'partially_completed' | 'not_completed';

/**
 * Whether a reason entry represents a TERMINAL report that sets a status (vs a plain postpone, which
 * leaves the Step `unreported`): a Partial (`did_partially`) or a let-go (`cancel` action → not
 * completed). Other reasons attached to a postpone are not terminal.
 *
 * Exported so the reason-log cap ({@link JourneyEngine.capReasonLog}) can protect the newest terminal
 * row from eviction — a burst of later postpones must never silently revert the derived status (D36).
 */
export function isTerminalReport(entry: ReasonEntry): boolean {
  return entry.reasonId === 'did_partially' || entry.action === 'cancel';
}

/**
 * Derive a Step's {@link StepStatus} from its own fields + the per-user `reasonLog`.
 *
 * Priority:
 *   1. a `dropped` Step is out of reporting scope → `unreported` (it carries no report);
 *   2. `done === true` → `completed` (a reversal clears `done` first, so this is authoritative);
 *   3. otherwise the LATEST terminal report for this Step that a clear has not superseded —
 *      `did_partially` → `partially_completed`, a `cancel` → `not_completed`;
 *   4. nothing standing → `unreported`.
 *
 * `lastReportClearedAt` SUPERSEDES older terminal rows: entries at/older than the clear no longer
 * determine status, but they remain in the append-only log as history (no XP clawback, no data lost).
 */
export function deriveStepStatus(step: Step, reasonLog: readonly ReasonEntry[] = []): StepStatus {
  if (step.dropped) return 'unreported';
  if (step.done) return 'completed';

  const clearedAt = step.lastReportClearedAt ?? 0;
  let latest: ReasonEntry | undefined;
  for (const entry of reasonLog) {
    if (entry.stepId !== step.id) continue;
    // STRICTLY older than the clear is superseded; an entry AT the clear instant still counts.
    // This is the `<` vs `<=` tradeoff, and it cuts both ways at the same millisecond:
    //   - reverse-THEN-apply (completed → couldn't/partial): the new report may share the clear's ms
    //     and MUST stand — `<` keeps it (the behaviour we want, and the common correction path);
    //   - apply-THEN-reverse ("not reported yet") in the same ms: the just-cleared row would also be
    //     kept, so the status would NOT drop to `unreported` until a later-ms clear. Accepted edge —
    //     inherent to ms-granularity timestamps; real user taps are milliseconds apart (#4).
    if (entry.at < clearedAt) continue;
    if (!isTerminalReport(entry)) continue;
    // `>=` so, among equal timestamps, the last-appended (most recent) entry wins.
    if (!latest || entry.at >= latest.at) latest = entry;
  }

  if (!latest) return 'unreported';
  if (latest.reasonId === 'did_partially') return 'partially_completed';
  return 'not_completed';
}
