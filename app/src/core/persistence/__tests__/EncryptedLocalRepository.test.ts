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
  CIPHERTEXT_KEY,
  DEK_STORE_KEY,
  EncryptedLocalRepository,
  type KeyValueStore,
  type SecureStoreBackend,
} from '../EncryptedLocalRepository';
import { STORAGE_KEY } from '../LocalRepository';
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

beforeEach(() => jest.clearAllMocks());

describe('round-trip through encryption', () => {
  it('save() then load() returns an equal AppState', async () => {
    const { kv } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);

    const state = makeState();
    await r.save(state);
    const loaded = await r.load();

    expect(loaded).toEqual(state);
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

  it('is undecryptable without the key: a wrong key yields first-run (null)', async () => {
    const { kv } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    await repo(kv, secure).save(makeState());

    // Swap the keychain DEK for a different one — the ciphertext must not decrypt.
    secureMap.set(DEK_STORE_KEY, 'f'.repeat(64));
    const loaded = await repo(kv, secure).load();
    expect(loaded).toBeNull();
  });

  it('degrades a corrupt ciphertext to null instead of throwing', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);

    await r.save(makeState());
    kvMap.set(CIPHERTEXT_KEY, 'not-a-valid-envelope');
    await expect(r.load()).resolves.toBeNull();
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
    expect(loaded).toEqual(state);
    // The plaintext copy is gone…
    expect(kvMap.has(STORAGE_KEY)).toBe(false);
    // …replaced by an encrypted blob that no longer leaks the plaintext.
    const stored = kvMap.get(CIPHERTEXT_KEY)!;
    expect(stored).toBeDefined();
    expect(stored).not.toContain('Run 5km');

    // A subsequent load now comes from the encrypted store and still matches.
    await expect(r.load()).resolves.toEqual(state);
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
    expect(loaded!.buddy.name).toBe('Pip');
    expect(kvMap.has(STORAGE_KEY)).toBe(false);
  });

  it('discards a corrupt legacy blob and starts fresh', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    kvMap.set(STORAGE_KEY, '{ this is not json');

    const loaded = await repo(kv, secure).load();
    expect(loaded).toBeNull();
    expect(kvMap.has(STORAGE_KEY)).toBe(false);
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

    // The old remnant cannot be decrypted under the new key → first run.
    kvMap.set(CIPHERTEXT_KEY, oldCiphertext);
    // The current key no longer matches the old ciphertext.
    await expect(r.load()).resolves.toBeNull();
  });

  it('removes the ciphertext blob', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);

    await r.save(makeState());
    await r.clear();
    expect(kvMap.has(CIPHERTEXT_KEY)).toBe(false);
    await expect(r.load()).resolves.toBeNull();
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
    await expect(r.load()).resolves.toEqual(state);
  });
});
