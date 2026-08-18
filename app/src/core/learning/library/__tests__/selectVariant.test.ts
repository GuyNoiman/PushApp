/**
 * A Journey declares what its OWN versions differ on, and the engine never learns what any of it
 * means (D62).
 *
 * The founder settled this while reviewing the partner's matching files: *"nothing is fixed in
 * advance about which parameters may vary between the variants; every Journey defines for itself
 * what the difference between its versions is … in one case it can be the level of certainty, in
 * another free time, in another how urgent it is."* The first test below is that claim, stated as a
 * test: a Journey invented here, with an axis no shipped content uses, is asked about and selected
 * from without a line of engine code knowing it exists.
 *
 * The rest pin the rule that protects the user's attention — nobody is asked a question that cannot
 * change their answer — and the order of evidence: what they told THIS Journey, then what the
 * profile argues, then what the outcomes say, then an honest default.
 */
import { RECURRING_GENERIC } from '../definitions';
import { validateJourneyDefinition, type JourneyDefinition } from '../journeyDefinition';
import { placeOnAxes, selectVariant, variantQuestionsFor } from '../selectVariant';

/**
 * A Journey whose versions differ on CERTAINTY — how sure the user wants to be before the first
 * real-world test. Nothing in the engine has ever heard of certainty; that is the point.
 */
const CAREER_DIRECTION: JourneyDefinition = {
  id: 'career.direction',
  version: 3,
  shape: 'process',
  domain: 'career',
  axes: [
    {
      id: 'certainty',
      questionKey: 'career.direction.axis.certainty.question',
      values: [
        { id: 'testEarly', labelKey: 'career.direction.axis.certainty.testEarly' },
        { id: 'beSureFirst', labelKey: 'career.direction.axis.certainty.beSureFirst' },
      ],
      answeredByProfile: { actionFirst: 'testEarly', clarityFirst: 'beSureFirst' },
    },
  ],
  variants: [
    {
      id: 'probe',
      essence: 'Test it in the real world before you are sure.',
      essenceKey: 'career.direction.probe.essence',
      position: { certainty: ['testEarly'] },
      build: { kind: 'recurring', approach: 'tiny_start' },
    },
    {
      id: 'map',
      essence: 'Get clear on the direction first, then commit to it.',
      essenceKey: 'career.direction.map.essence',
      position: { certainty: ['beSureFirst'] },
      build: { kind: 'recurring', approach: 'prepare' },
    },
  ],
  defaultVariantId: 'map',
};

describe('a Journey declares its own variant axis', () => {
  it('selects on an axis the engine has never heard of, from content alone', () => {
    const chosen = selectVariant(CAREER_DIRECTION, { answers: { certainty: 'testEarly' } });

    expect(chosen.variantId).toBe('probe');
    expect(chosen.via).toBe('answer');
    expect(chosen.signal).toBe('certainty:testEarly');
  });

  it('asks that Journey’s own question, and only its own', () => {
    const questions = variantQuestionsFor(CAREER_DIRECTION);

    expect(questions.map((q) => q.axisId)).toEqual(['certainty']);
    expect(questions[0].values.map((v) => v.id)).toEqual(['testEarly', 'beSureFirst']);
  });

  it('carries the Journey’s version onto the choice, so a rating is never read across a content change', () => {
    expect(selectVariant(CAREER_DIRECTION, {}).version).toBe(3);
    expect(selectVariant(CAREER_DIRECTION, {}).definitionId).toBe('career.direction');
  });

  it('ships only valid content', () => {
    expect(validateJourneyDefinition(CAREER_DIRECTION)).toEqual([]);
    expect(validateJourneyDefinition(RECURRING_GENERIC)).toEqual([]);
  });
});

describe('nobody is asked a question that cannot change their answer', () => {
  it('does not ask when the profile already places them on the axis', () => {
    // The user told onboarding they start by acting rather than by getting clear. Asking again
    // would be the app failing to listen to something it was just told.
    expect(variantQuestionsFor(CAREER_DIRECTION, { signals: ['actionFirst'] })).toEqual([]);
    expect(placeOnAxes(CAREER_DIRECTION, { signals: ['actionFirst'] })).toEqual([
      { axisId: 'certainty', value: 'testEarly', via: 'profile', signal: 'actionFirst' },
    ]);
  });

  it('does not ask when the surviving versions no longer differ on it', () => {
    const oneWay: JourneyDefinition = {
      ...CAREER_DIRECTION,
      variants: CAREER_DIRECTION.variants.map((v) => ({ ...v, position: {} })),
    };

    // Both versions suit every position, so the answer cannot change which one is built.
    expect(variantQuestionsFor(oneWay)).toEqual([]);
  });

  it('asks the user we know nothing about — who at cold start is most people', () => {
    expect(variantQuestionsFor(CAREER_DIRECTION, { signals: ['seeProgress'] })).toHaveLength(1);
  });
});

describe('the order of evidence', () => {
  it('lets what the user told THIS Journey outrank their onboarding profile', () => {
    const chosen = selectVariant(CAREER_DIRECTION, {
      answers: { certainty: 'beSureFirst' },
      signals: ['actionFirst'],
    });

    expect(chosen.variantId).toBe('map');
    expect(chosen.via).toBe('answer');
  });

  it('reads the profile in the caller’s priority order', () => {
    // The list is ordered most-telling-first (friction before help). The first id this Journey
    // recognises is the one that places them.
    const chosen = selectVariant(RECURRING_GENERIC, { signals: ['tooMuchAtOnce', 'clearPlan'] });

    expect(chosen.variantId).toBe('tiny_start');
    expect(chosen.signal).toBe('tooMuchAtOnce');
  });

  it('uses a version’s rating only to break a tie the user left open', () => {
    const tied = selectVariant(CAREER_DIRECTION, { ratings: { probe: 0.8, map: 0.3 } });
    expect(tied.variantId).toBe('probe');
    expect(tied.via).toBe('rating');

    // …and never to overrule what the user actually said.
    const answered = selectVariant(CAREER_DIRECTION, {
      answers: { certainty: 'beSureFirst' },
      ratings: { probe: 0.8, map: 0.3 },
    });
    expect(answered.variantId).toBe('map');
  });

  it('says "default" out loud rather than dressing a guess up as a match', () => {
    const chosen = selectVariant(RECURRING_GENERIC);

    expect(chosen.variantId).toBe(RECURRING_GENERIC.defaultVariantId);
    expect(chosen.via).toBe('default');
    expect(chosen.signal).toBe('default');
  });

  it('never returns "no version" for a contradictory answer', () => {
    // An axis answered in a way no version covers must degrade to the ordinary cold-start path,
    // not to a user with no plan.
    const chosen = selectVariant(CAREER_DIRECTION, { answers: { certainty: 'somethingElse' } });

    expect(chosen.variantId).toBe('map');
    expect(chosen.via).toBe('default');
  });
});
