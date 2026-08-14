/**
 * Unreadable-data protection (Encryption_Design §6, Phase C0) at the Repository level.
 *
 * The behaviour under test is the one that used to destroy data: a snapshot that will not open
 * was reported as `null`, which the app read as "first run" — so it started empty and the next
 * write replaced the user's real, still-intact bytes. These tests pin the replacement contract:
 * classify the failure, copy the bytes somewhere nothing writes, refuse to save, and say so.
 *
 * Same fakes as EncryptedLocalRepository.test.ts (in-memory AsyncStorage + keychain, the REAL
 * crypto provider) so the round trip is genuine and nothing native is touched.
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
  type KeyValueStore,
  type SecureStoreBackend,
} from '../EncryptedLocalRepository';
import { LocalRepository, STORAGE_KEY } from '../LocalRepository';
import {
  MAX_QUARANTINED_SNAPSHOTS,
  QUARANTINE_KEY_PREFIX,
  quarantineSnapshot,
  RECOVERY_MARKER_KEY,
} from '../quarantine';
import { RepositoryLockedError } from '../Repository';
import type { AppState } from '../../types/domain';

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

function makeState(title = 'Run 5km'): AppState {
  return {
    dreams: [],
    journeys: [
      { id: 'journey_1', title, why: ['because I choose to'], durationDays: 30, rhythm: 'daily', steps: [], createdAt: 1000 },
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

/** Every quarantined blob currently on "disk", newest key first. */
function quarantined(map: Map<string, string>): [string, string][] {
  return [...map.entries()]
    .filter(([k]) => k.startsWith(QUARANTINE_KEY_PREFIX))
    .sort((a, b) => b[0].localeCompare(a[0]));
}

beforeEach(() => jest.clearAllMocks());

describe('classification — a first run is not a failure, and the failures differ', () => {
  it('an empty store is a genuine first run', async () => {
    const { kv } = fakeKv();
    const { secure } = fakeSecure();

    await expect(repo(kv, secure).load()).resolves.toEqual({ kind: 'first-run' });
  });

  it('ciphertext with NO key in the keychain is key-lost, not a first run', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    await repo(kv, secure).save(makeState());

    // Exactly what a restored backup without the keychain looks like: the data is
    // there, the key is not.
    secureMap.delete(DEK_STORE_KEY);

    const result = await repo(kv, secure).load();
    expect(result).toMatchObject({ kind: 'unreadable', reason: 'key-lost' });
    // The live slot is deliberately LEFT in place for key-lost: an unavailable
    // keychain (locked device) is indistinguishable from a lost key, and that has
    // to be able to heal itself.
    expect(kvMap.has(CIPHERTEXT_KEY)).toBe(true);
  });

  it('ciphertext WITH a key that will not open it is corrupt, a different reason', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    await repo(kv, secure).save(makeState());
    kvMap.set(CIPHERTEXT_KEY, 'not-a-valid-envelope');

    const result = await repo(kv, secure).load();
    expect(result).toMatchObject({ kind: 'unreadable', reason: 'corrupt' });
  });

  it('a blob that decrypts to non-JSON is malformed, our bug and not the device`s', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    await repo(kv, secure).save(makeState());

    // Re-encrypt garbage under the SAME key: it decrypts cleanly, then fails to parse.
    kvMap.set(CIPHERTEXT_KEY, aesCryptoProvider.encrypt('{ not json', secureMap.get(DEK_STORE_KEY)!));

    await expect(repo(kv, secure).load()).resolves.toMatchObject({
      kind: 'unreadable',
      reason: 'malformed',
    });
  });
});

describe('quarantine — the bytes are preserved, never replaced', () => {
  it('copies the unreadable snapshot byte-for-byte', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    await repo(kv, secure).save(makeState());
    const original = kvMap.get(CIPHERTEXT_KEY)!.replace(/.$/, 'z'); // one flipped byte
    kvMap.set(CIPHERTEXT_KEY, original);

    const result = await repo(kv, secure).load();

    expect(result.kind).toBe('unreadable');
    const copies = quarantined(kvMap);
    expect(copies).toHaveLength(1);
    expect(copies[0][1]).toBe(original); // identical, not re-encoded
    expect(result).toMatchObject({ quarantinedKey: copies[0][0] });
    // The live slot no longer holds it, so nothing can write over it there.
    expect(kvMap.has(CIPHERTEXT_KEY)).toBe(false);
  });

  it('keeps the key, because a blob we cannot read today may be readable later', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    await repo(kv, secure).save(makeState());
    const key = secureMap.get(DEK_STORE_KEY)!;
    kvMap.set(CIPHERTEXT_KEY, 'not-a-valid-envelope');

    await repo(kv, secure).load();

    expect(secureMap.get(DEK_STORE_KEY)).toBe(key);
  });

  it('records a marker so a RELAUNCH is not mistaken for a first run', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    await repo(kv, secure).save(makeState());
    kvMap.set(CIPHERTEXT_KEY, 'not-a-valid-envelope');

    const first = await repo(kv, secure).load();
    // A brand-new instance, exactly like the next launch. The live slot is empty
    // now — the ONLY thing standing between the user and a silent reset is the marker.
    const second = await repo(kv, secure).load();

    expect(kvMap.has(RECOVERY_MARKER_KEY)).toBe(true);
    expect(second).toMatchObject({ kind: 'unreadable', reason: 'corrupt' });
    // The failure keeps its original timestamp rather than resetting every launch.
    expect(second.kind === 'unreadable' && first.kind === 'unreadable' && second.at).toBe(
      first.kind === 'unreadable' ? first.at : -1,
    );
  });

  it('keeps at most two quarantined snapshots, dropping the oldest', async () => {
    // Driven directly: repeated failures are rare (the marker short-circuits the
    // second launch), but the cap is what keeps storage bounded when they happen.
    const { kv, map: kvMap } = fakeKv();

    for (const [i, raw] of ['blob-one', 'blob-two', 'blob-three'].entries()) {
      await kv.setItem(CIPHERTEXT_KEY, raw);
      await quarantineSnapshot(kv, {
        sourceKey: CIPHERTEXT_KEY,
        raw,
        reason: 'corrupt',
        now: 1_000 + i,
      });
    }

    const copies = quarantined(kvMap);
    expect(copies).toHaveLength(MAX_QUARANTINED_SNAPSHOTS);
    expect(copies.map(([, v]) => v)).toEqual(['blob-three', 'blob-two']);
  });

  it('a key-lost store that becomes readable again heals itself', async () => {
    const { kv } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    const state = makeState();
    await repo(kv, secure).save(state);
    const key = secureMap.get(DEK_STORE_KEY)!;

    secureMap.delete(DEK_STORE_KEY); // keychain unavailable this launch
    await expect(repo(kv, secure).load()).resolves.toMatchObject({ reason: 'key-lost' });

    secureMap.set(DEK_STORE_KEY, key); // …and available the next one
    const healed = await repo(kv, secure).load();

    expect(healed).toEqual({ kind: 'loaded', state });
    await expect(kv.getItem(RECOVERY_MARKER_KEY)).resolves.toBeNull();
  });
});

describe('the write lock — losing saves beats losing history', () => {
  it('refuses to save after an unreadable load', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);
    await r.save(makeState());
    kvMap.set(CIPHERTEXT_KEY, 'not-a-valid-envelope');

    await r.load();

    await expect(r.save(makeState('Something new'))).rejects.toBeInstanceOf(RepositoryLockedError);
  });

  it('the quarantined bytes survive a save attempt', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);
    await r.save(makeState());
    kvMap.set(CIPHERTEXT_KEY, 'not-a-valid-envelope');
    await r.load();

    await r.save(makeState('Overwrite me')).catch(() => undefined);

    expect(quarantined(kvMap).map(([, v]) => v)).toEqual(['not-a-valid-envelope']);
    expect(kvMap.has(CIPHERTEXT_KEY)).toBe(false);
  });

  it('clear() releases the lock and takes the quarantine with it', async () => {
    const { kv, map: kvMap } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);
    await r.save(makeState());
    kvMap.set(CIPHERTEXT_KEY, 'not-a-valid-envelope');
    await r.load();

    await r.clear();

    expect(quarantined(kvMap)).toHaveLength(0);
    expect(kvMap.has(RECOVERY_MARKER_KEY)).toBe(false);
    // Usable again straight away — the wipe is the resolution.
    await expect(r.save(makeState('Fresh start'))).resolves.toBeUndefined();
    await expect(repo(kv, secure).load()).resolves.toMatchObject({ kind: 'loaded' });
  });

  it('an account deletion is not mistaken for corruption on the next launch', async () => {
    const { kv } = fakeKv();
    const { secure } = fakeSecure();
    const r = repo(kv, secure);
    await r.save(makeState());

    await r.clear(); // resetToFirstRun's repository half

    await expect(repo(kv, secure).load()).resolves.toEqual({ kind: 'first-run' });
  });
});

describe('LocalRepository carries the same protection', () => {
  it('quarantines an unparseable snapshot instead of reporting a first run', async () => {
    const { kv, map: kvMap } = fakeKv();
    const r = new LocalRepository(kv);
    kvMap.set(STORAGE_KEY, '{ half a snapsh');

    const result = await r.load();

    expect(result).toMatchObject({ kind: 'unreadable', reason: 'malformed' });
    expect(quarantined(kvMap).map(([, v]) => v)).toEqual(['{ half a snapsh']);
    await expect(r.save(makeState())).rejects.toBeInstanceOf(RepositoryLockedError);
  });

  it('still round-trips and still reports a genuine first run', async () => {
    const { kv } = fakeKv();
    const r = new LocalRepository(kv);

    await expect(r.load()).resolves.toEqual({ kind: 'first-run' });
    const state = makeState();
    await r.save(state);
    await expect(r.load()).resolves.toEqual({ kind: 'loaded', state });
  });
});
