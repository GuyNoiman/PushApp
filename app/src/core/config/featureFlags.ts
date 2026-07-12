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
  /**
   * Auth pillar: session ownership + (later) real sign-in. Gated on the SAME
   * Supabase env as social — auth is the prerequisite that mints the anonymous
   * session social builds on (E3, Auth_Backend_Proposal §2). Off ⇒ no backend,
   * fully anonymous no-op, local pillars untouched.
   */
  auth: Boolean(url && key),
  /**
   * Entitlement pillar: READS the signed-in user's account tier (free / trial /
   * subscriber) from the server. Gated on the SAME Supabase env — it depends on
   * the auth session. Off ⇒ no server read; the effective tier is the offline-
   * first `free` default (a local dev trial still works, persisted on-device).
   * NOTE: this only reads; a `subscriber` tier is written server-side only.
   */
  entitlements: Boolean(url && key),
  /**
   * RESERVED (deferred, POC scope). Adaptive-profile domain — a derived, PII-free
   * picture of how a user tends to act, for a future personalization layer. Off:
   * the seam exists (ProfileGateway) but no logic runs. Must pass security-privacy
   * review before it is ever turned on.
   */
  profile: false,
  /**
   * RESERVED (deferred, POC scope). Interests/discovery domain — coarse, user-
   * chosen topic tags for future recommendations. Off: the seam exists
   * (InterestsGateway) but no logic runs. Must pass security-privacy review first.
   */
  interests: false,
  /**
   * RESERVED (deferred, POC scope). Intervention domain — a future engine that
   * reacts to domain events (e.g. StepMissed) to decide when/how to nudge. Off:
   * the ReminderEngine holds a reserved bus but subscribes to nothing.
   */
  intervention: false,
} as const;

export type FeatureFlags = typeof featureFlags;
