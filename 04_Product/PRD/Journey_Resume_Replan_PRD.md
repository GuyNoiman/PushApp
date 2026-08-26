# PRD — Journey Resume and Re-plan

Status: **Approved in substance, nothing built.** Every product question below was decided by the
founder (2026-08-14, and the split confirmed 2026-08-25). What remains is engineering, plus the two
questions marked **OPEN** in §9 — both small, and neither blocks a first slice.
Stage: **MVP.** Task **R2**.
Owner: founder + AI product team.

**Where this came from.** It began as one question inside `Step_Postponement_02_PRD.md` (§14 Q5) and
grew into a mechanism with its own scope, its own events and its own success question. The founder
split it out on 2026-08-25: *one PRD, one feature*. The postponement PRD keeps the full reasoning
trail — including the design this one supersedes — and §14 Q5 there now points here. **Nothing was
deleted; this document is the feature, that one is where the argument happened.**

**What it governs.** BOTH ways a Journey comes back: the manual pause and resume (**J3**, the Journey
detail toggle) and the inactivity freeze and return (**J5**, the return screen). They share a code
path today and had no document between them. One mechanism, two entry points.

Related: `Step_Postponement_02_PRD.md` (the ledger, the window, the reason vocabulary),
`Account_Inactivity_Freeze_PRD.md` (J5), `Future_Journey_Management_PRD.md` (the rebase this reuses).

---

## 1. The problem, in one paragraph

A Journey paused on a Sunday and resumed a month later on a Thursday comes back with every Step still
planned for Sundays that have already passed. Today's resume is a bare status flip: the Journey
becomes active again and its plan is fiction. The person is handed a schedule made of dates in the
past, on a weekday they did not choose to restart on, and the app says nothing about it.

## 2. What the operation is

**A re-plan of the remainder, anchored at the resume instant.** The founder, 2026-08-14:

> "The restart point becomes the start point for the remaining part of the Journey. And yes, all the
> Steps should also be recalculated accordingly… what is needed here is a rebuild process that
> essentially keeps the same plan and adapts it to the restart time."

The end date moves as a **consequence** of the rebuild, never as the operation itself. That
distinction is the whole design: an earlier version of this feature added the paused days to the end
date and left every Step where it was, which fixed the bookkeeping and left the actual problem
untouched. That version is preserved, marked superseded, in `Step_Postponement_02_PRD.md` §14 Q5.0.a.

**Nothing about the Journey's structure changes. Only *when* its unlived Steps sit.**

## 3. What moves, and what must never

| Step | Moves? | Why |
|---|---|---|
| `deriveStepStatus(step, reasonLog) === 'unreported'`, not `dropped`, has a `plannedFor` | **Yes** | This is work still owed, and the only thing a rebuild may touch |
| Any Step with a standing terminal report (`completed`, `partially_completed`, `not_completed`) | **Never** | A reported Step is history. Moving it would rewrite the append-only record |
| `dropped` | **Never** | Out of scope by definition. `deriveStepStatus` returns `unreported` for a dropped Step, so this check is **separate and required** |
| `plannedFor == null` | **Nothing to move** | No date to re-anchor. Only the window applies (§6) |
| A Step whose report was **reversed** (`lastReportClearedAt`) | **Yes** | It derives back to `unreported`: it is owed work again |

**Use `deriveStepStatus`, not `stepHasHistory`.** The two predicates sit side by side in
`core/status/` and answer different questions, and they disagree on exactly one case — the common
one. A **postponed** Step has a non-terminal reason row, so `stepHasHistory` is true while
`deriveStepStatus` is still `unreported`. Reading the wrong one would pin every postponed Step to its
old date — precisely the work most likely to need moving — and strand it in the past after a long
pause. **A reviewer should check by name which predicate the rebuild reads.**

**Preserved, exhaustively.** Order · spacing (in plan days) · Milestone structure and every
`milestoneId` · the Journey's `why`, title, description and Dream links · every id (Step, Milestone,
reminder rule, Journey) · the Support Circle, untouched and unnotified · reminder rules · dependency
links · all Step content. **A rebuild writes `plannedFor` and nothing else.**

## 4. How the dates are chosen: shift, then snap

```
delta     = resumeAt − frozenAt
for each in-scope Step, in plannedFor order:
  shifted = step.plannedFor + delta
  snapped = firstPreferredOnOrAfter(startOfDay(shifted), preferredDays)  at the day-part hour
  snapped = max(snapped, nextPreferred(previousSnapped))
  rescheduleStep(journeyId, stepId, snapped)
```

**Why the snap and not just the shift.** A uniform shift preserves spacing perfectly and weekday
alignment not at all: paused Sunday, resumed Thursday, every Step lands four days off its old
weekday — possibly on days the account's Active Hours have disabled entirely, where no reminder can
even be scheduled. The snap costs one pass and uses the only weekday information the product has.

**What the snap deliberately does not do.** It does not re-derive the plan, does not re-balance
minutes against weekly availability, and does not add, drop, split or resize a Step. A full
re-derivation is the coach-led Journey-edit conversation, which is **offered, never substituted**.

### 4.1 The honest limit, stated rather than hidden

**`Step` has no weekday field.** A plan's weekday pattern is not stored anywhere; it is an emergent
artifact of the account-level preferences in force when the Planner laid the dates down. So the app
**cannot know** whether "Sunday" was meaningful (a class that meets on Sundays) or incidental (the
Journey merely started on a Sunday), and this feature must not claim to preserve a semantic it never
captured. It preserves order and spacing, and lands the result on days the account says are usable.

Two consequences follow, and both are accepted:

1. **A Journey-level recurring reminder still fires on the weekdays the user chose**, which may no
   longer line up with the rebuilt Step days. **The rebuild must not fix this by rewriting the rule** —
   a resume may never silently edit a setting somebody set by hand. The mitigation is to *offer* a
   look at the reminder settings from the resume moment. An offer, never an automatic edit.
2. A per-Step weekday model would remove this whole class of imprecision. It does not exist. That is
   gap **PC-25** in `PRD_Coverage_Gaps.md`, and **this PRD does not close it.**

## 5. Reuse: the rebase that already exists is the floor

`JourneyEngine.activateJourney(id, at, { rebase: true })` — built for a Future Journey started early —
already shifts every dated Step by a delta through the `rescheduleStep` seam, emits `PlanAdapted` per
Step, leaves undated Steps alone, and preserves order, spacing, ids and content.

Resume-rebase is a strict **superset** of it. Four differences, each real:

| | `activateJourney({ rebase })` | Resume re-plan |
|---|---|---|
| Guard | Journey resolves to `future` | Journey is `frozen` |
| Scope | Every dated Step (safe: a future Journey has no history) | Only unreported, undropped, dated (§3) |
| Placement | Uniform delta | Uniform delta **then** the preferred-day snap |
| The window | Handled for free — `effectiveStartAt` reads `activatedAt` | Must be handled explicitly (§6) |

**The build recommendation:** extract the rebase loop into one shared pure function
`rebasePlan(steps, { delta, filter, snap })` and have **both** callers use it. `activateJourney`
passes no filter and no snap, so its behaviour stays byte-identical. Keep the `rescheduleStep` seam
and its per-Step `PlanAdapted` event exactly as they are — `PlanAdapted` is already persisted, already
consumed by the behaviour model, and already the vocabulary for "this Step's date moved."
**Do not add a second per-Step event.**

**The acceptable floor if the snap must be cut for scope:** a uniform shift alone. It is strictly
better than today and it already exists. But it does not answer the founder's question — "resumed on
a Thursday" is exactly the case a uniform shift cannot handle — so it ships as the fallback for a
Journey with no usable preferred-day signal, not as the design.

## 6. The window, and the ledger

**The end date is derived from the anchor plus the ledger, NOT from the Step dates.** Deriving it from
the last Step looks like the purest expression of "the end date is a consequence" and it is a trap,
for two reasons worth keeping written down:

- `deferDependents` already moves `plannedFor` automatically, with no consent moment anywhere. A
  Step-derived end date would hand automatic end-date movement to a background cascade.
- Most Journeys today have **no dated Steps at all**, so there would be nothing to derive from.

So the window stays `effectiveStartAt + (durationDays + extendedDays) × 1 day`, and the rebuild
appends **one** ledger entry recording the move.

**The number that entry carries.** The remaining span is **conserved**: at the pause,
`remainingDays` = whole days between `frozenAt` and `journeyEndAt`, floored at 0. At the resume, the
new last day is the **later** of `resumeAt + remainingDays` and the last rebuilt Step's local day —
the snap can legitimately push the final Step past the conserved span, and the window must cover the
plan it just produced. A Journey with no dated Steps has nothing to rebuild, so only the conserved
span applies, which is arithmetically the old freeze credit — and for that case it was always right.

```
JourneyExtension {
  id, at, days, fromEndAt, toEndAt,
  cause: 'postponement_extension' | 'resume_replan',
  stepId?,          // postponement_extension only
  frozenAt?,        // resume_replan only
  resumedAt?,       // resume_replan only
  stepsReplanned?,  // resume_replan only — a count, never ids
}
```

The cause is **`resume_replan`**, not `freeze_credit`, and the rename is not cosmetic: the entry no
longer *is* the operation, it *records the consequence* of one. `extendedDays(journey)` keeps summing
every entry regardless of cause — both answer the one question the ledger exists for.

## 7. What the person sees

**No new approval sheet — but Resume stops being a silent toggle.**

The Pause tap is the consent moment for the *window* moving. It is not, by itself, consent for
*moving Steps*: the product's own rule is that the app never silently moves a commitment to another
day, and a rebuild moves several. The resolution is to make the existing tap an **informed** tap, not
to add a second confirmation.

- **Journey detail (J3).** Today the toggle calls `resumeJourney` directly with no confirmation of
  any kind. Resume gains **one calm consequence line** stating what will happen before it commits.
  Same honesty as the cancel sheet, much lighter weight, and the same forbidden vocabulary: no
  "behind", no "late", no "missed", no counter, no warning icon, no red.
- **Return screen (J5).** Already an explicit per-Journey choice, and it **never auto-resumes**. The
  same line rides along.

**A rebuild is not reversible**, and the line must be honest about that without dramatising it.

### 7.1 The resume conversation — "what made you stop, anything I should know"

Approved in principle (the founder proposed it). **Optional, skippable, never a gate.** One tap past
it resumes and rebuilds.

**Nothing new is invented.** The moment is inserted between the existing resume tap and the rebuild,
on the screen that is already there. The vocabulary and the UI are Miss-Recovery's: the closed reason
list, the caring prompt ("Want to tell me what got in the way?", never "Why didn't you do it?"), the
per-reason copy in the user's form of address, and the free-text field that only `other` reveals. If
somebody wants an actual conversation, the existing *Talk to the Coach* button is the route,
unchanged — **no new coach flow is created.**

**What is asked:** the Journey-level subset — `no_time`, `lost_motivation`, `too_hard`,
`not_relevant`, `other`. `did_partially` and `couldnt` are per-occurrence and are not offered.

**Where the answer is stored, and why not in the reason log.** `ReasonEntry.stepId` is required: that
log is per-occurrence by construction. A pause reason belongs to the Journey. Widening `stepId` to
optional would change a shipped, privacy-reviewed type used by status derivation, the log cap and the
behaviour model. So: `Journey.pauseReason?: { reasonId; note?; at }`, **replaced on each new pause,
not accumulated** — reusing the reason *vocabulary* without touching the reason log's *shape*.

**PRIVACY, BINDING.** Anything typed is free text on exactly the same footing as a miss note: **on
device only, forever.** It must never enter a domain event, a progress summary, an outreach insight,
a log line, an analytics signal, or any sync path. It is covered by the account export and
cascade-deleted with the account. The rebuild's event carries the `reasonId` **enum** at most, never
the note. Moving it anywhere needs a fresh security-privacy review.

**How the answer feeds the rebuild — narrow on purpose.** In this slice it is *context*, not an input
to the arithmetic: shown to the coach as opening context if the user takes the coach route, and used
to choose which **secondary offer** the resume moment surfaces (`no_time` or `too_hard` surfaces the
coach-led Journey-edit route as an equal alternative). Nothing is auto-applied. Letting the reason
drive the rebuild itself — easing pace, dropping a Milestone, shrinking Steps — is **Future Vision,
explicitly not decided**: it is the Miss-Recovery lever engine at Journey level and needs its own
reason→lever mapping. The founder's "rebuild it better" is the direction; this slice delivers the
honest first half of it, *rebuild it correctly*, and leaves *better* specified as the next question.

## 8. Events, metrics, and the success question

**Per-Step:** reuse `PlanAdapted`. No new per-Step event.

**Per-Journey, one new event:**
`JourneyReplanned { journeyId, cause: 'resume', frozenAt, resumedAt, pausedDays, stepsReplanned, days, totalExtendedDays }`
— scalars and ids only. **No Step ids, no titles, never the pause note.** It may optionally carry the
`reasonId` enum.

| Event | Properties |
|---|---|
| `journey_paused` | `journeyId`, `cause: 'manual' \| 'inactivity'`, `daysIntoJourney`, `stepsRemaining` |
| `journey_resume_reason_shown` | `journeyId` |
| `journey_resume_reason_given` | `journeyId`, `reasonId` (enum only), `hadNote` (boolean). **Never the note text** |
| `journey_resume_reason_skipped` | `journeyId` — skipping must be visibly legitimate, not an error path |
| `journey_replanned` | `journeyId`, `pausedDays`, `stepsReplanned`, `stepsSnapped`, `endMovedDays` |
| `journey_completed_after_pause` | `journeyId`, `pauseCount`, `totalPausedDays`, `daysPastPlannedEnd` |

**The success question, and it is a growth question rather than an engagement one:** a rebuild is
worth building only if **resumed Journeys get finished.** The comparison is the completion rate of
paused-then-resumed Journeys against never-paused ones, and — the sharper one — resumed-with-rebuild
against the pre-rebuild baseline of resumed-with-stale-dates. **A rebuild that makes people re-open
the app without making them finish is a failure by this product's own standard.** If resumed Journeys
reliably do not complete, the honest response is an earlier route to the coach-led edit conversation,
never a restriction on pausing. On-device only; there is no analytics pipeline today.

## 9. Open questions

1. **OPEN — genuinely Journey-level reasons.** The list in §7.1 is the per-occurrence vocabulary
   reused. If the founder wants reasons that only make sense for a whole Journey ("I was ill", "I was
   travelling", "something happened"), that is an addition to the one reason config — config before
   code, one list, and its own small decision. **Not assumed either way.**
2. **OPEN — should `activateJourney`'s early-start rebase get the same snap?** It has the same weekday
   blindness. Flagged, deliberately not decided here, because it is a different feature's behaviour.

## 10. Edge cases

| Case | Behaviour |
|---|---|
| Paused and resumed within the same local day | `delta` under a day, the snap finds today: effectively a no-op. **No ledger entry is written at all** when nothing moved |
| A Journey with no dated Steps (every manual Journey today) | Nothing to rebuild; only the conserved-span window move applies, `stepsReplanned = 0`. **The consequence line must not promise a re-plan that will not happen** |
| Paused past its own last day | `remainingDays` floors at 0; rebuilt Steps still land on real future days and the window extends to cover them. A Journey never resumes into a closed window |
| A pause spanning DST or a time-zone move | All arithmetic is local wall-clock via `Date` components, never fixed milliseconds |
| Active Hours disable every preferred day | The empty preference already falls back to all seven days; an unusable snap target falls back to the uniform shift **for that Step**. A rebuild must never leave a Step undated |
| Dependency chains | Order and the strict-gap rule keep successors after predecessors. `deferDependents` is **not** invoked by a rebuild |
| Crash mid-rebuild | The status flip, the Step moves and the ledger entry commit in **one persistence pass**. A crash never leaves a Journey active with half its plan in the past |
| Double tap on Resume | `resumeJourney` already bails unless the Journey is `frozen`: one transition, one rebuild, one entry |
| Repeated pause/resume cycles | Each is its own rebuild and its own entry, append-only. No cap, no decay, no diminishing return — no memory is held against the user |
| Completed / abandoned / deleted while frozen | No rebuild ever runs; nothing is owed. Existing entries stay as history |
| RTL and form of address | The resume line and the reason chips reuse the existing `journey` namespace patterns; Hebrew is gender-aware with both forms authored, never a masculine fallback |

## 11. What exists in the code today, verified 2026-08-27

**Nothing of this feature is built.** Stated field by field so nobody has to re-check:

- `Journey.frozenAt` — **does not exist.** `freezeJourney` flips `status` and stamps `freezeReason`
  and records no time at all. (The `frozenAt` in `domain.ts` belongs to `AccountInactivity`, which is
  the account-level pattern to mirror rather than the thing itself.)
- `resumeJourney` — a bare status flip that clears `freezeReason`. No rebuild, no confirmation.
- `Journey.pauseReason` — does not exist.
- The extension ledger (`JourneyExtension`, `extendedDays`) — **does not exist**; it is specified in
  `Step_Postponement_02_PRD.md` §5 and unbuilt there too. This feature depends on it.
- `rebasePlan` — does not exist. `activateJourney`'s rebase loop is inline and is what it should be
  extracted from.
- `JourneyReplanned` — does not exist.
- `PlanAdapted`, `rescheduleStep`, `deriveStepStatus`, `stepHasHistory`, `firstPreferredOnOrAfter`,
  `nextPreferred`, `startOfDay` — **all exist and are reused unchanged.** The planner helpers should
  be lifted into a shared pure module rather than duplicated.

## 12. Build order

1. `Journey.frozenAt`, stamped by `freezeJourney`, read and cleared by `resumeJourney`. It is the
   anchor everything else measures from, and on its own it changes no behaviour.
2. The extension ledger from `Step_Postponement_02_PRD.md` §5, with both causes.
3. `rebasePlan(steps, { delta, filter, snap })`, with `activateJourney` moved onto it first and
   proved byte-identical.
4. The rebuild wired into `resumeJourney`: filter, shift, snap, one ledger entry, one event, one
   persistence pass.
5. The consequence line on both surfaces (J3 and J5).
6. The optional reason moment (§7.1).

Steps 1–4 are the feature. Step 5 is what makes it honest. Step 6 is what makes it kind.
