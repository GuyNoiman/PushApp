/**
 * Behavior personas for the adaptive-coach closed-loop simulation (S1.13). Each persona is a
 * DETERMINISTIC policy that decides what a fake "user" does with a due Step on a given day —
 * `done` / `partial` / `couldnt` / `skip` — from an injected seeded PRNG. No `Math.random` and
 * no `Date.now`: given the same seed and the same day context, a persona always makes the same
 * choice, so a whole simulation run is reproducible.
 *
 * The four policies span the behaviour space the coach must adapt to:
 *   - consistent      — shows up on plan almost every time (the easy case).
 *   - chronic-slipper — frequently skips or half-does the work (drives compression + shedding).
 *   - weekend-only    — only acts on Saturday/Sunday (drives day-of-week concentration).
 *   - crams-late      — does nothing until the final ~2 weeks before a deadline (drives an early
 *                       at-risk warning).
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { Step } from '../../types/domain';

/** What the fake user did with one due Step occurrence. Mirrors the outcome verbs the app uses. */
export type Outcome = 'done' | 'partial' | 'couldnt' | 'skip';

/** The day-level context a persona reasons about (never any real clock — all injected). */
export interface DayContext {
  /** Local midnight (epoch ms) of the simulation day. */
  date: number;
  /** JS `Date.getDay()` weekday of the day (0=Sun … 6=Sat). */
  weekday: number;
  /** 0-based index of the day within the run. */
  dayIndex: number;
  /** Total number of days in the run. */
  totalDays: number;
  /** Whole days from this day until the deadline, or null for an open-ended goal. */
  daysToDeadline: number | null;
}

/** A deterministic behaviour policy: (step, day, rng) → what the user did. */
export interface Persona {
  readonly name: string;
  decide(step: Step, ctx: DayContext, rng: () => number): Outcome;
}

/**
 * mulberry32 — a tiny, fast, well-distributed seeded PRNG. Given a seed it yields a fixed
 * stream of numbers in [0, 1). This is the ONLY source of "randomness" in the simulation, so
 * every run is fully reproducible from its seed.
 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Number of days before the deadline the crammer finally starts acting. */
const CRAM_FINAL_STRETCH_DAYS = 14;

/** Shows up on plan almost every time; the occasional half-effort, very rarely a no-show. */
export const consistent: Persona = {
  name: 'consistent',
  decide(_step, _ctx, rng) {
    const r = rng();
    if (r < 0.95) return 'done';
    if (r < 0.99) return 'partial';
    return 'skip';
  },
};

/** Frequently skips or only half-does the work — the case the coach must actively rescue. */
export const chronicSlipper: Persona = {
  name: 'chronic-slipper',
  decide(_step, _ctx, rng) {
    const r = rng();
    if (r < 0.25) return 'done';
    if (r < 0.45) return 'partial';
    if (r < 0.7) return 'couldnt';
    return 'skip';
  },
};

/** Only acts at the weekend (Sat/Sun); ignores everything on weekdays. */
export const weekendOnly: Persona = {
  name: 'weekend-only',
  decide(_step, ctx, rng) {
    const isWeekend = ctx.weekday === 0 || ctx.weekday === 6;
    if (!isWeekend) return 'skip';
    return rng() < 0.9 ? 'done' : 'partial';
  },
};

/** Does nothing until the final ~2 weeks before the deadline, then works hard to catch up. */
export const cramsLate: Persona = {
  name: 'crams-late',
  decide(_step, ctx, rng) {
    const inFinalStretch =
      ctx.daysToDeadline != null && ctx.daysToDeadline <= CRAM_FINAL_STRETCH_DAYS;
    if (!inFinalStretch) return 'skip';
    return rng() < 0.8 ? 'done' : 'partial';
  },
};

/** All four personas, for convenience in runs/tests. */
export const personas = { consistent, chronicSlipper, weekendOnly, cramsLate } as const;
