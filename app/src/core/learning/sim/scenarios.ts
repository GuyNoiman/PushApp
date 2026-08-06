/**
 * Canonical simulation scenarios (S1.13/S1.15) — the four persona runs the closed-loop PROOF is
 * built on, defined ONCE here so the runnable ({@link ./run}) and the test
 * ({@link ./__tests__/Simulation.test}) always exercise identical inputs. Each returns a fully
 * specified {@link SimConfig} with a fixed seed, so every run is reproducible.
 *
 * The shared anchor is a local midnight; all deadlines are expressed relative to it. Seeds were
 * chosen so each persona's behaviour reads cleanly (see run.ts to eyeball a timeline).
 *
 * Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { SimConfig } from './Simulation';
import { chronicSlipper, consistent, cramsLate, weekendOnly } from './personas';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Shared start anchor: local midnight, 2026-08-03. */
export const NOW0 = new Date(2026, 7, 3, 0, 0, 0).getTime();

/** A daily-cadence "learn to run" goal, reused across scenarios. */
function runGoal() {
  return { title: 'Learn to run 5K', isHabit: false, cadence: 'daily' as const };
}

/** consistent — a deadline goal the user reliably stays ahead of (banks a buffer, low churn). */
export function consistentScenario(): SimConfig {
  return {
    persona: consistent,
    goal: runGoal(),
    constraints: {
      targetDate: NOW0 + 30 * MS_PER_DAY,
      weeklyAvailabilityMinutes: 210,
      preferredDays: [],
      daypart: 'morning',
    },
    now0: NOW0,
    weeks: 4,
    seed: 2,
  };
}

/** chronic-slipper — a tight deadline the user keeps missing (compress → shrink → shed → at-risk). */
export function chronicSlipperScenario(): SimConfig {
  return {
    persona: chronicSlipper,
    goal: runGoal(),
    constraints: {
      targetDate: NOW0 + 21 * MS_PER_DAY,
      weeklyAvailabilityMinutes: 140,
      preferredDays: [],
      daypart: 'morning',
    },
    now0: NOW0,
    weeks: 3,
    seed: 777,
  };
}

/** weekend-only — the user acts only Sat/Sun, and the plan lives on the weekend to match. */
export function weekendOnlyScenario(): SimConfig {
  return {
    persona: weekendOnly,
    goal: runGoal(),
    constraints: {
      targetDate: NOW0 + 42 * MS_PER_DAY,
      weeklyAvailabilityMinutes: 120,
      preferredDays: [0, 6],
      daypart: 'morning',
    },
    now0: NOW0,
    weeks: 6,
    seed: 2468,
  };
}

/** crams-late — nothing happens until the final two weeks (early at-risk warning + pulled-in work). */
export function cramsLateScenario(): SimConfig {
  return {
    persona: cramsLate,
    goal: runGoal(),
    constraints: {
      targetDate: NOW0 + 56 * MS_PER_DAY,
      weeklyAvailabilityMinutes: 140,
      preferredDays: [],
      daypart: 'morning',
    },
    now0: NOW0,
    weeks: 8,
    seed: 99,
  };
}

/** All four, in a stable order. */
export function allScenarios(): SimConfig[] {
  return [
    consistentScenario(),
    chronicSlipperScenario(),
    weekendOnlyScenario(),
    cramsLateScenario(),
  ];
}
