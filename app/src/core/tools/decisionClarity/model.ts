/**
 * What Really Matters to Me? — the pure model of a decision reflection that refuses to decide.
 *
 * THE FOUR SIDES ARE THE PRODUCT. Staying has benefits and costs; changing has hoped-for benefits
 * and anticipated costs. Ambivalence is not weak motivation — it usually means both sides hold
 * something real, and the tool's whole job is to keep all four visible without collapsing them into
 * a score (PRD §2).
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT EXPORT, and the omission is the design:
 *  · no `score`, no `total`, no `winner`, no `readiness`;
 *  · no weighting of one side by how much was written on it — a person with six worries and one
 *    hope has not decided anything, and counting would tell them they had;
 *  · no classification of the person as ready, resistant or avoidant.
 * Anything computing a direction from this data would have to be written from scratch, on purpose.
 *
 * EVERY SIDE MAY BE EMPTY. "Nothing comes to mind right now" is a real answer and completion is
 * allowed without it (PRD §10). What is required is a topic; everything else is optional, including
 * the clarity statement, because deciding now is not required either.
 *
 * Pure TypeScript — no React, no storage, no clock reads.
 */

/** The four sides, in the fixed order the screens reveal them (PRD §5). */
export const DECISION_SIDES = [
  'statusQuoBenefits',
  'statusQuoCosts',
  'changeBenefits',
  'changeCosts',
] as const;
export type DecisionSide = (typeof DECISION_SIDES)[number];

/** One thing written on one side. Ids exist so a consideration can point at it. */
export interface DecisionEntry {
  id: string;
  text: string;
}

/** How many considerations may be marked as mattering most. */
export const MAX_CONSIDERATIONS = 3;

export interface DecisionReflection {
  id: string;
  topic: string;
  sides: Record<DecisionSide, DecisionEntry[]>;
  /** Ids of entries the person marked as mattering most, in THEIR order. */
  priorityIds: string[];
  clarityStatement?: string;
  status: 'draft' | 'confirmed';
  createdAt: number;
  updatedAt: number;
  confirmedAt?: number;
}

export function startReflection(id: string, now: number): DecisionReflection {
  return {
    id,
    topic: '',
    sides: { statusQuoBenefits: [], statusQuoCosts: [], changeBenefits: [], changeCosts: [] },
    priorityIds: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export function setTopic(reflection: DecisionReflection, topic: string, now: number): DecisionReflection {
  return { ...reflection, topic, updatedAt: now };
}

/** Add a line to one side. Blank text is ignored rather than stored as an empty entry. */
export function addEntry(
  reflection: DecisionReflection,
  side: DecisionSide,
  id: string,
  text: string,
  now: number,
): DecisionReflection {
  if (text.trim().length === 0) return reflection;
  return {
    ...reflection,
    sides: { ...reflection.sides, [side]: [...reflection.sides[side], { id, text: text.trim() }] },
    updatedAt: now,
  };
}

/** Remove a line, and any priority that pointed at it — a dangling priority would render as blank. */
export function removeEntry(
  reflection: DecisionReflection,
  side: DecisionSide,
  entryId: string,
  now: number,
): DecisionReflection {
  return {
    ...reflection,
    sides: { ...reflection.sides, [side]: reflection.sides[side].filter((e) => e.id !== entryId) },
    priorityIds: reflection.priorityIds.filter((id) => id !== entryId),
    updatedAt: now,
  };
}

/** Every entry across the four sides, in side order — what the priority screen chooses from. */
export function allEntries(reflection: DecisionReflection): { side: DecisionSide; entry: DecisionEntry }[] {
  return DECISION_SIDES.flatMap((side) => reflection.sides[side].map((entry) => ({ side, entry })));
}

/**
 * Mark or unmark a consideration. Selection order is preserved and IS the ranking — the person's
 * order, never one the app computed.
 */
export function togglePriority(
  reflection: DecisionReflection,
  entryId: string,
  now: number,
): DecisionReflection {
  const selected = reflection.priorityIds.includes(entryId);
  if (selected) {
    return { ...reflection, priorityIds: reflection.priorityIds.filter((id) => id !== entryId), updatedAt: now };
  }
  if (reflection.priorityIds.length >= MAX_CONSIDERATIONS) return reflection;
  return { ...reflection, priorityIds: [...reflection.priorityIds, entryId], updatedAt: now };
}

/** Move a chosen consideration up or down — the accessible alternative to dragging (PRD §11). */
export function movePriority(
  reflection: DecisionReflection,
  entryId: string,
  direction: -1 | 1,
  now: number,
): DecisionReflection {
  const index = reflection.priorityIds.indexOf(entryId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= reflection.priorityIds.length) return reflection;
  const next = [...reflection.priorityIds];
  [next[index], next[target]] = [next[target], next[index]];
  return { ...reflection, priorityIds: next, updatedAt: now };
}

export function setClarity(reflection: DecisionReflection, text: string, now: number): DecisionReflection {
  if (text.trim().length === 0) {
    const { clarityStatement: _c, ...rest } = reflection;
    return { ...rest, updatedAt: now };
  }
  return { ...reflection, clarityStatement: text, updatedAt: now };
}

/** A topic is the only requirement. Everything else may be empty and the reflection still true. */
export function canConfirm(reflection: DecisionReflection): boolean {
  return reflection.topic.trim().length > 0;
}

export function confirmReflection(reflection: DecisionReflection, now: number): DecisionReflection {
  if (!canConfirm(reflection)) return reflection;
  return { ...reflection, topic: reflection.topic.trim(), status: 'confirmed', confirmedAt: now, updatedAt: now };
}

/**
 * Whether the person changed the QUESTION mid-flow. Existing answers may no longer belong to the
 * same decision, so the screen asks rather than silently keeping them (PRD §10).
 */
export function topicChangedMeaningfully(before: string, after: string): boolean {
  return before.trim().length > 0 && before.trim() !== after.trim();
}

/** Whether anything at all was written on the four sides. Used for copy, never for judgement. */
export function hasAnySide(reflection: DecisionReflection): boolean {
  return DECISION_SIDES.some((side) => reflection.sides[side].length > 0);
}

/**
 * How long a reflection is offered as CURRENT context — thirty days (PRD §8). A decision is a live
 * question and a month-old articulation of it is history, not the present.
 */
export const CONTEXT_FRESH_DAYS = 30;

export function isCurrentContext(reflection: DecisionReflection, now: number): boolean {
  if (!reflection.confirmedAt) return false;
  return now - reflection.confirmedAt <= CONTEXT_FRESH_DAYS * 24 * 60 * 60 * 1000;
}

/** Several decisions coexist — each is a different question. Newest first. */
export function history(reflections: readonly DecisionReflection[]): DecisionReflection[] {
  return [...reflections]
    .filter((r) => r.status === 'confirmed')
    .sort((a, b) => (b.confirmedAt ?? 0) - (a.confirmedAt ?? 0));
}

export function isDecisionReflection(value: unknown): value is DecisionReflection {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<DecisionReflection>;
  if (typeof r.id !== 'string' || typeof r.topic !== 'string') return false;
  if (typeof r.sides !== 'object' || r.sides === null) return false;
  if (!DECISION_SIDES.every((side) => Array.isArray((r.sides as Record<string, unknown>)[side]))) return false;
  return Array.isArray(r.priorityIds) && (r.status === 'draft' || r.status === 'confirmed');
}
