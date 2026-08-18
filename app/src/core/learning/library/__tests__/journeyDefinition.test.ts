/**
 * A definition is CONTENT, and content is what gets edited by someone who is not reading the code.
 *
 * The mistakes below are the ones that would not crash anything: a Journey would simply stop asking
 * its question, or quietly ship with one version. These tests are why a typo in an axis id fails the
 * suite instead of reaching a user as a plan with no alternatives.
 */
import { JOURNEY_DEFINITIONS, journeyDefinition, journeyDefinitionsFor } from '../definitions';
import { defaultVariant, validateJourneyDefinition, type JourneyDefinition } from '../journeyDefinition';

const BASE: JourneyDefinition = {
  id: 'test.journey',
  version: 1,
  shape: 'recurring',
  domain: 'any',
  axes: [
    {
      id: 'urgency',
      questionKey: 'test.axis.urgency.question',
      values: [
        { id: 'soon', labelKey: 'test.axis.urgency.soon' },
        { id: 'someday', labelKey: 'test.axis.urgency.someday' },
      ],
    },
  ],
  variants: [
    {
      id: 'now',
      essence: 'Start this week.',
      essenceKey: 'test.now.essence',
      position: { urgency: ['soon'] },
      build: { kind: 'recurring', approach: 'tiny_start' },
    },
    {
      id: 'later',
      essence: 'Build up to it.',
      essenceKey: 'test.later.essence',
      position: { urgency: ['someday'] },
      build: { kind: 'recurring', approach: 'anchor' },
    },
  ],
  defaultVariantId: 'now',
};

describe('content mistakes that would otherwise ship silently', () => {
  it('accepts a well-formed definition', () => {
    expect(validateJourneyDefinition(BASE)).toEqual([]);
  });

  it('catches a version placed on an axis the Journey never declared', () => {
    const typo = {
      ...BASE,
      variants: [{ ...BASE.variants[0], position: { urgencyy: ['soon'] } }, BASE.variants[1]],
    };

    expect(validateJourneyDefinition(typo)).toContain('variant now: undeclared axis urgencyy');
  });

  it('catches a position that names a value the axis does not have', () => {
    const wrong = {
      ...BASE,
      variants: [{ ...BASE.variants[0], position: { urgency: ['immediately'] } }, BASE.variants[1]],
    };

    expect(validateJourneyDefinition(wrong)).toContain('variant now: unknown value immediately on urgency');
  });

  it('catches an axis that cannot separate anything', () => {
    const pointless = {
      ...BASE,
      axes: [{ ...BASE.axes[0], values: [BASE.axes[0].values[0]] }],
    };

    expect(validateJourneyDefinition(pointless)).toContain('axis urgency has fewer than two values');
  });

  it('catches a default that names no version', () => {
    expect(validateJourneyDefinition({ ...BASE, defaultVariantId: 'gone' })).toContain(
      'defaultVariantId names no variant',
    );
  });

  it('holds every shipped definition to the same standard', () => {
    for (const def of JOURNEY_DEFINITIONS) {
      expect({ id: def.id, problems: validateJourneyDefinition(def) }).toEqual({
        id: def.id,
        problems: [],
      });
      // Every Journey names the version it builds when nothing is known and nothing was asked.
      expect(defaultVariant(def).id).toBe(def.defaultVariantId);
    }
  });
});

describe('finding the Journeys a goal is a candidate for', () => {
  it('returns the candidates for a shape, and nothing of the other shape', () => {
    const recurring = journeyDefinitionsFor('recurring', 'body_image');

    expect(recurring.length).toBeGreaterThan(0);
    expect(recurring.every((d) => d.shape === 'recurring')).toBe(true);
  });

  it('has no candidate for a process goal yet, and says so instead of substituting one', () => {
    // Whether the library's authored arcs replace a domain expert's arc or shape how the user moves
    // through it is an open founder decision. Handing a process goal a recurring Journey would be
    // making that decision by accident.
    expect(journeyDefinitionsFor('process')).toEqual([]);
  });

  it('resolves a definition by id, and an unknown id to undefined rather than a guess', () => {
    expect(journeyDefinition('recurring.generic')?.shape).toBe('recurring');
    expect(journeyDefinition('nope')).toBeUndefined();
  });
});
