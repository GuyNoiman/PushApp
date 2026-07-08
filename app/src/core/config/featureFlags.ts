/**
 * Feature flags (Engineering Bible §14). Config-before-code: a pillar can be
 * turned off with zero effect on the rest of the app (graceful degradation §5).
 *
 * The social / Allies pillar is ON only when the Supabase env is present, so the
 * four local pillars (Journey, Buddy, Coins, Missions) always work at $0 — even
 * with no backend configured, offline, or if the Free-tier project is paused.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const featureFlags = {
  /** Social/Allies pillar: requires a configured Supabase project (E2). */
  social: Boolean(url && key),
} as const;

export type FeatureFlags = typeof featureFlags;
