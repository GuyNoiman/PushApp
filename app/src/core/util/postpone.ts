/**
 * postpone — the PURE date/constraint math behind Step Postponement (D37). It resolves the
 * per-occurrence "remind me later" target and reports any calendar-crossing warnings, so the
 * orchestration in AppCore and the UI stay free of clock/branch logic (Engineering Bible §19,
 * D37 §11.6d — a helper + AppCore, NOT a dedicated engine).
 *
 * Deterministic in the injected `now` (never reads the clock itself) and DST-safe: it composes the
 * SAME calendar-arithmetic helpers the rest of the app uses (`util/date`, `util/week`), never a
 * fixed number of milliseconds for day/week boundaries. Pure TS — no React, no vendor imports.
 */
import { startOfLocalDay, startOfNextLocalDay } from './date';
import { startOfWeek } from './week';

/** The fixed default postpone interval — "remind me again in two hours" (D37 §11.6b). */
export const DEFAULT_POSTPONE_MS = 2 * 60 * 60 * 1000;

/**
 * The floor the default interval may be shortened to so the reminder still fires TODAY (D37 §4 /
 * §11.6c). If even 30 minutes from now already crosses into the next day, no reminder can be made
 * today (→ `no_slot_today`).
 */
export const MIN_POSTPONE_MS = 30 * 60 * 1000;

/**
 * A small buffer kept before local midnight so a SHORTENED default lands STRICTLY inside today
 * (never at 00:00 of the next day, which would read as "tomorrow" and wrongly warn `crosses_day`).
 * The latest same-day slot is `endOfLocalDay − this`.
 */
export const DAY_END_BUFFER_MS = 60 * 1000;

/** Why a postpone-until could not be resolved — surfaced to the UI, never thrown. */
export type PostponeError =
  /** An explicitly picked time is at/behind `now` (D37 §9). */
  | 'in_past'
  /** Less than the 30-minute floor remains in the day, so no default reminder fits today (§4). */
  | 'no_slot_today';

/**
 * A calendar boundary the resolved time crosses. NOT an error — the postpone still succeeds; the UI
 * shows an honest heads-up that the original commitment won't count as met on schedule (D37 §4).
 */
export type PostponeWarning = 'crosses_day' | 'crosses_week' | 'crosses_journey_end';

/** The resolved postpone-until, or the reason it could not be resolved. */
export type PostponeResolution = { at: number } | { error: PostponeError };

/** Narrow guard: whether a {@link PostponeResolution} failed. */
export function isPostponeError(
  r: PostponeResolution,
): r is { error: PostponeError } {
  return 'error' in r;
}

/**
 * Resolve the epoch ms a Step is postponed UNTIL.
 *
 * DEFAULT path (no `chosenTime`) — the fixed 2-hour default with the day-crossing SHORTEN rule
 * (D37 §4 / §11.6c). `lastSlotToday = endOfLocalDay(now) − {@link DAY_END_BUFFER_MS}` is the latest
 * instant STRICTLY inside today:
 *   - `now + 2h ≤ lastSlotToday`         → `now + 2h` (fits inside today);
 *   - else `lastSlotToday − now ≥ 30min` → `lastSlotToday` (shortened, still today);
 *   - else                                → `{ error: 'no_slot_today' }` (under the 30-min floor).
 * The shortened target therefore never lands on the next day, so {@link postponeWarnings} does not
 * flag it as `crosses_day`.
 *
 * EXPLICIT path (`chosenTime` given, epoch ms) — honour the user's pick; only reject a time at or
 * behind `now` (`{ error: 'in_past' }`, which also covers a DST "spring-forward" gap the caller
 * mapped to a non-advancing instant). Day/week/Journey-end crossings are WARNINGS, not errors — see
 * {@link postponeWarnings}.
 */
export function resolvePostponeUntil(now: number, chosenTime?: number): PostponeResolution {
  if (chosenTime !== undefined) {
    if (chosenTime <= now) return { error: 'in_past' };
    return { at: chosenTime };
  }
  // `endOfLocalDay(now)` is 00:00 of the NEXT local day (calendar arithmetic, DST-safe); back off a
  // small buffer so the shortened target stays STRICTLY inside today.
  const lastSlotToday = startOfNextLocalDay(now) - DAY_END_BUFFER_MS;
  if (now + DEFAULT_POSTPONE_MS <= lastSlotToday) return { at: now + DEFAULT_POSTPONE_MS };
  if (lastSlotToday - now >= MIN_POSTPONE_MS) return { at: lastSlotToday };
  return { error: 'no_slot_today' };
}

/** The occurrence context {@link postponeWarnings} needs to judge a crossing (all optional). */
export interface PostponeContext {
  /** The instant the postpone was requested (injected). */
  now: number;
  /** The resolved postpone-until (from {@link resolvePostponeUntil}). */
  at: number;
  /** The occurrence's planned local day, if any — the day whose commitment must not silently slip. */
  plannedFor?: number;
  /**
   * True when this is a FLEXIBLE-WEEKLY occurrence (may move to any valid day in the open week),
   * false/undefined for a DAY-SPECIFIC one that should stay on its own day (D37 §4).
   */
  flexibleWeekly?: boolean;
  /** Epoch ms the Journey ends, when known — a target past it warns `crosses_journey_end`. */
  journeyEndsAt?: number;
}

/**
 * The calendar crossings a resolved postpone-until triggers (D37 §4), in a stable order. Pure and
 * deterministic in the injected `now`/`at`:
 *   - DAY-SPECIFIC: warns `crosses_day` when `at` lands on a later local day than the occurrence's
 *     day (its `plannedFor`, else `now`);
 *   - FLEXIBLE-WEEKLY: moving within the open week is fine; warns `crosses_week` only when `at`
 *     lands in a later week;
 *   - either kind: warns `crosses_journey_end` when `at` is past the Journey's end.
 * Returns `[]` when nothing is crossed (e.g. the shortened default, which never leaves today).
 */
export function postponeWarnings(ctx: PostponeContext): PostponeWarning[] {
  const warnings: PostponeWarning[] = [];
  const dayRef = ctx.plannedFor ?? ctx.now;
  if (ctx.flexibleWeekly) {
    if (startOfWeek(ctx.at) > startOfWeek(dayRef)) warnings.push('crosses_week');
  } else if (startOfLocalDay(ctx.at) > startOfLocalDay(dayRef)) {
    warnings.push('crosses_day');
  }
  if (ctx.journeyEndsAt != null && ctx.at > ctx.journeyEndsAt) warnings.push('crosses_journey_end');
  return warnings;
}
