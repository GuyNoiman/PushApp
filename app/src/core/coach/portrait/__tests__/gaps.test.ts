/**
 * THE GAPS — what gets asked, what is only listened for, and when the conversation is over.
 *
 * Three things are held here, and each of them is a decision somebody could undo by accident:
 *
 *   1. THE WEIGHT-ZERO RULE. Support need, readiness, previous attempts and constraints are filled
 *      when somebody mentions them and NEVER create a question of their own (spec §12, §13, §22).
 *      That single rule is what stops ten fields becoming ten questions — the questionnaire this
 *      whole redesign exists to remove, in a nicer voice.
 *   2. THE STOP CONDITION (§22), as a table over the six fields that make up "enough", plus the
 *      clause that stops a vague person being interviewed forever.
 *   3. THE STOP CONDITION DOES NOT READ THE BUDGET (D103). Running low changes HOW the coach asks,
 *      never how much it needs to understand. Two people with the same conversation must end with
 *      the same picture whether or not their tokens happened to be expensive.
 */
import { EMPTY_BUDGET, DEFAULT_BUDGET, spend, zoneOf } from '../../../llm/conversationBudget';
import { GAP_POLICY, minimumUnderstanding, nextGap, outstandingGaps, readyToFinish } from '../gaps';
import { mergePortrait } from '../merge';
import { PORTRAIT_FIELDS, type Confidence, type Portrait, type PortraitFieldId } from '../types';

const NOW = 1_700_000_000_000;

/** A value that is legal for the field, whatever shape it holds. */
const SAMPLE: Partial<Record<PortraitFieldId, string | string[]>> = {
  primaryWant: 'change career',
  domain: 'career',
  currentState: 'eight years in marketing and done with it',
  desiredOutcome: 'a direction I actually want',
  stage: 'explore',
  bottleneck: 'lack_of_clarity',
  supportNeed: 'clarity',
  readiness: 'explore',
  previousAttempts: 'browsed a few roles, nothing landed',
  constraints: ['two small children'],
};

/** A Portrait holding exactly the fields named, each at the given confidence. */
function holding(fields: Partial<Record<PortraitFieldId, Confidence>>): Portrait {
  return mergePortrait(
    {},
    Object.entries(fields)
      .filter(([, confidence]) => confidence !== undefined)
      .map(([field, confidence]) => ({
        field: field as PortraitFieldId,
        value: SAMPLE[field as PortraitFieldId] as string,
        confidence: confidence as Confidence,
        source: 'stated' as const,
      })),
    NOW,
  ).portrait;
}

/** Everything §22 calls the minimum understanding, at exactly the confidence it calls for. */
const ENOUGH: Partial<Record<PortraitFieldId, Confidence>> = {
  primaryWant: 'high',
  domain: 'high',
  bottleneck: 'medium',
  currentState: 'medium',
  desiredOutcome: 'medium',
  stage: 'medium',
};

describe('what may be asked, and in what order', () => {
  it('asks the most valuable thing first: the want, then the area of life', () => {
    expect(nextGap({})?.field).toBe('primaryWant');
    expect(nextGap(holding({ primaryWant: 'high' }))?.field).toBe('domain');
    expect(nextGap(holding({ primaryWant: 'high', domain: 'high' }))?.field).toBe('bottleneck');
  });

  it('honours the reader’s suggestion only when it is genuinely askable', () => {
    const portrait = holding({ primaryWant: 'high' });

    // Offered and askable: the engine agrees.
    expect(nextGap(portrait, 'stage')?.field).toBe('stage');
    // Weight zero: it is not a question, whoever suggests it.
    expect(nextGap(portrait, 'readiness')?.field).toBe('domain');
    // Already known well enough: nothing to open.
    expect(nextGap(portrait, 'primaryWant')?.field).toBe('domain');
  });

  /**
   * THE RULE THAT STOPS THIS BECOMING A FORM. These four are listened for and never asked, so a
   * Portrait with everything else filled is FINISHED even though four of its ten fields are empty.
   */
  it('never turns support need, readiness, previous attempts or constraints into a question', () => {
    const opportunistic: PortraitFieldId[] = [
      'supportNeed',
      'readiness',
      'previousAttempts',
      'constraints',
    ];
    for (const field of opportunistic) expect(GAP_POLICY[field].weight).toBe(0);

    // Walk the whole conversation to its end and collect everything it ever opened.
    let portrait: Portrait = {};
    const asked: PortraitFieldId[] = [];
    for (let i = 0; i < PORTRAIT_FIELDS.length + 2; i += 1) {
      const gap = nextGap(portrait);
      if (!gap) break;
      asked.push(gap.field);
      portrait = holding(
        Object.fromEntries(asked.map((field) => [field, GAP_POLICY[field].target])),
      );
    }

    for (const field of opportunistic) expect(asked).not.toContain(field);
    expect(minimumUnderstanding(portrait)).toBe(true);
  });

  it('still OFFERS the opportunistic fields to the reader, which is the whole difference', () => {
    const offered = outstandingGaps(holding(ENOUGH)).map((gap) => gap.field);

    // Nothing left to ask, and four things still worth hearing if they come up.
    expect(nextGap(holding(ENOUGH))).toBeUndefined();
    expect(offered).toEqual(['supportNeed', 'readiness', 'previousAttempts', 'constraints']);
  });
});

describe('the stop condition (spec §22)', () => {
  const table: { name: string; portrait: Portrait; ready: boolean }[] = [
    { name: 'nothing at all', portrait: {}, ready: false },
    { name: 'everything §22 asks for', portrait: holding(ENOUGH), ready: true },
    {
      name: 'the want known only at medium',
      portrait: holding({ ...ENOUGH, primaryWant: 'medium' }),
      ready: false,
    },
    {
      name: 'the domain known only at medium',
      portrait: holding({ ...ENOUGH, domain: 'medium' }),
      ready: false,
    },
    {
      name: 'the bottleneck known only at low',
      portrait: holding({ ...ENOUGH, bottleneck: 'low' }),
      ready: false,
    },
    {
      name: 'the current state missing',
      portrait: holding({ ...ENOUGH, currentState: undefined }),
      ready: false,
    },
    {
      name: 'the desired outcome missing',
      portrait: holding({ ...ENOUGH, desiredOutcome: undefined }),
      ready: false,
    },
    { name: 'the stage missing', portrait: holding({ ...ENOUGH, stage: undefined }), ready: false },
    {
      name: 'enough, with the four opportunistic fields still empty',
      portrait: holding(ENOUGH),
      ready: true,
    },
    {
      name: 'enough, and then some',
      portrait: holding({ ...ENOUGH, supportNeed: 'high', readiness: 'high' }),
      ready: true,
    },
  ];

  for (const row of table) {
    it(`${row.ready ? 'stops' : 'keeps going'} with ${row.name}`, () => {
      expect(readyToFinish(row.portrait, 0)).toBe(row.ready);
    });
  }

  /**
   * The clause that stops somebody vague being interviewed forever. Two turns that taught us
   * nothing is not persistence, it is an interrogation, and the introduction's job is to meet
   * somebody rather than to complete a record about them.
   */
  it('stops after two consecutive turns that added nothing, however empty the picture is', () => {
    expect(readyToFinish({}, 0)).toBe(false);
    expect(readyToFinish({}, 1)).toBe(false);
    expect(readyToFinish({}, 2)).toBe(true);
    expect(readyToFinish(holding({ primaryWant: 'high' }), 2)).toBe(true);
  });
});

/**
 * D103: crossing the budget narrows how we ASK, never how much we UNDERSTAND. The strongest form of
 * that promise is structural — the stop condition has no way to see the budget — so this walks every
 * zone the app can be in and asserts the same answer from the same picture.
 */
describe('the stop condition is the same in every budget zone', () => {
  const zones = [
    { name: 'open', state: EMPTY_BUDGET },
    { name: 'narrowing', state: spend(EMPTY_BUDGET, { tokens: DEFAULT_BUDGET.maxTokens * 0.8 }) },
    { name: 'closing', state: spend(EMPTY_BUDGET, { tokens: DEFAULT_BUDGET.maxTokens }) },
  ];

  for (const zone of zones) {
    it(`is unchanged in the "${zone.name}" zone`, () => {
      expect(zoneOf(zone.state, DEFAULT_BUDGET)).toBe(zone.name);
      // The function takes a Portrait and a count of quiet turns. There is nowhere to put a budget,
      // and that is the point: this assertion is about the signature as much as the result.
      expect(readyToFinish(holding(ENOUGH), 0)).toBe(true);
      expect(readyToFinish(holding({ primaryWant: 'high' }), 0)).toBe(false);
      expect(nextGap(holding({ primaryWant: 'high' }))?.field).toBe('domain');
    });
  }
});
