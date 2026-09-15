/**
 * The conversation id: the key that makes "what does one conversation cost" answerable.
 *
 * The tests hold the three properties the accounting rests on. It must be OPAQUE — carrying no
 * timestamp, no counter and nothing about the person, which is why `createId` was not reused. It
 * must be STABLE for the life of a conversation, or a five-call conversation becomes five one-call
 * conversations on the dashboard and every average is wrong. And it must survive storage failing,
 * because a coach turn is never worth losing to a metering concern.
 */
// The module imports AsyncStorage for its default store; the tests inject an in-memory one.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import type { KeyValueStore } from '../../persistence/keyValueStore';
import {
  CONVERSATION_ID_PATTERN,
  TRACE_KEY_PREFIX,
  isConversationId,
  makeConversationTraceStore,
  newConversationId,
} from '../conversationTrace';

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

/** A store whose every operation fails, which is the case the cache exists for. */
function brokenStore(): KeyValueStore {
  return {
    async getItem() {
      throw new Error('storage unavailable');
    },
    async setItem() {
      throw new Error('storage unavailable');
    },
    async removeItem() {
      throw new Error('storage unavailable');
    },
  };
}

describe('newConversationId', () => {
  it('is 128 bits of hex and nothing else', () => {
    expect(newConversationId()).toMatch(CONVERSATION_ID_PATTERN);
  });

  it('does not repeat', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newConversationId()));
    expect(ids.size).toBe(500);
  });

  it('carries no timestamp, unlike the general-purpose id helper', () => {
    // `createId` embeds Date.now() in base 36; an id that leaks when a conversation started is an
    // id somebody has to reason about every time the table is read.
    const stamp = Date.now().toString(36);
    expect(newConversationId().includes(stamp)).toBe(false);
  });

  it('rejects anything that is not exactly that shape', () => {
    expect(isConversationId('a'.repeat(32))).toBe(true);
    expect(isConversationId('A'.repeat(32))).toBe(false);
    expect(isConversationId('a'.repeat(31))).toBe(false);
    expect(isConversationId('my goal is to stop smoking')).toBe(false);
    expect(isConversationId(null)).toBe(false);
  });
});

describe('the conversation trace store', () => {
  it('mints an id once and returns the same one for every later call', async () => {
    const store = makeConversationTraceStore(memoryStore());
    const first = await store.tagFor('planning');
    const second = await store.tagFor('planning');
    expect(second.id).toBe(first.id);
    expect(second.kind).toBe('planning');
  });

  it('keeps the two kinds apart, so their costs can be compared', async () => {
    const store = makeConversationTraceStore(memoryStore());
    const introduction = await store.tagFor('introduction');
    const planning = await store.tagFor('planning');
    expect(introduction.id).not.toBe(planning.id);
  });

  it('survives a relaunch: a new store reads the id back rather than starting a new conversation', async () => {
    const storage = memoryStore();
    const first = await makeConversationTraceStore(storage).tagFor('introduction');
    const afterRelaunch = await makeConversationTraceStore(storage).tagFor('introduction');
    expect(afterRelaunch.id).toBe(first.id);
    expect(storage.map.get(`${TRACE_KEY_PREFIX}introduction`)).toBe(first.id);
  });

  it('does not trust a stored value it did not write', async () => {
    // Whatever this is, it is not one of our ids, and it is certainly not going to the server.
    const storage = memoryStore({ [`${TRACE_KEY_PREFIX}planning`]: 'quit-smoking-for-my-daughter' });
    const tag = await makeConversationTraceStore(storage).tagFor('planning');
    expect(tag.id).toMatch(CONVERSATION_ID_PATTERN);
    expect(storage.map.get(`${TRACE_KEY_PREFIX}planning`)).toBe(tag.id);
  });

  it('starts a new conversation after a clear, and only after one', async () => {
    const storage = memoryStore();
    const store = makeConversationTraceStore(storage);
    const before = await store.tagFor('planning');
    await store.clear('planning');
    const after = await store.tagFor('planning');
    expect(after.id).not.toBe(before.id);
    expect(storage.map.get(`${TRACE_KEY_PREFIX}planning`)).toBe(after.id);
  });

  it('still groups a conversation when storage is broken, instead of one id per call', async () => {
    const store = makeConversationTraceStore(brokenStore());
    const first = await store.tagFor('introduction');
    const second = await store.tagFor('introduction');
    expect(first.id).toMatch(CONVERSATION_ID_PATTERN);
    expect(second.id).toBe(first.id);
  });
});
