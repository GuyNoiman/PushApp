/**
 * Monogram-avatar helpers shared by every people surface (Circle, Inbox, Friend Profile).
 * Extracted from `(tabs)/friends.tsx` so a person reads IDENTICALLY across screens — the same
 * initials and the same stable tint, wherever they appear.
 *
 * There is no profile photo anywhere in the app yet (`public.profiles` has no photo column and
 * the user's own photo is Phase 2 in ProfileProvider), so a monogram is the ONLY avatar we can
 * render — which is exactly what Friend_Profile_PRD §5 asks for when no photo exists.
 *
 * Presentational helpers only: colours in, colours out (Engineering Bible §19).
 */
import type { useTheme } from '@/hooks/use-theme';

export type ThemeColors = ReturnType<typeof useTheme>;

/** One avatar tint pair: the circle fill and the ink that reads on it. */
export interface AvatarTint {
  bg: string;
  ink: string;
}

/**
 * A small warm palette for the monogram avatars, cycled by id so every person gets a stable,
 * distinct tint (Design System §2 role accents). Built from the ACTIVE theme so the tints adapt
 * in dark mode.
 */
export function avatarTints(c: ThemeColors): AvatarTint[] {
  return [
    { bg: c.coralTint, ink: c.coralStrong },
    { bg: c.goldTint, ink: c.goldStrong },
    { bg: c.purpleTint, ink: c.purpleStrong },
    { bg: c.tealTint, ink: c.tealStrong },
    { bg: c.blueTint, ink: c.blueStrong },
    { bg: c.pinkTint, ink: c.pink },
  ];
}

/** The stable tint for a person, hashed from a seed (use their profile id — never their name). */
export function tintFor(c: ThemeColors, seed: string): AvatarTint {
  const tints = avatarTints(c);
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return tints[Math.abs(hash) % tints.length];
}

/** 1–2 letter monogram from a display name (skips a leading @). */
export function initialsFor(name: string): string {
  const clean = name.replace(/^@/, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

/** A person's display name: their Buddy name if they set one, else their @handle. */
export function displayName(profile: { handle: string; buddySummary?: { name?: string } }): string {
  return profile.buddySummary?.name?.trim() || `@${profile.handle}`;
}
