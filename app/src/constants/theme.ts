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

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
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
