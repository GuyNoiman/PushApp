/**
 * weekGate — the PURE per-WEEK gate for Weekly Review (Weekly_Review_PRD §5/§9, D40). Given the
 * week key we last accounted for and `now`, it decides whether the authoritative week (week.ts,
 * D33) has ROLLED OVER since — i.e. a week has closed and exactly ONE Weekly Review is due for it.
 *
 * Idempotent by construction: once `lastKey` equals the current week key nothing more is due, so
 * re-opening the app in the same week never regenerates. A fresh install (`lastKey` undefined) only
 * RECORDS the current key — there is no closed week to review yet. Calendar arithmetic is delegated
 * to {@link ../util/week}, so the boundary can never drift from the rest of the app.
 *
 * Pure TS — no React, no vendor imports; `now` is injected so it is fully deterministic in tests.
 */
import { startOfWeek, weekKey } from '../util/week';

export interface WeekGateResult {
  /** True when a week closed since `lastKey` ⇒ a Weekly Review is due for the just-closed week. */
  shouldGenerate: boolean;
  /** The current week key — always the value to persist back as the new `lastKey`. */
  nextKey: string;
  /** Epoch ms of the start of the just-closed week (only when {@link shouldGenerate}). */
  windowStart?: number;
  /** Epoch ms of the start of the CURRENT week — the exclusive end of the closed week. */
  windowEnd?: number;
}

/**
 * Evaluate the gate. `lastKey` is {@link AppState.lastWeeklyReviewKey}; `now` the wall clock.
 *  - undefined `lastKey` (first ever observation) → record the current key, generate nothing;
 *  - `lastKey` === current week → nothing due (idempotent within the week);
 *  - otherwise a week (or more) has closed → generate ONE review for the MOST-RECENTLY-closed week
 *    (the week immediately before the current one), and advance the key to the current week.
 */
export function evaluateWeekGate(lastKey: string | undefined, now: number): WeekGateResult {
  const currentStart = startOfWeek(now);
  const nextKey = weekKey(now);
  if (lastKey === undefined || lastKey === nextKey) {
    return { shouldGenerate: false, nextKey };
  }
  // The most-recently-closed week is the one immediately before the current week: 1ms before the
  // current week's start lands in that week; startOfWeek of it gives its (calendar-correct) start.
  const windowStart = startOfWeek(currentStart - 1);
  return { shouldGenerate: true, nextKey, windowStart, windowEnd: currentStart };
}
