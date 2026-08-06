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

---

## E4 — Module boundaries & reserved seams for future domains

- **Date:** 2026-07-12
- **Owner:** Engineering (architecture audit + implementation), no founder gate needed — $0,
  zero user-visible behavior change, no new data collection (CLAUDE.md §3.10 does not apply).
- **Stage:** POC (built domains); the four reserved seams are Future-stage per their own
  `Stage:` tags in `Module_Architecture.md` — flags default off.

### Context
As the team grows, future contributors/teams should be able to **own a domain independently**
(Journey, Buddy, Social, etc.) without needing to understand the whole app. An architecture audit
was run to check whether the codebase already supports this. It confirmed PushApp is
**modularity-adherent**: framework-free engines over an event bus, vendor-isolated `*Gateway`
boundaries with `Null*` fallbacks for every external dependency, config-before-code, an
offline-first `Repository`, and no business logic in UI components. Given that baseline, two
follow-ups were worth doing now rather than later: (1) make the module boundaries **explicit and
documented**, so "which team owns this" and "what can I depend on" are answered by a doc, not
tribal knowledge; and (2) **reserve boundaries** for four domains the product vision already
calls for (adaptive profiling, proactive intervention, interests, deeper Support Circle) but that
are deliberately not built yet, so a future team drops in behind a stable interface instead of
first inventing one.

### Decision
Two parts, both landed in commit `746c685`:

1. **Document the module map** — new `11_Engineering_Bible/Module_Architecture.md`: a
   responsibility / team-boundary / public-interface / events / data-ownership / status block for
   every BUILT domain (Journey, Reward, Buddy, Shop, Mission, Reminder, Auth, Social, Entitlement)
   and every FUTURE domain, plus the full event-contract table. This doc is now the canonical
   module map; see it for the actual boundaries rather than duplicating them here.
2. **Reserve four future-domain seams — boundary only, no feature logic:**
   - `app/src/core/profile/` — `ProfileGateway` + `NullProfileGateway` + factory,
     `featureFlags.profile` (off). `UserProfile` type is defined PII-free (derived/aggregate
     traits only).
   - `app/src/core/interests/` — `InterestsGateway` + `NullInterestsGateway` + factory,
     `featureFlags.interests` (off). Topics are explicitly user-chosen, not inferred.
   - **Intervention seam** — `ReminderEngine`'s constructor now takes an **optional** `EventBus`
     (stored only; nothing subscribed; zero behavior change) as the future attachment point for
     an `InterventionEngine` that would decide *when* to nudge, keeping that decision separate
     from Reminder's delivery mechanism.
   - Four **reserved (declared-but-never-emitted)** members added to the `DomainEvent` union in
     `core/events/events.ts`: `ProfileUpdated`, `InterestsUpdated`, `InterventionScheduled`,
     `StepMissed` — so a future engine can subscribe/emit with no union churn.

   Alongside the seams, four **behavior-preserving tidy-ups** were made to keep the boundaries
   clean while touching this code: `JourneyEngine.journeyProgress()` selector (progress math
   moved out of `SocialProvider`, which was reaching into Journey's math instead of asking
   Journey); Shop catalog exposed via `AppCore.getCosmetics()` / `resolveCosmetic()` (Buddy
   components previously imported Shop's config directly); `EntitlementEngine` now constructed
   inside `AppCore` rather than in `EntitlementProvider` (a provider was doing an engine's
   composition job).

### Why
- **Future team ownership is a stated goal**, not yet a written contract — writing down "what can
  this domain's team touch, and what must it go through" turns an implicit convention (that
  happened to already be followed) into an explicit, checkable one.
- **Reserving seams now is cheap and correct-shaped later.** Building the interface + `Null*` +
  flag costs nothing at runtime (dead code path) and means the *actual* future work
  (profiling/intervention/interests logic) starts with a stable contract instead of also having
  to invent one under time pressure, and without a second migration to introduce the boundary
  retroactively.
- **CLAUDE.md §3 "the vision never shrinks."** These four domains are real, previously-discussed
  product direction that is hard or premature now — reserving the seam keeps them visibly *in
  the architecture* (Future-stage, not deleted) rather than only living in someone's memory of a
  past conversation.
- **The tidy-ups were opportunistic, not separately motivated** — while establishing where module
  boundaries are, three call sites were found reaching past another domain's public interface
  (a provider doing math that belongs to Journey, a UI component importing Shop's config, a
  provider constructing another domain's engine). Fixing them while the boundary work was already
  in progress was cheaper than a separate pass later, and each is behavior-preserving (verified:
  `tsc` 0, jest 87/87 including 2 new seam tests, eslint clean).

### Alternatives considered
- **Leave the boundaries implicit** (rely on the existing engine/gateway pattern being "obviously"
  followed) — rejected: it already required an audit to *confirm* adherence, meaning it wasn't
  actually legible without reading the code; a documented map is the cheaper long-term default.
- **Build the future domains' real logic now** instead of just seams — rejected: none of the four
  has gone through the required security-privacy / store-compliance review yet (data collection
  and inference are exactly what those reviews exist to gate), and building ahead of that review
  risks having to unwind collected data or shipped behavior. Boundary-only defers the *build*
  without losing the *shape*.
- **Skip the tidy-ups** and file them as separate future tickets — rejected: they were small,
  behavior-preserving, and directly touched by the same boundary-drawing work; deferring them
  would have meant re-opening the same files later for an unrelated-looking commit.

### Tradeoffs accepted
- Four feature flags now exist that are permanently off until their domain is built — a small,
  intentional amount of dead-but-documented surface area (mirrors the existing pattern for
  `social`/`auth`/`entitlements`, which also gate on config/flags).
- `ReminderEngine` now has an unused-at-runtime constructor parameter (the reserved `EventBus`)
  until Intervention is built — accepted as the cheapest way to reserve that attachment point
  without a larger refactor later.

### Future considerations
- Implementing **any** of Profiling / Intervention / Interests requires, in order: a
  security-privacy review (RLS + data-minimization design) and, if it changes what the app
  collects or how it behaves toward the user, a store-compliance pass (App Privacy label update)
  — per CLAUDE.md §5 routing table. See `Module_Architecture.md`'s "Reserved-seam note" for the
  full reasoning.
- Close-Circle-deeper (Friends Gift/Message, groups, richer Ally permissions) remains fully
  deferred with **no seam yet** — it was scoped out of this pass because its shape (likely new
  `SocialGateway` methods rather than a new gateway) needs its own design pass first. Tracked in
  `Module_Architecture.md` so it isn't forgotten.

### Reflected in
- `11_Engineering_Bible/Module_Architecture.md` (the full module map — canonical), commit
  `746c685`, `app/src/core/profile/`, `app/src/core/interests/`, `app/src/core/events/events.ts`,
  `app/src/core/engines/ReminderEngine.ts`, `app/src/core/config/featureFlags.ts`,
  `Current_Context.md`.

---

## E5 — Hub-and-loop engine design (the AI-adaptive-coach core architecture)

- **Date:** 2026-08-03
- **Owner:** Engineering. Docs-only recording of the architecture that the product pivot (D23)
  requires; no code lands with this entry (task S0.2).
- **Stage:** POC — this is the design the **S1 simulation** stage (see
  `04_Product/Build_Plan_and_Method.md`) is built to validate, before any UI depends on it.

### Context
`06_Decisions/Decision_Log.md` **D23** (2026-08-01) repositions PushApp's mechanism to an **AI
adaptive coach** and states the moat is "**the closed feedback loop, not any single feature**" —
adaptive personalization + human accountability, working together. D23 explicitly left the
engineering shape of that loop undocumented, flagging it as a follow-up (task S0.2, this entry).
The existing architecture (E1 engines-over-event-bus, E4's reserved seams and events —
`ProfileUpdated`, `InterestsUpdated`, `InterventionScheduled`, `StepMissed` already declared in
`app/src/core/events/events.ts`, plus the reserved `EventBus` param on `ReminderEngine`) was
already shaped to fit this before the pivot was named — D23 confirms "no new codebase" and this
entry makes that fit explicit and concrete.

### Decision
Adopt a **hub-and-loop** design for the adaptive-coach core, built entirely from the existing
engine/event-bus/`Repository` architecture — no new architectural primitives, only new engines and
events inside the existing pattern:

1. **The closed feedback loop is the product.** One cycle:
   `Step outcome` → `BehaviorModel` updates → `InsightUpdated` (event) → `AdaptivePlanner`
   re-plans → `PlanAdapted` (event) + a nudge hint → `Scheduler`/Coach act on the user → the next
   `Step outcome`, closing the loop. Every stage is a plain engine reacting to and emitting
   `DomainEvent`s — consistent with the existing `JourneyCheckedIn → Reward → Buddy` chain (E1).
2. **One shared, live user-model as the hub — `InsightModel`.** Rather than each engine keeping
   its own partial view of the user, `BehaviorModel`, `AdaptivePlanner`, the `Scheduler`, and the
   human-ally projection all **read from and update the same `InsightModel`** (the concrete shape
   the already-reserved `ProfileGateway`/`UserProfile` seam from E4 takes on). This is the "hub";
   the loop stages are "spokes" around it, not a chain of engines each holding private state.
3. **Event-bus choreography, never point-to-point.** No engine calls another engine directly (same
   rule as E1 §2 "Engines never know their consumers"). `AdaptivePlanner` never calls `Scheduler`;
   it emits `PlanAdapted`, and `Scheduler` subscribes. This keeps every stage independently
   testable and lets the **S1 simulation** run the loop headless (no UI, no engine wiring changes)
   exactly as it will run in the app.
4. **An explicit, tunable `adaptivePolicy`, config-before-code (Bible §3, E1 §3).** How
   aggressively `AdaptivePlanner` re-plans, how nudge hints are weighted, and the orchestration
   cadence all live as data in `app/src/core/config/` (mirroring `featureFlags.ts`,
   `schedulerLimits.ts`), not hardcoded logic — so the loop's behavior is tunable and reviewable
   without a code change, and the S1 simulation can sweep policy values.
5. **A pluggable `DomainExpert` seam.** The core loop (`BehaviorModel`, `AdaptivePlanner`,
   `InsightModel`) stays **domain-agnostic**, per D23 point 4 ("the domain is not the bet, the
   engine is"). A `DomainExpert` interface is the seam where domain-specific knowledge (sports,
   certification, nutrition, …) plugs in **later**, as D23's Future Vision domain-expert modules —
   consistent with the E4 reserved-seam pattern (build the boundary now, the domain logic later,
   after its own review).
6. **The human ally consumes the same loop, via a minimal `OutreachInsight` projection.** Rather
   than a separate data path for Allies, the Support Circle/ally-notification surface reads a
   small, privacy-minimized projection of `InsightModel` (enums/buckets, no free text — consistent
   with D23 point 5's local-first privacy split and the existing R1–R3 red-lines). One hub, two
   consumers (automated Scheduler/Coach + human ally), not two parallel models to keep in sync.
7. **Prove loop quality before any UI.** The **S1 simulation** stage (`Build_Plan_and_Method.md`)
   runs the full loop headless against synthetic Step-outcome sequences to validate that
   `AdaptivePlanner` converges/behaves sanely under the `adaptivePolicy` config, before Scheduler/
   Coach UI or the human-ally surface are built on top of it.

### Why
- **The moat is the integration, not a feature** (D23) — a hub-and-loop shape is what makes that
  literal: every stage shares one live model and one event contract, so the *combination* is the
  hard-to-copy asset, not any single engine.
- **Reuses, rather than replaces, E1/E4.** No new architectural primitive is introduced; `E1`'s
  engine-over-event-bus pattern and `E4`'s reserved events/seams were already shaped for exactly
  this, so adopting hub-and-loop costs no rewrite — it names and completes a shape already begun.
- **Config-before-code for `adaptivePolicy`** keeps the loop's tuning reviewable and testable
  (including by non-engineers) and lets the S1 simulation sweep behavior without code changes,
  matching the existing `featureFlags`/`schedulerLimits` convention.
- **Domain-agnostic core + pluggable `DomainExpert`** directly implements D23 point 4 — the
  domain-expert modules are Future Vision (D23), so the core must not hard-wire any one domain in
  order for that door to stay open.
- **Simulate before UI** avoids building Scheduler/Coach/ally UI on top of an unvalidated
  planner — cheaper to discover a bad loop in a headless sim than after screens depend on it.

### Alternatives considered
- **Point-to-point engine calls** (e.g. `AdaptivePlanner` calling `Scheduler` directly) — rejected:
  breaks the "engines never know their consumers" rule (E1), makes headless simulation harder (the
  sim would need to fake the same call graph as the app), and re-couples exactly what the event bus
  exists to decouple.
- **Per-engine private user state** instead of one shared `InsightModel` hub — rejected: would
  require explicit sync logic between `BehaviorModel`'s view and `AdaptivePlanner`'s view (and the
  ally projection's view) of the same user, reintroducing a consistency problem the hub avoids by
  construction.
- **Build a sharp-domain expert now** (e.g. hard-code sports or habit logic into the planner) —
  rejected per D23: the domain is explicitly not the bet yet; hard-wiring one domain would also
  pre-empt the still-open general-vs-sharp positioning question (D23's Open Question).
- **Skip the S1 simulation and build UI directly** — rejected: the loop is the entire value
  proposition (D23), so validating it headless, before UI investment, is cheaper risk management
  than discovering a bad planner after Scheduler/Coach screens are built on it.

### Tradeoffs accepted
- The hub (`InsightModel`) becomes a central, must-not-break contract that most of the loop depends
  on — more design care is needed here than for a typical single-purpose engine. Accepted because
  the alternative (N private models) is a worse, hidden version of the same coupling.
- `adaptivePolicy` as config adds a data-shape to design and document (mirroring existing
  `schedulerLimits`/`featureFlags` conventions), rather than letting the first implementation's
  hardcoded constants stand in for it.

### Future considerations
- The concrete `InsightModel`/`BehaviorModel`/`AdaptivePlanner`/`adaptivePolicy` schemas, and the
  exact `DomainEvent` additions beyond the four already reserved in E4, are **not decided by this
  entry** — they are implementation detail for the S1/S2 build stages, gated by their own
  security-privacy review before any real data is collected (per CLAUDE.md §5, same rule E4 set
  for its reserved seams).
- `DomainExpert` plugging-in is Future Vision (D23) — not scheduled; this entry only reserves the
  seam's existence and its domain-agnostic-core constraint.
- Reconcile D23 point 5's local-first privacy split with the existing R1 (auth)/R2 (secure-store)/
  R3 (location/calendar) red-lines into one place if/when a global red-line registry is created —
  flagged in D23 itself, restated here because `OutreachInsight` is exactly the kind of surface
  that registry would need to cover.

### Reflected in
- This entry; `06_Decisions/Decision_Log.md` **D23**; `04_Product/Build_Plan_and_Method.md` (S1
  simulation stage); `11_Engineering_Bible/Module_Architecture.md`'s existing reserved seams
  (Profile/Intervention/Interests) and `app/src/core/events/events.ts`'s reserved events, which
  this design builds on rather than replaces.
