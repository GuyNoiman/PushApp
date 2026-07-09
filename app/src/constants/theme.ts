/**
 * PushApp palette — the Design System (04_Product/Design_System.md §2), encoded.
 *
 * The design is a WARM LIGHT world: a near-white base `#FAFAF8` with white cards,
 * ink text, and a small, role-mapped accent palette (each colour encodes meaning,
 * not decoration). There is no dark design yet, so both `light` and `dark` map to
 * the same warm-light tokens for now — dark mode is future work. The base token
 * KEYS (`text`, `background`, `backgroundElement`, `backgroundSelected`,
 * `textSecondary`, `tint`) are kept so existing screens keep compiling; the
 * meaningful accent roles (coral/teal/blue/purple/gold/pink) are added on top.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** The single warm-light theme. Neutrals + role-mapped accents (each = a meaning). */
const light = {
  // ── Neutrals (surfaces & text) ────────────────────────────────────────────
  /** Screen base — warm near-white, not stark white (§2). */
  background: '#FAFAF8',
  /** Cards / raised surfaces sit lighter/whiter than the base. */
  backgroundElement: '#FFFFFF',
  /** A calm tinted fill for selected / grouped chips and tracks. */
  backgroundSelected: '#F1F0EC',
  /** Hairline borders between surfaces. */
  hairline: '#E7E6E1',
  /** Primary text — warm ink, never pure black. */
  text: '#2E2E2C',
  /** Secondary / supporting text. */
  textSecondary: '#6B6B66',
  /** Muted text (timestamps, disabled hints). */
  textMuted: '#9A9A93',

  // ── Role-mapped accents (§2 — colour encodes meaning) ─────────────────────
  /** Brand + navigation + Journey/Step growth-progress. Also the default `tint`. */
  tint: '#17A2A6',
  teal: '#17A2A6',
  tealTint: '#DCEFF1',
  tealStrong: '#1F7C86',
  /** Coral — primary / CTAs / energy. Labelled in dark ink (white is unreadable). */
  coral: '#F2765E',
  coralTint: '#FBEAE4',
  coralStrong: '#D85A30',
  /** Blue — XP / Buddy level (game XP, distinct from teal "real growth"). */
  blue: '#4A80E0',
  blueTint: '#E6F1FB',
  blueStrong: '#185FA5',
  /** Purple — social / friends / Cheer. */
  purple: '#8B6FD6',
  purpleTint: '#EEEDFE',
  purpleStrong: '#534AB7',
  /** Gold — coins / rewards / trophies. */
  gold: '#E7A22E',
  goldTint: '#FCEFC9',
  goldStrong: '#C98A0E',
  /** Pink — consistency / streak. */
  pink: '#EC6F9C',
  pinkTint: '#FBE4EE',
  /** Cream — a warm reward wash (panels behind reward content). */
  cream: '#FBF3E9',

  // ── Status (gentle, no-shame) ─────────────────────────────────────────────
  success: '#17A2A6',
  successTint: '#E4F3EC',
  danger: '#E86A5A',
  dangerTint: '#FBE8E4',
} as const;

export const Colors = {
  // Only a warm light theme exists (Design System defines no dark). Both map to
  // it so a stray dark-mode read never produces an off-brand black screen.
  light,
  dark: light,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Rounded, chunky corners (Design System §5). */
export const Radius = {
  card: 16,
  button: 14,
  input: 12,
  iconButton: 10,
  chip: 8,
  pill: 999,
} as const;

/**
 * Real brand fonts (Design System §3, locked 2026-07-06):
 * **Baloo 2** for display / headings / Buddy / celebrations (friendly, rounded),
 * **Inter** for body / dense UI (clean, legible). These are the exact family
 * names `@expo-google-fonts/*` registers via `useFonts` in `_layout.tsx`; once
 * loaded they resolve by name on every platform (native + web), so we reference
 * them directly rather than routing through the old CSS-variable stacks.
 */
export const FontFamily = {
  // Baloo 2 — headings / display / Buddy.
  headingBold: 'Baloo2_700Bold',
  headingSemiBold: 'Baloo2_600SemiBold',
  headingMedium: 'Baloo2_500Medium',
  // Inter — body / dense UI.
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

/**
 * The font families to load at boot (name → asset). Passed straight to
 * `useFonts` in the root layout; kept here so the token and the loader can never
 * drift apart.
 */
export const FontAssets = {
  Baloo2_500Medium: require('@expo-google-fonts/baloo-2/500Medium/Baloo2_500Medium.ttf'),
  Baloo2_600SemiBold: require('@expo-google-fonts/baloo-2/600SemiBold/Baloo2_600SemiBold.ttf'),
  Baloo2_700Bold: require('@expo-google-fonts/baloo-2/700Bold/Baloo2_700Bold.ttf'),
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
} as const;

export const Fonts = Platform.select({
  ios: {
    /** Body sans — Inter. */
    sans: FontFamily.bodyRegular,
    /** iOS `UIFontDescriptorSystemDesignSerif` (unused; kept for compat). */
    serif: 'ui-serif',
    /** Display / headings — Baloo 2 (rounded, warm). */
    rounded: FontFamily.headingBold,
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: FontFamily.bodyRegular,
    serif: 'serif',
    rounded: FontFamily.headingBold,
    mono: 'monospace',
  },
  web: {
    sans: FontFamily.bodyRegular,
    serif: 'var(--font-serif)',
    rounded: FontFamily.headingBold,
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
