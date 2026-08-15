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
**Decision (founder, PRD `04_Product/PRD/Done/Week_Boundary_Preference_PRD.md`):** there is exactly ONE
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

### D35 — Daily Step Reporting: blocking questions closed (PRD ready)
**Decision (founder, `04_Product/PRD/Daily_Step_Reporting_PRD.md` §12):** all seven §12 blocking questions
were resolved against the current codebase, moving the PRD from Open Questions to **Ready for
implementation**. Key calls:
1. **Flexible weekly targets = multiple pre-created Steps** (the existing one-shot `Step` model, grouped by
   `stepsByWeek`), each reported independently → separate rows on Home, which the founder accepted. **No**
   occurrence entity and **no** "x/y this week" counter in MVP (both deferred post-MVP). Rationale: finite
   `durationDays` bounds pre-creation; per-instance evidence already lives in `checkIns`/`reasonLog`.
2. **All report transitions allowed within the open week** (including reversing a `completed`); history is
   **retained** via the append-only `reasonLog`/`behaviorLog` (never overwritten); **no XP clawback** on
   reversal (kept forgiving). An "un-report" path is a small addition (`checkInStep` is one-way today).
3. **No hard closed-week immutability in MVP** — past weeks just aren't surfaced for editing (product
   convention, not a storage lock; no "closed week" state exists in code).
4. **Partial `0.75` = research hypothesis only**; progress stays binary (partial counts as 0). Partial
   remains a distinct non-failure status/signal with no numeric weight.
5. **Weekly Review may use the Partial note, on-device only** (feeds local `reviewWeek`/`AdaptivePlanner`);
   never to cloud/DomainEvent/social/analytics without a fresh security-privacy decision (G1).
6. **Partial explanation is OPTIONAL, not mandatory** — a short on-device-only note; mandatory text would
   contradict the "reporting in seconds" principle (§2).
7. **Retention/deletion already covered** by the single encrypted `AppState` blob +
   `resetToFirstRun()`/account deletion + `exportStateJson()`. The elaborate §8 cascade is **N/A until a
   backend sync exists** (revisit with security-privacy then).
**Method note:** first feature closed under the PRD-per-feature flow using a code-grounding pass (the
explorer mapped the real `Step`/reporting/reasons/week/persistence model before answering), which is why
most "open" questions collapsed against what already exists.
**Categorization:** **Approved** (PRD Ready; implementation not yet started).
**Reflected in:** `Daily_Step_Reporting_PRD.md` (status + §4/§5/§6/§7/§10/§12).

### D36 — Daily Step Reporting: implementation approach (status derived, not stored; reversal via a marker)
**Decision (architect plan, ratified at implementation start 2026-08-10):** implement D35 without a new
report ledger and without a `Step.status` enum. Specifically:
- **Status is DERIVED** by a pure helper `deriveStepStatus(step, reasonLog)` from `done`/`dropped` + the
  append-only `reasonLog` + a new optional `Step.lastReportClearedAt`. Progress stays binary.
- **Reversal** = a new `JourneyEngine.reverseReport` + `StepReportReversed` event: clears `done`/`lastCheckInAt`,
  stamps `lastReportClearedAt`, un-completes + reactivates an auto-completed Journey, KEEPS prior CheckIn /
  reason rows (history retained). **No XP clawback.**
- **Idempotent rewards**: `StepCheckedIn`/`JourneyCompleted` gain `firstCompletion`; `RewardEngine` grants
  only when true (`Journey.completionRewarded` set once). Re-completing after a reversal grants nothing.
- **Optional Partial note** reuses the existing on-device `ReasonEntry.note` path (`did_partially` via
  `submitReason`); `ReasonEntry` gains an optional `action` for precise derivation. The note NEVER enters an
  emitted event (G1). **security-privacy** to confirm; **ux-designer** owns the non-failure Partial color
  token; **content-writer** owns he/en copy.
**Categorization:** **Approved** (implementation approach; build in progress).
**Reflected in:** `Daily_Step_Reporting_PRD.md`; the engine/UI/i18n files in the plan.

### D37 — Step Postponement: blocking questions closed (PRD ready; requires a Miss_Recovery update)
**Decision (founder, `04_Product/PRD/Step_Postponement_PRD.md` §11):** the five §11 blocking questions were
resolved against the current codebase, moving the PRD to **Ready for implementation**. This feature is
mostly conflict-resolution between the founder's mobile draft and the existing Miss-Recovery POC. Calls:
1. **"Postponed" is an ACTION, not a status** — the Step stays `unreported` (matches the code; `postponeStep`
   changes no field) and the four Daily-Reporting statuses (D35.5). UI shows a "postponed to <time>"
   affordance when `postponedUntil` exists.
2. **Reason on Postpone → OPTIONAL, with a fast one-tap reason-free path** ("remind me in 2h" / pick a time).
   Matches the "common action must be fast" principle + the Partial-note decision (D35.6). **Supersedes
   Miss_Recovery's "reason required on Postpone."**
3. **Repeated-postponement Coach intervention → DEFERRED post-MVP** (depends on the off `intervention` engine
   + the Coach). MVP persists `postponeCount` **per occurrence** only; no threshold fires. Removes the
   POC-threshold conflict.
4. **Per-occurrence retiming → YES for MVP** — postpone schedules a **one-shot reminder** for the Step at
   `postponedUntil`, independent of the Journey's recurring reminder. Correct semantics for "remind me about
   THIS step later"; **supersedes the current Journey-level retiming** for the postpone path. Heaviest part of
   the build (reminder scheduler; relates to J4) but adds a one-shot rather than rewriting the reminder model.
5. **Retention/deletion → already covered** by the single encrypted `AppState` blob (count/timestamps
   on-device; events ids-only; `note` on-device for `other`); cascade-deleted + exported. Intervention
   telemetry N/A until that engine ships.
**Required follow-up:** `../Miss_Recovery_PRD.md` must be updated for #2 and #4 before/with build. That file
is currently in a locally-modified (Codex) state — the founder aligns/commits it first; we never overwrite it.
**Refinement (founder 2026-08-10):** (a) **Partial CANCELS** the pending one-shot (a Partial is a final
report of execution — overrides the earlier "keep on Partial"); (b) the **2h default is fixed**, but the user
may **pick the exact reminder time**; (c) **day-crossing shorten rule** — if the 2h default would cross
midnight, shorten to keep the reminder today down to a **30-minute floor**, and if even 30 minutes crosses
the day, tell the user no further reminder can be made today; (d) **helper + AppCore**, not a dedicated
engine. See `Step_Postponement_PRD.md` §4 + §11.6.
**Categorization:** **Approved** (PRD Ready; implementation not yet started; Miss_Recovery update pending).
**Reflected in:** `Step_Postponement_PRD.md` (status + §3/§4/§5/§7/§11 incl. §11.6).

### D38 — Adaptive timing learns per recurring-activity (a Step `seriesId`), not per Journey
**Decision (founder, 2026-08-10):** the grain for reminder-timing (and postpone-pattern) learning is the
**recurring ACTIVITY**, linked by a stable **`seriesId`** stamped on the Steps that are instances of the same
repeated task, at creation. Learning accumulates per `seriesId` so timing improves from one occurrence to the
next.
**Reasoning / path (the founder reasoned through both alternatives):**
- **Rejected — per-Journey timing** (his own first idea, then withdrawn): too coarse. A single Journey — e.g.
  a "weekly routine" — can bundle **multiple distinct recurring task types**, each with its own ideal time;
  one Journey-level time can't serve them.
- **Rejected — full occurrence/recurrence entity** (D35.1, deferred): `seriesId` is a lightweight grouping
  KEY, not a materialized-occurrence model or a recurrence engine.
- **UX unchanged** (D35.1): still separate rows; `seriesId` is invisible, used only for aggregation.
**Scope:** the field + stamping-at-creation land **now** (folded into the Step Postponement build); the
learning itself belongs to **`Smart_Notification_Timing_PRD.md`**. Postpone one-shots stay per-occurrence
(D37); `postponeCount` stays per-occurrence for now, with `seriesId` enabling future per-series aggregation.
**Open implication (architect to map):** reminders are per-Journey today; acting on per-activity timing may
require per-series reminder timing — coexisting with the per-occurrence one-shot from D37.
**Categorization:** **Approved** (foundational model addition; architect + product-guardian pass in flight).
**Reflected in:** to be reflected in `Step_Postponement_PRD.md` (seriesId field) + `Smart_Notification_Timing_PRD.md`
(learning) once the architect/guardian pass returns.
**Refinement (founder 2026-08-10):** (i) **granularity = ONE series per action** — drop `milestoneId` from the
key (the same action across phases must keep one timing insight, not split). (ii) **Grain-split (see D39):**
per-activity (`seriesId`) learning applies to the new **routine** object; a regular **Journey** learns
**per-Journey** (schedule-level). `seriesId` is therefore primarily for routines — its implementation now
**folds into the routine definition (D39)**, not shipped standalone.

### D39 — A fast-path recurring "routine" object, distinct from Journey
**Decision (founder, 2026-08-10):** PushApp will support a **fast path** for small recurring tasks (e.g.
"drink water", "change the sheets", "wash the floor") that are **not tied to a Dream** and are **not
Journeys**. A Journey stays a **finite** transformation ("Every Journey Must End"); recurring-maintenance
tasks get their own home — a distinct object (**working name "weekly routine"; final name TBD** by
product-manager + product-guardian).
**Philosophy reconciliation (founder):** a routine **is itself a transformation** — a person who builds a
routine becomes more organized, responsible, and in control, which *is* "becoming who you choose to be." So
it is within the mission, **not** a bare habit-tracker. The founder acknowledges the perception risk (it can
*look* like a habit-tracker) and chose to include it, framed this way.
**GUARDRAIL (product-guardian, binding):** it must ladder to a **chosen identity**, never become a
streak/chore tracker; per-activity timing learning must **not multiply notifications** (feeds the per-day
send cap — D38 / `Smart_Notification_Timing`).
**Scope:** reuses `Step` + **Daily Step Reporting (D35)** + **Step Postponement (D37)**. Learning grain is
per-activity (`seriesId`, D38) for routines; a regular Journey stays per-Journey.
**Categorization:** **Approved — Vision (IN the app).** To be **defined by a product-manager PRD** +
**product-guardian gate**; `Product_Philosophy` / `Information_Architecture` must be updated so this is a
deliberate broadening, **not a silent redefinition** of Journey.
**Reflected in:** `Future/Recurring_Routine_PRD.md` (now Parked) + D38.
**PARKED (founder, 2026-08-11):** the founder decided **not to build a distinct "weekly routine"/Practice
object at this stage.** Small recurring tasks AND small goals go through the EXISTING `Dream → Journey → Step`
model like everything else; after real-world usage we revisit whether a distinct object is warranted.
Consequences (all MOOT for now, preserved for the revisit): the name (Practice vs routine), container-vs-
standalone, placement, the streak-includes-routine question, the Practice↔Dream anchoring, and the
product-guardian conditions C1–C8. `Recurring_Routine_PRD.md` moved to `Future/` with a Parked status. This
reverses only the "build it now," not the analysis.

### D40 — Daily-loop batch resolutions: Weekly Review, Dreams, reminders, support circle, notifications (2026-08-11)
Resolved with the founder 2026-08-11 across the PRD queue (each PRD to be updated to match):
- **Weekly Review:** **never show an empty next week** — always surface remaining Steps from other active
  Journeys, else a coach CTA to build a plan, else a Dream-based suggestion (a fitting existing Dream or one
  not yet addressed). Keep the user in motion. The screen opens with a past-week summary ("X Steps done",
  note frozen Journeys). A proposed plan-change is retained **≤48h**. Changes apply **forward-only**; already-
  reported/past data stays saved (immutable). Analysis stays on-device deterministic (Q1 hybrid: optional LLM
  narration behind the live-coach gate); free text not analyzed; retention rides the encrypted blob.
- **Dreams (Dream Management):** each Journey has **one PRIMARY Dream + optional secondary Dreams**
  (many-to-many with a primary; first UI slice exposes single-primary). The **coach OWNS the Dream layer** —
  it infers/formulates Dreams from the conversation, the **user does NOT approve**, and the coach may
  create/edit/delete Dreams freely. Sync invariants deferred to a backend.
- **Reminders:** account-level **Active Hours** (set at onboarding, editable in the Profile screen) are
  DISTINCT from **per-Journey reminder times**. An out-of-hours reminder is **moved earlier to fit (clamp),
  NOT disabled** — reusing the shipped clamp behavior + the postpone shorten-rule logic (so NO behavior
  reversal; this overrides the earlier "disable" recommendation and the PRDs' "never clamp" wording). **Smart
  mode deferred** (needs Weekly Review) — tracked as a follow-up so it isn't lost. Build order: account Active
  Hours → per-Journey Off/Fixed management (also migrate the creation-wizard reminder into the managed
  ReminderRule system) → Weekly Review → Smart. Per-series (`seriesId`) timing rides in with Smart, not now.
- **Support Circle (D2):** add a **consent/acceptance gate** before any sharing (and fix, in the same slice,
  the current bug where a removed friend keeps seeing shared snapshots). **The Companion bundle IS IN**
  (founder: consensual sharing with a chosen person is legitimate). **Scope refinement (founder 2026-08-11):**
  Companion for MVP shares **only system-generated Step progress (names + statuses)** — this is content the
  app created, not the user, so it is low-sensitivity and is NOT user-generated content. **No images and no
  cloud image storage in MVP** — proof images belong to `Accountability_Ally` (Future) only, which removes the
  storage cost. Owner-attached free text is **deferred to Accountability Ally too** (recommended, pending
  final founder confirm) so Companion MVP carries no UGC. Access is **revocable at any time**. Net: the only
  live requirement is a **light security-privacy pass** (row-level access + immediate revocation + fixing the
  removed-friend bug); **store-compliance (UGC/Apple 1.2) and cost-guardian are N/A for this slice**. Build
  against the real schema; validate with a seeded second account until general sign-up lands. Bundle names
  (Encourager/Companion) → product-guardian to ratify.
- **Notifications:** build a unified **notification service** as infrastructure now, with per-type templated
  phrasing that will later be **tone-driven** (ties to the unified communication style). Add **all nine**
  Support-Circle notification types now even if not all fire yet; more types are coming.
- **Friend messaging:** deferred post-MVP (honors D29) but **planned into the architecture now** (keep a seam).
- **Communication style:** ONE unified preference driving **both** the coach tone and notification copy,
  SELECTED via the (future) onboarding questionnaire.
- **Onboarding questionnaire (K2):** parked — not ready to spec.
- **Sync manifest:** produce a doc listing every area/field needing cross-device sync / server persistence so
  a future backend migration is turnkey; the app should behave identically across devices (not prioritized now).
**Categorization:** **Approved.** **Reflected in:** to be applied to `Weekly_Review`, `Dream_Management`,
`User_Active_Hours`, `Journey_Reminder_Management`, `Journey_Support_Circle`, `Communication_Style_Profile`,
`Friend_Profile` PRDs + a new Sync-Manifest doc.

### D41 — Journey completion is FINAL (a report reversal can never un-complete a Journey)
**Decision (founder, 2026-08-12):** resolves a real contradiction found between **Daily Step Reporting**
(D35/D36 — `reverseReport` reopened an auto-completed Journey, un-completing it) and the
**completion-celebration model** (D32/I1 — a Journey completion is a celebrated, **shareable, final**
moment). **Resolution: completion is FINAL.** Once a Journey is `completed`, its reports are **locked** —
`reverseReport` refuses when `journey.status === 'completed'` (or `completedAt` is set), so a report reversal
can never un-complete a Journey. In-week report correction applies to **active** Journeys only; a completed
Journey may be **deleted** (J2) but never **reopened**, which keeps the shareable achievement (D32) valid.
**Implemented 2026-08-12** (`JourneyEngine.reverseReport` guard; the D36 "reopens" test flipped to "REFUSES";
jest 661/661, tsc clean, eslint 0). **Design note for I1:** the completing check-in should be a
deliberate/celebrated moment (a gentle confirm, or the celebration itself) so an accidental final-Step
check-in doesn't permanently complete a Journey.
**Categorization:** **Approved + Implemented.** **Reflected in:** `Daily_Step_Reporting_PRD.md` (§7 + §12.2);
`app/src/core/engines/JourneyEngine.ts` (`reverseReport`).

### D42 — Completion Celebration (I1): MVP scope, deferrals, and the final-Step confirmation (2026-08-12)
**Decision (founder, 2026-08-12):** built the Completion Celebration (`PRD/Completion_Celebration_PRD.md`,
I1) with a deliberately scoped MVP slice. **Three founder calls this session:** (1) **Defer the in-app
Ally completion/thanks message** (PRD §5) — there is no delivery channel (no push backend; in-app messaging
is post-MVP per D29). The ceremony still offers the OS share sheet now; the in-app Ally path is tracked as a
follow-up (`MVP_Task_List.md` **I1-a**). (2) **Save the card as an image** stays in scope, but real
device-verified image export needs the not-yet-existing native build, so all native capture sits behind a
`CardShareGateway` seam with a degraded web/Expo-Go fallback (text share via `expo-sharing`); device
verification is follow-up **I1-b**. (3) **Add a gentle final-Step confirmation** before the last Step
completes a Journey (D41 makes completion final) — copy: "על ידי ביצוע הצעד הזה אתה מסיים את ה-Journey. לאשר?"
(gendered, en+he), wired once through a shared gate into all three completion paths (Home swipe, ⋯ report,
Journey-detail check-in). **Auto-open priority (founder default):** when a Weekly Review and a completion
ceremony are both pending, the **ceremony wins** and the review defers to the next foreground (one flippable
decision point, `COMPLETION_CEREMONY_WINS`; "one major event per foreground" enforced via per-foreground
latches reset on `AppState` active).
**Built:** small-celebration variants + reduced-motion guard + Settings toggle; the big ceremony (dedicated
modal route, idempotent card minted once at the first `completed` transition, auto-open latch mirroring
Weekly Review); the swipeable completion card (name-revealing + name-omitting variants, safe-fields-only,
privacy preview before share); the share gateway. **Reviewed** (code-reviewer + security-privacy): privacy
model sound (safe-field whitelist enforced, caption never persisted, card exported + wiped with the account);
fixed a HIGH i18n key bug (doubled `card.` prefix, now a single tested `cardCopyKey` seam) and a
Weekly-Review auto-open suppression bug. **Green: tsc clean · eslint 0 · jest 852/852.**
**Open (Low, founder's call):** the default card variant reveals the Journey name — consider defaulting to a
name-omitting variant for privacy on sensitive Journeys (privacy-review L1).
**Categorization:** **Approved + Implemented (MVP slice).** **Reflected in:** `Completion_Celebration_PRD.md`
(§0), `MVP_Task_List.md` (I1, I1-a, I1-b); `app/src/core/celebration/*`, `app/src/core/share/*`,
`app/src/app/completion.tsx`, `app/src/components/celebration/*`, `app/src/hooks/useFinalStepConfirm.ts`.

## 2026-08-13 — Weekly Review closed; overnight autonomous build batch (J5, L1, F1, D2)

> Continues the branch `feat/buddy-3d-and-reminders`. The founder pre-authorized autonomous execution
> overnight; each item was built → adversarially reviewed (code-reviewer + security-privacy) →
> findings fixed → green. Final state: `tsc` clean · `eslint` 0 · `jest` 916/916. Everything is
> committed by topic but not pushed. Full narrative: `Current_Context.md` → "⭐ HANDOFF SNAPSHOT —
> 2026-08-13".

### D43 — Weekly Review: the two-layer split is authoritative; apply-on-approval, not automatic
**Decision:** closes a wording ambiguity between the founder's original 2026-08-07 direction and the
ratified/shipped behavior. The system has exactly **two layers** of plan change, and they must never be
confused:
1. **Tactical layer (immediate):** per-occurrence recovery (Step postponement, D37) and direct user
   edits to a Journey (coach-led, J1) apply **immediately**, effective the moment the user acts.
2. **Strategic layer (weekly boundary):** Weekly Review analyses the past week and proposes next
   week's plan **at the week close/open boundary**. The proposal is retained for **≤48h** and **owns
   the plan for that window** — but it never applies silently. It applies **only on the user's
   explicit approval** (or expires unapplied at the 48h mark), per `Weekly_Review_PRD.md` §1/§2
   ("meaningful Journey changes never apply without explicit user approval").
**Wording correction:** `MVP_Task_List.md`'s original C1 line (carried from the founder's 2026-08-07
note in `Current_Context.md`, and repeated in D40's Weekly Review summary bullet) said the weekly plan
"applies automatically... for the coming week." That phrasing is **superseded** by the ratified PRD and
the shipped code — apply-on-approval, not a silent daily/automatic apply. The 2026-08-07
`Current_Context.md` snapshot is left unchanged as accurate history of the founder's original framing;
only the now-stale `MVP_Task_List.md` C1 row is corrected.
**Why:** a silent automatic re-plan would contradict the product's trust model (the user must always
see and approve a change to their week) and would collide with D41 (Journey completion is final) and
the PRD's own "the previous valid plan remains active while a proposal awaits a decision" principle.
Naming the two-layer split explicitly (rather than leaving it implicit inside D40's Weekly Review
bullet) prevents this ambiguity recurring as the feature evolves (Smart reminder timing, D2 lifecycle
notices, etc.).
**Status (2026-08-13):** C1 was found **already built** during tonight's work — a real week-boundary
trigger (`weekGate`), a real `weekly-review.tsx` screen, forward-only apply-on-approval,
`adaptiveEnabled`-gated (so production stays dormant). Tonight only closed the gap with 4 new coverage
tests (flag-off inert, empty-week, 48h expiry, late-approval rebase).
**Categorization:** **Approved + Implemented.** **Reflected in:** `Weekly_Review_PRD.md` (§1/§2,
already correctly worded); `MVP_Task_List.md` (C1 row, wording corrected); the weekly-review test
suite.

### D44 — Overnight build batch: inactivity freeze (J5, local-first), parked goals (L1), Dream surfacing (F1, initial cut), Support Circle hardening (D2)
**Decision / session record** (founder pre-authorized autonomous execution; each item built →
adversarially reviewed by code-reviewer + security-privacy → findings fixed → green):

1. **J5 — Account Inactivity Freeze, LOCAL-FIRST POC.** Per `Account_Inactivity_Freeze_PRD.md`
   (Ready), built a pure `InactivityEngine` reusing the existing J3 frozen path via a new
   `Journey.freezeReason` provenance field (`manual` vs `account_inactivity`, matching PRD §4); a
   21-day threshold (`config/inactivityPolicy.ts`); a lazy foreground-evaluated tick (no server job);
   a return flow (`return.tsx`) offering Talk-to-coach / Choose-Journeys-to-resume / Not-now — **never
   auto-resumes**, matching the PRD's core promise. Review found and fixed a **HIGH** bug (freeze
   could re-arm across cycles) and a **MEDIUM** bug (a zero-frozen cycle left an undismissable CTA).
   **Deferred — server-authoritative enforcement:** freezing exactly at-the-mark while the app is
   closed, authoritative server time, multi-device consistency, and Ally lifecycle notices (PRD §3/§6)
   all need a backend and are explicitly NOT built — the local-first POC only evaluates on foreground
   open, using device time. This is a scoped, honest MVP-POC slice, not a silent gap: safe for the
   founder's own single-device testing, not yet correct for a multi-device or server-timed release.
2. **L1 — Parked (deferred) goals.** Coach-detected extra goals (`GoalSpec.deferredGoals`) now persist
   to `AppState.parkedGoals` instead of being dropped once the conversation instance ends. Surfaced on
   the Journeys "For later"/Future tab; **activatable** into a real Journey (reuses the existing
   `createJourneyFromGoalSpec`, so no new Journey-creation path); **dismissable**. **Sensitive-domain
   goals (addiction/relationships) are filtered at capture AND guarded again at activation** via a
   shared `core/coach/sensitiveDomains.ts` — a deliberate double-gate so a sensitive goal can never
   reach a Journey through the parked-goals side door, consistent with D24's gating of those domains.
3. **F1 — Dream creation, INITIAL surfacing cut only.** Added: a My Journeys → My Dreams nav entry; a
   read-only "Part of your Dream" card on the Journey detail screen; a link-approval card for Journeys
   not yet linked to a Dream (reuses the already-tested `linkJourneyToDream`). **The coach
   Dream-authoring conversation itself (the coach actually creating/naming a Dream from conversation)
   is explicitly DEFERRED** to a joint design session — open questions remain in
   `Dream_Management_PRD.md`. This slice is surfacing/linking only, not Dream creation. Note: this does
   not touch D40's "coach owns the Dream layer, no user approval to create/edit" model — the
   link-approval card here approves *attaching an existing Journey to an existing Dream*, a distinct,
   still-approval-gated action from Dream creation itself.
4. **D2 — Journey Support Circle hardening (correcting a stale task-list line).**
   `MVP_Task_List.md`'s D2 row said "no screen calls [`setAllies`] — a user cannot currently
   propose/name an Ally in-app," but the real Journey Support Circle (consent gate + propose/accept UX
   + the Companion bundle) was **already built** in the D40 work (commit `b3a9ff5`, see
   `Journey_Support_Circle_PRD.md`). That row was simply stale; corrected tonight. Tonight's actual
   work was **hardening**, not building from scratch: hid the invite CTA on completed/frozen Journeys
   (inviting an Ally to a Journey that can no longer progress is a dead end); distinguished an
   offline-load-failure state from a genuinely-empty Support Circle (previously indistinguishable,
   risking a user believing they have no Support Circle when the real cause is network); added the
   missing UI test coverage. **Flagged, not fixed tonight (LOW, latent):** the older `setAllies` write
   path bypasses the Companion coach-Journeys-only gate (D40's scope restriction) — no caller reaches
   it today so it is inert, but it should be **retired or guarded** so a future caller can't silently
   reintroduce ungated Ally sharing.

**Why (shared reasoning across all four):** each was picked because it was fully executable without
founder input tonight (a closed PRD spec, or a straightforward code-grounding correction), per CLAUDE.md
§3.8 ("solve autonomously, escalate sparingly"). None required a founder aesthetic/positioning call —
J5/L1/D2 had closed specs (PRDs Ready, or already-built code needing only correction/hardening); F1 was
deliberately capped to the surfacing-only slice specifically because the remaining piece (coach
Dream-authoring) does need founder/design input, so it was left out rather than guessed at.
**Verification:** built → adversarially reviewed (code-reviewer + security-privacy) → findings fixed →
green throughout this batch: `tsc` clean · `eslint` 0 · **`jest` 916/916**.
**Categorization:** **Approved + Implemented** (J5 local-first POC, L1, F1 initial cut, D2 hardening) +
**Open/Deferred** (J5 server-authoritative enforcement; F1 coach Dream-authoring conversation; D2
live-DB authorization-matrix QA + the latent `setAllies` gap; L1's user-facing label / cap /
activation-mechanics need founder confirmation).
**Reflected in:** `MVP_Task_List.md` (J5, L1, F1, D2 rows); `PRD/Account_Inactivity_Freeze_PRD.md`;
`PRD/Journey_Support_Circle_PRD.md`; `PRD/Dream_Management_PRD.md`; `Current_Context.md` (2026-08-13
overnight snapshot).

### D45 — Buddy / avatar DEFERRED to Future; the coach (meta-agent) is the MVP's central user-facing entity
**Decision:** The Buddy companion/avatar is **deferred to Future — it is NOT part of the MVP.**
Currently there is no avatar and no Buddy in the app; the user talks directly to the **coach** (the
meta-agent, see D30), which is the MVP's central user-facing entity. The Buddy vision itself is **not
cut** — it is fully preserved and may be reintroduced post-MVP (per CLAUDE.md §3.3, "the vision never
shrinks — move it later, never delete").
**Why now:** this resolves a standing tension in the repository between two philosophy/principle docs
written when Buddy was the active design (`AI_Product_Principles.md` Principle 9, "Buddy Is The
Experience" — present the AI through Buddy; and `09_Product_Philosophy/Product_Terminology.md`'s "Buddy"
entry — "Buddy becomes the emotional face of PushApp") and the mature-redesign / AI-adaptive-coach
direction already shipped in the app (origin: the 2026-08-07 mature-redesign snapshot in
`Current_Context.md`, which removed the Buddy tab from the navigation and made the coach the primary
AI-facing surface; formalized as the meta-agent being the sole user-facing voice in D30, 2026-08-09).
Those docs were never updated to reflect that the avatar had already been dropped from the shipped
product — this decision makes the staging explicit rather than leaving an unresolved contradiction.
**What does NOT change:** "Buddy" remains the **canonical term** for the deferred companion/avatar
concept — it is not renamed, and no synonym is introduced. All existing Buddy reasoning (why it exists,
what it represents, its role in the reward loop/economy, its Future-vision depth) stays intact in the
docs, annotated with a Future/deferred stage marker rather than deleted or rewritten.
**Categorization:** **Approved** (product direction; re-staging, not a new invention).
**Reflected in:** `AI_Product_Principles.md` (Principle 9 annotated), `09_Product_Philosophy/
Product_Terminology.md` ("Buddy" entry annotated), `04_Product/Version_Roadmap.md` (Future entry for
Buddy/avatar reintroduction), `Current_Context.md` (2026-08-13 snapshot note).

## 2026-08-13 (continued) — Journey cancellation model; partner-content terminology resolved

> Same day, a second founder pass: answers to `Journey_Abandonment_PRD.md` §12 (the open questions from
> the initial 2026-08-13 spec) and to the terminology audit of `10_Partner_Coaching_Content/`.

### D46 — Journey cancellation: irreversible with no undo, Future Journeys are deleted not canceled, History tab approved, inactivity-return offers cancel
**Decision (founder, 2026-08-13):** four linked calls that resolve five of the seven open questions in
`Journey_Abandonment_PRD.md` §12:
1. **Cancelling a Journey is IRREVERSIBLE.** No undo window of any kind. Pressing the action raises a
   confirmation that asks the user whether they are sure **and states plainly that the action is
   irreversible**; on confirm it is done and final.
2. **The "Completed" tab is renamed "History"** (Hebrew "היסטוריה"), with **Completed** and **Stopped**
   grouped inside it — approved exactly as recommended.
3. **A Future Journey is DELETED, not cancelled — it simply disappears.** It has no history to preserve,
   so Delete is the honest action; the Journey-detail action is **Delete** for a `future` Journey and
   **Cancel** for an active or frozen one, never both.
4. **The inactivity-return screen also offers cancelling a Journey**, per-Journey, alongside Resume.
5. **"Start again" appears only for FROZEN Journeys** — meaning there is **no restart-from-cancelled
   path.** Verified against the shipped code (`JourneyEngine.resumeJourney`, surfaced as "Resume journey"
   / "חידוש המסע" on the Journey-detail screen and "Choose Journeys to resume" / "חידוש" on the
   inactivity-return screen): this is the **existing Resume affordance**, not a new feature — nothing new
   needs to be built for it.
**Rejected, and why (preserved, not discarded):**
- **A short (~10s) undo window after cancelling** — the PRD's own recommendation, built on the reasoning
  that "the splice is genuine data loss and mistaps are real." The founder heard this and declined it
  anyway; no verbatim reason was captured, so none is invented here, but the outcome is firm: no undo,
  immediate or delayed.
- **"Start it again as a new Journey," seeded from a canceled one** — the PRD's recommended fast-follow
  restart path for a *canceled* Journey. Superseded by point 5 above: the founder's "start again" refers
  only to the frozen-Journey case (the existing Resume), so this seeded-restart idea for canceled
  Journeys is not being built, not now and not later as currently scoped.
- **Allowing Cancel (not just Delete) on a Future Journey**, the PRD's primary recommendation for §7.2 —
  the founder chose the PRD's own noted counter-argument instead (zero history means nothing to
  preserve, so Delete is the honest and only action).
**Why:** finality mirrors D41 (Journey completion is FINAL) — one coherent rule that terminal states are
terminal and only Pause/Freeze is reversible; a tab named "Completed" holding canceled Journeys would be
a label that lies; a Future Journey has no lived history, so "cancel, keep what I did" doesn't apply to
it; the inactivity-return screen is exactly the moment a user decides whether a paused thing is worth
resuming, so offering cancel there (not just resume-or-nothing) matches user intent honestly.
**Still open (not answered this session):** how loudly stopping is affirmed and whether the Support
Circle gets an owner-initiated "I'm stopping this one" note (§12.4); whether cancelled Journeys ever
appear under their Dream (§12.6).
**Categorization:** **Approved.**
**Reflected in:** `04_Product/PRD/Journey_Abandonment_PRD.md` (§5.7, §5.8, §7.1, §7.2, §8.1, §8.3, §8.4,
§12, §13.2, §14 — each resolution recorded in place, prior recommendations and rejected alternatives kept
intact).

### D47 — Ally = whoever the user added to the Support Circle; real-world supporters are not modeled
**Decision (founder, 2026-08-13, from the terminology audit of `10_Partner_Coaching_Content/`):** **An
Ally is whoever the user chose to add to the Support Circle. Nothing else.** This settles an ambiguity
found in the partner's addiction on-call content, which used "Ally/support" to also mean a sponsor, a
clinician, or family — none of whom are Allies in PushApp's model, and none of whom are currently modeled
as any in-app object.
**Consequence, made explicit:** when the coach refers to real-world support (a sponsor, a clinician, a
family member, "someone you trust"), it must speak in **plain language** — never the term "Ally," and it
must **never route a user to the in-app Ally/Support Circle list as if it were crisis support.** The
in-app Support Circle is Journey-scoped, consensual, and not a safety mechanism; conflating it with
real-world crisis support would be actively unsafe. This connects to the still-open safety-floor gate on
the Addiction and Relationships & Loneliness domains (D24) — this decision does not close that gate, it
only prevents one specific way the product could mislead a user before it does.
**Left open, deliberately not decided today:** whether real-world supporters (sponsor, clinician, family)
should ever be modeled as their own in-app concept. The founder did not say, and product-guardian's
advice — followed here — was **not to invent a term for this before the underlying vision question is
answered.** No new terminology is introduced for this pass; the audit's own fix (widening the partner
content's generic "Ally" uses to also name a sponsor/clinician/family member in plain language) already
matches this decision and needed no further change.
**Also from this audit pass (not a Decision Log item on its own, recorded here for provenance):** the
Dreams screen stays user-visible for now (helps testing), settling the partner content's position that
the coach should own Dreams as an internal-only abstraction — our Dream stays user-visible, with the
decision explicitly marked revisitable. See `10_Partner_Coaching_Content/PARTNER_FILE_MANIFEST.md`.
**Categorization:** **Approved** (the Ally definition) + **Open Question** (whether real-world supporters
are ever modeled).
**Reflected in:** `10_Partner_Coaching_Content/PARTNER_FILE_MANIFEST.md` (resolution note appended);
`09_Product_Philosophy/Product_Terminology.md` (Ally entry — checked against this decision; see that
file's own note on whether it needed sharpening).

## 2026-08-14 — Partner content, second terminology pass: `intervention` split, Meta-Coach resolved, ONE Weekly Review

> Second editing pass over `10_Partner_Coaching_Content/` (the external coaching partner's v1.1
> package), under the same founder rule as the first: partner files may be edited for terminology
> alignment, **PushApp's own code is not changed to accommodate them**, and nothing there is wired
> into the app. The reply the founder will send the partner is
> `04_Product/Partner_Reply_Terminology_2026-08-13.md`.

### D48 — `intervention` keeps its PushApp meaning (proactive); the partner's reactive coaching move becomes `comment`
**Decision (founder, 2026-08-13/14):** the two vocabularies use the same word for opposite things, so
each sense keeps its own word:
- **Ours — `intervention`: a proactive action PushApp initiates** — a notification, a reminder, an
  outreach. Unchanged; this is the definition already in `Product_Terminology.md`.
- **Theirs — a reactive coaching move made inside a conversation the user started** — renamed
  **`comment`**. Their `prepared intervention` / `micro-intervention` headings are now
  `Prepared comment` / `one prepared comment`.
**Why both words were needed:** the difference is *who initiates*, and that is not cosmetic — it decides
which engine owns the behaviour. A proactive intervention is scheduled work the product does while the
user is absent (Communication Scheduler, notification permission, quiet hours, D21); a reactive comment
is something the coach says in a turn the user opened, and it has no scheduling, permission or
quiet-hours dimension at all. Collapsing them into one term would have let on-call conversational
content be read as licence to push notifications, which is exactly the kind of drift the privacy
red-lines exist to stop. Renaming ours instead was rejected: `intervention` is load-bearing in our own
docs, and it is the accurate word for the proactive sense.
**Explicitly not renamed:** the **45 academic/clinical uses** — "intervention research",
"behaviour-change interventions", NICE guidance, meta-analysis citations (Masi, Liu/Huang/Wang, Guest,
Alleva, Oprea, CDC). Those name cited literature; rewriting them would misrepresent the sources.
**Categorization:** **Approved.**
**Reflected in:** `09_Product_Philosophy/Product_Terminology.md` (Intervention entry sharpened, with
`comment` recorded as the partner-side counterpart); `10_Partner_Coaching_Content/` (53 occurrences
renamed across 6 files + the consolidated bundle, logged in `PARTNER_FILE_MANIFEST.md`);
`04_Product/Partner_Reply_Terminology_2026-08-13.md` §3.2.

### D49 — The partner's "Meta-Coach" is our coach (user-facing) / meta-agent (architecture)
**Decision (founder, 2026-08-13/14):** the partner's **Meta-Coach** is the same entity we call **the
coach**, whose internal architectural name is **meta-agent** (D30). Their content is aligned to ours:
**"the coach"** where the sentence is about what the user experiences (identity, voice, what the coach
says or must not say, safety wording the user reads), **"meta-agent"** where it is architecture (spec
metadata, Dream ownership, Expert consultation and routing, on-call hand-back to the orchestrating
layer). 111 occurrences across 27 files, judged one at a time rather than swapped as a token.
**Our own fault, named plainly:** the partner did not disobey the brief — **`meta-agent` existed only in
D30 and `04_Product/Domain_Expert_Authoring_Guide.md`, and was missing from the canonical terminology
document**, which is the one place an outside author would look. That gap is the reason the drift
happened, and it is now closed (see below). This is the second time a partner-facing term was
under-documented on our side; the rule going forward is that a term is not canonical until it is in
`Product_Terminology.md`.
**Filenames deliberately unchanged:** `Master_Specs_Original/15_Meta_Coach_Master_Spec.md` and
`Calibration/14_Meta_Coach_Calibration_24_Cases.md` keep their names so the package stays traceable to
the zip the partner sent, and so the manifest's hashes stay comparable with their originals. Content
inside them uses our naming; the mismatch is intentional and recorded in the manifest.
**Categorization:** **Approved.**
**Reflected in:** `09_Product_Philosophy/Product_Terminology.md` (new **Meta-agent** entry);
`10_Partner_Coaching_Content/` (111 occurrences, logged in `PARTNER_FILE_MANIFEST.md`);
`04_Product/Partner_Reply_Terminology_2026-08-13.md` §3.1.

### D50 — There is exactly ONE Weekly Review; per-Journey and per-expert content nests inside it
**Decision (founder, 2026-08-13):** the partner's per-Journey weekly adherence review — the
`STABILIZE / ADAPT / PROGRESS` decision in
`10_Partner_Coaching_Content/01_Eating_Daily_Consistency_Progression.md` §7 — **does not become a second
object.** It **nests inside our existing Weekly Review** (`04_Product/PRD/Done/Weekly_Review_PRD.md`,
D40/D43).
**The founder's framing, which is the architectural part:** *the Weekly Review is a shared mechanism
available to every domain expert and every Journey, into which they can contribute information for
display.* So there is one Weekly Review surface, one week boundary, one 48-hour approval window — and
per-Journey and per-expert content is nested content **within** it, not a parallel ritual with the same
name.
**Why:** two weekly rituals would compete for the same week boundary and the same approval moment, and
the user would have to learn which one owns their plan. It would also fork the trust model D43 protects
(nothing applies without one explicit approval). Treating the Weekly Review as a shared contribution
surface keeps the domain experts where D30 puts them — internal tools that feed the meta-agent, never a
second user-facing voice.
**Flagged, not built:** this gives the Weekly Review a **contribution slot that does not exist in the
code today.** `Weekly_Review_PRD.md` §6/§7 defines review inputs and Journey-level analysis as
first-party logic; there is no interface for a domain expert to contribute a per-Journey block for
display, and none was added. **This is a future implementation item**, to be specified before any
partner content is wired — which, per the folder's standing rule, it is not.
**Categorization:** **Approved** (the architecture) + **Future** (the contribution slot itself).
**Reflected in:** `04_Product/Partner_Reply_Terminology_2026-08-13.md` §3.5;
`10_Partner_Coaching_Content/PARTNER_FILE_MANIFEST.md` (second-pass note). `Weekly_Review_PRD.md` is in
`04_Product/PRD/Done/` and is immutable — it was **not** edited; when the contribution slot is built it
needs its own PRD delta.
**Delta written (2026-08-14):** that PRD delta now exists as
`04_Product/PRD/Weekly_Review_Contributions_02_PRD.md` — the contribution contract (three kinds:
display-only `note`, verifiable `evidence`, and a `proposal` that inherits D43's single atomic 48h
approval gate unchanged), D30 re-voicing through the meta-agent's own intent templates, volume caps,
empty/degraded states, the on-device privacy red lines, and a cross-check confirming
`Smart_Notification_Timing_PRD.md` §6 is a strict instance of this contract rather than a conflict.
**Still Future — approved architecture, interface not built, not scheduled**, with 7 open founder
questions in its §14 (the sharpest being whether the change vocabulary grows to cover the partner's
`context`/`busyDayVersion`, without which `PROGRESS`-by-context is inexpressible).

### D51 — A Journey always has an end date; it moves ONLY when the user explicitly says so (no automatic extension, and no ceiling)
**Decision (founder, 2026-08-14, in two passes on the same day):**

**Pass 1 — finiteness and explicit extension.** *"There is no need for a Journey without an end date. Every
Journey is initially planned for up to two months and remains a finite process. If postponing a Step moves
work past the end date, the Journey may be extended — but only following an explicit user action and
approval. The extension is never automatic."*

**Pass 2 — the ceiling question, resolved.** *"It's fine for a Journey to become infinite if the user
**actively** extends it. The two-month decision is for their benefit, but if they choose to extend, that is
their decision and we respect it."*

**What is settled:** (1) a Journey always has an end date — there is no open-ended Journey; (2) the
**two-month planning window is guidance, not a cap**, and its job is to stop people over-committing at the
moment they plan, which is when over-committing happens; (3) **there is no hard ceiling on extension** — a
Journey may be extended repeatedly and may in practice run indefinitely; (4) **every extension requires an
explicit user action and approval**, from a real user-facing moment, with no automatic extension from any
caller, ever.

**The invariant, stated so nobody has to infer it:** *a Journey's end date only ever moves because the user
said so.* What the design prevents is **drift without consent**, not length. That line is absolute: an end
date that moves automatically, silently, or as a side effect of another action is forbidden — including
from the inactivity freeze (J5), the Weekly Review, the `deferDependents` cascade and the adaptive planner.

**Why, and why it is consistent with how we already work:** this is the same stance as **D46** (Journey
cancellation is irreversible, with no undo). The app may make a heavy action quiet and deliberate, and may
explain the consequences honestly, but once the person has understood and chosen, their decision is
**respected, not fought**. The product's job is to inform the choice, never to overrule it. D46 and D51
read as one stance, not two unrelated calls. A hard cap would have been the app deciding it knows a user's
life better than they do, which is the paternalism the mission rejects. And "a Journey is a finite
transformation" stays true: that is a claim about the object's *shape* — it always has a last day and a
defined set of Steps, and it never becomes an open-ended recurring object (the deliberately parked Practice
model, D39) — not a promise about the number 60.

**Growth-before-engagement tension, recorded rather than hidden:** extension unbounded by consent could in
principle prolong a Journey that should have been reshaped or let go. The safeguard chosen is
**measurement, not a gate**: completion rate of extended vs non-extended Journeys, days past planned end at
completion, and the "many extensions, never completes" pattern (`Step_Postponement_02_PRD.md` §12). If the
data shows extending hurts real follow-through, the response is better planning up front and an earlier
route to the coach-led Journey-edit conversation — never a cap imposed on the user.

**Code truth this corrects (verified 2026-08-14, not assumed):** a postponement today writes only the four
per-occurrence Step fields (`postponedUntil`, `postponedAt`, `postponeCount`, `postponeNotificationId`)
plus one OS notification. **No path writes `Journey.durationDays` or any end date**, so a postponement past
the last day currently strands work outside the Journey's window with nothing recorded anywhere. There is
no extension mechanism to modify; it has to be built. The same work must fix `AppCore.journeyEndsAt`, which
anchors on `createdAt` while `journeyView.endsAt` anchors on `effectiveStartAt` — so the two disagree for
any Journey activated later than it was created, and the existing `crosses_journey_end` warning misfires
for Future Journeys.

**Addendum — third pass, same day (2026-08-14): two of the original eight §14 questions answered.**

1. **~~A manual Pause/Resume freeze (J3) gives the time back by extending the end date.~~ SUPERSEDED the
   same day by the fourth pass below — see "Addendum — fourth pass".** Recorded here rather than deleted,
   because the reasoning is still load-bearing. **The superseded answer:** *"Yes, a freeze should also
   extend the remaining time. On resume we calculate how long the Journey was frozen and add it to the end
   date."* — implemented as a `cause: 'freeze_credit'` entry on the append-only extension ledger, computed
   automatically inside `resumeJourney`, with no separate approval sheet, scoped to J3 only because J5 has
   no Pause-tap consent moment. **Why it was superseded:** adding days to the end date leaves **every Step
   exactly where it was**, so a Journey paused on a Sunday and resumed a month later on a Thursday keeps
   Steps planned for Sundays — dates now in the past, on a weekday the person did not choose. The window
   became honest and the plan became fiction. **What survives intact and is carried forward:** the consent
   reconciliation this pass established — the invariant is about **consent**, not about which caller writes
   a field; an extension-after-postponement adds time *beyond* the approved plan and needs its own consent
   (the §7 sheet), whereas restoring the working length of a plan the user already approved adds nothing
   beyond it, and failing to give the time back would *itself* be the drift the invariant exists to
   prevent. That argument is why the fourth pass's rebuild needs no *new* approval for the window moving.
2. **Nothing needs to happen on a Journey's last day beyond the existing celebration.** *"Nothing needs to
   happen on the last day. After a Journey ends there is a celebration, and that is enough."* The completion
   ceremony (**I1/D42**) stays the only end-of-Journey moment; a pre-end nudge, a countdown and a plan-review
   prompt were each considered and are declined, not merely unbuilt. **This answer stands, unaffected by the
   fourth pass.**

**Addendum — fourth pass, same day (2026-08-14): the founder corrects the third pass and closes three more
questions.** This addendum **supersedes point 1 above**. It does not take a new decision number: it is the
same decision, corrected.

1. **A pause is not compensated — the remainder is RE-PLANNED.** The founder's correction:

   > "I don't see this as compensation. It is simply continuing the plan (the Journey) from the point where
   > we stopped, without changing the Journey's structure. **The restart point becomes the start point for
   > the remaining part of the Journey.** And yes, all the Steps should also be recalculated accordingly. In
   > practice, if the user stopped the plan on a Sunday and restarted it a month later on a Thursday, the
   > remaining part of the Journey has to be **re-planned** — so what is needed here is a rebuild process
   > that essentially keeps the same plan and adapts it to the restart time.
   >
   > Also, at restart we could **ask the user what caused them to stop and whether they have any notes** they
   > want to give before the plan is rebuilt — and then take what they say into account and rebuild it better."

   **What this settles.** The operation is a **rebuild of the remainder anchored at the resume instant**, not
   arithmetic on an end date. Every unreported, undropped, dated Step is recalculated; the Journey's
   *structure* is untouched (order, spacing, Milestones, the "why", the Support Circle, reminder rules and
   every id are preserved); and **the end date moves only as a consequence of the rebuild, never as the
   operation itself**. At the resume the user may optionally be asked what made them stop, with the answer
   used as context for the rebuild. Full mechanics — scope rule, weekday re-anchoring, reuse of the existing
   rebase, the resume conversation, the ledger consequence, events and edge cases — are in
   `04_Product/PRD/Step_Postponement_02_PRD.md` §14 Q5.1–Q5.7.

   **Why the correction matters beyond this feature:** it distinguishes *bookkeeping* from *the plan*. An app
   that gives back the days but not the fit has satisfied its own ledger and not the person — which is
   exactly the growth-before-engagement test in `CLAUDE.md` §3.4.

2. **The automatic J5 inactivity freeze gets the same treatment as J3 — Q9 resolved.** The third pass left
   this open because J5 has no Pause tap to point at as consent. Under the re-plan model the consent moment
   is no longer the *freeze* but the **resume**, and a resume is an explicit user action in both cases:
   `app/src/app/return.tsx` **never auto-resumes** — it offers Talk to the Coach / Choose Journeys to resume
   / Not now, and each Journey is picked back up by its own tap, with Keep it paused and Cancel it as equal
   alternatives. One code path, not two; the only surviving difference is `freezeReason` provenance.

3. **Allies see a status tag, and nothing about the window.** *Allies "should see a tag of the Journey's
   status (changed to paused or resumed), but for now there is no display beyond that."* **Approved as a
   rule; not expressible in today's code** — a real finding, not a detail: `ProgressSummary`
   (`app/src/core/social/SocialGateway.ts`) is a strict four-field whitelist (`journeyId`, `title`,
   `progress`, `streak`) with **no status field**, and `SocialProvider.publishAll` gates on the positive
   `isRunning` predicate and **withdraws** a paused Journey's summary entirely — so today a paused Journey
   *disappears* from an Ally's view rather than showing as paused. Expressing the tag requires adding one
   narrowly-projected `status: 'active' | 'paused'` field (never the raw `JourneyStatus`, which would leak
   `completed`/`abandoned`) and changing the publish gate to a two-branch rule that still withdraws
   everything else. That widens a whitelist whose own comment forbids widening it without review, so it is
   **Proposed, pending a security-privacy review**.

4. **An extension is NOT reversible.** *"the Step is the thing that was postponed and therefore the Journey
   was extended, so this action cannot really be undone."* The extension is the *consequence* of an event
   that already happened; undoing it would strand the postponed Step outside the window again, which is the
   failure the feature exists to fix. Same stance as **D46**. **Consequence:** the §7 confirmation copy must
   be honest about finality — as a stated fact, never as a warning, and with none of §7's forbidden
   vocabulary (no icon, no red, no "Are you sure?").

**Categorization:** **Approved** — the fourth pass's four answers, plus the third pass's last-day answer.
**Superseded** — the third pass's freeze-credit model (preserved above and in `Step_Postponement_02_PRD.md`
§14 Q5.0.a with the reason). **Proposed, pending security-privacy review** — the Ally status-tag mechanism.
**Open Question** — four items remain in `Step_Postponement_02_PRD.md` §14: **Q1** (what is shown at the
extension moment — the founder decided the rule, not the copy), **Q2** (the wizard's 90-day option), **Q3**
(whether an extension also moves `plannedFor`), **Q6** (the `deferDependents` cascade); plus **Q8b** (what
the completion card shows), which is a design question for ux-designer + content-writer rather than a
founder ruling, and whether Journey-level pause reasons should be added to the closed reason list.
**Reflected in:** `04_Product/PRD/Step_Postponement_02_PRD.md` (the continuation PRD: the model
recommendation, the exact trigger, the approval moment, lifecycle interactions, metrics and open
questions — §14 Q4 decided in place; §14 Q5 **rewritten** as the re-plan model with the superseded credit
design preserved in Q5.0.a; Q7/Q8/Q9 decided in place; Q8b opened; §5 reconciled with the ledger's second
cause; §9's J3/J5 rows, §11's privacy rules, §16's acceptance direction and §17's categorization updated to
match); `04_Product/PRD/README.md` (index); `04_Product/PRD/PRD_Coverage_Gaps.md` PC-26 (the gap this closes
at the specification level; the implementation gap remains).
`04_Product/PRD/Done/Step_Postponement_PRD.md` (D37) is immutable and was **not** edited; nothing in it is
rescinded.

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
