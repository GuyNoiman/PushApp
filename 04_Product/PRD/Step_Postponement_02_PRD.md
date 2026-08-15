# PRD — Step Postponement (02): explicit Journey extension on an approved postponement

Status: **Founder-decided 2026-08-14 (the product questions), specification in progress (the contract).**
The founder settled three things, in two passes on the same day: **a Journey always has an end date and is
initially planned for up to two months**; **an approved manual Step postponement may extend that end date,
and the extension is never automatic**; and — the second pass — **there is no hard ceiling on extension.**
A Journey may be extended repeatedly, and may in practice run indefinitely, **provided every extension is an
explicit user action and approval** (§4, §8). **A third pass, same day, closed two more of the original
eight open questions:** §14 Q4 (nothing happens on a Journey's last day beyond the existing completion
ceremony) and §14 Q5 (what a manual Pause/Resume freeze, J3, does to the Journey).

**A FOURTH pass, same day, corrected the third and closed three more questions.** The founder rejected the
third pass's framing of Q5 — a freeze is **not** compensated by adding the paused days to the end date. The
operation is a **re-plan of the remainder, anchored at the resume instant**: the restart point becomes the
start point for the rest of the Journey, every unlived Step is recalculated, and the end date moves only as
a *consequence*. The superseded freeze-credit design is preserved in §14 Q5.0.a with the reason it failed
(it left every Step where it was, so a Journey paused on a Sunday and resumed on a Thursday kept Steps
planned for Sundays — a plan that no longer fits the life, just with a later finish). The same pass decided
**§14 Q7** (Allies see a paused/running status tag and nothing about the window — which is **not
expressible** in today's `ProgressSummary` whitelist), **§14 Q8** (an extension is not reversible, so the
confirmation copy must be honest about finality), and **§14 Q9** (the automatic J5 inactivity freeze gets
the same treatment as J3 — the re-plan model moves the consent moment to the *resume*, and `return.tsx`
never auto-resumes, so the moment exists in both cases).

Everything in §5–§11 below is this PRD's proposal for how the approved model is honoured in the model, the
moment, and the copy. **Four questions in §14 remain open and are the founder's to answer** — Q1 (the
extension-moment information line, §7), Q2 (the wizard's 90-day option), Q3 (whether an extension also moves
the Step's planned day) and Q6 (the dependency cascade); Q1–Q3 gate implementation. Q8b (what the completion
card shows) is a design question, not a founder ruling.

**Scope note, flagged rather than acted on.** §14 Q5 has grown from an answer into a full specification of a
second, adjacent feature — **the resume re-plan** — which is about the Journey lifecycle (J3/J5) rather than
about postponement. It is kept here because that is where the question was asked and answered, and splitting
a decision mid-flight would scatter the reasoning. **Recommendation:** once Q1–Q3 are answered and this goes
to build, lift §14 Q5 into its own PRD (working name `Journey_Resume_Replan_PRD.md`) with a pointer left in
its place, so the repository keeps one PRD = one feature (`Repository_Guidelines.md`). Not done now, on
purpose.

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

**Additional grounding for the fourth pass — read on 2026-08-14, not assumed:**
`app/src/core/status/stepHistory.ts` (`stepHasHistory`, `unlivedStepCount` — the cancel/removal rule),
`app/src/core/status/stepStatus.ts` (`deriveStepStatus`, `isTerminalReport` — the reporting rule),
`app/src/core/engines/JourneyEngine.ts` (`activateJourney`'s `rebase` option, `rescheduleStep`,
`deferDependents`, `freezeJourney`, `resumeJourney`, `abandonJourney`),
`app/src/core/types/domain.ts` (`Step`, `Cadence`, `Rhythm`, `ReminderRule.trigger.weekdays`,
`SchedulingPrefs.preferredDays`, `ActiveHours`, `ReasonEntry`, `AccountInactivity`),
`app/src/core/learning/Planner.ts` (`packByBudget`, `packToDeadline`, `normalizedPreferredDays`,
`firstPreferredOnOrAfter`, `nextPreferred`, `atDaypart`, `startOfDay`),
`app/src/core/config/reasons.ts` (the closed reason list + the caring prompt),
`app/src/core/social/SocialGateway.ts` (`ProgressSummary`, `AllyProgress` — the whitelist),
`app/src/state/SocialProvider.tsx` (`publishAll`'s `isRunning` gate and `withdrawProgress`),
`app/src/app/return.tsx` (the inactivity return flow), `app/src/app/journey/[id].tsx` (`onToggleFreeze`).

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

**Reconciliation with §14 Q5 (the resume re-plan), added 2026-08-14 fourth pass — read the two together.**
The ledger above stays exactly as designed, and it records **two** causes, not one:
`'postponement_extension'` (a user-approved extension, §7) and `'resume_replan'` (the window consequence of
rebuilding a Journey's remainder at resume). **It does not become postponement-only.** The full entry shape
and the reasoning are in §14 Q5.5.c; the short version is that deriving the end date from the Step dates
instead — the obvious way to make the window a pure consequence — was **considered and rejected**, because
`deferDependents` already moves `plannedFor` automatically and a Step-derived end would hand it automatic
end-date movement, violating §4's invariant and §10.2 by name. So the end date stays derived from
`effectiveStartAt + durationDays + extendedDays`, and every reason it has ever moved stays in one auditable
list.

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
| **Inactivity freeze (J5)** | **Decided (§14 Q9, 2026-08-14 fourth pass) — re-planned on resume, same path as J3** | The sweep freezes Journeys after a long absence, which cancels the one-shots. On the way back, `return.tsx` **never auto-resumes**: each Journey is picked back up by its own explicit tap, and that tap is the consent moment for the rebuild. So J5 runs the **same** re-plan as J3 — same filter, same snap, same single ledger entry, same event — and the only surviving difference is `freezeReason` provenance. See §14 Q9 for why the earlier "no consent moment" objection dissolves under the re-plan model |
| **Manual freeze then resume (J3)** | **Decided (§14 Q5, 2026-08-14 fourth pass) — RE-PLANNED on resume (supersedes "compensated")** | Resuming rebuilds the remainder from the resume instant: every unreported, undropped, dated Step is shifted by the paused interval and snapped onto the account's preferred days, preserving order, spacing, Milestones, ids, dependencies and content. The Journey's last day moves as a **consequence** and is recorded as one `resume_replan` ledger entry. No new approval sheet, but the Resume control stops being a silent toggle and states its consequence first (§14 Q5.5.d). The earlier **freeze-credit** design — adding the paused days to the end date and leaving every Step where it was — is **superseded and preserved** in §14 Q5.0.a with the reason. **Not yet built**: `Journey.frozenAt` does not exist in the code today (§14 Q5.5.a), and today's resume is a bare toggle with no confirmation |
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
- **The window never leaves the device.** No social payload, no Ally notice, no Support Circle surface, no
  third-party analytics carries a last day, an extension, a rebuild, or the number of days involved. An
  extension is a private plan adjustment; nobody else needs to know a person gave themselves three more days.
- **One narrow exception, decided 2026-08-14 (§14 Q7): the Journey's STATUS.** An Ally may see that a
  Journey is paused or running — and nothing else. Not the window, not that it moved, not the pause reason,
  not the note. **This is not expressible today**: `ProgressSummary` is a strict four-field whitelist
  (`journeyId`, `title`, `progress`, `streak`) with no status field, and `SocialProvider` currently
  *withdraws* a paused Journey's summary entirely rather than tagging it. §14 Q7 specifies exactly what
  widening it would take and records that it needs a security-privacy review first.
- **The pause reason and its free-text note (§14 Q5.4) are G1 on-device-only, forever** — the same footing
  as `ReasonEntry.note`. Never into a `DomainEvent`, a `ProgressSummary`, an `OutreachInsight`, a log line,
  or any sync/analytics path. The rebuild's event may carry the `reasonId` **enum** at most.
- New domain event: **`JourneyExtended`** `{ journeyId, stepId, days, totalExtendedDays, at }` — scalars and
  ids only, emitted on approval, persisted via the existing `onChanged` pattern.
- New domain event for the rebuild: **`JourneyReplanned`** (§14 Q5.6) — scalars and ids only. It replaces
  the superseded `JourneyFreezeCredited`, which was never built.
- Existing `StepPostponed` is unchanged and still carries `postponeCount`. Per-Step date moves inside a
  rebuild reuse the existing `PlanAdapted` event; no new per-Step event is added.

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

**The resume re-plan (§14 Q5) has its own six events and its own success question** — *do people who pause
and resume actually finish?* — specified in §14 Q5.6. They belong to the same instrumentation hand-off and
should be wired in the same pass. The same on-device-only and no-free-text rules apply, and the pause note
is barred from every one of them.

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

Each is a real fork, not a detail. **The ceiling question that used to head this list is now RESOLVED —
see §4 and §8 (D51): there is no cap; consent is the invariant.** Every answer below is recorded **in
place**, next to the options originally considered, so the record shows what was decided against and why,
not just what was chosen.

**Resolution history, so the passes are never confused with each other:**

| Pass | Date | What it closed |
|---|---|---|
| First / second | 2026-08-14 | The decision itself (§4): always an end date; explicit extension only; no ceiling |
| Third | 2026-08-14 | **Q4** (nothing happens on the last day) and **Q5** as a *freeze credit* — **since superseded**. Surfaced **Q9** unanswered |
| **Fourth** | **2026-08-14** | **Q5 rewritten** as a re-plan of the remainder (the third pass's credit model is preserved, marked superseded, in Q5.0.a); **Q7** (Allies see status only); **Q8** (an extension is not reversible); **Q9** (J5 gets the same treatment as J3). Opened **Q8b** (a design question, not a founder one) |

**Still open and the founder's:** Q1, Q2, Q3, Q6. Q1–Q3 gate implementation.

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
4. **[DECIDED, 2026-08-14 third pass] Should reaching the last day do anything at all?** Today nothing
   happens when `endsAt` passes (§3.2). The options this section put in front of the founder were: nothing
   (today's behaviour), a calm "your Journey's window ended, what now?" moment, or a Coach check-in. It
   argued this mattered more, not less, now that there is no cap (§8) — the last day being the only moment
   the product has to invite a person to look at their plan.

   **The founder's answer:**

   > "Nothing needs to happen on the last day. After a Journey ends there is a celebration, and that is
   > enough."

   **What this settles.** The completion ceremony (**I1**, **D42**) is the only end-of-Journey moment this
   product has, and it stays the only one. **No pre-end nudge, no countdown, and no plan-review prompt is
   added.** The two calmer alternatives above were genuinely put forward and are declined, not merely left
   unbuilt — a future revisit is a new founder conversation, not a default the product should drift toward.

   **What this does not unsettle.** §3.2's finding stands exactly as written: `endsAt` is a **label**, not
   an enforced boundary — a Journey completes when its Steps are done, never because a date passed. The
   founder's answer confirms that gap is intentional rather than an oversight: the last day is information
   for the person, and the celebration — not the calendar — is the moment that actually matters.
5. **[DECIDED, 2026-08-14 — FOURTH pass. This answer SUPERSEDES the third pass's "freeze credit" design,
   which is preserved below marked superseded, with the reason it was wrong.] What happens to a Journey
   when it is paused and later resumed?** A Journey frozen for three weeks silently loses three weeks of
   its window today (§9's "Manual freeze then resume (J3)" row was **Unhandled**, same reason as the J5
   row). The third pass answered this as arithmetic on the end date. The founder's fourth-pass correction
   says that framing was wrong, and replaces it.

   **Terminology note for this whole question:** "the plan" below means *the arrangement of a Journey's
   Steps in time*. It is never a synonym for Journey (`09_Product_Philosophy/Product_Terminology.md`).

   ### Q5.0 — The founder's correction (2026-08-14, fourth pass)

   > "I don't see this as compensation. It is simply continuing the plan (the Journey) from the point where
   > we stopped, without changing the Journey's structure. **The restart point becomes the start point for
   > the remaining part of the Journey.** And yes, all the Steps should also be recalculated accordingly.
   > In practice, if the user stopped the plan on a Sunday and restarted it a month later on a Thursday,
   > the remaining part of the Journey has to be **re-planned** — so what is needed here is a rebuild
   > process that essentially keeps the same plan and adapts it to the restart time.
   >
   > Also, at restart we could **ask the user what caused them to stop and whether they have any notes**
   > they want to give before the plan is rebuilt — and then take what they say into account and rebuild it
   > better."

   **So the operation is a RE-PLAN of the remainder, anchored at the resume instant.** The end date moves as
   a *consequence* of the rebuild, never as the operation itself.

   ### Q5.0.a — SUPERSEDED: the "freeze credit" model (third pass, 2026-08-14), and why it was wrong

   **Superseded on 2026-08-14 by Q5.0, same day.** It is kept here in full because the reasoning is still
   load-bearing (repository rule: never destroy meaning, including our own wrong turns — `CLAUDE.md` §3.1),
   and because the argument it makes about *consent* survives the correction even though its *mechanism*
   does not.

   > **The superseded design.** On resume, `resumeJourney` computed the whole days between a new
   > `Journey.frozenAt` and the resume instant and appended a `cause: 'freeze_credit'` entry to §5's
   > append-only extension ledger, so `journeyEndAt` moved out by exactly the paused duration. No approval
   > sheet: the Pause tap was the consent moment. `extendedDays(journey)` summed `freeze_credit` and
   > `postponement_extension` entries alike. Repeated pauses each wrote their own entry; an unresumed
   > freeze credited nothing; a prior extension was never revisited. A new `JourneyFreezeCredited` event
   > `{ journeyId, days, frozenAt, resumedAt, totalExtendedDays }` was proposed.
   >
   > **The consent argument it made, which still stands and is not superseded.** §4's invariant — *"a
   > Journey's end date only ever moves because the user said so"* — is a rule about **consent**, not about
   > which caller may write a field. An extension after a postponement adds time **beyond** the plan the
   > user approved, which is a scope change and needs its own explicit consent (§7's sheet). Restoring the
   > working length of a plan the user already approved adds nothing beyond it, and a Pause tap means "stop
   > the clock." Failing to give the time back would *itself* be the drift the invariant exists to prevent.
   > **That reasoning is carried forward intact into the re-plan model below** — it is why a rebuild at
   > resume needs no *new* approval for the window moving.

   **Why the mechanism was nevertheless wrong, stated plainly because this is the failure the new design
   exists to fix:** adding days to the end date leaves **every Step exactly where it was**. A Journey paused
   on a Sunday and resumed a month later on a Thursday still has its Steps planned for Sundays — dates that
   are now in the past, on a weekday the person did not choose to restart on. The user would get a plan that
   no longer fits their life, just with a later finish. The window would be honest and the plan would be
   fiction. "Give the days back" solved the bookkeeping and left the actual problem untouched.

   **What is therefore rescinded:** the *framing* (compensation), the *operation* (whole-day arithmetic on
   an end date), and the ledger cause name `freeze_credit`. **What survives:** the consent reconciliation
   above, the append-only ledger (§5), the `Journey.frozenAt` field (Q5.5), and the whole-day, DST-safe
   calendar arithmetic (§13).

   ### Q5.1 — What "re-plan the remainder" means precisely

   **The operation.** On resume, the remaining part of the Journey is rebuilt so that it starts at the
   resume instant. Nothing about the Journey's *structure* changes; only *when* its unlived Steps sit.

   **Steps in scope — the unreported, undropped, dated ones, and nothing else:**

   | Step | Moves? | Why |
   |---|---|---|
   | `deriveStepStatus(step, reasonLog) === 'unreported'`, not `dropped`, has a `plannedFor` | **Yes** | This is work still owed. It is the only thing a rebuild may touch |
   | Any Step with a standing terminal report — `completed`, `partially_completed`, `not_completed` | **Never** | A reported Step is history. Moving it would rewrite the append-only record D35/D36 protect |
   | `dropped` | **Never** | Out of scope by definition (`updateJourney` removal, cancel, planner drop). Note `deriveStepStatus` returns `unreported` for a dropped Step, so the `dropped` check is **separate and required** — it is not implied by the status |
   | `plannedFor == null` (every manually-created Journey today) | **No — nothing to move** | The Step carries no date, so there is no date to re-anchor. See Q5.5 for what happens to such a Journey's window |
   | A Step whose report was **reversed** (`lastReportClearedAt`, D36) | **Yes** | It derives back to `unreported`: the user un-reported it, so it is owed work again |

   **Which shared definition, and why it is NOT `stepHasHistory`.** Both predicates already exist, side by
   side in `app/src/core/status/`, and they answer **two different questions**. Nothing new is invented here;
   the only decision is which existing one applies.

   - `stepHasHistory(step, reasonLog)` — *"does this Step carry a record worth preserving if it is
     removed?"* It is the **removal**-scope rule, shared by `updateJourney`'s Step removal, `abandonJourney`
     (D46 cancel) and the cancel confirmation's "N Steps will be removed" count.
   - `deriveStepStatus(step, reasonLog)` — *"does a terminal report stand on this Step?"* It is D35/D36's
     single derivation of the four product statuses, and the authoritative answer to "has this been
     reported."

   **The rebuild must use `deriveStepStatus`.** The two disagree on exactly one case, and it is the common
   one: a Step that was **postponed** (D37) has a non-terminal `reasonLog` row, so `stepHasHistory` is
   `true` while `deriveStepStatus` is still `unreported` — because a postpone is an action, not a status
   (D37 §11.1). Using `stepHasHistory` would pin every postponed Step to its old date, which is precisely
   the work most likely to need moving, and would strand it in the past after a long pause. Using
   `deriveStepStatus` keeps one definition of "already reported" and one definition of "carries history",
   each used for the question it was written for. **This is a finding, not a preference: the two rules are
   not interchangeable, and a reviewer should check by name that the rebuild reads `deriveStepStatus`.**

   **What is preserved, exhaustively — the "same plan, different dates" promise:**

   - **Order.** The relative sequence of the remaining Steps is never changed.
   - **Spacing.** Preserved in *plan days* rather than raw milliseconds — see Q5.2 for why that distinction
     is the whole difficulty.
   - **Milestone structure.** No Milestone is created, merged, renamed, re-ordered or re-scoped, and no
     `Step.milestoneId` is rewritten.
   - **The "why".** `Journey.why`, `title`, `description` and every Dream link are untouched.
   - **Every id.** Step ids, Milestone ids, reminder-rule ids, the Journey id. Nothing is recreated.
   - **The Support Circle.** No Ally is added, removed, re-invited or notified by a rebuild (Q7).
   - **Reminder rules.** Not rewritten (Q5.2 — this is a deliberate limit, and an honest one).
   - **Dependencies.** `dependsOnStepId` links are untouched; a rebuild that preserves order preserves them
     by construction.
   - **Content.** No title, description, `estimatedDuration`, `difficulty` or `constraints` is edited. A
     rebuild changes **`plannedFor` and nothing else**.
   - **`durationDays`.** Still "what we planned" (§5). A rebuild never writes it.

   ### Q5.2 — Rhythm re-anchoring: what can and cannot be re-anchored, honestly

   This is the sharp part, and the model cannot fully express it today. **Verified in code on 2026-08-14,
   not assumed.**

   **What the model actually carries:**

   | Field | What it holds | Weekday meaning? |
   |---|---|---|
   | `Step.plannedFor?: number` | An absolute epoch-ms instant the Planner scheduled the occurrence for | **None.** A weekday is only ever *readable off* it after the fact |
   | `Step.cadence: 'once' \| 'daily' \| 'weekly'` | Documented in `domain.ts` as a "planned pace hint (metadata; Steps are completed once)" | **None.** It is a hint, not a recurrence rule. There is no occurrence entity (deferred, D35 §12.1) |
   | `Journey.rhythm: 'daily' \| 'few-times-week' \| 'weekly'` | The overall pace the user committed to for the Journey | **None.** Coarse pace only — no days, no times, no count |
   | `ReminderRule.trigger.weekdays?: number[]` | Which weekdays a recurring reminder fires on (0=Sun…6=Sat) | **Yes — but this is a REMINDER, not a Step** |
   | `SchedulingPrefs.preferredDays: number[]` | The user's preferred weekdays, account-level | **Yes — account-level, not per Journey** |
   | `ActiveHours.days[7]` | Per-weekday enabled flag + allowed window, account-level (D40) | **Yes — account-level** |

   **`Step` has no weekday field. That is the gap.** A plan's weekday pattern is not stored anywhere; it is
   an *emergent artifact* of the account-level preferences that were in force when the Planner laid the
   dates down (`Planner.packByBudget` / `packToDeadline` walk `firstPreferredOnOrAfter` and `nextPreferred`
   over `normalizedPreferredDays(constraints.preferredDays)`). This is the same known model gap recorded as
   **PC-25** in `PRD_Coverage_Gaps.md`, and it is part of why `weekly-planning.tsx` was archived on
   2026-08-14 — it rendered a weekday per Step by **hashing the Step id**, inventing information the model
   never had.

   **So the honest rule, in three lines:**

   1. **What re-anchors:** the absolute dates (`plannedFor`) of the in-scope Steps, and with them the
      weekday each Step lands on.
   2. **What does not re-anchor:** the user's own standing weekday choices — `ReminderRule.trigger.weekdays`,
      `SchedulingPrefs.preferredDays`, `ActiveHours`. A resume must never silently rewrite a setting the
      user set by hand. Those are the *target* the rebuild snaps onto, not something it edits.
   3. **What the app cannot know, and must not pretend to:** whether "Sunday" was *meaningful* (a class that
      meets on Sundays) or *incidental* (the Journey merely started on a Sunday). Nothing in the model
      records the difference. **The rebuild therefore must not claim to preserve weekday semantics it never
      captured.** It preserves order and spacing measured in plan days, and lands the result on days the
      account says are usable.

   **The recommended rebuild rule — "shift, then snap":**

   ```
   delta        = resumeAt − frozenAt                               (the raw elapsed pause)
   for each in-scope Step, in plannedFor order:
     shifted    = step.plannedFor + delta                           (the uniform floor — see Q5.3)
     snapped    = firstPreferredOnOrAfter(startOfDay(shifted), preferredDays)   at the day-part hour
     snapped    = max(snapped, nextPreferred(previousSnapped))      (order + a strict gap preserved)
     rescheduleStep(journeyId, stepId, snapped)
   ```

   `firstPreferredOnOrAfter`, `nextPreferred`, `startOfDay` and `atDaypart` **already exist** in
   `core/learning/Planner.ts` as local wall-clock helpers built from `Date` components (so DST-safe, per
   §13's existing rule). They should be lifted into a shared pure module rather than duplicated — the
   Planner keeps using them unchanged.

   **Why "snap" and not just "shift":** a uniform shift preserves spacing perfectly and weekday alignment
   not at all. Paused Sunday, resumed Thursday, every Step lands four days later than its old weekday — on
   days the account's Active Hours may have disabled entirely, in which case no reminder can even be
   scheduled for them. The snap costs one pass over the remaining Steps and uses the only weekday
   information the product actually has.

   **What the snap deliberately does not do:** it does not re-derive the plan from scratch, does not
   re-balance minutes against `weeklyAvailabilityMinutes`, does not add, drop, split or resize Steps, and
   does not consult the adaptive `Planner`'s full packing (which is behind the `adaptiveCoach` flag and
   would produce a *different* plan, not the same plan re-anchored). A full re-derivation is the coach-led
   Journey-edit conversation (J1), which stays available and is offered, never substituted (§8).

   **The honest residue, recorded rather than hidden:** after a rebuild, a Journey-level recurring reminder
   still fires on the weekdays the user chose, which may no longer line up with the rebuilt Step days. The
   rebuild must not fix this by rewriting the rule. The mitigation is to *offer* a look at the reminder
   settings from the resume moment (Q5.4) — an offer, never an automatic edit. **A per-Step weekday/due-time
   model would remove this whole class of imprecision, and it does not exist. That is PC-25's gap, and this
   PRD does not close it.**

   ### Q5.3 — Reuse: `activateJourney(id, at, { rebase: true })` is the floor, not the operation

   Built on 2026-08-14 for a Future Journey started early, `JourneyEngine.activateJourney` already shifts
   every dated Step by `at − startsAt` through the existing `rescheduleStep` seam, emitting `PlanAdapted`
   per Step, leaving undated Steps alone and preserving order, spacing, ids and content.

   **Verdict: resume-rebase is a strict SUPERSET of it, not the same operation and not a different one.**
   Four differences, each real:

   | | `activateJourney({ rebase: true })` | Resume re-plan |
   |---|---|---|
   | **Guard** | Journey must resolve to `future` | Journey must be `frozen` |
   | **Scope** | Every dated Step — safe, because a `future` Journey has no history by construction | Only unreported, undropped, dated Steps (Q5.1). A rebuild that moved a reported Step would rewrite history |
   | **Placement** | Uniform delta only | Uniform delta **then** the preferred-day snap (Q5.2) |
   | **The window** | Needs no handling — `effectiveStartAt` reads `activatedAt`, so moving the start moves the end automatically | Must be handled explicitly: `effectiveStartAt` is already fixed and does not move on resume (Q5.5) |

   **Recommendation:** extract the rebase loop out of `activateJourney` into one shared pure function —
   `rebasePlan(steps, { delta, filter, snap })` — and have **both** callers use it. `activateJourney` passes
   no filter and no snap, so its behaviour is byte-identical to today; resume passes the Q5.1 filter and the
   Q5.2 snap. Keep the `rescheduleStep` seam and its per-Step `PlanAdapted` event exactly as they are:
   `PlanAdapted` is already persisted, already consumed by the behaviour model, and already the vocabulary
   for "this Step's date moved." **Do not add a second per-Step event.** Add exactly one Journey-level event
   for the rebuild itself (Q5.6).

   **A uniform shift alone is the acceptable floor** if the snap has to be cut for scope: it is strictly
   better than today (Steps at least land in the future), and it is what already exists. But it does not
   answer the founder's question — "resumed on a Thursday" is precisely the case a uniform shift cannot
   handle — so it should be shipped as the fallback for a Journey with no usable preferred-day signal, not
   as the design.

   **Follow-up, flagged not decided:** `activateJourney`'s early-start rebase has the same weekday blindness
   and would benefit from the same snap. Changing it is a separate decision and is **not** made here.

   ### Q5.4 — The resume conversation: "what made you stop, anything I should know"

   **Status: Approved in principle (the founder proposed it), optional in the flow, copy not decided.**

   **Where it lives — nothing new is invented.** Both halves already exist and are reused as they are:

   - **The moment.** `app/src/app/return.tsx` is already the return flow for an inactivity freeze (J5): it
     offers *Talk to the Coach* / *Choose Journeys to resume* / *Not now*, **never auto-resumes**, and
     resumes one Journey at a time on an explicit tap (`onResume={(id) => core.resumeInactivityJourney(id)}`).
     The reason-and-notes moment is inserted **between that tap and the rebuild**, on the same screen. **No
     new coach flow is created**; if the user wants a conversation, the existing *Talk to the Coach* button
     is the route, unchanged.
   - **The vocabulary and the UI.** The Miss-Recovery reason model already owns this interaction: the closed
     reason list in `core/config/reasons.ts` (`forgot`, `no_time`, `lost_motivation`, `too_hard`,
     `did_partially`, `couldnt`, `not_relevant`, `other`), the caring, never-accusatory prompt
     (`reasonPrompt()` — "Want to tell me what got in the way?", never "Why didn't you do it?"), the
     per-reason `caringCopy` in the user's form of address (D31), and the free-text field that only `other`
     reveals. Reuse the same chips and the same tone.

   **What is asked.** A **subset** of the same closed list — the Journey-level reasons: `no_time`,
   `lost_motivation`, `too_hard`, `not_relevant`, `other`. `did_partially` and `couldnt` are per-occurrence
   and are not offered. **No new reason ids are introduced here.** If the founder wants genuinely
   Journey-level reasons ("I was ill", "I was travelling", "something happened"), that is an addition to
   `core/config/reasons.ts` — config-before-code, one list, and its own small decision. **Open, not assumed.**

   **It is skippable, always.** One tap past it resumes and rebuilds. It never blocks, never gates and is
   never required — the same rule D37 §11.2 sets for a postponement reason.

   **Where the answer is stored, and why not in the reason log.** `ReasonEntry.stepId` is a **required**
   field: the reason log is per-occurrence by construction. A pause reason belongs to the Journey, not to a
   Step. Widening `stepId` to optional would change a shipped, privacy-reviewed type used by status
   derivation, the log cap and the behaviour model. **Recommendation: store it on the Journey**
   (`Journey.pauseReason?: { reasonId: ReasonId; note?: string; at: number }`, replaced on each new pause,
   not accumulated), reusing the reason *vocabulary* without touching the reason log's shape.

   **Privacy — binding.** Anything the user types is free text and sits on exactly the same footing as
   `ReasonEntry.note` (**G1**): **on-device only, forever.** It must never enter a `DomainEvent`, a
   `ProgressSummary`, an `OutreachInsight`, a log line, an analytics signal, or any sync path. It is covered
   by `exportStateJson()` and cascade-deleted with the account. The rebuild's event (Q5.6) carries the
   `reasonId` **enum** at most, never the note. Moving this anywhere needs a fresh security-privacy review.

   **How the answer actually feeds the rebuild — narrow on purpose:**

   - **Approved for this slice:** it is *context*, not an input to the arithmetic. It is (a) shown to the
     coach as opening context **if the user chooses the existing *Talk to the Coach* route**, and (b) used
     to decide which **secondary offer** the resume moment surfaces — `no_time` or `too_hard` surfaces the
     coach-led Journey-edit route (J1) as an equal alternative to a plain rebuild, which §8 already permits
     ("offered, never a redirect, never the primary button, never a gate"). Nothing is auto-applied.
   - **Future Vision, explicitly not decided:** letting the reason drive the rebuild itself — easing pace,
     dropping a Milestone, shrinking Steps. That is the Miss-Recovery **lever** engine applied at Journey
     level, it needs its own reason→lever mapping, and it must not be presented as shipping. The founder's
     "rebuild it better" is the direction; this slice delivers the honest first half of it (rebuild it
     *correctly*) and leaves *better* specified as the next question.

   ### Q5.5 — Consequences for the rest of this PRD

   **a. Is `Journey.frozenAt` still needed?** **Yes — needed more than before, for a different reason.**
   Verified 2026-08-14: `freezeJourney` today only flips `status` and stamps `freezeReason`; neither the
   `Journey` nor the `JourneyFrozen` event records *when*. Under the superseded model `frozenAt` was the
   input to a credit calculation. Under the re-plan model it is **the anchor the remainder is measured
   from**: it yields `delta = resumeAt − frozenAt` (Q5.2) and the conserved remaining span (b below), and it
   is what the resume copy and the metrics (Q5.6) read to say "paused N days". Add
   `Journey.frozenAt: number`, stamped by `freezeJourney`, read and cleared by `resumeJourney`, mirroring
   the existing account-level `AccountInactivity.frozenAt` pattern rather than inventing a new one.

   **b. Is the end date after a rebuild derived or stored?** **Derived from the anchor plus the ledger —
   NOT derived from the Step dates.** This looks like the obvious move and it is a trap, so the reasoning
   is recorded:

   - *Considered and rejected:* `journeyEndAt = end of the last remaining Step's local day`. It is the purest
     expression of "the end date is a consequence." It fails on two counts. First, **`deferDependents`
     already moves `plannedFor` automatically** (+1 week for a slipped predecessor and its chain, no consent
     moment anywhere), so a Step-derived end date would hand automatic end-date movement to a background
     cascade — a direct violation of §4's invariant and of §10.2 by name. Second, **most Journeys today have
     no dated Steps at all** (the manual wizard never sets `plannedFor`; the Planner is behind the
     `adaptiveCoach` flag), so there would be nothing to derive from.
   - *Adopted:* keep §5's shape — `journeyEndAt(journey) = effectiveStartAt + (durationDays + extendedDays) × 1 day`
     — and let the rebuild append **one** ledger entry recording the window's move. The window stays
     computable from persisted state, one function, one truth (§5), and the only thing that may move it
     remains an explicit user action.

   **The number that entry carries.** The remaining span is **conserved**: at the pause, `remainingDays =`
   whole days between `frozenAt` and `journeyEndAt` (floor 0 — a Journey paused after its last day gains
   nothing). At the resume, the new last day is the **later** of `resumeAt + remainingDays` and the last
   rebuilt Step's local day — the snap (Q5.2) can legitimately push the final Step past the conserved span,
   and the window must cover the plan it just produced. `days` is the whole-day difference between the old
   end and the new end, minimum 0. **A Journey with no dated Steps has nothing to rebuild, so only the
   conserved-span term applies** — which is arithmetically the old freeze credit, and for that case it was
   always the right answer.

   **c. Does the extension ledger still have a freeze cause?** **Yes, but renamed and re-meant.** The cause
   is **`resume_replan`**, not `freeze_credit`, and the difference is not cosmetic: the entry no longer
   *is* the operation, it *records the consequence* of one. The ledger therefore records **two** causes, and
   §5's design is extended rather than narrowed:

   ```
   JourneyExtension {
     id: string;
     at: number;              // when the change was made
     days: number;            // whole days the end date moved (>= 0)
     fromEndAt: number;
     toEndAt: number;
     cause: 'postponement_extension' | 'resume_replan';
     stepId?: string;         // postponement_extension only — the occurrence that raised the question
     frozenAt?: number;       // resume_replan only
     resumedAt?: number;      // resume_replan only
     stepsReplanned?: number; // resume_replan only — how many Steps the rebuild moved (count, no ids)
   }
   ```

   **So no: the ledger does not become postponement-only.** The alternative — record nothing at resume and
   derive the window from the plan — is exactly the rejected option in (b), and it breaks on
   `deferDependents`. `extendedDays(journey)` continues to sum **all** entries regardless of cause: both
   answer the one question the ledger exists to answer, *how far is this Journey's last day from the length
   originally planned?* One auditable history of every reason the end date has ever moved (§5's own
   argument: "a mutated scalar knows nothing; a ledger remembers what happened").

   **d. Is a new approval sheet needed at resume?** **No new sheet — but the Resume control must stop being
   a silent toggle.** The consent reconciliation carried forward from Q5.0.a covers the *window* moving. It
   does **not** by itself cover *moving Steps*: D37 §4 is explicit that the app never silently moves a
   commitment to another day, and a rebuild moves several. The resolution is to make the existing resume
   tap an **informed** tap rather than to add a second confirmation:

   - **Journey detail (J3).** Today `onToggleFreeze` calls `core.resumeJourney(journey.id)` **directly, with
     no confirmation of any kind** (verified in `app/src/app/journey/[id].tsx`). That is acceptable for a
     status flip and not acceptable for a rebuild. Resume gains one calm consequence line stating what will
     happen before it commits — the same honesty pattern the cancel sheet already uses (D46), at a much
     lighter weight, and with the same forbidden vocabulary as §7 (no "behind", "late", "missed", no
     counter, no warning icon, no red).
   - **Return screen (J5).** Already an explicit per-Journey choice; the same line rides along there.

   **e. Is a rebuild reversible?** **No** — consistent with Q8 below and with D46. The moves go through
   `rescheduleStep`, `PlanAdapted` is append-only, and there is no undo. The consequence line in (d) must be
   honest about that without dramatizing it.

   **f. What §9's lifecycle table now says.** The J3 row's "compensated on resume" verdict is replaced by
   "re-planned on resume"; the J5 row moves from open to decided (Q9). Everything else in §9 is unchanged:
   an extension and a rebuild both leave the Weekly Review, the week boundary, the completion rule and the
   ceremony untouched.

   ### Q5.6 — Events, metrics and privacy for the rebuild

   **Per-Step:** reuse `PlanAdapted` (`{ journeyId, stepId, plannedFor }`) exactly as `activateJourney` and
   `deferDependents` already do. No new per-Step event.

   **Per-Journey, new — one event, replacing the superseded `JourneyFreezeCredited`:**
   `JourneyReplanned { journeyId, cause: 'resume', frozenAt, resumedAt, pausedDays, stepsReplanned, days, totalExtendedDays }`
   — scalars and ids only (**G1**). It carries **no Step ids, no titles, and never the pause note**. It may
   optionally carry the `reasonId` **enum** from Q5.4; it must never carry its free text.

   **Events to instrument** (for the implementer to wire and qa-engineer to verify — add to §12's table):

   | Event | Properties | Why |
   |---|---|---|
   | `journey_paused` | `journeyId`, `cause: 'manual' \| 'inactivity'`, `daysIntoJourney`, `stepsRemaining` | The denominator: who pauses, and how far in |
   | `journey_resume_reason_shown` | `journeyId` | Did the moment appear at all |
   | `journey_resume_reason_given` | `journeyId`, `reasonId` (enum only), `hadNote` (boolean) | Do people answer, and with what. **Never the note text** |
   | `journey_resume_reason_skipped` | `journeyId` | Skipping must be visibly legitimate, not an error path |
   | `journey_replanned` | `journeyId`, `pausedDays`, `stepsReplanned`, `stepsSnapped`, `endMovedDays` | Did the rebuild do real work, and how much did the snap change over a plain shift |
   | `journey_completed_after_pause` | `journeyId`, `pauseCount`, `totalPausedDays`, `daysPastPlannedEnd` | **The signal that matters.** Do people who pause and resume actually finish? |

   **The success question, stated as a growth question and not an engagement one:** a rebuild is worth
   building only if **resumed Journeys get finished**. The comparison is completion rate of
   paused-then-resumed Journeys against never-paused ones, and — the sharper one — resumed-with-rebuild
   against the pre-rebuild baseline of resumed-with-stale-dates. A rebuild that makes people re-open the app
   without making them finish is a failure by this product's own standard (`CLAUDE.md` §3.4). If resumed
   Journeys reliably do not complete, the honest response is an earlier route to the coach-led Journey-edit
   conversation, never a restriction on pausing. All on-device only; there is no analytics pipeline today.

   ### Q5.7 — Edge cases specific to the rebuild (extends §13, does not replace it)

   | Case | Behaviour |
   |---|---|
   | **Paused and resumed within the same local day** | `delta` is under a day and the snap finds today; effectively a no-op. `days = 0`, and **no ledger entry is written at all** when nothing moved and the window did not change |
   | **A Journey with no dated Steps** (every manual Journey today) | Nothing to rebuild. Only the conserved-span window move applies (Q5.5.b), `stepsReplanned = 0`. The resume consequence line must not promise a re-plan that will not happen |
   | **The Journey was paused past its own last day** | `remainingDays` floors at 0; the rebuilt Steps still land on real future days, and the window is extended to cover them. A Journey never resumes into an already-closed window |
   | **A pause spanning a DST change or a time-zone move** | All arithmetic is local wall-clock via `Date` components (`startOfDay`, `addDays`, `atDaypart`), never fixed milliseconds — §13's existing rule, unchanged |
   | **Active Hours disable every preferred day** | `normalizedPreferredDays` already falls back to all seven days when the preference is empty; if a *snap target* is unusable the rebuild falls back to the uniform shift for that Step rather than failing. A rebuild must never leave a Step undated |
   | **Dependency chains** | Order is preserved and the strict-gap rule keeps successors after predecessors, so `dependsOnStepId` stays satisfiable. `deferDependents` is **not** invoked by a rebuild |
   | **Resume interrupted / crash mid-rebuild** | The status flip, the Step moves and the ledger entry commit in **one persistence pass**, exactly as §7 requires for the extension. A crash never leaves a Journey `active` with half its plan in the past |
   | **Double tap on Resume** | `resumeJourney` already bails unless the Journey is `frozen`, so the second call is a no-op — one transition, one rebuild, one ledger entry |
   | **Repeated pause/resume cycles** | Each is its own rebuild and its own `resume_replan` entry (append-only). No cap, no decay, no diminishing return — §8's "no memory held against the user" applies unchanged |
   | **Completed / abandoned / deleted while frozen** | No rebuild ever runs; nothing is owed. Existing ledger entries stay as history |
   | **RTL / form of address** | The resume line and the reason chips reuse the existing `journey` namespace patterns; Hebrew is gender-aware (D31) with both forms authored, no masculine fallback |
6. **Does the `deferDependents` +1-week cascade get the same question?** It automatically moves dated work
   and can push it past the last day with no warning today. Out of scope for this slice by recommendation.
   **This question is sharper after Q5, not weaker:** `deferDependents` is an automatic movement with no
   consent moment behind it at all — no Pause tap, no user action of any kind — which puts it closer to J5
   than to J3. When it is picked up, Q5's reconciliation is the lens to apply first: ask what consent
   moment, if any, already exists before deciding whether compensation, an approval sheet, or something
   else is the right shape.
7. **[DECIDED, 2026-08-14 fourth pass] Does anyone else ever see it? — Allies see the STATUS, never the
   window.** The section originally recommended "no, nothing at all". The founder's answer narrows it
   rather than reversing it:

   > Allies "should see a tag of the Journey's status (changed to paused or resumed), but for now there is
   > no display beyond that."

   **What this settles:** an Ally may see that a Journey is **paused** or **running**. An Ally sees
   **nothing** about the window — not the last day, not that it moved, not by how much, not that a
   postponement extension happened, not that a rebuild ran, not the pause reason or note. §11's rule
   ("nothing leaves the device… no Ally notice") is therefore **correct for the window and now wrong for
   the status**, and §11 must be amended to say exactly that.

   **The real finding: a status tag is NOT expressible today, and today's behaviour is the opposite of what
   was asked for.** Verified in code on 2026-08-14:

   - `ProgressSummary` (`app/src/core/social/SocialGateway.ts`) is a **strict four-field whitelist** —
     `journeyId`, `title`, `progress`, `streak` — carrying **no status field at all**. Its own doc comment
     is explicit: *"Never add a … field here without a fresh security-privacy review."* `AllyProgress` (the
     read side) adds `owner`, `updatedAt` and `visibility`, and likewise carries no status.
   - Worse, `SocialProvider.publishAll` gates on the **positive** `isRunning(journey)` predicate and, for
     anything else, calls `withdrawProgress(journeyId)` + `publishCompanionSteps(journeyId, [])`. **So a
     paused Journey does not read as paused to an Ally today — it silently disappears from their view and
     reappears on resume.** That allowlist is deliberate ("keeps every future lifecycle state private by
     default instead of letting it leak through a negation nobody remembered to update"), so changing it is
     changing a considered architectural stance, not fixing an oversight.

   **What it would actually take** (specified, not built — this needs security-privacy before any code):

   1. **One new whitelist field, narrowly projected:** `ProgressSummary.status: 'active' | 'paused'` — a
      two-value projection, **never `JourneyStatus` itself**. Publishing the raw status would leak
      `completed` and `abandoned`, and a canceled Journey becoming visible to an Ally is a real harm the
      current withdraw-everything rule prevents today. `completed`, `abandoned` and `future` keep being
      **withdrawn**, exactly as now.
   2. **Change the publish gate from `isRunning` to a two-branch rule:** `active` → publish with
      `status: 'active'`; `frozen` → publish with `status: 'paused'` and the **last known** progress/streak,
      **not** refreshed values; anything else → withdraw as today. The allowlist property must be preserved
      — any future lifecycle state falls through to withdraw.
   3. **`AllyProgress` mirrors the field** so the Ally-side surface can render the tag.
   4. **Copy rule, binding:** the tag is neutral and factual — "Paused" — with none of §7's forbidden
      vocabulary. A paused Journey is not a failing one, and an Ally must never be shown anything that reads
      as a report card on their friend.

   **Categorization:** the founder's rule is **Approved**; the mechanism above is **Proposed, pending a
   security-privacy review** (it widens a whitelist that exists precisely to be hard to widen). Until that
   review happens, the honest statement is: **PushApp cannot show an Ally a paused tag today, and it
   currently shows them nothing at all.**
8. **[DECIDED, 2026-08-14 fourth pass] An extension is NOT reversible.** The section recommended "not
   reversible in this slice"; the founder confirmed it, and gave the reason:

   > "the Step is the thing that was postponed and therefore the Journey was extended, so this action cannot
   > really be undone."

   **Why the reasoning matters more than the ruling.** The extension is not a standalone setting that could
   be toggled back — it is the *consequence* of a real event that already happened: the Step moved, and the
   Journey's window followed it. "Undoing" the extension would leave the postponed Step stranded outside the
   window again, which is the exact failure §3 says this feature exists to fix. There is nothing coherent to
   undo. Same stance as **D46** (cancel is irreversible) and consistent with the append-only ledger (§5) and
   with the resume rebuild (Q5.5.e), which is likewise not reversible.

   **The consequence that binds the copy: the §7 sheet must be honest about finality.** This is a genuine
   tension with §7's framing rule (an extension is never a penalty, never a warning), and it is resolved by
   *stating a fact*, not by issuing a caution:

   - **Do:** one calm sentence that the new date becomes the Journey's last day and that this is not undone.
     Plain, past-tense-free, no hedging.
   - **Do not:** a warning icon, red, an "Are you sure?", a confirm-the-confirm, or any of §7's forbidden
     vocabulary. Finality is information, not a threat.
   - The exact wording is content-writer's, in `en` + `he`, gender-aware (D31), and should sit closer to
     D46's cancel-sheet honesty than to any alert pattern.

   **Still open, and separated out so it is not read as decided:** what the **completion card** shows. The
   recommendation stands — it keeps snapshotting the **planned** `durationDays` (§5) — and whether it should
   *also* say "finished in N days" is a design question for ux-designer plus content-writer, not a founder
   ruling. Tracked as **Q8b**.
9. **[RESOLVED, 2026-08-14 fourth pass — by the re-plan model, not by a separate ruling] Does the automatic
   J5 inactivity freeze get the same treatment as J3? — YES, and cleanly.**

   **Why it was genuinely open under the superseded model.** The third pass justified J3's freeze credit on
   the **Pause tap** being the consent moment. J5 has no Pause tap: `InactivityEngine` freezes Journeys
   automatically after 21 days of absence (`config/inactivityPolicy.ts`, `Account_Inactivity_Freeze_PRD.md`)
   with no user action at all. Under a model where **the operation is "move the end date"**, extending J5
   would have moved a date with zero human action anywhere in the sequence — landing squarely on §4's
   invariant. That is why it was surfaced and left unanswered rather than assumed. The question was real;
   it was only unanswerable because the operation was defined at the wrong layer.

   **Why the re-plan model dissolves it.** Under Q5.0 the operation is no longer "move the end date" — it is
   **rebuild the remainder at the resume instant**, and the window follows. The consent moment therefore
   moves too: it is no longer the *freeze*, it is the **resume**. And a resume is an explicit user action in
   **both** J3 and J5:

   - **J3** — the user taps Resume on the Journey detail.
   - **J5** — `return.tsx` **never auto-resumes anything**. It offers *Talk to the Coach* / *Choose Journeys
     to resume* / *Not now*, and each Journey is resumed by its own tap
     (`onResume={(id) => core.resumeInactivityJourney(id)}`), with *Keep it paused* and *Cancel it* as equal
     alternatives on the same row. **Nothing about a J5 freeze is automatic on the way out.** Verified in
     code on 2026-08-14.

   So the two cases are the same case. Where the freeze *came from* stops mattering, because nothing happens
   to the plan until the person says "pick this one back up." The rebuild is surfaced and consented at
   exactly the point where the user is already deciding whether the Journey still fits their life — which is
   a **better** consent moment than J3's, not a weaker one, since `return.tsx` is a considered screen rather
   than a toggle.

   **Reading (a) of this question — "it compensates like any freeze, because the clock stopped either way" —
   is therefore neither adopted nor rejected on its own terms: it is moot.** Nothing is compensated. Reading
   (b) — "the return flow is the consent moment" — is what is adopted, and the re-plan model is what makes
   it structurally true rather than a nicety bolted onto the return screen.

   **What this means concretely:** one code path, not two. J3 and J5 resume through the same rebuild
   (Q5.1–Q5.3), the same optional reason-and-notes moment (Q5.4, already sited on `return.tsx`), the same
   single `resume_replan` ledger entry (Q5.5.c) and the same `JourneyReplanned` event (Q5.6). The only
   difference that survives is provenance: `Journey.freezeReason` stays `'manual'` vs
   `'account_inactivity'`, which is what the return screen already buckets by, and the metrics keep the
   `cause` split so the two populations can be compared.

   **What is NOT decided by this.** A J5 freeze that the user never returns to still rebuilds nothing (there
   is no resume), and this says nothing about the 21-day threshold, the return screen's own copy, or whether
   an inactivity freeze should exist at all — those remain `Account_Inactivity_Freeze_PRD.md`'s.
10. **[NEW, opened by Q8 — not a founder question yet] Q8b — should the completion card show real elapsed
    time alongside the planned duration?** `completionCard.durationDays` snapshots the **planned** length
    and continues to (§5). Whether the card should also say "finished in N days" — honestly and without any
    comparison framing — is a design question for ux-designer plus content-writer. Recommended default: keep
    the planned duration only until there is a reason to change it, because the moment belongs to the
    achievement and not to the calendar.

## 15. Out of scope

- Any automatic extension, from any caller, ever (that is the decision, not an omission).
- A free date picker in the postpone flow (it would widen §3.4's bounded reach and needs its own spec).
- Shortening a Journey, or any other Journey-window edit — that stays with the Coach's Journey-edit flow (J1).
- The repeated-postponement Coach intervention, still deferred by D37 §5 pending `featureFlags.intervention`.
- Weekly Review behaviour of any kind (D40/D43 own it, and it is unaffected).
- A true recurrence/occurrence entity, still deferred by D35 §12.1.
- **A full re-derivation of a Journey's plan at resume** — re-balancing minutes against availability, or
  adding, dropping, splitting or resizing Steps. The resume rebuild (§14 Q5) re-anchors the *same* plan; a
  different plan is the coach-led Journey-edit conversation (J1), which stays available and is offered,
  never substituted (§8).
- **A per-Step weekday or due-time model.** It does not exist (§14 Q5.2), it bounds how faithfully any
  rebuild can re-anchor a rhythm, and closing it is PC-25's job, not this PRD's.
- **Widening the Ally payload.** §14 Q7 specifies what a status tag would require; building it needs a
  security-privacy review first and is not authorised by this PRD.

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

**For the resume re-plan (§14 Q5), acceptance must additionally prove:** a Journey paused on a Sunday and
resumed on a Thursday has **no remaining Step still planned for a past date**, and its remaining Steps land
on days the account's preferences actually allow; a Step carrying a standing terminal report is **never**
moved, and a merely-postponed Step **is** (the `deriveStepStatus`-not-`stepHasHistory` distinction, tested
by name); a `dropped` Step is never moved even though it derives as `unreported`; order, spacing, Milestone
membership, dependency links, ids and every content field are identical before and after; a Journey with no
dated Steps rebuilds nothing and says nothing untrue; exactly **one** ledger entry and **one**
`JourneyReplanned` event are written per resume, in the same persistence pass as the status flip; a J5
resume from `return.tsx` and a J3 resume from the Journey detail produce **byte-identical** rebuild
behaviour; no reminder rule's `weekdays` is rewritten by a rebuild; and the pause note never appears in any
event, summary or log.

## 17. Categorization

- **Approved (D51):** a Journey always has an end date; the two-month window is planning guidance, not a
  cap; a postponement may extend the end date only through an explicit user action and approval; there is
  **no ceiling** on how often or how far a user may extend; and no automatic extension from any caller,
  ever. Same stance as D46 — inform the choice, respect the decision.
- **Approved (2026-08-14, third pass — see §14 Q4):** nothing new happens on a Journey's last day beyond the
  existing completion ceremony (I1/D42).
- **Approved (2026-08-14, fourth pass — see §14 Q5/Q7/Q8/Q9):** resuming a paused Journey **re-plans its
  remainder** from the resume instant rather than compensating its end date — the restart point becomes the
  start point for the rest of the Journey, every unlived Step is recalculated, the Journey's structure is
  unchanged, and the end date moves only as a consequence; the same treatment applies to the automatic J5
  inactivity freeze, because `return.tsx` never auto-resumes and the resume tap is the consent moment; an
  Ally sees a **paused/running status tag and nothing about the window**; and an **extension is not
  reversible**, so its confirmation copy must be honest about finality.
- **Superseded (2026-08-14, third pass → fourth pass):** the **freeze-credit** model — adding the paused
  duration to the end date via a `freeze_credit` ledger entry. Preserved in full in §14 Q5.0.a with the
  reason it failed and the part of its reasoning that survives. Its proposed `JourneyFreezeCredited` event
  is withdrawn and was never built.
- **Proposed (this PRD, pending build):** the ledger + derived-helper model (§5), the trigger (§6), the
  two-choice approval moment and its copy direction (§7), the consent mechanisms (§10), the re-plan
  mechanics (§14 Q5.1–Q5.7), the Ally status-tag mechanism (§14 Q7 — **additionally pending a
  security-privacy review**, since it widens a deliberate whitelist), and the metric/event set (§12 + §14
  Q5.6).
- **Open Question:** §14 **Q1** (what is shown at the extension moment), **Q2** (the wizard's 90-day
  option), **Q3** (whether an extension also moves `plannedFor`), **Q6** (the `deferDependents` cascade);
  plus **Q8b** (what the completion card shows — a design question for ux-designer + content-writer, not a
  founder ruling). Also open: whether genuinely Journey-level pause reasons should be added to the closed
  reason list (§14 Q5.4).
- **Future Vision:** extending the same explicit-approval pattern to the dependency cascade (§14 Q6);
  letting the pause reason actually reshape the rebuild rather than only route it (§14 Q5.4); a per-Step
  weekday/due-time model, which would remove the rebuild's weekday imprecision altogether (§14 Q5.2, PC-25);
  and the same preferred-day snap on `activateJourney`'s early-start rebase (§14 Q5.3).
