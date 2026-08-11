/**
 * availability — the SINGLE service that resolves the account-level **Active Hours**
 * (D40) for a given weekday, so every communication-scheduling surface (the
 * CommunicationScheduler today, the Miss-Recovery reschedule helper, and a future
 * per-Journey window validator) reads ONE definition and can never drift apart.
 *
 * Active Hours are the outer per-day boundary within which the app may send optional
 * reminders. Enforcement is CLAMP, not disable (D40): a firing time outside an
 * enabled day's window is moved to the nearest allowed minute inside it (via
 * {@link clampMinuteToWindow}); a DISABLED day allows nothing, so no reminder is
 * scheduled for it.
 *
 * Single source of truth: {@link SchedulingPrefs.activeHours} is authoritative when
 * present; otherwise the legacy {@link SchedulingPrefs.window} (or all-day when that
 * is undefined too) applies. The two are never consulted together.
 *
 * Pure TS — no clock read, no vendor imports. Builds on the minute-of-day window
 * helpers in `util/date` so there is one clamp/contains convention.
 */
import type { ActiveHours, AllowedWindow, DayActiveHours, SchedulingPrefs } from '../types/domain';
import { isMinuteInWindow, minuteOfDay } from './date';

/**
 * The resolved availability of a single weekday:
 *  - `allDay`  — any minute is allowed (no window constraint);
 *  - `window`  — only minutes inside `window` are allowed (clamp into it);
 *  - `none`    — nothing is allowed this day (a disabled Active-Hours day).
 */
export type DayAvailability =
  | { kind: 'allDay' }
  | { kind: 'window'; window: AllowedWindow }
  | { kind: 'none' };

/** A JS weekday (0=Sun … 6=Sat) — the index into {@link ActiveHours.days}. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Whether a window covers the whole day (start === end) — the canonical "all day". */
function isAllDayWindow(w: AllowedWindow): boolean {
  return minuteOfDay(w.start) === minuteOfDay(w.end);
}

/** Normalize any number into a 0..6 weekday index (defensive against out-of-range input). */
function weekdayIndex(weekday: number): number {
  return ((weekday % 7) + 7) % 7;
}

/**
 * Resolve one weekday's availability from the scheduling prefs. The workhorse both
 * {@link isAllowed} and {@link allowedWindowFor} build on, and the one the scheduler
 * consumes directly (it needs to tell `allDay` from `none`).
 */
export function dayAvailability(weekday: number, prefs: SchedulingPrefs): DayAvailability {
  const wd = weekdayIndex(weekday);
  const ah = prefs.activeHours;
  if (ah) {
    const day: DayActiveHours | undefined = ah.days[wd];
    // A malformed/short array or a disabled day allows nothing.
    if (!day || !day.enabled) return { kind: 'none' };
    if (isAllDayWindow(day.window)) return { kind: 'allDay' };
    return { kind: 'window', window: day.window };
  }
  // Legacy fallback: the account-wide window (or all-day when unset).
  if (!prefs.window || isAllDayWindow(prefs.window)) return { kind: 'allDay' };
  return { kind: 'window', window: prefs.window };
}

/**
 * Whether the app may contact the user at `minuteOfDay` (0..1439) on `weekday`.
 * `false` for every minute of a disabled day; window-aware (cross-midnight safe)
 * otherwise. The future per-Journey validator uses this to check containment.
 */
export function isAllowed(weekday: number, minute: number, prefs: SchedulingPrefs): boolean {
  const a = dayAvailability(weekday, prefs);
  if (a.kind === 'none') return false;
  if (a.kind === 'allDay') return true;
  return isMinuteInWindow(minute, a.window);
}

/**
 * The allowed window to clamp a reminder into for `weekday`, or `null` when there is
 * no window to clamp into — i.e. the whole day is allowed (`allDay`) OR nothing is
 * allowed (`none`). Callers that must distinguish those two use {@link dayAvailability}.
 */
export function allowedWindowFor(weekday: number, prefs: SchedulingPrefs): AllowedWindow | null {
  const a = dayAvailability(weekday, prefs);
  return a.kind === 'window' ? a.window : null;
}

/**
 * Whether every weekday resolves to the SAME availability (all-day, an identical
 * window, or all-none). When true a plain daily reminder can stay a single daily
 * notification (one clamp) instead of fanning out per weekday — which keeps the
 * legacy (no Active-Hours) behavior a pure passthrough. Also true when
 * `activeHours` is absent (the legacy window applies uniformly to every day).
 */
export function isDayUniform(prefs: SchedulingPrefs): boolean {
  if (!prefs.activeHours) return true;
  const first = dayAvailability(0, prefs);
  for (let wd = 1; wd < 7; wd++) {
    if (!sameAvailability(first, dayAvailability(wd, prefs))) return false;
  }
  return true;
}

/** Structural equality of two resolved availabilities. */
function sameAvailability(a: DayAvailability, b: DayAvailability): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'window' && b.kind === 'window') {
    return (
      minuteOfDay(a.window.start) === minuteOfDay(b.window.start) &&
      minuteOfDay(a.window.end) === minuteOfDay(b.window.end)
    );
  }
  return true;
}

/** The canonical all-day window (00:00 → 00:00), used as the default per-day range. */
export function allDayWindow(): AllowedWindow {
  return { start: { hour: 0, minute: 0 }, end: { hour: 0, minute: 0 } };
}

/**
 * Coarse shape of the account's Active Hours, for a settings SUMMARY line (no i18n
 * here — the caller formats):
 *  - `allDay`       — every day is all-day-allowed (the default / nothing to show);
 *  - `sharedWindow` — every enabled day shares ONE window (and none is disabled);
 *  - `off`          — every day is disabled (no reminder hours at all);
 *  - `perDay`       — days differ (different windows, or some day disabled).
 */
export function activeHoursShape(prefs: SchedulingPrefs): 'allDay' | 'sharedWindow' | 'off' | 'perDay' {
  if (!isDayUniform(prefs)) return 'perDay';
  const first = dayAvailability(0, prefs);
  if (first.kind === 'allDay') return 'allDay';
  if (first.kind === 'none') return 'off'; // every day disabled — reminders are quiet
  return 'sharedWindow';
}

/**
 * Materialize a concrete, editable {@link ActiveHours} for the UI from the prefs —
 * defaulting an unset preference to the all-day, all-days-enabled shared view (which
 * matches the resolver's "absent = all day" semantics, so opening the editor and
 * saving without changes is a no-op). Never mutates `prefs`.
 */
export function resolveActiveHours(prefs: SchedulingPrefs): ActiveHours {
  if (prefs.activeHours) {
    // Defensive: heal a short/oversized array so the editor always has 7 days.
    const days: DayActiveHours[] = [];
    for (let wd = 0; wd < 7; wd++) {
      const d = prefs.activeHours.days[wd];
      days.push(d ? { enabled: d.enabled, window: d.window } : { enabled: true, window: allDayWindow() });
    }
    return { mode: prefs.activeHours.mode, days };
  }
  // Absent → all-day everywhere, seeded from the legacy window when one exists.
  const window = prefs.window ?? allDayWindow();
  const days: DayActiveHours[] = [];
  for (let wd = 0; wd < 7; wd++) days.push({ enabled: true, window });
  return { mode: 'shared', days };
}
