/**
 * stepDependencies — the SINGLE source of truth for Step Dependencies (linear, single-predecessor).
 *
 * A Step may depend on exactly ONE predecessor (its {@link Step.dependsOnStepId}). Dependencies are
 * LINEAR (one predecessor), chained up to {@link MAX_CHAIN_LENGTH} Steps, and only ever link Steps
 * WITHIN THE SAME {@link Milestone}. A dependent is UNLOCKED once its predecessor's DERIVED status
 * ({@link deriveStepStatus}) is `completed` or `partially_completed`; otherwise it is LOCKED.
 *
 * FAIL-OPEN (belt-and-braces, no dead-ends): a missing/unknown predecessor id, or a predecessor that
 * is `dropped`, counts as UNLOCKED — so a dependent can never be permanently stranded even if the
 * predecessor is edited away. The app also never auto-drops a dependency-linked Step; fail-open is the
 * safety net on top of that.
 *
 * Pure TS — no React, no vendor imports. Status comes from the caller's reasonLog; the only clock
 * read is the optional `now` of {@link isStepLocked} (defaulted, overridable in tests) used for the
 * closed-week fail-open below.
 */
import type { ReasonEntry, Step, Journey } from '../types/domain';
import { isInClosedWeek } from '../util/week';
import { deriveStepStatus } from './stepStatus';

/** The longest dependency chain permitted (founder decision): up to 3 Steps end-to-end. */
export const MAX_CHAIN_LENGTH = 3;

/**
 * Whether `step` is currently LOCKED by an unmet dependency. Locked iff its {@link Step.dependsOnStepId}
 * resolves to a predecessor whose derived status is NOT `completed`/`partially_completed` AND that
 * predecessor is not `dropped`. Fail-open (UNLOCKED) when there is no dependency, or the predecessor id
 * is missing/unknown/`dropped`.
 *
 * FAIL-OPEN — closed-week dead-end guard (PRD §7, protecting D41): a predecessor reported NOT-completed
 * that sits in a CLOSED (past, read-only) week can never be met again, so it would permanently strand
 * its dependent. We treat that dependent as UNLOCKED. The normal path never reaches this — deferring a
 * slipped predecessor moves it forward one week ({@link JourneyEngine.deferDependents}) so it stays
 * reachable — this is the belt-and-braces safety net if a predecessor was left behind.
 *
 * `reasonLog` is the per-user Daily-Reporting log ({@link deriveStepStatus} reads it); callers that have
 * it (the engines) pass it, and it defaults to empty for pure callers that only care about `done`. `now`
 * defaults to the wall clock and is overridable (tests) for the closed-week check only.
 */
export function isStepLocked(
  step: Step,
  journey: Journey,
  reasonLog: readonly ReasonEntry[] = [],
  now: number = Date.now(),
): boolean {
  const predecessorId = step.dependsOnStepId;
  if (!predecessorId) return false; // no dependency → always actionable
  const predecessor = journey.steps.find((s) => s.id === predecessorId);
  if (!predecessor) return false; // dangling id → fail-open (never strand the dependent)
  if (predecessor.dropped) return false; // a shed predecessor cannot be met → fail-open
  const status = deriveStepStatus(predecessor, reasonLog);
  if (status === 'completed' || status === 'partially_completed') return false; // met (a partial counts, D36)
  // Closed-week fail-open: a not_completed predecessor stranded in a past read-only week is unreachable.
  if (status === 'not_completed' && isInClosedWeek(predecessor.plannedFor, now)) return false;
  return true;
}

/** The Steps that directly depend on `step` (its immediate dependents). */
export function directDependentsOf(step: Step, journey: Journey): Step[] {
  return journey.steps.filter((s) => s.dependsOnStepId === step.id);
}

/**
 * The transitive dependency CHAIN `step` belongs to — every Step reachable by walking predecessors
 * (via {@link Step.dependsOnStepId}) and dependents (via {@link directDependentsOf}), returned in the
 * Journey's Step order. Used for depth/cascade reasoning. Cycle-safe via a visited set (fail-open never
 * creates cycles, but the guard keeps this total).
 */
export function dependencyChainOf(step: Step, journey: Journey): Step[] {
  const byId = new Map(journey.steps.map((s) => [s.id, s] as const));
  const seen = new Set<string>();
  const stack: Step[] = [step];
  while (stack.length > 0) {
    const current = stack.pop() as Step;
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    // Walk UP to the predecessor.
    if (current.dependsOnStepId) {
      const predecessor = byId.get(current.dependsOnStepId);
      if (predecessor && !seen.has(predecessor.id)) stack.push(predecessor);
    }
    // Walk DOWN to direct dependents.
    for (const dependent of directDependentsOf(current, journey)) {
      if (!seen.has(dependent.id)) stack.push(dependent);
    }
  }
  // Preserve the Journey's Step order for a stable, readable chain.
  return journey.steps.filter((s) => seen.has(s.id));
}

/**
 * The transitive DEPENDENTS of `step` — every Step reachable forward via {@link directDependentsOf}
 * (its dependent, that dependent's dependent, …), EXCLUDING `step` itself, in the Journey's Step order.
 * The cascade set the defer/reschedule flow moves when a predecessor slips (Step Dependencies). Reuses
 * the cycle-safe descendants walk; fail-open never creates cycles, but the guard keeps this total.
 */
export function transitiveDependentsOf(step: Step, journey: Journey): Step[] {
  return descendantsInclusive(step, journey).filter((s) => s.id !== step.id);
}

/** Steps in `step`'s ancestry (itself + every predecessor reached via `dependsOnStepId`), cycle-safe. */
function ancestorsInclusive(step: Step, byId: Map<string, Step>): Step[] {
  const out: Step[] = [];
  const seen = new Set<string>();
  let current: Step | undefined = step;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    out.push(current);
    current = current.dependsOnStepId ? byId.get(current.dependsOnStepId) : undefined;
  }
  return out;
}

/** Steps in `step`'s descendants (itself + every dependent reached forward), cycle-safe. */
function descendantsInclusive(step: Step, journey: Journey): Step[] {
  const seen = new Set<string>();
  const stack: Step[] = [step];
  while (stack.length > 0) {
    const current = stack.pop() as Step;
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    for (const dependent of directDependentsOf(current, journey)) {
      if (!seen.has(dependent.id)) stack.push(dependent);
    }
  }
  return journey.steps.filter((s) => seen.has(s.id));
}

/**
 * Whether it is VALID to make `dependentId` depend on `predecessorId` within `journey`. True iff ALL
 * hold:
 *  - both Steps exist in this Journey and are not the same Step (no self-dependency);
 *  - they share the SAME {@link Milestone} (equal `milestoneId`, including both-undefined);
 *  - the predecessor is EARLIER in Step order (no forward or self reference);
 *  - the dependent has NO other predecessor already (single-predecessor rule);
 *  - the predecessor has NO other dependent already (single-dependent rule) — chains stay strictly
 *    LINEAR, never fanning out (fan-out would silently drop the 2nd dependent from the week pager);
 *  - adding the link creates NO cycle;
 *  - the RESULTING chain length is ≤ {@link MAX_CHAIN_LENGTH}.
 *
 * Pure/structural — it never reads status, so authoring can validate before any reporting exists.
 */
export function validateDependency(
  dependentId: string,
  predecessorId: string,
  journey: Journey,
): boolean {
  if (dependentId === predecessorId) return false; // no self-dependency
  const byId = new Map(journey.steps.map((s) => [s.id, s] as const));
  const dependent = byId.get(dependentId);
  const predecessor = byId.get(predecessorId);
  if (!dependent || !predecessor) return false; // both must exist in this Journey

  // Same Milestone only (both-undefined counts as the same group in a Milestone-less Journey).
  if (dependent.milestoneId !== predecessor.milestoneId) return false;

  // Predecessor must be EARLIER in the Journey's Step order (rejects forward references).
  const dependentIndex = journey.steps.findIndex((s) => s.id === dependentId);
  const predecessorIndex = journey.steps.findIndex((s) => s.id === predecessorId);
  if (predecessorIndex >= dependentIndex) return false;

  // Single predecessor: the dependent may not already depend on a DIFFERENT Step.
  if (dependent.dependsOnStepId && dependent.dependsOnStepId !== predecessorId) return false;

  // Single dependent: the predecessor may not already have a DIFFERENT dependent (keeps chains
  // strictly linear — computeWeekLayout follows only the first dependent, so a 2nd would vanish).
  if (directDependentsOf(predecessor, journey).some((d) => d.id !== dependentId)) return false;

  // No cycle: the predecessor must not already sit among the dependent's descendants.
  if (descendantsInclusive(dependent, journey).some((s) => s.id === predecessorId)) return false;

  // Resulting chain length: the predecessor's ancestry (inclusive) + the dependent's descendants
  // (inclusive), which are disjoint given no cycle. Must stay within the linear cap.
  const chainLength =
    ancestorsInclusive(predecessor, byId).length + descendantsInclusive(dependent, journey).length;
  return chainLength <= MAX_CHAIN_LENGTH;
}
