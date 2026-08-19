/**
 * journeyDefinition — a Journey declares, in its own content, what its versions differ on.
 *
 * THE DECISION THIS IMPLEMENTS (D62, founder 2026-08-18): *"nothing is fixed in advance about which
 * parameters may vary between the variants; every Journey defines for itself what the difference
 * between its versions is … in one case it can be the level of certainty, in another free time, in
 * another how urgent it is for the user."*
 *
 * So there is no enum of possible differences here, and there must never be one. A Journey carries
 * its own {@link VariantAxis} list — the dimension(s) its versions actually differ on — and each
 * version says where it sits on them. **A new kind of difference is CONTENT, not code:** adding an
 * axis means adding an entry to a definition and its copy to the `library` namespace. Nothing in
 * this file, in the selector, or in the ratings knows what an axis MEANS.
 *
 * The same rule holds one level out, for the profile (D62 §3): there is no closed taxonomy of signal
 * types. A profile field is just an id, and what it does is whatever the Journey that reads it says
 * it does — either it PLACES the user on a declared axis ({@link VariantAxis.answeredByProfile}) or
 * it ARGUES for a version ({@link JourneyVariant.profileSignals}). Any field may do either, for any
 * Journey, and a field that means nothing to a Journey is simply absent from it.
 *
 * WHAT IS A VARIANT AND WHAT IS A DIFFERENT JOURNEY — the founder's own rule, recorded because the
 * distinction is easy to lose and expensive to lose: **same Milestones, different pace or path ⇒ the
 * same Journey in another version. Different Milestones ⇒ a different Journey for the same goal.**
 * A definition that starts sprouting variants with different Milestone arcs has become two Journeys
 * and should be split.
 *
 * TERMINOLOGY: "variant" here always means *a version of one Journey*. The live, personal object is
 * a Journey (canonical); a {@link JourneyDefinition} is the authored, inert thing it is instantiated
 * from — the `Journey Template` of `Plan_Library_and_Learning_PRD` §4, now carrying its own variant
 * axis.
 *
 * SECURITY-PRIVACY G1: everything in a definition is AUTHORED content — ids and i18n keys. No user
 * text ever enters one. The ids (`definitionId`, `variantId`, an axis value) are coarse and are the
 * only part of a matched plan that may ever travel outward.
 *
 * Pure TypeScript — no React, no i18n, no clock reads, no vendor imports.
 */
import { validateAuthoredArc, type AuthoredArc } from './authoredArc';
import type { RecurringApproachId } from './recurringApproaches';
import type { JourneyShape } from '../types';

/**
 * The id of one axis a Journey's versions differ on. A FREE STRING on purpose — this is the exact
 * place a closed union would freeze the product (D62 §1). `certainty`, `timeAvailable`, `urgency`
 * and `friction` are all equally legal, and none of them is known to this module.
 */
export type AxisId = string;

/** One position on an axis (`'low' | 'high'`, `'noOccasion'`, …). Also a free string, same reason. */
export type AxisValueId = string;

/**
 * The id of one PROFILE answer — an onboarding option id, a reason id, a derived behavioural marker.
 * An open set (D62 §3): the profile is a bag of ids, and a Journey decides which ones it cares about.
 */
export type ProfileSignalId = string;

/** One position on an axis, with the key its user-facing label lives under in the `library` namespace. */
export interface AxisValue {
  id: AxisValueId;
  /** Key into the `library` i18n namespace (the translation cache, D55) for this option's copy. */
  labelKey: string;
}

/**
 * ONE dimension a Journey's versions differ on, declared by that Journey.
 *
 * The axis owns the QUESTION that places a user on it. That is the point of D62 §2: the question is
 * not asked by onboarding, not asked by the domain expert, and not asked of everyone — it is asked
 * *after* this Journey has been chosen, and only if this Journey needs it. A user who never meets
 * this Journey is never asked its question.
 */
export interface VariantAxis {
  id: AxisId;
  /** Key into the `library` namespace for the question's own text. */
  questionKey: string;
  /** The positions on this axis, in display order. At least two, or the axis decides nothing. */
  values: readonly AxisValue[];
  /**
   * Profile answers that ALREADY place the user on this axis, so the question is not asked twice.
   *
   * This is the mechanism behind "nobody is asked a question that cannot change their answer": if
   * the user told onboarding that they take on too much at once, this Journey already knows where
   * they sit and asking again would be the app failing to listen to something it was told. It is
   * also the open-set rule in one field — the KEYS are profile ids this Journey chose to read, and
   * no other Journey has to agree with it.
   */
  answeredByProfile?: Readonly<Record<ProfileSignalId, AxisValueId>>;
}

/**
 * What a variant actually BUILDS. A discriminated union so a new kind of content is a new member
 * rather than a loosened type.
 *
 *  - `recurring` — one of the authored ways a repeated action takes hold (`./recurringApproaches`).
 *  - `process`   — a whole authored Milestone arc with its Steps (`./authoredArc`).
 *
 * The process member is what lets a Journey carry its own arc instead of borrowing the one
 * hardcoded in its domain expert. It does NOT make an arc a variable of a version: the founder's
 * rule is that a differing arc is a different JOURNEY (see the file header), so in practice a
 * process definition has one version holding one arc, and a second arc for the same goal is a
 * second definition grouped with it by a {@link ./goalFamily.GoalFamily}. The union member is
 * per-variant only because that is where `build` lives — the day a process Journey grows real
 * versions (same Milestones, different pace), they each name the arc they build.
 */
export type VariantBuild =
  | { kind: 'recurring'; approach: RecurringApproachId }
  | { kind: 'process'; arc: AuthoredArc };

/** One version of a Journey: where it sits on its Journey's axes, and what it builds. */
export interface JourneyVariant {
  /** Stable id, unique within its definition. It is the RATED ENTITY's identity (D62 §4). */
  id: string;
  /** The one line describing what makes this version different — authored English (the fallback). */
  essence: string;
  /** This version's entry in the `library` translation cache. */
  essenceKey: string;
  /**
   * Where this version sits on each of its Journey's declared axes. A version may cover SEVERAL
   * values of an axis, and an axis it omits entirely means "this version suits every position on
   * it" — which is how a Journey declares a version that does not discriminate on that dimension,
   * rather than being forced to invent a position for it.
   */
  position: Readonly<Record<AxisId, readonly AxisValueId[]>>;
  /**
   * Profile answers that ARGUE for this version without placing anyone on an axis, weighted. An
   * open set (D62 §3): any profile field may influence any choice. A weight is a relative
   * preference, never a probability and never a score about the person.
   */
  profileSignals?: Readonly<Record<ProfileSignalId, number>>;
  build: VariantBuild;
}

/**
 * One authored Journey in the library, with its own variant axis and its own versions.
 *
 * `version` is provenance and is bumped whenever the axes or the variant set change, so a rating
 * gathered under one shape is never silently read as evidence about another (`Plan_Library_and_
 * Learning_PRD` §6.1 requires provenance and version from day one, not retrofitted).
 */
export interface JourneyDefinition {
  id: string;
  version: number;
  /** The plan shape this Journey produces — a repeated action or a staged process. */
  shape: JourneyShape;
  /**
   * The coarse domain this Journey is a candidate for, or `'any'` for one that is not domain
   * knowledge at all (the generic recurring Journey is exactly that: how a repeated action takes
   * hold is the same for a protein shake and for changing the pillowcases).
   */
  domain: string | 'any';
  axes: readonly VariantAxis[];
  variants: readonly JourneyVariant[];
  /**
   * The version built when nothing is known and nothing was asked. It is never "the best one" — it
   * is the safest one to hand someone we have learned nothing about, and it must be named rather
   * than fall out of array order.
   */
  defaultVariantId: string;
}

/** Where a Journey + one of its versions came from, as stamped on a live Journey. */
export interface LibraryRef {
  definitionId: string;
  variantId: string;
  /** The {@link JourneyDefinition.version} in force when this Journey was built. */
  version: number;
}

/**
 * Check a definition for the content mistakes that would silently break selection — a variant
 * placed on an axis the Journey never declared, a position that names no value, a default that does
 * not exist. Returns a list of problems; EMPTY means valid.
 *
 * It exists because a definition is content, and content is exactly what gets edited by someone who
 * is not reading this file. A test asserts every shipped definition passes, so a typo in an axis id
 * fails the suite instead of quietly producing a Journey with one version.
 */
export function validateJourneyDefinition(def: JourneyDefinition): string[] {
  const problems: string[] = [];
  const axisIds = new Set(def.axes.map((a) => a.id));

  if (def.axes.length !== axisIds.size) problems.push('duplicate axis id');
  for (const axis of def.axes) {
    const valueIds = new Set(axis.values.map((v) => v.id));
    if (axis.values.length !== valueIds.size) problems.push(`duplicate value in axis ${axis.id}`);
    // An axis with fewer than two positions cannot separate anything, so it is a question asked for
    // no reason — the one thing D62 §2 forbids outright.
    if (axis.values.length < 2) problems.push(`axis ${axis.id} has fewer than two values`);
    for (const [signal, value] of Object.entries(axis.answeredByProfile ?? {})) {
      if (!valueIds.has(value)) problems.push(`axis ${axis.id}: profile ${signal} → unknown ${value}`);
    }
  }

  const variantIds = new Set(def.variants.map((v) => v.id));
  if (def.variants.length !== variantIds.size) problems.push('duplicate variant id');
  if (def.variants.length === 0) problems.push('definition has no variants');
  if (!variantIds.has(def.defaultVariantId)) problems.push('defaultVariantId names no variant');

  for (const variant of def.variants) {
    // An authored arc is content too, and its own mistakes (a Step in no Milestone, a dependency
    // that runs backwards) are reported here so ONE check covers a definition end to end.
    if (variant.build.kind === 'process') {
      for (const problem of validateAuthoredArc(variant.build.arc)) {
        problems.push(`variant ${variant.id}: ${problem}`);
      }
    }
    for (const [axisId, values] of Object.entries(variant.position)) {
      const axis = def.axes.find((a) => a.id === axisId);
      if (!axis) {
        problems.push(`variant ${variant.id}: undeclared axis ${axisId}`);
        continue;
      }
      if (values.length === 0) problems.push(`variant ${variant.id}: empty position on ${axisId}`);
      for (const value of values) {
        if (!axis.values.some((v) => v.id === value)) {
          problems.push(`variant ${variant.id}: unknown value ${value} on ${axisId}`);
        }
      }
    }
  }
  return problems;
}

/** One variant by id, or undefined. Never throws — an unknown id falls back to the default. */
export function variantById(
  def: JourneyDefinition,
  variantId: string | undefined,
): JourneyVariant | undefined {
  return def.variants.find((v) => v.id === variantId);
}

/** The definition's default variant. Content is validated, so this is always present. */
export function defaultVariant(def: JourneyDefinition): JourneyVariant {
  return variantById(def, def.defaultVariantId) ?? def.variants[0];
}
