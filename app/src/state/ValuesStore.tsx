/**
 * ValuesStore — where a Values Clarification lives while it is being done, and afterwards.
 *
 * SAVED AT EVERY CARD. Sixty-five cards is not one sitting, and a sort that loses itself when the
 * phone rings is a sort nobody finishes. The seed is stored with the answers, so coming back means
 * meeting the same deck in the same order rather than a shuffled one.
 *
 * PRIVACY (G1): on-device only. What somebody's five values are, and how far they feel from living
 * them, is not ours. Never synced, never logged, never a DomainEvent.
 *
 * State only (Bible §19): the ladder and the reading live in {@link ../core/tools/values/flow}.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { ValuesState } from '@/core/tools/values/flow';

export const VALUES_STATE_KEY = 'pushapp.values.state';

interface ValuesStoreValue {
  /** False until storage has been read, so a screen never opens on an empty run that is not empty. */
  ready: boolean;
  /** The run in progress or last finished, or null when there has never been one. */
  state: ValuesState | null;
  save: (next: ValuesState) => void;
  clear: () => void;
}

const EMPTY: ValuesStoreValue = { ready: true, state: null, save: () => {}, clear: () => {} };

const ValuesContext = createContext<ValuesStoreValue>(EMPTY);

/**
 * Read a stored run, accepting only something that still has the SHAPE of one.
 *
 * Deliberately shallow: the flow's own functions already ignore keys that are not candidates and
 * clamp scores into range, so a partially odd state degrades into a sensible one rather than needing
 * to be thrown away. What is checked here is only what would crash a screen.
 */
function parse(raw: string | null): ValuesState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ValuesState>;
    if (
      (v?.depth !== 'quick' && v?.depth !== 'deep') ||
      typeof v.seed !== 'number' ||
      typeof v.buckets !== 'object' ||
      !Array.isArray(v.reductions) ||
      !Array.isArray(v.ranked) ||
      typeof v.presence !== 'object'
    ) {
      return null;
    }
    return v as ValuesState;
  } catch {
    return null;
  }
}

export function ValuesProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<ValuesState | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(VALUES_STATE_KEY);
        if (mounted) setState(parse(raw));
      } catch {
        // An unreadable run is no run. Nothing here is precious enough to crash over.
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const save = useCallback((next: ValuesState) => {
    setState(next);
    void AsyncStorage.setItem(VALUES_STATE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const clear = useCallback(() => {
    setState(null);
    void AsyncStorage.removeItem(VALUES_STATE_KEY).catch(() => {});
  }, []);

  const value = useMemo(() => ({ ready, state, save, clear }), [ready, state, save, clear]);
  return <ValuesContext.Provider value={value}>{children}</ValuesContext.Provider>;
}

export function useValues(): ValuesStoreValue {
  return useContext(ValuesContext);
}
