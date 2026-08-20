/**
 * ToolsShelf — the React binding for what a person has used and kept in the Tools tab.
 *
 * PRIVACY (G1). Which tools somebody opens is a picture of what they are struggling with — "for a
 * hard day", three times this week, says something no analytics event should ever carry. It lives in
 * AsyncStorage on the device and nowhere else: never synced, never logged, never turned into a
 * DomainEvent. If this ever needs to leave the phone, that is a security-privacy review, not a patch.
 *
 * Mirrors the shape the other preferences use (ThemePreference / CelebrationPreference): an in-memory
 * default → an async load on mount → optimistic setters that write fire-and-forget, so the screen
 * never waits on storage and a failed write costs a memory, not a crash.
 *
 * State only (Bible §19): the arithmetic lives in {@link ../core/tools/shelf}.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { recordUse, toggleSaved as toggle, type ToolUsage } from '@/core/tools/shelf';

/** One key each, so a corrupt value in one never takes the other down with it. */
export const TOOLS_USAGE_KEY = 'pushapp.toolsUsage';
export const TOOLS_SAVED_KEY = 'pushapp.toolsSaved';

interface ToolsShelfValue {
  usage: ToolUsage;
  saved: readonly string[];
  /** Record that a tool was opened. Called at the moment of navigation, not on the tool's own screen. */
  markUsed: (key: string) => void;
  isSaved: (key: string) => boolean;
  toggleSaved: (key: string) => void;
}

const EMPTY: ToolsShelfValue = {
  usage: {},
  saved: [],
  markUsed: () => {},
  isSaved: () => false,
  toggleSaved: () => {},
};

const ToolsShelfContext = createContext<ToolsShelfValue>(EMPTY);

/** Parse a stored JSON blob, returning the fallback for anything unreadable. Never throws. */
function parse<T>(raw: string | null, guard: (v: unknown) => v is T, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const isUsage = (v: unknown): v is ToolUsage =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isKeyList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

export function ToolsShelfProvider({ children }: { children: ReactNode }) {
  const [usage, setUsage] = useState<ToolUsage>({});
  const [saved, setSaved] = useState<readonly string[]>([]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [rawUsage, rawSaved] = await AsyncStorage.multiGet([
          TOOLS_USAGE_KEY,
          TOOLS_SAVED_KEY,
        ]);
        if (!mounted) return;
        setUsage(parse(rawUsage[1], isUsage, {}));
        setSaved(parse(rawSaved[1], isKeyList, []));
      } catch {
        // An unreadable shelf is an empty shelf. The tab still works; nothing here is precious.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const markUsed = useCallback((key: string) => {
    setUsage((prev) => {
      const next = recordUse(prev, key, Date.now());
      void AsyncStorage.setItem(TOOLS_USAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleSaved = useCallback((key: string) => {
    setSaved((prev) => {
      const next = toggle(prev, key);
      void AsyncStorage.setItem(TOOLS_SAVED_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const isSaved = useCallback((key: string) => saved.includes(key), [saved]);

  return (
    <ToolsShelfContext.Provider value={{ usage, saved, markUsed, isSaved, toggleSaved }}>
      {children}
    </ToolsShelfContext.Provider>
  );
}

export function useToolsShelf(): ToolsShelfValue {
  return useContext(ToolsShelfContext);
}
