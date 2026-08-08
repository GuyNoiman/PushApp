/**
 * ThemePreference — the user's explicit Light / Dark / System override.
 *
 * By default the app follows the device scheme (`userInterfaceStyle: "automatic"`,
 * use-color-scheme.ts). Founder feedback: let people force Light or Dark from
 * Settings › Appearance. This provider owns that single choice, persists it with
 * AsyncStorage (the same on-device store LocalRepository uses) under
 * `pushapp.themePreference`, and the colour-scheme hooks resolve through it:
 * `preference === 'system'` keeps the OS-follows behaviour, otherwise the app is
 * pinned to the chosen scheme.
 *
 * State-only (Bible §19): screens read `preference` / call `setPreference`; the
 * scheme resolution itself lives in use-color-scheme.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Single source of truth for the persisted key — no magic-string duplication. */
export const THEME_PREFERENCE_KEY = 'pushapp.themePreference';

const VALID: readonly ThemePreference[] = ['system', 'light', 'dark'];

interface ThemePreferenceValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue>({
  preference: 'system',
  setPreference: () => {},
});

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  // Default to 'system' until the stored choice loads — the app follows the device
  // for that first frame rather than flashing a forced scheme.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (mounted && raw && (VALID as readonly string[]).includes(raw)) {
          setPreferenceState(raw as ThemePreference);
        }
      } catch {
        // A read failure just leaves us on 'system' — never crash over a setting.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Apply immediately (the whole app re-themes this frame), then write async.
  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(THEME_PREFERENCE_KEY, next).catch(() => {
      // A write failure only means the choice won't survive a reload — don't crash.
    });
  }, []);

  return (
    <ThemePreferenceContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceValue {
  return useContext(ThemePreferenceContext);
}
