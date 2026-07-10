/**
 * secureSessionStore tests — the chunking adapter that keeps a >2KB Supabase
 * session inside SecureStore's ~2048-BYTE-per-value limit (Auth_Backend_Proposal
 * R2). A fake in-memory backend stands in for the device keychain (pure TS).
 */
import { createSecureSessionStore, type SecureStoreBackend } from '../secureSessionStore';

interface FakeBackend extends SecureStoreBackend {
  map: Map<string, string>;
  size(): number;
}

function fakeBackend(): FakeBackend {
  const map = new Map<string, string>();
  return {
    map,
    async getItemAsync(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    async setItemAsync(key, value) {
      map.set(key, value);
    },
    async deleteItemAsync(key) {
      map.delete(key);
    },
    size() {
      return map.size;
    },
  };
}

const KEY = 'sb-session';
/** Byte cap SecureStore enforces per value; we assert we never exceed it. */
const SECURE_STORE_LIMIT = 2048;

/** UTF-8 byte length via the platform encoder (ground truth for the assertions). */
const utf8Len = (s: string) => new TextEncoder().encode(s).length;

/** Every physical chunk entry (keys shaped `KEY.<gen>.<i>`), not the manifest. */
function chunkEntries(backend: FakeBackend): string[] {
  return [...backend.map.entries()].filter(([k]) => /\.\d+\.\d+$/.test(k)).map(([, v]) => v);
}

describe('createSecureSessionStore', () => {
  it('round-trips a small value', async () => {
    const backend = fakeBackend();
    const store = createSecureSessionStore(backend);
    await store.setItem(KEY, 'hello');
    await expect(store.getItem(KEY)).resolves.toBe('hello');
  });

  it('round-trips a large (>2KB) value by chunking', async () => {
    const backend = fakeBackend();
    const store = createSecureSessionStore(backend);
    const big = 'x'.repeat(9000); // ~9KB — well over a single SecureStore entry
    await store.setItem(KEY, big);
    await expect(store.getItem(KEY)).resolves.toBe(big);
    expect(chunkEntries(backend).length).toBeGreaterThan(1);
  });

  it('keeps every chunk under the SecureStore BYTE limit (ASCII)', async () => {
    const backend = fakeBackend();
    const store = createSecureSessionStore(backend);
    const big = JSON.stringify({ token: 'y'.repeat(8000), refresh: 'z'.repeat(4000) });
    await store.setItem(KEY, big);
    for (const chunk of chunkEntries(backend)) {
      expect(utf8Len(chunk)).toBeLessThanOrEqual(SECURE_STORE_LIMIT);
    }
    await expect(store.getItem(KEY)).resolves.toBe(big);
  });

  it('chunks by BYTES and round-trips a heavy non-ASCII / emoji payload', async () => {
    const backend = fakeBackend();
    const store = createSecureSessionStore(backend);
    // Emoji are 4 UTF-8 bytes each (surrogate pairs); accented chars are 2. A naive
    // char-based splitter would blow the byte cap here — assert we stay under it and
    // never sever a surrogate pair (round-trip equality proves both).
    const emoji = '🎉'.repeat(1200); // ~4800 bytes of 4-byte code points
    const accented = 'café—naïve—Ωμέγα '.repeat(300);
    const big = emoji + accented + '🔥ending';
    await store.setItem(KEY, big);
    for (const chunk of chunkEntries(backend)) {
      expect(utf8Len(chunk)).toBeLessThanOrEqual(SECURE_STORE_LIMIT);
    }
    await expect(store.getItem(KEY)).resolves.toBe(big);
  });

  it('shrinking a value leaves no stale chunks from the old generation', async () => {
    const backend = fakeBackend();
    const store = createSecureSessionStore(backend);
    await store.setItem(KEY, 'a'.repeat(9000)); // many chunks (gen 0)
    await store.setItem(KEY, 'small'); // one chunk (gen 1); gen 0 reclaimed
    await expect(store.getItem(KEY)).resolves.toBe('small');
    expect(chunkEntries(backend).length).toBe(1);
  });

  it('getItem returns null for an unknown key', async () => {
    const store = createSecureSessionStore(fakeBackend());
    await expect(store.getItem('nope')).resolves.toBeNull();
  });

  it('removeItem clears the manifest and all chunks', async () => {
    const backend = fakeBackend();
    const store = createSecureSessionStore(backend);
    await store.setItem(KEY, 'q'.repeat(5000));
    await store.removeItem(KEY);
    expect(backend.size()).toBe(0);
    await expect(store.getItem(KEY)).resolves.toBeNull();
  });

  it('reads a legacy unchunked value written without a manifest', async () => {
    const backend = fakeBackend();
    await backend.setItemAsync(KEY, 'legacy-plain-value');
    const store = createSecureSessionStore(backend);
    await expect(store.getItem(KEY)).resolves.toBe('legacy-plain-value');
  });

  it('returns null (logged out, not crashed) when a mid-chunk is missing', async () => {
    const backend = fakeBackend();
    const store = createSecureSessionStore(backend);
    await store.setItem(KEY, 'b'.repeat(9000)); // gen 0, several chunks
    // Simulate a lost keychain entry: delete one interior chunk.
    const chunkKeys = [...backend.map.keys()].filter((k) => /\.\d+\.\d+$/.test(k)).sort();
    backend.map.delete(chunkKeys[1]);
    await expect(store.getItem(KEY)).resolves.toBeNull();
  });

  it('a failed write rolls back staged chunks and preserves the previous value', async () => {
    const backend = fakeBackend();
    const store = createSecureSessionStore(backend);
    await store.setItem(KEY, 'good'.repeat(2000)); // gen 0 committed
    const before = chunkEntries(backend).length;

    // Make the NEXT setItemAsync (a gen-1 staged chunk) throw partway through.
    const realSet = backend.setItemAsync;
    let calls = 0;
    backend.setItemAsync = async (k, v) => {
      calls += 1;
      if (calls === 2) throw new Error('keychain unavailable');
      return realSet(k, v);
    };

    await expect(store.setItem(KEY, 'z'.repeat(9000))).rejects.toThrow('keychain unavailable');
    backend.setItemAsync = realSet;

    // Old value still intact; no orphaned gen-1 fragments left behind.
    await expect(store.getItem(KEY)).resolves.toBe('good'.repeat(2000));
    expect(chunkEntries(backend).length).toBe(before);
  });
});
