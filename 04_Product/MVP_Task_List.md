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
  **dev-only / gated** (D24 — Addiction & Relationships need a safety floor + clinical review; none
  are in the shipping MVP path). Founder's architectural direction: the experts are **internal tools**
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
| **B1** | **Points / XP / Level** | 🟡 | XP + Coins + Level are REAL and wired to real check-ins (`RewardEngine` → `BuddyEngine`, `AppState.buddy`). **Gap:** level is still the old linear `floor(XP/100)+1` (`buddyStages.ts`). The **breadth-based** reframe (reward running multiple parallel Journeys, up to a cap — from the pivot) is **not built**. **Open question:** Coins are still earned but the Shop is archived — decide whether Coins stay, get a new sink, or are hidden for MVP. |
| **B2** | **Streak mechanism** | ✅ | **DONE (2026-08-09).** Was a hard-coded placeholder (`STREAK_PLACEHOLDER = 4` in Home; `streak: 0` published to friends); now a real `StreakEngine` (`app/src/core/engines/StreakEngine.ts`) that increments once per new check-in day. **Rule (from redesign brief, preserved):** the streak breaks **only when an URGENT task is missed**, not on any miss — implemented via config-driven urgency logic (`app/src/core/util/urgency.ts` + `app/src/core/config/streak.ts`). **Known limitation:** the reset depends on the `StepMissed` event, currently emitted only when `featureFlags.adaptiveCoach` is on — correct on the founder's device, but the streak would only increment (never reset) in general production until the miss-producer runs un-gated. |
| **B3** | **Rewards & Achievements area** | ⛔ | No achievements wall exists (it was deferred to Commercial pre-pivot; founder now wants it in MVP). Needs: an achievements/rewards screen + an achievement definition/config + unlock events off the existing event bus. |
| **B4** | **Missions (kept, small change)** | 🟡 | `MissionEngine` exists. Founder: keep in MVP with a **small adaptation** to the mature direction. **Open (founder leaning keep):** could be dropped from MVP if it grows — treat as small first. Scope the "small change" before building. |

---

## C. Weekly plan — Week-Review

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **C1** | **Week-Review model + screen** | 🟡 | Engine (`AppCore.reviewWeek`) is real, but today it fires only as an **ephemeral Home card** after a miss report, and the manual trigger is dev-only. **Approved direction:** move the replan trigger OFF every user report and ONTO a **week close/open**: analyse the past week → build next week's plan → **present it in a real Week-Review screen** → apply automatically for the coming week (a user can still edit a Journey directly, effective immediately). Two-layer split: tactical per-occurrence recovery + user edits (immediate) vs strategic weekly review. Log in `Decision_Log.md`. |

---

## D. Social / people

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **D1** | **Adding a friend** | ✅ | Works end-to-end by `@username` (`SupabaseSocialGateway`). Needs QA + small polish only. |
| **D2** | **Connect people to a Journey (Ally)** | 🟡 | Backend plumbing is real (`setAllies` → `journey_allies`), but **no screen calls it** — a user cannot currently propose/name an Ally in-app. Build the propose/accept Ally UX on a Journey. |
| **D3** | **Sample/frozen social data → real** | 🟡 | Friends/Inbox fall back to `sampleSocial.ts` when empty; the Allies tab reads real data but has no producer (see D2). Covered cross-cut in **H**. |

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
| **F1** | **Creating a Dream** | 🟡 | Dreams exist in the model and grouping works (seeded), but there is **no user flow to create a Dream** or the **coach-suggests / user-approves Dream-linking** flow from the redesign. Also `dreams` isn't cleanly exposed on the app snapshot yet (card names are a workaround — see H). Build Dream creation + coach-suggested linking approval. |

---

## G. Design sign-off

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **G1** | **Final approval of the overall design** | 🟡 | The 2026-08-07 mature redesign is live but not formally signed off across every screen. Founder review pass (light + dark), capture the decisions, fix what's flagged. Not a code task until findings land. |

---

## H. Data realness (cross-cutting cleanup)

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **H1** | **Remove frozen data / make it real** | 🟡 | Sweep every hard-coded/placeholder value in the main tabs and either wire it to real data or remove it: streak placeholder (→ B2), `sampleSocial` fallbacks (→ D3), Journeys "Future" tab placeholder (no start-date model), Dream names workaround (→ F1), Inbox Groups empty tab, "Nudge" reusing `sendCheer`, Settings static rows (→ E2), About `v0.1`. Track each as a checklist item so nothing frozen ships silently. |

---

## I. Completion celebration

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **I1** | **Celebration on task completion** | 🟡 | **Spec (founder, 2026-08-09):** two tiers. **(a) SMALL — on a Step check-in:** on-screen **confetti** (colored ribbons) scattered when the user marks a Step done. Build **several distinct confetti/celebration variants** — either let the founder pick, or pick one at RANDOM each time for variety. (Confetti already fires on check-in today; extend to variants.) **(b) BIG — on completing a Journey or a Milestone:** a full **achievement card** the user can **edit / share to social (Facebook/Instagram) / save as an image / close**. Reference: Finch's "goal completed / Micropet egg" achievement screen (founder attached a screenshot) — build **something similar but more elegant**. Needs: an achievement-card screen/component + a share/save-image path (`expo-sharing` / view-shot). Design together (joint session). **Related open question (Future):** an achievements **FEED** where users share achievements + write a few words on them (post-style) — see Post-MVP list. |

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

## K. Onboarding & first-run (NEWLY FOUND GAP)

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **K1** | **First-run onboarding** | ⛔ | No onboarding exists — the app drops straight into Home (`_layout.tsx` registers `(tabs)` first, no gate). Needs a real first-run: welcome → (sign-in) → notification-permission ask → guide to the first goal/coach. The notification permission ask currently lives only inside the creation wizard. |
| **K2** | **Initial onboarding questionnaire** (founder, 2026-08-10) | 📝 | A first-run questionnaire inside K1 that mixes a few structured questions (incl. form-of-address, Q1/D31) with **OPEN questions answered by TYPING or VOICE RECORDING**. From the answers we seed the user's first **Dreams** (F1) + a **basis for the first Coach conversation**. Draft PRD: `PRD/Onboarding_Questionnaire_PRD.md` (Open Questions — voice→STT and answers→Dreams both carry cost + privacy flags; needs cost-guardian + security-privacy before build). |

## L. Deferred goals (NEWLY FOUND GAP)

| ID | Item | Status | What's left |
|----|------|--------|-------------|
| **L1** | **Multiple goals from one coach conversation** | 🟡 | The coach genuinely detects multiple goals and stores the extras on `GoalSpec.deferredGoals`, but they are **never persisted or shown** — once the conversation instance ends they are dropped from the user's view. Decide: build a "parked goals" surface to activate them later, or explicitly drop for MVP. |

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
| **N1** | **i18n layer + Hebrew + RTL** | 🟡 | **Infra DONE, screen-migration PARTIAL (2026-08-09).** Was: no i18n at all — all UI copy hard-coded English, coach fixed English. Now: `i18next`/`react-i18next`/`expo-localization` (both free — no cost gate) wired in, `LanguagePreference` state, a searchable language picker, `app/src/i18n/` resource files (English + Hebrew), RTL helpers, `RestartPrompt` for direction flips. Settings + Home + `TopStatusBar` + `journey/[id].tsx` + tab labels translated. **Remaining:** `journeys.tsx`, `journey/new.tsx`, most home/journey components, Coach, secondary tabs still English-only (no crash); a full **RTL layout** sweep across every screen is not yet device-verified; the coach does not yet converse in Hebrew. Ties into the future bilingual safety floor. Do the remaining migration in controlled batches — an earlier single large pass stalled. |

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
| **Q1** | **Gender-aware "form of address" across all languages** | 🟡 | **Decision (Decision Log D31):** the app must address the user in the right grammatical form (Hebrew is gendered). Mechanism = i18next **context** (`key_feminine`/`key_masculine`, base = fallback; English just uses base, so it generalizes to every language). A persisted **`addressForm`** preference (`neutral`/`feminine`/`masculine`) drives it via a React hook (components) + a module-level accessor (framework-free engines/coach). **Sourcing:** asked at **onboarding**; if Google/Apple sign-in returns the user's gender, **auto-set** it — but still surface it in the onboarding questionnaire and let the user edit it (and edit it later in the profile). **Building now:** the mechanism + preference + a Settings/onboarding control + converting the most user-facing strings (coach + Home greeting) as a proof. **Remaining after the foundation:** convert the rest of the gendered strings incrementally (base stays the fallback); wire the sign-in auto-detect once real OAuth lands (E1, Apple-gated); move the picker into the P1 profile redesign. |

**Apple Developer Program** (purchased 2026-08-08, account details expected ~08-10) gates: real
device notifications, a native dev build, real Apple **and** native-Google sign-in, and full
onboarding. Unblocked work (B, C, D2, F, G, H, I) proceeds in parallel while waiting.

## How this list is tracked

Mirrored into the harness Task tool for live status during the build; **this doc is the durable
record** (the harness list does not persist to the repo). Update this doc incrementally as items
land — never overwrite; check items off and note what shipped.
