/**
 * The active theme's colour tokens. The design is warm-light only (Design System
 * §2), so this always returns the light palette. When a dark design exists, branch
 * on `useColorScheme()` here.
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme];
}
