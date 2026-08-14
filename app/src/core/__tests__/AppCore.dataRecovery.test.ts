/**
 * THE data-loss regression (Encryption_Design §6, Phase C0).
 *
 * Before this fix, `Repository.load()` answered `null` both for "nothing stored yet" and for
 * "there IS something stored and it would not open". AppCore could not tell them apart, so an
 * unreadable store started the app empty and the very next state change wrote that empty state
 * over the user's still-intact bytes: Journeys, their "why", the Miss-Recovery reason log with its
 * free-text notes, onboarding answers, check-in history. Gone, permanently, at the moment of the
 * first save.
 *
 * These tests drive the REAL EncryptedLocalRepository over in-memory storage, so what they assert
 * is what is actually on "disk" — not what a fake promised. If the protection is ever removed, the
 * "the unreadable bytes survive a state change" test fails on the bytes themselves.
 */
// AppCore's module graph reaches native modules at import time even though every dependency here
// is injected (same pattern as the other AppCore suites).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock('expo-notifications', () => ({
  __esModule: true,
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  scheduleNotificationAsync: jest.fn(async () => 'notif'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
}));

import { AppCore } from '../AppCore';
import {
  CIPHERTEXT_KEY,
  DEK_STORE_KEY,
  EncryptedLocalRepository,
  type KeyValueStore,
  type SecureStoreBackend,
} from '../persistence/EncryptedLocalRepository';
import type { FirstRunFlag } from '../persistence/firstRunFlag';
import { QUARANTINE_KEY_PREFIX } from '../persistence/quarantine';

/** In-memory AsyncStorage stand-in, with the raw map exposed so tests can inspect the bytes. */
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

/** In-memory first-run marker (the real one is AsyncStorage-backed). */
function fakeFirstRunFlag(consumed = false): FirstRunFlag {
  let value = consumed;
  return {
    async isConsumed() {
      return value;
    },
    async markConsumed() {
      value = true;
    },
  };
}

/** Every quarantined blob currently on "disk". */
function quarantined(map: Map<string, string>): string[] {
  return [...map.entries()].filter(([k]) => k.startsWith(QUARANTINE_KEY_PREFIX)).map(([, v]) => v);
}

/**
 * A store holding one real, saved snapshot — then damaged, so it can no longer be opened. This is
 * a restored-backup / half-written-file device, not a new one.
 */
async function storeWithUnreadableData() {
  const { kv, map: kvMap } = fakeKv();
  const { secure, map: secureMap } = fakeSecure();

  const seeded = new AppCore(new EncryptedLocalRepository({ kv, secure }), fakeFirstRunFlag());
  await seeded.start();
  seeded.createJourney({
    title: 'The Journey that must not be lost',
    why: ['because I choose to'],
    durationDays: 30,
    rhythm: 'daily',
    steps: [{ title: 'Show up', isStarterStep: true, cadence: 'daily' }],
  });
  await seeded.flushSaves();

  const ciphertext = kvMap.get(CIPHERTEXT_KEY)!;
  expect(ciphertext).toBeDefined();
  // Damage it the way a truncated write or a wrong key generation would.
  kvMap.set(CIPHERTEXT_KEY, `${ciphertext.slice(0, -12)}deadbeefcafe`);

  return { kv, kvMap, secure, secureMap, damaged: kvMap.get(CIPHERTEXT_KEY)! };
}

/** A started core over the given store. */
async function startCore(
  kv: KeyValueStore,
  secure: SecureStoreBackend,
  flag: FirstRunFlag = fakeFirstRunFlag(),
) {
  const core = new AppCore(new EncryptedLocalRepository({ kv, secure }), flag);
  await core.start();
  return core;
}

describe('a genuine first run still behaves exactly as before', () => {
  it('seeds the demo data and reports no recovery state', async () => {
    const { kv } = fakeKv();
    const { secure } = fakeSecure();

    const core = await startCore(kv, secure);

    expect(core.getSnapshot().journeys.length).toBeGreaterThan(0); // demo seed ran
    expect(core.getDataRecovery()).toBeNull();
    expect(core.getSnapshot().dataRecovery).toBeNull();
  });

  it('does not re-seed after an account deletion, and that is not a failure state', async () => {
    const { kv } = fakeKv();
    const { secure } = fakeSecure();
    const flag = fakeFirstRunFlag();

    const core = await startCore(kv, secure, flag);
    await core.resetToFirstRun();

    // The next launch over the wiped store: clean, empty, and NOT a recovery state.
    const relaunched = await startCore(kv, secure, flag);
    expect(relaunched.getSnapshot().journeys).toHaveLength(0);
    expect(relaunched.getDataRecovery()).toBeNull();
  });
});

describe('an unreadable store never becomes an empty one', () => {
  it('reports it, seeds nothing, and keeps the bytes', async () => {
    const { kv, kvMap, secure, damaged } = await storeWithUnreadableData();

    const core = await startCore(kv, secure);

    expect(core.getDataRecovery()).toMatchObject({ reason: 'corrupt', quarantined: true });
    // No demo Journeys over a user who HAS data — they just cannot be read yet.
    expect(core.getSnapshot().journeys).toHaveLength(0);
    // The damaged bytes are still on the device, byte for byte.
    expect(quarantined(kvMap)).toEqual([damaged]);
  });

  it('THE REGRESSION: a state change does not overwrite the unreadable snapshot', async () => {
    const { kv, kvMap, secure, damaged } = await storeWithUnreadableData();
    const core = await startCore(kv, secure);

    // Exactly what used to destroy the data: the user does something, onChanged fires, and the
    // fresh empty state is written over the store.
    core.createJourney({
      title: 'Something new',
      why: ['because'],
      durationDays: 7,
      rhythm: 'daily',
      steps: [{ title: 'Step', isStarterStep: true, cadence: 'daily' }],
    });
    await core.flushSaves();

    // The original bytes are still there, unchanged…
    expect(quarantined(kvMap)).toEqual([damaged]);
    // …and nothing was written into the live slot on top of them.
    expect(kvMap.has(CIPHERTEXT_KEY)).toBe(false);
  });

  it('survives a relaunch: the second launch is still a recovery, not a first run', async () => {
    const { kv, kvMap, secure, damaged } = await storeWithUnreadableData();
    await startCore(kv, secure);

    const relaunched = await startCore(kv, secure);

    expect(relaunched.getDataRecovery()).toMatchObject({ reason: 'corrupt' });
    expect(relaunched.getSnapshot().journeys).toHaveLength(0);
    expect(quarantined(kvMap)).toEqual([damaged]);
  });

  it('a missing key is reported as key-lost, distinctly from a corrupt blob', async () => {
    const { kv } = fakeKv();
    const { secure, map: secureMap } = fakeSecure();
    const core = await startCore(kv, secure);
    core.createJourney({
      title: 'Written before the backup',
      why: ['because'],
      durationDays: 7,
      rhythm: 'daily',
      steps: [{ title: 'Step', isStarterStep: true, cadence: 'daily' }],
    });
    await core.flushSaves();

    // Restored onto a device whose keychain did not come with it.
    secureMap.delete(DEK_STORE_KEY);
    const relaunched = await startCore(kv, secure);

    expect(relaunched.getDataRecovery()?.reason).toBe('key-lost');
  });
});

describe('saves are serialised (D7)', () => {
  it('never runs two writes at once, and the last one holds the newest state', async () => {
    let inFlight = 0;
    let overlapped = false;
    const writes: string[] = [];
    const core = new AppCore(
      {
        async load() {
          return { kind: 'first-run' };
        },
        async save(state) {
          inFlight += 1;
          if (inFlight > 1) overlapped = true;
          // A real encrypt + AsyncStorage write is not instant; model that.
          await new Promise((resolve) => setTimeout(resolve, 0));
          writes.push(state.journeys.map((j) => j.title).join(','));
          inFlight -= 1;
        },
        async clear() {},
      },
      fakeFirstRunFlag(true), // no demo seed, so the writes below are the only ones
    );
    await core.start();

    // Three changes in one tick — the shape that used to fire three overlapping writes.
    for (const title of ['One', 'Two', 'Three']) {
      core.createJourney({
        title,
        why: ['because'],
        durationDays: 7,
        rhythm: 'daily',
        steps: [{ title: 'Step', isStarterStep: true, cadence: 'daily' }],
      });
    }
    await core.flushSaves();

    expect(overlapped).toBe(false);
    // Coalesced rather than repeated, and the store ends on the newest state.
    expect(writes.length).toBeLessThan(3);
    expect(writes[writes.length - 1]).toBe('One,Two,Three');
  });
});

describe('starting fresh is the way out, and it is deliberate', () => {
  it('clears the recovery state, drops the quarantine, and saves again', async () => {
    const { kv, kvMap, secure } = await storeWithUnreadableData();
    const core = await startCore(kv, secure);
    expect(core.getDataRecovery()).not.toBeNull();

    await core.startFreshAfterUnreadableData();

    expect(core.getDataRecovery()).toBeNull();
    expect(quarantined(kvMap)).toHaveLength(0);
    // Writes work again, and no demo Journeys come back (this user is not new).
    expect(core.getSnapshot().journeys).toHaveLength(0);
    core.createJourney({
      title: 'A fresh start',
      why: ['because'],
      durationDays: 7,
      rhythm: 'daily',
      steps: [{ title: 'Step', isStarterStep: true, cadence: 'daily' }],
    });
    await core.flushSaves();
    expect(kvMap.has(CIPHERTEXT_KEY)).toBe(true);
  });
});
