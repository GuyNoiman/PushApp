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
  defaultVariant,
  variantById,
  type AxisId,
  type AxisValue,
  type AxisValueId,
  type JourneyDefinition,
  type JourneyVariant,
  type LibraryRef,
  type ProfileSignalId,
  type VariantAxis,
} from './journeyDefinition';

/** How a placement or a choice came about — reported, never guessed at by the caller. */
export type VariantVia = 'answer' | 'profile' | 'rating' | 'default';

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

/** Where the user sits on ONE axis, and what put them there. */
export interface AxisPlacement {
  axisId: AxisId;
  value: AxisValueId;
  via: Extract<VariantVia, 'answer' | 'profile'>;
  /** The answer or profile id that decided it. */
  signal: string;
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

/** The values a variant covers on an axis; an axis it omits means it suits EVERY position on it. */
function coverage(variant: JourneyVariant, axis: VariantAxis): Set<AxisValueId> {
  const declared = variant.position[axis.id];
  return new Set(declared && declared.length > 0 ? declared : axis.values.map((v) => v.id));
}

/**
 * Where this user sits on each of the Journey's axes, from what is already known.
 *
 * An explicit ANSWER always wins over the profile: the answer was given about this Journey, now,
 * and the profile is a prior collected in the user's first minutes about goals in general.
 */
export function placeOnAxes(def: JourneyDefinition, ctx: VariantContext = {}): AxisPlacement[] {
  const placements: AxisPlacement[] = [];
  for (const axis of def.axes) {
    const answered = ctx.answers?.[axis.id];
    if (answered && axis.values.some((v) => v.id === answered)) {
      placements.push({ axisId: axis.id, value: answered, via: 'answer', signal: `${axis.id}:${answered}` });
      continue;
    }
    // The profile, in the caller's priority order: the FIRST id this axis recognises places them.
    const mapped = axis.answeredByProfile;
    if (!mapped) continue;
    const hit = (ctx.signals ?? []).find((id) => mapped[id] !== undefined);
    if (hit) placements.push({ axisId: axis.id, value: mapped[hit], via: 'profile', signal: hit });
  }
  return placements;
}

/** The versions still in play once every known placement has been applied. Never empty. */
function candidates(def: JourneyDefinition, placements: readonly AxisPlacement[]): JourneyVariant[] {
  const surviving = def.variants.filter((variant) =>
    placements.every((p) => {
      const axis = def.axes.find((a) => a.id === p.axisId);
      return !axis || coverage(variant, axis).has(p.value);
    }),
  );
  // CONTRADICTORY input (an axis answered in a way no version covers) must not produce "no plan".
  // Fall back to the whole set and let the profile and the default decide, exactly as at cold start.
  return surviving.length > 0 ? surviving : [...def.variants];
}

/**
 * The questions this Journey still needs asked — after it has been chosen, and only these.
 *
 * An axis is asked when BOTH of these hold, and dropped the moment either fails:
 *  1. nothing already places the user on it (no answer, nothing in the profile), and
 *  2. the versions still in play genuinely differ on it — if they all cover the same positions, the
 *     answer cannot change which version is built, so the question would cost the user a turn of
 *     their attention and buy nothing.
 */
export function variantQuestionsFor(
  def: JourneyDefinition,
  ctx: VariantContext = {},
): VariantQuestion[] {
  const placements = placeOnAxes(def, ctx);
  const placed = new Set(placements.map((p) => p.axisId));
  const inPlay = candidates(def, placements);
  if (inPlay.length < 2) return [];

  return def.axes
    .filter((axis) => !placed.has(axis.id) && discriminates(axis, inPlay))
    .map((axis) => ({ axisId: axis.id, questionKey: axis.questionKey, values: axis.values }));
}

/** True when at least two of the versions in play cover different positions on this axis. */
function discriminates(axis: VariantAxis, inPlay: readonly JourneyVariant[]): boolean {
  const first = coverage(inPlay[0], axis);
  return inPlay.some((variant) => {
    const set = coverage(variant, axis);
    return set.size !== first.size || [...set].some((v) => !first.has(v));
  });
}

/**
 * Pick the version. Deterministic, offline, no model call.
 *
 * The ladder, strongest evidence first:
 *  1. **What the user told this Journey** — an axis answer, which filters the candidates.
 *  2. **What the profile argues** — the weighted signals a version declared it cares about, read in
 *     the caller's priority order.
 *  3. **What the outcomes say** — the rating, as a TIE-BREAK only (D62 §4 makes a version a rated
 *     entity; this is where that rating is allowed to matter, and it is deliberately the weakest
 *     rung so a thin sample can never overrule an answer).
 *  4. **The declared default** — named by the Journey, reported honestly as `'default'`.
 */
export function selectVariant(def: JourneyDefinition, ctx: VariantContext = {}): VariantChoice {
  const placements = placeOnAxes(def, ctx);
  const inPlay = candidates(def, placements);
  const ref = { definitionId: def.id, version: def.version };

  if (inPlay.length === 1) {
    const placement = placements.find((p) => p.via === 'answer') ?? placements[0];
    const via: VariantVia = placement?.via ?? 'default';
    return { ...ref, variantId: inPlay[0].id, variant: inPlay[0], via, signal: placement?.signal ?? 'default' };
  }

  // 2 — the profile. A signal's WEIGHT is the Journey's declared preference; its POSITION in the
  // caller's list is the profile's own priority, and it decides equal weights.
  const signals = ctx.signals ?? [];
  const scored = inPlay.map((variant) => {
    let weight = 0;
    let firstIndex = Number.MAX_SAFE_INTEGER;
    let signal = '';
    signals.forEach((id, index) => {
      const declared = variant.profileSignals?.[id];
      if (declared === undefined) return;
      weight += declared;
      if (index < firstIndex) {
        firstIndex = index;
        signal = id;
      }
    });
    return { variant, weight, firstIndex, signal };
  });
  const best = [...scored].sort((a, b) => b.weight - a.weight || a.firstIndex - b.firstIndex)[0];
  if (best.weight > 0) {
    // A genuine tie on both weight and position is not a match — two versions the profile likes
    // equally is exactly the case the rating and then the default exist for.
    const tied = scored.filter((s) => s.weight === best.weight && s.firstIndex === best.firstIndex);
    if (tied.length === 1) {
      return { ...ref, variantId: best.variant.id, variant: best.variant, via: 'profile', signal: best.signal };
    }
  }

  // 3 — the rating, over whatever is still tied.
  const rated = inPlay
    .map((variant) => ({ variant, score: ctx.ratings?.[variant.id] }))
    .filter((r): r is { variant: JourneyVariant; score: number } => typeof r.score === 'number')
    .sort((a, b) => b.score - a.score);
  if (rated.length > 0 && (rated.length === 1 || rated[0].score > rated[1].score)) {
    return { ...ref, variantId: rated[0].variant.id, variant: rated[0].variant, via: 'rating', signal: 'rating' };
  }

  // 4 — the declared default, or the first version still in play if the default was filtered out by
  // an answer (a user who told us something we must honour, about a Journey whose default does not
  // suit them).
  const fallback = inPlay.includes(defaultVariant(def)) ? defaultVariant(def) : inPlay[0];
  return { ...ref, variantId: fallback.id, variant: fallback, via: 'default', signal: 'default' };
}

/** Resolve a stamped {@link LibraryRef} back to its version, or undefined if the content moved on. */
export function variantFromRef(
  def: JourneyDefinition,
  ref: LibraryRef | undefined,
): JourneyVariant | undefined {
  return ref && ref.definitionId === def.id ? variantById(def, ref.variantId) : undefined;
}
