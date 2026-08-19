/**
 * goalFamily — the SEVERAL Journeys that exist for one goal, and how one of them is chosen.
 *
 * THE RULE THIS IMPLEMENTS (founder, 2026-08-18, recorded in `./journeyDefinition`'s header):
 * **same Milestones, different pace or path ⇒ the same Journey in another version; different
 * Milestones ⇒ a different Journey for the same goal.** Everything downstream follows from it. Three
 * honest ways to work out your next career move do not share an arc — one builds criteria before it
 * tests anything, one tests first and derives the criteria from what happened, one alternates — so
 * they are three JOURNEYS, not three versions of one. What was missing was the object that says so:
 * a place where those three sit together as candidates for the same goal.
 *
 * That is a goal family. It holds:
 *  - the GOAL, as the user would say it ("understand what my next career move is");
 *  - the DIAGNOSIS that lands someone here — the expert's subtype and the bottleneck it found —
 *    as open strings the engine never interprets;
 *  - the AXIS its member Journeys differ on, with the question that places a user on it; and
 *  - the MEMBERS, each naming a {@link ./journeyDefinition.JourneyDefinition} and its position.
 *
 * WHY THE AXIS IS ON THE FAMILY AND NOT ON A JOURNEY. The dimension "how much certainty before the
 * first real-world test" is not a property of any one of the three Journeys — it is the dimension
 * they differ ALONG. A Journey that declared it alone would be describing its neighbours. The axis
 * shape is deliberately the SAME type a Journey uses for its own versions
 * ({@link ./journeyDefinition.VariantAxis}), so a question is asked, skipped, or dropped by the same
 * rules at both levels, and the copy lives in the same translation cache.
 *
 * THE ORDER IS THE DECISION, one rung higher than D62 §2 put it:
 *   the expert diagnoses → the FAMILY is chosen → the JOURNEY is chosen (here) → its VERSION is
 *   chosen (`./selectVariant`). Each rung asks only what it needs and only what the rung above left
 *   open, which is the founder's "if changing the answer would not change what we choose, do not ask
 *   the question" applied all the way down.
 *
 * SECURITY-PRIVACY G1: ids and authored content only. Nothing here derives from the user's words.
 *
 * Pure TypeScript — no React, no i18n, no clock reads, no vendor imports.
 */
import type { JourneyShape } from '../types';
import type { JourneyDefinition, VariantAxis } from './journeyDefinition';
import {
  choose,
  questionsFor,
  type AxisQuestion,
  type Selectable,
  type SelectionContext,
  type SelectionVia,
} from './selectable';

/**
 * One member Journey of a family: WHICH definition it is, and where it sits on the family's axis.
 *
 * `id` IS the {@link JourneyDefinition.id} — the member is not a separate entity with a life of its
 * own, it is that Journey's membership of this family. Keeping them one field is what stops a
 * family from ever pointing at a Journey it did not name.
 */
export interface FamilyMember extends Selectable {
  id: string;
}

/** Several Journeys authored for ONE goal, and the difference between them. */
export interface GoalFamily {
  id: string;
  /**
   * Bumped whenever the axis or the member set changes, so evidence gathered under one shape is
   * never silently read as evidence about another (the same provenance rule definitions follow).
   */
  version: number;
  /** The coarse domain this goal belongs to — the expert that diagnoses it. */
  domain: string;
  /** The plan shape every member produces. Members of one family never differ on this. */
  shape: JourneyShape;
  /**
   * The expert's own classification of the goal, and the thing it decided is actually in the way.
   * OPEN strings on purpose, exactly like an axis id: the engine matches them, it never interprets
   * them, so a domain adding a new subtype or a new bottleneck is content.
   */
  subtype: string;
  bottleneck: string;
  /** The goal in the user's own terms — authored English, plus its key in the `library` cache. */
  goal: string;
  goalKey: string;
  /** The dimension(s) the member Journeys differ along. Usually exactly one. */
  axes: readonly VariantAxis[];
  members: readonly FamilyMember[];
  /**
   * The member built when nothing is known and nothing was asked. It is never "the best one" — it
   * is the safest one to hand someone we have learned nothing about, and it must be named rather
   * than fall out of array order.
   */
  defaultDefinitionId: string;
}

/** Which Journey of the family this person gets, and why. */
export interface JourneyChoice {
  familyId: string;
  definitionId: string;
  via: SelectionVia;
  /** The axis placement (`<axisId>:<value>`), profile signal id, `'rating'` or `'default'`. */
  signal: string;
}

/**
 * Check a family for the content mistakes that would silently break selection — a member on an axis
 * the family never declared, a default that is not a member, a member pointing at a Journey that
 * does not exist or has the wrong shape. Returns a list of problems; EMPTY means valid.
 *
 * `known` is the definition lookup, passed in rather than imported so this file stays free of the
 * content registry (and so a test can validate a family made of test Journeys).
 */
export function validateGoalFamily(
  family: GoalFamily,
  known: (id: string) => JourneyDefinition | undefined,
): string[] {
  const problems: string[] = [];
  const axisIds = new Set(family.axes.map((a) => a.id));
  if (family.axes.length !== axisIds.size) problems.push('duplicate axis id');

  const memberIds = new Set(family.members.map((m) => m.id));
  if (family.members.length !== memberIds.size) problems.push('duplicate member');
  // A family of one has nothing to choose between: it is a Journey, and saying otherwise invites a
  // question that cannot change anything.
  if (family.members.length < 2) problems.push('family has fewer than two members');
  if (!memberIds.has(family.defaultDefinitionId)) problems.push('defaultDefinitionId names no member');

  for (const member of family.members) {
    const definition = known(member.id);
    if (!definition) {
      problems.push(`member ${member.id}: no such Journey`);
    } else {
      if (definition.shape !== family.shape) problems.push(`member ${member.id}: wrong shape`);
      if (definition.domain !== 'any' && definition.domain !== family.domain) {
        problems.push(`member ${member.id}: wrong domain`);
      }
    }
    for (const [axisId, values] of Object.entries(member.position)) {
      const axis = family.axes.find((a) => a.id === axisId);
      if (!axis) {
        problems.push(`member ${member.id}: undeclared axis ${axisId}`);
        continue;
      }
      if (values.length === 0) problems.push(`member ${member.id}: empty position on ${axisId}`);
      for (const value of values) {
        if (!axis.values.some((v) => v.id === value)) {
          problems.push(`member ${member.id}: unknown value ${value} on ${axisId}`);
        }
      }
    }
  }
  return problems;
}

/**
 * The questions this family still needs asked before it can choose — none of them asked of someone
 * whose profile already answers them, and none asked once the surviving members no longer differ.
 */
export function journeyQuestionsFor(
  family: GoalFamily,
  ctx: SelectionContext = {},
): AxisQuestion[] {
  return questionsFor(family.axes, family.members, ctx);
}

/**
 * Pick the Journey. The shared ladder (`./selectable`): what the user told us, then what the profile
 * argues, then what outcomes say as a tie-break only, then the family's own declared default —
 * reported honestly, so a cold start is never dressed up as a match.
 */
export function selectJourney(family: GoalFamily, ctx: SelectionContext = {}): JourneyChoice {
  const selection = choose(family.axes, family.members, family.defaultDefinitionId, ctx);
  return {
    familyId: family.id,
    definitionId: selection.item.id,
    via: selection.via,
    signal: selection.signal,
  };
}
