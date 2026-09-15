/**
 * A conversation's budget does not refill by closing the screen (founder, 2026-09-15).
 *
 * ── THE HOLE ───────────────────────────────────────────────────────────────────────────────────
 *
 * `useLiveCoach` held the budget in a `useRef`, and a ref dies with the component. Somebody who
 * started the introduction, backed out and started again got a fresh six calls. And again. The only
 * thing that actually stopped them was the proxy's lifetime byte cap, which is cumulative for life
 * and measured in bytes, so it can never say "this conversation cost too much".
 *
 * ── WHAT THESE TESTS HOLD ──────────────────────────────────────────────────────────────────────
 *
 *   · the INTRODUCTION is one conversation however many times the first run is re-entered: spend in
 *     the first session is there in the second, and repeated attempts reach `narrowing` and then
 *     `closing` ACROSS restarts rather than within one;
 *   · a PLANNING conversation that is abandoned and resumed keeps its spend, and one started after a
 *     Journey was really created starts empty. The budget resets for finishing, not for leaving;
 *   · unreadable or absent stored state is an empty budget and a working conversation.
 *
 * The hook is driven over a captured spend sink — `makeCoachLlm` is mocked, so no network, no
 * Supabase and no native module is reached — and over an in-memory budget store.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * The real `makeCoachLlm` builds the cloud stack. Here it only hands back the spend sink the hook
 * passed it, which is the one thing these tests need to drive: what the hook does when a call costs
 * something.
 */
let spendSink: ((tokens: number) => void) | null = null;
jest.mock('@/core/llm/makeCoachLlm', () => ({
  makeCoachLlm: (onSpend?: (tokens: number) => void) => {
    spendSink = onSpend ?? null;
    return { complete: async () => ({ text: '', finishReason: 'STOP', model: 'mock' }) };
  },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));

import { createElement, type ReactElement } from 'react';

import { EMPTY_BUDGET, type BudgetState } from '@/core/llm/conversationBudget';
import {
  INTRODUCTION_CONVERSATION_KEY,
  PLANNING_CONVERSATION_KEY,
  type ConversationBudgetStore,
} from '@/core/llm/conversationBudgetStore';
import { useLiveCoach, type UseLiveCoach } from '../useLiveCoach';
import '@/i18n';

interface TestRendererModule {
  create(element: ReactElement): { unmount(): void };
  act(callback: () => void | Promise<void>): Promise<void>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: TestRendererModule = require('react-test-renderer');
const { act } = TestRenderer;

/** An in-memory budget store, standing in for the device. */
function fakeStore(seed: Record<string, BudgetState> = {}): ConversationBudgetStore & {
  states: Map<string, BudgetState>;
} {
  const states = new Map(Object.entries(seed));
  return {
    states,
    async load(key) {
      return states.get(key) ?? EMPTY_BUDGET;
    },
    async save(key, state) {
      states.set(key, state);
    },
    async clear(key) {
      states.delete(key);
    },
  };
}

/** Mount one session of the coach. Each mount is a fresh screen, as re-entering the app would be. */
async function session(mode: 'introduction' | 'planning', store: ConversationBudgetStore) {
  const result: { current: UseLiveCoach } = { current: undefined as unknown as UseLiveCoach };
  function Probe() {
    result.current = useLiveCoach({ mode, budgetStore: store });
    return null;
  }
  let renderer!: { unmount(): void };
  await act(async () => {
    renderer = TestRenderer.create(createElement(Probe));
  });
  // Let the persisted budget land before anything is asserted about it.
  await act(async () => {
    await Promise.resolve();
  });
  return { result, unmount: () => act(() => renderer.unmount()) };
}

/** Spend one call's worth of tokens, the way the metering client does. */
async function spendTokens(tokens: number) {
  await act(async () => {
    spendSink?.(tokens);
  });
}

beforeEach(() => {
  spendSink = null;
});

describe('the introduction is ONE conversation, however many times it is re-entered', () => {
  it('carries its spend into the next session', async () => {
    const store = fakeStore();

    const first = await session('introduction', store);
    await spendTokens(3_000);
    await first.unmount();

    expect(store.states.get(INTRODUCTION_CONVERSATION_KEY)).toEqual({
      callsUsed: 1,
      tokensUsed: 3_000,
    });

    const second = await session('introduction', store);
    await spendTokens(3_000);

    expect(store.states.get(INTRODUCTION_CONVERSATION_KEY)).toEqual({
      callsUsed: 2,
      tokensUsed: 6_000,
    });
    await second.unmount();
  });

  it('narrows and then closes ACROSS restarts, not only within one', async () => {
    const store = fakeStore();

    // Session one: well inside the budget, so free text is still on offer.
    const first = await session('introduction', store);
    await spendTokens(4_000);
    expect(first.result.current.budgetZone).toBe('open');
    expect(first.result.current.canAskOpenQuestion).toBe(true);
    await first.unmount();

    // Session two picks up where it left off and crosses the narrowing line.
    const second = await session('introduction', store);
    expect(second.result.current.budgetZone).toBe('open');
    await spendTokens(5_000);
    expect(second.result.current.budgetZone).toBe('narrowing');
    expect(second.result.current.canAskOpenQuestion).toBe(false);
    await second.unmount();

    // Session three has nothing left, and still opens — the budget shapes the conversation, it
    // never blocks the app.
    const third = await session('introduction', store);
    await spendTokens(4_000);
    expect(third.result.current.budgetZone).toBe('closing');
    expect(third.result.current.items.length).toBeGreaterThan(0);
    await third.unmount();
  });

  it('never releases its budget, even if the screen says the conversation concluded', async () => {
    const store = fakeStore();
    const first = await session('introduction', store);
    await spendTokens(3_000);

    await act(async () => {
      first.result.current.journeyCreated();
    });

    expect(store.states.get(INTRODUCTION_CONVERSATION_KEY)).toEqual({
      callsUsed: 1,
      tokensUsed: 3_000,
    });
    await first.unmount();
  });
});

describe('a planning conversation resets for finishing, not for leaving', () => {
  it('keeps its spend when it is abandoned and resumed', async () => {
    const store = fakeStore();

    const abandoned = await session('planning', store);
    await spendTokens(5_000);
    await abandoned.unmount();

    const resumed = await session('planning', store);
    await spendTokens(4_000);

    expect(store.states.get(PLANNING_CONVERSATION_KEY)).toEqual({
      callsUsed: 2,
      tokensUsed: 9_000,
    });
    expect(resumed.result.current.budgetZone).toBe('narrowing');
    await resumed.unmount();
  });

  it('starts empty after a Journey was actually created', async () => {
    const store = fakeStore();

    const built = await session('planning', store);
    await spendTokens(9_000);
    await act(async () => {
      built.result.current.journeyCreated();
    });
    await built.unmount();

    const next = await session('planning', store);

    expect(store.states.get(PLANNING_CONVERSATION_KEY)).toBeUndefined();
    expect(next.result.current.budgetZone).toBe('open');
    expect(next.result.current.canAskOpenQuestion).toBe(true);
    await next.unmount();
  });

  it('does not share a budget with the introduction', async () => {
    const store = fakeStore();

    const intro = await session('introduction', store);
    await spendTokens(9_000);
    await intro.unmount();

    const planning = await session('planning', store);

    expect(planning.result.current.budgetZone).toBe('open');
    await planning.unmount();
  });
});

describe('storage trouble never locks anybody out', () => {
  it('opens on an empty budget when the stored state cannot be read', async () => {
    const broken: ConversationBudgetStore = {
      async load() {
        throw new Error('storage is unavailable');
      },
      async save() {
        throw new Error('storage is unavailable');
      },
      async clear() {
        throw new Error('storage is unavailable');
      },
    };

    const only = await session('introduction', broken);

    expect(only.result.current.budgetZone).toBe('open');
    expect(only.result.current.canAskOpenQuestion).toBe(true);
    expect(only.result.current.items.length).toBeGreaterThan(0);
    await only.unmount();
  });
});
