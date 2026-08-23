/**
 * Read marks: they round-trip, and every failure degrades to "nothing has been read".
 */
// AsyncStorage — whose native module is null under jest. Use the package's official jest mock so
// the boundary is testable off-device (same pattern as the auth gateway tests).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import type { KeyValueStore } from '../../persistence/keyValueStore';
import { makeNotificationReadStore, NOTIFICATION_READS_KEY } from '../notificationReads';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    async getItem(k) { return map.get(k) ?? null; },
    async setItem(k, v) { map.set(k, v); },
    async removeItem(k) { map.delete(k); },
  };
}

describe('notificationReads', () => {
  it('starts empty and round-trips a saved set', async () => {
    const kv = memoryStore();
    const store = makeNotificationReadStore(kv);
    expect([...(await store.load())]).toEqual([]);
    await store.save(new Set(['cheer:c1', 'cheer:c2']));
    expect([...(await store.load())].sort()).toEqual(['cheer:c1', 'cheer:c2']);
  });

  it('treats a corrupted blob as empty instead of throwing', async () => {
    const store = makeNotificationReadStore(memoryStore({ [NOTIFICATION_READS_KEY]: 'not json' }));
    await expect(store.load()).resolves.toEqual(new Set());
  });

  it('ignores non-string entries in a tampered blob', async () => {
    const store = makeNotificationReadStore(
      memoryStore({ [NOTIFICATION_READS_KEY]: JSON.stringify(['ok', 7, null]) }),
    );
    expect([...(await store.load())]).toEqual(['ok']);
  });

  it('survives a storage that throws, in both directions', async () => {
    const broken: KeyValueStore = {
      async getItem() { throw new Error('nope'); },
      async setItem() { throw new Error('nope'); },
      async removeItem() { throw new Error('nope'); },
    };
    const store = makeNotificationReadStore(broken);
    await expect(store.load()).resolves.toEqual(new Set());
    await expect(store.save(new Set(['a']))).resolves.toBeUndefined();
    await expect(store.clear()).resolves.toBeUndefined();
  });

  it('clears everything', async () => {
    const kv = memoryStore();
    const store = makeNotificationReadStore(kv);
    await store.save(new Set(['a']));
    await store.clear();
    expect(kv.map.has(NOTIFICATION_READS_KEY)).toBe(false);
  });
});
