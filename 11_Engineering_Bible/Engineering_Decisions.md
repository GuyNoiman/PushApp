# Engineering Decisions

Status: Living Document

The running log of concrete engineering/technology decisions, complementing the
principles in `Engineering_Bible_01..05.md`. Every entry follows the Bible §16
requirement: **what · why · alternatives · tradeoffs · future**. Engineering
decisions are prefixed **E**; product decisions live in `06_Decisions/Decision_Log.md` (D-prefix).

---

## E1 — POC technology stack

- **Date:** 2026-07-08
- **Owner:** Founder + engineering (decided jointly, per CLAUDE.md §6).
- **Stage:** POC (see `04_Product/POC_and_MVP_Scope.md`).

### Context
The POC must be **testable on the founder's iOS device periodically** for feedback, a
**web interface for creating Journeys** is wanted later, and the founder is highly
cost-conscious. The Engineering Bible mandates: native-quality feel, offline-first,
vendor independence, business logic outside the UI, and platform-agnostic core systems.

### Decision
**Expo (React Native) + TypeScript**, organized as an **engine-based architecture**:

1. **UI layer** — Expo + `expo-router`. Thin screens that render engine output and send
   user intents back. No business rules in components (Bible §19).
2. **Core engines** (plain TypeScript, no UI/vendor imports) — `JourneyEngine`,
   `BuddyEngine`, `RewardEngine`, `MissionEngine`, `ReminderEngine`. Pure business logic,
   communicating through a lightweight **event bus** (Bible §7, §5 "Event-Driven"):
   e.g. `JourneyCheckedIn` → Reward grants XP/Coins → Buddy reacts. Engines never know
   their consumers.
3. **Configuration before code** (Bible §3) — XP rules, coin rewards, Buddy evolution
   stages, and mission definitions live in `src/core/config/*` data, not hardcoded logic.
4. **Persistence** — a `Repository` interface (offline-first, local device storage now).
   The cloud backend, when the social pillar arrives, implements the **same interface**,
   so no engine depends on a provider (Bible §3 "Vendor Independence", §8 "Local Before Cloud").
5. **Reminders** — on-device **local notifications** (`expo-notifications`) for the POC's
   time/day reminders. No push server, no APNs, no Apple Developer account needed yet.

### Why
- **Instant iOS testing at $0** — Expo Go runs the app on the founder's iPhone via a QR
  scan, with **no Mac and no Apple Developer account** ($99/yr) during the POC feedback loop.
- **Future web reuse** — the TypeScript engines are UI-agnostic; the later web
  Journey-builder reuses them (React Native Web / shared core). Satisfies Bible §20
  "Platform Agnostic".
- **Bible-aligned** — engines-before-features, config-before-code, offline-first,
  replaceable providers behind interfaces, business logic out of the UI.
- **Cost-optimal** — the entire POC path (tooling, device testing, local storage, local
  notifications) is **$0**. A paid Apple Developer account is needed only for
  TestFlight/App Store distribution — not for the feedback loop.

### Alternatives considered
- **Native Swift / SwiftUI** — best-in-class native feel, but requires a Mac + Xcode + a
  paid Apple Developer account to run on a physical device, and gives no path to the future
  web client. Rejected for the POC on cost and reach; the engine boundary keeps a future
  native rewrite possible without touching business logic.
- **Flutter** — capable and cross-platform, but Dart wouldn't share code with a web
  (JS/TS) Journey-builder, and Expo Go's zero-friction device testing is a better fit for
  this feedback loop. Rejected.
- **PWA / mobile web** — $0 and instantly testable, but iOS push/notification support is
  limited and the "native feel" the Bible requires is harder. Rejected for a
  notification-driven, companion-centric product.

### Tradeoffs accepted
- React Native is not literally native; very heavy custom animation or platform-specific
  polish may later need native modules. Acceptable at POC scale, and isolated to the UI layer.
- A dependency on the Expo toolchain. Mitigated: business value lives in framework-free
  engines, so leaving Expo later would not require rewriting product logic.

### Future considerations
- Add a cloud backend (**Supabase free tier** is the current front-runner) behind the
  `Repository`/social abstraction when the **social / Allies** pillar is implemented —
  cost-guardian tracks the free-tier quota before it lands.
- A paid Apple Developer account + EAS builds become relevant only for TestFlight/App
  Store distribution (post-POC).
- The web Journey-builder reuses the core engines when it is scheduled.

### Reflected in
- `CLAUDE.md` §6 (Stack summary), `06_Decisions/Decision_Log.md` (E1), the `app/` scaffold.

---

## E2 — POC social/Allies backend: Supabase (Free tier)

- **Date:** 2026-07-09
- **Owner:** Founder (approved) + engineering.
- **Stage:** POC (the social/Allies pillar of `04_Product/POC_and_MVP_Scope.md` §1.3).

### Context
Four POC pillars (Journey loop, Buddy, Coins/Shop, Missions) are local-first at $0. The
**social/Allies** pillar — a chosen circle seeing each other's Journey progress and cheering —
inherently needs a shared, networked backend (auth + a little cloud data + realtime). It is the
one pillar that leaves the free local world, and it is half the POC hypothesis ("does social
support drive persistence"). Held for founder approval per CLAUDE.md §3.10 / cost-guardian.

### Decision
Use **Supabase (Free tier)** for the POC social pillar. Founder approved on 2026-07-09 and created
a free project (`EXPO_PUBLIC_SUPABASE_URL` + publishable key stored in gitignored `app/.env`;
placeholders in `app/.env.example`). Connectivity verified. Built behind a new **`SocialGateway`**
interface + feature flag; **`SupabaseSocialGateway`** is the only file importing the Supabase SDK
(vendor isolation, Bible §3). Only a progress *summary* + social objects live in the cloud; local
state stays authoritative (Bible §8). Access controlled by Postgres Row-Level Security. Full spec:
`11_Engineering_Bible/Social_Backend_Proposal.md`.

### Why
- **$0 at POC scale** — no credit card, no path to a charge unless a deliberate later upgrade
  (Commercial-stage; cost-guardian will warn). Postgres RLS expresses Ally visibility cleanly;
  auth + realtime included; SQL portable (vendor independence).
- Client ships only the **publishable** (client-safe) key; the **secret** key never ships (Bible §12).

### Alternatives considered
- **Firebase (Spark free tier)** — also $0, but NoSQL makes per-Journey Ally-visibility rules
  clumsier than Postgres RLS, and it is less portable. Rejected; Supabase preferred.
- **Stay local-only / defer social** — keeps $0 but cannot test the social half of the POC bet.

### Tradeoffs accepted
- A free project pauses after ~7 days idle (manual, no-charge resume). Fine for intermittent POC use.
- A cloud dependency, isolated behind `SocialGateway` + a single SDK-importing implementation, so a
  later provider swap is one new file with no engine changes.

### Future considerations
- security-privacy reviews the RLS + data-minimization **before** the pillar ships.
- POC visibility default: *progress-only* (with *full* / *anonymous* per-Journey options); cheers
  surface as a local notification.
- **Auth = anonymous sign-in** for the POC (no email, no SMTP, $0 — chosen 2026-07-09 to avoid
  Supabase's rate-limited built-in email and the need for a custom SMTP provider). Users pick a
  handle so friends can find them; anonymous accounts are per-device and upgradable to
  email/password at Commercial stage for cross-device login.
  **Update 2026-07-10:** anonymous-only auth has graduated into a proper, vendor-isolated
  `AuthGateway` (see **E3** below) — anonymous sign-in is now the default *session*, not the
  ceiling; real Apple/Google identities link onto the same anonymous uid without data loss.

### Reflected in
- `Social_Backend_Proposal.md` (status → Approved), `app/.env.example`,
  `app/src/core/social/` (`SocialGateway` + `SupabaseSocialGateway`). Auth now owned by
  `app/src/core/auth/` — see **E3**.

---

## E3 — Real accounts: Sign in with Apple + Google (auth foundation)

- **Date:** 2026-07-10
- **Owner:** Founder (approved-in-principle) + engineering (architect · security-privacy ·
  store-compliance · cost-guardian synthesized the proposal).
- **Stage:** POC → MVP (P1–P2 landed at POC; P3+ native/paid step is separately gated).

### Context
E2 shipped anonymous-only auth for the POC social pillar. Real users need real, durable accounts
and a proper user-management backend, and **each user's private data must never be exposed to any
other user** (founder requirement). The full plan (architecture, privacy red-lines, store
requirements, cost, phasing) was synthesized from a four-specialist review into
`11_Engineering_Bible/Auth_Backend_Proposal.md` — this entry is the decision record; the proposal
document holds the detail.

### Decision
Adopt **Sign in with Apple + Google** (passwordless — no email/password, no SMTP) via **Supabase
Auth's native ID-token exchange**, behind a new vendor-isolated **`AuthGateway`**
(`app/src/core/auth/`: interface + `AuthUser` + `NullAuthGateway` + `SupabaseAuthGateway` +
factory), mirroring the existing `SocialGateway` pattern. A new `AuthProvider` owns session
bootstrap (moved out of `SocialProvider`, which now reacts to the auth uid). Anonymous sessions
upgrade in place via `linkIdentity` onto the **same** `auth.uid()` — no data migration, no
orphaning. Full detail, architecture diagram, and store-compliance checklist:
`Auth_Backend_Proposal.md`.

Three founder decisions made alongside the approval (2026-07-10):
1. **Auth method = Apple + Google sign-in**, passwordless.
2. **Do NOT collect the user's real name** from Apple/Google. Identity in the product is the
   handle + Buddy, never a legal name. Email stays quarantined in Supabase-managed `auth.users`
   and is never written to any `public.*` table (privacy red-line R1 in the proposal).
3. **Build the free foundation first.** P1–P2 (gateway skeleton + `AuthProvider` + R2 secure-store
   hardening) ship now at **$0, zero user-visible behavior change**. The native Apple/Google
   sign-in buttons + dev build (P3+) — which require the **~$99/yr Apple Developer Program**, the
   one unavoidable cost — are a **later, separately-approved step**; everything else stays $0 at
   MVP scale (local Xcode build recommended over EAS cloud minutes).

**Landed 2026-07-10 (commit `2af2468`):** P1 (gateway skeleton) + P2 (`AuthProvider` + session
ownership) + R2 (Supabase session storage moved from plaintext AsyncStorage to `expo-secure-store`
on native, with byte-safe UTF-8 chunking and generation-based atomic writes; web keeps AsyncStorage,
no OS keychain there). Apple/Google methods are declared on `SupabaseAuthGateway` but throw
`AuthNotAvailableError` until the P3+ native dev build exists — the app still boots anonymous with
zero behavior change. `tsc` 0, jest 55/55 (incl. new PII-stripping, byte-boundary, and
write-rollback tests). Code-reviewed; findings fixed (a `cheers` realtime subscribe bind race,
byte-vs-char chunking, non-atomic secure-store writes).

### Why
- **Real accounts are a founder requirement** for cross-device identity and private-data isolation
  — anonymous-only (E2) cannot satisfy this at Commercial scale.
- **Apple + Google over email/password** — passwordless keeps cost at $0 (no SMTP), is lower
  friction, and Apple's platform rules require offering Sign in with Apple once Google is offered.
- **No real-name collection** — security-privacy flagged the legal name as pure liability with no
  product use; the identity system already runs on handle + Buddy, so the name field is simply
  never asked for.
- **Foundation-first phasing** — P1–P2 deliver the entire vendor-isolated architecture, the
  session-ownership refactor, and the secure-store hardening at **$0 and with no behavior change**,
  so none of it waits on a founder cost-approval. Only the phases that need native modules /
  Apple's paid program (P3+) are gated, per CLAUDE.md §3.10.
- **Identity linking, not migration** — using Supabase's `linkIdentity` onto the existing anonymous
  `auth.uid()` means no profile/friendship/ally data is ever copied or orphaned when a user
  upgrades from anonymous to a real identity.

### Alternatives considered
- **Email + password** — rejected: needs a custom SMTP provider (Supabase's built-in email is
  rate-limited) to stay usable, adds a password-reset surface, and is higher friction than
  passwordless social sign-in. Consistent with the E2 rationale for avoiding email.
- **Collecting the real name from Apple/Google** — rejected per security-privacy: no product
  feature needs it (identity = handle + Buddy), and storing it only creates liability and account-
  deletion/export complexity for no benefit.
- **Ship P3+ (native/paid) immediately alongside P1–P2** — rejected: the ~$99/yr Apple cost should
  be a deliberate, separately-approved spend (CLAUDE.md §3.10), not bundled into a $0 foundation
  change. Splitting the phases lets the architecture land now without forcing that decision today.
- **EAS cloud build for the future dev build** — deprioritized in favor of local Xcode builds on
  the founder's Mac, which cost $0 versus EAS's metered free-tier build minutes.

### Tradeoffs accepted
- Until P3+ lands, Apple/Google sign-in buttons cannot actually be tapped (calls throw
  `AuthNotAvailableError`); acceptable because P1–P2 change nothing user-visible and unblock all
  the vendor-isolation/session work ahead of time.
- Native auth modules do not run in Expo Go, so P3+ requires moving to a dev build (local Xcode,
  $0) — the QR-in-Expo-Go loop ends for auth testing specifically, though Metro JS hot-reload
  continues to work for everything else.
- Web sessions remain in AsyncStorage (no OS keychain equivalent in a browser); accepted as the
  standard web-platform tradeoff, unchanged from before.

### Future considerations
- **P3 — dev build stand-up** (native modules, Apple Developer Program, Apple/Google configured in
  Supabase + consoles) — gated on founder approval of the ~$99/yr cost.
- **P4 — Apple sign-in**, **P5 — Google sign-in** (symmetric `signInWithIdToken` flow), **P6 —
  hardening** (collision fallback, error surfaces, security review), **P7 — compliance & docs**
  (in-app account deletion + public web deletion page, Privacy Policy/Terms, App Privacy nutrition
  label, sign-in copy). Full phase list: `Auth_Backend_Proposal.md` §8.
- Store-compliance items required before any TestFlight/submission (bundle ID + Sign in with Apple
  capability, equal-prominence buttons, ATT not required, Google Play ~$25 one-time only when
  Android ships) are tracked in the proposal §5 and not yet due.

### Reflected in
- `Auth_Backend_Proposal.md` (the full spec), `app/src/core/auth/` (`AuthGateway`,
  `SupabaseAuthGateway`, `NullAuthGateway`, factory, `authUser.ts`), `app/src/app/_layout.tsx`
  (`AuthProvider` composed outside `SocialProvider`), `featureFlags.auth`,
  `06_Decisions/Decision_Log.md` (D19), `Current_Context.md`.
