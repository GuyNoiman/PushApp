/**
 * The synthesis pipeline: one paid call, one free check, and a refusal that is a real result.
 *
 * The check is the point. We hold the source, so verifying that nothing identifying survived into
 * the output is a set intersection — free, deterministic, and unable to have a bad day. Everything
 * here is a way of saying that a synthesis is never softened into publishability.
 */
import {
  auditedLookPermitted,
  checkRound,
  checkSynthesis,
  identifyingTokens,
  leaks,
  requesterMaySeeRaw,
  retentionFrozen,
  type SynthesisReport,
} from '../synthesis';

const answers = [
  'I saw Daniel calm the room when the launch slipped on March 14.',
  'You made space for people to speak at the Tuesday retro.',
  'You bring clarity to complicated things.',
];

describe('what counts as identifying', () => {
  const tokens = identifyingTokens(answers);

  it('catches a name that is not at the start of a sentence', () => {
    expect(tokens.has('daniel')).toBe(true);
  });

  it('catches anything with a digit in it', () => {
    expect(tokens.has('14')).toBe(true);
  });

  it('catches a long distinctive word, which is the only cheap signal Hebrew gives', () => {
    // Hebrew has no capitals, so length is what is left.
    expect(identifyingTokens(['הוא הציל את הפרויקט בהתנדבות מוחלטת']).has('בהתנדבות')).toBe(true);
  });

  it('is generous on purpose', () => {
    // A false positive costs one suppressed synthesis. A false negative costs somebody their
    // anonymity. Those are not comparable.
    expect(tokens.size).toBeGreaterThan(3);
  });
});

describe('the free leakage check', () => {
  const tokens = identifyingTokens(answers);

  it('finds a source token that survived into the output', () => {
    expect(leaks('You are the person Daniel turns to.', tokens)).toContain('daniel');
  });

  it('passes a synthesis written in ordinary words', () => {
    expect(leaks('You bring calm to a room when things slip.', tokens)).toEqual([]);
  });

  it('is not fooled by punctuation or case', () => {
    expect(leaks('...DANIEL, mostly.', tokens)).toContain('daniel');
  });
});

describe('what may be published', () => {
  const input = { questionId: 'q1', answers };

  it('publishes a supported, clean synthesis', () => {
    const result = checkSynthesis(input, {
      questionId: 'q1',
      text: 'You steady a room when plans change, and you make space for other people to speak.',
      support: 3,
    });
    expect(result).toEqual({
      questionId: 'q1',
      published: 'You steady a room when plans change, and you make space for other people to speak.',
    });
  });

  it('REJECTS one that leaked, rather than editing it', () => {
    const result = checkSynthesis(input, {
      questionId: 'q1',
      text: 'People like Daniel rely on you.',
      support: 3,
    });
    expect(result.published).toBeNull();
    expect(result.rejection).toBe('leaked');
  });

  it('rejects a claim only one person made', () => {
    // "One person felt..." in a group of five is a sentence that identifies somebody.
    const result = checkSynthesis(input, { questionId: 'q1', text: 'You are patient.', support: 1 });
    expect(result.rejection).toBe('noPattern');
  });

  it('treats an empty answer as empty rather than as a pattern', () => {
    expect(checkSynthesis(input, { questionId: 'q1', text: '   ', support: 5 }).rejection).toBe(
      'empty',
    );
  });

  it('checks a whole round in one pass, and a missing output is not silently fine', () => {
    const results = checkRound(
      [input, { questionId: 'q2', answers: ['You listen.'] }],
      [{ questionId: 'q1', text: 'You steady a room.', support: 3 }],
    );
    expect(results[0].published).not.toBeNull();
    expect(results[1]).toEqual({ questionId: 'q2', published: null, rejection: 'empty' });
  });
});

describe('the narrow door, and it stays narrow', () => {
  const report: SynthesisReport = {
    roundId: 'r1',
    questionId: 'q1',
    filedAt: 1_700_000_000_000,
    reason: 'offensive',
  };

  it('never lets the requester see a raw answer, whatever has happened', () => {
    // There is no flag that changes this. The function exists so the rule is written where somebody
    // would come looking for a way round it.
    expect(requesterMaySeeRaw()).toBe(false);
  });

  it('freezes the retention clock while a report is open', () => {
    // Raw answers die a week after closure. A report filed on day eight would have nothing left to
    // examine, so filing one holds the evidence.
    expect(retentionFrozen([report], 'r1')).toBe(true);
    expect(retentionFrozen([{ ...report, resolvedAt: 1 }], 'r1')).toBe(false);
    expect(retentionFrozen([report], 'other-round')).toBe(false);
  });

  it('permits an audited look ONLY against an open report, and only for its own question', () => {
    expect(auditedLookPermitted([report], 'r1', 'q1')).toBe(true);
    expect(auditedLookPermitted([report], 'r1', 'q2')).toBe(false);
    expect(auditedLookPermitted([{ ...report, resolvedAt: 2 }], 'r1', 'q1')).toBe(false);
    expect(auditedLookPermitted([], 'r1', 'q1')).toBe(false);
  });
});
