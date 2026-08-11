# PRD — Practice (recurring, non-finite, identity-anchored maintenance)

Status: **PARKED (founder, 2026-08-11)** — we are NOT building a distinct "weekly routine"/Practice object
at this stage. Small recurring tasks AND small goals are handled with the existing `Dream → Journey → Step`
model like everything else; after real usage we revisit whether a distinct object is needed. This file (and
its product-guardian conditions C1–C8) is preserved intact for that revisit. See Decision Log **D39 (Parked)**.
Stage: **Future** — revisit after real-world usage of the existing model.
Owner: founder + AI product team (product-manager PRD + product-guardian gate, per D39).
Related: **D39** (the approving decision), **D35** (`Done`-adjacent `Daily_Step_Reporting_PRD.md`), **D37**
(`Step_Postponement_PRD.md`), **D38** (`Smart_Notification_Timing_PRD.md` + `seriesId`), **D26.4/D26.6**
(non-punishing streak + urgency), **D32** (celebration tiers), **Onboarding_Questionnaire (K2)**,
`09_Product_Philosophy/Product_Philosophy.md`, `00_Foundation/Information_Architecture.md`.

> **Working name in D39 was "weekly routine."** This PRD proposes the final name (§3) and treats the
> object as first-class. Wherever this document says **Practice**, that is the recommended name pending
> the §13 naming decision — not yet ratified.

---

## 1. Purpose and problem

A Journey is a **finite transformation** — "Every Journey Must End." But a large class of real self-care
does not end and was never meant to: drink water, change the sheets weekly, wash the floor, tidy the desk,
take the vitamins. Today these have **no home** in PushApp. Forcing them into a Journey corrupts the core
object (a Journey with no end contradicts the philosophy); leaving them out means the app cannot help with
the ordinary, repeating maintenance that quietly defines whether a person feels organized and in control
of their life.

D39 approved a **fast path** for these tasks as a distinct object. This PRD defines it.

**The knife-edge this whole PRD balances on.** PushApp explicitly declares it is **not a habit tracker,
task manager, or productivity app** (`Product_Philosophy.md`, `CLAUDE.md`). A bare list of recurring chores
with streaks *is* a habit tracker. The founder's reconciliation, which every section below must honor: a
**Practice is itself a transformation** — a person who keeps a Practice becomes more organized, responsible,
and in control, which *is* "becoming who you choose to be." The object earns its place **only** if it
ladders to a **chosen identity**, not to a streak count. That distinction — identity-expression, not
chore-list — is designed into the model (§4) and the copy (§5), not bolted on as a disclaimer.

## 2. Product-philosophy fit

- **Growth before engagement (CLAUDE.md §3.4).** A Practice exists to help someone embody a way of living
  ("I keep a calm, orderly home"; "I take care of my body"), not to maximize taps. Its success signal is
  *persistence of a real-life behavior*, never time-in-app.
- **Every Journey Must End is preserved, not weakened.** The Practice is a **distinct object precisely so
  that Journeys can stay finite.** Introducing it protects the Journey's purity instead of eroding it.
- **Progress Over Perfection / non-punishing (D11, D26.4).** Missing a Practice occurrence is never framed
  as failure and (recommended, §13-Q3) never breaks the streak. Reality is always correct — a Practice the
  user keeps skipping is a signal to adapt or drop it, not to guilt them.
- **Simplicity Is A Feature.** The Practice reuses `Step`, the reporting UI, and the postpone UI verbatim.
  It adds **one** new object and **zero** new item vocabulary (its items are Steps).
- **Support Before Pressure.** No coach interrogation, no streak shaming. The identity line is an
  invitation, not a gate.

## 3. Naming

The object must not collide with or blur any protected term: Dream · Journey · Milestone · Step · Buddy ·
Ally · Support Circle · Mission · XP · Coins · Grace Tokens (also Reflection · Achievement · Intervention ·
Explore · Marketplace · Future Journey).

### Candidates for the object

| Candidate | For it | Against it | Terminology check |
|---|---|---|---|
| **Practice** *(recommended)* | "A practice" already means, in growth/wellness language, a set of recurring things you do to embody a way of living (a meditation practice, a self-care practice). It naturally spans **mixed cadences** (water daily, sheets weekly) and it **ladders straight to identity** ("someone with a strong self-care practice"). Warm, mature, non-childish — fits the D23 tone. | Lowercase "practice" appears as a verb in a Step example ("Practice chords"). Minor, resolved by capitalization + context, exactly like the "milestone/Milestone" note in `Product_Terminology.md`. | No collision with any protected proper noun. |
| **Ritual** | Strong identity/meaning ladder; clearly not a chore-tracker vibe. | Implies a **fixed sequence performed together at one time** (a bedtime ritual). Our tasks have *different* cadences, so a Ritual holding weekly + daily tasks reads oddly. | Clean, but semantically narrower than needed. |
| **Routine** *(founder's working word)* | Immediately understood; matches how the founder described it. | "Routine" is the flattest, most chore-coded word available — it invites exactly the "habit-tracker" perception §1 warns against, and it appears in `Product_Philosophy.md` as one of the *distractions* modern life is "filled with." Weakest identity ladder. | No hard collision, but the highest perception risk. |

**Recommendation: `Practice`.** It carries the identity meaning in the word itself, which does more
philosophical work than any UI copy could. Second choice **Ritual** if the founder wants a warmer,
more ceremonial tone; **Routine** only if plainness is prized over the identity ladder.

### Naming for the items

**Reuse `Step` unchanged** — no new item term. A recurring task inside a Practice is a **Step series**
(the individual occurrences are Steps, grouped by a stable `seriesId`, D38). This keeps vocabulary flat
(Simplicity Is A Feature) and lets every existing Step behavior apply for free. In copy we simply say
"the things you do" / list the Steps; we do **not** coin "Practice Step" as a new noun.

### Container or standalone?

**Recommendation: a lightweight CONTAINER, not free-floating tasks.** This is the pivotal model choice,
because it *is* the identity/chore distinction:

- A single floating task ("drink water") with a cadence and a streak **is** a habit-tracker row. That is
  the trap D39 forbids.
- A **Practice** groups its Steps under a **chosen identity line** (the Practice's title/why). "Drink
  water," "take vitamins," "stretch" live under **"I take care of my body."** The container is where the
  identity lives; without it the object degrades into the very thing we reject.

To keep the fast path fast, the container is nearly invisible at creation (§5): quick-add a task, and it
lands in a default Practice the user can name/identity-tag in one tap, now or later.

## 4. Model

### 4.1 What a Practice is

A **Practice** is a **non-finite, Dream-free sibling of Journey.** It hosts recurring **Steps** and carries
a chosen **identity line**. It is **not** a Journey, **not** under a Dream, has **no end**, **no duration**,
**no completion state**, and **no "Week X of Y."**

Object hierarchy after this feature (two parallel branches, both ending in `Step`):

```
Dream → Journey → Milestone (optional) → Step        (finite; a transformation that ends)
Practice → Step                                       (non-finite; identity-maintenance, Dream-free)
```

### 4.2 Distinct object vs. flagged Journey — the binding invariant

Two ways to build this exist. The **product/philosophy layer must keep them distinct**:

- **Rejected at the model/user layer: a Practice as a `Journey` with a `kind:'practice'` flag** and
  `durationDays: Infinity`. This is the cheapest code path but it **muddies the core object** — the exact
  "silent redefinition of Journey" D39 forbids. A "Journey that never ends" contradicts "Every Journey Must
  End" in both data and philosophy.
- **Required: a first-class `Practice` object** (its own concept, its own `AppState.practices` collection),
  **reusing the `Step` interface as its unit** and **reusing the reporting/postpone engine operations**.

The architect owns the exact seam. The invariant handed to them: *the Journey type and the "Journey =
finite transformation" meaning stay untouched; a Practice is a separate object even if, under the hood, the
Step-level operations (`checkInStep`, `reverseReport`, `postponeStep`, status derivation) are generalized
to operate on a shared "Step container" so the code is shared without the concepts merging.* Grounding
today: `Step` is defined in `app/src/core/types/domain.ts` and is currently hosted **only** by `Journey`;
`TodayStep` in `JourneyEngine.ts` keys off `journeyId`/`journeyTitle`, so surfacing Practice Steps on Home
means generalizing that pairing to carry a source (`journey` | `practice`) + container id/title.

### 4.3 Minimum shape (product-level; architect finalizes types)

A Practice needs at least: a stable id; a **title that reads as an identity line**; an optional short "why";
a small set of Step series (each with a cadence — reusing the existing `Cadence` = `once`/`daily`/`weekly`,
and a `seriesId` per D38); and a lifecycle state limited to **`active` | `paused`** (see §6 — **no
`completed`, no `abandoned`**; delete is a hard remove like `deleteJourney`). It has **no** `durationDays`,
**no** `completedAt`, **no** `completionRewarded`, **no** `dreamId`, **no** `milestones`.

## 5. Fast creation path (no coach, no Dream)

Contrast with Journey creation, which is **coach-led** (D26.8/D29: the coach interviews, proposes a plan,
the user approves) and **must** link to a Dream (D34/Dream_Management §6). A Practice is the **opposite
end**: creation is measured in seconds and involves neither.

**The fast-add flow (recommended):**

1. One entry point (an "Add a Practice / recurring task" affordance — placement is §13-Q5). The user
   **types the task** in plain language ("drink water") and **picks a rough cadence** (daily / a few times a
   week / weekly) and optionally a rough time-of-day (morning / evening / either — reusing `DayPart`).
2. **One lightweight identity touch, skippable:** a single line — *"What kind of person does this make you?"*
   — offered as a one-tap chip choice seeded from a small set ("someone who takes care of their body,"
   "someone who keeps an orderly home," "someone who stays on top of things") plus a free-text option. If
   skipped, the Step lands in a **default "General care" Practice** the user can name/identity-tag later.
   This is the entire mechanism that keeps the object out of chore-tracker territory — it is present but
   never blocks the save.
3. Save. The Step(s) appear on Home immediately. **No coach turn, no Dream selection, no plan approval.**

Adding a second recurring task offers to file it under an existing Practice ("add to *I take care of my
body*?") or start a new one — this is how the container fills without friction.

**Copy principle (human, no AI-tell, no em-dashes in user copy):** the identity prompt is an invitation,
never a demand. Wrong: "Set a goal and streak." Right: "What kind of person does keeping this make you?"

## 6. Lifecycle — non-finite

- **No end, ever.** A Practice has no duration, no target date, no completion, no "Every Practice Must End."
  This is the defining contrast with Journey and must be visible in copy (a Practice never shows a
  progress-to-completion bar, a "Week X of Y" pager, or a finish celebration).
- **Pausable.** The user can **pause** a Practice (seasonal, travelling, recovering) and resume it. This
  mirrors Journey **freeze/resume (J3)** mechanically but means "not right now," not "in progress toward an
  end." A paused Practice stops scheduling reminders and drops off the active Home lists; resuming restores
  it. No progress is lost because there is no progress-to-completion to lose.
- **Editable.** Rename, re-identity, add/remove Steps, change cadence/time — a direct, coach-free edit
  (unlike coach-led Journey editing, J1). Removing a Step that has history should **preserve** that history
  the same way Journey editing does (`dropped: true` when a Step carries check-in/reason rows; splice when
  pristine — matching `updateJourney` in `JourneyEngine.ts`).
- **Deletable.** A hard remove, like `deleteJourney` (emit a `PracticeDeleted` id-only event; AppCore
  persists and re-plans reminders so on-device notifications are cancelled). No "abandoned" tombstone —
  a Practice was never a transformation to abandon.
- **No streak death from a Practice miss (recommended, §13-Q3).** A missed Practice occurrence must not be
  framed as failure. See §13-Q3 for the XP/streak decision the founder must make.

## 7. Home presentation

- Practice Steps appear in the **Today / this-week** action lists on Home **alongside Journey Steps**,
  rendered with the **same Step card, the same reporting control, and the same postpone control.** To the
  user, "the things I do today" is one coherent list regardless of source.
- **Distinct enough to not blur the object, subtle enough to stay one list.** A light grouping or a quiet
  label ("Practice") differentiates them without a second competing surface. The exact visual is
  ux-designer's; the product rule is: **shared row mechanics, no separate reporting/postpone UI.**
- **Urgency (D26.6) does NOT apply to Practice Steps (recommended, §13-Q9).** Journey Steps become "urgent"
  when `remaining-days-in-week == remaining-required-sessions` and can break the streak (D26.4). Practices
  are gentler maintenance — keeping the streak-breaking power exclusive to Journeys protects both the
  non-punishing principle and the primacy of the Journey as the thing that matters.
- **Where the object "lives" beyond Home is §13-Q5** (its own light surface vs. a section in the Journeys
  tab vs. Home-only).

## 8. Reuse — Daily Step Reporting (D35) and Step Postponement (D37) apply as-is

- **Daily Step Reporting (D35/D36) applies unchanged.** The four derived statuses (via
  `deriveStepStatus`), the optional on-device Partial note, report **reversal** (`reverseReport`, no XP
  clawback, history retained), and the open-week convention all work on a Practice Step exactly as on a
  Journey Step, because status is derived from `done`/`dropped` + `reasonLog` + `lastReportClearedAt` —
  none of which is Journey-specific.
- **Step Postponement (D37) applies unchanged.** Optional-reason fast postpone, the 2h default with a
  user-picked exact time, the day-crossing shorten-to-30-min-floor rule, Partial-cancels-the-one-shot — all
  operate per-occurrence on a Practice Step identically.
- **Behaviors that differ for a Practice (call-outs):**
  1. **No Journey-completion side effects.** Reporting a Practice Step never completes a container, never
     mints completion XP/Coins, never fires the big shareable achievement card (D32). The **small
     per-Step confetti (D32) still fires** on a Done report (recommended, §13-Q9) — a completed occurrence
     is still a real moment.
  2. **No "closed week" finality tied to a finite plan** — a Practice has no weeks-of-plan; the D35
     open-week convention still governs which past occurrences are editable.
  3. **Reversal cannot "un-complete a Journey"** because there is no Journey to reactivate; it simply clears
     the occurrence.

## 9. Learning grain (D38) — per-activity, with a hard notification guardrail

- **Per-activity learning via `seriesId` (D38) is primarily *for* Practices.** Each recurring task (its
  Step series) learns its own best time — "drink water" learns a different time from "wash the floor,"
  because a Practice bundles multiple distinct recurring tasks with different ideal times (this was D38's
  exact rationale for rejecting per-Journey timing). A **regular Journey keeps per-Journey (schedule-level)
  timing** (D38 refinement). D38 also folded `seriesId`'s implementation **into this object's definition** —
  so `seriesId` ships here, not standalone.
- **BINDING GUARDRAIL (product-guardian, D39).** Finer-grained learning must **never multiply pings.**
  Per-activity timing improves *when* a reminder fires, not *how many* fire. All Practice reminders feed the
  **same per-day send cap** and the single **CommunicationScheduler** (D21) that already respects the iOS
  64-notification cap and the user's `SchedulingPrefs`. A Practice with ten Step series must not become ten
  separate daily pings; the scheduler aggregates and caps exactly as it does for Journeys. This is the line
  that keeps a helpful maintenance object from becoming a notification-spam habit tracker.

## 10. Philosophy / IA impact — specification for repo-steward (do not edit those docs from this PRD)

This object is a **deliberate broadening** of the product surface. To prevent it reading as a silent
redefinition of Journey, repo-steward should make these two edits **after the §13 decisions land**:

- **`09_Product_Philosophy/Product_Philosophy.md`** — add a short section near "Dreams And Journeys" /
  "Every Journey Must End" stating: alongside finite Journeys, PushApp supports **non-finite Practices** —
  recurring maintenance that expresses a **chosen identity** of being organized, responsible, and in control,
  which is itself a transformation. It must (a) reaffirm **"Every Journey Must End" is unchanged** — the
  Practice is a distinct object *so that* Journeys stay finite; and (b) carry the guardrail verbatim: a
  Practice must ladder to a chosen identity and must **never** degrade into a bare habit/streak tracker,
  which PushApp still is not.
- **`00_Foundation/Information_Architecture.md`** — update the object-hierarchy statement to show **two
  branches** (Dream→Journey→Milestone(opt)→Step, and Practice→Step), note Home renders both, and record
  where Practices live in navigation once §13-Q5 is decided. Note that Practices are **excluded** from the
  Dreams grouping and from `Dream_Management` (they are Dream-free by definition).

Also cross-reference: **`Product_Terminology.md`** should gain a **Practice** entry (definition +
"distinct from Journey; non-finite; Dream-free; hosts Steps") once the name is ratified.

## 11. Privacy

- The **identity line and Practice title are user free text** → **on-device only**, on the same G1 footing
  as Journey/Step titles and the Partial/`other` note (`app/src/core/types/domain.ts` G1 comments). They
  must never enter a `DomainEvent`, `ProgressSummary`, `OutreachInsight`, log line, or analytics payload.
- Instrumentation (§12) carries **ids/enums/buckets only** — never the identity text.
- Practices are private account data; a shared Journey never exposes the user's Practices. Account
  deletion/export includes Practices with the rest of the encrypted `AppState` blob (already covered by
  `resetToFirstRun()` / `exportStateJson()`, per D35.7).

## 12. Success metrics & instrumentation

**Success signal (ties to the POC's persistence hypothesis, D13):** do users who keep a Practice **persist
in real-life maintenance over ~4 weeks**, and does the Practice **complement rather than cannibalize**
Journey engagement? Growth-before-engagement: the win is sustained real behavior + a felt sense of being
"in control," not report volume.

**Events to instrument (ids/enums only — hand to implementer to wire, qa-engineer to verify):**

- `PracticeCreated` — `{ practiceId, source: 'quick_add' | 'onboarding' | 'coach_suggested', seedStepCount }`
- `PracticeIdentitySet` — `{ practiceId, identitySource: 'chip' | 'freetext' | 'skipped_default' }`
  *(enum only; never the identity text)*
- `PracticeStepReported` — `{ practiceId, seriesId, status: 'done'|'partial'|'not_completed'|'unreported' }`
  *(reuses the D35 derived statuses; add a `source: 'practice'` discriminator to the existing report event
  rather than a parallel event, so persistence can be compared like-for-like against Journey Steps)*
- `PracticeStepPostponed` — `{ practiceId, seriesId, hadReason: boolean }` *(reuse D37's postpone event with
  the source discriminator)*
- `PracticePaused` / `PracticeResumed` / `PracticeDeleted` — `{ practiceId }`
- Derived retention metric (no new event; computed): **share of Practices still being reported in week 4**,
  and **per-user Journey-report rate with vs. without an active Practice** (the cannibalization check).

**Guardrail metric the founder should watch:** average **daily notification count per user** must not rise
with Practice adoption (validates the §9 send-cap guardrail).

## 13. Blocking / open questions (the founder must resolve these)

1. **Naming.** Approve **Practice** (recommended), **Ritual**, or **Routine** for the object. Confirm items
   stay plain **Steps** (no new noun).
2. **Container vs. standalone.** Approve the **identity-anchored container** (recommended) over free-floating
   tasks. This is the identity-vs-chore decision; standalone tasks re-open the habit-tracker risk.
3. **XP and streak — the trap question.** Does a Practice earn **XP** and/or feed the **streak**?
   *Recommendation:* award **modest XP for consistency** (consistent with "XP for maintaining consistency,"
   `Product_Terminology.md`) **but no per-Practice or per-task streak counters**, and **a Practice miss does
   NOT break the global streak** (only urgent Journey Steps do, D26.4). This keeps the reward honest without
   building the streak-shaming mechanic the mission forbids. **Founder call required** — this single choice
   most determines whether the object reads as growth or as a habit tracker.
4. **Dream grouping.** Confirm Practices are **entirely separate** from Dreams and `Dream_Management` — never
   grouped under a Dream, never in My Dreams. *(Recommended: yes, separate — D39 says Dream-free.)*
5. **Where Practices live + entry point.** Own light surface, a section inside the Journeys tab, or Home-only
   (plus the add affordance)? *(Recommended: Home for daily action + a light "My Practices" list reachable
   from Home/Journeys; not a new bottom-nav tab — Simplicity.)*
6. **Onboarding placement (K2).** Should the **Onboarding Questionnaire** offer to seed a **first Practice**
   (e.g. from a self-care answer)? *(Recommended: yes, one optional suggested Practice, entering this same
   coach-free fast path — a warm first win that models the identity framing.)*
7. **Identity friction.** Is the identity line **mandatory, nudged-but-skippable, or optional-with-default**?
   *(Recommended: nudged-but-skippable with a "General care" default — keeps the fast path fast while making
   the identity the norm.)*
8. **Coach involvement.** Confirm the coach **never gates** Practice creation, but **may later suggest**
   promoting a Practice into a Journey, or attaching a clearer identity. *(Recommended: yes — coach as
   optional elevator, never as a required gate.)*
9. **Celebration + urgency.** Small per-Step **confetti (D32) on a Done Practice report: yes**; big
   achievement card: **no** (no completion exists); **urgency (D26.6): no** for Practice Steps. Confirm.
10. **Breadth cap.** Cap the number of active Practices (parallel to the Levels breadth cap, D26.5) to keep
    the object from becoming an unbounded chore list? *(Recommended: a soft cap or gentle nudge, not a hard
    limit — revisit with data.)*

**Standard edge-case checklist (per PRD README):** first-run/empty (no Practices → explain the concept in
one line, offer the fast-add); offline (fully local, works offline; no coach needed); notification
permission denied (Practice still works, reminders silently skipped, same as Journeys); paused/deleted
states (§6); concurrent edits across devices (same version-conflict handling as Journeys once backend
exists); very long / empty title (validate non-empty, cap length); RTL + Hebrew; **form of address**
(the identity prompt must use the gendered `addressForm` variants, D31); deletion/data-loss (hard delete
preserves nothing by design, but confirm intent); error/loading states.

## 14. Out of scope

- Per-task streak counters, streak-break shaming, or any "don't lose your streak" mechanic.
- A completion state, progress-to-completion bar, "Week X of Y," end date, or finish celebration.
- Linking a Practice to a Dream or surfacing it in My Dreams.
- Coach-gated creation, plan approval, or Milestones inside a Practice.
- A materialized occurrence/recurrence engine (D35.1/D38 — `seriesId` is a lightweight grouping key, not a
  recurrence model).
- Multiplying reminders per Step series (§9 guardrail).
- Public/friend-visible Practices or sharing the identity line (a later dedicated PRD only).

## 15. Decision classification

### Approved (by D39, pending only the §13 refinements)
The object exists and is **IN the app**: a fast-path, non-finite, Dream-free, identity-anchored recurring
object, distinct from Journey, reusing Step + D35 + D37, learning per-activity (D38) under the send-cap
guardrail.

### Recommended (this PRD's proposals, awaiting founder confirmation)
Name **Practice**; identity-anchored **container**; items stay **Steps**; distinct first-class object (not a
flagged Journey); modest XP + **no streak break** on a Practice miss; confetti-yes / card-no / urgency-no;
onboarding may seed one; nudged-but-skippable identity; Home + a light list, no new tab.

### Open Questions
All ten items in §13 until the founder rules on them — chiefly **Q3 (XP/streak)** and **Q2 (container)**,
which decide whether the object reads as identity-growth or as a habit tracker.
