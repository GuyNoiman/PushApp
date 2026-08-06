# Current_Context.md

Status: Living handoff — read this right after `AI_Start_Here.md`, then only the docs it points to.
Last updated: 2026-08-06 (AI-adaptive-coach pivot build, branch `feat/buddy-3d-and-reminders`:
S0–S2 DONE & GREEN, SX realigned to 4 new domains, S3 auth in progress — see
"⭐ HANDOFF SNAPSHOT — 2026-08-06 (session end)" just below). Prior top snapshot: 2026-08-05
(S0–S2 done, SX in progress — kept below, superseded as "most current" by the 2026-08-06 snapshot
but still accurate history). Prior to that: 2026-07-20 (Hopper wired into Buddy tab +
backend-health probe + dev-URL/keep-alive tooling + competitive research v2 — merged to `main`;
PLUS an in-progress strategy conversation captured in `04_Product/Strategy_WIP_2026-07/`, all Open
Questions). Prior snapshot: 2026-07-14.
**2026-08-03 docs-only addition:** the "🔀 PRODUCT PIVOT — 2026-08-01" notice further below was
added to capture the AI-adaptive-coach repositioning (Decision Log D23) — no code changed,
engineering snapshots below (2026-07-20 and earlier) are untouched.

## How to resume
Read `AI_Start_Here.md` → this file → the memory index. Then pick up at "▶ NEXT". Do NOT re-read the whole repo.

## ⭐ HANDOFF SNAPSHOT — 2026-08-06 (session end — READ THIS FIRST, supersedes the 2026-08-05 snapshot below as "most current")

**Status:** the AI-adaptive-coach pivot is deep in build. **DONE & GREEN** (449 jest tests across
41 suites, `tsc` clean, ALL of it behind the `adaptiveCoach` feature flag
(`app/src/core/config/featureFlags.ts`), which is **OFF in production**):
- **S0** — foundations: `EncryptedLocalRepository` + the privacy `deriveOutreachInsight` boundary.
- **S1** — the adaptive engine: `Planner`, `BehaviorModelEngine`, `AdaptivePlanner`
  (`replan`/`applyReplan`), proven by a 4-persona headless simulation.
- **S2** — the conversational coach.
- **SX** — four domain experts (realigned this session — see below).

### The coach model
A **META-AGENT** (voice **"Steady"**: professional, warm, accepting, non-judgmental, plan-oriented,
explicitly **NOT a therapist**) takes the user's free-text goal, makes **ONE "understanding" LLM
call** that detects **MULTIPLE goals** (each tagged with `kind: recurring | process` and a
`domain`), **reflects them back** to the user and **FOCUSES one** (the rest are deferred on-device,
not lost), then **routes to a DOMAIN EXPERT** — one of:
**Addiction · Relationships & Loneliness · Body Image (nutrition+fitness) · Career**
— whose **own interview** asks closed-option **chips + an "Other"** field, one question at a time
(some questions are multi-select), then runs a **feasibility/reality-check**, then produces a
**FREQUENCY-BASED weekly plan** ("≈N×/week, flexible days" — **no fixed calendar dates** unless the
user explicitly names specific days).
**Object model:** Dream → Journey → Milestone → Step (a Dream groups related Journeys).
**Philosophy: framework-not-content** — the coach is not a nutritionist, not a trainer, not a
matchmaker, not a therapist; it structures and adapts, it does not supply expert domain content.
**Communication styles:** 4 named styles exist in `app/src/core/coach/communicationStyles.ts` —
`steady` is fully populated (the only one used today); `direct` / `gentle` / `spark` are empty
stubs reserved for later personalization work.

### How to test the coach right now
```
npm --prefix app run coach                                          # interactive
COACH_SCRIPT=src/core/coach/sample.script.txt npm run coach          # scripted, from app/
```
Runs against **PAID Gemini** (the founder enabled billing, capped at **~$10/mo**; model
`gemini-2.5-flash`). API key lives in the **git-ignored** `app/.env.local` as `GEMINI_API_KEY`.
**Personal-POC caveat:** an on-device app build would need this key exposed as an
`EXPO_PUBLIC_…` var (client-bundled) — fine for the founder's own personal testing device, but
**not** how a real multi-user release would ship a secret key; revisit before any wider release.

### S3 auth — in progress
Single-user Supabase sign-in + UID verification is built (`app/src/core/auth/` —
`AuthGateway.ts`, `SupabaseAuthGateway.ts`, `authUser.ts`, `singleUser.ts`). **To activate:** the
founder must (1) set a password on the Supabase user `guynoiman3@gmail.com`
(UID `d87033dc-254d-4b95-92ba-10c8ba62a87f`), and (2) add
`EXPO_PUBLIC_SINGLE_USER_EMAIL` / `EXPO_PUBLIC_SINGLE_USER_PASSWORD` / `EXPO_PUBLIC_SINGLE_USER_UID`
to `app/.env.local`. The Supabase project itself is live.

### Design/UX decisions (this session)
Full comprehensive brief: **`04_Product/UX/App_and_Screens_Design_Brief.md`** — the founder is
getting a **second, external-AI design proposal** before we wire any screens; treat the brief as
the current direction, not yet final. Colleague-facing companion doc:
**`04_Product/Domain_Expert_Authoring_Guide.md`** (how a non-engineer teammate authors a new
domain expert's interview + knowledge). Headline decisions:
- **Reuse the EXISTING app design** (minimal visual change) rather than a redesign.
- **REMOVE the avatar/Buddy tab and the Shop tab.**
- **Home priority order:** weekly tasks (including an **URGENT / "today's-focus"** block) → a
  central, inviting **Coach CTA** → **Friends** (3 who need help + 3 who deserve encouragement) →
  **My Journeys**.
- **Streak** = a prominent day-count; **breaks only if an URGENT task is missed** (not any miss).
- **Levels are KEPT**, but reframed to reward **BREADTH** — running multiple parallel Journeys, up
  to a cap — rather than depth/grind in one Journey.
- **Urgent** is computed, not authored: a task becomes urgent when
  `remaining-days-in-week == remaining-required-sessions` (i.e., the user is out of slack this
  week).
- **Dream = coach-suggested, user-approved.** The coach SUGGESTS linking related Journeys into a
  Dream; the user must APPROVE the link. "My Journeys" is grouped by Dream once approved.
- **Journey editing is primarily conversational** — through the coach — plus a simple
  **Freeze/Resume** button for pausing a Journey without deleting it.
- **Step reporting is small and emotional/visual**, not a form: happy-face **Done** / sad-face
  **Couldn't** / **Partial** / **Postpone**.
- **The entire coach conversation runs fully on the phone** (not a web/desktop-only surface).
- **People/support layer is first-class in the brief** — Ally, Support Circle, reciprocal friends,
  and goal/Dream Communities are all specified there, not deferred as an afterthought.

### Next steps, in order
1. Founder returns with the **second design proposal** → team decides direction → wire the coach
   conversation fully on-phone + rebuild Home + My Journeys on the (mostly) existing design,
   removing the avatar/Buddy and Shop tabs.
2. Wire the **report → adaptive-edit loop** to a real, built Journey so a user visibly sees the
   plan respond to a miss/report, not just in the headless simulation.
3. Finish **S3** (auth/backend activation per above), then **S4** (social / Ally / Support Circle /
   Communities) + the Dream-linking (coach-suggests/user-approves) flow.
4. **S6** hardening/compliance, then **S7** launch.

### Open follow-ups (still pending — explicit next tasks, not silent gaps)
- Reconcile the `Phase` → `Milestone` rename across the remaining docs/code that still say "Phase"
  (deliberately deferred at pivot time, D23; still not done).
- Harden device crypto: move to authenticated encryption + a secure RNG.
- A completed-Journey should not derive `atRisk` in the behavior model (nit, not yet fixed).
- Wire `redactForCloud` on the outbound LLM path before any real user's disclosures could reach it.
- **The SAFETY FLOOR is not yet built:** bilingual (Hebrew/English) inbound crisis-detection +
  escalation, disclaimers/consent, and hardening `SafetyLayer` + substance-use gating. Per this
  session's decisions, the two most sensitive domains — **Addiction** and
  **Relationships & Loneliness** — must stay **flag/dev-only** until the safety floor lands **and**
  a clinical review has happened. Do not let these reach a real user before then.

### Working method
One status-tracked task list (stages **S0–S7 + follow-ups**) lives in the harness Task tool for
this build and does **NOT** persist to the repo automatically — **this Current_Context snapshot is
the durable record.** A resuming session should rebuild its working task list from this snapshot
(cross-reference `06_Decisions/Decision_Log.md` **D23** and the `pushapp-*` memory index entries,
especially `pushapp-ai-coach-pivot`, `pushapp-working-method`, and `buddy-3d-pipeline`).

### Key files/dirs
- `app/src/core/learning/` — the adaptive engine (`Planner`, `AdaptivePlanner`,
  `BehaviorModelEngine`, `DomainExpert.ts`) + `app/src/core/learning/experts/` (the 4 domain
  experts + `registry.ts` + `expertKit.ts`).
- `app/src/core/coach/` — `CoachOrchestrator.ts`, `coachPrompts.ts`, `communicationStyles.ts`,
  `interviewPlaybook.ts`, `goalSpecToJourney.ts`, `devHarness.ts`, `SafetyLayer.ts`,
  `disclosureParser.ts`.
- `app/src/core/insights/` — the derived-insight / `deriveOutreachInsight` boundary.
- `app/src/core/persistence/EncryptedLocalRepository.ts`.
- `app/src/core/auth/` — single-user Supabase auth (S3).
- `04_Product/UX/App_and_Screens_Design_Brief.md`, `04_Product/Domain_Expert_Authoring_Guide.md`,
  `04_Product/Strategy_WIP_2026-07/*` (still open-question strategy material, unchanged this
  session).

**▶ NEXT:** see "Next steps, in order" above — item (1) (founder's second design proposal) is the
current blocker before screen-wiring can start.

---

## ⭐ HANDOFF SNAPSHOT — 2026-08-05 (PIVOT BUILD: S0–S2 done, SX in progress — superseded above by the 2026-08-06 snapshot; kept as accurate history)
**Everything below lives on branch `feat/buddy-3d-and-reminders` (not yet merged to `main`), and is
built entirely behind the off-by-default `adaptiveCoach` feature flag
(`app/src/core/config/featureFlags.ts`) — the existing engine (Journey/Reward/Buddy/Shop/Mission/
Reminder/Auth/Social/Entitlement) is untouched when the flag is off.** Follows the founder's working
method — one status-tracked S0–S7 task list, sequential, build-each-component-then-integrate (full
method: `04_Product/Build_Plan_and_Method.md`). **Cross-reference: `06_Decisions/Decision_Log.md`
D23** (the pivot decision this whole build implements) and `11_Engineering_Bible/
Engineering_Decisions.md` **§E5** (the hub-and-loop architecture).

- **S0 — done.** Foundation docs-only groundwork: the pivot recorded (D23); **Milestone** adopted as
  the canonical mid-layer term; the **hub-and-loop architecture** designed (§E5) +
  `Build_Plan_and_Method.md` written; an **encrypted local store** (AES + `expo-secure-store`, with
  migration + key rotation); privacy types plus the **`deriveOutreachInsight` boundary** (raw
  disclosures never leave the device; only a derived, enum/bucket insight may cross it) + guard tests
  + a `NullInsightGateway`.
- **S1 — done, PROVEN.** The adaptive engine itself: **Planner** (goal → Journey), a **DomainExpert**
  seam + `GeneralExpert` (the domain-agnostic default), **BehaviorModelEngine** (on-device raw
  behavior log + a slip detector — the first producer of `StepMissed`), **AdaptivePlanner**
  (`replan` + `applyReplan`), a **CoachNarrator** seam, and — the proof point — a **headless
  simulation running 4 personas** that demonstrates the closed loop actually adapts:
  compress/shrink/shed/at-risk responses, weekend-concentration detection, and early-warning
  behavior. Wired into `AppCore` behind the flag.
- **S2 — done, testable.** The conversational coach: a **Gemini client** behind an `LlmClient` seam
  (`gemini-2.5-flash`, API key in a git-ignored env file — no cost risk taken silently), an editable
  **interview playbook** + coach prompts, a **Coach Orchestrator** (the playbook controls *what* to
  ask; the LLM handles phrasing/parsing, not decision logic), a hardened disclosure parser, a
  **SafetyLayer**, `GoalSpec` → Journey conversion, and an interactive dev harness
  (`npm --prefix app run coach`) to converse → build → report/non-report → adapt, live, from the
  terminal.
- **SX — in progress.** Four first-cut `DomainExpert`s (recovery, self-confidence, nutrition, sport)
  + a registry, built to validate the expert-partition seam from S1. Per-domain knowledge bases and a
  safety/clinical review are the next phase before any of these could be real — SX is explicitly
  **not** part of the S0–S7 spine (Future Vision add-ons per D23; see `Build_Plan_and_Method.md`).
- **Test suite:** grew from 177 → 338 tests, all green; `tsc` clean throughout.
- **Open follow-ups logged (each an explicit next task, not a silent gap — per the working method's
  rule 3):** wire outbound redaction before real users touch this; harden device crypto (move to
  authenticated encryption + a secure RNG); a completed-Journey `atRisk` nit in the behavior model;
  reconcile the `Phase`→`Milestone` rename across remaining docs/code (D23 flagged this as
  deliberately deferred, not forgotten); a safety/clinical review gating the sensitive SX domains
  before they get real knowledge bases.

**▶ NEXT:** continue the SX per-domain knowledge-base + safety-review track, or resume the S0–S7
spine — founder's call. Read `04_Product/Build_Plan_and_Method.md` for the full stage table and
status method before picking either up.

## 🔀 PRODUCT PIVOT — 2026-08-01 (read this before the snapshots below)
**PushApp is repositioning from a gamified-companion app to an AI adaptive coach.** Full record:
`06_Decisions/Decision_Log.md` **D23**. Mission is **unchanged** ("become who you choose to be" —
`09_Product_Philosophy/Product_Philosophy.md`); only the *mechanism* changes. Key points: continue
the **same repo/codebase** (evolution, not a rewrite — the engine architecture already fits);
**mature progression, not childish gamification** (points/levels/Missions kept; Buddy stays but
**evolves per level** instead of dress-up cosmetics); the moat is the **closed feedback loop**
(behavior → insight → re-plan → nudge → behavior), not any single AI feature; a **domain-agnostic**
engine with **general habits/goals** as the current build target (sharp-vs-general positioning is
an **Open Question**, deliberately deferred); domain-expert modules (sports, certs, nutrition, …)
are **Future Vision**, added later; privacy = **local-first split** (raw disclosures on-device
only, a minimal derived insight model may sync for outreach timing).

**Everything below this notice (all HANDOFF SNAPSHOTS, engineering state, open founder decisions)
remains accurate as engineering/process history** — the code, branches, and mechanics described did
happen and mostly still stand. What's superseded is the *positioning framing* they inherited from
the old gamified-companion direction (see superseded-notes added 2026-08-03 to
`09_Product_Philosophy/Product_Philosophy.md`, `04_Product/Product_Bible.md` §21.5/§15.1, and
`00_Foundation/Information_Architecture.md`). **Terminology, the engineering/architecture docs, and
the working-method are NOT yet updated for the pivot** — that is a separate follow-up task (S0.2).

## ⭐ HANDOFF SNAPSHOT — 2026-07-20 (STRATEGY THINKING + MERGE-TO-MAIN + HOPPER IN BUDDY TAB — read this first)

**Two kinds of work this session: (a) code that shipped and merged, (b) a strategy conversation that
is explicitly still in progress.**

**(a) Code — done, committed, and `main` fast-forwarded to it** (six topic commits + a merge; the
panel-position fix from an earlier branch is now on `main` as well):
- **3D Hopper wired into the Buddy tab** — `BuddyScene` renders `<BuddyView transparent>`; added an
  additive `transparent` prop to the registry-driven renderer (opaque default preserved for the
  spike). **Verified on device** (iPhone/Expo Go — EXGL logs + founder confirmation). Web can't
  verify (GLB loader is native-only). Home still uses the 2D avatar, by request.
- **`fix(social)` backend health probe** — `app/src/core/social/backendHealth.ts` probes
  `/auth/v1/health` once at startup; on failure (or 5xx) calls `stopAutoRefresh()` and degrades the
  social/auth pillars quietly instead of the red "Network request failed" banner. Root cause was a
  **deleted Free-tier Supabase project** (DNS NXDOMAIN); the founder later restored it. A 4xx counts
  as healthy, a 5xx does not (learned from a Cloudflare 521 during restore).
- **`chore(dev)` dev tooling** — `npm run dev` pins Metro to the Mac's Bonjour hostname
  (`exp://<LocalHostName>.local:8081`) so the Expo Go "Recently opened" entry survives DHCP IP
  changes (the recurring `Network request failed` on device). Plus `tools/supabase_keepalive.sh` +
  `tools/install_keepalive.sh` + a launchd plist: a weekly $0 keep-alive so the Free-tier Supabase
  project never idles out again. (Keep-alive installs a copy under `~/Library/Application Support`
  because macOS TCC blocks launchd from reading/executing under `~/Documents`.)
- **`docs(research)` competitive research v2** — `05_Research/PushApp_Competitive_Research_v2_2026-07`
  (.docx + .pdf): 15 competitors, official App-Store screenshots, per-competitor AI-implementation
  tables, the original 8 comparison tables carried over, a "what died and why" chapter, NLP evidence
  + claim-risk section. Hebrew RTL.
- **`feat(ui)` resource-bar polish** + **`assets(buddy)` Hopper v3** (founder's ingest output).

**(b) Strategy — STILL THINKING, nothing approved.** Captured in
**`04_Product/Strategy_WIP_2026-07/`** (README.md + three standalone HTML visuals for a future
deck). Headlines, all **Open Questions**:
- **Finch is the real benchmark** and is dangerously close at the feature layer; the defensible trio
  is creator-marketplace-as-network + no-punishment real-life accountability + long-horizon
  transformation. Finch has **no marketplace** and **won't** add real-life verification.
- **"Ignition, not Maintenance"** — candidate reframe: serve the *stuck / pre-contemplation* user
  (avoidance → first action), the stage every incumbent ignores. Upstream of the current mission.
- **AI is cheap if architected right** (Haiku + prompt caching ≈ ¢/conversation; Level-1-first,
  behind paid tier, safety guardrails; you do NOT train a model — it's prompt + content + Wysa-style
  scripting).
- **Miss-recovery flow** (founder's design): closed list → closed list → AI only at "Other", which
  does empathy **+** structured classification; most reason→lever decisions are **rules, not AI**.
- **Categories: founder chose Option B** (dedicated palette). Build `src/core/config/categories.ts`
  + optional `Journey.categoryId`. Not yet built.

▶ **Resume from `04_Product/Strategy_WIP_2026-07/README.md` §7 (Open Questions).**

## ⭐ HANDOFF SNAPSHOT — 2026-07-14 (BUDDY 3D REGISTRY + REMINDERS/SCHEDULER + UI POLISH — read this first)
**Everything in this snapshot lives on branch `feat/buddy-3d-and-reminders`, NOT yet merged to
`main`.** Five commits this session: `943c732`, `ec69977`, `69d8616`, `d9e5866`, `75f0a36`.

**3D Buddy / creatures — from spike to a real registry-driven module:**
- Adopted the founder's **PUSh Creature SDK v1.0** (`app/assets/buddies/_sdk/` — README, docs,
  shared assets, templates, validation). Built `app/tools/ingest_creature.py`: a **hybrid** ingest
  pipeline that accepts either an embedded-GLB package or an external-`materials.json` package and
  produces small **modular per-species packages** plus a generated registry
  (`app/src/core/buddies/registry.generated.ts`). `app/src/components/buddy3d/BuddyView.tsx` remains
  the **only** place `three`/`expo-gl` may be imported (per the eslint-enforced boundary from the
  2026-07-13 spike). The `/buddy3d-spike` route now flips through species for visual QA.
- **17 species ingested** (`app/assets/buddies/<species>/`, ~1–2.4MB each — boulder, chroma, dozer,
  dragon, glow, heart, hoarder, hopper, horse, jumper, magnet, mist, nimbus, shell, shy, storm,
  thorn), replacing the old throwaway `hopper_v1`/`hopper_v2` spike assets (kept on disk for
  provenance, no longer wired).
- **RN texture-render fix (commit `d9e5866`):** external (non-embedded) textures were rendering
  blank on-device — root cause: **r3f-native's `TextureLoader` uploads no pixels on RN/expo-gl**.
  Fixed by a **pure-JS PNG decode → `THREE.DataTexture`** path (using `upng-js`), bypassing the
  loader entirely. `BuddyView` now applies `map`/`normalMap`/`emissiveMap` this way. Ingested the
  **detailed v3 Hopper** (painted albedo + normal maps + a glowing face) using this pipeline.
  **This still NEEDS on-device confirmation** (paint accuracy, `flipY`, texture tuning) — not yet
  verified live like v2 was. Hopper's geometry is still **21.6MB** (unoptimized) — a **low-poly
  regen has been requested from the founder**; spec update lives in
  `app/assets/buddies/_sdk/docs/EXPORT_SPEC_v3_detailed.md`.
- **Still pending / not done this session:** wiring `BuddyView` into the actual Buddy tab behind
  `featureFlags.buddy3d` (the tab still shows the 2D SVG egg/`BuddyAvatar` — D18's interim Ember);
  closing the fidelity gap vs. the founder's reference sheet; the shared face-expression system (8
  expressions are captured in the assets but not yet driven by app state/events).

**Reminders / Journey model — object-model decision + new engine + scheduler:**
- **Journey model confirmed with the founder:** a Journey holds a **FINITE set of Steps**, each
  completed **once** (triggers a per-Step celebration via a `StepCheckedIn` event), and the Journey
  **completes when its LAST Step is done**. This is the model now implemented (commit `ec69977`).
  Recurring "weekly copies" of Steps (via the Weekly-Planning flow, D12/Bible §34.7) are explicitly
  a **LATER task** — not dropped, just sequenced after the finite-Step model lands solid.
- **Reminder engine core** (commit `ec69977`): `ReminderRule` + `ReminderEngine.scheduleRule`, plus
  `NullLocationGateway`/`NullCalendarGateway` (vendor-isolated, behind feature flags, dormant —
  consistent with the reserved-seam pattern from E4/`Module_Architecture.md`).
- **Communication Scheduler** (commit `75f0a36`, `app/src/core/engines/CommunicationScheduler.ts`):
  aggregates all active-Journey reminders into one schedule and applies `SchedulingPrefs`
  (`preferredDays` as a **hard filter**; an allowed time-window with morning/evening clamping);
  enforces the **iOS 64-local-notification cap** (`app/src/core/config/schedulerLimits.ts`) and
  emits a `SchedulerCapped` event when reminders had to be dropped to stay under it, rather than
  silently over-scheduling or crashing.
- **Calendar/location integration is seams-only** (Null gateways, on-device-only design, background
  geofencing explicitly **deferred**) — this is a **new privacy red-line, logged as R3** (see
  `06_Decisions/Decision_Log.md` D21) to avoid colliding with the existing R1/R2 auth-session
  red-lines already defined in `11_Engineering_Bible/Auth_Backend_Proposal.md`.
- **Onboarding is now framed as a MISSION-based flow**: create a Journey / open the Shop / enable
  notifications / take a personality quiz → each grants XP → the egg hatches once enough XP is
  earned. The personality quiz **must pass a security-privacy review before it stores anything**
  — it targets the already-reserved `ProfileGateway` seam from E4 (`app/src/core/profile/`), so no
  new PII surface should be opened without that review.

**UI polish pass (commit `69d8616`):**
- Home: the dynamic bottom sheet now has a bounded height so it no longer covers the Buddy; more
  compact tab bar; the internal list now scrolls independently.
- "My Journeys" area tile added (Missions tile moved right to make room); shows a done/total count;
  each Step row gained a **⋯ menu** and a **Reschedule modal**.
- Resource bar: coin display is now a coin-stack, a GT shield icon was added, level+XP unified into
  one frame.
- A completed Step now **stays visible** in its list (rendered green, no more "DONE" watermark
  covering it) and triggers a check-in celebration.
- Buddy tab: inventory panel reflushed; Buddy name/stage now render below the meter (not overlapping).
- "My Journeys" screen is now tabbed; Explore gained search + a clear button; the journey-creation
  wizard now uses `KeyboardAvoidingView`; the Missions modal background is transparent (matches the
  floating-modal pattern used elsewhere).

**Open founder decisions (▶ NEXT):**
1. Founder to approve the UI designs **on-device** (this session's polish pass hasn't been
   device-verified yet, unlike prior fidelity passes).
2. Two design-reference artifacts await founder review: the primary-CTA "quests" reference, and the
   4-area-tile reference (a redesign-proposal artifact exists but is not yet an approved direction).
3. Decide whether onboarding is **mandatory or skippable**.
4. Get the **low-poly Hopper v3 regen** from the founder (current geometry too heavy at 21.6MB ×
   17 species).
5. Once the above land: wire the validated 3D renderer into the actual Buddy tab behind
   `featureFlags.buddy3d`.

**Also logged this session:** `06_Decisions/Decision_Log.md` D20 (notification-permission ask
folded into onboarding), D21 (notification/communication-management mechanism + optional opt-in
location/calendar reminder rules, background geofencing deferred, privacy red-line R3), D22 (keep
the "Phase" display name — no rename).

---

## ⭐ HANDOFF SNAPSHOT — 2026-07-13 (3D BUDDY RENDERING — read this first)
**Real-time 3D Buddy rendering is VALIDATED on the founder's iPhone.** The founder is producing
detailed **3D character GLBs** (roster "PUSh Characters v1.0": 13 core + 6 reward species, each with
3 mastery levels + a unified robot-screen face, 8 expressions). Decision (2026-07-13): **real-time 3D**
(not 2D), stack = **expo-gl + three@0.180 + @react-three/fiber@9 (native)**, **SDK 54, runs in Expo Go
(no dev build)**, procedural animation (GLBs aren't rigged). Species model = **Both** (species that also
evolves through mastery). This SUPERSEDES the interim-SVG-Buddy plan (D18/Ember) and the earlier 2D
BuddyAvatar for the Buddy tab (2D avatar stays elsewhere).

**🔑 THE handoff doc: `11_Engineering_Bible/Buddy_3D_Spike_Findings.md` — READ IT FIRST for 3D work.**
It captures every hard-won expo-gl/RN gotcha (they each caused a failure): navigator.userAgent shim
(imported first), NO `gl.setSize`/setPixelRatio (corner bug), NO shadows/PMREM-IBL/EffectComposer-bloom
(render targets break on expo-gl), recompute missing vertex normals (else pure black), **EMBEDDED glTF
textures DON'T decode on RN → load SEPARATE textures via `TextureLoader().loadAsync(require('...png'))`
passing the MODULE not a URI**, normalize model + fixed camera, Y-up. Do NOT re-learn these.

- **Working reference (committed, `087e870`):** `app/src/app/buddy3d-spike.tsx` (+ `.polyfills.ts`,
  `app/metro.config.js`) — throwaway route `/buddy3d-spike`, NOT wired into tabs; renders the detailed
  textured **Hopper v2** GLB at **60 FPS** with the real face. This is the blueprint for the real module.
- **Assets:** `app/assets/buddies/hopper_v1/` (procedural placeholder, superseded) and
  `app/assets/buddies/hopper_v2/` (detailed textured, renders — commit `5e1622b`). **🚨 v2 is ~40MB
  (21MB embedded GLB + 4.5MB baseColor PNGs) — NOT viable × 19 chars (~760MB).** Backup: the founder's
  `~/Downloads/PUSh_Hopper_v2_Runtime_Package.zip`.
- **▶ NEXT (3D):** (1) get a **compressed v3 Hopper** — hand the founder the spec update: **separate +
  compressed textures (KTX2/Basis or ≤1K), NOT embedded** (fixes size AND the RN decode issue); keep the
  rest of the v2 spec. (2) Promote the spike → the real module: `app/src/core/buddies/` (species registry
  from JSON contracts, generic; cosmetics registry split from characters; expressions; animation policy;
  mastery mapping) + `app/src/components/buddy3d/` (ONLY place `three` may import — eslint-enforce), a
  `BuddyRenderer` interface, behind `featureFlags.buddy3d`, Buddy-tab-only (one GL context, dispose on
  unmount), 2D `BuddyAvatar` elsewhere. (3) Real SVG face + 8 expressions on `face_screen` (bus-driven).
  (4) Wearables at `anchors.json`, mastery from `mastery.json`, procedural idle+teleport-jump animations.
  (5) Then all 19 characters. See `Buddy_3D_Spike_Findings.md` §NEXT.
- **Also committed this session (design + backend, all on `main`):** full v14 fidelity pass + 5 older
  screens; Home reworked to spec (frozen top + draggable panel + swipe-to-report); auth foundation P1-P2
  (E3/D19); account-tier/entitlement mechanism; modularity seams + `Module_Architecture.md` (E4).
- **Still open (founder-owned):** ~$99/yr Apple account for P3 native sign-in; deferred data wirings
  (user name, Grace Tokens, Consistency screen, per-weekday scheduling); the pending small bug batch
  (Explore search/keyboard, Explore Journey tap, Buddy locked-tab tooltip, Inbox compose).

## ⭐ HANDOFF SNAPSHOT — 2026-07-12 (module architecture doc + reserved seams)
**An architecture audit confirmed PushApp is modularity-adherent** (framework-free engines over
an event bus, vendor-isolated `*Gateway` boundaries with `Null*` fallbacks, config-before-code,
offline-first Repository, no business logic in UI). New canonical doc:
**`11_Engineering_Bible/Module_Architecture.md`** — the full module map (Journey · Reward · Buddy
· Shop · Mission · Reminder · Auth · Social · Entitlement, all BUILT) plus four FUTURE domains
now given **reserved seams** (boundary only, no feature logic, per CLAUDE.md §3 "vision never
shrinks"): User-Model/Profiling, Intervention/Communication, Interests (each a `*Gateway` +
`Null*` + off feature flag), and a fourth, Close-Circle-deeper, listed but with no seam yet.
Landed in commit `746c685` — also 4 small behavior-preserving tidy-ups (progress-math selector
moved into `JourneyEngine`, Shop catalog access centralized in `AppCore`, `EntitlementEngine`
construction moved into `AppCore`). `tsc` 0, jest 87/87, eslint clean, zero user-visible change.
Decision record: `Engineering_Decisions.md` §E4. **Before any of the three reserved domains gets
real logic, it must go through security-privacy (RLS + data-minimization) and, if it changes data
collection, store-compliance (App Privacy label) — per CLAUDE.md §5.**

**Open items carried forward, unchanged by this session:**
- **Buddy art direction** — still unresolved (founder rejected the 4 creature concepts; interim
  Ember stands in per D18).
- **Buddy inventory interior** depth question — awaiting founder's call.
- **P3+ native auth (paid)** — awaiting founder go-ahead on the ~$99/yr Apple Developer Program
  (see the 2026-07-10 snapshot below for full detail).
- **Deferred data-model wiring** (Grace Tokens, Consistency screen, weekday scheduling,
  profile/name, Social gift/message, Shop real-money data model, inventory categories) — unchanged.

**▶ NEXT (resume here):** (1) pick up the still-open founder decisions above (Buddy art
direction; Buddy inventory interior; the ~$99/yr Apple Developer Program approval for P3+ native
auth); (2) the deferred data-model items can be wired as their owning pillars land; (3) once
several land, re-run `Design_Fidelity_Audit.md`. `Module_Architecture.md` itself needs no further
work until a reserved domain is actually scheduled for implementation.

---

## ⭐ HANDOFF SNAPSHOT — 2026-07-10, later this day (auth foundation P1–P2 landed)
**Real-accounts auth work started.** `11_Engineering_Bible/Auth_Backend_Proposal.md` (a four-specialist
synthesis: architect · security-privacy · store-compliance · cost-guardian) was approved-in-principle
by the founder, then the free half of it was built and committed.

**Founder decisions (D19, `06_Decisions/Decision_Log.md`):**
1. **Auth method = Sign in with Apple + Google**, passwordless (no email/password, no SMTP).
2. **Do NOT collect the user's real name** — identity stays handle + Buddy; email is quarantined in
   Supabase's `auth.users`, never written to `public.*`.
3. **Build the free foundation (P1–P2) first**, at $0 with zero user-visible behavior change. The
   ~$99/yr Apple Developer Program + native Apple/Google + dev build (P3+) is a **later, separately-
   approved step** (CLAUDE.md §3.10) — the only unavoidable cost; everything else stays $0 at MVP scale.

**Landed (commit `2af2468`):** a vendor-isolated `AuthGateway` (`app/src/core/auth/`: interface +
`AuthUser` + `NullAuthGateway` + `SupabaseAuthGateway` + factory + pure `toAuthUser`), a new
`AuthProvider` that now owns anonymous session bootstrap (moved out of `SocialProvider`, which reacts
to the auth uid instead), `featureFlags.auth`, and **R2 hardening**: Supabase session storage moved
from plaintext AsyncStorage to `expo-secure-store` on native (byte-safe UTF-8 chunking + generation-
based atomic writes; web keeps AsyncStorage). **Zero user-visible change — app still boots anonymous.**
Apple/Google methods are declared but throw `AuthNotAvailableError` until the native P3+ dev build.
`tsc` 0, jest 55/55, code-reviewed (findings fixed: a cheers realtime bind race, byte-vs-char
chunking, non-atomic writes). Full decision record: `Engineering_Decisions.md` §E3.

**Open items / decisions the founder still owns (carried, unchanged from the prior snapshot below):**
- **Buddy art direction** — still unresolved (founder rejected the 4 creature concepts).
- **Buddy inventory interior** depth question — awaiting his call.
- **Deferred data-model wiring** — Grace Tokens not in `AppState`, no Consistency screen/route, no
  per-weekday Step scheduling, no user profile/name, Friends Gift/Message have no `SocialGateway`
  methods, Shop real-money data model, inventory Items/Location/Furniture categories. (Unchanged by
  today's auth work — auth deliberately does not touch these.)
- **New: P3+ native auth (paid)** — awaiting founder go-ahead on the ~$99/yr Apple Developer Program
  before Apple/Google sign-in can actually be tapped by a user, and before a dev build replaces the
  Expo Go loop for auth testing. See `Auth_Backend_Proposal.md` §8 for the full phase list (P3–P7).

**▶ NEXT (resume here):** (1) founder decides whether/when to approve the ~$99/yr Apple Developer
Program to unblock P3 (native dev build stand-up) → P4 (Apple sign-in) → P5 (Google sign-in) → P6
(hardening) → P7 (account deletion + privacy policy + store compliance); (2) meanwhile, the design/
data-model open items below are independent and can proceed in parallel — resolve Buddy art direction,
decide Buddy inventory interior, wire deferred data-model items as their pillars land; (3) once several
land, re-run `Design_Fidelity_Audit.md`.

---

## ⭐ HANDOFF SNAPSHOT — 2026-07-10, earlier this day (v14 design-fidelity pass)
**The v14 mockup-fidelity build is DONE.** Building on the prior 2026-07-10 snapshot below (5-tab nav +
Explore/Inbox/Journeys cluster shipped), this session did the **fidelity pass** the prior snapshot's
"▶ NEXT" called for — ten commits, all on `main`, `tsc` clean throughout:

1. `dbb3e55` **Weekly planning** screen (new `/weekly-planning` modal, mockup screen-18) — the one
   remaining screen from the v14 set that had no route yet.
2. `ab74e5f` **Home rebuild** + two new shared primitives: `ResourceBar` (floating level+XP / GT / coins
   strip) and `GlossyTile` (3D squircle button). Home is now ResourceBar + "Hello" speech bubble +
   centered Buddy flanked by 4 GlossyTile area buttons + a cream Week's-steps panel. `StepCard` upgraded
   (icon tile, Journey·Phase line, progress bar, states). `journeyGlyph()` shared via `journeyView.ts`.
   (mockup screen-01)
3. `2f811f5` **Buddy rebuild**: ResourceBar + `BuddyScene` (Customize/Shop GlossyTiles) + new
   `BuddyInventory` (5 category tabs, item grid, Select). (screen-10)
4. `f61288c` **5-icon bottom nav** (Ionicons, per-tab active accents, Inbox unread dot) in
   `app-tabs.tsx` / `app-tabs.web.tsx`; fixed a web-harness bug where the tab strip overlaid the top
   ~140px of every screen. Documented in `Screen_Bible.md`.
5. `6638569` Added eslint + `eslint-config-expo` dev tooling (+ `eslint.config.js`).
6. `4533ee0` **Buddy refinement** per founder feedback: scene now full-bleed edge-to-edge with
   ResourceBar floating over it; inventory is one unified framed sheet (grabber, rounded top, hairline +
   upward shadow).
7. `a5df8b4` **Shop fidelity** (structured header, glossy coin pill, Featured/Cosmetics/Coins/Offers
   sub-tabs, glossy item cards with price chips). (screen-11)
8. `6373bac` **Friends fidelity** (new `FriendRow` + `FriendActionMenu`; Needs-your-cheer + A-Z
   Your-friends; Cheer CTA; 3-dot menu). (screen-09 — closes the fidelity gap already logged as
   "FIXED 2026-07-10" in `Design_Fidelity_Audit.md` §09.)
9. `a91038e` **Missions + Login fidelity** (floating modal, gold-underline tabs, Daily/Weekly pill
   switch, three mission states, 7-day login rail). (screen-16/17)
10. `90a3591` **Journey-creation wizard fidelity** (Name/description, duration/rhythm with fixed
    tooltip, Plan-the-steps, Your-why). (screens 05-08)

All screens were screenshot-verified against their mockups (~440-480px web width). **The full v14
screen set now has a first-pass native implementation** — this closes the "fidelity pass" item that
was the top of the prior snapshot's NEXT list. `Design_Fidelity_Audit.md` (2026-07-09) is now
**partially superseded**: it was written before this pass and still describes the *pre-fidelity* flat/
gray state for most screens (only §09 Friends was marked fixed at the time). It has not been re-run
post-fixes — treat its per-screen P0/P1 tables as historical unless a screen is reconfirmed broken.

**Open items / decisions the founder still owns:**
- **Buddy art direction** — still unresolved; founder rejected the 4 creature concepts (`07_Assets/Buddy_Creature_Concepts.html`); needs a new direction before final Buddy art.
- **Buddy inventory interior** — open question posed to the founder: go deeper on inventory tiles/states/labels, or leave the current framing. Awaiting his call.
- **Deferred data-model wiring** (screens use documented placeholders/TODOs until these land): Grace
  Tokens not in `AppState` (Home/ResourceBar shows a placeholder); no Consistency screen/route (Home
  button is a no-op TODO); no per-weekday Step scheduling (Weekly planning groups via a placeholder
  hash); no user profile/name (Home greeting falls back to "friend"); Friends Gift/Message have no
  `SocialGateway` methods (disabled placeholders — same known gap the audit already noted for §09);
  Shop real-money packs / daily rotation / purchase caps have no data model (Featured/Coins/Offers tabs
  show honest "coming soon"); inventory Items/Location/Furniture categories have no data model (locked
  tiles).

**Operational notes:**
- Known harness artifact: headless-Chrome web screenshots clip the right edge below ~440px on ALL
  screens (native RN renders correctly on device); verify web at ≥440-460px.
- The Expo dev server crashed several times under 4 concurrent verification agents hammering it (port
  churn from repeated restarts); code was unaffected. If running many agents that screenshot, expect to
  restart `npx expo start` and consider serializing screenshot-heavy verification.

**▶ NEXT (resume here):** (1) restart the dev server + hand the founder a fresh QR, and have him review
the fidelity pass on-device; (2) resolve the **Buddy art direction** with the founder (blocks final Buddy
art everywhere); (3) decide the **Buddy inventory interior** open question; (4) wire the deferred
data-model items above as their owning pillars land (Grace Tokens, Consistency screen, weekday
scheduling, profile/name, Social gift/message, Shop real-money data model, inventory categories); (5) once
several of the above land, re-run a `Design_Fidelity_Audit.md` pass to confirm no regressions and retire
its now-stale per-screen tables.

---

## ⭐ HANDOFF SNAPSHOT — 2026-07-10, earliest this day (5-tab nav + Journeys cluster)
**The app RUNS on the founder's iPhone (Expo Go), and we're mid-way through building the full v14
mockup design.** POC is code-complete (5 pillars, on `main`, GitHub `GuyNoiman/PushApp`). Now doing a
screen-by-screen design build to match the mockups.

**📱 Runs on device — Expo SDK 54.** The founder's Expo Go supports **exactly SDK 54** (confirmed
on-device: Settings→App Info→Supported SDK 54). App was downgraded 57→56→54 to match. **To run:**
`cd app && npx expo start` (server on LAN **192.168.0.123:8081**); the founder scans a QR with the
iPhone **Camera** app (Expo Go's "manual URL" is gone in his version) → "Open in Expo Go". Make a QR:
`node -e "require('qrcode').toFile('/tmp/q.png','exp://192.168.0.123:8081',{width:640,margin:3},()=>{})"`
then `open /tmp/q.png`. Web build also works (`web.output:"single"`) — screenshot routes via headless
Chrome at `http://localhost:8081/<route>` to visually verify.

**🎨 FULL-DESIGN BUILD — progress (all verified tsc-clean + web-screenshot vs mockup, committed per chunk):**
- ✅ **Foundation** — Baloo 2 + Inter fonts loaded; **glossy SVG Buddy** (`BuddyAvatar`, stage-aware,
  egg for L1 → hatches with level); **5-tab nav** (Home · Explore · Friends · Buddy · Inbox). Friends
  moved from modal → tab; Explore/Inbox were stubs.
- ✅ **Explore** tab (discovery carousels — For you / Top creators / From brands; sample content).
- ✅ **Inbox** tab (IG-style list wired to real friend-requests + cheers via `useSocial`).
- ✅ **Journeys cluster** — `journeys.tsx` (list, real journeys), `journey/[id].tsx` (detail),
  `achievements.tsx` (+ detail sheet; sample achievement data). Home has a "Journeys" entry. *(Committed
  with this handoff.)*
- ⏭️ **NOT DONE:** **Weekly planning** screen (mockup screen-18); and the **fidelity pass** on existing
  screens (Home, Buddy scene, Shop, Friends, Missions/Login modals, Journey-creation wizard) to match
  each mockup exactly (spacing, depth, game-juice). Also still deferred: illustrated Buddy art direction
  (founder rejected the 4 creature concepts — see `07_Assets/Buddy_Creature_Concepts.html`; needs a new
  direction), and per the audit, deeper game-juice.

**🗂️ DESIGN TARGETS ARE NOW IN THE REPO:** `04_Product/UX/UX_References/mockups_v14/` — screen-01..18.png
+ `mockup_v14.html`. Mapping: 01 Home · 02 Journeys · 03 Journey detail · 04 Explore · 05–08 Creation
(Name/rhythm/Plan/Your-why) · 09 Friends · 10 Buddy · 11 Shop · 12 Hatch reveal · 13 Achievements ·
14 Achievement detail · 15 Inbox · 16 Missions · 17 Login · 18 Weekly planning. The gap punch-list:
`04_Product/UX/Design_Fidelity_Audit.md`.

**🔑 State a new session needs:**
- **Social pillar** (E2, Supabase, anonymous auth): keys live in **gitignored `app/.env`** — they
  PERSIST on this Mac (not in git). On a fresh clone they must be recreated (URL + publishable key from
  the founder's Supabase). Social is behind `featureFlags.social` (auto-on when env present).
- **Permissions:** this Mac has a permissive "YOLO" config in `.claude/settings.local.json`
  (acceptEdits + broad allow-list + dangerous-op deny-list). Machine-local, not committed.
- **Build method:** delegate each screen to an implementer/ux-designer agent with the mockup image +
  audit as spec; agent verifies `tsc --noEmit` + a headless-Chrome web screenshot of the route vs the
  mockup; then commit per chunk. `qrcode` npm pkg was in a session scratchpad — reinstall if needed.

**▶ NEXT (resume here):** (1) restart the dev server + hand the founder a fresh QR; (2) build the
**Weekly planning** screen (screen-18); (3) do the **fidelity pass** on the existing screens vs mockups;
(4) resolve the Buddy art direction with the founder. Task list: #5 (new screens) nearly done, #6
(fidelity pass) pending.

*(Older snapshots below remain accurate for their eras — 2026-07-09 = POC complete + social + Expo Go
blocker; 2026-07-08 = the 4 local pillars in detail.)*

## ⭐ HANDOFF SNAPSHOT — 2026-07-09 (read this first)
**The POC is now CODE-COMPLETE — all 5 pillars.** The 4 local pillars (below, 2026-07-08 snapshot)
plus the **social / Allies pillar** are built, reviewed, and on `main` (GitHub live at `GuyNoiman/PushApp`).

- **Social pillar (E2):** Supabase Free tier, **anonymous auth** (no email/SMTP, $0). Schema + RLS in
  `app/supabase/schema.sql` (security-privacy reviewed — visibility masking enforced server-side).
  `app/src/core/social/` (`SocialGateway` + `SupabaseSocialGateway`, vendor-isolated), `SocialProvider`,
  `app/src/app/friends.tsx`, behind `featureFlags.social`. Keys in gitignored `app/.env` (verified live).
  Decision logged: `11_Engineering_Bible/Engineering_Decisions.md` E2.
- **Investor decks delivered:** `03_Pitch/PushApp_Deck_A_Investor.pptx` (revised) + `_Deck_B_Keynote.pptx`
  (Steve-Jobs style) + PDFs. Use the app's v14 screens.
- **Team = 13 agents** (`.claude/agents/`) + `CLAUDE.md` constitution + `cost-guardian`. Multi-device
  (desktop + mobile via GitHub) confirmed working.

**🚧 BLOCKER — can't run on the iPhone yet (needs founder at the computer):** the app was scaffolded on
**Expo SDK 57** (npm `latest`), which is newer than the App Store Expo Go supports. Downgraded to **SDK 56**
(commit `0749a33`) — **still** shows "incompatible", so the founder's Expo Go tops out at **≤ SDK 55**.
**TOMORROW (needs founder to re-test on device):** downgrade one more to **SDK 55** (repeat the `expo install`
+ verify flow), or make a **dev build** (Xcode local / $99 Apple acct). The **web build works** now
(`web.output: "single"`), so the app is runnable — just not in Expo Go yet.

**🎨 Design fidelity audit done → `04_Product/UX/Design_Fidelity_Audit.md`.** BIG finding: `app/src/constants/theme.ts`
is still the **stock Expo gray/black/white** — the Design-System palette + Baloo 2/Inter fonts + coral CTA
were **never encoded**, so every screen renders gray. That one file is tomorrow's #1 design task (then game-juice
on reward surfaces per §; and a scope call on 7+ missing mockup screens — Journeys list, Journey detail, Explore,
Achievements, Inbox, Weekly planning). Terminology fidelity is excellent.

**🐣 Buddy creature concepts (founder to pick a direction):** 4 cute glossy 3D-style creatures — Ember (coral),
Lumi (teal), Nimbo (periwinkle), Sprig (leaf) — artifact: https://claude.ai/code/artifact/1608abae-1c82-45e6-89a7-4faa0bef7ea7
(source `scratchpad/creature_concepts.html`). New species, not human/animal.

**▶ NEXT (tomorrow, from this point):** (1) get it on the iPhone — SDK 55 downgrade or dev build (founder present);
(2) encode the Design System into `theme.ts` + fonts + coral CTA (audit #1); (3) founder picks a creature direction.
Dev servers were stopped for the night; restart with `cd app && npx expo start` (LAN 192.168.0.123, port 8081).

*(The 2026-07-08 engineering snapshot below covers the 4 local pillars in detail — still accurate for those.)*

## ⭐ HANDOFF SNAPSHOT — 2026-07-08 (ENGINEERING — superseded header; pillar detail still valid)
**Phase 6 (Engineering): all FOUR local POC pillars are BUILT.** The founder asked the team to
run autonomously through everything doable without him; done up to the one gate that needs him
(the social backend). The investor-deck task (older "NEXT") remains **deferred**, not cancelled.

- **New team role: Cost Guardian** (`.claude/agents/cost-guardian.md` + CLAUDE.md §4/§5 and rule
  §3.10) — warns in Hebrew before any action that could cost money or approach a paid quota.
- **Stack (E1):** **Expo (React Native) + TypeScript**, engine-based (`11_Engineering_Bible/Engineering_Decisions.md`
  §E1; CLAUDE.md §6). App in `app/` (Expo SDK 57). Pure-TS core under `app/src/core/`; business logic
  ONLY in engines (verified: no react/expo import in `src/core`).
- **Built pillars (each: implemented → code-reviewed → fixed → verified → committed):**
  0. **Scaffold** — EventBus, `AppCore` composition root, offline `Repository`/`LocalRepository`,
     config-before-code, action-based **Home** (seeds a demo "Run 5km" Journey).
  1. **Journey creation** — `journey/new` modal wizard (title·why·duration/rhythm·Steps·Starter Step),
     in-context local reminders.
  2. **Buddy** — Buddy tab: `BuddyScene`, reactions + `EvolveReveal`; focus-gated `useBuddyMoments`.
  3. **Coins + Shop** — `ShopEngine` + `config/shopItems`, `shop` modal, equipped cosmetic on the Buddy.
  4. **Missions + Login** — `MissionEngine` (injected clock), `missions` modal, Coins-only single
     reward path, foreground rollover with auto-claim (no forfeited Coins).
  - Engines: `Journey / Reward / Buddy / Reminder / Shop / Mission`. **Tests: jest 35/35; `tsc`=0;
    web export ok.** Nav = Home + Buddy tabs; Journey/Shop/Missions are modals.
- **Cost so far: 0₪.** All local. Apple Developer account only later for TestFlight/store.
- **⚠️ Env constraint:** `api.expo.dev` is blocked from THIS container (403). Here use `EXPO_OFFLINE=1`
  for `expo install`/`expo start`. **Founder tests on his own machine:** `git pull` → `cd app &&
  npm install && npx expo start` → scan QR with **Expo Go** (same WiFi). `app/README.md` has the guide.
  Fresh clone: run `npx expo start` once before `tsc` (regenerates the gitignored `expo-env.d.ts`).
- **Device smoke-tests still owed** (can't run here — no device): native-tabs render/switch;
  Journey modal present/dismiss; cross-tab Buddy reveal; Missions daily/weekly rollover across a real
  midnight on foreground; AsyncStorage persistence across restart.
- **🚦 GATE — social/Allies pillar needs the founder.** It's the only POC pillar needing a backend.
  A decision-ready **proposal awaits approval**: `11_Engineering_Bible/Social_Backend_Proposal.md`
  (Supabase free tier = $0; `SocialGateway` abstraction; nothing provisioned per §3.10). On approval
  it becomes E2 and gets built behind a feature flag.
- **NEXT:** (1) founder opens the app in Expo Go and gives feedback on the 4 pillars; (2) founder
  reviews the social backend proposal → approve/adjust so the social pillar can be built; (3) address
  device smoke-test findings; (4) later: visual polish toward the mockups, then TestFlight when wanted.

---

## HANDOFF SNAPSHOT — 2026-07-08 (product & business strategy)
**Phases 1–5 complete; product + business strategy locked.** Sessions 2026-07-07/08 delivered:
- **Design:** all finalized screen decisions folded into `UX/*.md` + new `Shop_Screen.md`/`Weekly_Planning_Screen.md`; committed (86187eb). Latest mockup = **v14** (GT card) — link under Artifacts. Mockup is a *reference*; `UX/*.md` are the source of truth.
- **POC / MVP / roadmap** (`POC_and_MVP_Scope.md`, D13/D14): POC = does **social + Buddy + reward-loop** drive persistence; **lean MVP** = POC + Explore/library + onboarding(egg→hatch) + Phases/full types + light-AI encouragement/reminders.
- **5-version roadmap** (`Version_Roadmap.md` + **`.pdf`**, D15): V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem · V5 Future/Optional. Table artifact 9cdeb986.
- **Rich Step Types** vision (Bible §35, D15) — V4/Future, investor material.
- **Revenue model** (Bible §23 rewritten, D16): 5-stream portfolio — Shop/coins · consumer subscription · creator marketplace · business/branded Journeys · coach tier; mirrored in `03_Pitch/`.
- **Grace Tokens** (Bible §36, D17): earned-only/never-buyable · gift-not-wager · opt-out · regenerating floor; GT card in Home mockup v14.
- Decisions **D1–D17** are canonical in `06_Decisions/Decision_Log.md`.

**▶ NEXT: build the investor PRESENTATION / pitch deck** (founder's next request; start from `03_Pitch/Pitch_Deck.md` + `Investor_Questions.md`, Vision, POC/MVP, Version_Roadmap, revenue §23, Rich Step Types §35). After that, Phase 6 (Engineering) is still blocked on the **Engineering Bible** (empty `11_Engineering_Bible/` folder exists).

*(The dated per-round mockup-refinement logs below (v3–v12) are historical process notes — superseded by the folded specs + git history; kept for provenance, not needed to continue.)*

## Specs folded in — DONE 2026-07-08
The initial screen design is **signed off**. All finalized v13 decisions are now folded into the repo (no longer artifact-only): each `UX/*.md` got an appended **"Finalized visual design (mockup v13 — 2026-07-08)"** section (append-only, nothing lost), and two new specs were created: **`UX/Shop_Screen.md`** and **`UX/Weekly_Planning_Screen.md`**. The artifact is now a *reference*, not the source of truth — the `UX/*.md` docs are canonical. Phases 1–5 complete; design commit landed (86187eb). **POC + MVP + roadmap staging now DEFINED together** (2026-07-08) in `04_Product/POC_and_MVP_Scope.md` (D13/D14 — D4 fully resolved): POC tests social+Buddy+reward-loop → persistence; MVP = POC + Explore/library + onboarding(egg→hatch) + Phases/full-types + light-AI encouragement/reminders; rest → Commercial. **4-version release plan** now drafted in `04_Product/Version_Roadmap.md` (V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem — all remaining work ranked; D15). New vision idea captured: **Rich Step Types** (Bible §35, Stage: Future — video/audio/quiz/reflection/etc. Steps; investor-vision material). **Revenue streams consolidated** (D16): Bible §23 rewritten as a 5-stream portfolio (Shop/coins · consumer subscription · creator marketplace · business/branded Journeys [promoted from §33.6 hypothesis] · coach/pro tier), version-mapped; mirrored in Pitch_Deck §9 + Investor_Questions §14. 5-version roadmap table also exported to **`04_Product/Version_Roadmap.pdf`** (generated via headless Chrome from `scratchpad/version_table.html`; artifact https://claude.ai/code/artifact/9cdeb986-c3c7-48fe-80ef-8af16eb50bc8). **Next per the work plan: Phase 6 (Engineering)** — note an empty-ish `11_Engineering_Bible/` folder exists; still BLOCKED on the founder providing the Engineering Bible content. Uncommitted since the 86187eb design commit: POC/MVP scope, Version_Roadmap(.md/.pdf), Bible §23+§35, Pitch updates, Decision_Log D13–D16 — offer to commit.

## Where we are
Phases 1–4 (Learn, Cleanup, Review, UX specs) are complete. **Phase 5 (Design System)** foundations are locked in `04_Product/Design_System.md`. We are in the **UI-mockup iteration**. Latest = **`all_screens_v3.html`** (full round, 2026-07-07): every screen reworked per the backlog + two new screens (Shop, Weekly Planning). Three decisions await the founder (see "STATUS OF THE v3 ROUND"). Separately, the **Atomic Habits product spec (§34)** is now in the repo. **Next priority: fold the v3 visual decisions into the per-screen `UX/*.md` docs** — they currently live mostly in the artifact only.

## Artifacts (mockups — external, not in repo)
- **All screens — LATEST (2026-07-08, adds Grace Tokens "GT" card in Home header):** https://claude.ai/code/artifact/bfa84846-91c3-42c2-bded-035ab93f2d08 — source `all_screens_v14.html` (== v13b + a purple "GT" card top-of-Home next to Coins, no "+"; one-line fit verified via isolated header screenshot). Use THIS link.
- Version roadmap TABLE (5 versions incl. Grace Tokens): https://claude.ai/code/artifact/9cdeb986-c3c7-48fe-80ef-8af16eb50bc8 · PDF `04_Product/Version_Roadmap.pdf` (5 pp; regen via headless Chrome from `scratchpad/version_table.html`).
- All screens — prior (v13b, pre-Grace-Tokens):** https://claude.ai/code/artifact/0b6b8b30-de33-4fac-939a-c5a2152747ba — source: `all_screens_v13b.html`. **Fixed the real bug:** Explore `.hs` carousels were being flex-compressed (their `overflow-x:auto` collapsed `min-height` to 0, so in the content-heavy Explore the flex column shrank them, clipping the creator-card text below the buddy). Fix = **`flex-shrink:0` on `.hs`**. Also creator buddy 40px. Verified with a full-content Explore replica screenshot. Use THIS link.
- Explore-only replica (proof the creators card renders): https://claude.ai/code/artifact/ff3f33e9-c038-444e-847f-56ee3cabcc17
- NOTE: republishing to the SAME artifact URL repeatedly caused a stale-cache render for the founder — always publish to a NEW path/URL when he needs to see a change.
- Old rolling URL (63dba7b5, may be cached): https://claude.ai/code/artifact/63dba7b5-a2c9-4393-9484-fa5ad2139070
- All screens — full round v3 (2026-07-07): https://claude.ai/code/artifact/20702d07-e09f-485e-8476-57625fcf848e
- Home refinements v3 (options: hub, 3D buttons, tile A/B/C): https://claude.ai/code/artifact/0ce95016-42e3-400d-86c8-08b40db5b71c
- Home (standalone, v5): https://claude.ai/code/artifact/fcdd30a7-ffa7-4641-a923-368fb6188421
- All screens gallery (v2, superseded): https://claude.ai/code/artifact/0ecc3744-3f28-49df-8d28-df47448f7e12
- Source HTML in scratchpad: `all_screens_v3.html` (newest), `home_refinements.html`, `all_screens.html`, `home_mockup.html` (session scratchpad — may not persist; rebuild from Design_System + UX specs if gone).

## Locked design system (see `04_Product/Design_System.md`)
- Direction: **A playful game-world (primary) + B calm wellness (secondary)** — "cozy but clean".
- Base **#FAFAF8** (neutral); cards #FFF; ink #2E2E2C. Accents by meaning: **coral** primary/CTA · **teal** brand/nav/growth-progress · **blue** XP · **purple** social/Cheer · **gold** coins · **pink** consistency. Danger = soft coral-red. Status colors gentle.
- Type: **Baloo 2** (display) + **Inter** (body). Radii 8–16, button 48, spacing 4–32.
- Buttons: coral primary with **dark ink label** (white was unreadable). Icon buttons tinted per area. Nav: compact, icon-only, **active icon takes the tab's color**.
- "Concentrate the game-juice (gloss/depth/3D/collectible cards) in reward/identity surfaces (Buddy, Achievements, Missions, celebrations); keep work surfaces (Steps, Journeys, Inbox) clean/calm."
- Founder prefers **seeing visual examples** for any design question (memory: pushapp-design-show-examples). Artifacts (not the inline `visualize` widget) are needed for depth/shadows/gradients; the artifact sandbox blocks web fonts (use `ui-rounded` fallback for Baloo 2) and icon CDNs (use inline SVG).

## Home — locked so far (in `UX/Home_Screen.md`)
Global header (Level+XP left, Coins right) → "Hello, [name]" → Buddy centered, flanked by 4 area buttons (Inbox+Missions left, Consistency+Friends right), stage name only → draggable cream "Week's steps" panel with **right-side scroller** → step cards (compact **Journey icon tile** + name + Journey·Phase + thin progress bar + rounded-square **report control**: check / "+"; completed dimmed at bottom) → compact icon-only teal nav. Buddy now rendered as a 3D-look glossy creature (CSS approximation; real art later).

## PRODUCT SPEC — Atomic Habits additions (DONE 2026-07-07, in repo)
Founder gave 7 behavioral-design notes (Atomic Habits). Saved as **Bible §34** (§34.1–34.7), **Decision_Log Batch 2 (D6–D12)**, and woven into `UX/Journey_Creation_Screen.md` + `UX/Home_Screen.md`: D6 Step title+description (hidden → 3-dot "More Info") · D7 no dedicated Habit Stacking (calendar/location triggers) · D8 Starter Step (≤2min) · D9 identity/motivation Qs → personal encouragement · D10 immediate elegant celebration (variations) · D11 flexible non-punishing streaks · D12 weekly planning confirmation flow (**new Weekly Planning screen owed**).

## STATUS OF THE v3 ROUND (2026-07-07)
**Confirmed by founder:** Step-card icon = **Option C** (inline mini-icon) · area buttons **3D, icon-only (NO text)** · report control 32px. **Regressions fixed in v3:** right-side **scroller** restored · original flat **coin chip** restored.
**Applied in `all_screens_v3.html`:** Home (This week + Journeys-hub toggle, 3D buttons, scroller, Option-C, 3-dot menu) · Journeys (3D Achievements emblem) · Journey detail (name as secondary w/ eyebrow) · Explore (horizontal-scroll rows + creators carousel + brands carousel) · Journey creation (pencil edit affordance, prev/next names on buttons, step-bar tooltip, Starter Step, Your-why identity Qs) · Friends (3-dot action menu, caption removed) · Buddy (name/level top, single Shop top-right, Customize btn, bounded 5-tab container: Character·Clothing·Items·Location·Furniture) · **Shop screen (NEW)** · Achievements (warm base, medals+conditions — 2 options: inline + detail sheet) · Inbox (Allies/Friends/Groups tabs back) · Missions+reward (**one centered floating modal**, merged w/ Missions·Daily tabs) · **Weekly Planning screen (NEW)**.
**Awaiting founder's call:** (a) the **Home hub + Inbox-as-nav-tab** — shown as an option, not locked; (b) **merging** the two reward modals vs keeping separate; (c) which Achievements condition treatment (inline / detail sheet / both).

## v12 REFINEMENTS (founder feedback on v11, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v12)
Note: "Your why" was rebuilt with fresh `.qblk`/`.ansbox` classes (the old `.qwrap{flex:1}`/`.abig{flex:1}` caused the overlap); button footer is now transparent (no bar). DONE = `.donebg` watermark behind `.m` (which is z-index:1).
**Home:** "Ends today" badge should sit **half-in/half-out** of the card top (a touch higher). The green **"DONE" must be a background watermark** (text can overlap it) — currently it's an inline stamp that pushed the Journey name to wrap.
**Explore Top creators:** add the **creator username** and a **registrations count** (total sign-ups across their content — counts each registration, not unique people).
**Your why (still broken):** the **buttons got a background/footer bar that shouldn't be there**; the **questions overlap** — structure must be Q → answer box → Q → answer box → Q3 → the special input box, cleanly stacked. Rebuild simply.
Rest looks good for this stage.

## v11 REFINEMENTS (founder feedback on v10, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v11)
**Urgent card:** founder OK with the "Ends today" tag as a **floating badge on the top-right corner** (slightly overlapping the top edge) — name stays one line.
**Your why:** the **buttons jumped up** — they must **stay pinned at the bottom** (their place). The **first two questions disappeared** — bring them back. Too much gap between the input and the entered answers — the **char-limit (0/50) indicator should move** (inline, not its own line taking space).
**Explore "For you":** the **icon takes too big a share** of the card — the name is the most important, then duration, then #steps; the icon is just decoration (later replaced by a **user-uploaded image** when the Journey is made public). Slim the image area, let text dominate; show duration + steps.
**Top creators:** show that **creator's own buddy + level** (not a generic avatar). **Businesses:** keep the **logo** (as done).

## v10 REFINEMENTS (founder feedback on v9, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v10)
Note: urgent-card tag put back INLINE (margin-left:auto) for height-consistency with other cards — founder may still want its own row; watch for feedback. Home/Buddy now share the forest bg + floating level/coins (no header bar).
**Home + Buddy — remove the header bar.** The **level object + coins object** keep the same positions but **float** (not inside a header). **Coins object height = level-bar height** (shrink it). The whole page **background = the forest** (from Buddy tab), continuing behind the floating level/coins — **lighten it a touch** so buttons/objects stay prominent. **"Hello Guy" becomes a speech bubble above the buddy, centered** (as if the buddy says it). Add a **shadow separating Weeks-steps from the buddy area**, and **more shadow under the nav** (make nav pop).
**Urgent (yellow) card:** still can't fit all text; "Ends today" takes too much height; line-spacing differs from other cards. At the current enlarged size, make everything fit and **look consistent with the other cards**.
**Explore:** text/images **still overflow the cards** — actually make them fit.
**Your why:** revert my change. First two questions were good (answer boxes — can shrink slightly). Only the **last question**: short answer input + **Add** button, **max 50 chars**; on Add the sentence appears **below with grey bg + an X to delete**, and the input **clears** for the next. Page scrolls.

## v9 REFINEMENTS (founder feedback on v8, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v9)
**Header:** remove **"Lv 13"** (level already in the circle) → bar can be narrower. Remove the **yellow border**. **Add the + back to the coin** pill.
**Weeks steps:** "Ends today" tag + resize good, but keep the **same top/bottom padding as before** (text currently overflows the card). For **completed** steps, replace the ✓ wash with a **"DONE" stamp** like the Journeys tab.
**Explore:** text/images **still overflow cards** — enlarge cards a bit or shrink images so they fit. **Top creators** needs a **different icon** (not the same star as "For you").
**Your why:** not good — content **hides behind the buttons** (buttons should be a pinned **navbar**, content scrolls above). The reminders field needs a **short-text input + Add**: on Add, the sentence becomes a **grey chip** and the input **clears** for the next.
**Buddy:** straight corners good. The **forest bg must fill all free space** up to the inventory (kill the dead strip); **center the buddy** in that area. The unlock **tooltip should point at the locked tab**, not just straight down. (Loved the hatched egg!)
**Home:** make the **Weeks-steps panel full-width with straight corners**, same as the inventory.

## v8 REFINEMENTS (founder feedback on v7, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v8) + new refs
New screen added: **hatch/evolve reveal**. New pattern: **locked-tab "coming soon"** tooltip. Still owed to spec: **Buddy_Screen.md** (hatch reveal, locked-until-level, forest scene, Select), **Shop_Screen.md**, **Weekly_Planning_Screen.md** — all still artifact-only.
Refs provided: (1) a **level meter** — gold-framed bar with the level circle overlapping the left, "3,450/5,000 XP" inside, and a "Level 71" dark segment on the right; (2) a **Mythic character reveal** ("Glacidrake") — dark bg + radial burst + rarity tag + name + creature w/ stars + COLLECT button + "Open Store" — ref for the **buddy hatch/evolve reveal** AND the **"coming soon" locked-ability** style; (3) a **coins pill** (gold star-coin + amount in a framed pill).
**Header:** **drop gems** for now. **Connect the XP bar to the level circle** as one unit (per ref 1): count goes **inside the bar on one line**, and it should read **"EXP"** not "XP". Restyle **coins** per ref 3 (framed gold star-coin pill).
**Weeks steps:** keep yellow bg + "Ends today" but give the **tag its own row** (card height may grow). Keep the **✓ background wash but remove the ✕** (missed card: no mark) — or use a **"DONE" stamp** like the Journeys page.
**Journey buttons:** good. ✓
**Explore:** good now — just **verify images/text stay inside the card borders**.
**New Journey wizard:** disabled Back is good but it's **smaller than Next — make them equal size**.
**Plan the steps:** the **"Optional" tag reads as applying to the whole section — remove it** (keep the Recommended tag on the starter card).
**Your why:** "What to remember when it's hard" should be a **list of short answers** (one or more motivation sentences) that get prompted when needed — not a single box.
**Buddy:** inventory great — make its **top corners square** (flat, not rounded). Put the **avatar in the middle** with a **3D forest background** behind it.
**New — Buddy hatch/evolve reveal screen** (per ref 2): rarity tag + name + creature w/ burst + COLLECT.
**New — "Coming soon" locked ability:** lock a specific **inventory tab** with a tooltip like **"Unlocks at level 20"** (proper game phrasing).

## v7 REFINEMENTS (founder feedback on v6, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v7)
Note: the black-blob bug was `.cardmark` svg missing `fill:none` (rendered filled). Explore "destroyed" look was the `.hs` negative-margin bleed clipping under `overflow` — removed it; Explore reverted to the V3 three-carousel form (For you jtiles · Top creators round · From brands wide) with vertical scroll + horizontal drag.
**Header:** visually **join the XP bar to the level circle** (one unit). Put the **340/500 count ABOVE** the bar. Bar can be **shorter**, count text **smaller**. Try to put **coins + gems on one horizontal line** (not stacked) if width allows; if not, keep stacked or drop gems for now.
**Journeys:** the bottom buttons' **frame is too prominent**; the **+ create button reads badly** (plus swallowed by the gradient) — fix.
**Weeks steps:** the green card has a **black blob** in the bg (bug — the ✓ renders filled) — must be a clean ✓/✕ or nothing. Rename **"Reported" → "Completed"** (more positive). Add a **yellow background** state for a step whose window is about to pass (urgent). The **line at the top of the panel** (drag handle) looks unnecessary — remove.
**Explore:** still looks broken — **restore the V3 version** (the one I praised). Needs: normal **vertical scroll** + **horizontal drag** in carousels; enough **left margin**; keep **varied card shapes**; **headers must not hide the carousel**.
**Friends:** replace the word **"help" → "cheer"** (section title + the Help button → Cheer). Friends listed under "Needs your cheer" should **also appear in "Your friends"** (sorted **A–Z**) for now.
**Buddy:** inventory box **still not full width** — drop its rounded corners and **stretch it edge-to-edge**.
**Login modal:** delete the **8th-day tile ("+21")** that isn't in the week. Add a **divider between the day number and the reward**; put the coin/gem **icon beside the amount (horizontal), not above** (smaller icon + font).
Rest looks good.

## v6 REFINEMENTS (founder feedback on v5, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v6)
**Home header:** use the **horizontal XP bar** (not the ring around the level). "Level 12" appears **twice** — remove one. The **340/500 count must sit adjacent to the XP** bar.
**Weeks steps:** button + background wash are great, but the ✓/✕ **watermark isn't legible** — either make it clearly a ✓/✕ in the background or remove it entirely.
**Journeys:** the New button should be **icon-only**, and put **both buttons (New + Achievements) in a bottom row** across the width.
**Explore:** regressed — "looks terrible" vs a few versions ago (content overflows/clips). Fix layout (make it **scroll vertically**, clean spacing).
**New Journey:** on step 1, **Back** is irrelevant → hide or **disable** it. **Plan the steps:** remove the example line. **Your why:** correct now! — but **add the Back button**; the primary button shows **"Skip" when all fields empty**, else "Next".
**Buddy:** inventory can use the **full screen width**; apply the **same header fix** here.
**Shop:** much better. ✓
**Achievements:** drop the **yellow background** on the count; when showing 18/30, "**12 more**" must be **lower hierarchy** (muted/smaller) — same in the detail sheet.
**Modal:** tab **text alignment** still off. Rename **"Daily reward" → "Login"** (simpler). The claim button should just say **"Claim"** (don't repeat the reward amount).

## v5 REFINEMENTS (founder feedback on v4, 2026-07-07 — APPLIED; artifact 63dba7b5 now shows v5)
**Home header:** keep the gem/diamond. **Remove one XP meter** (has both a ring around the level + a horizontal bar — keep only one). **Remove the username.** **Stack gems above/below coins** (vertical) to free width — header felt cramped.
**Week's steps:** remove the "swipe to report" caption. Remove the confusing left-edge **swipe arrow** on the first card. The ✓/✕ must live **in the card background** and **NOT replace the 3-dot** (keep the 3-dot on every card; show done/miss as a background wash + mark). Slightly **reduce the step/Journey-name font**.
**Journeys tab:** cards still don't match Home cards — put the **icon inline in the title row** (like Option C), not a centered left tile.
**Explore:** a section was dropped — **bring back the creators carousel** (round cards). Ensure enough **left margin** on the first card of each row (initial state looked flush-left).
**New Journey entry:** the **create entry/button is missing** — add it (Explore "Build your own" and/or a + on Journeys). **Remove "Show me similar"** for now → move to a future-ideas list. Edit affordance + tooltip now good. ✓
**Starter step:** replace the two tags with a single **"Recommended"** tag; reword as a recommendation: *"Adding a small ≤2-min first step raises the chance of finishing."*
**Your why:** wrong execution — the **question should NOT be boxed**; only the **answer** gets a box (bigger, filling the screen). The **colors are off** (purple) — use on-brand neutral.
**Buddy tab:** header must be **identical to Home** header. Shop + Customize buttons **stacked vertically** and in the **same button style as the others** (3D). Inventory takes **too much height** — shrink it, add an **internal scroller**, and add a **"Select" button** at the bottom that applies the choice. Framing good. ✓
**Shop:** recolor to the **app's palette** (warm, not deep blue).
**Achievements:** better now. ✓
**Missions/reward modal:** the **"Daily reward" tab is hidden under the X** — fix overlap. The **Claim↔reward layout** is poor — give the reward a **fixed column separated by a vertical divider**; and **move the progress indicator (2/3)** elsewhere (near the bar, not stacked under the reward).
Still to tune: Shop (more refs coming) · Explore per-type info depth · Weekly planning interaction.

## v4 REFINEMENTS (founder feedback on v3, 2026-07-07 — APPLIED in `all_screens_v4.html`)
A new game **Shop reference** was provided (structured header w/ level badge + resource pills w/ icons; "Chapter Pack" featured offer w/ 600%-value badge; "Daily Shop" grid w/ discount badges, gem prices, "Purchases left", refresh timer; bottom sub-tabs). Tune Shop toward it; more refs coming.

**Global header** — I wrongly stripped the coin (+rope) icon; bring back a proper **coin icon** closer to the refs. Make the **level badge + whole header** prettier and more structured (reference-style resource pills w/ icons).

**Home Step cards** — the 3-dot + the check(V) control together are too wide. **Keep only the 3-dot**; expose reporting via **long-press (= 3-dot)** OR **Tinder-style swipe-right**. After reporting: **done → the whole card turns green** with the V woven into the card bg; **not-done → whole card turns red with an X**. (No separate report button.)

**Journeys tab** — use the **same smaller-icon card** design (Option C / small tile), not the big 36px tile.

**Journey detail** — title now good. ✓

**Explore** — good direction. Show the *important* info per type: friends-recommend → Journey name + which friend; business → business **logo + business name + Journey name**; for-you → **duration / frequency** etc. (deepen later). **Remove the "drag" word** from the "For you" row — make all rows like the two bottom carousels (no drag label).

**New Journey**
- **Tooltip hides behind the title** — fix stacking/position.
- Step names above the buttons — excellent. ✓
- **Starter Step is OPTIONAL, not mandatory**, and belongs in the **step-creation stage**. Move the **Step description** field to a different stage (e.g. where the title/name is first defined).
- **"Your why"** is great — **use full screen height**: enlarge the question cards, format as **question → answer bubble → question → answer bubble …**

**Friends**
- **Enlarge the 3-dot button** (barely visible) — circle it so it reads as a button.
- The opened menu: **drop the colors**; do it like big apps (deciding text-only vs icon-only — match convention).

**Buddy**
- **Header disappeared — bring it back.**
- Customize + Shop buttons should be **icon-only (no text)** — like the inventory tab names (also no text).
- Find a **different location** for the buddy **name + stage name**.
- Inventory items should be **smaller** (there will be many) + **scroll/drag**; the whole inventory needs a **single unified frame** (not separate-looking parts).

**Shop** — first pass toward the new reference (see above).

**Achievements**
- **No right margin** currently; want **3 prizes per row** — reduce card width.
- **Drop the progress bar**, replace with a **count** (e.g. "4/10 · 3 more").
- Detail sheet enlargement liked, but **add a close button.**

**Inbox** — great now. Tab order → **Friends (default), then Allies, then Groups.** **Remove the "Ally" tag** by Noa. **"Noa sent a gift" is a notification, not a message** — don't show it as a conversation.

**Missions + Daily reward modal**
- Make clear that **Daily/Weekly live UNDER "Missions"** (hierarchy unclear now).
- Show **each mission's reward before it's completed**.
- **No per-mission icon.**
- Add states: mission **done-but-unclaimed** (indicator), and **claimed** (grey + "Claimed" ✓).
- **Daily reward:** short button text; day-1 green **less prominent**, day-7 red **not prominent** — all days **disabled** with gentle shade variations; **show each day's reward** (check refs).

**Weekly planning** — good; refine later. ✓

## DESIGN REFINEMENTS BACKLOG (original 2026-07-07 feedback — mostly addressed in v3 above; kept for reference)
New references added to `04_Product/UX/UX_References/`: `achivements.PNG`, `inventory.PNG`, `mission + sign in.PNG`, plus an Explore Netflix/Spotify-scroll ref and an Achievements "medals + condition window" ref the founder mentioned — consult these.

**Home**
- Make the 4 area buttons **3D/graphic**, not plain line icons — more interesting artwork.
- **Report control** (right of step card): make a bit smaller. **Journey icon tile** (left): currently too big — produce **another option** for showing it (smaller / different treatment).
- STILL OWED: show the **"Journeys inside Home" option** — the two-view hub (a top toggle **This week · Journeys**) that frees the nav slot for an **Inbox** tab. Founder asked for this 3×; build it as a visible option.

**Journeys** — good now, except the **Achievements button** must look **interesting/inviting** (like the Home buttons — 3D/graphic, not a flat icon).

**Journey detail** — much better. The **title (Journey name) should read as secondary** — visually distinct from tab-name titles like "Explore" (which are top-level). De-emphasize it.

**Explore** — currently boring; make it lively:
- Show sections are **horizontally scrollable** (Netflix/Spotify style — peeking cards, side-drag) — ref added.
- Add a **carousel of recommended creators**, with a **different card shape** (e.g. circle avatar + username + #journeys created + cumulative likes/uses).
- Add a similar **businesses** carousel, possibly another shape.
- Goal: varied, non-boring layout.

**Journey creation (wizard)**
- Fix messy spacing between the selected value and the arrow; consider a **different edit affordance** than a chevron.
- Replace "Next + list of next steps" with just the **next step and previous step labels beside the Back/Next buttons**; and on tapping the top step-bars, show a **tooltip** with that step's title.

**Friends** — the 3 actions currently span the whole card. Instead use a **three-dots button** that opens a menu with the 3 actions (Cheer / Gift / Message). Remove the "Cheer · Gift · Message" caption at the bottom.

**Buddy**
- Move **buddy name + stage/level to the top**.
- Shop appears twice — keep only the **top-corner Shop**; tapping it opens a **Shop screen (not built yet)**. Add a **Customize** button near Shop (future: real character design).
- The tabs under Buddy need a **container/bounding** (their labels currently blend into the page bg). Tab types should be: **Character (דמות) · Clothing · Items · Location · Furniture**.

**Achievements**
- Background must **match the app** (current purple game bg is off). Make it read like **prizes/medals** (ref added).
- Add the **unlock condition** per prize (e.g. "invite 50 friends"). Founder added a ref of a **detail window on tapping a trophy** but is open to other mechanisms — **give a few options** for showing prize info + conditions.

**Inbox** — good that conversations aren't cards, but the **Allies/Friends/Groups tabs disappeared — bring them back** (as tabs above the IG-style list).

**Missions + Daily/Consistency reward (modals)**
- The **modal should float centered**, not be pinned to the bottom.
- A ref shows **missions together with the daily reward** — consider **merging Missions + Consistency reward into one modal**.

## Two general deliberations (my recommendation — prototype as options)
1. **Per-tab tint + colored active nav icon** — do it *lightly*: neutral page bg + active nav icon in the tab's color (already added) + a subtle colored wash only at the top of each tab. Avoid full per-tab backgrounds (rainbow risk).
2. **Journeys into Home + Inbox as a tab** — recommend a **Home two-view hub** (toggle: This week · Journeys) to free the slot for an **Inbox** tab (nav: Home · Explore · Friends · Buddy · Inbox). Elevates messaging (core to the support thesis) without overloading Home. Build it as an option to view.

## Carried-over open items
- Report-control word (icon-only vs Log/Report/Done) — leaning icon-only.
- Open question: should **Buddy greet "Hello, Guy"**?
- Middle-layer name kept as **Phase**.
- POC/MVP scope still to define together (`04_Product/POC_and_MVP_Scope.md` placeholder).
- Missing docs from the review: object model, onboarding flow, Intervention Engine MVP spec, metrics, privacy.

## Next steps (fresh session)
1. **Build the investor PRESENTATION / pitch deck** — the founder's next task. Inputs: `03_Pitch/Pitch_Deck.md` + `Investor_Questions.md` (current), `01_Vision/Vision.md`, `POC_and_MVP_Scope.md`, `Version_Roadmap.md` (+ PDF), revenue Bible §23, Rich Step Types §35, the mockup v14 (visuals). Clarify format/audience/length with founder first. Founder likes seeing visuals — consider an artifact deck.
2. Open design calls still un-locked (carry if they come up): Home hub + Inbox-tab nav option; whether GT appears on the Buddy header too (currently Home only).
3. Phase 6 (Engineering) remains blocked on the **Engineering Bible** (empty `11_Engineering_Bible/` folder exists — populate together or await founder content).
4. Git: work through D17 committed as of 2026-07-08 (see CHANGELOG). Keep committing per batch.

## Read next
- `04_Product/Design_System.md` · `04_Product/UX/*.md` (esp. `Home_Screen.md`) · `04_Product/UX/UX_References/`
- `06_Decisions/Decision_Log.md` · `00_Foundation/CHANGELOG.md`
- `Repository_Workflow.md` (how to work here)
