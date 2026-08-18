/**
 * variantRatings — every version of a Journey is a separate rated entity, and its rating also feeds
 * its Journey's (D62 §4).
 *
 * THE OBJECTION THIS DISSOLVES. If each Journey declares its own axis, the axes do not line up
 * across Journeys, so "what did we learn about certainty-first plans in general" looked unanswerable
 * — the price of letting content define its own dimensions. The founder's answer removes the trade
 * entirely: *"there is no reason not to treat every variant of a Journey as a separate object, a
 * separate entity, holding a rating (so every rating of a variant affects both the Journey and the
 * variant)."* Both questions stay answerable because both objects carry evidence: which JOURNEY
 * ranked well, and which of its VERSIONS did.
 *
 * WHAT COUNTS AS "IT WORKED" is not decided here. It is `journeyWorked()` — the user's own verdict,
 * with finishing as evidence unless they said otherwise (`../../celebration/journeyFeedback`).
 * Reusing it is the point: a second definition of success in the code is how a learning loop ends up
 * ranking on completion rate, which is how it ends up recommending whatever is easiest to finish.
 *
 * WHY UNLABELLED JOURNEYS ARE COUNTED BUT NOT SCORED. A Journey nobody gave a verdict on is missing
 * data, not a bad Journey, and collapsing the two fills the evidence with silent negatives. So
 * {@link VariantRating.journeys} counts everything attributed to a version and {@link
 * VariantRating.score} is computed from the LABELLED ones only — and is `undefined`, not zero, below
 * {@link MIN_RATED} (Plan_Library_and_Learning_PRD §7.3: support on both sides, or it is an anecdote
 * with a denominator).
 *
 * WHAT THIS IS NOT: a leaderboard. A version has no single fitness score across everybody — it has a
 * fitness *conditional on who the person is* (§7.1), and the conditional layer is the last thing to
 * become real. What this file produces is one honest local number, used as the weakest tie-break in
 * `./selectVariant` and as the input to whatever conditional layer eventually lands.
 *
 * DOWNRANKING IS ALLOWED, DELETION IS NOT (§8.6). Nothing here can remove a version from the
 * library; a low score changes an order, never the set of things the user can be offered.
 *
 * SECURITY-PRIVACY G1: counts and ids only. The user's own words in `feedback.note` are never read.
 * Nothing here transmits anything — it is an on-device aggregate over the user's own Journeys.
 *
 * Pure TypeScript — no React, no i18n, no clock reads, no vendor imports.
 */
import { journeyWorked } from '../../celebration/journeyFeedback';
import type { Journey } from '../../types/domain';
import { resolveJourneyStatus } from '../../util/journeyStatus';

/**
 * How many LABELLED Journeys a version needs before its score is reported at all.
 *
 * Three, and it is a floor for a LOCAL tie-break — not the k-anonymity floor the outbound record
 * needs (that is the library PRD §12.2 and is a different, larger number for a different reason). At
 * one or two, a single bad week decides which version everyone gets; three is the smallest number
 * that is not one person's mood.
 */
export const MIN_RATED = 3;

/** The evidence held by ONE version of a Journey. */
export interface VariantRating {
  definitionId: string;
  variantId: string;
  /** Every Journey built from this version, labelled or not. */
  journeys: number;
  /** How many of them the user gave a verdict on (or finished, which is itself a verdict). */
  labelled: number;
  /** How many of the labelled ones worked, by `journeyWorked`. */
  worked: number;
  /** How many reached `completed`. Kept apart from `worked` on purpose — they are not the same fact. */
  completed: number;
  /**
   * Share of labelled Journeys that worked, 0..1 — or `undefined` below {@link MIN_RATED}, which is
   * the honest answer for a version we have barely seen and must never be rendered as a zero.
   */
  score?: number;
}

/** The evidence held by a JOURNEY, which is its versions' evidence rolled up — plus the breakdown. */
export interface JourneyRating extends Omit<VariantRating, 'variantId'> {
  /** Per-version evidence, so "which Journey ranked well AND which of its versions did" is answerable. */
  variants: VariantRating[];
}

/** Both levels, from the user's own Journeys. Pure — no clock, no state, no side effects. */
export interface LibraryRatings {
  byVariant: VariantRating[];
  byJourney: JourneyRating[];
}

/**
 * Aggregate the evidence. Journeys with no {@link Journey.libraryRef} are IGNORED — unattributed,
 * not "the default version" (see the field's own note: attributing them would put outcomes we cannot
 * explain into the evidence for a version we did not build).
 *
 * A `future` Journey is excluded too: it has not started, so it is not evidence of anything, and
 * counting it would dilute every version by however many plans are sitting in the Future list.
 */
export function rateLibrary(journeys: readonly Journey[]): LibraryRatings {
  const byVariantKey = new Map<string, VariantRating>();

  for (const journey of journeys) {
    const ref = journey.libraryRef;
    if (!ref) continue;
    if (resolveJourneyStatus(journey) === 'future') continue;

    const key = `${ref.definitionId}::${ref.variantId}`;
    const rating = byVariantKey.get(key) ?? {
      definitionId: ref.definitionId,
      variantId: ref.variantId,
      journeys: 0,
      labelled: 0,
      worked: 0,
      completed: 0,
    };
    rating.journeys += 1;
    const worked = journeyWorked(journey);
    if (worked !== undefined) {
      rating.labelled += 1;
      if (worked) rating.worked += 1;
    }
    if (resolveJourneyStatus(journey) === 'completed') rating.completed += 1;
    byVariantKey.set(key, rating);
  }

  const byVariant = [...byVariantKey.values()].map(withScore);

  // THE ROLL-UP: a version's evidence is also its Journey's. One event, counted for both objects —
  // never two separate collections that can disagree about what happened.
  const byDefinition = new Map<string, JourneyRating>();
  for (const rating of byVariant) {
    const journeyRating = byDefinition.get(rating.definitionId) ?? {
      definitionId: rating.definitionId,
      journeys: 0,
      labelled: 0,
      worked: 0,
      completed: 0,
      variants: [],
    };
    journeyRating.journeys += rating.journeys;
    journeyRating.labelled += rating.labelled;
    journeyRating.worked += rating.worked;
    journeyRating.completed += rating.completed;
    journeyRating.variants.push(rating);
    byDefinition.set(rating.definitionId, journeyRating);
  }

  return {
    byVariant,
    byJourney: [...byDefinition.values()].map((r) => ({ ...withScore(r), variants: r.variants })),
  };
}

/** Attach the score, or leave it absent below the floor. */
function withScore<T extends { labelled: number; worked: number }>(rating: T): T {
  return rating.labelled >= MIN_RATED
    ? { ...rating, score: rating.worked / rating.labelled }
    : rating;
}

/**
 * The per-version scores for ONE Journey, in the shape `./selectVariant` reads as its tie-break.
 * Versions below the floor are absent rather than zero, so a version we have barely seen is never
 * ranked below one we have seen fail.
 */
export function variantScores(
  ratings: LibraryRatings,
  definitionId: string,
): Record<string, number | undefined> {
  const scores: Record<string, number | undefined> = {};
  for (const rating of ratings.byVariant) {
    if (rating.definitionId === definitionId && rating.score !== undefined) {
      scores[rating.variantId] = rating.score;
    }
  }
  return scores;
}
