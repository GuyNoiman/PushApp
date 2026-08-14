/**
 * EncryptedLocalRepository tests. The repository is exercised through the PUBLIC
 * Repository interface (load/save/clear) with in-memory fakes standing in for
 * AsyncStorage and the device keychain (expo-secure-store) — pure TS, no OS. The
 * REAL aesCryptoProvider is used so we prove genuine AES round-tripping and that
 * the persisted blob is not plaintext-readable.
 *
 * expo-secure-store + react-native are native at load time; the module imports
 * them for its DEFAULT backend, so we stub them even though every test injects a
 * fake backend and never hits the real one (same pattern as the AppCore tests).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

import {
  aesCryptoProvider,
  CIPHERTEXT_KEY,
  DEK_STORE_KEY,
  EncryptedLocalRepository,
  LEGACY_CIPHERTEXT_KEY,
  LEGACY_DEK_STORE_KEY,
  type KeyValueStore,
  type SecureStoreBackend,
} from '../EncryptedLocalRepository';
import { STORAGE_KEY } from '../LocalRepository';
import { QUARANTINE_KEY_PREFIX } from '../quarantine';
import type { LoadResult } from '../Repository';
import type { AppState } from '../../types/domain';

/** In-memory AsyncStorage stand-in that also lets a test peek at raw values. */
function fakeKv() {
  const map = new Map<string, string>();
  const kv: KeyValueStore = {
    async getItem(k) {
      return map.has(k) ? map.get(k)! : null;
    },
    async setItem(k, v) {
      map.set(k, v);
    },
    async removeItem(k) {
      map.delete(k);
    },
  };
  return { kv, map };
}

/** In-memory keychain stand-in for expo-secure-store. */
function fakeSecure() {
  const map = new Map<string, string>();
  const secure: SecureStoreBackend = {
    async getItemAsync(k) {
      return map.has(k) ? map.get(k)! : null;
    },
    async setItemAsync(k, v) {
      map.set(k, v);
    },
    async deleteItemAsync(k) {
      map.delete(k);
    },
  };
  return { secure, map };
}

/** A representative AppState carrying recognizable personal strings. */
function makeState(): AppState {
  return {
    dreams: [],
    journeys: [
      { id: 'journey_1', title: 'Run 5km', why: ['because I choose to'], durationDays: 30, rhythm: 'daily', steps: [], createdAt: 1000 },
    ],
    buddy: { name: 'Pip', xp: 42, level: 3, stage: 'egg', coins: 7, ownedCosmetics: [], equippedCosmetic: null },
    checkIns: [],
    missions: { progress: {}, dailyResetKey: '', weeklyResetKey: '' },
    login: { lastClaimedKey: null, dayIndex: 0 },
    reminderRules: [],
    communicationPrefs: {
      remindersEnabled: true,
      socialCheerEnabled: true,
      socialNudgeEnabled: true,
      locationOptIn: false,
      calendarOptIn: false,
    },
    schedulingPrefs: { window: undefined, dayPart: 'either', preferredDays: [] },
  } as AppState;
}

function repo(kv: KeyValueStore, secure: SecureStoreBackend) {
  return new EncryptedLocalRepository({ kv, secure });
}

/** The AppState behind a successful load — fails loudly on any other outcome. */
function loadedState(result: LoadResult): AppState {
  if (result.kind !== 'loaded') throw new Error(`expected a loaded snapshot, got "${result.kind}"`);
  return result.state;
}

beforeEach(() => jest.clearAllMocks());

describe('round-trip through encryption', () => {
  it('save() then load() returns an equal AppState', async () => {
    const { kv } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);

    const state = makeState();
    await r.save(state);
    const loaded = await r.load();

    expect(loaded).toEqual({ kind: 'loaded', state });
  });

  it('mints the DEK in the keychain (secure store), never in AsyncStorage', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    const r = repo(kv, secure);

    await r.save(makeState());

    expect(secureMap.has(DEK_STORE_KEY)).toBe(true);
    expect(kvMap.has(DEK_STORE_KEY)).toBe(false);
    // The key is a 256-bit (64 hex char) value.
    expect(secureMap.get(DEK_STORE_KEY)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('the persisted blob is not plaintext-readable', () => {
  it('stores an opaque ciphertext envelope, not the raw JSON', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);

    await r.save(makeState());
    const stored = kvMap.get(CIPHERTEXT_KEY)!;

    // Recognizable personal strings must not leak into the at-rest payload.
    expect(stored).not.toContain('Run 5km');
    expect(stored).not.toContain('Pip');
    expect(stored).not.toContain('because I choose to');
    // It is an { v, iv, ct } envelope — not the serialized state.
    const parsed = JSON.parse(stored);
    expect(parsed).toMatchObject({ v: 1, iv: expect.any(String), ct: expect.any(String) });
    expect(parsed).not.toHaveProperty('journeys');
  });

  it('is undecryptable without the key: a wrong key reads as unreadable, NOT as a first run', async () => {
    const { kv } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    await repo(kv, secure).save(makeState());

    // Swap the keychain DEK for a different one — the ciphertext must not decrypt.
    secureMap.set(DEK_STORE_KEY, 'f'.repeat(64));
    const loaded = await repo(kv, secure).load();
    // Reporting "first run" here is what used to get the data overwritten.
    expect(loaded.kind).toBe('unreadable');
  });

  it('reports a corrupt ciphertext instead of throwing', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);

    await r.save(makeState());
    kvMap.set(CIPHERTEXT_KEY, 'not-a-valid-envelope');
    await expect(r.load()).resolves.toMatchObject({ kind: 'unreadable', reason: 'corrupt' });
  });
});

describe('migration from a seeded plaintext blob (S0.4)', () => {
  it('reads legacy plaintext, re-persists encrypted, and removes the plaintext', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    const state = makeState();

    // Seed a legacy plaintext snapshot exactly as the old LocalRepository wrote it.
    kvMap.set(STORAGE_KEY, JSON.stringify(state));

    const r = repo(kv, secure);
    const loaded = await r.load();

    // The user's data survives the upgrade unchanged.
    expect(loadedState(loaded)).toEqual(state);
    // The plaintext copy is gone…
    expect(kvMap.has(STORAGE_KEY)).toBe(false);
    // …replaced by an encrypted blob that no longer leaks the plaintext.
    const stored = kvMap.get(CIPHERTEXT_KEY)!;
    expect(stored).toBeDefined();
    expect(stored).not.toContain('Run 5km');

    // A subsequent load now comes from the encrypted store and still matches.
    expect(loadedState(await r.load())).toEqual(state);
  });

  it('does not let a stale plaintext remnant clobber an existing encrypted store', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);

    // Current (post-migration) encrypted state.
    const current = makeState();
    await r.save(current);

    // A stale plaintext remnant with DIFFERENT, older data appears alongside it.
    const stale = makeState();
    stale.buddy.name = 'OldName';
    kvMap.set(STORAGE_KEY, JSON.stringify(stale));

    const loaded = await r.load();
    // The encrypted store wins; the stale remnant is discarded, not applied.
    expect(loadedState(loaded).buddy.name).toBe('Pip');
    expect(kvMap.has(STORAGE_KEY)).toBe(false);
  });

  it('quarantines a corrupt legacy blob instead of discarding it (C0)', async () => {
    // This used to delete the blob and report a first run. It is still the user's
    // only copy, however broken, so it is preserved and the failure is reported.
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    kvMap.set(STORAGE_KEY, '{ this is not json');

    const loaded = await repo(kv, secure).load();
    expect(loaded).toMatchObject({ kind: 'unreadable', reason: 'malformed' });
    expect(kvMap.has(STORAGE_KEY)).toBe(false); // moved out of the live slot…
    const quarantined = [...kvMap.entries()].filter(([k]) => k.startsWith(QUARANTINE_KEY_PREFIX));
    expect(quarantined).toHaveLength(1); // …and preserved byte-for-byte
    expect(quarantined[0][1]).toBe('{ this is not json');
  });
});

describe('clear() rotates the key (S0.4)', () => {
  it('destroys the keychain DEK so encrypted remnants are unrecoverable', async () => {
    const { kv } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    const r = repo(kv, secure);

    await r.save(makeState());
    expect(secureMap.has(DEK_STORE_KEY)).toBe(true);

    await r.clear();
    expect(secureMap.has(DEK_STORE_KEY)).toBe(false);
  });

  it('mints a NEW key on the next save, and old ciphertext is unrecoverable', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    const r = repo(kv, secure);

    await r.save(makeState());
    const firstKey = secureMap.get(DEK_STORE_KEY)!;
    // Preserve a copy of the old ciphertext to simulate a surviving remnant.
    const oldCiphertext = kvMap.get(CIPHERTEXT_KEY)!;

    await r.clear();
    await r.save(makeState());
    const secondKey = secureMap.get(DEK_STORE_KEY)!;

    expect(secondKey).not.toBe(firstKey);

    // The old remnant cannot be decrypted under the new key. It is reported as
    // unreadable (and quarantined) rather than passed off as a first run.
    kvMap.set(CIPHERTEXT_KEY, oldCiphertext);
    await expect(r.load()).resolves.toMatchObject({ kind: 'unreadable', reason: 'corrupt' });
  });

  it('removes the ciphertext blob', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);

    await r.save(makeState());
    await r.clear();
    expect(kvMap.has(CIPHERTEXT_KEY)).toBe(false);
    await expect(r.load()).resolves.toEqual({ kind: 'first-run' });
  });
});

describe('key rotation off the possibly-weak generation-1 DEK (S0.5)', () => {
  /**
   * A store exactly as a pre-fix build left it: ciphertext in the v1 slot,
   * encrypted under a v1 keychain DEK that may have come from Math.random().
   */
  const WEAK_KEY = '0123456789abcdef'.repeat(4); // 64 hex chars, deliberately guessable
  function seedLegacyGeneration(
    kvMap: Map<string, string>,
    secureMap: Map<string, string>,
    state: AppState,
  ) {
    secureMap.set(LEGACY_DEK_STORE_KEY, WEAK_KEY);
    kvMap.set(LEGACY_CIPHERTEXT_KEY, aesCryptoProvider.encrypt(JSON.stringify(state), WEAK_KEY));
  }

  it('re-encrypts a legacy store under a fresh key, losing nothing', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    const state = makeState();
    seedLegacyGeneration(kvMap, secureMap, state);

    const loaded = await repo(kv, secure).load();

    // Every value survives the rotation byte-for-byte.
    expect(loadedState(loaded)).toEqual(state);
    // A brand-new key replaced the weak one, and the weak one is gone.
    const freshKey = secureMap.get(DEK_STORE_KEY)!;
    expect(freshKey).toMatch(/^[0-9a-f]{64}$/);
    expect(freshKey).not.toBe(WEAK_KEY);
    expect(secureMap.has(LEGACY_DEK_STORE_KEY)).toBe(false);
    // …as is the blob it protected; the data now lives in the current slot.
    expect(kvMap.has(LEGACY_CIPHERTEXT_KEY)).toBe(false);
    expect(kvMap.get(CIPHERTEXT_KEY)).toBeDefined();
    expect(kvMap.get(CIPHERTEXT_KEY)).not.toContain('Run 5km');
  });

  it('is idempotent: a second open is a plain load, not another rotation', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    const state = makeState();
    seedLegacyGeneration(kvMap, secureMap, state);

    const r = repo(kv, secure);
    await r.load();
    const keyAfterRotation = secureMap.get(DEK_STORE_KEY)!;

    expect(loadedState(await r.load())).toEqual(state);
    expect(secureMap.get(DEK_STORE_KEY)).toBe(keyAfterRotation); // not re-rotated
  });

  it('retires a stray legacy key that has no data behind it', async () => {
    const { kv } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    secureMap.set(LEGACY_DEK_STORE_KEY, WEAK_KEY); // key, but no v1 ciphertext

    await expect(repo(kv, secure).load()).resolves.toEqual({ kind: 'first-run' });
    expect(secureMap.has(LEGACY_DEK_STORE_KEY)).toBe(false);
  });

  it('quarantines an undecryptable legacy blob rather than destroying it', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    secureMap.set(LEGACY_DEK_STORE_KEY, WEAK_KEY);
    kvMap.set(LEGACY_CIPHERTEXT_KEY, 'not-a-valid-envelope');

    // Rotation cannot rescue it, so the load path classifies it and moves it aside.
    await expect(repo(kv, secure).load()).resolves.toMatchObject({
      kind: 'unreadable',
      reason: 'corrupt',
    });
    // Nothing was thrown away — a later fix could still try to recover it, and the
    // key it was written under is kept too.
    const quarantined = [...kvMap.entries()].filter(([k]) => k.startsWith(QUARANTINE_KEY_PREFIX));
    expect(quarantined).toHaveLength(1);
    expect(quarantined[0][1]).toBe('not-a-valid-envelope');
    expect(secureMap.get(LEGACY_DEK_STORE_KEY)).toBe(WEAK_KEY);
  });

  it('clear() wipes the legacy generation too, not just the current one', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    seedLegacyGeneration(kvMap, secureMap, makeState());

    await repo(kv, secure).clear();

    expect(kvMap.has(LEGACY_CIPHERTEXT_KEY)).toBe(false);
    expect(secureMap.has(LEGACY_DEK_STORE_KEY)).toBe(false);
  });
});

describe('a rotation that fails part-way never loses data (S0.5)', () => {
  const WEAK_KEY = 'fedcba9876543210'.repeat(4);

  /** Wraps a keychain so the given write fails — modelling a crash mid-rotation. */
  function failingOn(secure: SecureStoreBackend, failKey: string, fail: { on: boolean }) {
    return {
      ...secure,
      setItemAsync: async (k: string, v: string) => {
        if (k === failKey && fail.on) throw new Error('keychain unavailable');
        return secure.setItemAsync(k, v);
      },
    } satisfies SecureStoreBackend;
  }

  function seed(kvMap: Map<string, string>, secureMap: Map<string, string>, state: AppState) {
    secureMap.set(LEGACY_DEK_STORE_KEY, WEAK_KEY);
    kvMap.set(LEGACY_CIPHERTEXT_KEY, aesCryptoProvider.encrypt(JSON.stringify(state), WEAK_KEY));
  }

  it('fails BEFORE the commit: data still reads back, old key untouched', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    const state = makeState();
    seed(kvMap, secureMap, state);

    // The new key never reaches the keychain — the commit point never happens.
    const fail = { on: true };
    const loaded = await repo(kv, failingOn(secure, DEK_STORE_KEY, fail)).load();

    // The user still gets their data, decrypted with the old key.
    expect(loadedState(loaded)).toEqual(state);
    // Both halves of the legacy generation are exactly as they were.
    expect(secureMap.get(LEGACY_DEK_STORE_KEY)).toBe(WEAK_KEY);
    expect(kvMap.has(LEGACY_CIPHERTEXT_KEY)).toBe(true);
    // No current-generation key was published, so nothing points at the orphan blob.
    expect(secureMap.has(DEK_STORE_KEY)).toBe(false);
  });

  it('retries cleanly on the next open once the keychain recovers', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    const state = makeState();
    seed(kvMap, secureMap, state);

    const fail = { on: true };
    const flaky = failingOn(secure, DEK_STORE_KEY, fail);
    await repo(kv, flaky).load(); // first open: rotation fails

    fail.on = false;
    const loaded = await repo(kv, flaky).load(); // second open: rotation succeeds

    expect(loadedState(loaded)).toEqual(state);
    expect(secureMap.get(DEK_STORE_KEY)).toMatch(/^[0-9a-f]{64}$/);
    expect(secureMap.has(LEGACY_DEK_STORE_KEY)).toBe(false);
    expect(kvMap.has(LEGACY_CIPHERTEXT_KEY)).toBe(false);
  });

  it('fails AFTER the commit: the new generation is already authoritative', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    const state = makeState();
    seed(kvMap, secureMap, state);

    // Model a crash between publishing the new key and tidying the old pair away.
    const stalling: SecureStoreBackend = {
      ...secure,
      deleteItemAsync: async (k) => {
        if (k === LEGACY_DEK_STORE_KEY) throw new Error('interrupted');
        return secure.deleteItemAsync(k);
      },
    };
    expect(loadedState(await repo(kv, stalling).load())).toEqual(state);
    expect(secureMap.has(DEK_STORE_KEY)).toBe(true); // commit landed

    // The next open reads the new generation and finishes the clean-up.
    expect(loadedState(await repo(kv, secure).load())).toEqual(state);
    expect(secureMap.has(LEGACY_DEK_STORE_KEY)).toBe(false);
    expect(kvMap.has(LEGACY_CIPHERTEXT_KEY)).toBe(false);
  });

  it('a failed rotation never leaves the store unreadable, whichever write breaks', async () => {
    // Sweep every write the rotation performs; after each failure the user's data
    // must still load. This is the invariant the whole design exists to hold.
    for (const brokenWrite of ['ciphertext', 'key'] as const) {
      const { kv, map: kvMap } = fakeKv();
      const { secure, map: secureMap } = fakeSecure();
      const state = makeState();
      seed(kvMap, secureMap, state);

      const brokenKv: KeyValueStore = {
        ...kv,
        setItem: async (k, v) => {
          if (brokenWrite === 'ciphertext' && k === CIPHERTEXT_KEY) throw new Error('disk full');
          return kv.setItem(k, v);
        },
      };
      const brokenSecure = failingOn(secure, DEK_STORE_KEY, { on: brokenWrite === 'key' });

      expect(loadedState(await repo(brokenKv, brokenSecure).load())).toEqual(state);
    }
  });
});

describe('web fallback shape (SecureStore backed by the KV)', () => {
  it('round-trips when the secure backend is the same KV (no OS keychain)', async () => {
    // On web the default backend routes secure reads/writes to AsyncStorage; model
    // that by pointing the secure backend at the same KV. Must not crash.
    const { kv } = fakeKv();
    const secure: SecureStoreBackend = {
      getItemAsync: (k) => kv.getItem(k),
      setItemAsync: (k, v) => kv.setItem(k, v),
      deleteItemAsync: (k) => kv.removeItem(k),
    };
    const r = repo(kv, secure);

    const state = makeState();
    await r.save(state);
    expect(loadedState(await r.load())).toEqual(state);
  });
});
