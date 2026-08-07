/**
 * Web colour scheme. The app ships BOTH warm-light and warm-dark (turquoise-led)
 * palettes (theme.ts), so on web we follow the browser's `prefers-color-scheme`.
 *
 * react-native-web hydrates on the server as `light`; to avoid a hydration
 * mismatch we only start reporting the real scheme after the component has
 * mounted, then live-update via a `matchMedia` listener.
 */
import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const scheme = useRNColorScheme() ?? 'light';
  return hydrated ? scheme : 'light';
}
