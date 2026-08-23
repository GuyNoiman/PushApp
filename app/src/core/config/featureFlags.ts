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
   * over live Gemini (behind the LlmClient seam) instead of the scripted UI prototype. Outbound
   * text is redacted ({@link ../llm/RedactingLlmClient}) before it crosses the cloud boundary (G1).
   *
   * ON when the coach can REACH a provider, by either route:
   *  · through our `gemini-proxy` Edge Function, which needs only the Supabase env — the key is on
   *    the server, so this is the route every shipped build takes; or
   *  · directly, when `EXPO_PUBLIC_GEMINI_API_KEY` is present (Node, tests, the dev harness).
   *
   * This used to be gated on the API key alone, which was correct while the key had to be in the
   * bundle for the coach to work at all. Moving the key to the server INVERTED that: keeping the
   * old condition would have turned the live coach off in exactly the builds that can now use it
   * safely, and left it on only where the key is still exposed.
   */
  liveCoach: Boolean(process.env.EXPO_PUBLIC_GEMINI_API_KEY || (url && key)),
  /**
   * Smart Notification Timing (Smart_Notification_Timing_PRD) — the on-device learning loop that
   * proposes a better send time for a Journey's reminder in Weekly Review. OPT-IN and
   * FOUNDER-DEVICE-ONLY: on only when `EXPO_PUBLIC_SMART_TIMING` is present, which lives solely in
   * the founder's git-ignored `.env.local` and is never committed — so every other build (and CI)
   * keeps it fully dormant. Literal `Boolean(process.env.…)` so Metro statically inlines it.
   *
   * Deliberately NOT `adaptiveCoach`: Smart Timing keeps its OWN evidence store and needs no
   * BehaviorModelEngine, so coupling the two would drag the whole replan loop along and stop the
   * founder trying timing on its own. Gated rather than shipped-on because it changes what lands on
   * the lock screen and opens new OS surface (a notification `data` payload + a tap listener) that
   * needs real-device QA first.
   *
   * OFF ⇒ no timing model or trial is ever written, the tap listener is never registered, and the
   * scheduled notifications carry no `data` payload — production behaviour is bit-identical. The
   * learned evidence is ON-DEVICE ONLY (G1).
   */
  /**
   * ON since 2026-08-24 — the founder approved it after the device QA it was waiting for. The env
   * var stays readable so it can still be forced on in a build that has the flag off for any other
   * reason, but the default is now true: the timing model runs, the tap listener is registered, and
   * scheduled notifications carry their (ids-only) attribution payload.
   */
  smartTiming: true,
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
  /**
   * DEV-ONLY. Seeds the demo Dreams/Journeys/Steps on a genuine first run
   * ({@link ../AppCore.seedDemoJourney}). OFF for every real user by decision: a fresh install must
   * open EMPTY, with nothing the user did not create (founder decision, Device QA 2026-08-17 B2) —
   * a first-run user meeting three Journeys they never chose is the opposite of what this app is.
   *
   * Kept (rather than deleted) because the seed is still the fastest way to bring a device up with
   * a realistic plan: its Steps carry `plannedFor` dates and constraints, which is what the adaptive
   * replan loop and the Miss-Recovery gates need to be exercised at all. On only when
   * `EXPO_PUBLIC_DEMO_SEED` is present, which lives solely in the founder's git-ignored `.env.local`
   * and is never committed — so store builds and CI never seed. Literal `Boolean(process.env.…)` so
   * Metro statically inlines it at build time.
   *
   * Deliberately its OWN flag rather than riding `adaptiveCoachDev`: the founder needs to test the
   * adaptive loop and the genuinely-empty first run independently, and coupling them would mean
   * turning one on silently re-seeds the other's device.
   *
   * IT IS ALSO GATED ON `__DEV__` (2026-08-20), which is belt AND braces on purpose. The env var
   * lives only in a git-ignored `.env.local` that `.easignore` keeps out of the upload — but that is
   * three separate files agreeing with each other, and the cost of one of them being edited wrongly
   * is a real user opening the app to a plan somebody else wrote. The partner reported exactly that
   * shape of confusion for a different reason, and it is not a thing to be one mistake away from.
   * `__DEV__` is compiled to `false` in every release build, so a shipped app CANNOT seed, whatever
   * any env file says.
   */
  devSeedDemoData: __DEV__ && Boolean(process.env.EXPO_PUBLIC_DEMO_SEED),
} as const;

export type FeatureFlags = typeof featureFlags;
