# CHANGELOG

Status: Living Document

---

# 2026-08-09 (SESSION 2) — Secondary-screen i18n finished, coach meta-agent voice fix (D30), Journey `status` field + Freeze/Resume (J3), Coins hidden (B1) (branch `feat/buddy-3d-and-reminders`, UNCOMMITTED)

Continuation the same day. **Nothing committed** (autonomous execution per the founder). Verified:
`tsc` clean, `eslint` 0 errors, **jest 533/533 across 56 suites** (from 515/55 at the start of this
session). Full narrative + the ordered work plan: `Current_Context.md` → "⭐ HANDOFF SNAPSHOT —
2026-08-09 (SESSION 2 / continuation)". Highlights:

- **i18n screen translation finished for the secondary screens** — new namespaces `circle`, `inbox`,
  `explore`, `buddy`, `shop`, `missions`, `achievements` (en+he, 14 total at parity); reason copy moved
  into the `journey` ns behind framework-free helpers. Engine/config/dev-sample DATA strings stay English
  by design (a later config-i18n / H1 pass).
- **Coach: the meta-agent is now the sole user-facing voice** (`CoachOrchestrator.metaVoiced`, Decision
  Log **D30**) — expert questions are re-voiced from the meta-agent's own `interview.<intent>` template,
  deterministically (no added LLM call). The 4 domain experts need no user-facing translation (internal
  tools).
- **`Journey.status` field** (`active`/`frozen`/`completed`/`abandoned`) — the authoritative tab/lifecycle
  source of truth, with backward-compat derivation; set explicitly by the engine.
- **J3 — Freeze/Resume a Journey (DONE)** — engine methods + `JourneyFrozen`/`JourneyResumed` events +
  AppCore reminder reconcile; the scheduler skips frozen Journeys; Pause/Resume button + "Paused"
  banner/pill in the UI.
- **B1 (partial) — Coins hidden in the initial version** (D29): `TopStatusBar` no longer shows Coins (the
  engine keeps accruing them). The breadth-leveling reframe is still open (needs design).

---

# 2026-08-09 (SESSION 1) — Initial-version (MVP) scope defined + build begins: i18n infra, coach-led Journey editing, account deletion/export, real StreakEngine (branch `feat/buddy-3d-and-reminders`, UNCOMMITTED)

Working session with the founder that (a) defined the concrete initial-version (MVP) scope as a
granular checklist and (b) began building it. Cross-reference: `06_Decisions/Decision_Log.md`
**D29** (the scope decisions) and `04_Product/MVP_Task_List.md` (the full checklist, created this
session — 21 tracked items, IDs A–P). **Nothing in this entry has been committed** — the working
tree is uncommitted; the founder authorized autonomous execution. Verified: `tsc` clean, `eslint` 0
errors, **jest 499/499 passing across 52 suites** (grew from 468 at session start).

> **⏩ SESSION-END ADDENDUM (the session continued past this entry's mid-session state; final
> hand-off = `tsc` clean, `eslint` 0 errors, `jest` 515/515 across 55 suites, STILL UNCOMMITTED):**
> - **J2 — delete/abandon a Journey: DONE** (verified in web preview). `JourneyEngine.deleteJourney`
>   + `AppCore.deleteJourney` (new `JourneyDeleted` event → persist + reminder reconcile) + a
>   destructive "Delete journey" button and confirm Modal on `journey/[id].tsx`.
> - **i18n screen translation advanced from PARTIAL to the CORE surfaces** (Batches A/B/C-UI/C-Lang-1):
>   Settings, Home + all home components (incl. `SwipeableStepRow` RTL), Journeys, `journey/[id]`,
>   `journey/new` wizard, all `journey/*` components, the Coach UI chrome — all translated + RTL-safe.
>   **The coach now converses in Hebrew** for the general path (interviewPlaybook + meta questions +
>   GeneralExpert via a new `coachContent` namespace + a Gemini locale directive; domain/kind enums
>   stay English). 7 namespaces at en/he parity (`parity.test.ts`).
> - **Journey detail Steps → WEEKLY PAGER** (founder design change, verified): "Steps by week" with
>   ‹ › arrows + "Week X of Y" + one week's Steps at a time; grouping via `stepsByWeek` in
>   `journeyView.ts`.
> - **STILL NOT DONE (next session):** i18n for Inbox/Circle/Explore + `reasons.ts` (Batch D failed
>   twice on infra flakiness), Buddy/Shop/Missions/Achievements, the 4 domain experts' Hebrew content,
>   and a device RTL sweep. Then J3/J4/L1/P1.
> - **Infra note:** the background-subagent layer went flaky mid-session (4 failures: stream stalls +
>   "connection closed mid-response") then recovered — transient API/streaming instability on long
>   agent runs, worsened by a very long main-session context. Next session: fresh lean context, small
>   batches.

## Scope
- `04_Product/MVP_Task_List.md` added — the single granular checklist for the post-pivot
  initial-version build, with per-feature status (✅/🟡/⛔/🔒) and priority.
- `06_Decisions/Decision_Log.md` **D29** — confirmed IN the base version: edit a Journey
  (coach-led via a pencil button), delete/abandon a Journey, first-run onboarding +
  notification-permission ask, multi-language i18n with Hebrew + RTL, account deletion/export.
  Resolved: Coins hidden in MVP (kept in the engine, no Shop sink); the manual Journey wizard kept
  as a coach-first fallback; a minimal friend profile page IN; messaging + Channels/Groups deferred
  post-MVP; Journey Freeze/Resume IN; reminder management for existing Journeys IN; a
  deferred-goals ("parked goals") surface IN, minimal.

## Added — i18n infrastructure (task N1, PARTIAL)
- `i18next` + `react-i18next` + `expo-localization` (all free, no cost gate).
- `app/src/state/LanguagePreference.tsx` — persists `pushapp.languagePreference`; defaults to the
  device locale, falls back to English.
- A searchable, alphabetical language picker at `app/src/app/settings/language.tsx`.
- `app/src/i18n/` — `index.ts` (namespaces `common`/`settings`/`home`/`journeys`/`journey`),
  `rtl.ts` helpers, English + Hebrew resource files.
- `RestartPrompt` component for RTL/LTR direction flips (Expo Go has no auto-reload on locale
  change). The Settings screen is fully translated.
- **Not yet done:** `journeys.tsx`, `journey/new.tsx`, most home/journey components, Coach, and the
  secondary tabs are not migrated (English only, no crash). Full RTL layout is code-level only —
  **not device-verified** (web preview cannot exercise `forceRTL`).

## Added — J1: coach-led Journey editing
- A pencil button on the Journey screen opens the coach in edit mode; it proposes a validated
  structured diff; the user approves; `AppCore.updateJourney` applies it immediately, preserving
  Step ids, check-in history, and XP. Gated on `featureFlags.liveCoach`; blocked on completed
  Journeys. New `JourneyUpdated` event.
- New files: `app/src/core/coach/journeyEdit.ts`, `app/src/core/coach/JourneyEditOrchestrator.ts`,
  `app/src/components/coach/useJourneyEditCoach.ts`,
  `app/src/components/coach/CoachEditProposalCard.tsx`, `app/src/components/coach/EditCoachScreen.tsx`.

## Added — O1: account deletion + data export (built, not deployed)
- Settings gained a "Your data" section: **Export** (`expo-sharing`, writes to cache then deletes
  the temp file) and a destructive **Delete** (confirmation sheet; remote-first, refuses when
  offline; post-delete the app returns to a clean first-run via a persisted `firstRunFlag`
  seed-guard so demo data does not re-seed after deletion).
- `AuthGateway.deleteAccount` + the Supabase implementation; `AppCore.exportStateJson` +
  `AppCore.resetToFirstRun`; `app/src/components/settings/DeleteAccountSheet.tsx`;
  `app/src/state/useAccountActions.ts`.
- An Edge Function is **written but not deployed**: `app/supabase/functions/delete-account/index.ts`.
  Deploying it, plus hosting a Google Play public account-deletion URL, remain founder pre-release
  actions.

## Added — B2: real StreakEngine
- Replaces the hard-coded streak placeholder with a real day-count that increments once per new
  check-in day and resets to 0 only on an **URGENT** missed Step (config-driven "no slack" urgency
  logic in `app/src/core/util/urgency.ts` + `app/src/core/config/streak.ts`; engine at
  `app/src/core/engines/StreakEngine.ts`).
- **Known limitation:** the reset depends on the `StepMissed` event, currently only emitted when
  `featureFlags.adaptiveCoach` is on — works correctly on the founder's device, but in general
  production the streak would only increment (never reset) until the miss-producer runs un-gated.
  Logged as an explicit follow-up, not a silent gap.

## Changed — two founder-requested design fixes (verified in web preview)
- The Home top-bar level/XP meter shrunk to ~¼ its former width.
- The "This week" Dream rail now connects node-centres only (no overshoot past the end dots) and
  is hidden entirely when a Dream group has only a single Step.
- Fixed a spurious `RestartPrompt` that incorrectly appeared on the language screen at app boot —
  it now only shows after a deliberate language change.

## Status
- **Not committed.** Working tree only, on branch `feat/buddy-3d-and-reminders`. `tsc` clean,
  `eslint` 0 errors (101 pre-existing style warnings, unrelated), jest 499/499 across 52 suites.

## Next
- See `Current_Context.md` → "⭐ HANDOFF SNAPSHOT — 2026-08-09" → "Still open / next": finish the
  i18n screen-migration in controlled batches, then continue down `04_Product/MVP_Task_List.md`
  (J2 delete/abandon a Journey is already in progress).

---

# 2026-08-06 — Conversational coach built out: understanding-based multi-goal triage, SX realigned to 4 domains, communication-style + frequency-based scheduling infra, design brief + authoring guide (branch `feat/buddy-3d-and-reminders`, unmerged, behind off-by-default flag)

Continues the 2026-08-05 sprint below on the same branch and flag. Test suite grew **177 → 449**
(41 suites), all green; `tsc` clean throughout. Cross-reference: `06_Decisions/Decision_Log.md`
**D23** (the pivot) and the new decision entries this session added (domain realignment, the
framework-not-content philosophy, the UX/design bundle, paid Gemini tier, single-user auth).

## S2 — conversational coach: understanding-based multi-goal triage
- The coach front door is now a **single "understanding" LLM call** that reads the user's free-text
  goal, detects **multiple** distinct goals (each tagged `kind: recurring | process` + `domain`),
  reflects them back to the user in one message, and **focuses one** to interview now while the
  rest are deferred on-device (not dropped).
- The focused goal is **routed to a `DomainExpert`**, whose own interview drives **closed-option
  chip questions (+ an "Other" free-text escape hatch)**, one question at a time, some multi-select,
  followed by a feasibility/reality-check step before a plan is produced.

## SX — realigned to four new domains (replaces the four first-cut experts)
- **Addiction · Relationships & Loneliness · Body Image (nutrition+fitness) · Career** replace the
  earlier first-cut set (`recovery`, `self-confidence`, `nutrition`, `sport`) recorded in the
  2026-08-05 entry below. New files: `app/src/core/learning/experts/AddictionExpert.ts`,
  `RelationshipsExpert.ts`, `BodyImageExpert.ts`, `CareerExpert.ts`, plus a shared `expertKit.ts`
  and a `registry.ts` with human-readable `displayName`s for each domain.
- **Addiction and Relationships & Loneliness are the two most sensitive domains** and are gated:
  they stay flag/dev-only until the safety floor (below) and a clinical review land — not yet
  cleared for a real user.

## Communication-style infrastructure
- `app/src/core/coach/communicationStyles.ts` — four named styles (**Steady · Direct · Gentle ·
  Spark**). Only **Steady** (professional, warm, accepting, non-judgmental, plan-oriented,
  explicitly not a therapist) is populated; the other three are intentional empty stubs for later
  personalization work, not forgotten gaps.

## Frequency-based scheduling + "honor time"
- Domain-expert plans are now expressed as **frequency** ("≈N×/week, flexible days") rather than
  fixed calendar dates, unless the user explicitly names specific days — reflecting that most goals
  (workouts, check-ins, social outreach) don't have a real fixed slot and forcing one creates false
  misses.

## Privacy / persistence (carried forward, already noted 2026-08-05, reconfirmed still in place)
- `EncryptedLocalRepository` and the `deriveOutreachInsight` boundary remain the S0 foundation this
  session builds on; no change to their design this session, but the **outbound-redaction wiring
  (`redactForCloud`) is still an open follow-up**, not yet connected to the live LLM call path.

## Design / product docs added
- **`04_Product/UX/App_and_Screens_Design_Brief.md`** — comprehensive design brief: reuse the
  existing app design (minimal visual change), remove the avatar/Buddy tab and the Shop tab; Home
  priority = weekly tasks (incl. an urgent/"today's-focus" block) → Coach CTA → Friends (3
  need-help + 3 deserve-encouragement) → My Journeys; streak breaks only on an urgent miss; levels
  kept but reward breadth (parallel Journeys) not depth; Dream = coach-suggested / user-approved
  Journey grouping; Journey editing led by the coach + a Freeze/Resume button; Step reporting is
  small and emotional (happy Done / sad Couldn't / Partial / Postpone); the whole coach conversation
  runs on-phone; the people/support layer (Ally, Support Circle, reciprocal friends, Dream
  Communities) is first-class in the brief, not an afterthought. **Not yet final** — the founder is
  getting a second, external-AI design proposal before any screens get wired.
- **`04_Product/Domain_Expert_Authoring_Guide.md`** — a colleague-facing guide for authoring a new
  domain expert's interview + knowledge without needing to read the engine code.
- **`04_Product/Build_Plan_and_Method.md`** and **`04_Product/Miss_Recovery_PRD.md`** also present
  in the working tree from this stretch of work (see `Current_Context.md` for their current role in
  the S0–S7 method).

## Testing infra
- `npm --prefix app run coach` — interactive dev harness; `COACH_SCRIPT=<path> npm run coach` —
  scripted run (see `app/src/core/coach/sample.script.txt`). Runs against **paid** Gemini
  (`gemini-2.5-flash`, founder-approved ~$10/mo cap, key in git-ignored `app/.env.local`).

## S3 auth — in progress
- Single-user Supabase sign-in + UID verification built (`app/src/core/auth/`: `AuthGateway.ts`,
  `SupabaseAuthGateway.ts`, `authUser.ts`, `singleUser.ts`). Not yet activated — needs the founder
  to set a Supabase password for `guynoiman3@gmail.com` and populate three
  `EXPO_PUBLIC_SINGLE_USER_*` env vars.

## Open follow-ups (explicit next tasks, not silent gaps — carried and expanded from 2026-08-05)
- Reconcile the `Phase` → `Milestone` rename across remaining docs/code (still deferred).
- Harden device crypto (authenticated encryption + secure RNG).
- A completed-Journey `atRisk` nit in the behavior model.
- Wire `redactForCloud` on the outbound LLM path before real users reach it.
- **Build the safety floor**: bilingual (Hebrew/English) inbound crisis-detection + escalation,
  disclaimers/consent, hardened `SafetyLayer` + substance-use gating — required before Addiction and
  Relationships & Loneliness can leave flag/dev-only status, alongside a clinical review.

## Status
- Not merged to `main`. 449/449 tests green, `tsc` clean. Founder is getting a second design
  proposal before screens get wired — see `Current_Context.md`'s 2026-08-06 snapshot for the full
  next-steps order.

## Next
- See `Current_Context.md` → "⭐ HANDOFF SNAPSHOT — 2026-08-06" → "Next steps, in order".

---

# 2026-08-05 — AI-adaptive-coach pivot: S0–S2 built and proven, SX in progress (branch `feat/buddy-3d-and-reminders`, unmerged, behind off-by-default flag)

Cross-reference: `06_Decisions/Decision_Log.md` **D23** (the pivot decision this sprint implements)
and `11_Engineering_Bible/Engineering_Decisions.md` **§E5** (the hub-and-loop architecture). Follows
the founder's working method (`04_Product/Build_Plan_and_Method.md`): one status-tracked S0–S7 task
list, sequential, each component built + tested in isolation before integration. **Everything below
ships behind the off-by-default `adaptiveCoach` feature flag
(`app/src/core/config/featureFlags.ts`) — the existing engine (Journey/Reward/Buddy/Shop/Mission/
Reminder/Auth/Social/Entitlement) is untouched when the flag is off.**

## S0 (done) — foundation, docs-only
- Pivot recorded (D23); **Milestone** adopted as the canonical mid-layer term (supersedes the
  working name "Phase" for new work; a full reconciliation pass across remaining docs/code is a
  separate, deliberately deferred task).
- **Hub-and-loop architecture** designed (`Engineering_Decisions.md` §E5) +
  `04_Product/Build_Plan_and_Method.md` written (the S0–S7 + SX task-list method).
- **Encrypted local store** — AES encryption + `expo-secure-store`, with migration and key rotation.
- **Privacy types** + the **`deriveOutreachInsight` boundary** (raw personal disclosures never leave
  the device; only a minimal derived insight — enums/buckets, no free text — may cross it, and only
  to power outreach timing) + guard tests + a `NullInsightGateway`.

## S1 (done, PROVEN) — the adaptive engine
- **Planner** (goal → Journey), a **DomainExpert** seam + `GeneralExpert` (the domain-agnostic
  default expert), **BehaviorModelEngine** (on-device raw behavior log + a slip detector — the first
  producer of `StepMissed`), **AdaptivePlanner** (`replan` + `applyReplan`), a **CoachNarrator** seam.
- A **headless simulation running 4 personas** proves the closed loop (behavior → insight → re-plan
  → nudge → behavior) actually adapts: compress/shrink/shed/at-risk responses, weekend-concentration
  detection, and early-warning behavior.
- Wired into `AppCore` behind `featureFlags.adaptiveCoach`.

## S2 (done, testable) — the conversational coach
- **Gemini client** behind an `LlmClient` seam (`gemini-2.5-flash`; API key in a git-ignored env
  file — no silent spend per CLAUDE.md §3.10).
- Editable **interview playbook** + coach prompts; a **Coach Orchestrator** where the playbook
  controls *what* to ask and the LLM only handles phrasing/parsing, not decision logic.
- A hardened disclosure parser, a **SafetyLayer**, `GoalSpec` → Journey conversion.
- An interactive dev harness (`npm --prefix app run coach`) to test converse → build →
  report/non-report → adapt live.

## SX (in progress) — domain-expert validation track
- Four first-cut `DomainExpert`s (recovery, self-confidence, nutrition, sport) + a registry, built to
  validate the expert-partition seam introduced in S1. Per-domain knowledge bases and a
  safety/clinical review are the next phase before any of these are real. Per D23, SX is explicitly
  **Future Vision** — parallel to, not part of, the sequential S0–S7 spine.

## Test suite
- Grew from 177 → 338 tests, all green; `tsc` clean throughout.

## Open follow-ups logged (explicit next tasks, not silent gaps)
- Wire outbound redaction before real users reach this path.
- Harden device crypto (authenticated encryption + a secure RNG).
- A completed-Journey `atRisk` nit in the behavior model.
- Reconcile the `Phase` → `Milestone` rename across the remaining docs/code that still use "Phase"
  as the mid-layer term (D23 flagged this as deliberately deferred at pivot time).
- A safety/clinical review must gate the sensitive SX domains before they get real knowledge bases.

## Status
- Not merged to `main`. Founder's working method: one status-tracked S0–S7 (+SX) task list,
  currently **~29/51 tasks done**.

## Next
- Continue the SX per-domain knowledge-base + safety-review track, or resume the sequential S0–S7
  spine — founder's call. See `04_Product/Build_Plan_and_Method.md` for the full stage table.

---

# 2026-07-20 — Hopper in Buddy tab + backend-health + dev tooling + competitive research v2 (merged to `main`); strategy thinking captured (WIP)

Branch `feat/buddy-3d-and-reminders`; `main` fast-forwarded to include this work. Six topic commits
plus a merge that also brought the earlier panel-position fix onto `main`.

## Shipped code
- **feat(buddy):** the registry-driven 3D Hopper now renders in the Buddy tab (2D egg replaced there
  only). `BuddyView` gains an additive `transparent` prop so the creature composites over the forest
  scene; the `/buddy3d-spike` route keeps its opaque default. Verified on device (Expo Go); web
  cannot render GLB.
- **fix(social):** `backendHealth.ts` — one cheap `/auth/v1/health` probe at startup; unreachable or
  5xx ⇒ `stopAutoRefresh()` and the social/auth/entitlement pillars degrade quietly (no red
  "Network request failed"). Prompted by a deleted Free-tier Supabase project (DNS NXDOMAIN); 4xx =
  healthy, 5xx (Cloudflare 521 during restore) ≠ healthy.
- **chore(dev):** `npm run dev` binds Metro to the Mac's Bonjour hostname so the Expo Go recent-URL
  survives DHCP IP changes; `tools/supabase_keepalive.sh` + `install_keepalive.sh` + launchd plist =
  weekly $0 keep-alive so the Free-tier project never idles out (installed copy lives under
  `~/Library/Application Support` — macOS TCC blocks launchd under `~/Documents`).
- **docs(research):** `05_Research/PushApp_Competitive_Research_v2_2026-07` (.docx + .pdf) — 15
  competitors, official App-Store screenshots, per-competitor AI-implementation tables, original 8
  comparison tables carried over, "what died and why" chapter, NLP evidence + claim-risk. Hebrew RTL.
- **feat(ui):** resource-bar polish (founder art direction). **assets(buddy):** Hopper v3 package.

## Strategy — WORK IN PROGRESS (not decided)
- `04_Product/Strategy_WIP_2026-07/` (README + 3 standalone HTML visuals for a future deck).
  All **Open Questions**, none logged to Decision_Log yet: Finch as benchmark + the defensible trio;
  "Ignition, not Maintenance" reframe; AI economics/architecture (Haiku + caching, Level-1-first,
  no model training); the miss-recovery closed-list→AI funnel with rule-based reason→lever mapping;
  categories **Option B chosen** (build `categories.ts` + `Journey.categoryId`, not yet done).

---

# 2026-07-14 — Buddy 3D registry + texture fix + 17 species; finite-step Journey model + Reminder
# engine + Communication Scheduler; UI polish pass (branch `feat/buddy-3d-and-reminders`, unmerged)

All work below is on branch **`feat/buddy-3d-and-reminders`** — **not yet merged to `main`**.
Five commits: `943c732`, `ec69977`, `69d8616`, `d9e5866`, `75f0a36`.

## Decisions (Decision_Log D20–D22)
- **D20** — notification-permission ask folded into onboarding (not a separate later prompt).
- **D21** — a notification/communication-management mechanism (the Communication Scheduler) with
  optional, opt-in, location/calendar-based reminder rules; background geofencing explicitly
  deferred; new privacy red-line **R3** (raw location/calendar data stays on-device only, never
  synced) — numbered R3 to avoid colliding with the existing R1/R2 auth-session red-lines already
  defined in `11_Engineering_Bible/Auth_Backend_Proposal.md`.
- **D22** — keep the "Phase" display name (no rename).

## Added — 3D Buddy / creatures (`943c732`, `d9e5866`)
- Adopted the founder's **PUSh Creature SDK v1.0** (`app/assets/buddies/_sdk/`).
- `app/tools/ingest_creature.py` — hybrid ingest pipeline (embedded-GLB **or** external
  `materials.json` package) → small modular per-species packages + a generated registry
  (`app/src/core/buddies/registry.generated.ts`).
- `app/src/components/buddy3d/BuddyView.tsx` — the sole `three`/`expo-gl` import boundary; the
  `/buddy3d-spike` route now flips through species for visual QA.
- **17 species ingested** (~1–2.4MB each), superseding the throwaway `hopper_v1`/`hopper_v2` spike
  assets (kept for provenance).
- **RN texture-render fix:** r3f-native's `TextureLoader` uploads no pixels on RN/expo-gl for
  external (non-embedded) textures; fixed via a pure-JS PNG decode (`upng-js`) →
  `THREE.DataTexture` path. `BuddyView` now applies `map`/`normalMap`/`emissiveMap` this way.
  Ingested the detailed **v3 Hopper** (painted albedo + normal maps + glowing face) through this
  fix — **not yet confirmed on-device** (paint/flipY/tuning pending); geometry still 21.6MB
  (low-poly regen requested; spec at `app/assets/buddies/_sdk/docs/EXPORT_SPEC_v3_detailed.md`).

## Added — Reminders / Journey model (`ec69977`, `75f0a36`)
- **Journey model confirmed:** a Journey holds a FINITE set of Steps, each completed once (→
  per-Step celebration via `StepCheckedIn`), and completes when the LAST Step is done. Recurring
  "weekly copies" via the Weekly-Planning flow (D12) is a later, separately-sequenced task.
- Reminder engine core: `ReminderRule`, `ReminderEngine.scheduleRule`, `NullLocationGateway` /
  `NullCalendarGateway` behind feature flags (dormant seams, per the E4 reserved-seam pattern).
- **Communication Scheduler** (`app/src/core/engines/CommunicationScheduler.ts`): aggregates all
  active-Journey reminders, applies `SchedulingPrefs` (`preferredDays` hard filter; allowed-window
  + morning/evening clamp), enforces the iOS 64-local-notification cap
  (`app/src/core/config/schedulerLimits.ts`), emits `SchedulerCapped` when reminders were dropped
  to stay under it.
- Onboarding reframed as a **MISSION-based flow**: create a Journey / open the Shop / enable
  notifications / personality quiz → XP → egg hatches. The personality quiz targets the reserved
  `ProfileGateway` seam (E4) and **must pass a security-privacy review before storing anything**.

## Changed — UI polish pass (`69d8616`)
- Home: dynamic sheet height bounded (no longer covers the Buddy); compact tab bar; internal list
  scroll; new "My Journeys" area tile (Missions tile moved right) with a done/total count; Step rows
  gained a ⋯ menu + Reschedule modal.
- Resource bar: coin-stack display, GT shield icon, unified level+XP frame.
- Completed Steps stay visible (green, no DONE watermark) + a check-in celebration.
- Buddy tab: inventory flush; name/stage now render below the meter.
- "My Journeys" screen tabbed; Explore gained search + clear; journey-creation wizard now uses
  `KeyboardAvoidingView`; Missions modal background made transparent.

## Status
- Not merged to `main`. This session's UI polish has **not yet been device-verified**, unlike prior
  fidelity passes. The v3 Hopper texture fix has **not yet been confirmed on-device**.

## Next
- Founder approves the UI polish pass on-device; founder reviews the primary-CTA "quests" reference
  and the 4-area-tile redesign-proposal artifact; decide onboarding mandatory-vs-skippable; get a
  low-poly Hopper v3 regen from the founder; then wire the 3D renderer into the real Buddy tab behind
  `featureFlags.buddy3d`.

---

# 2026-07-12 — Module architecture doc + reserved seams for future domains (E4)

An architecture audit confirmed the codebase already follows modular boundaries (framework-free
engines over an event bus, vendor-isolated `*Gateway`s with `Null*` fallbacks, config-before-code,
offline-first Repository, no business logic in UI). This session made those boundaries explicit
and reserved four future-domain seams so a future team can build behind a stable interface.

## Decisions (Engineering_Decisions E4)
- Document the module map so "who owns this, what can it depend on" is answered by a doc.
- Reserve boundary-only seams (interface + `Null*` + off feature flag) for four vision domains —
  no feature logic, no data collection, until each passes a security-privacy (and, if it changes
  data collection, store-compliance) review per CLAUDE.md §5.

## Added
- **`11_Engineering_Bible/Module_Architecture.md`** — the canonical module map: every BUILT domain
  (Journey, Reward, Buddy, Shop, Mission, Reminder, Auth, Social, Entitlement) and every FUTURE
  domain (User-Model/Profiling, Intervention/Communication, Interests, Close-Circle-deeper), each
  with responsibility / team boundary / public interface / events / data ownership / status, plus
  the full event-contract table.
- `app/src/core/profile/` — `ProfileGateway` + `NullProfileGateway` + factory,
  `featureFlags.profile` (off). `UserProfile` type is PII-free by design (derived/aggregate
  traits only).
- `app/src/core/interests/` — `InterestsGateway` + `NullInterestsGateway` + factory,
  `featureFlags.interests` (off). Topics are user-chosen, never inferred.
- Four reserved (declared-but-never-emitted) members on the `DomainEvent` union
  (`core/events/events.ts`): `ProfileUpdated`, `InterestsUpdated`, `InterventionScheduled`,
  `StepMissed`.

## Changed (behavior-preserving tidy-ups, found while drawing the boundaries)
- `ReminderEngine` constructor now takes an **optional** `EventBus` (stored only, nothing
  subscribed) — the future attachment point for an `InterventionEngine`; zero behavior change.
- `JourneyEngine.journeyProgress()` selector added — progress math moved out of `SocialProvider`.
- Shop catalog now accessed via `AppCore.getCosmetics()` / `resolveCosmetic()` — out of Buddy
  components, which previously imported Shop's config directly.
- `EntitlementEngine` now constructed inside `AppCore`, not in `EntitlementProvider`.

## Status
- Landed in commit `746c685`. `tsc` 0, jest 87/87 (incl. 2 new seam tests), eslint clean, no PII,
  no new dependencies, **zero user-visible behavior change**.

## Next
- The three reserved domains (Profiling, Intervention, Interests) stay off until each is
  explicitly scheduled and passes security-privacy (+ store-compliance if it changes data
  collection) review. Close-Circle-deeper remains fully deferred with no seam yet.
- Unrelated open items carried forward unchanged: Buddy art direction, Buddy inventory interior,
  the ~$99/yr Apple Developer Program approval for P3+ native auth, deferred data-model wiring.

---

# 2026-07-10 — Auth foundation: vendor-isolated AuthGateway + AuthProvider + secure-store (E3, D19)

Approved and began building real-account auth (Sign in with Apple + Google), split into a free
architecture phase (built today) and a later paid native phase (awaiting founder go-ahead).

## Decisions (Decision_Log D19, Engineering_Decisions E3)
- **Auth method = Apple + Google sign-in**, passwordless (no email/password, no SMTP).
- **Do NOT collect the user's real name** — identity stays handle + Buddy; email quarantined in
  Supabase's `auth.users`, never in `public.*`.
- **Build the free foundation (P1–P2) first, at $0, zero behavior change.** The ~$99/yr Apple
  Developer Program + native Apple/Google + dev build (P3+) is a separate, later approval.

## Added
- `11_Engineering_Bible/Auth_Backend_Proposal.md` — the full plan (architecture, privacy
  red-lines, store-compliance checklist, cost table, 7-phase rollout), synthesized from
  architect · security-privacy · store-compliance · cost-guardian.
- `app/src/core/auth/` — vendor-isolated `AuthGateway` interface + `AuthUser` (no PII) +
  `NullAuthGateway` + `SupabaseAuthGateway` (reuses the existing Supabase client; Apple/Google
  methods declared but throw `AuthNotAvailableError` until the P3+ native build) + factory +
  pure `toAuthUser` mapper.
- `AuthProvider` (`app/src/state/`) — owns anonymous session bootstrap, composed outside
  `SocialProvider` in `_layout.tsx`. `featureFlags.auth`.

## Changed
- `SocialProvider` no longer self-initiates anonymous sign-in — it now reacts to the auth uid;
  the `cheers` realtime subscribe takes an explicit uid (fixes a bind race found in review).
- **R2 hardening:** Supabase session storage moved from plaintext AsyncStorage to
  `expo-secure-store` on native, with byte-safe UTF-8 chunking and generation-based atomic
  writes (web unchanged — keeps AsyncStorage, no OS keychain equivalent there).

## Status
- Landed in commit `2af2468`. **Zero user-visible change** — the app still boots anonymous.
  `tsc` 0, jest 55/55 (new PII-stripping, byte-boundary, corruption→logged-out, write-rollback
  tests). Code-reviewed; findings fixed.
- P3+ (native dev build, real Apple/Google sign-in, account deletion, privacy policy) is gated
  on founder approval of the ~$99/yr Apple Developer Program — the only unavoidable cost.

## Next
- Founder decides on the Apple Developer Program approval to unblock P3–P7. Independently: the
  design/data-model open items from the prior snapshot (Buddy art direction, inventory interior,
  deferred data-model wiring) remain open and can proceed in parallel.

---

# 2026-07-10 — v14 design-fidelity pass: full mockup screen set gets a first-pass native build

Closed the "fidelity pass" item left open by the earlier 2026-07-10 session (5-tab nav + Journeys
cluster). Ten commits on `main`, `tsc` clean throughout, each screenshot-verified against its mockup.

## Added
- **Weekly planning** screen (`app/weekly-planning.tsx`, mockup screen-18) — the last v14 screen that
  had no route.
- Shared primitives: `ResourceBar` (floating level+XP / GT / coins strip) and `GlossyTile` (3D squircle
  button), used across Home and Buddy.
- `BuddyInventory` (5 category tabs, item grid, Select) as one unified framed sheet.
- `FriendRow` + `FriendActionMenu` components for the Friends fidelity pass.
- eslint + `eslint-config-expo` dev tooling (`app/eslint.config.js`).

## Changed
- **Home** (screen-01) rebuilt: ResourceBar + "Hello" speech bubble + centered Buddy flanked by 4
  GlossyTile area buttons + cream Week's-steps panel; `StepCard` upgraded (icon tile, Journey·Phase
  line, progress bar, states); `journeyGlyph()` shared via `journeyView.ts`.
- **Buddy** (screen-10) rebuilt, then refined per founder feedback: full-bleed edge-to-edge scene with
  the ResourceBar floating over it; inventory unified into one framed sheet (grabber, rounded top,
  hairline + upward shadow).
- **Bottom nav**: 5 icons (Ionicons, per-tab active accents, Inbox unread dot) in `app-tabs.tsx` /
  `app-tabs.web.tsx`; fixed a web-harness bug where the tab strip overlaid the top ~140px of every
  screen. Documented in `Screen_Bible.md`.
- **Shop** (screen-11): structured header, glossy coin pill, Featured/Cosmetics/Coins/Offers sub-tabs,
  glossy item cards with price chips.
- **Friends** (screen-09): Needs-your-cheer + A-Z Your-friends sections, Cheer CTA, 3-dot menu — closes
  the gap `04_Product/UX/Design_Fidelity_Audit.md` §09 had already flagged as fixed.
- **Missions + Login** (screen-16/17): floating modal, gold-underline tabs, Daily/Weekly pill switch,
  three mission states, 7-day login rail.
- **Journey-creation wizard** (screens 05-08): Name/description, duration/rhythm with a fixed tooltip,
  Plan-the-steps, Your-why.

## Status
- The full v14 screen set (18 mockups) now has a first-pass native implementation. `Design_Fidelity_Audit.md`
  (written 2026-07-09, pre-pass) is **partially superseded** — most of its per-screen P0/P1 findings
  describe the earlier flat/gray state and were not re-verified after this pass; treat it as historical
  until it is re-run.
- Still open (founder-owned): **Buddy art direction** (founder rejected the 4 creature concepts, needs a
  new direction) and the **Buddy inventory interior** depth question (tiles/states/labels vs. current
  framing).
- Deferred data-model wiring, documented as placeholders in the shipped screens: Grace Tokens in
  `AppState`, a Consistency screen/route, per-weekday Step scheduling, user profile/name, Social
  gift/message gateway methods, Shop real-money data model, inventory Items/Location/Furniture
  categories.

## Next
- Founder reviews the fidelity pass on-device (fresh QR). Then: resolve Buddy art direction → decide
  the inventory-interior question → wire deferred data-model items as their pillars land → re-run the
  Design-Fidelity Audit to confirm and retire the stale tables.

---

# 2026-07-08 — Phase 6: four local POC pillars built (autonomous run)

The founder asked the team to run autonomously through everything doable without him. Built all
four **local** POC pillars end-to-end — each implemented → adversarially code-reviewed → fixed →
verified → committed on branch `claude/project-continuity-cost-oversight-1ctfso`. Everything stays
**$0** and offline; the one pillar needing a backend (social) is a proposal awaiting approval.

## Pillars (app/, Expo + TS, engine-based)
- **1 · Journey creation** — `journey/new` modal wizard (title · why · duration/rhythm · Steps ·
  Starter Step); in-context local reminders; wired to `JourneyEngine`.
- **2 · Buddy** — Buddy tab (`BuddyScene`), warm reactions + `EvolveReveal`; focus-gated
  `useBuddyMoments` hook (fixed a cross-tab double-celebration). Replaced the deferred Explore tab.
- **3 · Coins + Shop** — `ShopEngine` + `config/shopItems` (6 cosmetics), `shop` modal, equipped
  cosmetic renders on the Buddy; hardened state migration.
- **4 · Missions + Login** — `MissionEngine` (injected clock), `missions` modal, Coins-only single
  reward path (`RewardGranted → BuddyEngine`), pure reads + foreground rollover that auto-claims
  earned-but-unclaimed Coins (non-punishing).

Engines now: Journey · Reward · Buddy · Reminder · Shop · Mission. **jest 35/35, `tsc`=0, web export ok.**

## Awaiting founder (gate)
- `11_Engineering_Bible/Social_Backend_Proposal.md` — the social/Allies pillar needs a backend
  (Supabase free tier, $0); decision-ready, **nothing provisioned** (§3.10). Becomes E2 on approval.

## Next
- Founder tests the 4 pillars in Expo Go (`app/README.md`) and reviews the social proposal.
  Device smoke-tests owed (native tabs, modals, rollover-across-midnight, persistence). Then visual
  polish toward the mockups, and TestFlight when wanted.

---

# 2026-07-08 — Phase 6 begins: Cost Guardian + POC stack + Expo app scaffold

Started engineering. Added a cost-oversight team role, chose the POC stack, and scaffolded the app.

## Team
- New sub-agent **cost-guardian** (`.claude/agents/cost-guardian.md`): warns in Hebrew before any
  action that could incur a real charge or approach a paid quota. Wired into CLAUDE.md §4 (team),
  §5 (triggers), and new constitutional rule §3.10.

## Decisions (Engineering_Decisions E1)
- **E1 — POC stack.** Expo (React Native) + TypeScript, engine-based architecture; offline-first,
  local notifications; cloud backend (Supabase free tier) deferred to the social pillar. Chosen for
  $0 instant iOS testing (Expo Go, no Mac/Apple account), future web reuse, and Bible alignment.
  Alternatives (native Swift, Flutter, PWA) rejected — see `11_Engineering_Bible/Engineering_Decisions.md`.

## Added / Changed
- New: `11_Engineering_Bible/Engineering_Decisions.md` (E-log); the `app/` Expo project — pure-TS
  engines + event bus + config + offline `Repository`/`LocalRepository` + `AppCore`, and an
  action-based **Home** screen (seeded demo Journey; check-in → engines → Buddy reacts). `tsc` clean.
- `CLAUDE.md` §6 (Stack: TBD → Expo/TS engines); `06_Decisions/Decision_Log.md` (E1 pointer);
  `.gitignore` (node_modules/.expo/dist/native/env excluded so deps never bloat history).

## Next
- Founder feedback on Home (test via Expo Go on his machine). Then build POC pillars in order:
  Journey-creation flow → Buddy evolve UI → Coins/Shop → Missions+Login → social/Allies (Supabase
  free tier enters here, behind the abstraction; cost-guardian reviews first).

---

# 2026-07-08 — Product & business strategy locked (POC/MVP, roadmap, revenue, Grace Tokens)

Jointly defined the build & business strategy after design sign-off.

## Decisions (Decision_Log D13–D17)
- **D13/D14 — POC + MVP + roadmap.** POC tests social + Buddy + reward-loop → persistence; lean MVP = POC + Explore/library + onboarding(egg→hatch) + Phases/full types + light-AI encouragement/reminders; rest → Commercial. (`POC_and_MVP_Scope.md`, resolves D4.)
- **D15 — 5-version roadmap + Rich Step Types.** All remaining work ranked V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem · V5 Future/Optional (`Version_Roadmap.md` + `Version_Roadmap.pdf`). New vision idea **Rich Step Types** (Bible §35).
- **D16 — Revenue streams.** Bible §23 rewritten as a 5-stream portfolio (Shop/coins · subscription · creator marketplace · business/branded Journeys · coach tier); mirrored in Pitch_Deck §9 + Investor_Questions §14.
- **D17 — Grace Tokens.** New flexibility mechanic (Bible §36, + §5A.4/§23 cross-refs, Home spec): earned-only/never-buyable · gift-not-wager · opt-out · regenerating floor; GT card added to Home mockup (v14).

## Added / Changed
- New: `04_Product/Version_Roadmap.md`, `04_Product/Version_Roadmap.pdf`.
- Bible: rewrote §23; added §35, §36; cross-refs in §5A.4.
- Pitch: `Pitch_Deck.md` §9, `Investor_Questions.md` §14 updated.
- `POC_and_MVP_Scope.md` fully written; `UX/Home_Screen.md` GT indicator; `Decision_Log.md` D13–D17; `Current_Context.md`.

## Next
- Build the **investor presentation / pitch deck**. Then Phase 6 (Engineering) — still blocked on the Engineering Bible.

---

# 2026-07-08 — Phases 4–5 close-out: mockups signed off, designs folded into specs

The initial screen-design iteration (~13 mockup rounds, 2026-07-07) is founder-approved.
Folded every finalized visual decision from the mockups into the permanent UX specs so
nothing lives only in artifacts (repo = source of truth). Append-only; no content removed.

## Changed (appended a "Finalized visual design (mockup v13)" section)
- `UX/Home_Screen.md` (headerless forest home, floating stats, greeting bubble, swipe-report cards, DONE watermark / yellow-urgent / red-missed, nav shadow, hub-vs-default nav open question)
- `UX/Journeys_Screen.md` (Home-matching cards, bottom New + Achievements buttons, secondary detail title)
- `UX/Buddy_Screen.md` (headerless, centered buddy, unified edge-to-edge inventory + Select, locked-tab tooltip, **Hatch/Evolve reveal**)
- `UX/Achievements_Screen.md` (warm base, medals 3-up, condition + count, detail sheet)
- `UX/Explore_Screen.md` (draggable carousels — For you / Top creators / Brands — flex-shrink note)
- `UX/Friends_Screen.md` (Cheer rename, A–Z list, neutral 3-dot menu)
- `UX/Inbox_Screen.md` (Friends/Allies/Groups tabs, IG rows, no Ally tag, notifications excluded)
- `UX/Missions_Modal.md` + `UX/Consistency_Reward_Modal.md` (unified centered modal; Missions · Login tabs; per-mission reward/claim states)
- `UX/Journey_Creation_Screen.md` (pencil edit, prev/next labels, tooltip, equal buttons, "Your why" reminder-list, Recommended Starter Step)

## Added
- `UX/Shop_Screen.md` (new — featured pack + daily grid, warm palette)
- `UX/Weekly_Planning_Screen.md` (new — Bible §34.7 / D12)

## Status
- Phases 1–5 complete. Next: **Phase 6 (Engineering)** — blocked on the founder's "Engineering Bible". POC/MVP scope (D4) still to define together.

---

# 2026-07-06 — Founder Decisions (post Repository Review)

Recorded five founder decisions and folded them into the repository. Canonical record: `06_Decisions/Decision_Log.md`.

## Decisions
- Initial positioning: young adults building meaningful habits/goals across different areas of life (positioning, not a vertical).
- AI is part of the MVP, but no core flow depends on it.
- "PushApp" is a working name (branding deferred).
- POC/MVP scope to be defined together later — tracked as a placeholder.
- Object model: Dream → Journey → Phase (optional, sequential) → Step. "Phase" is a working name.

## Changed
- `Product_Bible.md`: §3.3 (2-month default, configurable), new §3.4A (Phases), §11.2 (Home = action-based), §15.1 + §27 (AI-in-MVP principle), §24 + §32 (positioning), §26 (removed resolved questions).
- `Product_Terminology.md` + `Information_Architecture.md`: added the Phase layer.
- `Product_Roadmap_and_Scope.md`: resolved the MVP×AI open question.
- `Open_Questions.md`, `Investor_Questions.md`, `Pitch_Deck.md`: positioning updated.

## Added
- `06_Decisions/Decision_Log.md`, `04_Product/POC_and_MVP_Scope.md`, `Repository_Review_2026-07-06.md`.

---

# 2026-07-06 — Phase 2 Repository Cleanup (Product Update Merge)

Merged the 2026-07-05 Repository Update chain (`10_Product_Updates/`, 9 files) into the permanent docs and retired the folder to `08_Archive/`.

## Method

- Ran a decision-by-decision absorption audit: ~85–90% was already merged in a prior batch. Only genuine gaps were added (no duplication).

## Added (gaps folded into permanent docs)

- Product Bible: persistent per-run Journey history (§5A.5); Buddy customization/species taxonomy, retention framing, surfaces list, adaptive personality, positive voice-lines (§21).
- Product Philosophy: "The Product Should Feel Alive"; "Marketplace shows life paths, not products"; "Journey creation should require less effort over time".
- AI Product Principles: Principle 17 — "Increase Autonomy, Never Create Dependency".
- Pitch Deck: founder/emotional story + whirlpool metaphor.
- Investor Questions: new Q&As (Why Buddy, Why Gamification, Why-not-habit-trackers, works-without-AI, first commercial version, first paying customer, pricing philosophy, success metrics).
- New file: `04_Product/Product_Roadmap_and_Scope.md` (the Vision/POC/MVP/Commercial/Future staging framework — previously only a skeleton in governance docs).
- Open Questions: subsystem-categorized questions (Journey Engine, AI, Buddy, Marketplace, Gamification, Social).

## Changed

- Removed the stale "Updates – 2026-07-05" temporary wrapper from `Information_Architecture.md` (content is now the live doc).
- Converted legacy "Quest" → "Journey" in `Pitch_Deck.md` and `Investor_Questions.md`.

## Flagged (needs founder decision)

- MVP vs AI: the update says the MVP "may already include premium AI"; Product Bible §15.1/§27 says AI is optional / not core MVP. Recorded as an open question in `Product_Roadmap_and_Scope.md`, to resolve during POC/MVP scoping.

---

# 2026-07-06 — Phase 2 Repository Cleanup (Product Bible Consolidation)

Consolidated the multiple Product Bible files into a single canonical document.

## Changed

- Promoted the newest, most complete Bible (Journey-era) to canonical `04_Product/Product_Bible.md`.
- Merged the two former Draft documents into `Product_Bible.md` as §33 (Founder Notes & Draft Hypotheses), preserving the not-yet-approved status of that material and converting legacy "Quest" terminology to "Journey".
- Archived the superseded versions to `08_Archive/` (old Quest-era Bible, intermediate "updated" Bible, and both Draft files) with a provenance `README.md`.
- Removed `Product_Bible_Draft.md` from the reading order in `README.md` and `AI_Context.md` (its content now lives in the Bible).

## Notes

- Nothing was deleted; all superseded content is preserved in `08_Archive/`.
- Supersedes the 2026-07-03 note that "Product_Bible_Draft.md contains evolving thinking" — that staging role now belongs to `Open_Questions.md`.

---

# 2026-07-03 — Batch 1 Foundation Update

Updated the repository after Founder Interview #1 and subsequent product positioning discussion.

## Added

- Expanded Vision with identity, intentional living, support, and real-life success framing.
- Expanded Core Beliefs with identity, help-seeking, human support, and intervention concepts.
- Expanded Product Principles with Intervention over Notifications and Competition as motivation mode.
- Expanded Open Questions with beachhead market, Competition Mode, Intervention Engine, private support, and repository structure questions.
- Expanded Product Bible with sections on Intervention Engine, Competition Mode, and positioning insight.
- Rebuilt Product Bible Draft as a working space for evolving ideas.
- Filled AI Context with a compact orientation for future AI tools.

## Key Decisions

- Repository remains AI-first.
- Prefer fewer, larger documents over many small documents.
- Product_Bible.md contains approved or high-confidence product knowledge.
- Product_Bible_Draft.md contains evolving thinking.
- Competition Mode is not yet approved as core product; it remains a motivation-mode hypothesis.
- Intervention Engine is a strategic direction requiring validation.

## Still Open

- First beachhead market.
- MVP scope.
- Whether Competition belongs in early product.
- How to measure intervention effectiveness.
- How to clearly outperform existing workflows like Calendar + WhatsApp + Notes.
