/**
 * selectVariant — which VERSION of a chosen Journey this person gets, and which question (if any)
 * has to be asked to find out.
 *
 * THE ORDER IS THE DECISION (D62 §2). The professional choice comes first: which Journey fits this
 * goal. Only then does this run, and it asks *only* the questions THAT Journey declared it needs.
 * Nobody is asked a question that cannot change their answer — which is the partner's own rule for
 * core onboarding ("if changing the answer would not change the Journey we choose, the question
 * should not be there") applied one level down, and it is enforced here mechanically rather than by
 * remembering: an axis is dropped when the profile already places the user on it, and dropped again
 * when the surviving versions no longer differ on it.
 *
 * THE ALGORITHM ITSELF IS NOT HERE. Choosing one of N candidates by answer → profile → rating →
 * declared default is the SAME decision the library makes one level up, when it picks which Journey
 * of the several authored for a goal this person gets (`./selectJourney`). It lives once, in
 * `./selectable`, and this file is the Journey-version-shaped face of it. Two copies of that ladder
 * is how a fix at one level silently fails to apply at the other.
 *
 * THE ENGINE KNOWS NOTHING ABOUT WHAT AN AXIS MEANS. It reads ids. Certainty, free time, urgency and
 * friction are all the same shape to it, which is exactly what makes a new kind of difference
 * content rather than code.
 *
 * WHY THE PROFILE ARRIVES AS AN ORDERED LIST OF IDS, and not as a typed object: D62 §3 — there is no
 * fixed taxonomy of signal types, and any profile field may influence any choice. A typed parameter
 * here would be that taxonomy, written in the one place it is hardest to change. The caller flattens
 * whatever it knows into ids, MOST TELLING FIRST, and the order carries the priority (in
 * `./matchApproach`: what breaks someone outranks what they believe helps them).
 *
 * IT EXPLAINS ITSELF, always. Every choice returns the id that decided it. A matcher that cannot say
 * why it chose cannot be checked, and one that cannot be checked drifts toward recommending whatever
 * is easiest — the failure the whole learning layer is built to avoid (Plan_Library_and_Learning_PRD
 * §8.4.1).
 *
 * SECURITY-PRIVACY G1: ids only, in and out. Free text (`helpOther`, `frictionOther`, the goal
 * itself) must never be passed as a signal — the chosen variant id eventually travels outward, and
 * nothing that reaches it may derive from the user's own words.
 *
 * Pure TypeScript — no React, no i18n, no clock reads, no vendor imports.
 */
import {
  variantById,
  type AxisId,
  type AxisValue,
  type AxisValueId,
  type JourneyDefinition,
  type JourneyVariant,
  type LibraryRef,
  type ProfileSignalId,
} from './journeyDefinition';
import { choose, placeOn, questionsFor, type AxisPlacement, type SelectionVia } from './selectable';

/**
 * How a placement or a choice came about. Re-exported under the library's older name so callers that
 * speak about VERSIONS keep their vocabulary; it is the same union as {@link SelectionVia}.
 */
export type VariantVia = SelectionVia;

/** Where the user sits on ONE axis, and what put them there. */
export type { AxisPlacement };

/** What is known about this user when the version is picked. Every field optional — cold start is normal. */
export interface VariantContext {
  /** The user's answers to this Journey's OWN axis questions, keyed by axis id. */
  answers?: Readonly<Record<AxisId, AxisValueId>>;
  /**
   * The profile, flattened to ids, MOST TELLING FIRST. An open set (D62 §3) — onboarding option
   * ids, reason ids, derived behavioural markers, anything a Journey chose to read.
   */
  signals?: readonly ProfileSignalId[];
  /**
   * Observed fitness per variant id (`./variantRatings`), used ONLY to break a tie between versions
   * that the answers and the profile could not separate. It is never allowed to overrule what the
   * user actually told us, which is the inverse of the usual failure where a weak signal quietly
   * overrides a considered answer.
   */
  ratings?: Readonly<Record<string, number | undefined>>;
}

/** A question this Journey needs asked, in the order the Journey declared its axes. */
export interface VariantQuestion {
  axisId: AxisId;
  /** Key into the `library` i18n namespace for the question text. */
  questionKey: string;
  values: readonly AxisValue[];
}

/** The chosen version, with the reason. */
export interface VariantChoice extends LibraryRef {
  variant: JourneyVariant;
  via: VariantVia;
  /**
   * What decided it: an axis placement as `<axisId>:<value>`, a profile signal id, `'rating'`, or
   * `'default'` — the honest answer for a user we know nothing about, which must never be dressed
   * up as a match.
   */
  signal: string;
}

/**
 * Where this user sits on each of the Journey's axes, from what is already known.
 *
 * An explicit ANSWER always wins over the profile: the answer was given about this Journey, now,
 * and the profile is a prior collected in the user's first minutes about goals in general.
 */
export function placeOnAxes(def: JourneyDefinition, ctx: VariantContext = {}): AxisPlacement[] {
  return placeOn(def.axes, ctx);
}

/**
 * The questions this Journey still needs asked — after it has been chosen, and only these.
 *
 * An axis is asked when nothing already places the user on it AND the versions still in play
 * genuinely differ on it (see {@link ./selectable.questionsFor} for why both conditions matter).
 */
export function variantQuestionsFor(
  def: JourneyDefinition,
  ctx: VariantContext = {},
): VariantQuestion[] {
  return questionsFor(def.axes, def.variants, ctx);
}

/**
 * Pick the version. Deterministic, offline, no model call — the shared ladder in `./selectable`
 * (answer → profile → rating → the Journey's own declared default), stamped with the provenance a
 * live Journey carries so the verdict it eventually earns is credited to the version that produced
 * it (D62 §4).
 */
export function selectVariant(def: JourneyDefinition, ctx: VariantContext = {}): VariantChoice {
  const selection = choose(def.axes, def.variants, def.defaultVariantId, ctx);
  return {
    definitionId: def.id,
    version: def.version,
    variantId: selection.item.id,
    variant: selection.item,
    via: selection.via,
    signal: selection.signal,
  };
}

/** Resolve a stamped {@link LibraryRef} back to its version, or undefined if the content moved on. */
export function variantFromRef(
  def: JourneyDefinition,
  ref: LibraryRef | undefined,
): JourneyVariant | undefined {
  return ref && ref.definitionId === def.id ? variantById(def, ref.variantId) : undefined;
}
