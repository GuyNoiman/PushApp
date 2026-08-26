/**
 * The motivation CATALOG — every sentence the app may say, as data.
 *
 * Bundled in the app on purpose, and only for this slice (PRD §3, architecture Q1). The Future PRD
 * is right that bundling is the wrong long-term home: it cannot update rankings centrally and it
 * fragments content across versions. Two things make it tolerable *here* and nowhere later — the
 * catalog is JavaScript, so a correction reaches an installed build through `eas update` without a
 * store release; and with no cross-user ranking there is nothing that must update centrally.
 *
 * WHAT IS DELIBERATELY ABSENT: quotations (licensing unresolved), health statements (evidence review
 * unresolved), and money/consumption figures (they need a baseline the user enters and can edit).
 * All three stay in `Future/Personalized_Motivation_Engine_PRD.md`, uncut.
 *
 * The WORDS are not here — only meanings. `id` is the i18n key group, and the copy layer resolves
 * the four communication styles over it (D84), so feedback attaches to the meaning rather than to
 * one of its four wordings.
 *
 * Pure TypeScript — no i18n, no React, no vendor imports.
 */
import type { MotivationItem } from './types';

export const MOTIVATION_CATALOG: readonly MotivationItem[] = [
  // ── Sustained progress ───────────────────────────────────────────────────────────────────
  {
    id: 'weekPace',
    version: 1,
    family: 'progress',
    theme: 'progress',
    trigger: 'sustained',
    requires: ['stepsDoneThisWeek'],
  },
  {
    id: 'streakDays',
    version: 1,
    family: 'progress',
    theme: 'rhythm',
    trigger: 'sustained',
    requires: ['streakDays'],
  },
  {
    id: 'stepsTotal',
    version: 1,
    family: 'progress',
    theme: 'progress',
    trigger: 'sustained',
    requires: ['stepsDoneTotal'],
  },
  {
    id: 'journeyShare',
    version: 1,
    family: 'progress',
    theme: 'journey',
    trigger: 'sustained',
    requires: ['journeyProgressPct', 'journeyTitle'],
    door: 'journey',
  },
  {
    id: 'daysMoving',
    version: 1,
    family: 'progress',
    theme: 'time',
    trigger: 'sustained',
    requires: ['daysMoving', 'journeyTitle'],
    door: 'journey',
  },

  // ── An approaching Milestone ─────────────────────────────────────────────────────────────
  {
    id: 'milestoneNear',
    version: 1,
    family: 'progress',
    theme: 'milestone',
    trigger: 'milestone',
    requires: ['stepsToMilestone'],
    door: 'today',
  },

  // ── Coming back after a miss. No praise for returning, and no reference to the miss: both
  //    would turn a neutral moment into a verdict on the person (AI_Product_Principles). ──────
  {
    id: 'backAfterMiss',
    version: 1,
    family: 'encouragement',
    theme: 'return',
    trigger: 'returned',
    requires: [],
    door: 'today',
  },
  {
    id: 'returnCounts',
    version: 1,
    family: 'progress',
    theme: 'return',
    trigger: 'returned',
    requires: ['stepsDoneTotal'],
  },

  // ── A quiet stretch. These say the door is open; they never ask where somebody was. ────────
  {
    id: 'quietDoorOpen',
    version: 1,
    family: 'encouragement',
    theme: 'quiet',
    trigger: 'quiet',
    requires: [],
    door: 'today',
  },
  {
    id: 'quietStillYours',
    version: 1,
    family: 'encouragement',
    theme: 'quiet',
    trigger: 'quiet',
    requires: ['journeyTitle'],
    door: 'journey',
  },
];

/** Look one item up by id — `undefined` when a persisted log entry names an item since retired. */
export function motivationItem(id: string): MotivationItem | undefined {
  return MOTIVATION_CATALOG.find((item) => item.id === id);
}
