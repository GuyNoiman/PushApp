/**
 * THE READER — and the fact that nothing it says is trusted.
 *
 * `readPortrait` is the one place a model gets to say something about a person that the app will
 * then hold. Its contract is deliberately the same as {@link ../../readConversation}'s, because the
 * two failures are the same failure:
 *
 *   · a field nobody offered is DROPPED;
 *   · a value outside a closed taxonomy is DROPPED, exactly as an unknown question id is;
 *   · a missing or nonsense confidence or source is DROPPED, because provenance is the whole point —
 *     a guess labelled "stated" would be treated as the person's own words forever;
 *   · a malformed answer writes NOTHING. Not a partial write, not a best effort: nothing.
 *   · and the same on a call that never happened at all — no session, no network, a provider error.
 */
import { MockLlmClient } from '../../../llm/LlmClient';
import { outstandingGaps } from '../gaps';
import { readPortrait, validatePortraitReading } from '../readPortrait';

/** Everything is missing at the start, which is what a first conversation looks like. */
const ALL_GAPS = outstandingGaps({});

/** The reader's answer for one field, with every part present unless the test removes it. */
function answer(over: Record<string, unknown> = {}) {
  return { value: 'change career', confidence: 'high', source: 'stated', ...over };
}

describe('only what the engine offered comes back', () => {
  it('keeps a well-formed reading of an offered field', () => {
    const reading = validatePortraitReading(
      JSON.stringify({ fields: { primaryWant: answer() }, next: 'domain' }),
      ALL_GAPS,
    );

    expect(reading.updates).toEqual([
      { field: 'primaryWant', value: 'change career', confidence: 'high', source: 'stated' },
    ]);
    expect(reading.nextGap).toBe('domain');
  });

  it('drops a field this system does not have', () => {
    const reading = validatePortraitReading(
      JSON.stringify({ fields: { favouriteColour: answer(), primaryWant: answer() } }),
      ALL_GAPS,
    );

    expect(reading.updates.map((u) => u.field)).toEqual(['primaryWant']);
  });

  it('drops a field that was not offered on this turn', () => {
    // Only the want is outstanding; a reading of anything else has no gap behind it.
    const only = ALL_GAPS.filter((gap) => gap.field === 'primaryWant');

    const reading = validatePortraitReading(
      JSON.stringify({ fields: { primaryWant: answer(), stage: answer({ value: 'explore' }) } }),
      only,
    );

    expect(reading.updates.map((u) => u.field)).toEqual(['primaryWant']);
  });

  it('ignores a "next" that was never on the table, and one it just answered', () => {
    const invented = validatePortraitReading(
      JSON.stringify({ fields: {}, next: 'whatever' }),
      ALL_GAPS,
    );
    const justAnswered = validatePortraitReading(
      JSON.stringify({ fields: { primaryWant: answer() }, next: 'primaryWant' }),
      ALL_GAPS,
    );

    expect(invented.nextGap).toBeUndefined();
    expect(justAnswered.nextGap).toBeUndefined();
  });
});

describe('a value the model invented is dropped', () => {
  it('refuses a stage nobody declared', () => {
    const reading = validatePortraitReading(
      JSON.stringify({ fields: { stage: answer({ value: 'figuring_it_out' }) } }),
      ALL_GAPS,
    );

    // It has said something real about a person and something we have no place to put. Inventing a
    // place for it is how a closed taxonomy stops being closed.
    expect(reading.updates).toEqual([]);
  });

  it('accepts a declared value however it was capitalised', () => {
    const reading = validatePortraitReading(
      JSON.stringify({ fields: { bottleneck: answer({ value: 'Too_Many_Options' }) } }),
      ALL_GAPS,
    );

    expect(reading.updates[0]).toMatchObject({ field: 'bottleneck', value: 'too_many_options' });
  });

  it('refuses a domain borrowed from somewhere else', () => {
    const reading = validatePortraitReading(
      // `general` is a DomainId from the expert registry. The Portrait's taxonomy is the spec's, and
      // it is not the same list — which is exactly the independence that keeps a Portrait valid when
      // the library changes.
      JSON.stringify({ fields: { domain: answer({ value: 'general' }) } }),
      ALL_GAPS,
    );

    expect(reading.updates).toEqual([]);
  });
});

describe('provenance is never assumed', () => {
  it('drops a reading with no source', () => {
    const noSource = validatePortraitReading(
      JSON.stringify({ fields: { primaryWant: { value: 'change career', confidence: 'high' } } }),
      ALL_GAPS,
    );
    expect(noSource.updates).toEqual([]);
  });

  it('drops a reading with no confidence, and one that claims none', () => {
    const noConfidence = validatePortraitReading(
      JSON.stringify({ fields: { primaryWant: { value: 'change career', source: 'stated' } } }),
      ALL_GAPS,
    );
    const unknown = validatePortraitReading(
      JSON.stringify({ fields: { primaryWant: answer({ confidence: 'unknown' }) } }),
      ALL_GAPS,
    );

    expect(noConfidence.updates).toEqual([]);
    expect(unknown.updates).toEqual([]);
  });

  it('drops an empty or non-text value', () => {
    for (const value of ['', '   ', 42, null, { a: 1 }]) {
      const reading = validatePortraitReading(
        JSON.stringify({ fields: { primaryWant: answer({ value }) } }),
        ALL_GAPS,
      );
      expect(reading.updates).toEqual([]);
    }
  });

  it('reads the list field as a list, and a single line as a list of one', () => {
    const list = validatePortraitReading(
      JSON.stringify({
        fields: { constraints: answer({ value: ['two small children', 'no budget'] }) },
      }),
      ALL_GAPS,
    );
    const single = validatePortraitReading(
      JSON.stringify({ fields: { constraints: answer({ value: 'no budget' }) } }),
      ALL_GAPS,
    );

    expect(list.updates[0].value).toEqual(['two small children', 'no budget']);
    expect(single.updates[0].value).toEqual(['no budget']);
  });
});

describe('a failure writes nothing at all', () => {
  it('writes nothing for an answer that is not JSON', () => {
    expect(validatePortraitReading('I think they want a new career, honestly', ALL_GAPS)).toEqual({
      updates: [],
    });
  });

  it('writes nothing for JSON of the wrong shape', () => {
    expect(validatePortraitReading('[1,2,3]', ALL_GAPS).updates).toEqual([]);
    expect(validatePortraitReading('{"fields":"everything"}', ALL_GAPS).updates).toEqual([]);
    expect(validatePortraitReading('{}', ALL_GAPS).updates).toEqual([]);
  });

  it('keeps the good field and drops the bad one from the same answer', () => {
    const reading = validatePortraitReading(
      JSON.stringify({
        fields: {
          primaryWant: answer(),
          stage: answer({ value: 'nonsense' }),
          domain: answer({ value: 'career', source: 'guessed' }),
        },
      }),
      ALL_GAPS,
    );

    expect(reading.updates.map((u) => u.field)).toEqual(['primaryWant']);
  });

  it('is silent when the call itself fails', async () => {
    const llm = new MockLlmClient(() => {
      throw new Error('no network');
    });

    expect(await readPortrait(llm, 'PERSON: hello', ALL_GAPS)).toEqual({ updates: [] });
  });

  it('does not call the model at all when nothing is outstanding', async () => {
    const llm = new MockLlmClient('{}');

    expect(await readPortrait(llm, 'PERSON: hello', [])).toEqual({ updates: [] });
    expect(llm.calls).toHaveLength(0);
  });
});

describe('what the reader is shown', () => {
  it('is the whole transcript and every gap, with the closed values spelled out', async () => {
    const llm = new MockLlmClient('{}');

    await readPortrait(llm, 'PERSON: I have had enough of marketing', ALL_GAPS);

    const sent = llm.calls[0].messages[0].content;
    expect(sent).toContain('I have had enough of marketing');
    expect(sent).toContain('field: primaryWant');
    // The taxonomy and its meanings, so the model chooses between declared values rather than
    // inventing one that then has to be thrown away.
    expect(sent).toContain('too_many_options');
    expect(sent).toContain('field: constraints');
    expect(llm.calls[0].temperature).toBe(0);
    expect(llm.calls[0].json).toBe(true);
  });
});
