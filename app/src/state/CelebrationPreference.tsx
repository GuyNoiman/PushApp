/**
 * CelebrationPreference — the user's on/off choice for SMALL Step celebrations
 * (Completion Celebration PRD §2.1 / §7). The big Journey-completion ceremony is
 * NOT governed by this flag and can never be disabled.
 *
 * Enabled by default; persisted with AsyncStorage (the same on-device store
 * LocalRepository uses) under `pushapp.celebrationsEnabled`. Mirrors the shape of
 * ThemePreference: an in-memory default → an async load on mount → an optimistic
 * setter that writes fire-and-forget.
 *
 * State-only (Bible §19): screens read `celebrationsEnabled` / call
 * `setCelebrationsEnabled`; the celebration effect itself lives in the Confetti
 * component and the Home fire path.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/** Single source of truth for the persisted key — no magic-string duplication. */
export const CELEBRATIONS_ENABLED_KEY = 'pushapp.celebrationsEnabled';

interface CelebrationPreferenceValue {
  celebrationsEnabled: boolean;
  setCelebrationsEnabled: (enabled: boolean) => void;
}

const CelebrationPreferenceContext = createContext<CelebrationPreferenceValue>({
  celebrationsEnabled: true,
  setCelebrationsEnabled: () => {},
});

export function CelebrationPreferenceProvider({ children }: { children: ReactNode }) {
  // Default to enabled until the stored choice loads — celebrations are on for a
  // fresh install and stay on across the first frame rather than flickering off.
  const [celebrationsEnabled, setEnabledState] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(CELEBRATIONS_ENABLED_KEY);
        // Only an explicit 'false' turns them off; anything else keeps the default on.
        if (mounted && raw === 'false') {
          setEnabledState(false);
        }
      } catch {
        // A read failure just leaves celebrations on — never crash over a setting.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Apply immediately (Home reads it this frame), then write async.
  const setCelebrationsEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    void AsyncStorage.setItem(CELEBRATIONS_ENABLED_KEY, next ? 'true' : 'false').catch(() => {
      // A write failure only means the choice won't survive a reload — don't crash.
    });
  }, []);

  return (
    <CelebrationPreferenceContext.Provider value={{ celebrationsEnabled, setCelebrationsEnabled }}>
      {children}
    </CelebrationPreferenceContext.Provider>
  );
}

export function useCelebrationPreference(): CelebrationPreferenceValue {
  return useContext(CelebrationPreferenceContext);
}
