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
  /**
   * RESERVED (deferred, POC scope). Location-triggered reminders — a future
   * arrive/leave-a-place nudge. Off: the seam exists (LocationGateway) but no
   * logic runs and no OS location permission is requested. Location data is
   * ON-DEVICE ONLY (red-line R2); must pass security-privacy + store review
   * before enabling.
   */
  location: false,
  /**
   * RESERVED (deferred, POC scope). Calendar-triggered reminders — a future
   * "before your event" nudge. Off: the seam exists (CalendarGateway) but no
   * logic runs and no OS calendar permission is requested. Calendar data is
   * ON-DEVICE ONLY (red-line R2); must pass security-privacy + store review
   * before enabling.
   */
  calendar: false,
  /**
   * RESERVED (deferred, POC scope). Adaptive-coach pivot — the "learn the user"
   * BehaviorModelEngine plus the deterministic Planner/AdaptivePlanner. Off: AppCore
   * constructs none of it, persists no behaviour log, and generateJourney is inert —
   * production behaviour is unchanged. The raw behaviour log is ON-DEVICE ONLY (G1);
   * must pass security-privacy review before it is ever turned on.
   */
  adaptiveCoach: false,
  /**
   * DEV-ONLY sibling of {@link adaptiveCoach}, for the founder to exercise the adaptive
   * report→replan loop on-device WITHOUT flipping the reviewed production `adaptiveCoach`
   * flag. On only when `EXPO_PUBLIC_ADAPTIVE_COACH` is present — which lives solely in the
   * founder's git-ignored `.env.local` and is never committed, so it does NOT ship to real
   * users and CI/other builds keep the pivot fully dormant. AppCore treats it exactly like
   * `adaptiveCoach` (they OR together into one `adaptiveEnabled`); the on-device behaviour
   * log stays ON-DEVICE ONLY (G1). Literal `Boolean(process.env.EXPO_PUBLIC_ADAPTIVE_COACH)`
   * so Metro statically inlines it at build time.
   */
  adaptiveCoachDev: Boolean(process.env.EXPO_PUBLIC_ADAPTIVE_COACH),
  /**
   * LIVE conversational coach — routes the Coach tab through the REAL {@link CoachOrchestrator}
   * over live Gemini (behind the LlmClient seam) instead of the scripted UI prototype. OPT-IN and
   * FOUNDER-DEVICE-ONLY: on only when `EXPO_PUBLIC_GEMINI_API_KEY` is present, which lives solely in
   * the founder's git-ignored `.env.local` and is never committed — so every other build (and CI)
   * keeps the free, offline scripted prototype with zero behaviour change. Outbound text is redacted
   * ({@link ../llm/RedactingLlmClient}) before it crosses the cloud boundary (G1).
   */
  liveCoach: Boolean(process.env.EXPO_PUBLIC_GEMINI_API_KEY),
  /**
   * DEV-ONLY (Miss-Recovery slice). Turns on the in-memory mock gateways that let
   * a developer/founder exercise the recovery loop end-to-end in Expo Go at $0:
   * a `home/away` location and a `busy/free` calendar the dev panel toggles. OFF in
   * production — the real Location/Calendar gateways stay Null and permissive
   * ('unknown'), so nothing new is read and no PII surface opens (red-line R3). This
   * NEVER enables the location/calendar reminder TRIGGER kinds (the mocks keep
   * `enabled: false`); it only feeds the transient, gating-only device reads.
   */
  devMockRecovery: false,
} as const;

export type FeatureFlags = typeof featureFlags;
