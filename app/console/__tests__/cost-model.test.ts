/**
 * The console's cost arithmetic.
 *
 * The tests worth having are the three places a plausible simplification would
 * put a confident wrong number on a dashboard: a rate that is missing read as
 * free, a token count that is missing read as zero, and an average taken over a
 * tail it cannot describe. Everything here is a pure function over rows — no
 * network, and nothing that could reach the metered provider.
 */
import {
  COST_BUCKETS_USD,
  UNATTRIBUTED_ID,
  conversationCosts,
  formatUsd,
  histogram,
  indexPrices,
  percentile,
  summarise,
  tokenCost,
} from '../src/cost-model.js';

const PRICES = indexPrices([
  { model: 'gemini-2.5-flash', input_usd_per_million: 0.3, output_usd_per_million: 2.5, source: 'seed', noted_on: '2026-09-15' },
  { model: 'gemini-2.5-flash-lite', input_usd_per_million: 0.1, output_usd_per_million: 0.4, source: 'seed', noted_on: '2026-09-15' },
]);

const row = (over: Record<string, unknown> = {}) => ({
  conversation_id: 'a'.repeat(32),
  kind: 'planning',
  model: 'gemini-2.5-flash',
  calls: 1,
  input_tokens: 1000,
  output_tokens: 100,
  calls_without_usage: 0,
  ...over,
});

describe('tokenCost', () => {
  it('prices input and output separately, because they are billed separately', () => {
    // 1M in at $0.30 and 1M out at $2.50 must not come out as one blended rate.
    expect(tokenCost('gemini-2.5-flash', 1_000_000, 1_000_000, PRICES)).toBeCloseTo(2.8, 10);
  });

  it('scales down to the sub-cent amounts a real call actually costs', () => {
    // 1,000 in + 100 out on flash: 0.0003 + 0.00025.
    expect(tokenCost('gemini-2.5-flash', 1000, 100, PRICES)).toBeCloseTo(0.00055, 10);
  });

  it('says nothing rather than zero for a model with no rate', () => {
    expect(tokenCost('gemini-3.0-whatever', 1000, 1000, PRICES)).toBeNull();
  });
});

describe('conversationCosts', () => {
  it('adds up the calls of one conversation into one entry', () => {
    const [conversation] = conversationCosts(
      [row({ calls: 2, input_tokens: 2000, output_tokens: 200 }), row({ calls: 1, input_tokens: 500, output_tokens: 50 })],
      PRICES,
    );
    expect(conversation.calls).toBe(3);
    expect(conversation.inputTokens).toBe(2500);
    expect(conversation.outputTokens).toBe(250);
    expect(conversation.costUsd).toBeCloseTo(0.001375, 10);
    expect(conversation.measured).toBe(true);
  });

  it('keeps two conversations apart', () => {
    const costs = conversationCosts([row(), row({ conversation_id: 'b'.repeat(32) })], PRICES);
    expect(costs).toHaveLength(2);
  });

  it('prices a conversation that spanned two models at each model’s own rate', () => {
    const [conversation] = conversationCosts(
      [
        row({ input_tokens: 1_000_000, output_tokens: 0 }),
        row({ model: 'gemini-2.5-flash-lite', input_tokens: 1_000_000, output_tokens: 0 }),
      ],
      PRICES,
    );
    expect(conversation.models).toEqual(['gemini-2.5-flash', 'gemini-2.5-flash-lite']);
    expect(conversation.costUsd).toBeCloseTo(0.4, 10); // 0.30 + 0.10, not 2 × either
  });

  it('marks a conversation whose provider reported no usage as a LOWER BOUND, not a total', () => {
    const [conversation] = conversationCosts(
      [row(), row({ calls: 1, input_tokens: 0, output_tokens: 0, calls_without_usage: 1 })],
      PRICES,
    );
    expect(conversation.callsWithoutUsage).toBe(1);
    expect(conversation.measured).toBe(false);
    expect(conversation.lowerBound).toBe(true);
    // What IS known is still counted — the floor is the honest part of it.
    expect(conversation.costUsd).toBeCloseTo(0.00055, 10);
  });

  it('marks an unpriced model as unpriced rather than charging nothing for it', () => {
    const [conversation] = conversationCosts([row({ model: 'gemini-9.9-unknown' })], PRICES);
    expect(conversation.unpricedModels).toEqual(['gemini-9.9-unknown']);
    expect(conversation.measured).toBe(false);
    expect(conversation.costUsd).toBe(0);
  });

  it('flags the unattributed bucket as not a conversation', () => {
    const [conversation] = conversationCosts([row({ conversation_id: UNATTRIBUTED_ID, kind: 'unspecified' })], PRICES);
    expect(conversation.attributed).toBe(false);
  });
});

describe('summarise', () => {
  const kindOf = (rows: unknown[], kind: string) =>
    summarise(conversationCosts(rows as never[], PRICES)).kinds.find((k) => k.kind === kind)!;

  it('reports the tail alongside the mean', () => {
    // Nine cheap conversations and one runaway: the mean says one thing, p90 and
    // the maximum say the thing a spending limit is actually set for.
    const rows = Array.from({ length: 9 }, (_, i) =>
      row({ conversation_id: String(i).padStart(32, '0'), input_tokens: 1000, output_tokens: 100 }),
    ).concat([row({ conversation_id: 'f'.repeat(32), input_tokens: 100_000, output_tokens: 10_000 })]);

    const planning = kindOf(rows, 'planning');
    expect(planning.conversations).toBe(10);
    expect(planning.median).toBeCloseTo(0.00055, 10);
    expect(planning.max).toBeCloseTo(0.055, 10);
    expect(planning.mean!).toBeGreaterThan(planning.median!);
  });

  it('computes the statistics over fully measured conversations only, and says how many that was', () => {
    const rows = [
      row({ conversation_id: '1'.repeat(32) }),
      row({ conversation_id: '2'.repeat(32), calls_without_usage: 1 }),
    ];
    const planning = kindOf(rows, 'planning');
    expect(planning.conversations).toBe(2);
    expect(planning.measured).toBe(1);
    expect(planning.median).toBeCloseTo(0.00055, 10);
  });

  it('separates introduction from Journey building — the comparison the card exists for', () => {
    const rows = [
      row({ conversation_id: '1'.repeat(32), kind: 'introduction', input_tokens: 4000, output_tokens: 400 }),
      row({ conversation_id: '2'.repeat(32), kind: 'planning', input_tokens: 1000, output_tokens: 100 }),
    ];
    const summary = summarise(conversationCosts(rows, PRICES));
    expect(summary.kinds.map((k) => k.kind)).toEqual(['introduction', 'planning']);
    expect(summary.kinds[0].mean).toBeCloseTo(0.0022, 10);
    expect(summary.kinds[1].mean).toBeCloseTo(0.00055, 10);
  });

  it('keeps unattributed calls out of every average and counts them on their own', () => {
    const rows = [
      row({ conversation_id: '1'.repeat(32) }),
      row({ conversation_id: UNATTRIBUTED_ID, kind: 'unspecified', calls: 40, input_tokens: 400_000, output_tokens: 40_000 }),
    ];
    const summary = summarise(conversationCosts(rows, PRICES));
    expect(summary.kinds).toHaveLength(1);
    expect(summary.kinds[0].kind).toBe('planning');
    expect(summary.unattributed.calls).toBe(40);
    expect(summary.unattributed.costUsd).toBeCloseTo(0.22, 10);
  });

  it('says nothing rather than zero when a kind has no measured conversation', () => {
    const planning = kindOf([row({ calls_without_usage: 1 })], 'planning');
    expect(planning.mean).toBeNull();
    expect(planning.median).toBeNull();
    expect(planning.max).toBeNull();
  });
});

describe('percentile and histogram', () => {
  it('returns null for an empty set instead of a confident zero', () => {
    expect(percentile([], 0.5)).toBeNull();
  });

  it('interpolates the median of an even-sized set', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 10);
  });

  it('puts the expensive tail in an open-ended bucket rather than dropping it', () => {
    const last = COST_BUCKETS_USD[COST_BUCKETS_USD.length - 1];
    const buckets = histogram([0.0001, last + 1]);
    expect(buckets[0].count).toBe(1);
    expect(buckets[buckets.length - 1]).toMatchObject({ to: null, count: 1 });
  });
});

describe('formatUsd', () => {
  it('never rounds a real call down to $0.00, which would read as free', () => {
    expect(formatUsd(0.00055)).toBe('$0.0006');
    expect(formatUsd(null)).toBe('—');
  });
});
