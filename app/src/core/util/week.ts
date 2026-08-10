/**
 * week — the SINGLE authoritative definition of "when does the user's week begin" (Week Boundary
 * Preference PRD, D33). Every week-referencing surface — Missions rollover, the Streak "no-slack"
 * urgency rule, Week Review, and the Journey "Week X of Y" pager — reads its week boundaries from
 * here, so they can never drift apart.
 *
 * The start DAY is a profile-level preference (0=Sun … 6=Sat, JS `Date.getDay()` convention),
 * defaulted from the user's country/region and editable. It is held here as a plain module value so
 * the framework-free engines (which call these helpers directly, never a React hook) read the same
 * value the UI shows; the {@link ../../state/WeekStartPreference} provider is the source of truth and
 * mirrors its state in via {@link setWeekStartDay}.
 *
 * All arithmetic is CALENDAR arithmetic in device-local time (build the target Y/M/D and let `Date`
 * normalize), never a fixed number of milliseconds — so DST transitions and month/year boundaries are
 * handled correctly (PRD §6). Pure TS — no React, no vendor SDKs. IANA-zone storage, device travel and
 * multi-device sync are deferred (PRD §10) until a backend exists.
 */
import { dateKey } from './date';

/** A weekday in JS `Date.getDay()` convention: 0=Sunday … 6=Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Runtime guard for a persisted / external value. */
export function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

/**
 * The default until the profile/device sets one. Monday matches the app's previous hardcoded
 * convention (`util/date`/`util/urgency`), so behavior is unchanged if nothing overrides it; the
 * provider replaces it from the device region at boot.
 */
export const DEFAULT_WEEK_START: Weekday = 1;

let currentWeekStart: Weekday = DEFAULT_WEEK_START;

/** The currently-applied week-start day (what the framework-free engines read). */
export function getWeekStartDay(): Weekday {
  return currentWeekStart;
}

/** Set the applied week-start day. Called ONLY by the WeekStartPreference provider to mirror its state. */
export function setWeekStartDay(day: Weekday): void {
  currentWeekStart = day;
}

/** 0..6 offset of `epochMs`'s local day from the week-start day (0 = it IS the start day). */
export function dayIndexInWeek(epochMs: number, weekStart: Weekday = currentWeekStart): number {
  return (new Date(epochMs).getDay() - weekStart + 7) % 7;
}

/** Epoch ms of 00:00 local of the week-start day of the week `epochMs` falls in (calendar arithmetic). */
export function startOfWeek(epochMs: number, weekStart: Weekday = currentWeekStart): number {
  const d = new Date(epochMs);
  const offset = dayIndexInWeek(epochMs, weekStart);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset).getTime();
}

/** Epoch ms of the start of the NEXT week after the one `epochMs` is in (calendar arithmetic, DST-safe). */
export function startOfNextWeek(epochMs: number, weekStart: Weekday = currentWeekStart): number {
  const s = new Date(startOfWeek(epochMs, weekStart));
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7).getTime();
}

/** Days still left in the current week, INCLUDING today (1..7 — 7 on the start day, 1 on its last day). */
export function remainingDaysInWeek(epochMs: number, weekStart: Weekday = currentWeekStart): number {
  return 7 - dayIndexInWeek(epochMs, weekStart);
}

/** Week key = the date (YYYY-MM-DD) of this week's start day — the unit of the weekly rollover. */
export function weekKey(epochMs: number, weekStart: Weekday = currentWeekStart): string {
  return dateKey(new Date(startOfWeek(epochMs, weekStart)));
}

/**
 * The number of whole week boundaries between two instants — i.e. which week `toMs` sits in, counted
 * from the week `fromMs` sits in (0 = same week). Calendar-correct; bounded stepping is fine for the
 * app's realistic spans (a Journey is weeks-to-months). Returns 0 when `toMs` precedes `fromMs`'s week.
 */
export function weeksBetween(fromMs: number, toMs: number, weekStart: Weekday = currentWeekStart): number {
  const target = startOfWeek(toMs, weekStart);
  let cursor = startOfWeek(fromMs, weekStart);
  if (target <= cursor) return 0;
  let count = 0;
  while (cursor < target) {
    cursor = startOfNextWeek(cursor, weekStart);
    count += 1;
  }
  return count;
}
