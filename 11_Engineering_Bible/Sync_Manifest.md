# Sync Manifest — what must sync across devices / persist on the server

Status: **Living reference** (founder-requested, 2026-08-11, Decision Log D40). PushApp is offline-first,
single-user, on-device today (no backend beyond the `social`-flagged Supabase layer). Cross-device sync is
**deferred** until a backend lands, but the goal is that the app behaves **identically across a user's
devices**. This file lists every data area so that, when the server is connected, migrating the right data is
turnkey — and, just as importantly, marks what must **never** leave the device.

Classification per row:
- **Sync** — must reach the server and other devices to keep the experience consistent.
- **Derived-only** — the raw data stays on-device; only a minimal derived/whitelisted projection may sync.
- **On-device only** — a hard red-line (G1): raw self-disclosure never syncs.
- **Per-device** — intentionally NOT synced; re-derived locally on each device.
- **Already cloud** — lives on the server today (behind the `social` flag).

---

## 1. `AppState` blob (`EncryptedLocalRepository`) — `app/src/core/types/domain.ts`

| Field | Class | Notes |
|---|---|---|
| `dreams` | **Sync** | Identity/aspiration layer (coach-owned, D40). Server-authoritative once synced. |
| `journeys` (+ `steps`, incl. `done`, statuses, `plannedFor`, `dropped`, `lastReportClearedAt`, `postponedUntil`/`postponeCount`/`postponedAt`, `dreamId` + secondary links, future `seriesId`) | **Sync** | Core progress. Large; needs per-entity ids + a conflict/merge policy (deferred). |
| `checkIns` | **Sync** | Completion evidence; drives streak/progress. |
| `buddy` (level, XP, coins) | **Sync** | Gamification state; keep one authoritative copy. |
| `missions` (`MissionsState`) | **Sync** | Weekly missions + rollover; tie rollover to the synced week boundary (D33). |
| `streak`, `lastActiveDay` | **Sync** | Derived-ish but user-visible; sync to avoid divergence across devices. |
| `login` (`LoginState`) | **Per-device** / **Sync** | Auth/session is per-device; any streak-of-logins style data syncs. |
| `reminderRules` | **Sync (rules)** + **Per-device (OS ids)** | The RULES sync; the OS `scheduledNotificationIds` are re-scheduled locally per device — never sync them. |
| `communicationPrefs` | **Sync** | Account-wide comms preferences (incl. the unified communication style once added). |
| `schedulingPrefs` (incl. account **Active Hours** / per-day windows) | **Sync** | Account-level availability; must be identical across devices. Wall-clock intent (no fixed offset). |
| `entitlement` | **Sync (server-authoritative)** | Subscription/billing state — the server is the source of truth. |
| `onboardingCompletedAt` | **Sync** | First-run gate; a second device must not re-onboard. |
| `weekReviewAt` + any Weekly-Review proposal/snapshot | **Sync** | Cadence ledger + the ≤48h pending proposal (D40) must be consistent so a review isn't shown twice. |
| `reasonLog` (`ReasonEntry`, incl. `note` free text) | **On-device only** | G1 red-line: `other`/`did_partially` notes are raw self-disclosure. NEVER sync raw. |
| `behaviorLog` (`RawBehaviorRecord[]`) | **On-device only** | Raw behavior trace. Only the derived model may cross (below). |
| `insightModel` | **Derived-only** | May sync a **minimal** derived projection (the `deriveOutreachInsight` boundary) for outreach timing — never the raw log. |

## 2. Separate on-device stores (outside the `AppState` blob)

| Store | Class | Notes |
|---|---|---|
| `pushapp.profile` (`ProfileProvider`, D34) — display name, `@username`, form-of-address, `weekStartDay`, country, birth date, provider/email, future communication-style | **Sync** | Private self-view identity. Private fields never enter a friend payload (own-vs-friend boundary, D34). |
| `languagePreference` | **Sync** (or per-device pref) | Usually synced; could be per-device by choice. |
| Appearance/theme (Light/Dark/System) | **Per-device** | A device-local UI preference; sync optional. |
| `firstRunFlag` / seed guard | **Per-device** | Local boot guard; not synced (each device boots once). |

## 3. Already-cloud (Supabase, behind the `social` flag) — `app/supabase/schema.sql`

| Table | Class | Notes |
|---|---|---|
| `profiles` | **Already cloud** | Public identity subset. |
| `friendships` | **Already cloud** | Request/accept/remove loop. |
| `journey_allies` (+ future consent `status`) | **Already cloud** | Ally links; D40 adds a consent/acceptance gate + fixes the removed-friend read gap. |
| `progress_snapshots` | **Already cloud** | Masked Ally summaries (Encourager). Companion (D40) adds system-generated Step names+statuses only — **no images/UGC in MVP**; proof images belong to Accountability Ally (Future). |
| `cheers` | **Already cloud** | Realtime, RLS-enforced. |

## 4. Hard exclusions (never sync)

- Raw `reasonLog.note`, `behaviorLog`, coach conversation text, reflections, partial-report notes — **on-device only, forever** (G1).
- OS notification identifiers (`ReminderRule.scheduledNotificationIds`, `Step.postponeNotificationId`) — re-derived per device.
- Device permission state, ephemeral scheduling/eligibility env reads (location/calendar gating, G4).

## 5. When the backend lands — migration checklist (turnkey intent)

1. Assign stable ids to every synced entity (Dreams, Journeys, Steps, checkIns, reminderRules) — most already have `id`.
2. Define a conflict/merge policy per entity (last-write-wins vs field-merge); Journeys/Steps need care (a report on device A vs an edit on device B).
3. Sync `schedulingPrefs`/Active Hours + `reminderRules` as data; **re-schedule OS notifications locally** on each device from the synced rules.
4. Keep `entitlement` server-authoritative.
5. Enforce the G1 boundary at the sync layer: raw `reasonLog`/`behaviorLog` are filtered out; only the derived `insightModel` projection may cross, after a security-privacy decision.
6. Reconcile the week boundary (D33) + timezone/travel handling (deferred `Week_Boundary_Preference` IANA/multi-device work) before trusting cross-device week logic.
