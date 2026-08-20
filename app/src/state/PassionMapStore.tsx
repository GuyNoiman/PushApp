/**
 * PassionMapStore — a Passion Map between screens, and between sittings.
 *
 * EVERY SCREEN AUTOSAVES (PRD §6). Six prompts is more than one sitting for some people, and the PRD
 * is explicit that opening an unfinished run resumes where it stopped.
 *
 * ONE THING THIS DOES NOT DO, and it is a rule rather than an omission: **a run in progress never
 * replaces the confirmed map.** Somebody who starts over and abandons it must still have the map
 * they had. So the confirmed map and the draft are two separate stored values, and the draft only
 * becomes the map at Save my map.
 *
 * PRIVACY (G1): Sparks, Why notes and daily moments are on-device only. Never synced, never logged.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { startMap, type PassionMapState } from '@/core/tools/passionMap/model';

export const PASSION_MAP_KEY = 'pushapp.passionMap.confirmed';
export const PASSION_DRAFT_KEY = 'pushapp.passionMap.draft';

interface PassionMapValue {
  ready: boolean;
  /** The map as it stands. Null until somebody has confirmed one. */
  map: PassionMapState | null;
  /** A run in progress. Null when there is none. */
  draft: PassionMapState | null;
  saveDraft: (next: PassionMapState) => void;
  /** Promote the draft to the confirmed map. The only path from one to the other. */
  confirm: (next: PassionMapState) => void;
  discardDraft: () => void;
  /** Daily signals live on the CONFIRMED map — they are evidence about it, not part of a run. */
  updateMap: (next: PassionMapState) => void;
}

const EMPTY: PassionMapValue = {
  ready: true,
  map: null,
  draft: null,
  saveDraft: () => {},
  confirm: () => {},
  discardDraft: () => {},
  updateMap: () => {},
};

const PassionMapContext = createContext<PassionMapValue>(EMPTY);

/** Accept only something still shaped like a run; anything else reads as nothing. */
function parse(raw: string | null): PassionMapState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<PassionMapState>;
    if (!Array.isArray(v.sparks) || !Array.isArray(v.themes) || !Array.isArray(v.signals)) return null;
    return { ...startMap(), ...v } as PassionMapState;
  } catch {
    return null;
  }
}

export function PassionMapProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [map, setMap] = useState<PassionMapState | null>(null);
  const [draft, setDraft] = useState<PassionMapState | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [m, d] = await AsyncStorage.multiGet([PASSION_MAP_KEY, PASSION_DRAFT_KEY]);
        if (!mounted) return;
        setMap(parse(m[1]));
        setDraft(parse(d[1]));
      } catch {
        // Unreadable reads as nothing. A confirmed map is never deleted by a failure to load it.
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const saveDraft = useCallback((next: PassionMapState) => {
    setDraft(next);
    void AsyncStorage.setItem(PASSION_DRAFT_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const updateMap = useCallback((next: PassionMapState) => {
    setMap(next);
    void AsyncStorage.setItem(PASSION_MAP_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const discardDraft = useCallback(() => {
    setDraft(null);
    void AsyncStorage.removeItem(PASSION_DRAFT_KEY).catch(() => {});
  }, []);

  const confirm = useCallback(
    (next: PassionMapState) => {
      // The draft becomes the map, and stops being a draft. Both writes, or the next launch sees
      // a finished run offering to be resumed.
      updateMap({ ...next, confirmed: true });
      discardDraft();
    },
    [updateMap, discardDraft],
  );

  const value = useMemo(
    () => ({ ready, map, draft, saveDraft, confirm, discardDraft, updateMap }),
    [ready, map, draft, saveDraft, confirm, discardDraft, updateMap],
  );
  return <PassionMapContext.Provider value={value}>{children}</PassionMapContext.Provider>;
}

export function usePassionMap(): PassionMapValue {
  return useContext(PassionMapContext);
}
