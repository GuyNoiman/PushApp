# Module Architecture

Status: Living Document

**Purpose — how is PushApp's engineering organized into ownable domains?** This is the
canonical **module map**: every domain PushApp needs (built or future) as a self-contained
unit a future team could own independently, communicating with every other domain **only
through the event bus** (`app/src/core/events/`) or a narrow vendor-isolated `*Gateway`
interface — never by importing another domain's internals directly. It complements, not
replaces, `Engineering_Bible_01..05.md` (principles) and `Engineering_Decisions.md` (the
E-prefixed decision log — this doc is what **E4** decided; read that entry for the why).

Companion product-side map: `09_Product_Philosophy/Product_Terminology.md` (Dream · Journey ·
Phase · Step · Buddy · Ally · Support Circle · Mission) and `04_Product/Information_Architecture.md`.

---

## How to read this doc

Each module block lists:
- **Responsibility** — the one thing this domain owns (Bible §one-doc/module-one-responsibility).
- **Team boundary** — what a future team owning this domain would touch, and nothing else.
- **Public interface** — the engine(s) and/or `*Gateway` name(s) other domains are allowed to
  depend on. Everything else inside the module's folder is private to it.
- **Events emitted / consumed** — its vocabulary on the event bus (Bible §7 event-driven).
- **Data ownership & privacy** — what state/table it owns, and any privacy constraint.
- **Status** — `built` · `seam-reserved` (boundary exists, no feature logic) · `deferred` (not
  started at all).

Source: `app/src/core/` (engines, gateways, events, config) audited 2026-07-12; commit `746c685`
built the reserved seams described below. This map is descriptive of the code — if code and doc
ever disagree, treat that as a bug to fix (in whichever direction is correct), not a reason to guess.

---

## BUILT domains

### Journey
- **Responsibility:** the core transformation loop — Dreams → Journeys → Phases → Steps,
  check-ins, completion.
- **Team boundary:** Journey creation, Step scheduling/check-in, progress math.
- **Public interface:** `JourneyEngine` (incl. `journeyProgress()` selector — progress math
  lives here, not in a provider/UI).
- **Events:** emits `JourneyCreated`, `StepCheckedIn`, `JourneyCompleted`. Consumed by Reward,
  Buddy, Mission.
- **Data ownership & privacy:** owns `Journey`/`Step`/`CheckIn` domain state via `Repository`
  (offline-first, local device by default). No PII beyond the user's own content.
- **Status:** built.

### Reward
- **Responsibility:** translate other domains' milestones (Step check-in, Journey completion,
  Mission claim, Login claim) into XP/Coins.
- **Team boundary:** reward math and balances only — never decides *when* something is
  rewarded, only *how much*.
- **Public interface:** `RewardEngine`.
- **Events:** consumes `StepCheckedIn`, `JourneyCompleted`, `MissionClaimed`,
  `LoginRewardClaimed`; emits `RewardGranted`.
- **Data ownership & privacy:** owns XP/Coins balances. No PII.
- **Status:** built.

### Buddy
- **Responsibility:** the companion — reacts to progress, evolves through stages, wears
  cosmetics.
- **Team boundary:** Buddy state, evolution rules, reaction/celebration presentation logic.
- **Public interface:** `BuddyEngine`.
- **Events:** consumes `RewardGranted`; emits `BuddyReacted`, `BuddyEvolved`.
- **Data ownership & privacy:** owns Buddy stage/XP/equipped-cosmetic state. No PII. Reads the
  Shop catalog via `AppCore.getCosmetics()` / `resolveCosmetic()` — it does not import Shop's
  config directly (tidied 2026-07-12, previously a Buddy-component→config coupling).
- **Status:** built.

### Shop
- **Responsibility:** the Coins-spend catalog and cosmetic ownership/equip flow.
- **Team boundary:** catalog config, purchase rules, equip state.
- **Public interface:** `ShopEngine`; catalog exposed to other domains only via
  `AppCore.getCosmetics()` / `resolveCosmetic()` (config-before-code, Bible §3).
- **Events:** emits `ItemPurchased`, `ItemEquipped`.
- **Data ownership & privacy:** owns owned/equipped-cosmetic state. No PII.
- **Status:** built.

### Mission
- **Responsibility:** the game-loop layer — Daily/Weekly missions and the Login-reward rail
  (engagement scaffolding around, not instead of, the transformation loop — CLAUDE.md §3.4
  "growth before engagement" still governs what a Mission can require).
- **Team boundary:** mission definitions, progress tracking, claim/rollover.
- **Public interface:** `MissionEngine` (injected clock, for testable rollover).
- **Events:** consumes `StepCheckedIn` (progress source); emits `MissionProgressed`,
  `MissionCompleted`, `MissionClaimed`, `LoginRewardClaimed`.
- **Data ownership & privacy:** owns mission/login-cycle state. No PII.
- **Status:** built.

### Reminder
- **Responsibility:** on-device local notifications for Journey/Step reminders. The only core
  file importing `expo-notifications`, keeping the rest of `core/` vendor-agnostic.
- **Team boundary:** notification scheduling/permission handling only.
- **Public interface:** `ReminderEngine`.
- **Events:** takes an **optional** `EventBus` in its constructor — stored only, subscribed to
  nothing today. This is the seam a future Intervention domain (below) will use to decide
  *when* to remind, without Reminder itself gaining decision logic.
- **Data ownership & privacy:** owns scheduled-notification handles. No PII.
- **Status:** built (its intervention seam is seam-reserved — see below).

### Auth
- **Responsibility:** who the user is — session bootstrap, sign-in method, identity linking.
- **Team boundary:** everything Supabase-auth-shaped; the only place PII (email) may ever touch,
  and even there it is quarantined server-side.
- **Public interface:** `AuthGateway` (+ `NullAuthGateway`, `SupabaseAuthGateway`, factory);
  `AuthProvider` owns session bootstrap for the app.
- **Events:** none in the `DomainEvent` union today — other domains read the auth uid via
  `AuthProvider`/`AppCore`, not via events.
- **Data ownership & privacy:** owns the session/uid. Email is quarantined in Supabase-managed
  `auth.users`, **never written to `public.*`** (E3 privacy red-line R1). Real name is never
  collected (D19).
- **Status:** built (P1–P2 of E3; native Apple/Google sign-in is P3+, separately gated on cost —
  see `Auth_Backend_Proposal.md`).

### Social (close-circle)
- **Responsibility:** Support Circle / Allies — friend requests, per-Journey visibility, cheers.
- **Team boundary:** everything social-graph-shaped; enforces that only a progress *summary*
  ever leaves the device.
- **Public interface:** `SocialGateway` (+ `NullSocialGateway`, `SupabaseSocialGateway`, factory).
- **Events:** none in the `DomainEvent` union today — social state changes flow through
  `SocialProvider` reacting to Journey/Reward state and the auth uid, not the event bus.
- **Data ownership & privacy:** owns friendships, per-Journey `ProgressSummary`, cheers. Never
  the reflections, the "why", or Step detail (data minimization, Bible §8). Access enforced
  server-side by Postgres RLS (`app/supabase/schema.sql`).
- **Status:** built.

### Entitlement
- **Responsibility:** the user's account tier (free / trial / subscriber) — read-only from the
  server, with a client-writable local dev-trial escape hatch.
- **Team boundary:** tier resolution only; deliberately cannot upgrade a user — that is
  server-side-only (verified receipt / service role).
- **Public interface:** `EntitlementGateway` (+ `NullEntitlementGateway`,
  `SupabaseEntitlementGateway`, factory); `EntitlementEngine`, now constructed inside `AppCore`
  (tidied 2026-07-12, previously constructed in `EntitlementProvider`, a provider→engine
  layering inversion).
- **Events:** none in the `DomainEvent` union today.
- **Data ownership & privacy:** owns the effective tier. No PII. RLS grants the user
  SELECT-on-own-row only, no insert/update/delete from the client.
- **Status:** built.

---

## FUTURE domains (seam-reserved or fully deferred)

Per CLAUDE.md §3 "the vision never shrinks" — these are **deferred, not cut**. Each has, at
most, an inert boundary today (a `*Gateway` + `Null*` implementation + an off feature flag), with
**zero feature logic**. Before any of them is actually implemented it **must** first go through
**security-privacy** (RLS design + data-minimization review) and, if it changes what the app
collects, **store-compliance** (App Privacy nutrition-label update) — per CLAUDE.md §5.

### User-Model / Profiling *(seam-reserved)*
- **Responsibility (future):** a derived, privacy-safe picture of how a user tends to act
  (e.g. preferred check-in time-of-day, follow-through tendency) for a later personalization layer.
- **Team boundary (future):** trait derivation + storage only; explicitly not the intervention
  decision logic (that's a separate domain, below).
- **Public interface:** `ProfileGateway` (+ `NullProfileGateway`, factory) — `app/src/core/profile/`.
- **Events:** `ProfileUpdated` — **reserved, not emitted anywhere today**.
- **Data ownership & privacy:** `UserProfile` is defined to carry **no PII** — derived, coarse,
  aggregate signals only (e.g. `preferredTimeOfDay`, `consistency: number|null`), never a name,
  email, free text, location, or raw event log. `recordSignal()` is a no-op while deferred.
- **Status:** seam-reserved (`featureFlags.profile = false`). No implementation.

### Intervention / Communication *(seam-reserved)*
- **Responsibility (future):** decide *when and how* to nudge a user (reminders, encouragement)
  based on domain events like a missed Step — separating the *decision* from Reminder's
  *delivery mechanism*.
- **Team boundary (future):** intervention policy/timing logic only; delivery stays owned by
  Reminder (and possibly future push/communication channels).
- **Public interface:** none yet — `ReminderEngine`'s constructor now accepts an **optional**
  `EventBus` (stored only, nothing subscribed) as the seam a future `InterventionEngine` would use.
- **Events:** `InterventionScheduled`, `StepMissed` — **reserved, not emitted anywhere today**.
- **Data ownership & privacy:** none yet (nothing implemented). Any future design must minimize
  data collection and go through security-privacy before build.
- **Status:** seam-reserved (`featureFlags.intervention = false`). No implementation.

### Interests *(seam-reserved)*
- **Responsibility (future):** coarse, user-chosen topic tags (e.g. "fitness", "learning") to
  power future Explore/recommendation surfaces.
- **Team boundary (future):** interest storage + (optional) recommendation only.
- **Public interface:** `InterestsGateway` (+ `NullInterestsGateway`, factory) —
  `app/src/core/interests/`.
- **Events:** `InterestsUpdated` — **reserved, not emitted anywhere today**.
- **Data ownership & privacy:** `InterestTopic` is explicitly **user-chosen, not inferred** —
  not PII, no free text, no identity, no location. An optional `recommend()` method is declared
  but any future implementation that infers (rather than accepts explicit opt-in) needs a
  security-privacy review first.
- **Status:** seam-reserved (`featureFlags.interests = false`). No implementation.

### Close-Circle-deeper *(deferred, no seam yet)*
- **Responsibility (future):** deeper Support Circle features beyond today's Social domain —
  e.g. Friends Gift/Message (currently disabled placeholders in the UI — see
  `Current_Context.md`), groups, richer Ally permissions.
- **Team boundary (future):** extends Social's existing boundary; would likely add methods to
  `SocialGateway` rather than a new gateway.
- **Public interface:** none yet — no new gateway methods added.
- **Events:** none reserved yet; would likely extend the existing (event-less) Social pattern
  or introduce new `DomainEvent` members when designed.
- **Data ownership & privacy:** unresolved — inherits Social's data-minimization stance
  (progress summary only, never raw content) as a starting constraint.
- **Status:** deferred. No boundary code exists; listed here so the domain isn't forgotten.

---

## Event contract

The full `DomainEvent` union (`app/src/core/events/events.ts`). Engines never call each other
directly — they emit and react to these over the `EventBus` (Bible §7).

**Emitted today:**
| Event | Emitted by | Consumed by |
|---|---|---|
| `JourneyCreated` | Journey | — |
| `StepCheckedIn` | Journey | Reward, Mission |
| `JourneyCompleted` | Journey | Reward |
| `RewardGranted` | Reward | Buddy |
| `BuddyReacted` | Buddy | — |
| `BuddyEvolved` | Buddy | — |
| `ItemPurchased` | Shop | — |
| `ItemEquipped` | Shop | — |
| `MissionProgressed` | Mission | — |
| `MissionCompleted` | Mission | — |
| `MissionClaimed` | Mission | Reward |
| `LoginRewardClaimed` | Mission | Reward |

**Reserved — declared in the union, not emitted anywhere:**
| Event | Reserved for | Notes |
|---|---|---|
| `ProfileUpdated` | User-Model/Profiling | carries no PII by design |
| `InterestsUpdated` | Interests | — |
| `InterventionScheduled` | Intervention/Communication | — |
| `StepMissed` | Intervention/Communication | `{ journeyId, stepId }` only — no user content |

Keeping these four in the union now means a future engine can subscribe/emit with **no union
churn** — adding real behavior later is additive, not a breaking change to the event contract.

---

## Reserved-seam note

The four FUTURE domains above are **boundary only** — an interface, a `Null*` inert
implementation, and an off feature flag. No feature logic, no data collection, no UI. This is a
deliberate application of two constitution rules:

1. **CLAUDE.md §3 "the vision never shrinks."** These domains are real product direction
   (adaptive personalization, proactive intervention, interest-based discovery, a deeper Support
   Circle) that is *hard or premature now*, not *wrong*. Reserving the seam means a future team
   can build behind these interfaces without re-deriving the boundary or destabilizing the event
   contract — the vision is preserved in code shape, not just in a doc.
2. **CLAUDE.md §5 routing.** Before any of Profiling, Intervention, or Interests gets real logic,
   the work must route through:
   - **security-privacy** — these are exactly the domains most likely to collect or infer
     sensitive signals; RLS design and data-minimization need review *before* implementation,
     not after.
   - **store-compliance** — if implementation changes what the app collects or how it behaves
     (e.g. proactive notifications beyond today's opt-in reminders), the App Store/Play Store
     privacy "nutrition label" must be updated as part of that work, not retrofitted later.

Turning a flag on without that review is out of scope for anyone touching these modules.
