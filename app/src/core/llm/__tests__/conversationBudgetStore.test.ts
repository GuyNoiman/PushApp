/**
 * The conversation budget SURVIVES the screen closing (founder, 2026-09-15).
 *
 * It used to live in a `useRef`, so backing out of a conversation and starting it again handed
 * somebody a fresh six calls — and again, and again. These tests hold the storage half of the fix:
 * what is written, what is read back, and — the part that matters most — what happens when the
 * stored value is not something we wrote. A read that fails must produce an EMPTY budget, never a
 * full one and never a blocked one: storage trouble must not lock somebody out of the app.
 */
// The module under test imports AsyncStorage for its default store; the tests themselves inject an
// in-memory one and never reach a native module.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { EMPTY_BUDGET } from '../conversationBudget';
import type { KeyValueStore } from '../../persistence/keyValueStore';
import {
  BUDGET_KEY_PREFIX,
  INTRODUCTION_CONVERSATION_KEY,
  makeConversationBudgetStore,
  parseBudgetState,
} from '../conversationBudgetStore';

/** An in-memory KeyValueStore, so nothing here touches a native module. */
function memoryStore(seed: Record<string, string> = {}): KeyValueStore & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed));
  return {
    map,
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}

describe('a conversation budget that is kept between visits', () => {
  it('writes a running total under the conversation key and reads it back', async () => {
    const storage = memoryStore();
    const store = makeConversationBudgetStore(storage);

    await store.save(INTRODUCTION_CONVERSATION_KEY, { callsUsed: 3, tokensUsed: 4200 });

    expect(storage.map.has(BUDGET_KEY_PREFIX + INTRODUCTION_CONVERSATION_KEY)).toBe(true);
    await expect(store.load(INTRODUCTION_CONVERSATION_KEY)).resolves.toEqual({
      callsUsed: 3,
      tokensUsed: 4200,
    });
  });

  it('keeps conversations apart', async () => {
    const store = makeConversationBudgetStore(memoryStore());

    await store.save('introduction', { callsUsed: 5, tokensUsed: 9000 });

    await expect(store.load('planning')).resolves.toEqual(EMPTY_BUDGET);
  });

  it('forgets a conversation that concluded, so the next one starts fresh', async () => {
    const store = makeConversationBudgetStore(memoryStore());
    await store.save('planning', { callsUsed: 5, tokensUsed: 9000 });

    await store.clear('planning');

    await expect(store.load('planning')).resolves.toEqual(EMPTY_BUDGET);
  });

  it('starts empty when nothing is stored', async () => {
    const store = makeConversationBudgetStore(memoryStore());

    await expect(store.load('planning')).resolves.toEqual(EMPTY_BUDGET);
  });

  it('starts empty — never blocked — when the stored value is unreadable', async () => {
    const store = makeConversationBudgetStore(
      memoryStore({ [BUDGET_KEY_PREFIX + 'planning']: 'not json at all' }),
    );

    await expect(store.load('planning')).resolves.toEqual(EMPTY_BUDGET);
  });

  it('never throws when the device storage does', async () => {
    const broken: KeyValueStore = {
      async getItem() {
        throw new Error('storage is unavailable');
      },
      async setItem() {
        throw new Error('storage is unavailable');
      },
      async removeItem() {
        throw new Error('storage is unavailable');
      },
    };
    const store = makeConversationBudgetStore(broken);

    await expect(store.load('planning')).resolves.toEqual(EMPTY_BUDGET);
    await expect(store.save('planning', { callsUsed: 1, tokensUsed: 10 })).resolves.toBeUndefined();
    await expect(store.clear('planning')).resolves.toBeUndefined();
  });
});

describe('what counts as a stored budget', () => {
  it('rejects anything we did not write rather than trusting it', () => {
    expect(parseBudgetState(null)).toEqual(EMPTY_BUDGET);
    expect(parseBudgetState('')).toEqual(EMPTY_BUDGET);
    expect(parseBudgetState('{}')).toEqual(EMPTY_BUDGET);
    expect(parseBudgetState('{"callsUsed":-2,"tokensUsed":10}')).toEqual(EMPTY_BUDGET);
    expect(parseBudgetState('{"callsUsed":"3","tokensUsed":10}')).toEqual(EMPTY_BUDGET);
    expect(parseBudgetState('{"callsUsed":1}')).toEqual(EMPTY_BUDGET);
  });

  it('accepts a total it wrote itself', () => {
    expect(parseBudgetState('{"callsUsed":2,"tokensUsed":1500}')).toEqual({
      callsUsed: 2,
      tokensUsed: 1500,
    });
  });
});
