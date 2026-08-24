/**
 * Building a context — the only door in, so the bounds and the provenance can never be skipped.
 *
 * ── WHAT THIS FUNCTION IS ALLOWED TO READ ──────────────────────────────────────────────────────
 *
 * The APPROVED object, and what the person explicitly said. That is the whole permitted input set
 * (PRD §6), and it is why these take a `Journey`/`Dream` rather than a conversation: a transcript
 * argument would make it possible — and eventually tempting — to summarise the conversation itself,
 * which is the thing the feature exists to avoid.
 *
 * ── AND WHAT AN UPDATE MAY DO ──────────────────────────────────────────────────────────────────
 *
 * Replace or remove a field, never quietly accumulate. {@link updateContext} takes a patch of the
 * same bounded shape and writes it over what was there, so a correction made in conversation is a
 * correction rather than an addition — the PRD's "replace/remove stale fields" (§5) is a
 * one-liner here precisely because the merge is not clever.
 *
 * Pure TypeScript — no React, no storage, no clock reads (the caller passes `at`).
 */
import type { Dream, Journey } from '../../types/domain';
import { boundLine, boundList } from './bounds';
import {
  COACH_CONTEXT_SCHEMA_VERSION,
  type ContextProvenance,
  type DreamCoachContext,
  type JourneyCoachContext,
  type ObstacleCategory,
} from './types';

/** What a caller may state about a Dream beyond the approved object itself. */
export interface DreamContextInput {
  direction?: string;
  startingPoint?: string;
  boundaries?: readonly string[];
  openQuestions?: readonly string[];
  provenance?: ContextProvenance;
  sourceId?: string;
}

/** What a caller may state about a Journey beyond the approved object itself. */
export interface JourneyContextInput {
  outcome?: string;
  startingPoint?: string;
  reasons?: readonly string[];
  constraints?: readonly string[];
  obstacleCategories?: readonly ObstacleCategory[];
  adaptationRationale?: readonly string[];
  assumptions?: readonly string[];
  provenance?: ContextProvenance;
  sourceId?: string;
}

/**
 * The context of an APPROVED Dream.
 *
 * The direction and the reason it matters are the Dream's own title and description — the person
 * approved those words as a description of themselves, which is the strongest provenance available.
 */
export function dreamContextFrom(
  dream: Dream,
  at: number,
  input: DreamContextInput = {},
): DreamCoachContext {
  return {
    kind: 'dream',
    id: dream.id,
    schemaVersion: COACH_CONTEXT_SCHEMA_VERSION,
    updatedAt: at,
    provenance: input.provenance ?? 'approvedChange',
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
    direction: boundLine(input.direction ?? dream.title),
    startingPoint: boundLine(input.startingPoint),
    boundaries: boundList(input.boundaries),
    openQuestions: boundList(input.openQuestions),
  };
}

/**
 * The context of an APPROVED Journey.
 *
 * `why` is deliberately the default source of `reasons`: those are the sentences the person wrote
 * about why this matters, they are already in the Journey, and repeating the question would be the
 * exact failure this feature exists to fix. Note what is NOT copied — the Steps. They are the
 * Journey, and duplicating them into a memory would create a second, staler plan (PRD §5).
 */
export function journeyContextFrom(
  journey: Journey,
  at: number,
  input: JourneyContextInput = {},
): JourneyCoachContext {
  return {
    kind: 'journey',
    id: journey.id,
    schemaVersion: COACH_CONTEXT_SCHEMA_VERSION,
    updatedAt: at,
    provenance: input.provenance ?? 'approvedChange',
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
    outcome: boundLine(input.outcome ?? journey.title),
    startingPoint: boundLine(input.startingPoint),
    reasons: boundList(input.reasons ?? journey.why),
    constraints: boundList(input.constraints),
    obstacleCategories: [...new Set(input.obstacleCategories ?? [])],
    adaptationRationale: boundList(input.adaptationRationale),
    assumptions: boundList(input.assumptions),
  };
}

/**
 * Apply a correction. Only the fields present in the patch move; each one is REPLACED.
 *
 * A patch that sets a line to an empty string removes it, which is what a person means when they say
 * "no, that is not it any more".
 */
export function updateContext<T extends DreamCoachContext | JourneyCoachContext>(
  existing: T,
  patch: Partial<Omit<T, 'kind' | 'id' | 'schemaVersion'>>,
  at: number,
): T {
  const next: T = { ...existing, ...patch, updatedAt: at, schemaVersion: COACH_CONTEXT_SCHEMA_VERSION };
  // Re-bound whatever came in, because a patch is an outside caller like any other.
  if (next.kind === 'dream') {
    const dream = next as DreamCoachContext;
    dream.direction = boundLine(dream.direction);
    dream.startingPoint = boundLine(dream.startingPoint);
    dream.boundaries = boundList(dream.boundaries);
    dream.openQuestions = boundList(dream.openQuestions);
  } else {
    const journey = next as JourneyCoachContext;
    journey.outcome = boundLine(journey.outcome);
    journey.startingPoint = boundLine(journey.startingPoint);
    journey.reasons = boundList(journey.reasons);
    journey.constraints = boundList(journey.constraints);
    journey.adaptationRationale = boundList(journey.adaptationRationale);
    journey.assumptions = boundList(journey.assumptions);
    journey.obstacleCategories = [...new Set(journey.obstacleCategories)];
  }
  return next;
}
