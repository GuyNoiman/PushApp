/**
 * Web colour scheme. The app ships BOTH warm-light and warm-dark (turquoise-led)
 * palettes (theme.ts), so on web the 'system' preference follows the browser's
 * `prefers-color-scheme`.
 *
 * react-native-web hydrates on the server as `light`; to avoid a hydration
 * mismatch we only start reporting the real scheme after the component has
 * mounted, then live-update via a `matchMedia` listener.
 *
 * The user can override this from Settings › Appearance (ThemePreference): a
 * 'light' / 'dark' choice pins the app to that scheme, while 'system' keeps the
 * browser-follows behaviour (and its hydration guard) below.
 */
import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useThemePreference } from '@/state/ThemePreference';

export function useColorScheme(): 'light' | 'dark' {
  const { preference } = useThemePreference();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Hooks must run every render, so read the browser scheme unconditionally, then
  // let an explicit override win.
  const systemScheme = useRNColorScheme() ?? 'light';
  if (preference !== 'system') {
    return preference;
  }
  return hydrated ? systemScheme : 'light';
}
