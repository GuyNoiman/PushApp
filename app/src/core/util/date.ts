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

/** Week key = the date of that week's Monday, so a new week rolls weekly work. */
export function weekKey(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOffset = (copy.getDay() + 6) % 7; // Mon=0 … Sun=6
  copy.setDate(copy.getDate() - mondayOffset);
  return dateKey(copy);
}

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
