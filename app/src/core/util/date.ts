/**
 * Local-date helpers — the single source of the app's "what day is it locally"
 * logic. Both the Missions rollover and the Journey recurrence read time through
 * these so there is exactly ONE clock convention (local calendar day), never two
 * that could drift apart. Pure TS — no UI/vendor imports.
 */

/** Local date key (YYYY-MM-DD) — the unit of the daily rollover. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// `weekKey` moved to `util/week.ts` — the single authoritative week-boundary service (D33), so the
// week start is the configurable profile preference (was a hardcoded Monday) and every weekly consumer
// reads ONE definition. `util/date` keeps only the day-level + minute-of-day helpers.

/** Epoch ms of the start (00:00 local) of the local day `epochMs` falls in. */
export function startOfLocalDay(epochMs: number): number {
  const d = new Date(epochMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Epoch ms of the start (00:00 local) of the day AFTER the one `epochMs` is in. */
export function startOfNextLocalDay(epochMs: number): number {
  const d = new Date(epochMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

// ── Minute-of-day window helpers ─────────────────────────────────────────────
// Shared by the CommunicationScheduler so quiet-hours / day-part clamping has ONE
// convention. A "minute of day" is 0..1439 (0 = 00:00, 1439 = 23:59). Windows are
// half-open `[start, end)` and MAY cross midnight (start > end), which every helper
// handles explicitly. Pure — no clock read, no vendor imports.

/** Minutes since local midnight for an `{hour, minute}` pair (0..1439). */
export function minuteOfDay(t: { hour: number; minute: number }): number {
  return t.hour * 60 + t.minute;
}

/** Shortest circular distance (in minutes) between two minutes-of-day (0..720). */
export function circularMinuteDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 1440;
  return Math.min(diff, 1440 - diff);
}

/**
 * Whether `m` (minute of day) falls in the half-open window `[start, end)`. Handles
 * a window that crosses midnight (start > end) as the union of `[start, 1440)` and
 * `[0, end)`. A zero-length window (start === end) contains nothing.
 */
export function isMinuteInWindow(
  m: number,
  window: { start: { hour: number; minute: number }; end: { hour: number; minute: number } },
): boolean {
  const start = minuteOfDay(window.start);
  const end = minuteOfDay(window.end);
  if (start === end) return false;
  return start < end ? m >= start && m < end : m >= start || m < end;
}

/**
 * Clamp `m` (minute of day) into the half-open window `[start, end)`, returning the
 * nearest allowed minute when it is outside — the nearer of the opening edge
 * (`start`) or the last allowed minute (`end - 1`, wrapping). Never returns a value
 * outside the window. Cross-midnight aware; a zero-length window returns `m`
 * unchanged (nothing to clamp into).
 */
export function clampMinuteToWindow(
  m: number,
  window: { start: { hour: number; minute: number }; end: { hour: number; minute: number } },
): number {
  const start = minuteOfDay(window.start);
  const end = minuteOfDay(window.end);
  if (start === end) return m;
  if (isMinuteInWindow(m, window)) return m;
  const lastAllowed = (end + 1439) % 1440; // end - 1, wrapped
  const toStart = circularMinuteDistance(m, start);
  const toEnd = circularMinuteDistance(m, lastAllowed);
  return toStart <= toEnd ? start : lastAllowed;
}

/**
 * Minute-of-day bounds for a day-part band, or null for 'either' (no constraint).
 * Morning = 06:00–12:00, Evening = 17:00–22:00. Bounds are half-open `[start, end)`
 * and never cross midnight, so they compose with {@link clampMinuteToWindow}.
 */
export function dayPartBand(
  dayPart: 'morning' | 'evening' | 'either',
): { start: { hour: number; minute: number }; end: { hour: number; minute: number } } | null {
  switch (dayPart) {
    case 'morning':
      return { start: { hour: 6, minute: 0 }, end: { hour: 12, minute: 0 } };
    case 'evening':
      return { start: { hour: 17, minute: 0 }, end: { hour: 22, minute: 0 } };
    case 'either':
      return null;
  }
}
