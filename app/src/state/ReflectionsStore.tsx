/**
 * ReflectionsStore — everything a person has written to themselves, and what is due back.
 *
 * PRIVACY (G1), and this is the sharpest case in the app: a letter to your own future self is the
 * most personal thing this product will ever hold. AsyncStorage, on the device, and nowhere else.
 * Never synced, never logged, never a DomainEvent, and never sent to a model unless the person asks
 * in the moment having been told that is what happens.
 *
 * THE RETURN IS IN-APP, not an OS notification, and that is the founder's own framing ("a reminder in
 * the app"). It is also the right first version for a different reason: a letter is something you sit
 * down with. A lock-screen banner a year later, tapped between two other things, is the worst
 * possible way to meet the person who wrote it. When an OS notification is added it should carry no
 * content at all — the letter belongs on the other side of opening the app.
 *
 * State only (Bible §19): the exercises and the delivery arithmetic are in
 * {@link ../core/tools/reflections/model}.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { dueNow, type Reflection, type ReflectionArchive } from '@/core/tools/reflections/model';

export const REFLECTIONS_KEY = 'pushapp.reflections';

interface ReflectionsValue {
  ready: boolean;
  /** Everything written, newest first. */
  archive: ReflectionArchive;
  /** Anything due to be read back right now — a checkpoint, or the letter itself. */
  due: Reflection[];
  add: (reflection: Reflection) => void;
  /** Mark one as read back, so it never returns again. */
  markRead: (id: string, at: number) => void;
  remove: (id: string) => void;
}

const EMPTY: ReflectionsValue = {
  ready: true,
  archive: [],
  due: [],
  add: () => {},
  markRead: () => {},
  remove: () => {},
};

const ReflectionsContext = createContext<ReflectionsValue>(EMPTY);

/** Accept only entries that still have the shape of a reflection; drop anything else silently. */
function parse(raw: string | null): Reflection[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is Reflection =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as Reflection).id === 'string' &&
        typeof (r as Reflection).writtenAt === 'number' &&
        typeof (r as Reflection).sections === 'object',
    );
  } catch {
    return [];
  }
}

export function ReflectionsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [archive, setArchive] = useState<Reflection[]>([]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(REFLECTIONS_KEY);
        if (mounted) setArchive(parse(raw));
      } catch {
        // An unreadable archive reads as empty rather than crashing. Nothing is deleted by this.
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback((next: Reflection[]) => {
    setArchive(next);
    void AsyncStorage.setItem(REFLECTIONS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const add = useCallback(
    (reflection: Reflection) => persist([reflection, ...archive]),
    [archive, persist],
  );

  const markRead = useCallback(
    (id: string, at: number) =>
      persist(archive.map((r) => (r.id === id ? { ...r, readBackAt: at } : r))),
    [archive, persist],
  );

  const remove = useCallback(
    (id: string) => persist(archive.filter((r) => r.id !== id)),
    [archive, persist],
  );

  // Read once per render pass so everything on screen agrees about what "now" is.
  const due = useMemo(() => dueNow(archive, Date.now()), [archive]);

  const value = useMemo(
    () => ({ ready, archive, due, add, markRead, remove }),
    [ready, archive, due, add, markRead, remove],
  );
  return <ReflectionsContext.Provider value={value}>{children}</ReflectionsContext.Provider>;
}

export function useReflections(): ReflectionsValue {
  return useContext(ReflectionsContext);
}
