/**
 * notificationReads — which notifications this person has already seen.
 *
 * ON DEVICE, ON PURPOSE. The alternative is a `notification_reads` table, one row per user per
 * event, written every time a bell is opened — a table whose only job is to remember that somebody
 * looked at something. At POC scale that buys nothing except a write path and more data about the
 * user held on a server (data minimisation, Bible §8). The cost is honest and small: read marks do
 * not follow a person to a second device. When multi-device lands, this module is the one file that
 * changes.
 *
 * Failures degrade to "nothing has been read": a storage hiccup may re-show a cheer, and must never
 * hide one or crash the bell.
 *
 * Injectable like every other persistence seam, so engines and tests stay off-device.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStore } from '../persistence/keyValueStore';

/** Single source of truth for the persisted key. */
export const NOTIFICATION_READS_KEY = 'pushapp.notificationReads.v1';

export interface NotificationReadStore {
  /** The ids already seen. Empty on a first run or after any read failure. */
  load(): Promise<Set<string>>;
  /** Replace the stored set. Callers pass the PRUNED set, never an ever-growing one. */
  save(ids: ReadonlySet<string>): Promise<void>;
  /** Forget everything — used by account deletion / reset to first run. */
  clear(): Promise<void>;
}

/** Build a store over any key-value seam. `AsyncStorage` in the app, a map in tests. */
export function makeNotificationReadStore(store: KeyValueStore): NotificationReadStore {
  return {
    async load() {
      try {
        const raw = await store.getItem(NOTIFICATION_READS_KEY);
        if (!raw) return new Set<string>();
        const parsed: unknown = JSON.parse(raw);
        // A corrupted blob is treated as empty rather than thrown: the worst case is a cheer shown
        // twice, and the best case of throwing is a screen that will not open.
        return Array.isArray(parsed)
          ? new Set(parsed.filter((v): v is string => typeof v === 'string'))
          : new Set<string>();
      } catch {
        return new Set<string>();
      }
    },
    async save(ids) {
      try {
        await store.setItem(NOTIFICATION_READS_KEY, JSON.stringify([...ids]));
      } catch {
        // Ignored on purpose: an unsaved read mark re-shows a notification, which is recoverable.
      }
    },
    async clear() {
      try {
        await store.removeItem(NOTIFICATION_READS_KEY);
      } catch {
        // Same reasoning.
      }
    },
  };
}

/** The app's default store, over AsyncStorage. */
export const notificationReadStore: NotificationReadStore =
  makeNotificationReadStore(AsyncStorage);
