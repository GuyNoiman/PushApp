/**
 * The active colour scheme. The app ships BOTH a warm-light and a warm-dark
 * (turquoise-led) palette (Design System §2, theme.ts). `app.json` sets
 * `userInterfaceStyle: "automatic"`, so by default we follow the device: dark
 * device → dark app, light device → light app. `react-native` can briefly report
 * `null` before the scheme resolves; we default to `light` so a screen never
 * flashes untyped.
 *
 * The user can override this from Settings › Appearance (ThemePreference): a
 * 'light' / 'dark' choice pins the app to that scheme, while 'system' keeps the
 * device-follows behaviour below.
 */
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useThemePreference } from '@/state/ThemePreference';

export function useColorScheme(): 'light' | 'dark' {
  const { preference } = useThemePreference();
  const systemScheme = useRNColorScheme() ?? 'light';
  return preference === 'system' ? systemScheme : preference;
}
