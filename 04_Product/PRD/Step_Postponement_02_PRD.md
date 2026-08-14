# PRD — Step Postponement (02): explicit Journey extension on an approved postponement

Status: **Founder-decided 2026-08-14 (the product questions), specification in progress (the contract).**
The founder settled three things, in two passes on the same day: **a Journey always has an end date and is
initially planned for up to two months**; **an approved manual Step postponement may extend that end date,
and the extension is never automatic**; and — the second pass — **there is no hard ceiling on extension.**
A Journey may be extended repeatedly, and may in practice run indefinitely, **provided every extension is an
explicit user action and approval** (§4, §8). Everything in §5–§11 below is this PRD's proposal for how that
is honoured in the model, the moment, and the copy. **Eight questions in §14 remain open and are the
founder's to answer** — the extension-moment information line (§7), the wizard's 90-day option, and whether
an extension also moves the Step's planned day should be answered before implementation starts.
Stage: **MVP.**
Owner: founder + AI product team.

**Continuation of:** `Done/Step_Postponement_PRD.md` (D37) — **immutable**. This file **extends** it and
**rescinds nothing**. Every D37 decision still stands: postpone is an action and not a status (§11.1), a
reason is never required (§11.2), the fixed 2-hour default with the day-crossing shorten rule (§4/§11.6c),
the per-occurrence one-shot reminder (§11.4), a final report clears the pending one-shot (§11.6a), and the
helper-plus-AppCore architecture (§11.6d). What this file adds is the one thing D37 left as a bare warning
line: what happens when a postponement lands **past the Journey's last day**.

**Filename note:** the founder specified this exact filename on 2026-08-14 — the serial goes **before**
`_PRD` (`Step_Postponement_02_PRD.md`), which also matches the name proposed in `PRD_Coverage_Gaps.md` §2
(PC-26). `README.md`'s Done-file protection rule §3 describes a serial *suffix*; the founder's explicit
instruction governs here, and the rule's substance (a NEW file outside `Done/`, same base feature name,
next free two-digit serial, linked to its predecessor) is fully honoured. Serial `_02` was verified free
across the **complete** PRD tree (root, `Done/`, `Backfill/`, `Future/`) on 2026-08-14. There must be only
one file for this continuation; do not create the suffix spelling.

Related PRDs: `Done/Daily_Step_Reporting_PRD.md` (D35/D36 — the four derived statuses and the append-only
history this never rewrites), `Done/Weekly_Review_PRD.md` (D40/D43 — the week boundary, which this does
**not** touch), `Done/Week_Boundary_Preference_PRD.md` (D33 — the one authoritative week start),
`Done/Step_Dependencies_PRD.md` (the `deferDependents` +1-week cascade), `Done/Completion_Celebration_PRD.md`
(D42/I1 — the ceremony this must never delay or imitate), `Backfill/Journey_Lifecycle_Management_PRD.md`
(J1/J2/J3/J5), `Account_Inactivity_Freeze_PRD.md` (J5), `Future_Journey_Management_PRD.md` (§5 — the
effective start this window is anchored on), `Journey_Abandonment_PRD.md` (J2 cancel), and
`../Miss_Recovery_PRD.md`.

Related decisions: **D37** (postponement), **D35/D36/D41** (reporting + completion finality), **D33**
(week boundary), **D40/D43** (Weekly Review applies only on explicit approval, never automatically — the
same consent principle this PRD applies to the Journey window), **D46** (cancel is irreversible), and
**D51** (this decision; `06_Decisions/Decision_Log.md`).

**Grounding — read on 2026-08-14, not assumed:** `app/src/core/AppCore.ts` (`postponeStepReminder`,
`journeyEndsAt`, the postpone-clearing event hooks, `deferDependents`), `app/src/core/util/postpone.ts`
(`resolvePostponeUntil`, `postponeWarnings`, `crosses_journey_end`), `app/src/core/util/reschedule.ts`
(`proposeCandidateTimes`), `app/src/components/journey/RescheduleModal.tsx` (the "Other time" presets),
`app/src/components/journey/RecoveryFlow.tsx`, `app/src/components/journey/postponeResult.ts`,
`app/src/components/home/StepReportFlow.tsx`, `app/src/core/engines/JourneyEngine.ts` (`postponeStep`,
`clearStepPostpone`, `checkInStep`'s completion rule, `freezeJourney`/`resumeJourney`, `abandonJourney`,
`updateJourney`, `deferDependents`), `app/src/core/types/domain.ts` (`Journey.durationDays`, `JourneyStatus`),
`app/src/core/util/journeyStatus.ts` (`effectiveStartAt`, `isRunning`),
`app/src/components/journey/journeyView.ts` (`endsAt`, `stepsByWeek`, `endsInLabel`),
`app/src/core/review/weeklyReview.ts`, `app/src/core/learning/deriveConstraints.ts`,
`app/src/core/learning/Planner.ts`, `app/src/core/celebration/completionCard.ts`,
`app/src/app/journey/new.tsx`, `app/src/i18n/resources/{en,he}/journey.json`.

---

## 1. Purpose

A Journey is a **finite transformation** (`09_Product_Philosophy/Product_Terminology.md`). Finiteness is
not an administrative detail; it is what makes finishing mean anything. A Journey with no last day is not a
Journey, it is a subscription to your own intentions.

And a person whose week fell apart and who moves one Step is **not failing**. Reality is always right. The
product's job at that moment is to make the plan fit the life, not to make the person feel behind.

This PRD holds both truths at once, and the founder's second-pass ruling (§4) says precisely how: **the
invariant is not "a Journey ends within two months" — it is "a Journey's end date only ever moves because
the user said so."** Length is the user's business. Consent is ours. So a postponed Step gets somewhere to
land, the Journey always still has a last day, and the only thing the design absolutely prevents is **drift
without consent**: an end date that moves automatically, silently, or as a side effect of something else.

**What keeps the terminology honest.** A Journey stays finite in *shape*, which is what the term protects:
it always has a defined last day and a defined set of Steps, it completes when its Steps are done, and it
never becomes an open-ended recurring object (the deliberately parked Practice model, D39). "Finite" was
never a promise about the number 60. If real usage later shows Journeys routinely running many months, that
is a signal to look at how we plan them — measured through §12, never enforced by overruling the user.

**Framing rule, binding on every surface this PRD touches:** extending is a *plan adjustment*, never a
penalty, never a warning, never a score. No copy, badge, counter, colour or icon may present an extension
as slipping, as a strike, as an allowance being spent, or as something the user should feel about. The word
"extension" is an engineering word; the user only ever reads about their Journey's **last day**.

## 2. What D37 decided that still stands

Nothing in D37 is reopened. In particular:

- Postpone is **an action, not a status**; the Step stays `unreported` and the history stays append-only.
- A reason is **never** required, and the fast path stays one tap.
- Postpone schedules a **per-occurrence one-shot reminder**; it does not retime the Journey.
- A day-crossing postpone is honest that the original day's commitment will not count as met on schedule.
- The product **does not automatically change the Journey** after a postponement (D37 §6). This PRD is the
  first exception, and it is barely one: the change is made by the user, not by the product.

## 3. Current behaviour (code truth)

**There is no extension mechanism today, of any kind.** This PRD does not modify an existing behaviour; it
specifies something that **does not exist at all**. The founder's own summary is exactly right and was
verified end to end in the postpone paths:

> "The code today postpones only the Step occurrence and the reminder. It does not update the Journey's
> duration or end date."

Confirmed in `AppCore.postponeStepReminder` → `JourneyEngine.postponeStep` → `ReminderEngine.scheduleOneShot`
(plus the pure helpers `core/util/postpone.ts` and `core/util/reschedule.ts`): the entire write set of a
postponement is four per-occurrence Step fields (`postponedUntil`, `postponedAt`, `postponeCount`,
`postponeNotificationId`) and one OS notification. **No path writes `Journey.durationDays`, and no field
anywhere records a moved end date.** The only Journey-level write in the whole postpone flow is none.

**So what happens today when a postponement lands past the last day: the work is silently stranded outside
the Journey's window.** The user sees one passive line ("This lands after your Journey ends."), the
postponement proceeds, and then nothing exists to represent the situation: no state change, no record, no
event, no adjustment, and no way for any later surface to know it happened. The Step sits past the end of a
window that no longer covers it.

Five further findings, all verified, because three of them change what "extend the Journey" can honestly
mean:

**3.1 A postpone moves the reminder, not the work.** `postponeStep` never touches `plannedFor`. So what
"lands past the Journey end" today is the *one-shot reminder instant*, not the Step's scheduled day. This is
deliberate (D37 §4: the app never silently moves a commitment to another day).

**3.2 The end date is display-only, and nothing enforces it.** `Journey.durationDays` feeds
`journeyView.endsAt = effectiveStartAt(journey) + durationDays × 1 day`, read by exactly two surfaces: the
Journeys list label (`endsInLabel` → "ends in 3 wks") and the Journey detail window line. A Journey
**completes when every non-dropped Step is done** (`JourneyEngine.checkInStep`), never because a date
passed. When `endsAt` passes, **nothing happens at all**: no event, no state change, no message; the Journey
keeps running. So the honest description of today's product is not "Journeys can run for ever by
postponement" — it is "the last day is a label, and the Journey already runs until its Steps are done."
That is the deeper gap behind the founder's report, and it is §14 Q4.

**3.3 There are two different end dates in the code, and they disagree.** `journeyView` anchors on
`effectiveStartAt` (activation → intended start → creation), while `AppCore.journeyEndsAt` — the value fed
to the `crosses_journey_end` warning — anchors on `createdAt`:

```ts
// app/src/core/AppCore.ts:2250
private journeyEndsAt(journeyId: string): number | undefined {
  const journey = this.state.journeys.find((j) => j.id === journeyId);
  if (!journey) return undefined;
  return journey.createdAt + journey.durationDays * 24 * 60 * 60 * 1000;
}
```

For a Future Journey created in August and started in September, this end is a month earlier than the one
the user is shown, so the warning fires when it should not. Any extension trigger built on this value would
inherit the bug. **Fixing this by giving both callers one shared helper is part of this work, not a
follow-up.**

**3.4 The trigger is rare today, because the UI cannot reach far.** The fast path is +2h (shortened to stay
inside today). "Pick a time" offers `proposeCandidateTimes` (tomorrow / +2h / this-or-tomorrow evening) plus
`RescheduleModal`'s "Other time" presets, whose furthest option is **+3 days at 09:00**. There is no free
date picker. So a postponement can only land past the Journey end when **the Journey ends within about
three days** — exactly the situation the founder described, and nothing wider. This bounds both the risk and
the size of the build.

**3.5 The shipped 90-day option sits above the two-month planning guidance.** `app/src/app/journey/new.tsx`
offers `DURATION_VALUES = [30, 60, 90]` and defaults to 60. The coach's `Planner` derives duration from the
plan (a frequency-based plan uses a 14-day review window). Since the two-month window is guidance rather
than a cap (§8), this is not a contradiction in the extension path at all; it is only a question about what
the **planning** flow should offer. See §14 Q2.

## 4. The decision (founder, 2026-08-14)

**First pass — the end date and the explicit extension:**

> "There is no need for a Journey without an end date. Every Journey is initially planned for up to two
> months and remains a finite process. If postponing a Step moves work past the end date, the Journey may be
> extended — but only following an explicit user action and approval. The extension is never automatic."

**Second pass — the ceiling question, answered the same day:**

> "It's fine for a Journey to become infinite if the user **actively** extends it. The two-month decision is
> for their benefit, but if they choose to extend, that is their decision and we respect it."

**What this settles, together:**

1. A Journey **always has an end date**. There is no open-ended Journey.
2. The **two-month planning window is guidance, not a cap.** It exists to protect the user from
   over-committing at the moment they plan, which is when over-committing happens.
3. **There is no hard ceiling on extension.** A Journey may be extended repeatedly and may in practice run
   indefinitely.
4. **Every extension is an explicit user action and approval.** No automatic extension from any caller,
   ever. Not from a background job, not as a side effect of another action, not "because it obviously
   needed it".

**The invariant, stated once so nobody has to infer it:** *a Journey's end date only ever moves because the
user said so.* What the design prevents is **drift without consent**, not length. That line is absolute.

**Why this is coherent with how we already work.** It is the same stance the founder took on Journey
cancellation on 2026-08-13 (**D46**): make a heavy action quiet and deliberate, explain the consequence
honestly, and then respect the person's choice instead of fighting it — cancellation is irreversible with no
undo, precisely because the user understood and chose. Extension is the mirror image of the same principle.
The product's job is to **inform** the choice, never to **overrule** it. Read D46 and D51 as one stance.

**Categorization: Approved** — logged as **D51**.

## 5. How an extension is represented in the model (recommendation)

**Recommended: an append-only extension ledger on the Journey, plus one shared pure helper for the end date.
`durationDays` is never rewritten by a postponement.**

```
Journey.extensions?: JourneyExtension[]   // append-only, on-device, absent on every Journey never extended

JourneyExtension {
  id: string;
  at: number;          // when the user approved it (epoch ms)
  days: number;        // whole days added (>= 1)
  stepId: string;      // the occurrence whose postponement raised the question
  fromEndAt: number;   // the effective end before this extension
  toEndAt: number;     // the effective end after it
}
```

New pure helper (framework-free, e.g. in `core/util/journeyStatus.ts` beside `effectiveStartAt`):

```
extendedDays(journey)  = sum of journey.extensions[].days        // 0 when absent
journeyEndAt(journey)  = effectiveStartAt(journey) + (journey.durationDays + extendedDays(journey)) × 1 day
```

`journeyView.endsAt` and `AppCore.journeyEndsAt` both become calls to `journeyEndAt`, which closes the §3.3
drift in the same change.

**Why this shape.**

- **`durationDays` keeps meaning "what we planned".** It is the field the Coach's Journey-edit flow writes
  (`JourneyEdit.durationDays`) and the field the completion card snapshots. Overwriting it on a postpone
  would silently destroy the honest sentence "you planned eight weeks and it took nine", and would make a
  user-approved date change indistinguishable from a coach-proposed replan.
- **Append-only matches the repository's rule** (never destroy meaning) and matches how reports already work.
- **The ledger is how we stay honest about a Journey that has moved.** There is no ceiling to enforce
  (§8), but there is a real question to be able to answer — "how far is this from the plan I approved?" —
  and it is the only way to measure whether extending actually helps people finish (§12). A mutated scalar
  knows nothing; a ledger remembers what happened, which is the same reason reports are append-only.
- **One derived helper removes a whole class of drift.** Today two files compute the end differently. After
  this, every consumer reads one function.

**Rejected alternatives** (kept so the reasoning survives):

- *Mutate `durationDays` (+n).* Cheapest to build, every consumer already reads it, no new field. Rejected
  because it erases the planned length, collides with coach edits, and leaves nothing to count.
- *Store an absolute `endsAt` stamp.* Rejected because it duplicates truth: the window is anchored on
  `effectiveStartAt`, and a manual/early activation rebase (Future Journey Management §9) would have to
  remember to move the stamp too. Derived beats stored here.
- *A single `extendedDays: number` counter.* Simpler than a ledger, but loses which Step and when, so we
  could never answer "did extending help people finish?" (§12) and could never show an honest history.

**Consumer impact — every reader of the Journey window:**

| Consumer | Today | After an extension | Verdict |
|---|---|---|---|
| `journeyView.endsAt` → Journeys list `endsInLabel`, detail window line | `effectiveStartAt + durationDays` | reads `journeyEndAt`; the label moves out by the extended days | Intended, and the only user-visible change |
| `stepsByWeek` (`totalWeeks`, `currentWeek`) | span = `effectiveStartAt → +durationDays` | must use `journeyEndAt`, or an extended week has no page and its Steps clamp into the old final week (`Math.min(totalWeeks-1, …)`) and read as belonging to the wrong week | **Must change with the model, in the same commit** |
| `computeWeekLayout`, the detail week pager, dependency stacks | derived from `stepsByWeek` | follow automatically | No work |
| **Weekly Review** (`core/review/weeklyReview.ts`) | keyed on the D33 **week boundary**; never reads `durationDays` | **unaffected** | An extension moves no week boundary, does not shift the 48-hour approval window, and cannot change which week is reviewed |
| **Reminders** (`ReminderEngine`, `CommunicationScheduler`, J4 rules) | recurring rules run while the Journey is running; the postpone one-shot is an absolute instant | **unaffected** | Reminders are not bounded by the end date, so extending schedules nothing and cancels nothing |
| **Completion** (`checkInStep`) | completes when every non-dropped Step is done | **unaffected** | An extension can never delay, block or trigger the ceremony (D41/D42 untouched); finishing early still finishes |
| `completionCard.durationDays` | snapshots `journey.durationDays` at completion | keeps snapshotting the **planned** duration | Whether the card should also show real elapsed time is §14 Q8 |
| `deriveConstraints.targetDate` (adaptive planner, dormant behind `adaptiveCoach`) | `createdAt + durationDays` | should read `journeyEndAt` for consistency | Low risk and dormant, but fix it in the same pass so a future flag flip is not a surprise |
| `AppCore.journeyEndsAt` (postpone warning) | `createdAt + durationDays` (**wrong anchor, §3.3**) | replaced by `journeyEndAt` | **Bug fix included in this work** |

`plannedFor` is **not** touched by an extension in this slice. The Journey's window moves; the Step stays
where the user's plan put it, exactly as D37 §4 requires. See §14 Q3 — moving it on explicit approval is
defensible and is the likeliest follow-up, but it is not assumed here.

## 6. The exact trigger

An extension is offered **if and only if all of these hold**:

1. The postpone **resolved successfully** (`resolvePostponeUntil` returned an `at`, on either the fast
   2-hour path or an explicitly picked time). A `no_slot_today` or `in_past` failure asks nothing.
2. The Journey's status is **`active`**. A `frozen`, `future`, `completed` or `abandoned` Journey is never
   asked (§9 explains why most of those are unreachable anyway).
3. `at > journeyEndAt(journey)` — that is, `postponeWarnings` produced **`crosses_journey_end`**, computed
   from the corrected shared helper.

Everything else keeps today's behaviour byte for byte. A postpone inside the window, a same-day shortened
default, a `crosses_day` or `crosses_week` move that still lands before the last day: **no question, no
sheet, no mention of the Journey's length.** This is the most important scoping sentence in the document —
the common path must stay one tap.

`crosses_journey_end` can co-occur with `crosses_day` or `crosses_week`; when it does, the extension
question is the one that is asked, and the day/week honesty line rides along inside it (§7).

## 7. The approval moment

**When.** At the moment of the postpone, before it is committed, in the same interaction. Not later, not on
Home, not in the Weekly Review, and never in the background.

**Shape.** One sheet with **two positive choices and one way out**. Both positive choices complete the
postponement, so the postponement is never held hostage by the extension question:

- **Primary — move it and move the last day.** The Step is postponed and the Journey's last day moves to
  cover it.
- **Secondary — move it and leave the last day alone.** The Step is postponed exactly as today. The user
  sees the honest line that this lands after the Journey's last day. Nothing else changes, and the Journey
  is not marked, flagged or penalised in any way.
- **Dismiss / back.** Nothing happens: no postpone, no extension, back to the postpone sheet. Dismissing by
  tapping outside or pressing back is treated as this and never as the secondary choice, because we do not
  infer consent from a gesture.

**What the user is told — proposal, needs the founder's confirmation.** The founder decided the rule (§4);
this piece of copy is not decided, and §14 Q1 keeps it open.

Since we respect the user's choice, the design's remaining job at this moment is to make that choice a
**well-informed** one. The recommendation is deliberately small:

- **Always:** the Journey's current last day, and the new last day if they say yes. Two dates, nothing else.
- **Only once the Journey has already been extended before** (`extensions` is non-empty): **one additional
  neutral fact**, stated as information and never as a verdict — *"You first planned to finish on
  {{originalEnd}}."* On the very first extension this line would just repeat the current last day, so it is
  not shown.
- **Never:** a count ("your 4th extension"), a running total of added days, a remaining allowance, a
  progress bar of drift, a warning icon, red, or the word "again". No badge, pill or marker anywhere else in
  the app (not on the Journey card, not on the detail screen) says a Journey has been extended.

Why one fact and not none: after several extensions a person may genuinely have lost track of how far their
plan has moved, and the original date is exactly the information that helps them decide well. Why not more:
anything cumulative turns into a scoreboard, and a scoreboard of extensions is a scoreboard of a hard
month. **The argument for showing nothing at all is real** — the two dates already tell the user the
Journey is moving, and any extra line risks reading as a raised eyebrow. If the founder prefers silence, the
line is dropped and nothing else in this PRD changes.

**Copy direction** (final wording is content-writer's, in `en` + `he`, gender-aware per D31):

- Title: `This lands after your Journey's last day.`
- Body: `Your Journey is set to finish on {{currentEnd}}. Want to give it until {{newEnd}} so this step still has a place?`
- Optional second line (repeat extensions only): `You first planned to finish on {{originalEnd}}.`
- Primary: `Give it until {{newEnd}}`
- Secondary: `Just move the step`

Forbidden in this sheet and everywhere downstream: "behind", "late", "missed", "slipping", "again",
"extension used", "last chance", any counter, any warning icon, any red. Repeated extension is legitimate.
A person whose life got busy is not failing, and no surface may suggest otherwise.

**Relation to the existing `postpone.warnCrossesJourneyEnd` string** ("This lands after your Journey ends."
/ "זה נופל אחרי שהמסע מסתיים."). It **builds on it, and takes over the triggered case.** Asking is strictly
better than telling, so when the extension question is shown, that passive notice is **not** also shown. The
string is kept and reused for the one case where there is nothing left to ask: the user chose "just move the
step". Its wording stays honest and neutral and must never acquire any of the forbidden vocabulary above.

**How many days.** The extension is **whole days**: the new last day is the end of the local day the
postponed occurrence lands on, i.e. `newEnd = startOfNextLocalDay(at)`, and `days = whole days between the
old end and the new end`, minimum 1. Rationale: `durationDays` is whole-day arithmetic, so extending "by the
exact overflow" would produce a Journey that ends at 14:35 on a Tuesday, which no surface can show honestly.
Rejected: extending by a whole week (too generous for a one-day overflow, and it invites drift).

**Idempotency and races.** The offer is computed from the resolved `at` and evaluated once. Approving twice
(double tap) appends one ledger entry, keyed by the postpone action; a second identical approval within the
same action is a no-op. Approval writes the ledger entry and the postpone in **one persistence pass**, so a
crash can never leave a Journey extended for a postponement that did not happen, or the reverse.

## 8. The two-month window: guidance, not a ceiling (decided)

**Decided by the founder, 2026-08-14, second pass (§4). This section records a decision, not a proposal.**

**There is no hard ceiling on extension.** No `MAX_JOURNEY_DAYS`, no cap on the number of extensions, no cap
on total days, no threshold that blocks the offer. A user who explicitly extends their Journey nine times
has made nine decisions about their own life, and the app respects all nine.

**The two-month window keeps its job, which is a different job.** It is **planning guidance**: it shapes
what the Coach proposes and what the creation flow offers, because the moment a person plans is the moment
they over-commit, and a shorter first plan protects them from designing a Journey they cannot live. Once the
plan is running, the window has done its work. It is not a fence.

**What replaces the ceiling as the safeguard: consent, checked every single time.**

```
canExtend(journey) = resolveJourneyStatus(journey) === 'active'
                     && the user explicitly approved THIS extension
```

That is the whole gate. There is no arithmetic in it, and there is deliberately no memory in it — a Journey
extended before is exactly as extendable as one never extended, because the previous extensions were also
the user's decision and holding them against the person would be the tally this PRD forbids.

**The Coach door stays, as an offer and never as a redirect.** A Journey that keeps needing more room may
genuinely be the wrong plan, and the coach-led Journey-edit flow (J1) is the honest place to reshape it.
That path stays available and may be *offered*, but it is never substituted for the extension the user
asked for, never made the primary button, and never gated in front of it. Informing beats overruling (D46).

**What this does not license.** Nothing here weakens §4's absolute rule. No caller may extend a Journey
without an explicit approval, and "the user extends a lot" is never a reason to start doing it for them.
Unbounded **by consent** is the decision; unbounded **by drift** remains forbidden.

**Consequence for `Journey.durationDays` at planning time:** unchanged by this PRD. Whether the creation
wizard should still offer 90 days when the guidance says up to two months is a planning-flow question, and
it stays open as §14 Q2.

## 9. Interaction with the rest of the lifecycle

Stated plainly as required: **impossible** means the combination cannot occur by construction; **unhandled**
means it can occur and the code currently does something unconsidered.

| Combination | Status | Behaviour |
|---|---|---|
| **Frozen Journey** (manual pause, J3) | **Impossible** | A frozen Journey is not `isRunning`, so it surfaces no actionable Steps to postpone, and `JourneyFrozen` already cancels every pending one-shot and clears the postpone fields. There is no path from a frozen Journey to a postponement, therefore none to an extension |
| **Future Journey** (not started, `future`) | **Impossible** | A Future Journey produces no Steps, no reminders and no reports by design. Its window is anchored on `effectiveStartAt`, so an extension is meaningless before it starts |
| **Inactivity freeze (J5)** | **Impossible while frozen; unhandled before and after** | The sweep freezes Journeys after a long absence, which cancels the one-shots. The unhandled part is the window itself: a Journey frozen for three weeks **loses three weeks of its window**, because `journeyEndAt` is anchored on the start and knows nothing about frozen time. The user returns to a Journey that quietly has less room than they think. That is a real product question, §14 Q5, not something this PRD decides |
| **Manual freeze then resume (J3)** | **Unhandled**, same reason | Same as above |
| **Steps with dependencies / `deferDependents`** | **Unhandled today, and explicitly out of scope for this slice** | Reporting a predecessor "couldn't" (after the existing confirm dialog) shifts the whole dependent chain **+1 week** via `rescheduleStep`. That is an **automatic** move of dated work that can push Steps past the Journey's last day with **no warning of any kind** today. Per D51 it must **not** automatically extend the Journey, and this PRD does not extend it. Whether that cascade should ask the same question is §14 Q6 |
| **Completion ceremony (I1/D42)** | **Handled, by doing nothing** | Completion is Step-driven. An extension cannot delay it, block it, or trigger it. A user who finishes early on an extended Journey completes immediately and normally. `JourneyCompleted` already clears every pending one-shot |
| **Completed Journey** | **Impossible** | Reports lock on a completed Journey (D41) and `postponeStepReminder` bails on a done Step; the ledger freezes with the rest of the record |
| **Abandoned / canceled Journey (J2, D46)** | **Impossible** | Cancel clears the one-shots and drops the unlived Steps. Existing ledger entries stay on the record as history; a canceled Journey is never extended |
| **Deleted Journey** | **Handled** | The ledger lives on the Journey and dies with it, inside the same encrypted `AppState` blob |
| **Weekly Review (C1, D40/D43)** | **Handled, by doing nothing** | The review never reads `durationDays`. It cannot propose, apply or imply an extension. If it ever should, that is a new decision and belongs in the Weekly Review continuation, not here |
| **Coach Journey edit (J1)** | **Handled** | The Coach may still propose a new `durationDays` with explicit approval, exactly as today. Planned length and extensions stay separate numbers; `journeyEndAt` sums them |

## 10. How the end date never moves without consent

Length is the user's call (§8). **Consent is the thing the design actually enforces**, and it is enforced by
construction, not by good intentions:

1. **One Step at a time, one explicit yes each.** No bulk extend, no "extend by a week" button, no
   default-checked option, no remembered preference, no "always do this".
2. **Nothing else in the product may move the end date.** Not the inactivity freeze, not the Weekly Review,
   not `deferDependents`, not the adaptive planner, not the Coach without the standard edit approval. If a
   new caller ever needs to move the window, it needs a new founder decision. This is the one rule a
   code-reviewer should look for by name.
3. **Consent is not inherited.** A previous approval never authorises the next one. Dismissing the sheet is
   not consent, and neither is the secondary "just move the step" choice.
4. **One write path.** The ledger is appended in exactly one place, inside the approval handler, in the same
   persistence pass as the postpone (§7). No engine, scheduler or migration may append to it.
5. **The move is always visible where it matters** — the Journey's last day changes on the Journeys list and
   the detail window line immediately, so an extension can never be something the user did not notice.

And the counterweight, equally binding: **none of this may be shown to the user as a budget.** No "2 of 3
extensions used", no tally, no drift meter. The only place the Journey's history of extensions is ever
surfaced to a person is the single optional fact line in §7, and even that is one date, not a count.

## 11. Data, events and privacy

- The ledger lives on the `Journey` inside the single encrypted `AppState` blob, so it is already covered by
  `exportStateJson()` and cascade-deleted by `resetToFirstRun()` / account deletion (same posture as D37
  §11.5). No new store, no new retention contract.
- The ledger carries **ids, timestamps and day counts only** — no titles, no reasons, no free text (G1).
- **Nothing leaves the device.** No social payload, no Ally notice, no Support Circle surface, no
  third-party analytics. An extension is a private plan adjustment; nobody else needs to know a person gave
  themselves three more days. (§14 Q7 confirms this with the founder.)
- New domain event: **`JourneyExtended`** `{ journeyId, stepId, days, totalExtendedDays, at }` — scalars and
  ids only, emitted on approval, persisted via the existing `onChanged` pattern.
- Existing `StepPostponed` is unchanged and still carries `postponeCount`.

## 12. Success metrics and instrumentation

**The signal that matters is not usage, it is finishing.** Extending is worth shipping only if people who
extend go on to complete their Journey at least as often as people who do not. Since there is no cap (§8),
measurement is the *only* feedback loop this feature has — which makes it more important here than almost
anywhere else in the product. If extended Journeys complete markedly *less* often, the honest response is
not a cap imposed on the user; it is better planning up front (shorter first plans, a Coach that proposes
reshaping sooner) and a clearer route to the Journey-edit conversation.

**Primary success signals**

1. **Completion rate of extended vs non-extended Journeys** (the growth question). Target: extended ≥
   non-extended. A clear gap the other way is a redesign trigger for *planning*, not a reason to block.
2. **Days past planned end at completion**, distribution. A long tail is not a failure by itself, but it is
   the number that tells us whether our two-month planning guidance is realistic.
3. **Extensions per Journey**, distribution. Expect most Journeys at 0. A cluster of high-extension Journeys
   that never complete is the specific pattern to watch: it is drift wearing the costume of commitment, and
   it is a signal that the plan needed a conversation several extensions earlier.
4. **Decline rate.** A healthy feature has real declines. If nearly everyone accepts, check that the
   secondary option reads as a genuine equal choice rather than the "wrong" button.

**Events to instrument** (for the implementer to wire and qa-engineer to verify — ids and scalars only, no
titles, no free text):

| Event | Properties | Why |
|---|---|---|
| `journey_extension_offered` | `journeyId`, `stepId`, `overflowDays`, `plannedDays`, `extendedDaysSoFar`, `remainingCapDays` | The denominator for everything; also shows how often the trigger fires at all |
| `journey_extension_approved` | `journeyId`, `stepId`, `days`, `newTotalDays`, `extensionIndex` | The action itself |
| `journey_extension_declined` | `journeyId`, `stepId`, `overflowDays`, `extendedDaysSoFar` | The counterweight signal |
| `journey_extension_dismissed` | `journeyId`, `stepId` | Dismissal is not a decline; keep them apart |
| `journey_completed_with_extensions` | `journeyId`, `extensionCount`, `extendedDaysTotal`, `daysPastPlannedEnd` | The one that answers signals 1 and 2 |
| `journey_abandoned_with_extensions` | `journeyId`, `extensionCount`, `extendedDaysTotal` | The other half of signal 3: high-extension Journeys that end in cancellation are the drift pattern to catch |

Reuse the existing `StepPostponed` (`postponeCount`) as context; do not duplicate it. All of these are
on-device measurement only until a real analytics decision exists (there is no pipeline today).

## 13. Edge cases (standard checklist, `README.md`)

| Case | Behaviour |
|---|---|
| **Empty / first run** | A Journey with no extensions has no `extensions` field at all and behaves exactly as today. Nothing new renders |
| **Offline** | Fully local: the ledger write, persistence and the one-shot are all on-device, and the OS notification still fires offline. No network path exists |
| **Permission denied** (reminders off) | Unchanged from D37: the postpone succeeds, no notification is scheduled, the honest "reminders are off" line still shows. The extension question is independent of notification permission and is asked (or not) on the same rules |
| **Completed Journey** | Impossible (reports lock, D41). Extension is refused at the engine, not merely hidden in the UI |
| **Frozen Journey** | Impossible (no actionable Steps, one-shots cleared). Refused at the engine as well |
| **Abandoned / canceled** | Impossible; existing ledger entries are kept as history and never rewritten |
| **Future Journey** | Impossible; no Steps exist to postpone |
| **Concurrent actions** | Double-tapping approve appends one entry (idempotent per postpone action). A final report arriving while the sheet is open wins: the Step is reported, the sheet closes, and no extension is written for an occurrence that is no longer pending. Two devices are out of scope until sync exists, same as D37 |
| **Very long / empty input** | The sheet takes no text input at all. The Step title is display-only and already truncated by the existing sheet components |
| **RTL** | The sheet reuses the existing postpone/reschedule layout, which is RTL-verified in structure; dates render through the existing locale-aware formatters. Both dates in the copy are interpolated variables, so Hebrew word order is translator-controlled and never string-concatenated |
| **Form of address (D31)** | The copy is gender-aware in Hebrew like the rest of the `journey` namespace. Question and buttons must be authored in both forms; no masculine fallback |
| **Deletion / data loss** | The ledger rides `AppState`: included in export, cascade-deleted on account deletion, gone with the Journey on delete. A corrupt or non-finite persisted `days` value is treated as 0 by `extendedDays`, so the window degrades to the planned duration rather than rendering an invalid date |
| **Error states** | The extension write is best-effort and non-blocking: if it fails, the **postpone still stands** and the user is told the last day did not change. The reverse (extended but not postponed) is prevented by the single persistence pass |
| **DST / time zones** | `newEnd` uses the existing calendar-arithmetic helpers (`startOfNextLocalDay`), never added milliseconds, so a DST change cannot shift the last day. A device time-zone change moves the displayed last day exactly as it moves every other date in the app today; no special handling in this slice |
| **Week close during the sheet** | Unchanged from D37: the week boundary is independent of the Journey window, and the Weekly Review reads neither the ledger nor `durationDays` |

## 14. Open questions (founder)

Not decided here. Each is a real fork, not a detail. **The ceiling question that used to head this list is
now RESOLVED — see §4 and §8 (D51): there is no cap; consent is the invariant.** Q1–Q3 gate implementation.

1. **What is shown at the extension moment** (§7). Recommended: the two dates always, plus one neutral
   "you first planned to finish on {{originalEnd}}" line on repeat extensions only, and never a count.
   Showing nothing extra is a legitimate alternative and is argued in §7. The founder decided the rule, not
   this copy.
2. **The wizard's 90-day option.** `journey/new.tsx` ships `[30, 60, 90]` while the guidance says up to two
   months. Remove 90, keep it, or leave planning guidance non-binding on the manual wizard? (This is a
   planning-flow question only; it no longer has anything to do with extension.)
3. **Does an approved extension also move the Step's planned day (`plannedFor`)?** This PRD says no, to stay
   inside D37 §4 (no silent moves of a commitment). But an explicitly approved move is not silent, and a
   user who says "give it until the 15th" may well expect the Step to live on the 15th. Recommended default:
   no in this slice, revisit immediately after.
4. **Should reaching the last day do anything at all?** Today nothing happens when `endsAt` passes (§3.2).
   Options: nothing (today), a calm "your Journey's window ended, what now?" moment, or a Coach check-in.
   Any answer is a new spec. Note this matters more now, not less: with no cap, the last day is the only
   moment the product has to invite a person to look at their plan.
5. **Does a freeze extend the window?** A Journey frozen for three weeks silently loses three weeks (manual
   J3 and inactivity J5 alike). Should frozen time be added back? Note that adding it back automatically
   would move an end date **without an explicit approval**, which §4's invariant forbids — so if the answer
   is yes, it needs its own consented moment.
6. **Does the `deferDependents` +1-week cascade get the same question?** It automatically moves dated work
   and can push it past the last day with no warning today. Out of scope for this slice by recommendation.
7. **Does anyone else ever see it?** Recommended: no. Allies and the Support Circle are told nothing about a
   window change. Confirm.
8. **Is an extension reversible, and what does the completion card say?** Recommended: not reversible in this
   slice (consistent with D46's no-undo posture on Journey-level changes), and the card keeps showing the
   **planned** duration. Whether it should also say "finished in N days" is a design question for
   ux-designer plus content-writer.

## 15. Out of scope

- Any automatic extension, from any caller, ever (that is the decision, not an omission).
- A free date picker in the postpone flow (it would widen §3.4's bounded reach and needs its own spec).
- Shortening a Journey, or any other Journey-window edit — that stays with the Coach's Journey-edit flow (J1).
- The repeated-postponement Coach intervention, still deferred by D37 §5 pending `featureFlags.intervention`.
- Weekly Review behaviour of any kind (D40/D43 own it, and it is unaffected).
- A true recurrence/occurrence entity, still deferred by D35 §12.1.

## 16. Acceptance direction

Acceptance must prove: a postponement inside the window is **byte-identical** to today (no sheet, one tap);
the extension question appears **only** on the §6 trigger; **both** answers complete the postponement;
dismissing does neither; approving moves the Journeys-list label, the detail window line **and** the week
pager together (one helper, one truth); the corrected end date no longer misfires for a Future Journey
activated later than it was created (§3.3); no reminder is added, removed or retimed by an extension; the
Weekly Review, the completion rule and the ceremony are provably untouched; a Journey extended many times
before is offered the same choice on the same terms as one never extended (no cap, no threshold, no
throttle); **no code path anywhere moves a Journey's end date without an explicit approval** (the single
most important test in the suite); and English/Hebrew copy exists in both forms of address with no shame
vocabulary anywhere on the path.

## 17. Categorization

- **Approved (D51):** a Journey always has an end date; the two-month window is planning guidance, not a
  cap; a postponement may extend the end date only through an explicit user action and approval; there is
  **no ceiling** on how often or how far a user may extend; and no automatic extension from any caller,
  ever. Same stance as D46 — inform the choice, respect the decision.
- **Proposed (this PRD, pending build):** the ledger + derived-helper model (§5), the trigger (§6), the
  two-choice approval moment and its copy direction (§7), the consent mechanisms (§10), and the
  metric/event set (§12).
- **Open Question:** everything in §14.
- **Future Vision:** making the last day a real product moment (§14 Q4), freeze-aware windows (§14 Q5), and
  extending the same explicit-approval pattern to the dependency cascade (§14 Q6).
