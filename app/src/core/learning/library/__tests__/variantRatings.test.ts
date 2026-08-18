/**
 * Every version of a Journey is a separate rated entity, and its rating also feeds its Journey's
 * (D62 §4).
 *
 * This is the answer to the objection that per-Journey axes would make cross-Journey learning
 * impossible: both objects carry evidence, so we can always say which JOURNEY ranked well AND which
 * of its versions did. These tests pin the roll-up, and the three ways an honest aggregate is
 * usually lost — counting plans we cannot attribute, scoring a version we have barely seen, and
 * treating a missing verdict as a bad one.
 */
import { rateLibrary, variantScores, MIN_RATED } from '../variantRatings';
import type { Journey, JourneyFeedback } from '../../../types/domain';
import type { LibraryRef } from '../journeyDefinition';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 2, 11, 10, 0, 0).getTime();

const ANCHOR: LibraryRef = { definitionId: 'recurring.generic', variantId: 'anchor', version: 1 };
const TINY: LibraryRef = { definitionId: 'recurring.generic', variantId: 'tiny_start', version: 1 };

function journey(over: Partial<Journey> = {}): Journey {
  return {
    id: `j${Math.random()}`,
    title: 'Drink a protein shake',
    why: [],
    durationDays: 56,
    rhythm: 'daily',
    status: 'active',
    steps: [],
    createdAt: NOW - 30 * DAY,
    ...over,
  };
}

/** A Journey that ENDED with a verdict — the label the whole library learns from. */
function labelled(ref: LibraryRef, helped: JourneyFeedback['helped'], over: Partial<Journey> = {}) {
  return journey({
    libraryRef: ref,
    status: 'abandoned',
    abandonedAt: NOW - DAY,
    feedback: { host: 'canceled', at: NOW - DAY, ...(helped ? { helped } : {}) },
    ...over,
  });
}

describe('a version holds its own rating, and it also feeds its Journey’s', () => {
  it('counts one outcome for BOTH the version and the Journey', () => {
    const ratings = rateLibrary([
      labelled(ANCHOR, 'yes'),
      labelled(ANCHOR, 'no'),
      labelled(ANCHOR, 'yes'),
      labelled(TINY, 'yes'),
      labelled(TINY, 'yes'),
      labelled(TINY, 'yes'),
    ]);

    const anchor = ratings.byVariant.find((r) => r.variantId === 'anchor')!;
    const tiny = ratings.byVariant.find((r) => r.variantId === 'tiny_start')!;
    expect(anchor.score).toBeCloseTo(2 / 3);
    expect(tiny.score).toBe(1);

    // …and the Journey holds the roll-up, WITH the breakdown, so both questions stay answerable.
    const journeyRating = ratings.byJourney.find((r) => r.definitionId === 'recurring.generic')!;
    expect(journeyRating.labelled).toBe(6);
    expect(journeyRating.worked).toBe(5);
    expect(journeyRating.variants.map((v) => v.variantId).sort()).toEqual(['anchor', 'tiny_start']);
  });

  it('never scores a version we have barely seen, rather than scoring it zero', () => {
    const thin = rateLibrary([labelled(ANCHOR, 'no'), labelled(ANCHOR, 'no')]);

    expect(MIN_RATED).toBeGreaterThan(2);
    expect(thin.byVariant[0].labelled).toBe(2);
    expect(thin.byVariant[0].score).toBeUndefined();
    // And it is absent from the selector's tie-break entirely — not present as a zero, which would
    // rank it below a version we have watched fail.
    expect(variantScores(thin, 'recurring.generic')).toEqual({});
  });

  it('ignores a Journey the library did not build, instead of crediting the default version', () => {
    const ratings = rateLibrary([journey({ status: 'completed', completedAt: NOW - DAY })]);

    expect(ratings.byVariant).toEqual([]);
  });

  it('counts a Journey with no verdict, but does not label it', () => {
    // Missing data is not a negative. Collapsing the two is how a training set fills with silent
    // negatives and the library learns that nothing works.
    const ratings = rateLibrary([
      journey({ libraryRef: ANCHOR, status: 'abandoned', abandonedAt: NOW - DAY }),
    ]);

    expect(ratings.byVariant[0].journeys).toBe(1);
    expect(ratings.byVariant[0].labelled).toBe(0);
  });

  it('treats "partly" as the honest middle answer, not as a failure', () => {
    const ratings = rateLibrary([
      labelled(ANCHOR, 'partly'),
      labelled(ANCHOR, 'partly'),
      labelled(ANCHOR, 'partly'),
    ]);

    expect(ratings.byVariant[0].score).toBe(1);
  });

  it('reads finishing as evidence, unless the user said otherwise', () => {
    const finished = journey({
      libraryRef: ANCHOR,
      status: 'completed',
      completedAt: NOW - DAY,
    });
    const finishedButNoHelp = journey({
      libraryRef: ANCHOR,
      status: 'completed',
      completedAt: NOW - DAY,
      feedback: { host: 'completed', at: NOW, helped: 'no' },
    });

    const ratings = rateLibrary([finished, finishedButNoHelp, labelled(ANCHOR, 'yes')]);

    expect(ratings.byVariant[0].completed).toBe(2);
    expect(ratings.byVariant[0].labelled).toBe(3);
    expect(ratings.byVariant[0].worked).toBe(2);
  });

  it('leaves a Journey that has not started out of the evidence', () => {
    // A plan sitting in the Future list is not evidence of anything, and counting it would dilute
    // every version by however many plans are waiting.
    const ratings = rateLibrary([journey({ libraryRef: ANCHOR, status: 'future' })]);

    expect(ratings.byVariant).toEqual([]);
  });
});
