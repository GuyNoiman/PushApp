/**
 * Buddy evolution stages, as DATA (Engineering Bible §3 configuration-before-code).
 * Buddy Level rises only through XP; stage is derived from level. Pure TS.
 * See Product_Terminology.md — Buddy Level, XP.
 */
import type { BuddyStage } from '../types/domain';

export interface BuddyStageDef {
  stage: BuddyStage;
  displayName: string;
  /** The Buddy Level at which this stage begins. */
  minLevel: number;
}

/** XP needed to advance one Buddy Level (linear for the POC). */
export const XP_PER_LEVEL = 100;

/** Ordered by minLevel ascending. egg → guardian. */
export const BUDDY_STAGES: BuddyStageDef[] = [
  { stage: 'egg', displayName: 'Egg', minLevel: 1 },
  { stage: 'hatchling', displayName: 'Hatchling', minLevel: 2 },
  { stage: 'sprout', displayName: 'Sprout', minLevel: 4 },
  { stage: 'companion', displayName: 'Companion', minLevel: 7 },
  { stage: 'guardian', displayName: 'Guardian', minLevel: 10 },
];

export function levelFromXp(totalXp: number): number {
  return Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL) + 1;
}

export function stageForLevel(level: number): BuddyStageDef {
  let current = BUDDY_STAGES[0];
  for (const def of BUDDY_STAGES) {
    if (level >= def.minLevel) current = def;
  }
  return current;
}

/** Resolved Buddy progression derived from total XP — stage, level, and level progress. */
export interface BuddyProgression {
  level: number;
  stage: BuddyStage;
  stageDisplayName: string;
  /** XP accumulated within the current level. */
  xpIntoLevel: number;
  /** XP span of a level (for a progress bar denominator). */
  xpForNextLevel: number;
}

export function resolveBuddy(totalXp: number): BuddyProgression {
  const level = levelFromXp(totalXp);
  const def = stageForLevel(level);
  return {
    level,
    stage: def.stage,
    stageDisplayName: def.displayName,
    xpIntoLevel: Math.max(0, totalXp) % XP_PER_LEVEL,
    xpForNextLevel: XP_PER_LEVEL,
  };
}
