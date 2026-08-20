/**
 * What one conversation is allowed to cost, and what happens as it runs out.
 *
 * The failure this is protecting against is not "we spent too much" — it is "the conversation
 * stopped in the middle with nothing built". Every test below is a way of saying that the coach must
 * always be able to land.
 */
import {
  DEFAULT_BUDGET,
  EMPTY_BUDGET,
  canSpend,
  estimateTokens,
  spend,
  usedFraction,
  wouldExceed,
  zoneOf,
  type BudgetPolicy,
} from '../conversationBudget';
import { MeteringLlmClient } from '../MeteringLlmClient';
import { LlmError, MockLlmClient, type LlmClient, type LlmRequest } from '../LlmClient';

const POLICY: BudgetPolicy = { maxTokens: 1000, maxCalls: 10, narrowAt: 0.7 };

/** Spend `tokens` across `calls` calls, evenly. */
function after(calls: number, tokens: number) {
  let state = EMPTY_BUDGET;
  for (let i = 0; i < calls; i += 1) state = spend(state, { tokens: tokens / calls });
  return state;
}

describe('the zones', () => {
  it('starts open and stays open through ordinary use', () => {
    expect(zoneOf(EMPTY_BUDGET, POLICY)).toBe('open');
    expect(zoneOf(after(3, 300), POLICY)).toBe('open');
    expect(canSpend(after(3, 300), POLICY)).toBe(true);
  });

  it('narrows at the founder’s threshold — seven tenths of the way through', () => {
    expect(zoneOf(after(7, 700), POLICY)).toBe('narrowing');
  });

  it('closes when a ceiling is reached', () => {
    expect(zoneOf(after(10, 1000), POLICY)).toBe('closing');
  });

  it('refuses to spend from NARROWING, not only from closing', () => {
    // A zone that still allows "just one more call" is a zone that does nothing. Everything a
    // person can still do from here — tap a card, approve a plan — was already free.
    expect(canSpend(after(7, 700), POLICY)).toBe(false);
  });
});

describe('tokens, with calls as the second ceiling', () => {
  it('narrows on TOKENS even when barely any calls were made', () => {
    // Two calls that carried a huge transcript. Counting calls alone would call this a fresh
    // conversation with eight to spare.
    expect(zoneOf(after(2, 900), POLICY)).toBe('narrowing');
  });

  it('narrows on CALLS even when barely any tokens were spent', () => {
    // Eight tiny calls is a loop, not a conversation, and it must be caught.
    expect(zoneOf(after(8, 40), POLICY)).toBe('narrowing');
  });

  it('reports the WORSE of the two ratios, so neither can hide the other', () => {
    expect(usedFraction(after(2, 900), POLICY)).toBeCloseTo(0.9);
    expect(usedFraction(after(9, 90), POLICY)).toBeCloseTo(0.9);
  });
});

describe('recording what a call cost', () => {
  it('counts the call and the tokens, without mutating', () => {
    const before = EMPTY_BUDGET;
    const next = spend(before, { tokens: 120 });

    expect(next).toEqual({ callsUsed: 1, tokensUsed: 120 });
    expect(before).toEqual({ callsUsed: 0, tokensUsed: 0 });
  });

  it('still counts the CALL when the token cost is unknown or nonsense', () => {
    // A call whose cost we cannot read is not a free call. The second ceiling is what catches it.
    for (const bad of [NaN, -5, Infinity]) {
      expect(spend(EMPTY_BUDGET, { tokens: bad })).toEqual({ callsUsed: 1, tokensUsed: 0 });
    }
  });
});

describe('the pre-flight guard', () => {
  it('spots a single request too large for what is left', () => {
    const state = after(2, 800);
    expect(wouldExceed(state, 300, POLICY)).toBe(true);
    expect(wouldExceed(state, 100, POLICY)).toBe(false);
  });

  it('estimates from length, and is only ever a guard rail', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});

describe('the default policy is sized for real use, not for the test', () => {
  it('lets an ordinary interview finish without ever narrowing', () => {
    // One understanding call plus a few classifications against a growing transcript.
    const ordinary = after(3, 4_000);
    expect(zoneOf(ordinary, DEFAULT_BUDGET)).toBe('open');
  });
});

describe('metering — the accounting cannot be forgotten', () => {
  const request: LlmRequest = { messages: [{ role: 'user', content: 'x'.repeat(400) }] };

  it('records the provider’s own count when there is one', async () => {
    const spent: number[] = [];
    const inner: LlmClient = {
      complete: async () => ({ text: 'ok', usage: { totalTokens: 321 } }),
    };

    await new MeteringLlmClient(inner, (t) => spent.push(t)).complete(request);

    expect(spent).toEqual([321]);
  });

  it('charges the estimated request size when the provider reports nothing', async () => {
    // Reading a missing count as zero is how a budget silently stops counting.
    const spent: number[] = [];
    await new MeteringLlmClient(new MockLlmClient(() => 'ok'), (t) => spent.push(t)).complete(request);

    expect(spent).toEqual([100]);
  });

  it('charges a FAILED call and re-throws it untouched', async () => {
    const spent: number[] = [];
    const boom = new LlmError('down', undefined, 'network');
    const inner: LlmClient = {
      complete: async () => {
        throw boom;
      },
    };

    await expect(
      new MeteringLlmClient(inner, (t) => spent.push(t)).complete(request),
    ).rejects.toBe(boom);
    expect(spent).toEqual([100]);
  });

  it('a run of failures reaches the ceiling, which is the runaway it exists to catch', async () => {
    let state = EMPTY_BUDGET;
    const inner: LlmClient = {
      complete: async () => {
        throw new LlmError('down', undefined, 'network');
      },
    };
    const client = new MeteringLlmClient(inner, (t) => {
      state = spend(state, { tokens: t });
    });

    for (let i = 0; i < POLICY.maxCalls; i += 1) {
      await client.complete(request).catch(() => {});
    }

    expect(zoneOf(state, POLICY)).toBe('closing');
  });
});
