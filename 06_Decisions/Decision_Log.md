# Decision Log

Status: Living Document — canonical record of founder-level product decisions.

Each entry records the decision, its framing, and where it is reflected in the repository. Newest first.

> **Engineering decisions** (technology/architecture) are logged in
> `11_Engineering_Bible/Engineering_Decisions.md` with an **E** prefix. Product decisions
> stay here with a **D** prefix.

---

## 2026-08-08 — Initial-version (MVP) task list + scope decisions

> Working session with the founder to define the concrete initial-version scope, on branch
> `feat/buddy-3d-and-reminders`. The granular checklist lives in
> **`04_Product/MVP_Task_List.md`** (created this session); this log records the founder-level
> decisions and their reasoning.

### D29 — Initial-version scope: required base-version capabilities confirmed
**Decision:** After a coverage audit of the flows the founder wants to perform, five capabilities
were confirmed as **required in the initial (MVP) version**:
1. **Edit an existing Journey** (rename / change Steps / change frequency) — currently absent. (How:
   open question — coach-led editing, a simple edit screen, or both; D26.8 leans coach-led.)
2. **Delete / abandon a Journey** — currently absent (only Step-level "let go" exists).
3. **First-run onboarding** including the **notification-permission ask** — currently absent; the app
   drops straight into Home, and permission is asked only inside the creation wizard.
4. **Multi-language (i18n) support with Hebrew** — the app + coach are currently **English-only** with
   no i18n layer. The founder uses Hebrew, so the initial version must support his language. This adds
   an i18n layer, Hebrew translations, **RTL layout** across all screens (the mature redesign was
   built LTR), and the coach conversing in Hebrew.
5. **Account deletion / data export** — currently absent; a hard Apple/Google requirement for a public
   release (not needed for founder-only device testing). Treated as a release gate.
**Why:** items 1–3 are basic usability gaps (a Journey that can't be edited, deleted, or reached
through any first-run is not a shippable product); item 4 is fundamental to who the initial version is
for (the founder himself, a Hebrew speaker); item 5 is a non-negotiable store-compliance gate.
**Categorization:** **Approved** — these five are IN the base version.

**The remaining open questions were then resolved (founder, same session):**
- **Coins** → **hidden in MVP** (kept accruing in the engine, not shown — the Shop is archived, no sink).
- **Manual Journey creation** (the wizard) → **kept** as a coach-first fallback / escape hatch.
- **Friend profile page** → **IN** (minimal: name + active Journeys + progress + cheer).
- **Messaging / start a conversation** → **deferred post-MVP** (cheer/nudge already serve the loop).
- **Channels / Groups** → **deferred post-MVP** (Communities = Commercial stage).
- **Journey Freeze/Resume** → **IN**.
- **Reminder management for an existing Journey** → **IN**.
- **Deferred-goals ("parked goals") surface** → **IN** (minimal — persist + a list to activate later).
- **J1 "how to edit a Journey"** → **coach-led**: a **pencil button on the Journey screen** opens the
  coach conversation; the coach asks what the user wants to change, proposes the updated Journey
  settings from the user's answer, and **the user must approve the change** before it applies.
**Reflected in:** `04_Product/MVP_Task_List.md` (the full checklist + statuses + open questions);
`Current_Context.md` (to be updated at sprint end); the harness task list for this build.

## 2026-08-09 — i18n rollout + domain-expert language ownership

### D30 — Domain experts are INTERNAL tools; the meta-agent owns the user's language
**Decision:** During the Hebrew i18n rollout the question came up of whether the four domain experts
(Addiction · Relationships & Loneliness · Body Image · Career) need their interview content
translated. **Founder decision: no — not now, and by design not as per-expert user-facing copy.** The
experts are **empty foundation scaffolding, not yet specced**, and are **internal tools**: they
communicate with the **meta-agent ("Steady")**, and it is the meta-agent that talks to the user and
speaks the user's language. So the experts themselves carry no user-language requirement. When the
experts are actually specced, they will be built i18n-aware from the start, or — cleaner, and the
founder's leaning — kept as pure internal tools with the meta-agent phrasing everything to the user
in their language.
**Why:** it matches the **framework-not-content** philosophy (D25) — the experts encode interview
*structure and planning logic*, not user-facing prose — and avoids prematurely translating unspecced,
gated (D24) scaffolding. It also keeps a single, clean language boundary: the meta-agent.
**Implemented (2026-08-09, same session — the hierarchy fix the founder asked for):** the meta-agent
is now the SOLE user-facing voice for the interview. `CoachOrchestrator.askCurrentQuestion` re-voices
every expert question through the new `CoachOrchestrator.metaVoiced` helper, which resolves the
user-facing prompt from the meta-agent's own `interview.<intent>` template in the `coachContent`
namespace (user's active language, **deterministic — no added LLM call**, so the "one understanding
call" budget is preserved). The expert now supplies only the STRUCTURE (question id/intent + closed
`options` + planning logic) and never speaks to the user directly; only the `prompt` is re-authored,
so the closed-option answer-matching is untouched. **Mechanism chosen: deterministic per-intent
templates** (the founder picked this over per-question LLM phrasing, to avoid ~6 extra LLM calls per
interview — cost/latency). A domain expert reached in Hebrew now renders the meta-agent's Hebrew
question, not the expert's internal English prose. Covered by an updated `CoachOrchestrator.test.ts`
assertion (`coachMessage === i18n.t('interview.foundation', { ns: 'coachContent' })`).
**Categorization:** **Approved + Implemented** (the language-ownership direction + the meta-agent
voicing) + **Open/Future** (the full expert spec + un-gating land later; when the experts are specced
they inherit this — they stay pure internal tools, the meta-agent phrases everything).
**Reflected in:** `app/src/core/coach/CoachOrchestrator.ts` (`metaVoiced` + header doc);
`app/src/i18n/resources/{en,he}/coachContent.json` (`interview.*`); `04_Product/MVP_Task_List.md`
(N1 Batch 3 note); `Current_Context.md`.

### D31 — Gender-aware "form of address" (לשון פנייה) across all languages
**Decision:** the app must address the user in the correct grammatical form. Hebrew (and many
languages) inflect address by gender; English does not — so the mechanism has to generalize.
- **Mechanism:** i18next **context**. A string that needs it provides `key_feminine` / `key_masculine`
  variants and the base `key` as the fallback; languages with no gendered address just use the base.
- **State:** a persisted **`addressForm`** preference — `neutral` | `feminine` | `masculine` — mirroring
  the language/theme preferences. It drives translation via a React hook (components) and a module-level
  accessor (the framework-free engines/coach read it the same way they read `i18n`).
- **Sourcing (founder):** the user is **asked at onboarding** for their form of address. If a
  **Google/Apple sign-in returns the user's gender**, the field is **auto-set** from it — but it is
  **still shown in the onboarding questionnaire and remains user-editable** (and editable later from the
  profile). The address form follows the gender automatically, but the user can override it.
**Why:** addressing a user in the wrong gender reads as broken/impersonal in Hebrew; this is
foundational for a real (non-founder) Hebrew launch. Building the mechanism early avoids retrofitting
gendered variants across a large string base later.
**Categorization:** **Approved.** Build the mechanism + preference + a control now; convert strings
incrementally (coach + Home first); wire the sign-in auto-detect when real OAuth lands (E1, Apple-gated);
fold the picker into the P1 profile redesign.
**Reflected in:** `04_Product/MVP_Task_List.md` (Section Q); `Current_Context.md`; (implementation to
follow this decision).

### D32 — Completion-celebration model: small confetti (Step) + a shareable achievement card (Journey/Milestone)
**Decision (founder, I1):** two tiers of celebration.
- **Small — on a Step check-in:** on-screen **confetti** (colored ribbons). Provide **several distinct
  variants**, chosen by the founder or picked at **random each time** for variety.
- **Big — on completing a Journey or a Milestone:** a full **achievement card** the user can **edit,
  share to social (Facebook/Instagram), save as an image, or close.** Reference point: **Finch's**
  goal-completed / Micropet-egg achievement screen (founder attached a screenshot) — PushApp's version
  should be **similar in intent but more elegant** and on-brand (mature, calm, one accent).
**Why:** a full transformation deserves a bigger, shareable moment than a per-Step check-in; sharing is
also organic growth (the people pillar) without being a punishment/streak mechanic.
**Related Open Question (Future Vision):** an achievements **FEED** — users share achievements and write
a few words on each (post-style). Privacy/moderation-heavy; log fully before building.
**Also flagged (Open Question):** **photo upload as part of a Step-completion report** — the current
Step-report UI doesn't support it; needs a design pass (attach point, on-device-first storage/privacy).
**Categorization:** **Approved** (the two-tier celebration model) + **Open/Future** (the feed + the
photo-in-report). **Reflected in:** `04_Product/MVP_Task_List.md` (I1 + Open questions + Post-MVP).

### D33 — One authoritative week boundary (Week Boundary Preference)
**Decision (founder, PRD `04_Product/PRD/Week_Boundary_Preference_PRD.md`):** there is exactly ONE
definition of when the user's week begins, and **every** week-referencing area aligns to it — weekly
Missions, the Streak "no-slack" rule, Week Review, AND the Journey "Week X of Y" pager. A single
profile-level **`weekStartDay`** (0=Sun … 6=Sat) is defaulted from the profile's single **`country`**
field (until `Own_Profile` lands, from the device region) and is user-editable; from the moment it is
set the whole app follows it.
**Why:** the code audit found THREE conflicting "week" notions — a Monday-hardcoded calendar week
(Missions + Streak), per-Journey rolling weeks from `createdAt` (the pager), and fixed-millisecond
arithmetic (DST-unsafe, forbidden by the PRD). They must be consolidated so nothing drifts.
**MVP scope (approved):** local midnight start only (no advanced start-time); device-local CALENDAR
arithmetic (no fixed ms — DST-safe); the IANA-zone/device-travel/multi-device cases are **deferred**
until a backend + synced preference exist (and depend on the `country` field from `Own_Profile`);
changes apply GOING FORWARD (the Streak is computed live for MVP — stamping a boundary/version on
weekly records is the next step once a backend exists; Missions already stamp via `weeklyResetKey`).
**Implemented (2026-08-10):** `app/src/core/util/week.ts` (the single service — configurable start,
calendar arithmetic, `startOfWeek`/`startOfNextWeek`/`remainingDaysInWeek`/`weekKey`/`weeksBetween` +
a framework-free `get/setWeekStartDay` module value); `app/src/state/WeekStartPreference.tsx` (persist
+ device-region default + mirror into the module); consumers migrated — `MissionEngine` + `urgency.ts`
(Streak) + `journeyView.stepsByWeek` (pager now calendar-aligned; `weekKey` removed from `util/date`);
an interim "My week starts" Settings row (will move into the P1 profile redesign); tests in
`util/__tests__/week.test.ts`. Green: tsc clean, eslint 0 errors, jest 543/543.
**Categorization:** **Approved + Implemented (MVP slice)** + **Open/Future** (IANA/travel/multi-device
+ boundary stamping, gated on the backend + `Own_Profile`'s country field).
**Reflected in:** the PRD (§9 current-implementation, §10 resolution & MVP scope); the files above.

### D34 — Unified Profile model + own-vs-friend boundary (Own Profile)
**Decision (founder, `Own_Profile_PRD.md`):** ONE source-of-truth `Profile` object holds every identity/
adaptation field (option A). Two distinct uses of "profile": **Own Profile** is the PRIVATE self-view —
the user sees/edits ALL fields; **Friend Profile** (P1) is a filtered projection showing only a public
SUBSET (photo, display name, `@username`, Level, authorized progress) and NEVER the private fields
(country, birth date, form of address, email, provider info). Form-of-address default = **neutral**
(reconciles the PRD's earlier "masculine" with D31). Country covers **all countries** (full ISO list;
week start = Sun/Mon/Sat only, encoded as a Sunday-set + Saturday-set + Monday-default) and supplies the
week-start default (a manual override still wins, D33). **Phased build:** Phase 1 = fields + the Own
Profile screen; Phase 2 = the profile photo (its own slice with the §4 binding safety requirements +
`expo-image-picker`); auth-provider seeding wires in with real OAuth (E1, Apple-gated).
**Implemented — Phase 1a (2026-08-10, green: tsc clean, eslint 0 errors, jest 548/548):**
`state/ProfileProvider.tsx` (the unified store — persists one JSON object; mirrors `addressForm` +
`weekStartDay` into their framework-free modules; migrates the two legacy preference keys) FOLDS IN and
REPLACES the former standalone `AddressPreference` (D31) + `WeekStartPreference` (D33) providers;
`core/profile/countries.ts` (all-countries list + country→week-start mapping + device-region default +
`Intl.DisplayNames` localized names); consumers migrated (`_layout`, `useAddressedTranslation`,
`settings.tsx`); `core/profile/__tests__/countries.test.ts`.
**Implemented — Phase 1b (2026-08-10, green: tsc clean, eslint 0 errors, jest 548/548, web-verified in
Hebrew):** the dedicated **My Profile** screen `app/settings/profile.tsx` (avatar initials + a
private-scope note, editable display name, `@username` reusing the shared username logic, country row,
birth-date row with an inline `YYYY-MM-DD` editor, form-of-address) + a searchable **country picker**
`app/settings/country.tsx` (all countries, `Intl.DisplayNames` localized names, alphabetical) + the
entry point (the Settings `ProfileIdentity` card now navigates to it). Phase 1 (fields + screen) is
DONE; the **profile photo is Phase 2** (its own slice with the §4 safety requirements +
`expo-image-picker`), and auth-provider seeding wires in with real OAuth (E1, Apple-gated).
**Categorization:** **Approved + Phase-1 Implemented** + **Open** (Phase 2 photo, auth seeding).
**Reflected in:** `Own_Profile_PRD.md` (status + §10/§11); the files above.

## 2026-08-06 — Coach build-out: domain realignment, framework-not-content philosophy, UX/design bundle, paid Gemini tier, single-user auth

> Continues the D23 pivot on branch `feat/buddy-3d-and-reminders` (unmerged), behind the
> off-by-default `adaptiveCoach` flag. See `Current_Context.md` → "⭐ HANDOFF SNAPSHOT — 2026-08-06"
> and `00_Foundation/CHANGELOG.md`'s 2026-08-06 entry for full engineering detail; this log records
> the decisions and their reasoning.

### D24 — Domain realignment: Addiction · Relationships & Loneliness · Body Image · Career
**Decision:** The set of first-cut `DomainExpert`s changes from the original SX exploration
(`recovery`, `self-confidence`, `nutrition`, `sport` — recorded implicitly in the 2026-08-05
CHANGELOG entry, never itself logged as a D-decision) to **four new domains**: **Addiction**,
**Relationships & Loneliness**, **Body Image** (covering both nutrition and fitness together, not
as two separate domains), and **Career**.
**Why:** the new set was chosen to better match the kinds of goals a general adaptive coach
realistically needs to triage from open-ended free text, and to consolidate nutrition+fitness
(which users rarely separate cleanly when describing a body-image goal) into one domain rather than
two competing experts.
**Safety implication:** **Addiction** and **Relationships & Loneliness** are the two most
sensitive domains in this new set (substance use / crisis risk; loneliness / relational distress
risk). Per this decision, both **must stay flag/dev-only** — never reachable by a real user — until
(a) the safety floor is built (bilingual Hebrew/English inbound crisis-detection + escalation,
disclaimers/consent, a hardened `SafetyLayer`, substance-use gating) and (b) a clinical review has
happened. This is a hard gate, not a soft target.
**Categorization:** Approved (the domain set itself, as the current SX validation target) +
**Open Question / gated** (Addiction and Relationships & Loneliness cannot ship to real users until
the safety floor + clinical review above are satisfied — do not treat their current dev-only
buildout as launch-ready).
**Reflected in:** `app/src/core/learning/experts/AddictionExpert.ts`, `RelationshipsExpert.ts`,
`BodyImageExpert.ts`, `CareerExpert.ts`, `registry.ts`; `Current_Context.md`;
`00_Foundation/CHANGELOG.md` (2026-08-06 entry).

### D25 — Framework-not-content philosophy for domain experts
**Decision:** The coach and its domain experts are explicitly a **framework, not content**. The
system structures goals, interviews, feasibility-checks, and adapts plans over time — it does
**not** supply expert domain knowledge as if it were a licensed professional. Concretely: the coach
is **not** a nutritionist, **not** a trainer, **not** a matchmaker, **not** a therapist. Domain
experts encode *interview structure and planning logic* (what to ask, how to turn answers into a
frequency-based plan, how to detect risk and re-plan), not clinical/professional content.
**Why:** this keeps the product's actual claim honest and legally/ethically bounded — it is a
structuring and accountability tool built on top of the user's own goal, not a substitute for
professional guidance in domains (addiction, relationships, nutrition, career) where bad
"expert-sounding" content from an LLM could cause real harm. It also keeps each `DomainExpert`
implementation genuinely domain-agnostic in shape (same seam, same interview pattern), which is
consistent with D23's "the domain is not the bet, the engine is" principle.
**Categorization:** Approved — this is a standing design constraint on every current and future
`DomainExpert`, not a one-off choice for the current four.
**Reflected in:** `app/src/core/learning/DomainExpert.ts` seam design and all four expert
implementations; `04_Product/Domain_Expert_Authoring_Guide.md` (the colleague-facing guide that
teaches this constraint to whoever authors the next domain); `Current_Context.md`.

### D26 — UX/design decisions bundle for the coach-first app
**Decision:** A bundle of linked UX/design decisions for the coach-first rebuild, captured in full
in **`04_Product/UX/App_and_Screens_Design_Brief.md`** (comprehensive brief — **not yet final**, see
status note below):
1. **Reuse the existing app design** (minimal visual change) rather than a ground-up redesign.
2. **Remove the avatar/Buddy tab and the Shop tab.** (Note: D23 had said the Buddy "stays" but
   evolves per level rather than via dress-up cosmetics — this decision goes further, removing the
   Buddy/avatar and Shop **tabs** from the navigation entirely as part of the coach-first redesign.
   This is flagged here explicitly as a refinement of D23's framing, not a silent contradiction —
   see the note under "Reflected in" below.)
3. **Home priority order:** weekly tasks (including an **urgent / "today's-focus"** block) → a
   central **Coach CTA** → **Friends** (3 who need help + 3 who deserve encouragement) → **My
   Journeys**.
4. **Streak** = a prominent day-count that **breaks only when an urgent task is missed** (not any
   miss) — a non-punishing streak design consistent with D11 (flexible, non-punishing streaks).
5. **Levels are kept**, reframed to reward **breadth** (running multiple parallel Journeys, up to a
   cap) rather than depth/grind within one Journey — consistent with D23's "mature progression, not
   childish gamification."
6. **Urgent is computed**: a task becomes urgent when
   `remaining-days-in-week == remaining-required-sessions`.
7. **Dream = coach-suggested, user-approved.** The coach suggests linking related Journeys into a
   Dream; the user must explicitly approve before "My Journeys" groups by that Dream.
8. **Journey editing is coach-led**, plus a simple **Freeze/Resume** button for pausing without
   deleting.
9. **Step reporting is small and emotional/visual**: happy-face Done / sad-face Couldn't / Partial
   / Postpone — not a form.
10. **The entire coach conversation runs fully on the phone.**
11. **The people/support layer** (Ally, Support Circle, reciprocal friends, goal/Dream Communities)
    is first-class in the brief, not deferred.
**Why:** minimizes redesign risk/cost by reusing proven UI where the mechanism change (companion
app → coach) doesn't require new visuals; removing Buddy/Shop tabs reflects that the coach, not the
Buddy/economy loop, is now the primary daily surface; the Home ordering and urgent/streak/breadth
rules translate D23's "mature progression" and D11's "non-punishing streaks" principles into
concrete screen behavior; coach-led editing + Freeze/Resume keeps Journey structure changes
consistent with the adaptive loop rather than ad hoc manual edits; frequency/coach-suggested-Dream
keep the system honest about what it actually knows vs. assumes.
**Categorization:** **Approved direction for planning purposes**, but explicitly **not final** — the
founder is obtaining a **second, external-AI design proposal** before any screens are actually
wired. Treat this bundle as the working direction, subject to revision once that proposal is
compared.
**Reflected in:** `04_Product/UX/App_and_Screens_Design_Brief.md` (full detail);
`Current_Context.md` (2026-08-06 snapshot). **Note on D23 interaction:** D23 said "The Buddy avatar
stays... it evolves per level" — this decision's "remove the avatar/Buddy tab" is a later
refinement made during the coach-first UX pass, not a silent reversal. Both are preserved here; if
the Buddy's fate needs to be read as a single current answer, this D26 entry (2026-08-06, more
recent) is the current direction, pending the second design proposal.

### D27 — Gemini paid tier for coach testing (~$10/mo cap)
**Decision:** The founder enabled billing on the Gemini API to unblock realistic coach testing,
capped at **~$10/month**. Model used: `gemini-2.5-flash`. API key lives in the git-ignored
`app/.env.local` as `GEMINI_API_KEY` — never committed.
**Why:** the free tier's rate limits were insufficient for iterative interactive testing of the
multi-turn coach conversation; a small, capped paid tier unblocks real testing without open-ended
spend risk (per CLAUDE.md §3.10 — the founder was asked and approved before this was enabled).
**Categorization:** Approved, POC-scale only. **Open note:** shipping to real users would need the
key handled differently (currently would need `EXPO_PUBLIC_…` client exposure, which is a
POC-personal-testing shortcut, not a production-safe secret-handling pattern — flagged as a
pre-launch follow-up, not yet an open question requiring a decision today).
**Reflected in:** `app/.env.local` (git-ignored), `app/src/core/coach/` (the `LlmClient` seam),
`Current_Context.md`.

### D28 — Single-user Supabase auth for the POC (S3)
**Decision:** For the current POC stage, auth is scoped to a **single, known user**
(`guynoiman3@gmail.com`, Supabase UID `d87033dc-254d-4b95-92ba-10c8ba62a87f`) rather than building
out general multi-user sign-up flows yet. Activation requires the founder to set a Supabase
password for that user and populate `EXPO_PUBLIC_SINGLE_USER_EMAIL` /
`EXPO_PUBLIC_SINGLE_USER_PASSWORD` / `EXPO_PUBLIC_SINGLE_USER_UID` in `app/.env.local`.
**Why:** at this stage the only real user is the founder himself; building single-user auth first
lets S3 (auth/backend) proceed and be tested end-to-end without the added scope of general
sign-up/sign-in flows, which can be layered on later once the coach itself is validated. This is a
narrower, deliberately-scoped step within the existing D19 auth direction (Apple + Google,
passwordless, no real-name collection) — it does not replace or contradict D19, it is an interim
POC-stage narrowing of it.
**Categorization:** Approved, POC-scale only — general multi-user sign-up remains Future Vision per
the existing D19 phasing (P3+).
**Reflected in:** `app/src/core/auth/` (`AuthGateway.ts`, `SupabaseAuthGateway.ts`, `authUser.ts`,
`singleUser.ts`), `Current_Context.md`.

---

## 2026-08-01 — Product pivot: AI adaptive coach (repositioning, mechanism change)

### D23 — Reposition from gamified-companion app to AI adaptive coach; mission unchanged; continue the same repo/codebase
**Decision:** PushApp repositions its **mechanism** from a gamified-companion app to an **AI
adaptive coach**. The **mission is unchanged** — "help people become who they choose to be;
close the gap between intention and action" (`09_Product_Philosophy/Product_Philosophy.md`) still
holds exactly as written. What changes is *how* the product delivers on that mission:
1. **Continue the same repo/codebase.** This is an **evolution, not a rewrite** — the existing
   engine-based architecture (pure-TS engines over an event bus, config-before-code, vendor-isolated
   gateways) already fits; several reserved seams/events/flags already exist for this
   (`11_Engineering_Bible/Module_Architecture.md` §E4 — User-Model/Profiling, Intervention/
   Communication, Interests seams). No new codebase.
2. **Mature progression, not childish gamification.** Points/levels and daily/weekly Missions stay.
   The Buddy avatar stays, but it is **NOT dress-up/cosmetic customization** — it **evolves per
   level** (a fixed form per level), reusing the existing Buddy 3D pipeline
   (`11_Engineering_Bible/Buddy_3D_Spike_Findings.md`, `app/tools/ingest_creature.py`).
3. **The moat is the closed feedback loop, not any single feature.** Two moats — **adaptive
   personalization** + **human accountability** — working *together*. The defensible core is the
   **integration**: a closed loop of **behavior → insight → re-plan → nudge → behavior**.
   Competitors have disconnected pieces (an AI planner here, a buddy system there, an accountability
   partner somewhere else); PushApp builds the loop connecting them.
4. **Domain strategy: the domain is not the bet, the engine is.** Build a **domain-agnostic**
   engine now. **General habits/goals is the current build target** (not a specific vertical).
   Sharp vs. general positioning (the "wedge") is a separate, **deliberately deferred** question
   (see Open Question below).
5. **Privacy = local-first split.** Raw personal disclosures stay **encrypted on-device**; only a
   minimal **derived "insight model"** (enums/buckets/preferences — no free text) may persist
   server-side, and only to power outreach timing. This is consistent with the existing
   on-device-only red-line pattern already set for location/calendar data (D21, R3) and should be
   reconciled with it as a broader privacy principle when the engineering plan for this pivot lands.
6. **Build approach:** one status-tracked task list to MVP-in-store; sequential; each component
   built in isolation with tests, then integrated; any partial work always gets an explicit
   follow-up completion task (never left silently unfinished).

**Considered and rejected:**
- **Professional certification-completion vertical** — explored as a possible sharp domain wedge,
  then dropped. Reason: a cert-completion product forces the app to **assess the user's prior
  knowledge** before it can plan a path (a hard, domain-expert-heavy problem). General habits/goals
  sidesteps this entirely — no prior-knowledge assessment is needed to help someone build a habit.
- **Sports vertical** — also considered as a possible sharp wedge and set aside for the same reason:
  committing to a vertical now would mean building domain expertise before the domain-agnostic
  engine is proven. Not rejected forever — see Future Vision below.

**Why (validated by two competitive scans, `05_Research/`):** AI plan-generation is now a
commodity — many apps already generate a plan from a goal. The defensible, hard-to-copy asset is
the **persistence loop + human ally**, not any one AI feature. Closest competitive threats
identified: **Commit** (general-purpose AI coach) and **CertPrep / TrackMates** (certification-
space competitors relevant to the now-rejected cert-vertical exploration).

**Categorization (per `Repository_Guidelines.md` Approved/Future Vision/Open Question):**
- **Approved:** mission unchanged; mechanism = AI adaptive coach; continue same repo; mature
  progression (levels/Missions kept, Buddy evolves per level instead of dress-up cosmetics);
  domain-agnostic engine with general habits/goals as the current build target; local-first privacy
  split; sequential one-task-list build method.
- **Future Vision:** **domain-expert modules** (relationships, learning, nutrition, sports,
  professional certification, etc.) as **pluggable add-ons**, built **later**, only after the
  domain-agnostic infrastructure has proven itself. The sports and cert-completion explorations
  above are preserved here as candidate future modules, not deleted ideas.
- **Open Question — deliberately deferred:** **general vs. sharp ("wedge") positioning.** Whether
  PushApp should eventually launch/market around one sharp vertical (like the rejected sports/cert
  explorations) or stay general-purpose is **not decided**. Revisit explicitly **before design and
  launch** — do not let a design or marketing decision silently pre-empt this question.

**Supersedes (marked, not deleted — see each doc for the "why" that is being preserved):**
`09_Product_Philosophy/Product_Philosophy.md` (Buddy-customization framing inside "Gamification
Exists To Reinforce Reality"), `04_Product/Product_Bible.md` §21.5 (Buddy customization as a
retention system) and §15.1 (AI framed as enhancement-only, D2), `00_Foundation/
Information_Architecture.md` (the "Buddy" section's customization/equipment/shop framing),
`Current_Context.md` (top-of-file pivot notice — all prior handoff snapshots stay as accurate
engineering/process history, only the positioning framing they inherit is superseded).

**Reflected in:** this entry; superseded-notes added 2026-08-03 to the four docs listed above.
Terminology (`Product_Terminology.md`), the engineering/architecture docs, and the working-method
docs were intentionally **not yet updated** at the time this entry was written — tracked as a
separate follow-up task (S0.2).
**S0.2 follow-up landed 2026-08-03:** `Product_Terminology.md` (mid-layer term renamed Phase →
**Milestone**, founder decision 2026-08-01, old "Phase" text preserved as superseded, not deleted);
`11_Engineering_Bible/Engineering_Decisions.md` **E5** (hub-and-loop engine design recorded); new
`04_Product/Build_Plan_and_Method.md` (the S0–S7 (+SX) task-list method this entry's "Build
approach" point named). `CLAUDE.md` §3 rule 2's protected-terms list updated Phase → Milestone.
Other docs still using "Phase" as the mid-layer term (`Product_Bible.md` §3.4A/§35,
`Information_Architecture.md`, `Module_Architecture.md`, several `UX/*.md` docs, and UI copy in
`app/src/`) were **deliberately left unchanged** — a full reconciliation pass is a separate later
task, not bundled into S0.2.

---

## 2026-07-14 — Reminders / Communication Scheduler + onboarding (branch `feat/buddy-3d-and-reminders`, unmerged)

> **Branch note:** D20–D22 and their implementation land on branch `feat/buddy-3d-and-reminders`,
> **not yet merged to `main`.** Recorded here per CLAUDE.md §9/§3.6 (log approved product decisions
> as they're made); treat as approved-for-the-branch until the branch merges.

### D20 — Notification-permission ask happens during onboarding
**Decision:** The OS notification-permission prompt is asked **as part of onboarding** (the new
mission-based flow — see D21), not deferred to first-reminder-fire or a separate later screen.
**Why:** reminders are core to the Journey/Step loop from day one; asking early, in context, while
the user is already granting other setup permissions, avoids a confusing later interruption.
**Reflected in:** `Current_Context.md` (2026-07-14 snapshot); implementation on
`feat/buddy-3d-and-reminders`.

### D21 — Communication Scheduler mechanism + opt-in location/calendar reminder rules; background geofencing deferred; new privacy red-line R3
**Decision:** Reminders are managed by one **Communication Scheduler** that aggregates every
active Journey's reminders into a single schedule, applies the user's `SchedulingPrefs`
(preferred days as a hard filter; an allowed time-window with morning/evening clamping), and
respects the **iOS 64-local-notification cap** (emitting `SchedulerCapped` rather than silently
dropping or over-scheduling). Location- and calendar-based reminder rules are **optional and
opt-in**, built behind vendor-isolated `LocationGateway`/`CalendarGateway` seams
(`NullLocationGateway`/`NullCalendarGateway` today — dormant, consistent with the E4 reserved-seam
pattern). **Background geofencing is explicitly deferred** (not in this pass) — only
on-device, foreground/scheduled use is built now.
**New privacy red-line — R3:** raw location/calendar data stays **on-device only, never synced**
to any backend. *(Numbered R3, not R2, to avoid colliding with the existing R1/R2 privacy
red-lines already defined for auth sessions in `11_Engineering_Bible/Auth_Backend_Proposal.md` §4 —
R1 = no PII in world-readable tables, R2 = sessions in `expo-secure-store`. Renumbering here rather
than reusing "R2" preserves both sets of reasoning without collision; if a single global red-line
registry is ever wanted, reconcile R1–R3 into one place then.)*
**Why:** a single scheduler avoids the failure mode of many independent per-Journey reminder
schedulers silently exceeding the OS cap or fighting over notification slots; opt-in
location/calendar keeps the feature genuinely optional and privacy-respecting from day one; keeping
raw location/calendar data on-device-only avoids opening a new PII-in-the-cloud surface before the
feature has even shipped; deferring background geofencing avoids the OS-permission and battery-cost
complexity of always-on location before there's a validated need for it.
**Reflected in:** `app/src/core/engines/CommunicationScheduler.ts`,
`app/src/core/config/schedulerLimits.ts`, `app/src/core/location/`, `app/src/core/calendar/`,
`Current_Context.md` (2026-07-14 snapshot), `00_Foundation/CHANGELOG.md`.

### D22 — Keep the "Phase" display name
**Decision:** The Journey → **Phase** (optional, sequential) → Step naming from D5 stays as-is;
no rename. D5 had left "Phase" as a working name (candidates: Phase, Chapter, Part) — this closes
that naming question without changing the object model.
**Reflected in:** `Product_Terminology.md`, `Product_Bible.md` §3.4A (unchanged); this entry closes
the open naming question from D5.

---

## 2026-07-10 — Auth foundation: real accounts via Apple + Google (E3)

### D19 — Auth method, no real-name collection, foundation-first phasing
**Decision:** Three linked founder decisions approving the auth plan in
`11_Engineering_Bible/Auth_Backend_Proposal.md`:
1. **Auth method = Sign in with Apple + Sign in with Google**, passwordless (no email/password, no
   SMTP) — consistent with the earlier anonymous-auth rationale (E2) of avoiding email entirely.
2. **Do NOT collect the user's real name** from Apple or Google. In-product identity stays the
   **handle + Buddy**, never a legal name; email is quarantined in Supabase-managed `auth.users`
   and is never written to any `public.*` table.
3. **Build the free foundation (P1–P2) first, at $0 with zero user-visible behavior change.** The
   native Apple/Google sign-in buttons + dev build (P3+) require the **~$99/yr Apple Developer
   Program** — the one unavoidable cost — and are a **later, separately-approved step**, per
   CLAUDE.md §3.10 (never spend the founder's money silently).
**Why:** real users need real, durable, cross-device accounts, and each user's private data must
never be exposed to any other user (founder requirement) — anonymous-only auth (E2) cannot satisfy
this long-term. Apple + Google keeps friction and cost low; skipping the real name removes a
liability with no product use (the identity system already runs on handle + Buddy); splitting the
free architecture work from the paid native step means the $0 foundation doesn't wait on a cost
decision, and the cost decision isn't rushed to unblock engineering.
**Alternatives rejected:** email + password (needs a custom SMTP provider to stay usable, adds a
password-reset surface, higher friction); collecting the real name (no product feature needs it);
shipping P3+ bundled with P1–P2 (would force the $99/yr approval before it needed to happen).
**Landed 2026-07-10:** P1–P2 + R2 secure-store hardening shipped in commit `2af2468` — a
vendor-isolated `AuthGateway` (`app/src/core/auth/`), a new `AuthProvider` owning session
bootstrap (moved out of `SocialProvider`), and Supabase sessions moved from plaintext AsyncStorage
to `expo-secure-store` on native. App still boots anonymous; Apple/Google methods throw
`AuthNotAvailableError` until the P3+ native dev build. `tsc` 0, jest 55/55, code-reviewed.
**Full record (architecture, privacy red-lines, store-compliance, cost, phasing):**
`11_Engineering_Bible/Auth_Backend_Proposal.md`; engineering decision record:
`11_Engineering_Bible/Engineering_Decisions.md` §E3.
**Reflected in:** `app/src/core/auth/`, `app/src/app/_layout.tsx`, `Current_Context.md`.

---

## 2026-07-10 — Interim Buddy art direction

### D18 — Interim Buddy creature = "Ember" (coral), current avatar stands in
**Decision:** Adopt **Ember (the coral/orange creature)** as the **interim** Buddy art
direction. The founder rejected the four creature concepts (Ember · Lumi · Nimbo · Sprig) as
*final* art and is designing new Buddies himself in parallel; to keep nothing blocked, one is
chosen to use now. Ember is picked because the shipped in-app `BuddyAvatar` (glossy SVG creature)
already renders in Ember's coral-orange palette and already matches the v14 mockup's "Sprout,"
so **no art re-draw is needed** — the current avatar *is* the interim Ember Buddy.
**Framing:** Interim only. Re-implementing a different concept as SVG would be throwaway work
since new Buddy art is in progress. When the founder's new Buddies land, they replace this.
**Reflected in:** `app/src/components/buddy/BuddyAvatar.tsx` (already coral/orange), `Current_Context.md`,
`07_Assets/Buddy_Creature_Concepts.html` (the four concepts, for provenance).

---

## 2026-07-08 — Engineering: POC stack chosen (E1)

### E1 — POC technology stack
**Decision:** Build the POC on **Expo (React Native) + TypeScript** with an **engine-based
architecture** (pure-TS `JourneyEngine`/`BuddyEngine`/`RewardEngine`/`MissionEngine`/`ReminderEngine`
communicating over an event bus; configuration-before-code; an offline-first `Repository`
abstraction; on-device local notifications for reminders). Chosen jointly with the founder.
**Why:** instant iOS testing via Expo Go at **$0** (no Mac, no Apple Developer account for the
feedback loop), future web reuse of the UI-agnostic engines, and full alignment with the
Engineering Bible (engines-before-features, vendor independence, offline-first, business logic
outside UI). A cloud backend (Supabase free tier, front-runner) is added behind the abstraction
only when the social/Allies pillar lands.
**Alternatives rejected:** native Swift (needs Mac + paid Apple account, no web path), Flutter
(no JS/TS code-share with the future web builder), PWA (weak iOS notifications, weaker native feel).
**Full record (alternatives, tradeoffs, future):** `11_Engineering_Bible/Engineering_Decisions.md` §E1.

---

## 2026-07-08 — POC scope defined (resolves part of D4)

### D13 — POC hypothesis & scope
**Decision:** The POC tests a single hypothesis — **whether the combination of social support (a chosen circle of friends who see + cheer progress) and the evolving Buddy companion (with its coin/shop/missions reward loop) makes people persist and complete their Journeys.** Success = a meaningful share of users keep checking in ~4 weeks and complete/progress a Journey, and credit the friends and/or Buddy for keeping them going.
**In scope:** Journey loop (create → check-in → progress, incl. Starter Step + "why"); evolving Buddy + celebrations; add-friends → Allies see progress → cheer/nudge; coin economy + Shop (Buddy cosmetics); daily/weekly Missions + Login rewards; basic (non-AI) reminders.
**Out (deferred):** AI Intervention Engine, Explore/Marketplace/templates/creators/brands, Achievements wall, Weekly-planning flow, Phases complexity, public/creator Journeys, rich onboarding.
**Guardrails:** shallow economy (one currency = coins, small cosmetic set, few mission types); combined POC can't isolate social-vs-Buddy (accepted; instrument both, isolate via an MVP A/B); vision intact (deferred ≠ cut).
**Reflected in:** `04_Product/POC_and_MVP_Scope.md` §1.

### D14 — MVP delta & roadmap staging (fully resolves D4)
**Decision:** **MVP = POC + (a) Explore + a starter Journey library (browse & adopt), (b) proper onboarding incl. egg→hatch, (c) Journey Phases + full Journey types, (d) light AI = personalized encouragement from the "why" + smarter-timed reminders** (enhancement only; D2 — nothing core depends on AI).
**Deferred to Commercial:** adaptive Intervention Engine (MVP keeps smarter reminders only), weekly-planning flow, AI Buddy-drafts-your-Journey (paid), Achievements wall, Marketplace/creators/brands, broader Ally types.
**Framing:** MVP job = smallest product adoptable solo with value over *months* that shows why PushApp beats "habit tracker + group chat"; differentiation = the POC-proven social+Buddy+reward loop made adoptable (library+onboarding+real Journey types) and lightly personalized.
**Reflected in:** `04_Product/POC_and_MVP_Scope.md` §2–3 (incl. roadmap staging). **D4 now fully resolved.**

### D15 — 4-version release plan + Rich Step Types (vision)
**Decision:** Ranked all remaining work into **four versions** — **V1 POC · V2 MVP · V3 Commercial · V4 Scale/Ecosystem** (maps onto the staging framework). V3 = adaptive Intervention Engine, weekly planning, AI Journey-drafting (paid), Achievements, deeper economy, Buddy customization depth, broader Allies, Community Insights, templates, subscription. V4 = full Marketplace/Creator economy, Business Journeys, **Rich Step Types**, Interactive Journey Experiences, Buddy voice/conversations, AI-generated roadmaps, full JITAI Intervention Engine, Competition Mode.
**Added (vision/future):** **Rich Step Types inside a Journey** — Steps become richer/extensible (video · audio · quiz · reflection · meditation · PDF · slides · AI-conversation · in-app exercise …) while the model stays Dream→Journey→Phase→Step and Step stays the unit of progress. Enables courses/coaching/meditation/creator experiences without changing the core. Strong investor-vision material.
**Reflected in:** new `04_Product/Version_Roadmap.md`; `Product_Bible.md` **§35** (Rich Step Types, Stage: Future).

### D16 — Revenue streams consolidated (business model)
**Decision:** Monetization = a **portfolio of 5 complementary streams** (ratios TBD, version-mapped), not one bet; core growth always free: **(1) Virtual economy / Shop** (coins, cosmetics, Buddy items — V1 shallow→V3), **(2) Consumer subscription** Premium/Freemium (AI, analytics, advanced interventions — V3), **(3) Creator marketplace** (paid creator Journeys + platform rev-share — V4), **(4) Business/branded Journeys** (publishing fee · rev-share · placement — **promoted from §33.6 hypothesis to approved** — V4), **(5) Coach/professional tier** (seats; future coach marketplace — V3–V4). Framing: early revenue leans IAP+subscription; marketplaces scale later.
**Reflected in:** `Product_Bible.md` **§23** (rewritten as "Revenue Streams"; §33.6 kept as hypothesis history), `03_Pitch/Pitch_Deck.md` §9, `03_Pitch/Investor_Questions.md` §14, `Version_Roadmap.md`.

### D17 — Grace Tokens
**Decision:** Adopt a **Grace Token** system (spend a token to skip/postpone a Step without breaking the Journey; extends §5A.4, feeds §30). Locked guardrails: **(a) earned only, NEVER purchasable / not in Shop** (protects the mission; explicitly not a revenue stream); **(b) transferable only as a GIFT of support (Ally→friend), NEVER a competition wager**; **(c) user opt-out in general settings** (when off, the GT indicator is hidden from Home; ideally also per-Journey "strict"); **(d) separate resource from Coins.** Balance: **regenerating baseline floor + earned top-ups, small cap (~3)**; running out is not punishment (falls back to the gentle §9.10 miss handling); never offered free on-demand. Each use captures a **brief reason → learning, not judgment →** feeds Buddy + Intervention Engine. **Visual:** a "GT" card at the top of Home next to Coins, no "+" button. **Roadmap:** minimal in V2/MVP, full system in V3.
**Reflected in:** `Product_Bible.md` §36 (+ §5A.4, §23 cross-refs), `UX/Home_Screen.md`, `Version_Roadmap.md`.

---

## 2026-07-07 — Batch 2 (Atomic Habits behavioral additions)

Founder-approved, inspired by *Atomic Habits*. Full detail in `Product_Bible.md` §34.
All respect **D2** (no core flow depends on AI).

- **D6 — Step description + "More Info".** Each Step has a short title **and** a longer
  description; the description is hidden by default and opened from the Step card's
  three-dot menu ("More Info"). → Bible §34.1, `UX/Home_Screen.md`, `UX/Journey_Creation_Screen.md`.
- **D7 — No dedicated Habit Stacking (for now).** Calendar- and location-based triggers
  cover the need; no separate "attach to an existing habit" flow. → Bible §34.2, §30.
- **D8 — Starter Step.** The first Step of a Journey is a ≤2-minute action, with author
  guidance + examples. → Bible §34.3, `UX/Journey_Creation_Screen.md`.
- **D9 — Identity & motivation questions at Journey start.** Saved answers power
  *personal* (not generic) encouragement. → Bible §34.4, `UX/Journey_Creation_Screen.md`.
- **D10 — Immediate positive feedback on completion.** Several elegant (not childish)
  celebration variations. → Bible §34.5, `Design_System.md` §7, `UX/Home_Screen.md`.
- **D11 — Flexible, non-punishing streaks.** Recovery-oriented; return-with-one-small-step
  copy. → Bible §34.6, §9.10.
- **D12 — Weekly planning confirmation flow.** Start-of-week review/approve/edit/move plan;
  a new **Weekly Planning** screen is owed. → Bible §34.7, `Open_Questions.md`.

---

## 2026-07-06 — Batch 1 (following the pre-Series-A Repository Review)

### D1 — Initial Positioning
**Decision:** For the initial product, PushApp is positioned for *young adults who want to build and maintain meaningful habits and personal goals across different areas of life.*
**Framing:** This is **positioning, not a vertical**. Do not restructure the product around a single domain (fitness, coaching, education, etc.). The long-term vision remains a general personal-growth platform.
**Deferred:** Specific go-to-market segments and channels → a dedicated Go-To-Market document (later).
**Reflected in:** `Product_Bible.md` §32 (+ §24), `Open_Questions.md` (Beachhead Market), `Investor_Questions.md` Q3, `Pitch_Deck.md`.

### D2 — AI in the MVP
**Decision:** AI **is part of the MVP**, but the MVP must **not depend on AI** in order to provide value. AI enhances the experience, personalizes the product, and improves guidance; every core user flow must remain functional if AI is temporarily unavailable.
**Reflected in:** `Product_Bible.md` §15.1 and §27, `Product_Roadmap_and_Scope.md`.

### D3 — Product Name
**Decision:** "PushApp" is a **working name**. Branding will be revisited later and must not influence current product or engineering decisions. No further action for now.
**Reflected in:** this log only.

### D4 — POC / MVP Definition
**Decision:** To be defined **together, later** — not authored independently. Tracked as a missing document.
**Reflected in:** `04_Product/POC_and_MVP_Scope.md` (placeholder).

### D5 — Object Model: the Phase layer
**Decision:** The object hierarchy is **Dream → Journey → Phase (optional) → Step.** A Phase is an optional, sequential grouping of Steps. "Phase" is a **working name** (not finalized; candidates: Phase, Chapter, Part).
**Reflected in:** `Product_Bible.md` §3.4A, `Product_Terminology.md` (Phase), `Information_Architecture.md`.
**Naming closed by D22 (2026-07-14):** "Phase" is kept as the permanent display name — no rename.

### Also reflected (previously-confirmed decisions the review flagged)
- **Home screen is action-based** (not Journey-based) — `Product_Bible.md` §11.2.
- **Maximum Journey duration** defaults to **~2 months, configurable** — `Product_Bible.md` §3.3.
