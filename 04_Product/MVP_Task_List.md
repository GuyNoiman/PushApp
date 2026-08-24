# MVP_Task_List.md — The Initial-Version Build Checklist

Status: **Living task list** — the single granular checklist for the **initial version (MVP)** of the
post-pivot AI-adaptive-coach app. Created **2026-08-08** jointly with the founder, on branch
`feat/buddy-3d-and-reminders`.

## What this doc is (and how it relates to the others)

- `Build_Plan_and_Method.md` defines the **method** and the coarse spine **S0–S7**, and deliberately
  left **S4–S6** ("build-out toward MVP") un-detailed. **This doc is that detail** — the concrete
  per-feature task list for reaching MVP-in-store.
- `POC_and_MVP_Scope.md` (2026-07-08) defined MVP **before the pivot** (D23) and the 2026-08-07
  mature redesign. Its framing (Buddy/Shop/Coins as the loop) is **superseded** for positioning; this
  list is the current, post-pivot MVP scope. That doc is kept as history, not overwritten.
- Statuses below are grounded in the **actual code** on this branch as of 2026-08-08, not from memory.

## Build progress (2026-08-09, branch `feat/buddy-3d-and-reminders`, ALL UNCOMMITTED)

Verified as of 2026-08-09: `tsc` clean, `eslint` 0 errors (101 pre-existing style warnings,
unrelated), **jest 499/499 passing across 52 suites** (grew from 468 at the start of the 2026-08-08
session). Full narrative: `Current_Context.md` → "⭐ HANDOFF SNAPSHOT — 2026-08-09".

- **N1 i18n infra + language picker + CORE screen translation** — DONE & GREEN (518 tests, 10
  namespaces at en/he parity). Translated + RTL-hardened: Settings, Home + all home components (incl.
  SwipeableStepRow), Journeys tab, `journey/[id]`, `journey/new` wizard, all `journey/*` components,
  the Coach UI chrome, AND **the coach now CONVERSES IN HEBREW** for the general path (interview
  playbook + meta questions + GeneralExpert via a `coachContent` namespace + a Gemini locale
  directive; domain/kind enums stay English). RTL is code-level only (forceRTL is a no-op on web) —
  **device-verify** SwipeableStepRow swipe direction, chevrons, accent edges, bubble tails.
  - **Batch D — DONE (2026-08-09, this session): Inbox + Circle (`friends.tsx`) + Explore +
    `core/config/reasons.ts`.** New i18n namespaces `circle` / `inbox` / `explore` (en+he), reason
    copy moved from `reasons.ts` into the `journey` ns (`reason.prompt` + `reason.list.*`) with
    framework-free `reasonLabel`/`reasonCaringCopy`/`reasonPrompt` helpers (i18n core, no hook);
    `ReasonSheet` + `ReasonHistorySheet` updated. Screens migrated to `useTranslation` +
    `textAlign` RTL on their inputs. Verified in the web preview: Circle + Inbox render clean Hebrew
    (chrome only; the dev `sampleSocial` row statuses stay English by design — H1 cleanup). Green:
    `tsc` clean · `eslint` 0 errors · `jest` 518/518.
  - **Batch 2 — DONE (2026-08-09, this session): Buddy / Shop / Missions / Achievements.** New i18n
    namespaces `buddy` / `shop` / `missions` / `achievements` (en+he). Migrated: `(tabs)/buddy.tsx` +
    `BuddyScene` + `BuddyInventory` + `EvolveReveal`; `shop.tsx`; `missions.tsx`; `achievements.tsx`.
    Verified in the web preview (Hebrew): Shop / Missions / Achievements render clean Hebrew chrome.
    Green: `tsc` clean · `eslint` 0 errors · `jest` 522/522 (14 namespaces at en/he parity).
    **Known un-translated (engine/config/sample DATA, not screen chrome — deliberately deferred):**
    MissionEngine mission titles (e.g. "Check in on a Step"), `shopItems.ts` cosmetic names (e.g.
    "Top Hat"), and `sampleAchievements.ts` achievement names/conditions/rewards — these live in
    engine/config/dev-sample modules, same treatment as `sampleSocial` (→ H1 cleanup / a later config
    i18n pass), not the screen files.
  **REMAINING:** Batch 3 — the 4 domain experts' Hebrew content (Addiction / Relationships /
  BodyImage / Career) — **NOT NEEDED NOW; folded into the future expert spec (founder direction,
  2026-08-09).** The 4 domain experts are **empty foundation scaffolding, not yet specced**, and are
  **dev-only for now** (not yet built out for release; none are in the shipping MVP path). **Addiction
  and Relationships & Loneliness additionally require expert review before release** (D24, mechanism
  corrected by **D53**, 2026-08-18 — this is a release gate, not a block on development work).
  Founder's architectural direction: the experts are **internal tools**
  — the meta-agent ("Steady") is the layer that talks to the user and speaks their language, so the
  experts themselves need no user-facing translation. When the experts are actually specced they will
  be built i18n-aware from the start (or, cleaner, kept as pure internal tools with the meta-agent
  phrasing everything to the user). **Current-code note (not a bug to fix now):** today
  `CoachOrchestrator.askCurrentQuestion` surfaces an expert's `question.prompt`/`options` VERBATIM, so
  a domain expert reached in Hebrew would render English — a non-issue while the experts stay gated,
  to be resolved by the meta-agent-phrasing design above when they're built. (The GENERAL coach path,
  which IS the MVP path, already converses in Hebrew via `coachContent`.)
  Also still open: engine/config data strings above (MissionEngine mission titles, `shopItems` names,
  `sampleAchievements`/`sampleSocial`); and a final device RTL sweep. Untranslated screens show English
  (no crash). (The `RestartPrompt` showing English + Hebrew together is INTENTIONAL — a bilingual
  banner, since the layout is half-flipped mid-direction-change — NOT a gap; verified in the component.)
- **J1 Edit a Journey (coach-led)** — ✅ DONE & GREEN. Pencil on the Journey screen → coach edit
  mode → validated diff → approval card → `updateJourney` applies immediately (history/XP
  preserved). Gated on `liveCoach`, blocked on completed Journeys. New `JourneyUpdated` event.
- **O1 Account deletion + export** — Built, not deployed. Settings "Your data" section: Export
  (`expo-sharing`) + destructive Delete (confirm sheet, remote-first/offline-refuse, post-delete
  clean first-run via a persisted `firstRunFlag` seed-guard). `AuthGateway.deleteAccount` +
  `AppCore.exportStateJson`/`resetToFirstRun` are real. **Remaining:** the Edge Function
  (`app/supabase/functions/delete-account/index.ts`) is written but NOT deployed; a Google Play
  public deletion URL is not hosted — both are founder pre-release actions.
- **B2 Streak mechanism** — ✅ now DONE (was ⛔ in the table below — see note there). Real
  `StreakEngine`: day-count increments once per new check-in day, resets to 0 only on an URGENT
  missed Step. **Known limitation:** the reset depends on `StepMissed`, only emitted when
  `adaptiveCoach` is on — works on the founder's device; general production would only increment
  until the miss-producer runs un-gated.
- **Design fixes** (founder, verified in web preview): top-bar level meter shrunk to ~¼ width;
  the "This week" rail now connects node-centres only and disappears for a single-Step group;
  fixed a spurious `RestartPrompt` on the language screen at boot; and the **Journey detail Steps
  list is now a WEEKLY PAGER** — "Steps by week" with ‹ › arrows, "Week X of Y", one week's Steps at
  a time (empty weeks show a gentle note). Week grouping via `stepsByWeek` in `journeyView.ts`
  (`plannedFor` when all Steps are scheduled, else even spread by order; totalWeeks from
  `durationDays`).

**Still open / next (per founder priority):** finish the i18n screen-migration in controlled
batches; J2 delete/abandon a Journey (in progress); then J3/J4/L1/P1/B1/B3/B4/C1/D2/E1/E2/F1/K1/G1/
H1/I1 per the table below. Apple dev-build track blocked on the Apple Developer Program account
(purchased 2026-08-08, details expected ~2026-08-10).

## Legend

- ✅ **Done** — real, wired to the engine/repository, persists, works.
- 🟡 **Partial** — some real, named gaps remain.
- ⛔ **Not started** — stub / sample data / "Coming soon" / does not exist.
- 🔒 **Blocked** — waiting on an external dependency (named).

Priority: **P1** = core initial-version, **P2** = important but can follow, **P3** = polish/nice.

---

## A. Core adaptive coach — context (mostly done)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| A1 | Live coach conversation → Gemini | ✅ | Founder-device only (`liveCoach`). Real-user hardening (server key proxy, bilingual safety floor, engine-level containment) is a **pre-public-release** gate, not part of the founder's initial version. |
| A2 | Coach builds a real Journey from the interview | ✅ | `AppCore.createJourneyFromGoalSpec`. |
| A3 | report → replan loop (engine) | ✅ | `AppCore.reviewWeek` / `AdaptivePlanner`. Surfacing is task **C**. |

---

## B. Progression & motivation

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **B1** | **XP / Buddy Level** | ➡️ Future | **Removed from MVP by founder decision 2026-08-12.** The existing experimental XP/Level code is not the approved future mechanism. Product direction is parked in `PRD/Future/Points_and_Leveling_PRD.md`; do not implement it as MVP work. |
| **B2** | **Streak mechanism** | ✅ | **DONE (2026-08-09).** Was a hard-coded placeholder (`STREAK_PLACEHOLDER = 4` in Home; `streak: 0` published to friends); now a real `StreakEngine` (`app/src/core/engines/StreakEngine.ts`) that increments once per new check-in day. **Rule (from redesign brief, preserved):** the streak breaks **only when an URGENT task is missed**, not on any miss — implemented via config-driven urgency logic (`app/src/core/util/urgency.ts` + `app/src/core/config/streak.ts`). **Known limitation:** the reset depends on the `StepMissed` event, currently emitted only when `featureFlags.adaptiveCoach` is on — correct on the founder's device, but the streak would only increment (never reset) in general production until the miss-producer runs un-gated. |
| **B3** | **Achievements Engine & area** | ➡️ Future | **Removed from MVP by founder decision 2026-08-12.** Preserve the predefined global Achievement direction; future specification lives in `PRD/Future/Achievements_Engine_PRD.md`. Existing sample/UI assets do not make it MVP scope. |
| **B4** | **Missions** | ➡️ Future | **Removed from MVP by founder decision 2026-08-12.** Existing MissionEngine/UI remains dormant legacy capability; future specification lives in `PRD/Future/Missions_PRD.md`. |

---

## C. Weekly plan — Week-Review

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **C1** | **Week-Review model + screen** | ✅ Done (closed 2026-08-13) | Engine (`AppCore.reviewWeek`) is real. **Original open item said it fires only as an ephemeral Home card with a dev-only manual trigger — that was already superseded by the D40 build** (a week-boundary trigger `weekGate`, a real `weekly-review.tsx` screen). Tonight (2026-08-13) discovered this was already built and closed the gap with 4 coverage tests (flag-off inert, empty-week, 48h expiry, late-approval rebase). **Wording correction:** this row previously said the plan applies "automatically" for the coming week — that described the founder's original 2026-08-07 direction (preserved as-is in `Current_Context.md`'s 2026-08-07 snapshot), but the ratified `Weekly_Review_PRD.md` (§1/§2) and the shipped code apply the proposed plan only **on explicit user approval** within its 48h window, never a silent automatic apply. Two-layer split (strategic weekly proposal vs. tactical per-occurrence recovery + immediate user edits) is now Decision Log **D43**; `adaptiveEnabled`-gated so plain production stays dormant. |

---

## D. Social / people

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **D1** | **Adding a friend** | ✅ | Works end-to-end by `@username` (`SupabaseSocialGateway`). Needs QA + small polish only. |
| **D2** | **Connect people to a Journey (Journey Support Circle / Ally)** | ✅ Built (D40) + hardened (2026-08-13) | **Correction — this row was STALE.** It previously said "backend plumbing is real (`setAllies` → `journey_allies`), but no screen calls it — a user cannot currently propose/name an Ally in-app." In fact the real Journey Support Circle (consent gate, propose/accept UX, the Companion bundle) was **already built** in the D40 work (commit `b3a9ff5`; see `Journey_Support_Circle_PRD.md`) — that description just went stale and is corrected here. **Tonight (2026-08-13) — hardened:** hid the invite CTA on completed/frozen Journeys; distinguished an offline-load-failure state from a genuinely-empty Support Circle; added the missing UI tests. **Flagged (LOW, latent):** the older `setAllies` write path bypasses the Companion coach-Journeys-only gate — no caller reaches it today, but it should be retired or guarded. **Still open:** the live-DB authorization-matrix QA (2nd account) is a **founder action** (the Supabase migration was applied by the founder this session). See Decision Log **D44**. |
| **D3** | **Sample/frozen social data → real** | ✅ Done (2026-08-13) | Was 🟡 — Friends/Inbox fell back to `sampleSocial.ts` when empty. **This session (H1 pass):** removed the fabricated sample people from Home/Circle/Inbox in favor of real empty states; removed the fake `SAMPLE_COMPLETED` demo Journey; wired "Nudge" as a real, distinct `CheerKind` (was silently reusing `sendCheer`). Covered together with **H** below. |

**Open questions — social scope (raised earlier, NOT yet in the MVP list; founder to confirm in/out):**
- **Friend profile page** — does not exist. MVP or later?
- **Messaging / starting a conversation** — Inbox "New message" is a dead button; no message data model. MVP or later?
- **Channels / Groups** — Inbox Groups tab is intentionally empty ("no POC data"). MVP or later?

---

## E. Account & Settings

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **E1** | **Google account connection (real)** | ⛔ 🔒 | Today only a **dev-simulated** Google user. Real OAuth needs a native dev build (or a web OAuth flow). 🔒 native path blocked on the **Apple dev build** (account purchased 2026-08-08, details ~08-10). |
| **E2** | **Settings area — first version** | 🟡 | ✅ Appearance toggle + editable `@username` real; **Notifications row now reads the REAL OS permission status** (`useNotificationPermission`, taps to request / open OS settings) and **About shows the real app version** (from the Expo config) — done 2026-08-09. ⛔ still: Apple sign-in "Coming soon" (blocked); once the profile grows (P1) the Settings/Profile section needs the richer fields (photo/age/country/form-of-address). |

---

## F. Dream

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **F1** | **Creating a Dream** | 🟡 Initial surfacing cut done (2026-08-13) | Dreams exist in the model and grouping works (seeded). This row originally said "no user flow to create a Dream or the coach-suggests/user-approves Dream-linking flow" — note that phrasing predates **D40**, which made the coach the sole owner of the Dream layer (creates/edits freely, no user approval needed to create a Dream). **Built tonight (surfacing only):** My Journeys → My Dreams nav entry; a read-only "Part of your Dream" card on the Journey detail screen; a link-approval card for Journeys not yet linked to a Dream (reuses the tested `linkJourneyToDream` — this is approving an *existing Journey's attachment to an existing Dream*, a distinct action from Dream creation itself, so it does not conflict with D40's no-approval-to-create rule). **Still open / DEFERRED:** the coach Dream-authoring conversation (the coach actually creating/naming a Dream from conversation) needs a joint design session — open questions remain in `Dream_Management_PRD.md`. See Decision Log **D44**. |

---

## G. Design sign-off

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **G1** | **Final approval of the overall design** | 🟡 | The 2026-08-07 mature redesign is live but not formally signed off across every screen. Founder review pass (light + dark), capture the decisions, fix what's flagged. Not a code task until findings land. |

---

## H. Data realness (cross-cutting cleanup)

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **H1** | **Remove frozen data / make it real** | ✅ Done (2026-08-13) | Was 🟡. Checklist status: streak placeholder → **done** (B2); `sampleSocial` fallbacks on Home/Circle/Inbox → **done this session**, replaced with real empty states + the fake `SAMPLE_COMPLETED` demo Journey removed; "Nudge" reusing `sendCheer` → **done this session**, now a real distinct `CheerKind`; the scripted coach's dead "Build this Journey" CTA → **done this session** (separate small fix, `fbff0dc`), now routes to the real manual wizard; Settings static rows → **done** (E2); About `v0.1` → **done** (E2, real app version). **Remaining, deliberately scoped out (not silent):** the Journeys "Future" tab placeholder (no start-date model yet) and the Dream-names workaround stay tied to **F1**'s own status (still partial — the coach Dream-authoring conversation is deferred); Inbox Groups empty tab stays empty because Groups itself is post-MVP (D29). None of these are oversights — they're tracked under their owning row/decision, not re-listed here as open H1 work. |

---

## I. Completion celebration

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **I1** | **Completion celebration** | ✅ (MVP slice, D42) | **Built + reviewed 2026-08-12** (see PRD §0, Decision Log D42). Shipped: small celebration with 3 random variants + reduced-motion guard + a Settings toggle (small-only); the big Journey ceremony (dedicated modal route, idempotent card minted once at the first `completed` transition, auto-open latch mirroring Weekly Review, ceremony-wins priority); the swipeable completion card (name-revealing + name-omitting variants, safe-fields-only, privacy preview before share) + a reopenable **Share completion** action; OS share-sheet + image-save behind a `CardShareGateway` seam (degraded on Expo Go/web); the gentle final-Step confirmation across all three completion paths. Adversarially reviewed (code-reviewer + security-privacy); a HIGH i18n key bug + a Weekly-Review auto-open bug fixed. **Green: tsc clean · eslint 0 · jest 852/852.** No Milestone ceremony, XP, or global Achievement engine (out of scope). **DEFERRED → I1-a / I1-b below.** Still needs the founder's on-device visual pass of the ceremony/card/confirmation (impractical to drive fully in web). |
| **I1-a** | **Completion → in-app Allies/thanks message (deferred from I1)** | ⛔ (deferred) | PRD §5. After a Journey completes, opt-in send of the completion/thanks to the completion-moment Allies **inside the app**. Deferred because no delivery channel exists yet (no push backend; in-app messaging is post-MVP per D29). `journey_completed` already exists as a dormant `notificationTypes.ts` entry + `buildNotificationContent` builder — wire it when the notification/message backend lands. Snapshot the accepted-Ally set at completion; revalidate authorization at send/open. |
| **I1-b** | **Completion card image export — device verification (deferred from I1)** | 🔒 (deferred) | The `react-native-view-shot`/captureRef save-as-image path is built behind a gateway in I1 but does NOT run in Expo Go / web. Verify it on the Apple native dev build once the account lands (blocked, same gate as E1/K1). |

---

## J. Journey management (NEWLY FOUND GAPS — 2026-08-08 audit)

A coverage audit of the flows the founder wants to perform found that **a Journey is currently
almost immutable** — these are missing and likely required for a usable initial version:

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **J1** | **Edit an existing Journey** (rename, change Steps, change frequency) | ✅ | **DONE (2026-08-09).** Previously: no `updateJourney`/edit intent existed — neither a screen nor a coach edit-flow, only system-driven replan + Step-level ops. Now: a pencil button on the Journey screen opens the coach in edit mode → proposes a validated diff → user approves → `AppCore.updateJourney` applies it immediately (Step ids/history/XP preserved). Gated on `liveCoach`; blocked on completed Journeys. |
| **J2** | **Delete / abandon a Journey** | ⛔ | No `deleteJourney`/`abandonJourney` anywhere. Only Step-level "let go". Needed for basic use **and** for store compliance (no undeletable user data). |
| **J3** | **Pause / Freeze / Resume a Journey** | ✅ | **DONE & verified (2026-08-09).** Authoritative **`status`** field (`active` / `frozen` / `completed` / `abandoned`, `core/types/domain.ts`) is the source of truth the Journeys tabs bucket by (`resolveJourneyStatus`/`bucketOf`, backward-compat for pre-field Journeys). `JourneyEngine.freezeJourney`/`resumeJourney` (guards: can't freeze a completed one; no-op on repeat) + `JourneyFrozen`/`JourneyResumed` events + `AppCore` wiring (persist + **reminder reconcile**). `CommunicationScheduler` now **skips frozen Journeys** so a paused Journey fires no reminders. UI: a Pause/Resume button + a "Paused" banner on `journey/[id]` (check-in CTA hidden while paused) and a **"Paused" pill** on the Journeys card. Hebrew copy added. Verified in the web preview: freeze persists, the card pill renders in Hebrew, survives reload. Green: `tsc` clean · `eslint` 0 errors · `jest` 533/533 (new engine + scheduler + journeyView tests). |
| **J4** | **Manage reminders for an existing Journey** | 🔨 | **Off/Fixed slice built (2026-08-12, D40):** a `JourneyReminderCard` on `journey/[id]` (view current state, edit Off/Fixed time + weekdays ordered by `weekStartDay`, permission-denied → deep-link to Settings) via a managed `AppCore` reminder facade + `ReminderRule.mode`; the creation wizard Stage 5 now creates a **managed** Fixed rule (was a raw `scheduleDailyReminder` that couldn't be edited later). **DEFERRED — Smart mode:** the `'smart'` enum value exists but is non-selectable ("Coming soon") because Smart proposals surface only in **Weekly Review** (not yet built) + need the `Smart_Notification_Timing` learning engine. The Active-Hours "needs attention / disable-on-conflict" flow is DROPPED — Active Hours now **clamps** (D40), so a Fixed reminder outside the window is auto-moved, not disabled. |
| **J5** | **Account inactivity freeze and return** | ✅ Local-first POC built (2026-08-13) | Spec (was "✅ Spec ready"): after 21 days without authenticated account activity, freeze Active Journeys, block Future Journey activation, stop Journey obligations/reminders, and preserve all history/relationships. Return never auto-resumes: Coach review, manual selection, or Not now. See `PRD/Account_Inactivity_Freeze_PRD.md`. **Built (local-first POC, 2026-08-13):** a pure `InactivityEngine` reuses the existing J3 frozen path via a new `Journey.freezeReason` provenance field; a 21-day threshold (`config/inactivityPolicy.ts`); a lazy foreground-evaluated tick (no background job); the return flow (`return.tsx`) offers Talk-to-coach / Choose-Journeys-to-resume / Not-now — **never auto-resumes**. Reviewed (code-reviewer + security-privacy): fixed a HIGH bug (freeze re-armed across cycles) and a MEDIUM bug (a zero-frozen cycle left an undismissable CTA). **Deferred — server-authoritative enforcement:** freezing exactly at-the-mark while the app is closed, authoritative server time, multi-device consistency, and Ally lifecycle notices (PRD §3/§6) all need the backend and are NOT built. See Decision Log **D44**. |

## K. Onboarding & first-run (NEWLY FOUND GAP)

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **K1** | **First-run onboarding** | ✅ Done (2026-08-13) | Was ⛔ — no onboarding existed. **K2's flow (language → Personal Info → six questions → Coach) was already ~85% of this item**; this session closed the gap by adding the missing **notification-permission step**: a soft pre-prompt placed after the questionnaire and before the Coach hand-off. Onboarding is now complete for MVP. (Real sign-in inside onboarding is still 🔒 Apple/E1-gated, unchanged.) |
| **K2** | **Initial onboarding questionnaire** | ✅ Spec ready | **MVP product flow approved 2026-08-12.** Language first → prefilled/editable Personal Information → standalone six-question introduction → six skippable pages → Coach. OS keyboard dictation only; no audio capture; no personality result; no silent Dream/Journey creation. See `PRD/Onboarding_Questionnaire_PRD.md`. Implementation remains part of K1 delivery and subject to existing Coach privacy/safety gates. |

## L. Deferred goals (NEWLY FOUND GAP)

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **L1** | **Multiple goals from one coach conversation ("parked goals")** | ✅ Built (2026-08-13) | Was: the coach genuinely detects multiple goals and stores the extras on `GoalSpec.deferredGoals`, but they were **never persisted or shown** — once the conversation instance ended they were dropped from the user's view. **Now:** coach-detected extra goals persist to `AppState.parkedGoals`, surfaced on the Journeys "For later"/Future tab, **activatable** into a real Journey (reuses `createJourneyFromGoalSpec`) or **dismissable**. **Sensitive-domain goals (addiction/relationships) are filtered at capture AND guarded again at activation** (shared `core/coach/sensitiveDomains.ts`) — never silently surfaced or built. See Decision Log **D44**. **Open (founder, next):** confirm the user-facing label, a cap on parked goals, and whether activation means direct-build vs. re-running the interview. |

---

## Open in/out decisions (categorised per CLAUDE.md §3.6)

**CONFIRMED IN the base version (founder, 2026-08-08 — Decision Log D29):**
- **J1 Edit a Journey.** (How — coach-led / edit screen / both — still open; D26.8 leans coach-led.)
- **J2 Delete/abandon a Journey.**
- **K1 Onboarding + notification-permission ask.**
- **N — Multi-language (i18n) with Hebrew + RTL.** The app + coach are English-only today; add an i18n
  layer, Hebrew translations, RTL layout across all screens (the redesign was built LTR), and the
  coach conversing in Hebrew. New section **N** below.
- **Account deletion / data export** (release gate — new section **O** below).

**Resolved (founder, 2026-08-08 — D29):**
- **Coins** → **hidden in MVP** (keep accruing in the engine, don't show; Shop archived, no sink).
- **Manual Journey creation** (wizard) → **kept** as a coach-first fallback.
- **Friend profile page** → **IN**, minimal (name + active Journeys + progress + cheer). New section **P**.
- **Messaging / start a conversation** → **deferred post-MVP**.
- **Channels / Groups** → **deferred post-MVP** (Communities = Commercial).
- **J3 Pause/Freeze a Journey** → **IN**.
- **J4 Reminder management for existing Journeys** → **IN**.
- **L1 Deferred-goals surface** → **IN**, minimal.
- **J1 edit — HOW resolved:** **coach-led via a pencil button** on the Journey screen → opens the
  coach → coach asks what to change → proposes updated settings → **user approves** before it applies.

---

## N. Multi-language / i18n + Hebrew + RTL (CONFIRMED IN — D29)

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **N1** | **i18n layer + Hebrew + RTL** | 🟡 | **Infra DONE, all reachable MVP screens now fully translated (confirmed 2026-08-13).** Was: no i18n at all — all UI copy hard-coded English. The per-batch screen-migration work recorded earlier in this doc's "Build progress" log finished the core + secondary screens (14+ namespaces at en/he parity) and the coach now converses in Hebrew for the general path. **The one remaining gap is the 4 domain-expert catalogs' Hebrew content** (Addiction/Relationships/BodyImage/Career) — these stay English by design, since they're internal tools gated behind `liveCoach`/not yet specced (see the Batch-3 note above and Decision Log D30); it is a **dormant, liveCoach-gated follow-up**, not a shipping gap. A full device **RTL layout** sweep is still not verified (Apple-account-gated, unchanged). |

## O. Account deletion / data export (CONFIRMED IN — D29, release gate)

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **O1** | **Account deletion + data export** | 🟡 | **Built 2026-08-09, not deployed.** Was absent; mandatory for a public Apple/Google release (not needed for founder-only device testing). Settings "Your data" section now has real Export (`expo-sharing`) + destructive Delete (confirm sheet, remote-first/offline-refuse, clean-first-run post-delete via a `firstRunFlag` seed-guard). **Remaining:** the `delete-account` Supabase Edge Function is written but NOT deployed; a Google Play public deletion URL is not hosted. Still needs the store-compliance + security-privacy loop-in before release. |

---

## P. Friend profile page (CONFIRMED IN — D29, minimal)

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **P1** | **Friend profile page** | ⛔ | No friend profile exists. Add a tappable minimal profile: display name/`@username` + their active Journeys + progress + a cheer button, reading the social gateway and respecting the shared-only privacy model. **Founder note (2026-08-09) — design for RICHER profile data:** the (own) profile will also hold **profile photo, age, country, form-of-address (לשון פנייה / grammatical gender the app addresses the user by), and more** — the current Settings/Profile layout does NOT accommodate this variety, so the profile UI needs a redesign to hold these fields. Spec + design this together (joint session). **Cross-cut:** "form of address" is a **gender-aware i18n** need — today's Hebrew copy is written in one (masculine) form; a real launch needs gendered address driven by this profile field. |

---

## Post-MVP — staged next, not cut (vision never shrinks)

These come **after** the initial version, in this order per the founder:

1. **Messaging / start a conversation** (D29) — a real message data model + threads + moderation.
2. **Channels / Groups / Communities** (D29) — goal/Dream communities (Commercial-stage).
3. **Siri / Apple Watch integration** — voice + watch entry points to check in / talk to the coach.
4. **Basic avatar** — reintroduce a simple avatar (the 3D Buddy is archived; start with a basic one).
5. **Calendar + device-location interaction** — wire the reserved `NullCalendarGateway` /
   `NullLocationGateway` seams into real, opt-in *interaction based on calendar and device location*.
   Background geofencing stays deferred (privacy red-line R3); this is the on-device, opt-in version.
6. **Achievements FEED (Open Question → Future)** — a social feed where users share their achievements
   and write a few words on each (post-style). Founder raised it 2026-08-09 as a maybe-future idea;
   privacy/moderation-heavy (like the social pillar). Log fully before building.

---

## Open questions / new topics to spec (added 2026-08-09, founder)

- **Photo upload as part of a Step-completion report.** The founder wants users to attach a photo when
  reporting a Step done (proof/journal). The **current Step-report UI does not support this** — needs a
  design pass (where the photo attaches, storage/privacy — likely on-device first per G1, upload path
  later). Add to the joint spec queue; touches `StepReportSheet` + the report data model.
- **Form-of-address (gender) sourcing from sign-in** — see Section Q below: on Google/Apple sign-in,
  if the provider returns gender, auto-set the address form (still shown + editable in onboarding).

## Q. Form-of-address / gender-aware i18n (CONFIRMED IN — founder 2026-08-09)

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **Q1** | **Gender-aware "form of address" across all languages** | 🟡 | **Decision (Decision Log D31):** the app must address the user in the right grammatical form (Hebrew is gendered). Mechanism = i18next **context** (`key_feminine`/`key_masculine`, base = fallback; English just uses base, so it generalizes to every language). A persisted **`addressForm`** preference (`neutral`/`feminine`/`masculine`) drives it via a React hook (components) + a module-level accessor (framework-free engines/coach). **Sourcing:** asked at **onboarding**; if Google/Apple sign-in returns the user's gender, **auto-set** it — but still surface it in the onboarding questionnaire and let the user edit it (and edit it later in the profile). **Built:** the mechanism + preference + a Settings/onboarding control + the coach + Home greeting (foundation). **Extended (2026-08-13):** the Coach screen, the Miss-Recovery caring copy, Settings/Profile, and the onboarding self-description step now also use the gendered forms. **Remaining:** convert the rest of the gendered base-namespace strings incrementally (base stays the universal fallback); wire the sign-in auto-detect once real OAuth lands (E1, Apple-gated); move the picker into the P1 profile redesign. |

**Apple Developer Program** (purchased 2026-08-08, account details expected ~08-10) gates: real
device notifications, a native dev build, real Apple **and** native-Google sign-in, and full
onboarding. Unblocked work (B, C, D2, F, G, H, I) proceeds in parallel while waiting.

**Status as of 2026-08-13 (MVP-ready sweep session):** with K1, H1/D3, N1 (screen-migration), and Q1's
foundation all closed or extended this session, **the buildable-without-founder-input MVP queue is
essentially drained.** What remains open is gated on one of: a founder design session (P1 friend
profile, coach-authoring for Dreams/Step-dependencies), the Apple Developer account (E1, device
notifications, native build, G1 sign-off, RTL/gendered visual QA), or new spec work not yet written
(the Invite feature). See `Current_Context.md` → the top "⭐ HANDOFF SNAPSHOT — 2026-08-13 (SESSION —
MVP-ready sweep)" for the full ▶ NEXT queue.

## R. Added by the founder on 2026-08-25 — IN, and urgent where marked

| # | Task | Status | Notes |
|---|---|---|---|
| **R1** | **Smart Notification Timing — the aggregate** | ⛔ **URGENT — founder: "בהחלט צריך להיכנס ל-MVP"** | The learning loop shipped (D74): the app learns when a person actually acts and moves reminders toward it. What is missing is the piece that BUNDLES several Journeys into one notification instead of firing one per Journey — which is the difference between a coach and a nagging app once somebody has three Journeys running. It is roughly as large as everything else in Smart Timing combined, and it carries the sharpest deviation from the spec: a local notification cannot be cancelled at the moment it fires, so "suppress it if nothing is pending" is approximated by cancelling on the next reconcile. That approximation needs to be stated in the PRD rather than discovered. See `PRD/Smart_Notification_Timing_PRD.md` and Open Questions §3.5 (now answered: build it). |
| **R2** | **Journey resume / re-plan — its own PRD** | ⛔ Spec to write | The founder's re-plan answer grew a question inside the postponement spec into a full mechanism: the resume instant becomes the start of the remainder, every unlived Step is recalculated, and the coach may ask what happened first. It is not a clause of Step Postponement any more. Founder decision, 2026-08-25: **split it out** — one PRD, one feature (`PRD/Journey_Resume_Replan_PRD.md`). It governs BOTH manual (J3) and inactivity (J5) resumes, which today share a path and no document. |
| **R3** | **Journey length: up to 60 days, any number inside it** | ✅ Built 2026-08-25 | The wizard offered 30 / 60 / 90 and the coach's horizon question offered the same three, against the founder's own guidance of up to two months. Decision (founder, 2026-08-25): **60 is the ceiling, and any number up to it is valid — ten days is a Journey and fifty days is a Journey.** One constant now (`core/config/journeyLength.ts`) read by both surfaces, a typed field beside the two one-tap chips, and a clamp that corrects rather than refuses. The ceiling is a PLANNING limit, not a lifetime one: an approved extension still has no cap (Step_Postponement_02). |
| **R4** | **Public privacy policy** | ⛔ In progress | Founder, 2026-08-25: write it, **at the level of Instagram or a serious competitor — study theirs first.** Source material is `Privacy_Contract_With_The_User.md`, which is current. It has somewhere to be hosted now (the invite site). Closes two store gates at once: the policy itself and the Google Play account-deletion URL. |
| **R5** | **PRDs for the four tools that shipped without an approved one** | ⛔ Founder writing | Life Wheel, Values Clarification, My Best Possible Year and the Passion Map are live under drafts that were never approved. The founder said on 2026-08-25 that he will write them. Nothing blocks on this, but the repo and the product disagree until it is done. |


## How this list is tracked

Mirrored into the harness Task tool for live status during the build; **this doc is the durable
record** (the harness list does not persist to the repo). Update this doc incrementally as items
land — never overwrite; check items off and note what shipped.
