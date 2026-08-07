/**
 * PushApp palette — the Design System (04_Product/Design_System.md §2), encoded.
 *
 * TWO worlds now exist, sharing one set of token KEYS so every screen that reads
 * a token works in both:
 *  - `light` — a WARM LIGHT world: near-white base `#FAFAF8`, white cards, ink text.
 *  - `dark`  — a WARM DARK, TURQUOISE-LED world: a deep teal-ink base, lifted
 *    teal-tinted cards, near-white text, and the accents brightened so they read
 *    on dark. Turquoise (`tint`/`teal`) is the leading brand tone in both.
 *
 * Each accent encodes MEANING, not decoration. The `*Tint` role is a soft *wash*
 * (a fill behind chips/tracks/selected rows); the `*Strong` role is the deeper/
 * emphasised variant used for text or pressed states. In dark, tints become dark
 * washes and strongs become lighter so contrast survives the inversion.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * The MATURE light theme (2026-08-07 redesign). A warm near-grey ground, white
 * cards, near-black ink; ONE deep-turquoise accent for progress + action; amber
 * reserved for real urgency (streak / most-urgent). The legacy role accents
 * (coral/blue/purple/pink/gold) are KEPT as keys — screens still compiling on them
 * are being matured screen-by-screen — but retuned to muted, grown-up tones so
 * nothing reads candy. New screens use only teal + amber + neutrals.
 */
const light = {
  // ── Neutrals (surfaces & text) ────────────────────────────────────────────
  /** Screen base — warm near-grey, paper-like, not stark white. */
  background: '#F6F5F1',
  /** Cards / raised surfaces — clean white, separated by a hairline + soft shadow. */
  backgroundElement: '#FFFFFF',
  /** A calm tinted fill for selected / grouped chips and tracks. */
  backgroundSelected: '#EEEDE7',
  /** Hairline borders between surfaces. */
  hairline: '#E4E2DC',
  /** Primary text — near-black warm ink. */
  text: '#1B1D1B',
  /** Secondary / supporting text. */
  textSecondary: '#5B605B',
  /** Muted text (timestamps, disabled hints). */
  textMuted: '#8A8F89',

  // ── The one accent + amber (colour = meaning, used sparingly) ──────────────
  /** Deep turquoise — the single accent: progress AND primary action. */
  tint: '#0E6E74',
  teal: '#0E6E74',
  tealTint: '#E1EFEF',
  tealStrong: '#0A565B',
  /** Amber — urgency ONLY (streak flame, most-urgent). Mapped onto the `gold` role. */
  gold: '#AD7A2C',
  goldTint: '#F2EAD9',
  goldStrong: '#8A5E1C',
  /** Coral — legacy CTA accent, retuned to a muted terracotta. */
  coral: '#B4674F',
  coralTint: '#F0E6E1',
  coralStrong: '#8E4A34',
  /** Blue — legacy, retuned to a muted slate. */
  blue: '#3E6C99',
  blueTint: '#E7EDF3',
  blueStrong: '#2C4E70',
  /** Purple — legacy social accent, retuned muted. */
  purple: '#6E5FA6',
  purpleTint: '#ECEAF3',
  purpleStrong: '#4E447C',
  /** Pink — legacy, retuned to a muted rose. */
  pink: '#B05C79',
  pinkTint: '#F1E5EA',
  /** Cream — a warm neutral wash. */
  cream: '#F3EFE7',
  /** Legacy Buddy/Home scene (archived) — kept as calm neutrals. */
  sceneSky: '#E7ECEA',
  sceneGround: '#D8E0DA',

  // ── Status (gentle, no-shame) ─────────────────────────────────────────────
  success: '#2E7D6B',
  successTint: '#E2EFEB',
  danger: '#B4514A',
  dangerTint: '#F1E4E2',
} as const;

/**
 * The shape shared by both palettes: every `light` key mapped to a plain string.
 * `light` is `as const` (so each value is a *literal* type — needed for the
 * `ThemeColor` key union), which would otherwise force `dark` to reuse the exact
 * light hexes. Widening to `string` here lets `dark` supply its own values while
 * still guaranteeing it defines every key `light` does.
 */
export type Palette = { [K in keyof typeof light]: string };

/**
 * The MATURE dark theme (2026-08-07 redesign). Same keys as `light`; retuned for a
 * calm, technical dark surface: a near-black warm ground, softly-lifted cards, a
 * bright-but-controlled turquoise accent, amber for urgency only. Legacy accents
 * kept as keys, muted. Tints are dark washes; strongs are lighter tones.
 */
const dark: Palette = {
  // ── Neutrals (surfaces & text) ────────────────────────────────────────────
  // Lifted off pure-black (founder: dark mode read "too black / no colour"). A
  // charcoal ground with a faint cool cast; cards + nav lift clearly above it.
  /** Screen base — charcoal, not near-black. */
  background: '#181D1E',
  /** Cards / raised surfaces (and the nav bar) lift clearly above the base. */
  backgroundElement: '#222829',
  /** A calm tinted fill for selected / grouped chips and tracks. */
  backgroundSelected: '#2B3232',
  /** Hairline borders between surfaces. */
  hairline: '#353D3B',
  /** Primary text — warm near-white, never pure white. */
  text: '#ECEFEC',
  /** Secondary / supporting text. */
  textSecondary: '#A4ABA5',
  /** Muted text (timestamps, disabled hints). */
  textMuted: '#767D77',

  // ── The one accent + amber (colour = meaning, used sparingly) ──────────────
  /** Turquoise — the single accent: progress AND primary action. */
  tint: '#42C7C9',
  teal: '#42C7C9',
  tealTint: '#123230',
  tealStrong: '#7FE3E4',
  /** Amber — urgency ONLY (streak / most-urgent). Mapped onto the `gold` role. */
  gold: '#DBA660',
  goldTint: '#322810',
  goldStrong: '#EFC98A',
  /** Coral — legacy CTA accent, muted. */
  coral: '#D08A72',
  coralTint: '#33241E',
  coralStrong: '#E7B09B',
  /** Blue — legacy, muted slate. */
  blue: '#6E9BC4',
  blueTint: '#182634',
  blueStrong: '#A7C6E0',
  /** Purple — legacy social accent, muted. */
  purple: '#9A88C6',
  purpleTint: '#221E30',
  purpleStrong: '#C4B8E0',
  /** Pink — legacy, muted rose. */
  pink: '#CE8AA0',
  pinkTint: '#2E1F26',
  /** Cream — a warm neutral wash. */
  cream: '#221E17',
  /** Legacy Buddy/Home scene (archived) — calm dark neutrals. */
  sceneSky: '#16201E',
  sceneGround: '#1A2A26',

  // ── Status (gentle, no-shame) ─────────────────────────────────────────────
  success: '#46C7B0',
  successTint: '#123230',
  danger: '#DD8378',
  dangerTint: '#301E1B',
};

export const Colors = {
  light,
  dark,
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
 * Brand fonts (2026-08-07 mature redesign): **Inter only** — one refined sans
 * carries both display and body, differentiated by weight and letter-spacing, not
 * by a separate rounded face. The rounded **Baloo 2** display was dropped as too
 * playful for the mature direction. The `heading*` KEYS are kept (so every screen
 * still compiles) but now resolve to Inter weights; the Baloo assets stay loaded
 * only as a fallback for any stray hard-coded reference during the migration.
 */
export const FontFamily = {
  // Headings / display — now Inter (was Baloo 2).
  headingBold: 'Inter_700Bold',
  headingSemiBold: 'Inter_600SemiBold',
  headingMedium: 'Inter_500Medium',
  // Inter — body / dense UI.
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

/**
 * The font families to load at boot (name → asset). Passed straight to
 * `useFonts` in the root layout; kept here so the token and the loader can never
 * drift apart. Inter now covers headings too (700 added); Baloo kept as fallback.
 */
export const FontAssets = {
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  Baloo2_500Medium: require('@expo-google-fonts/baloo-2/500Medium/Baloo2_500Medium.ttf'),
  Baloo2_600SemiBold: require('@expo-google-fonts/baloo-2/600SemiBold/Baloo2_600SemiBold.ttf'),
  Baloo2_700Bold: require('@expo-google-fonts/baloo-2/700Bold/Baloo2_700Bold.ttf'),
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

// Clearance a screen must leave at the bottom so pinned content isn't hidden by the
// tab bar. On WEB the tab bar is an absolute overlay (~58px + hairline), so content
// needs real clearance there — without a `web` value this was 0 and pinned bars (the
// Coach input bar) rendered *behind* the nav. iOS/Android keep their existing values.
export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 64 }) ?? 0;
export const MaxContentWidth = 800;
