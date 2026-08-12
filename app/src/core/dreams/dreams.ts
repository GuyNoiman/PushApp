/**
 * Dreams — the framework-free domain logic for the Journey↔Dream relationship (Dream Management,
 * D40). The relationship is authoritative on the JOURNEY side ({@link Journey.dreamId} = primary +
 * {@link Journey.secondaryDreamIds} = secondaries); a {@link Dream} holds no back-reference, so a
 * Dream's Journeys are DERIVED here on read — one source of truth that can never drift.
 *
 * This module owns validation (normalized, non-empty, length-capped titles / whys) and the pure
 * read selectors the engine + UI share. It never touches state, ids, or the event bus — the
 * JourneyEngine does that. Pure TypeScript — no React, no UI, no vendor imports.
 */
import type { Dream, Journey } from '../types/domain';

/** Safe caps so a corrupt/oversized coach output can never bloat on-device state. */
export const MAX_DREAM_TITLE_LENGTH = 120;
export const MAX_DREAM_WHY_LENGTH = 280;

/** What the coach supplies to create/reuse a Dream (structured output — validated here). */
export interface NewDreamInput {
  title: string;
  /** Optional "why this matters" → stored as {@link Dream.description}. */
  why?: string;
}

/** Collapse whitespace, trim, and cap at `max` — the shared normalizer for a Dream text field. */
function normalizeText(raw: string, max: number): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Normalize a Dream title: single-spaced, trimmed, capped. Empty ⇒ invalid. */
export function normalizeDreamTitle(raw: string): string {
  return normalizeText(raw, MAX_DREAM_TITLE_LENGTH);
}

/** Normalize a Dream "why": single-spaced, trimmed, capped. Empty ⇒ omit the field. */
export function normalizeDreamWhy(raw: string): string {
  return normalizeText(raw, MAX_DREAM_WHY_LENGTH);
}

/** Whether a raw title yields a non-empty normalized Dream title (the create/reuse guard). */
export function isValidDreamTitle(raw: string): boolean {
  return normalizeDreamTitle(raw).length > 0;
}

/** Whether a Journey is linked to a Dream — as its PRIMARY or a SECONDARY relationship. */
export function isJourneyLinkedToDream(journey: Journey, dreamId: string): boolean {
  return journey.dreamId === dreamId || (journey.secondaryDreamIds?.includes(dreamId) ?? false);
}

/**
 * Every Journey linked to `dreamId`, across ALL lifecycle states (active / frozen / completed /
 * future) — the read model behind the Dream detail screen. A Journey linked more than once (e.g.
 * corrupt legacy data listing the same id primary AND secondary) appears ONCE:
 * {@link isJourneyLinkedToDream} is a membership test, and each Journey is visited a single time.
 */
export function journeysForDream(dreamId: string, journeys: Journey[]): Journey[] {
  return journeys.filter((j) => isJourneyLinkedToDream(j, dreamId));
}

/**
 * Find an existing Dream whose normalized title matches `title` (case-insensitive) — the reuse half
 * of create-or-reuse, so the coach never mints a duplicate Dream for the same aspiration. Returns
 * undefined when none matches.
 */
export function findDreamByTitle(dreams: Dream[], title: string): Dream | undefined {
  const target = normalizeDreamTitle(title).toLocaleLowerCase();
  if (!target) return undefined;
  return dreams.find((d) => normalizeDreamTitle(d.title).toLocaleLowerCase() === target);
}
