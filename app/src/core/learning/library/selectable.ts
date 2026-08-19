/**
 * selectable — the ONE choosing algorithm the library uses, at every level it chooses at.
 *
 * The library makes the same shape of decision twice, one level apart:
 *
 *   • **which JOURNEY** of the several that exist for a goal this person gets (`./selectJourney`),
 *     and
 *   • **which VERSION** of that Journey (`./selectVariant`).
 *
 * D62 settled that a differing Milestone arc is a different Journey, never a version of one — so
 * both decisions genuinely exist, and both are "pick one of N candidates, using what the user told
 * us, then what their profile argues, then what outcomes say, then a named default". Writing that
 * ladder twice is how the two would drift: a fix to the tie-break at one level would silently not
 * apply at the other. So the ladder lives here once, over anything that is {@link Selectable}, and
 * the two callers are thin.
 *
 * THE ENGINE KNOWS NOTHING ABOUT WHAT AN AXIS MEANS. It reads ids. Certainty, free time, urgency and
 * friction are all the same shape to it, which is exactly what makes a new kind of difference
 * content rather than code (D62 §1).
 *
 * WHY THE PROFILE ARRIVES AS AN ORDERED LIST OF IDS, and not as a typed object: D62 §3 — there is no
 * fixed taxonomy of signal types, and any profile field may influence any choice. A typed parameter
 * here would be that taxonomy, written in the one place it is hardest to change. The caller flattens
 * whatever it knows into ids, MOST TELLING FIRST, and the order carries the priority.
 *
 * IT EXPLAINS ITSELF, always. Every choice returns the id that decided it. A matcher that cannot say
 * why it chose cannot be checked, and one that cannot be checked drifts toward recommending whatever
 * is easiest — the failure the whole learning layer is built to avoid (Plan_Library_and_Learning_PRD
 * §8.4.1).
 *
 * SECURITY-PRIVACY G1: ids only, in and out. Free text (the goal itself, an "other" answer) must
 * never be passed as a signal — the chosen id eventually travels outward, and nothing that reaches
 * it may derive from the user's own words.
 *
 * Pure TypeScript — no React, no i18n, no clock reads, no vendor imports.
 */
import type {
  AxisId,
  AxisValue,
  AxisValueId,
  ProfileSignalId,
  VariantAxis,
} from './journeyDefinition';

/**
 * Anything the library can choose between: it has an identity, it says where it sits on the axes its
 * group declared, and it may name profile answers that argue for it.
 *
 * Both a version of a Journey ({@link ./journeyDefinition.JourneyVariant}) and one member Journey of
 * a goal family ({@link ./goalFamily.FamilyMember}) satisfy this, which is the point.
 */
export interface Selectable {
  id: string;
  /**
   * Where this candidate sits on each declared axis. A candidate may cover SEVERAL values of an
   * axis, and an axis it omits entirely means "this one suits every position on it" — which is how
   * content declares a candidate that does not discriminate on that dimension, rather than being
   * forced to invent a position for it.
   */
  position: Readonly<Record<AxisId, readonly AxisValueId[]>>;
  /**
   * Profile answers that ARGUE for this candidate without placing anyone on an axis, weighted. An
   * open set (D62 §3). A weight is a relative preference, never a probability and never a score
   * about the person.
   */
  profileSignals?: Readonly<Record<ProfileSignalId, number>>;
}

/** How a placement or a choice came about — reported, never guessed at by the caller. */
export type SelectionVia = 'answer' | 'profile' | 'rating' | 'default';

/** What is known about this user when a choice is made. Every field optional — cold start is normal. */
export interface SelectionContext {
  /** The user's answers to the declared axis questions, keyed by axis id. */
  answers?: Readonly<Record<AxisId, AxisValueId>>;
  /** The profile, flattened to ids, MOST TELLING FIRST. An open set (D62 §3). */
  signals?: readonly ProfileSignalId[];
  /**
   * Observed fitness per candidate id, used ONLY to break a tie between candidates that the answers
   * and the profile could not separate. It is never allowed to overrule what the user actually told
   * us, which is the inverse of the usual failure where a weak signal quietly overrides a
   * considered answer.
   */
  ratings?: Readonly<Record<string, number | undefined>>;
}

/** Where the user sits on ONE axis, and what put them there. */
export interface AxisPlacement {
  axisId: AxisId;
  value: AxisValueId;
  via: Extract<SelectionVia, 'answer' | 'profile'>;
  /** The answer or profile id that decided it. */
  signal: string;
}

/** A question the group still needs asked, in the order its axes were declared. */
export interface AxisQuestion {
  axisId: AxisId;
  /** Key into the `library` i18n namespace for the question text. */
  questionKey: string;
  values: readonly AxisValue[];
}

/** The chosen candidate, with the reason. */
export interface Selection<T extends Selectable> {
  item: T;
  via: SelectionVia;
  /**
   * What decided it: an axis placement as `<axisId>:<value>`, a profile signal id, `'rating'`, or
   * `'default'` — the honest answer for a user we know nothing about, which must never be dressed
   * up as a match.
   */
  signal: string;
}

/** The values a candidate covers on an axis; an axis it omits means it suits EVERY position on it. */
function coverage(item: Selectable, axis: VariantAxis): Set<AxisValueId> {
  const declared = item.position[axis.id];
  return new Set(declared && declared.length > 0 ? declared : axis.values.map((v) => v.id));
}

/**
 * Where this user sits on each declared axis, from what is already known.
 *
 * An explicit ANSWER always wins over the profile: the answer was given about this choice, now, and
 * the profile is a prior collected in the user's first minutes about goals in general.
 */
export function placeOn(
  axes: readonly VariantAxis[],
  ctx: SelectionContext = {},
): AxisPlacement[] {
  const placements: AxisPlacement[] = [];
  for (const axis of axes) {
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

/** The candidates still in play once every known placement has been applied. Never empty. */
export function candidatesAmong<T extends Selectable>(
  axes: readonly VariantAxis[],
  items: readonly T[],
  placements: readonly AxisPlacement[],
): T[] {
  const surviving = items.filter((item) =>
    placements.every((p) => {
      const axis = axes.find((a) => a.id === p.axisId);
      return !axis || coverage(item, axis).has(p.value);
    }),
  );
  // CONTRADICTORY input (an axis answered in a way no candidate covers) must not produce "no plan".
  // Fall back to the whole set and let the profile and the default decide, exactly as at cold start.
  return surviving.length > 0 ? surviving : [...items];
}

/**
 * The questions this choice still needs asked — after the level above it has been decided, and only
 * these.
 *
 * An axis is asked when BOTH of these hold, and dropped the moment either fails:
 *  1. nothing already places the user on it (no answer, nothing in the profile), and
 *  2. the candidates still in play genuinely differ on it — if they all cover the same positions,
 *     the answer cannot change what gets built, so the question would cost the user a turn of their
 *     attention and buy nothing.
 */
export function questionsFor(
  axes: readonly VariantAxis[],
  items: readonly Selectable[],
  ctx: SelectionContext = {},
): AxisQuestion[] {
  const placements = placeOn(axes, ctx);
  const placed = new Set(placements.map((p) => p.axisId));
  const inPlay = candidatesAmong(axes, items, placements);
  if (inPlay.length < 2) return [];

  return axes
    .filter((axis) => !placed.has(axis.id) && discriminates(axis, inPlay))
    .map((axis) => ({ axisId: axis.id, questionKey: axis.questionKey, values: axis.values }));
}

/** True when at least two of the candidates in play cover different positions on this axis. */
function discriminates(axis: VariantAxis, inPlay: readonly Selectable[]): boolean {
  const first = coverage(inPlay[0], axis);
  return inPlay.some((item) => {
    const set = coverage(item, axis);
    return set.size !== first.size || [...set].some((v) => !first.has(v));
  });
}

/**
 * Pick one. Deterministic, offline, no model call.
 *
 * The ladder, strongest evidence first:
 *  1. **What the user told us here** — an axis answer, which filters the candidates.
 *  2. **What the profile argues** — the weighted signals a candidate declared it cares about, read
 *     in the caller's priority order.
 *  3. **What the outcomes say** — the rating, as a TIE-BREAK only (D62 §4 makes each candidate a
 *     rated entity; this is where that rating is allowed to matter, and it is deliberately the
 *     weakest rung so a thin sample can never overrule an answer).
 *  4. **The declared default** — named by the content, reported honestly as `'default'`.
 */
export function choose<T extends Selectable>(
  axes: readonly VariantAxis[],
  items: readonly T[],
  defaultId: string,
  ctx: SelectionContext = {},
): Selection<T> {
  const placements = placeOn(axes, ctx);
  const inPlay = candidatesAmong(axes, items, placements);

  if (inPlay.length === 1) {
    const placement = placements.find((p) => p.via === 'answer') ?? placements[0];
    return {
      item: inPlay[0],
      via: placement?.via ?? 'default',
      signal: placement?.signal ?? 'default',
    };
  }

  // 2 — the profile. A signal's WEIGHT is the content's declared preference; its POSITION in the
  // caller's list is the profile's own priority, and it decides equal weights.
  const signals = ctx.signals ?? [];
  const scored = inPlay.map((item) => {
    let weight = 0;
    let firstIndex = Number.MAX_SAFE_INTEGER;
    let signal = '';
    signals.forEach((id, index) => {
      const declared = item.profileSignals?.[id];
      if (declared === undefined) return;
      weight += declared;
      if (index < firstIndex) {
        firstIndex = index;
        signal = id;
      }
    });
    return { item, weight, firstIndex, signal };
  });
  const best = [...scored].sort((a, b) => b.weight - a.weight || a.firstIndex - b.firstIndex)[0];
  if (best.weight > 0) {
    // A genuine tie on both weight and position is not a match — two candidates the profile likes
    // equally is exactly the case the rating and then the default exist for.
    const tied = scored.filter((s) => s.weight === best.weight && s.firstIndex === best.firstIndex);
    if (tied.length === 1) return { item: best.item, via: 'profile', signal: best.signal };
  }

  // 3 — the rating, over whatever is still tied.
  const rated = inPlay
    .map((item) => ({ item, score: ctx.ratings?.[item.id] }))
    .filter((r): r is { item: T; score: number } => typeof r.score === 'number')
    .sort((a, b) => b.score - a.score);
  if (rated.length > 0 && (rated.length === 1 || rated[0].score > rated[1].score)) {
    return { item: rated[0].item, via: 'rating', signal: 'rating' };
  }

  // 4 — the declared default, or the first candidate still in play if the default was filtered out
  // by an answer (a user who told us something we must honour, about a group whose default does not
  // suit them).
  const named = items.find((i) => i.id === defaultId) ?? items[0];
  const fallback = inPlay.includes(named) ? named : inPlay[0];
  return { item: fallback, via: 'default', signal: 'default' };
}
