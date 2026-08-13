# PRD — Step Dependencies (linear unlock)

Status: **Implemented — 2026-08-13; built in 3 slices, adversarially reviewed (code-reviewer), findings fixed;
green (tsc clean, jest 965). product-guardian passed; visual approved (`UX/Step_Dependency_Cards.html` Rev 2).
FOLLOW-UP: the coach-authoring decision-logic — the plumbing (create + edit) exists and is validated, but the
coach prompt does not yet PROPOSE dependencies in a live conversation; that's a separate coach-design task.
Also deferred (accepted): postpone/reschedule of a predecessor does not cascade to dependents (fail-open +
display-pull prevent any dead-end).**
Stage: **MVP.**
Owner: founder + AI product team.
Source: founder spec, 2026-08-13 ("a Step opens only after its predecessor is done").
Related: `Daily_Step_Reporting_PRD.md` (statuses + report flow), `Completion_Celebration_PRD.md`
(Journey completion finality), `Step_Postponement_PRD.md`, `Backfill/Streak_Mechanism_PRD.md`,
`Future_Journey_Management_PRD.md`, and Journey editing (J1).

Grounding: this PRD is written against the ACTUAL code as of 2026-08-13 — the `Step`/`Journey` model
(`app/src/core/types/domain.ts`), the derived reporting status (`app/src/core/status/stepStatus.ts`),
the weekly pager (`app/src/components/journey/journeyView.ts` → `stepsByWeek`) and its consumer
(`app/src/app/journey/[id].tsx`), Home (`app/src/app/(tabs)/index.tsx` via `getWeekSteps`), urgency
(`app/src/core/util/urgency.ts`), the streak (`app/src/core/engines/StreakEngine.ts`), and Step
counting/completion (`JourneyEngine.journeyProgress` / `checkInStep`). No code has been written; this
is purpose-before-implementation.

## Resolved decisions (founder, 2026-08-13) — these close the open questions in §4

1. **Definition:** dependencies are authored **via the coach** (at creation/edit), not a manual control.
2. **Shape:** **linear, single-predecessor only**; a chain is at most **3** Steps; dependencies only **within
   the same Milestone**.
3. **Unlock:** a dependent opens when its predecessor is **partial OR full** completion.
4. **Visual (approved):** the waiting Steps are **equal-size cards stacked directly behind** the current Step
   (a deck), offset down + toward the trailing edge (mirrors under RTL); content hidden, non-interactive; the
   stack depth (number waiting) is legible; on unlock the next Step promotes to a full normal card. Mockup:
   `04_Product/UX/Step_Dependency_Cards.html` (Rev 2). "Locked/chain/dependency" are **mechanism words only** —
   never in user copy; the surface framing is **"waiting / coming up next," not "blocked."**
5. **Counting:** total Step count unchanged; a waiting Step still counts toward the week's load (in the
   progress denominator + the nudge), but is kept **out of the streak-driving urgency math** and can **never**
   fire a `StepMissed`.
6. **Reporting the predecessor "not done":** show a confirmation, and on confirm **defer the whole chain to
   the next week** (it re-appears stacked next week; if the predecessor was done this week, the dependent
   appears normally next week). Cross-week: no stack is shown across a week boundary.
7. **Never auto-remove a dependency-linked Step (founder correction):** a Step that is part of a dependency
   (predecessor OR dependent) is significant and is **never automatically dropped**. When the adaptive engine
   must shed load on such a Step it may **defer** it, **shrink its time/scope**, or **break the dependency**
   (if the rest of the chain is being deferred) — but it must **never delete/hide the Step**. Belt-and-braces:
   `isStepLocked` fails **open** (a missing or dropped predecessor unlocks the dependent) so a Journey can
   never dead-end and always stays completable (protects D41).
8. **Report UI on a waiting Step:** hidden behind the current card and non-tappable until it unlocks.
9. **Nudge:** a gentle, Buddy-voiced "handle this first so there's time" hint — support, not pressure; separate
   from the streak math.

**Build:** architect 9-slice plan (engine core → week layout + cascade + edit + no-auto-drop guard → UI + copy).
Content-writer owns the user-facing "waiting" wording; ux spec to be captured from the approved mockup.

---

## 1. Purpose

Some Steps only make sense in order: you cannot "book the venue" before you have "chosen the date",
or "publish the article" before you have "written the draft". Today PushApp treats every Step as
independently actionable — the whole Journey's Steps sit flat in the weekly pager and on Home, with
no notion that one Step must wait for another. This lets a user try (and report on) a Step that is not
yet reachable, which is confusing and, worse, invites a report that does not reflect reality.

**Step Dependencies** lets a Step be defined so that it becomes available only after its predecessor
is done. It makes the true shape of a plan visible without adding complexity to the common case (a Step
with no dependency behaves exactly as it does today). It serves the mission — real-life transformation —
by keeping the user's attention on the Step that is actually doable now, and by nudging them to clear a
blocking Step early so there is time for what depends on it.

This feature is deliberately **narrow**: linear, single-predecessor dependencies only. It is not a task
graph, not a Gantt chart, and not a project manager.

## 2. Detailed behavior (the founder's spec)

### 2.1 The dependency model — linear, single-predecessor only

- A Step (`step2`) may declare that it depends on **exactly one** predecessor Step (`step1`).
- Dependencies are **linear only**. There is **no AND-of-multiple**: you cannot say "`step3` is
  available only if `step1` AND `step2` are both done" unless `step2` itself already depends on
  `step1` (i.e. a chain). Each dependent Step points at a single predecessor, never a set.
- Chains are therefore possible by transitivity (`step1 → step2 → step3`), but each link is still a
  single pointer. Branching/merging (two predecessors converging on one Step, or one predecessor
  fanning out to several dependents) is **out of scope for the model** — except note that a single
  predecessor MAY have more than one Step point at it only if the founder decides fan-out is allowed
  (see Open Question 4d; the safe default is one-predecessor / one-dependent, a pure chain).
- Data model (proposal for the architect, not yet decided): add one optional field to `Step`, e.g.
  `dependsOnStepId?: string`, referencing another Step **within the same Journey** by id. Optional and
  additive, exactly like `milestoneId`/`plannedFor`/`dropped` — a Step with no dependency simply omits
  it and behaves as today. Cycles must be impossible by construction (a Step may never depend on itself
  or on a downstream Step); creation/edit must validate this.

### 2.2 Unlock condition

- `step2` becomes visible/available only when `step1`'s status is **PARTIAL or FULL completion**.
- In current terms (`deriveStepStatus`), that is `step1` status ∈ { `completed`, `partially_completed` }.
  A `not_completed` (let-go) or `unreported` predecessor keeps the dependent **locked**.
- This is a **derived** read, consistent with the codebase's "no stored status" principle: the lock
  state of `step2` is computed from `step1`'s derived status, never persisted as its own flag.

### 2.3 The stacked-card visual (locked state)

- While `step2` is locked, its card is **not shown as a normal separate card**. Instead it sits
  **stacked slightly behind/under the predecessor card** — one card offset above the other, NOT fully
  covered, so the user can clearly see there is another card behind it. The number of cards in the stack
  must be legible (i.e. the user can tell how many Steps are waiting behind `step1`).
- Once `step1` is reported partial or full, `step2` is **promoted to a normal, separate card**, shown
  identically to any regular Step (no longer stacked, no special styling). From that moment it is an
  ordinary actionable Step.
- The stack is a presentation of the dependency, layered on the existing card list; it does not change
  what a card *is* or how it is reported once promoted.

### 2.4 Cross-week rule

The weekly pager (`stepsByWeek`) already groups Steps into calendar weeks aligned to the user's
configured week start (D33). The dependency stack must respect week boundaries:

- If `step1` is in the **current** week and its dependent `step2` is in the **next** week — do **NOT**
  show the dependency stack (no stacking across weeks; each week's page shows only its own Steps).
- In that cross-week case, resolution happens when the next week arrives:
  - If `step1` was **NOT** done during the current week, `step1` **re-appears** in the next week
    (carried forward), and THEN `step1` and `step2` are shown together, stacked, in the next week.
  - If `step1` **WAS** done during the current week, `step2` appears **normally** (a plain card) in
    the next week — no stack, because its predecessor is already satisfied.
- This keeps the stack a within-a-single-week visual only.

### 2.5 Step counting is unchanged

- Dependencies do **not** change the total Step count or any progress math. A locked dependent Step
  is still one of the Journey's Steps for counting purposes.
- The current counters must read identically: `JourneyEngine.journeyProgress` (done non-dropped /
  total non-dropped), `toJourneyView`'s `doneSteps`/`totalSteps`, and `CompletionCard.totalSteps` all
  continue to count a locked Step exactly as they count any other not-yet-done Step. Locking is a
  visibility/availability state, not a scope change (unlike `dropped`, which removes a Step from scope).

### 2.6 Coaching nudge

- In dependency cases, the app should **recommend handling the predecessor early**, so there is enough
  time for the dependent Step(s) and the user does not run out of runway. Example intent: if `step1`
  gates `step2` (and possibly `step3`) and the week/Journey is running short, surface a gentle "clear
  this first so you have time for what follows" prompt.
- This is a nudge toward *action on the blocking Step*, never a penalty and never engagement-for-its-own-sake.
  The exact copy, trigger, and channel (Coach line, Home hint, Weekly Review mention) are for
  content-writer + the architect once the timing signal is decided (see Open Question 4b/4f).

## 3. How it integrates with current code

- **Data model.** One optional additive field on `Step` (proposed `dependsOnStepId`), same pattern as
  `milestoneId`. No migration needed for existing Journeys (absent ⇒ no dependency). References are
  intra-Journey by Step id.
- **Unlock derivation.** A new pure helper (alongside `deriveStepStatus`) computes `isStepLocked(step,
  journey, reasonLog)` = "the Step has a predecessor whose derived status is neither `completed` nor
  `partially_completed`". Kept pure so Home, the Journey detail pager, and any counter read one
  definition and never drift — the same discipline as `deriveStepStatus`.
- **Weekly pager (`stepsByWeek`).** Grouping is unchanged (still by calendar week). The **stack** is a
  rendering concern layered on `weekly.weeks[shownWeek]` in `journey/[id].tsx`: within a single week's
  Step array, a locked dependent is rendered tucked behind its predecessor rather than as its own row.
  The cross-week rule (§2.4) falls out of the existing per-week grouping plus a carry-forward of an
  undone predecessor — note the current `stepsByWeek` does NOT carry an undone Step forward into a
  later week (it places each Step in one week by `plannedFor` or by even spread), so "re-appears in the
  next week" is **new behavior to design** (see Open Question 4f — reschedule/carry-forward).
- **Home (`getWeekSteps` / `getTodaySteps`).** Today these return every non-done, non-dropped Step, so a
  locked dependent would currently show as an ordinary actionable card on Home. The feature must make
  Home honor the lock: a locked Step is either hidden from "Today's focus"/actionable counts or shown in
  the same stacked-behind treatment. The actionable subset (`getTodaySteps`, which drives counts) should
  exclude locked Steps so the user is only ever counted against what they can actually do.
- **Urgency (`urgency.ts`).** Urgency does **not** currently count Steps at all — `remainingRequiredSessions`
  is `config.requiredSessionsPerWeek[journey.rhythm]` minus completed-this-week, a rhythm-based target,
  not a per-week Step tally. So a locked Step does not automatically feed urgency today. The founder's
  nudge implies locked Steps SHOULD influence "is there enough time" — this is a real gap, see Open
  Question 4b. Whatever is decided must not silently change the streak's urgent-miss semantics.
- **Streak (`StreakEngine.ts`).** The streak resets only on an URGENT `StepMissed` (a signal that is
  dormant while `adaptiveCoach` is off). A locked Step must never generate a `StepMissed` — the user
  cannot miss a Step they were never allowed to do. This must be explicit so dependencies never harm a
  streak.
- **Report UI (`StepReportFlow` / `checkInStep` / recovery flow).** A locked Step must not be reportable
  (Open Question 4c): its swipe/⋯ report affordances should be disabled while stacked. Once promoted it
  reports exactly like any Step (Done/Partial/Couldn't, reversal, postpone — all unchanged).
- **Completion (`checkInStep`).** A Journey completes when every non-dropped Step is `done || dropped`.
  A locked dependent Step is non-dropped and not done, so under today's rule it would **block** Journey
  completion until unlocked and done — which is usually correct, but has an important edge (Open
  Question 4i: an unreachable dependent, e.g. its predecessor was let-go, could make a Journey
  permanently uncompletable). This must be resolved before build.
- **Coach-led vs manual creation.** Both paths need to be able to set a dependency: the coach/Planner
  when it emits a `GoalSpec`/plan, and the manual "Build your own" wizard, plus the J1 edit path
  (`updateJourney`). See Open Question 4a for how the dependency is authored.

## 4. Open questions & edge cases (the important section — founder to decide; nothing here is decided)

None of the following is answered by the current spec. They are listed, not guessed. Each becomes a
Decision Log entry once the founder rules on it.

**4a. How is a dependency DEFINED?** Coach-led only (the Planner sets `dependsOnStepId` when it builds
or edits a Journey), a manual control in the "Build your own" wizard, both, or editable after creation
via J1 (`updateJourney`, which today has no dependency-aware field)? Manual authoring needs a UI to pick
"this Step waits for that Step" plus cycle/self-reference validation.

**4b. Does a LOCKED Step count toward the week's required-sessions for URGENCY?** The nudge (§2.6)
implies "yes, the dependent still needs time, so pressure should build". But urgency today is
rhythm-based (a fixed `requiredSessionsPerWeek`), not a Step tally, so there is no existing "count of
Steps this week" for a locked Step to join. Options: (i) leave urgency untouched (locked Steps invisible
to it); (ii) make the nudge a separate, dependency-specific signal that does not touch the streak-driving
urgency math; (iii) move urgency to a Step-count model (larger change, affects the streak). Recommend
(ii) to protect the streak semantics — but the founder decides.

**4c. Can a dependent Step be REPORTED while locked?** Assumed no — its report UI (swipe + ⋯ sheet)
should be disabled while stacked, since reporting on an unreachable Step is meaningless and would
pollute the reason/behavior logs. Confirm, and confirm the disabled affordance is accessible (a clear
"unlocks after '<predecessor>'" hint rather than a dead control).

**4d. Milestone boundaries.** May a dependency cross Milestones (`step1` in Milestone A gates `step2`
in Milestone B), or only within a single Milestone? The model allows either; the product intent
(Milestones are an ordered arc) may already imply order, making an explicit cross-Milestone dependency
redundant or contradictory. Also: is fan-out (one predecessor, several dependents) allowed, or strictly
one-to-one chains?

**4e. Predecessor DELETED / DROPPED / let-go / Journey edited.** If `step1` is spliced out (J1 removes a
pristine Step entirely), the dependent's `dependsOnStepId` becomes a dangling pointer — does `step2`
unlock (treat a missing predecessor as satisfied), stay locked forever, or get its dependency cleared?
If `step1` is `dropped` (kept as history, out of scope), does its dependent unlock (its blocker left
scope) or inherit the drop? If `step1` is reported `not_completed` ("couldn't"/let-go), the unlock
condition (partial/full) is not met, so `step2` stays locked — is that intended, or should a let-go
predecessor also release its dependent? Each of these must have a defined rule; the safe defaults
(clear the dependency when the predecessor is deleted; unlock when the predecessor is dropped) are
proposals only.

**4f. POSTPONE / RESCHEDULE of a predecessor.** If `step1` is postponed or rescheduled to a later week,
does `step2` move with it (to preserve the "predecessor first" ordering), or stay put? The cross-week
rule (§2.4) already needs a "carry an undone predecessor forward" behavior that `stepsByWeek` does not
do today — deciding this also decides whether the dependent tracks the predecessor's schedule.

**4g. FREEZE / RESUME and inactivity-freeze.** While a Journey is `frozen` (manual J3 or
`account_inactivity` J5) nothing is actionable anyway. On resume, the lock state simply re-derives from
the predecessor's current status — confirm no special handling is needed, and that a freeze that spans a
week boundary does not mis-fire the cross-week carry-forward.

**4h. CHAINS (`step1 → step2 → step3`): show only the immediate next as a peek, or the whole chain?**
When `step1` is locked-behind by a two-deep chain, does the stack show just one card peeking behind
(the immediate dependent), or the full depth of the chain so the user sees "3 Steps waiting here"? The
spec says the number of cards in the stack must be clear — clarify whether that means the immediate
dependents only or the transitive chain.

**4i. Completion finality vs. an unreachable dependent.** A Journey completes only when every non-dropped
Step is done. If a dependent Step can become permanently unreachable (e.g. its predecessor was let-go and
never completed, and §4e keeps it locked), the Journey could become **impossible to complete**. Given
completion is FINAL and celebrated (Completion Celebration / D41), we must decide: can a Journey complete
while a dependent Step is still locked/unreachable (auto-drop it? treat locked-and-unreachable as out of
scope?), or must the user resolve the predecessor first? This directly touches the celebration model.

**4j. RTL for the stacked-card visual.** The offset/peek direction must mirror correctly in Hebrew/RTL
(the "behind" card should peek from the RTL-appropriate edge), consistent with the Daily Step Reporting
RTL rules for swipe direction. Include screen-reader semantics: the stack must announce "locked, unlocks
after '<predecessor>'".

**Standard edge-case checklist (per README):** empty/first-run (a Journey with no dependencies behaves
exactly as today); offline (lock is a pure local derivation — no network); permission denied (N/A —
no new permission); completed/frozen/abandoned (see 4g/4i); concurrent actions (reporting a predecessor
Done and its dependent's promotion must be race-safe — the derived read handles this since nothing is
stored); very long/empty predecessor titles in the "unlocks after '<X>'" hint; RTL (4j); form of address
in the nudge copy; deletion/data-loss (4e); error states (dangling pointer — 4e).

## 5. Stage & process

- **Recommended stage: MVP.** It is a natural extension of the existing Step model, additive at the data
  layer, and it strengthens the core "do the right Step now" experience. It should ship AFTER the Daily
  Step Reporting status model (D35/D36, on which the unlock condition depends) is stable.
- **Gates before build:** product-guardian (vision/terminology — confirm this stays "growth before
  engagement" and does not drift toward task-manager framing), then an **architect** plan (data field,
  the pure lock helper, `stepsByWeek`/Home integration, the carry-forward behavior, and the report-UI
  disable). ux-designer owns the stacked-card + RTL treatment (render options, per the design rule).
  security-privacy involvement is minimal (no new data leaves the device — a `dependsOnStepId` is an
  on-device id), but the nudge copy path should be confirmed not to leak Step titles into any outreach
  projection.
- **Not decided until the founder answers §4.** This PRD must not be implemented while §4 is open.
