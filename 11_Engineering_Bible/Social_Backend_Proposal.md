# Social / Allies Backend — Proposal (awaiting founder approval)

Status: **Open Question — NOT approved, NOTHING provisioned.** This document exists so the
decision is ready when the founder returns. Per `CLAUDE.md` §3.10 and the cost-guardian, no
account/service is created and no money is committed until the founder approves.

Stage: POC (the social/Allies pillar of `04_Product/POC_and_MVP_Scope.md` §1.3).

---

## 1. Why a backend is needed (and only here)

Four POC pillars — Journey loop, Buddy, Coins/Shop, Missions — are fully **local-first** and
already built at **$0** (device-only, `LocalRepository`). The **social / Allies** pillar is the
one exception: for a chosen circle of friends to **see each other's Journey progress and cheer**,
two people's devices must share state. That inherently requires a shared, networked backend
(auth + a little cloud data + realtime). This is the founder's core POC bet — "does social support
drive persistence" — so it's worth doing, but it's the first thing that leaves the free, local world.

## 2. What it must do (POC-thin)

- **Identity:** each user has an account (so friends can find and link to each other).
- **Support Circle:** add friends (mutual link).
- **Allies (per-Journey):** choose some friends as **Allies** on a specific Journey; an Ally sees
  that Journey's progress at the chosen **visibility level** (full · progress-only · anonymous —
  per `Product_Terminology.md`) and can **cheer / nudge**.
- **Shared progress:** publish a small progress summary (Journey title, % / streak, last check-in)
  to Allies — NOT the full local model.
- **Cheers:** an Ally sends a cheer; the owner receives it (realtime or on next open).

Explicitly **not** in the POC backend: groups, public/creator Journeys, marketplace, chat,
push-notification fan-out (POC cheers can surface in-app / via the existing local notification).

## 3. Architecture — behind the existing abstraction (no engine rewrite)

The core already isolates persistence: engines depend on the `Repository` interface
(`app/src/core/persistence/Repository.ts`), never a provider — its header already anticipates
"a cloud backend (e.g. Supabase, when the social pillar lands) implements the SAME interface."

The social pillar adds a **second, separate boundary** — it does NOT push the whole local model to
the cloud (that would violate Engineering Bible §8 "local before cloud"). Proposed shape:

- A new **`SocialGateway` interface** (pure TS, in `src/core/social/`) with the small surface the
  social pillar needs: `signIn`, `addFriend`, `setAllies(journeyId, …)`, `publishProgress(summary)`,
  `sendCheer`, `subscribeToAllyUpdates(...)`. Engines/UI depend on this interface only.
- A **`SupabaseSocialGateway`** implementation is the ONLY file importing the Supabase SDK —
  same vendor-isolation rule we already enforce for AsyncStorage (`LocalRepository`) and
  expo-notifications (`ReminderEngine`). Swapping providers later = one new file, no engine change.
- Local state stays authoritative for the user's own Journeys; only the **progress summary** and
  **social objects** (friends, allies, cheers) live in the cloud. Behind a **feature flag** so the
  four local pillars are unaffected if it's off or unreachable (Bible §14, graceful degradation §5).

Data model sketch (cloud side, minimal): `profiles(id, handle, buddy_summary)`,
`friendships(a, b, status)`, `journey_allies(journey_id, owner_id, ally_id, visibility)`,
`progress_snapshots(journey_id, owner_id, title, progress, streak, updated_at)`,
`cheers(id, from_id, to_id, journey_id, kind, created_at)`.

## 4. Recommended provider — Supabase (free tier)

- **Postgres + Row-Level Security** — RLS expresses Ally visibility rules cleanly (an Ally can read
  a snapshot only if a matching `journey_allies` row grants it at that level). Auth + Realtime
  included. SQL is portable (vendor independence — we could self-host or move later).
- **Client uses only the public `anon` key** (safe to ship in the app; RLS enforces access). The
  secret `service_role` key **never** ships in the client (Engineering Bible §12 — secrets never in
  clients). Config via `.env` (already git-ignored) → app config.

### 🛡️ Cost-guardian assessment
- **POC scale (founder + a handful of friends): $0.** Well inside Supabase's Free tier.
- Free-tier limits (approximate — cost-guardian will re-verify the current numbers at signup before
  anything is created): ~**500 MB** Postgres, ~**1 GB** file storage, ~**5 GB** egress/month,
  ~**50,000** monthly active auth users, **2** active projects. Our POC data (tiny rows, no media)
  is a rounding error against these.
- **The one gotcha to know:** a Free-tier project **pauses after ~7 days of inactivity** and must be
  un-paused manually (no charge — just a manual resume). Fine for a POC used intermittently.
- **No credit card required** for the Free tier. There is **no path to a charge** unless the founder
  later deliberately upgrades to Pro (~$25/mo) for scale/always-on — which is a Commercial-stage
  decision, not now. cost-guardian will warn before any such upgrade.
- **Alternative considered:** Firebase (Spark free tier) — comparable and also $0, but NoSQL makes
  the per-Journey Ally-visibility rules clumsier than Postgres RLS, and it's less portable. Supabase
  preferred; either keeps us at $0 for the POC.

## 5. Privacy & security (security-privacy pre-notes)

- **Data minimization** (Bible §8): publish only a progress *summary* to Allies, never the full
  Journey/reflection content. Respect the visibility level (full / progress-only / anonymous).
- **RLS by default**: a user reads only their own data + snapshots explicitly shared with them.
- **Consent**: becoming someone's Ally / sharing a Journey is an explicit user action.
- **Secrets**: only the public anon key in the client; service key stays server-side/never shipped.
- A full security-privacy review runs **before** this pillar ships (Bible §12, CLAUDE.md §5).

## 6. What I need from the founder to proceed (all $0)

1. **Approve** using Supabase Free tier for the POC social pillar (no charge, no card).
2. **Create a free Supabase account + project** (or approve me guiding you through it), then share the
   **project URL** and **public anon key** (both safe to hand over / commit to `.env.example`
   placeholders). Do **not** share the service_role key.
3. Confirm the **visibility model** for the POC (I propose: default *progress-only*, with *full* and
   *anonymous* as options), and whether cheers should trigger a local notification.

Until then: nothing is provisioned; the four local pillars stand alone and the app remains fully
functional and $0. On approval, this proposal becomes engineering decision **E2** in
`Engineering_Decisions.md` and the pillar is built behind the `SocialGateway` interface + feature flag.
