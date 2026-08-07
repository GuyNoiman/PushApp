/**
 * The active colour scheme. The app now ships BOTH a warm-light and a warm-dark
 * (turquoise-led) palette (Design System §2, theme.ts), and `app.json` sets
 * `userInterfaceStyle: "automatic"`, so we follow the device: dark device → dark
 * app, light device → light app. `react-native` can briefly report `null` before
 * the scheme resolves; we default to `light` so a screen never flashes untyped.
 */
import { useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  return useRNColorScheme() ?? 'light';
}
