/**
 * What Am I Carrying Right Now? — the pure model of one representative week, told in a hundred
 * tiles.
 *
 * WHY TILES AND NOT HOURS. Exact time tracking creates work and invents a precision nobody has;
 * asking about life "in general" produces abstractions. A hundred tiles is a part-to-whole a person
 * can feel their way through — "about a quarter of me went there" — and it is honest about being an
 * estimate (PRD §2, §5).
 *
 * TIME AND ENERGY STAY SEPARATE, and that separation is the insight the tool exists for. A lot of
 * time is not automatically bad and a little is not automatically unimportant, so nothing here
 * combines the two into a single number, and there is no score, no balance index and no optimum. The
 * one derived value is `remainingUnits`, which exists so the screen can say how many tiles are left.
 *
 * A WEEK MUST BE A FINISHED WEEK. The current, partial week is never offered as representative — you
 * cannot describe a week you are standing in the middle of (PRD §4).
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */
import { startOfNextWeek, startOfWeek, type Weekday } from '../../util/week';

/** The hundred tiles the week is divided into. */
export const TOTAL_UNITS = 100;

/** The offered areas. They are labels for reflection, never canonical app objects (PRD §5). */
export const LOAD_CATEGORIES = [
  'work',
  'family',
  'health',
  'relationships',
  'dreams',
  'rest',
  'errands',
  'scattered',
] as const;
export type LoadCategoryId = (typeof LOAD_CATEGORIES)[number];

/** A category code is one of the offered ones, or a custom id the person created. */
export type CategoryCode = LoadCategoryId | string;

export interface LoadAllocation {
  code: CategoryCode;
  /** Present only for a custom area — the person's own word for it. */
  customLabel?: string;
  units: number;
}

/** Depleted through to gave-energy. Five steps, and the middle one is a real answer. */
export type EnergyRating = -2 | -1 | 0 | 1 | 2;

export interface CurrentLoadSnapshot {
  id: string;
  weekStart: number;
  weekEnd: number;
  /** Whether the person calls this week representative. `unsure` is allowed and means it. */
  representative: 'yes' | 'no' | 'unsure';
  allocations: LoadAllocation[];
  energy: Record<string, EnergyRating>;
  /** The one area that got less room than the person wanted. Absent is a valid result. */
  underAllocated?: CategoryCode;
  /** One small reallocation the person wants to try. Theirs to write, never suggested. */
  experiment?: string;
  status: 'draft' | 'confirmed';
  createdAt: number;
  updatedAt: number;
  confirmedAt?: number;
}

/**
 * The completed weeks a person may describe: the last one, the one before it, and no further back
 * than thirty days (PRD §4). The CURRENT week is deliberately absent from this list.
 */
export function eligibleWeeks(
  now: number,
  weekStart?: Weekday,
  count = 4,
): { weekStart: number; weekEnd: number }[] {
  const thisWeekStart = startOfWeek(now, weekStart);
  const weeks: { weekStart: number; weekEnd: number }[] = [];
  for (let i = 1; i <= count; i += 1) {
    const start = startOfWeek(thisWeekStart - i * 7 * 24 * 60 * 60 * 1000, weekStart);
    const end = startOfNextWeek(start, weekStart) - 1;
    if (now - start > 30 * 24 * 60 * 60 * 1000 + 7 * 24 * 60 * 60 * 1000) break;
    weeks.push({ weekStart: start, weekEnd: end });
  }
  return weeks;
}

/** Whether a week may be described: finished, and inside the last thirty days. */
export function isEligibleWeek(week: { weekStart: number; weekEnd: number }, now: number): boolean {
  if (week.weekEnd >= now) return false; // still running, or in the future
  return now - week.weekStart <= 37 * 24 * 60 * 60 * 1000;
}

export function startSnapshot(
  id: string,
  week: { weekStart: number; weekEnd: number },
  now: number,
): CurrentLoadSnapshot {
  return {
    id,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    representative: 'yes',
    allocations: [],
    energy: {},
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export function usedUnits(snapshot: CurrentLoadSnapshot): number {
  return snapshot.allocations.reduce((sum, a) => sum + a.units, 0);
}

/** How many tiles are still unplaced. Negative is impossible — `addUnits` will not overfill. */
export function remainingUnits(snapshot: CurrentLoadSnapshot): number {
  return TOTAL_UNITS - usedUnits(snapshot);
}

/**
 * Move tiles into or out of one area. Clamped at both ends: never below zero for that area, never
 * past a hundred in total. An area that reaches zero is removed, so the result does not list areas
 * the person did not use.
 */
export function addUnits(
  snapshot: CurrentLoadSnapshot,
  code: CategoryCode,
  delta: number,
  now: number,
  customLabel?: string,
): CurrentLoadSnapshot {
  const existing = snapshot.allocations.find((a) => a.code === code);
  const current = existing?.units ?? 0;
  const room = remainingUnits(snapshot);
  const applied = Math.max(-current, Math.min(delta, room));
  if (applied === 0) return snapshot;

  const nextUnits = current + applied;
  const others = snapshot.allocations.filter((a) => a.code !== code);
  const allocations =
    nextUnits === 0
      ? others
      : [
          ...others,
          {
            code,
            units: nextUnits,
            ...(customLabel ?? existing?.customLabel ? { customLabel: customLabel ?? existing?.customLabel } : {}),
          },
        ];

  // Keep the offered order stable so the mosaic does not reshuffle when a number changes.
  allocations.sort((a, b) => orderOf(a.code) - orderOf(b.code));

  const energy = { ...snapshot.energy };
  if (nextUnits === 0) delete energy[code];

  return {
    ...snapshot,
    allocations,
    energy,
    // An area the person emptied cannot still be the one they wanted more of.
    ...(nextUnits === 0 && snapshot.underAllocated === code ? { underAllocated: undefined } : {}),
    updatedAt: now,
  };
}

function orderOf(code: CategoryCode): number {
  const index = (LOAD_CATEGORIES as readonly string[]).indexOf(code);
  return index >= 0 ? index : LOAD_CATEGORIES.length;
}

export function setEnergy(
  snapshot: CurrentLoadSnapshot,
  code: CategoryCode,
  rating: EnergyRating,
  now: number,
): CurrentLoadSnapshot {
  return { ...snapshot, energy: { ...snapshot.energy, [code]: rating }, updatedAt: now };
}

export function setUnderAllocated(
  snapshot: CurrentLoadSnapshot,
  code: CategoryCode | undefined,
  now: number,
): CurrentLoadSnapshot {
  return { ...snapshot, underAllocated: code, updatedAt: now };
}

export function setExperiment(snapshot: CurrentLoadSnapshot, text: string, now: number): CurrentLoadSnapshot {
  if (text.trim().length === 0) {
    const { experiment: _e, ...rest } = snapshot;
    return { ...rest, updatedAt: now };
  }
  return { ...snapshot, experiment: text, updatedAt: now };
}

export function setRepresentative(
  snapshot: CurrentLoadSnapshot,
  representative: CurrentLoadSnapshot['representative'],
  now: number,
): CurrentLoadSnapshot {
  return { ...snapshot, representative, updatedAt: now };
}

/** All hundred tiles must be placed before the week can be confirmed (PRD §11). */
export function canConfirm(snapshot: CurrentLoadSnapshot): boolean {
  return usedUnits(snapshot) === TOTAL_UNITS;
}

export function confirmSnapshot(snapshot: CurrentLoadSnapshot, now: number): CurrentLoadSnapshot {
  if (!canConfirm(snapshot)) return snapshot;
  return { ...snapshot, status: 'confirmed', confirmedAt: now, updatedAt: now };
}

/** The areas that took the most room. Description, not judgement — ties are kept, not broken. */
export function dominantAreas(snapshot: CurrentLoadSnapshot, howMany = 2): CategoryCode[] {
  const sorted = [...snapshot.allocations].sort((a, b) => b.units - a.units);
  const cutoff = sorted[howMany - 1]?.units ?? 0;
  return sorted.filter((a) => a.units >= cutoff && a.units > 0).map((a) => a.code);
}

/** Areas the person said gave them energy, and areas that took it. Never combined into a score. */
export function energising(snapshot: CurrentLoadSnapshot): CategoryCode[] {
  return Object.entries(snapshot.energy).filter(([, r]) => r > 0).map(([code]) => code);
}

export function draining(snapshot: CurrentLoadSnapshot): CategoryCode[] {
  return Object.entries(snapshot.energy).filter(([, r]) => r < 0).map(([code]) => code);
}

/**
 * Whether the app may talk about a TREND. Three comparable weeks is the floor (PRD §8): two points
 * make a line through anything, and a tool that says "you are working more lately" from two weeks is
 * inventing a story about somebody's life.
 */
export const MIN_WEEKS_FOR_TREND = 3;

export function canCompare(snapshots: readonly CurrentLoadSnapshot[]): boolean {
  return snapshots.filter((s) => s.status === 'confirmed' && s.representative !== 'no').length >= MIN_WEEKS_FOR_TREND;
}

/** History, newest week first. Every snapshot stays tied to its own week, forever. */
export function history(snapshots: readonly CurrentLoadSnapshot[]): CurrentLoadSnapshot[] {
  return [...snapshots].filter((s) => s.status === 'confirmed').sort((a, b) => b.weekStart - a.weekStart);
}

/** How long a snapshot is offered as CURRENT context — thirty days (PRD §9). It stays as history. */
export const CONTEXT_FRESH_DAYS = 30;

export function isCurrentContext(snapshot: CurrentLoadSnapshot, now: number): boolean {
  return now - snapshot.weekEnd <= CONTEXT_FRESH_DAYS * 24 * 60 * 60 * 1000;
}

export function isCurrentLoadSnapshot(value: unknown): value is CurrentLoadSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<CurrentLoadSnapshot>;
  return (
    typeof s.id === 'string' &&
    typeof s.weekStart === 'number' &&
    typeof s.weekEnd === 'number' &&
    Array.isArray(s.allocations) &&
    s.allocations.every((a) => typeof a === 'object' && a !== null && typeof a.code === 'string' && typeof a.units === 'number') &&
    typeof s.energy === 'object' &&
    s.energy !== null &&
    (s.status === 'draft' || s.status === 'confirmed')
  );
}
