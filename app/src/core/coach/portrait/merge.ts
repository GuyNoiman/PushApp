/**
 * How a new reading lands on the Portrait.
 *
 * ── THE FOUR RULES, DECIDED 2026-09-15 ─────────────────────────────────────────────────────────
 *
 * 1. **An inferred reading never overwrites something the person STATED.** A model's guess replacing
 *    somebody's own sentence is the single worst thing this file could do, and it would be invisible
 *    when it happened.
 * 2. **An inferred reading may fill an EMPTY field**, which is most of what it is for.
 * 3. **On a field that already holds something, an inferred reading may only LOWER the confidence.**
 *    Reducing what we claim to know is always safe; raising it, or swapping the value, is the thing
 *    rule 1 exists to prevent, and there is no honest way to tell the two apart at this seam.
 * 4. **A later STATED value beats an earlier stated value.** People correct themselves, and the
 *    correction is the truth — the whole point of the understanding check is that they can.
 *
 * ── AND THE RULE UNDER THOSE RULES ─────────────────────────────────────────────────────────────
 *
 * The Portrait is a CACHE of a reading of the transcript, never the source of truth. That is what
 * makes this safe: anything the merge gets wrong can be corrected by dropping the Portrait and
 * reading the conversation again, which is exactly what a correction does. A merge that tried to be
 * clever here would be defending state that is supposed to be disposable.
 *
 * Pure TypeScript — no React, no storage, no clock reads (the caller supplies `now`).
 */
import { boundLine, boundList } from '../context/bounds';
import {
  CONFIDENCE_RANK,
  atLeast,
  portraitField,
  type Held,
  type Portrait,
  type PortraitFieldId,
  type PortraitUpdate,
  type PortraitValue,
} from './types';

/** What one merge did, so the caller can tell a turn that taught us something from one that did not. */
export interface PortraitMerge {
  portrait: Portrait;
  /** The fields that came out of this merge held at MEDIUM or better. Drives the two-quiet-turns stop. */
  landed: PortraitFieldId[];
}

/** An empty Portrait. Absent means unknown, so this is simply `{}` — named for what it means. */
export function emptyPortrait(): Portrait {
  return {};
}

/** A defensive copy, so nothing outside can mutate what the engine is holding. */
export function clonePortrait(portrait: Portrait): Portrait {
  const copy: Portrait = {};
  for (const [id, held] of Object.entries(portrait) as [PortraitFieldId, Held<PortraitValue>][]) {
    if (!held) continue;
    // Cast: the key and its value came out of the same Portrait, so they match by construction.
    (copy as Record<string, unknown>)[id] = {
      ...held,
      value: Array.isArray(held.value) ? [...held.value] : held.value,
    };
  }
  return copy;
}

/**
 * Bound a value on the way in, exactly as the coach's memory is bounded ({@link ../context/bounds}).
 *
 * The same reasoning applies here and for the same reason: a field with no ceiling becomes a
 * transcript the moment somebody writes a paragraph, and no prompt instruction prevents that. An
 * enum is left alone — it is already bounded by being a member of a closed set.
 */
function boundValue(field: PortraitFieldId, value: PortraitValue): PortraitValue | undefined {
  const spec = portraitField(field);
  if (!spec) return undefined;
  if (spec.kind === 'list') {
    const list = boundList(Array.isArray(value) ? value : [String(value)]);
    return list.length > 0 ? list : undefined;
  }
  if (Array.isArray(value)) return undefined; // a single-valued field never holds a list
  if (spec.kind === 'enum') return value;
  return boundLine(value);
}

/**
 * Apply ONE update to what is already held, under the four rules above. Returns the value to keep —
 * which is often the one that was already there.
 */
export function mergeHeld(
  current: Held<PortraitValue> | undefined,
  incoming: Held<PortraitValue>,
): Held<PortraitValue> | undefined {
  // `unknown` is the absence of knowledge. A reading that claims nothing changes nothing.
  if (incoming.confidence === 'unknown') return current;
  if (!current) return incoming;
  // Rule 4: they have said it again, and the most recent thing they said is what they mean.
  if (incoming.source === 'stated') return incoming;
  // Rules 1 + 3: an inference onto an occupied field may only reduce what we claim.
  if (CONFIDENCE_RANK[incoming.confidence] < CONFIDENCE_RANK[current.confidence]) {
    return { ...current, confidence: incoming.confidence, updatedAt: incoming.updatedAt };
  }
  return current;
}

/**
 * Did this merge actually TEACH us something, or did it restate what we already held?
 *
 * The distinction is load-bearing rather than pedantic: the reader re-reads the whole transcript
 * every turn, so a field it reported once it will happily report again. Counting a restatement as
 * progress would mean the "two turns that added nothing" stop could never fire — and that clause is
 * the only thing standing between a vague person and an interview with no end.
 */
function improves(current: Held<PortraitValue> | undefined, merged: Held<PortraitValue>): boolean {
  if (!current) return true;
  if (CONFIDENCE_RANK[merged.confidence] > CONFIDENCE_RANK[current.confidence]) return true;
  if (merged.source !== current.source) return true;
  return sameValue(current.value, merged.value) === false;
}

/** Value equality that also holds for the one list-shaped field. */
function sameValue(a: PortraitValue, b: PortraitValue): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    return a.length === b.length && a.every((item, i) => item === b[i]);
  }
  return a === b;
}

/**
 * Merge a whole reading. Nothing is written for an update whose value does not survive bounding,
 * and the input Portrait is never mutated.
 */
export function mergePortrait(
  portrait: Portrait,
  updates: readonly PortraitUpdate[],
  now: number,
): PortraitMerge {
  const next = clonePortrait(portrait);
  const landed: PortraitFieldId[] = [];

  for (const update of updates) {
    const value = boundValue(update.field, update.value);
    if (value === undefined) continue;
    const current = next[update.field] as Held<PortraitValue> | undefined;
    const merged = mergeHeld(current, {
      value,
      confidence: update.confidence,
      source: update.source,
      updatedAt: now,
    });
    if (!merged) continue;
    const gained = improves(current, merged);
    // Cast: `boundValue` returned the shape this field's spec declares, which is what `Portrait`
    // types it as. This is the one place the Portrait is written, so it is the one place to say so.
    (next as Record<string, unknown>)[update.field] = merged;
    if (gained && atLeast(merged.confidence, 'medium')) landed.push(update.field);
  }

  return { portrait: next, landed };
}
