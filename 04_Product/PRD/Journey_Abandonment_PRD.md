# PRD — Journey Abandonment ("Cancel this Journey")

Status: **Founder-specified 2026-08-13.** Two rounds of founder decisions on this PRD, same day: §2
(initial framing, closed) and §12 (a second pass — reversibility and four more questions resolved; see
D46). The mechanics below are grounded in the shipped code. **Two open questions remain** — §12.4 (how
loudly stopping is affirmed, and whether the Support Circle ever gets an owner-initiated note) and §12.6
(whether canceled Journeys ever appear under their Dream) — neither is blocking. ~~Nothing here is a
shipped feature yet.~~ **CORRECTION 2026-08-24: it shipped.** `AppCore.abandonJourney`, the
`CancelJourneySheet` confirmation on the Journey screen, the canceled bucket in Journeys and the
`CanceledPill` are all live; §12.6 answered itself in the build (a canceled Journey DOES appear under
its Dream, labelled). The status line above was written before the build and was never updated.
Stage: **MVP.**
Owner: founder + AI product team.
Source: founder spec, 2026-08-13 — "add to the Journey detail page the option to abandon a Journey,
which deletes the future Steps and moves it to the history list with status canceled."

Related PRDs: `Backfill/Journey_Lifecycle_Management_PRD.md` (§5.1 flagged exactly this gap — `abandoned`
defined but never written), `Done/Step_Dependencies_PRD.md` (the `deferDependents` cascade + fail-open
lock), `Done/Completion_Celebration_PRD.md` (D41 finality, the ceremony this must never imitate),
`Done/Daily_Step_Reporting_PRD.md` (the reporting history this preserves), `Done/Journey_Support_Circle_PRD.md`
(Allies + invites), `Account_Inactivity_Freeze_PRD.md` (J5), `Future_Journey_Management_PRD.md` (Future
Journeys), `Friend_Profile_PRD.md` §4.2 (the explicit warning that an abandoned Journey must never read as
a success), `Backfill/Account_Deletion_and_Data_Export_PRD.md` (export must include canceled Journeys).

Related Decision Log: **D29** (delete/abandon + freeze are in the MVP), **D41** (completion is FINAL),
**D31** (gender-aware form of address), **D2/D40** (Support Circle), **D46** (2026-08-13 — the
cancellation model: irreversible, the History tab rename, Future-Journey delete-only, the
inactivity-return screen also offering cancel; resolves §12.1/§12.2/§12.3/§12.5/§12.7 below). §13's "log
once §12.1 is answered" note is now satisfied by D46.

Grounding — verified against the actual code on 2026-08-13, not assumed:
`app/src/core/types/domain.ts` (`JourneyStatus`), `app/src/core/util/journeyStatus.ts`
(`resolveJourneyStatus` / `isRunning` — the one positive gate), `app/src/core/engines/JourneyEngine.ts`
(`deleteJourney`, `freezeJourney`, `resumeJourney`, `activateJourney`, `updateJourney`'s drop-vs-splice
rule, `deferDependents`), `app/src/core/AppCore.ts` (event→persist/reconcile wiring, postpone one-shot
cancel, `approveWeeklyReview` rebase, `getPendingCompletionCeremony`, `getInactivityReturn`),
`app/src/core/review/weeklyReview.ts` (abandoned already excluded), `app/src/core/engines/StreakEngine.ts`,
`app/src/core/engines/RewardEngine.ts`, `app/src/core/status/stepDependencies.ts` (fail-open),
`app/src/components/journey/journeyView.ts` (`bucketOf`), `app/src/app/(tabs)/journeys.tsx` (three tabs),
`app/src/app/journey/[id].tsx` (the delete row + confirm modal), `app/src/state/SocialProvider.tsx`
(`publishAll`'s `isRunning` allowlist).

---

## 1. Purpose

A Journey is a finite commitment, and sometimes the honest answer is "not this, not now". Life changed,
the plan was wrong, the goal stopped mattering. PushApp's philosophy says reality is always right
(`Product_Philosophy.md`) — so the product must let a person stop **without destroying the evidence that
they showed up**, and without being told they failed.

Today it does not. The only way to remove a Journey is `AppCore.deleteJourney` — a hard splice out of
`AppState.journeys` labelled "Permanently delete/abandon". A user who wants to stop must erase every
check-in they made, every Step they completed, and the whole record of having tried. That is a product
telling someone their effort only counted if they finished. It is also why `abandoned` has sat in
`JourneyStatus` since the beginning and is **written by no code path anywhere in `app/src`** — the
`Journey_Lifecycle_Management` backfill PRD §5.1 flagged this as an unfilled hole. **This feature is what
finally writes it.**

The organizing idea: **abandon removes the Steps that never happened, and keeps the Steps that did.**

### 1.1 Three ways to stop — and when each is right (this must be unambiguous in the product)

| The user means | Action | Status after | What happens to the record |
|---|---|---|---|
| "I want to come back to this." | **Pause** (Freeze, J3) | `frozen` | Everything preserved, reminders muted, fully reversible via Resume. |
| "I'm not continuing — but I did what I did." | **Cancel** (this PRD) | `abandoned` | Unreported Steps removed; every reported Step, check-in, XP and Coin kept; moves to history. |
| "I want this gone from my account." | **Delete** (existing) | Journey removed | Everything about the Journey is erased locally. Irreversible. |

**Both Cancel and Delete continue to exist.** Delete is not replaced and must not be hidden: it is the
right and only answer for a mistaken Journey, a test Journey, a duplicate, or a privacy-motivated erase
("I don't want this on my device at all"). Cancel is the right answer for a real Journey that ended
early. The Journey detail screen will offer both, each labelled for the person it is for (§8.3).

## 2. Decisions already made with the founder (2026-08-13) — recorded, not re-opened

1. **The internal status stays `abandoned`.** It already exists in `JourneyStatus`; no model change to
   the enum, no new state invented. Every existing consumer that already names `abandoned`
   (`isRunning`, `weeklyReview`, `SocialProvider.publishAll`) keeps working unchanged.
2. **The user-facing label is "canceled"** — Hebrew **"מבוטל"**. This is a *status label*, not a new
   product noun; the protected terminology (Dream · Journey · Milestone · Step · Ally · Support Circle ·
   Buddy · XP · Coins · Grace Tokens) is untouched. "Abandoned" is a mechanism word and must never appear
   in user copy — it carries blame in both languages. Neither must "failed", "gave up", "quit", "dropped
   out", or "lost".
3. **A canceled Journey lands in the history list.** The nearest existing surface is the Completed tab;
   §8.1 recommends how to present it there so it can never read as a success.
4. **"Deletes the future Steps"** — defined precisely and unambiguously in §4.

## 3. Feature-proposal checklist (CLAUDE.md §3.5)

- **What problem:** stopping a Journey currently requires destroying its history. There is no honest exit.
- **Why needed:** the exit ramp is part of the transformation loop, not an afterthought. A person who
  cannot stop cleanly either abandons the *app* or keeps a dead Journey on Home, where it becomes a daily
  reminder of a failure that isn't one. Both outcomes cost real-life growth.
- **What it improves:** completes the `status`-driven lifecycle model (`active` · `frozen` · `completed` ·
  `future` are all written; `abandoned` is the one hole), gives the history list a truthful second entry
  type, and stops the hard delete from being the default exit.
- **Complexity added:** one engine transition + one event, one `bucketOf` branch (which today would
  wrongly file a canceled Journey under **Current**), one confirmation surface, and a history
  presentation. No new data model beyond two optional additive fields (§4.4). Small.
- **Fits Product Philosophy:** yes, directly — "Reality Is Always Correct" and "Support Before Pressure"
  (`Product_Philosophy.md`), and the explicit ban on guilt / punishment / shame as motivators
  (`AI_Product_Principles.md`). It is the anti-guilt feature.
- **Stage:** MVP. It is a completion of a lifecycle that already ships half-built.

## 4. THE RULE for "deletes the future Steps"

The founder said "deletes the future Steps". "Future" here means **not yet lived**, not "scheduled for a
future date" — a Step planned for last Tuesday that was never reported is just as unlived as one planned
for next month, and both must go. The rule below is the whole feature's data contract.

### 4.1 The rule, stated once

> On cancel, a Step is **removed** if and only if it has **no history**: it is not `done` and carries no
> reporting record of any kind. Every other Step is **kept and marked `dropped: true`**, with its full
> record intact.

This is deliberately **the exact same drop-vs-splice rule the shipped J1 edit path already uses**
(`JourneyEngine.updateJourney` → `stepHasHistory(step)`): a Step that is `done` or carries
check-in/reason history is marked `dropped: true`; a pristine, never-touched Step is spliced out. Reusing
it means one definition of "this Step happened" across editing and canceling, and no second code path to
drift.

"Has history" is whatever `stepHasHistory` already decides (`step.done`, a check-in, or a `reasonLog`
entry) — this PRD does not redefine it. The implementer must read that helper, not re-derive the test.

### 4.2 Specific cases, spelled out

- **Fully reported Done Step** → kept, `dropped: true`. Its `CheckIn` and `reasonLog` rows are untouched.
- **Partially-reported Step** (`partially_completed`, D36) → **kept**, `dropped: true`. A partial is
  history. It is never spliced. *(This is the case the founder's phrasing left ambiguous; this is the
  answer.)*
- **Step reported "couldn't" / let-go** (`not_completed`) → kept, `dropped: true`. The user reported it;
  that is a real data point about their week and it stays.
- **Step that was postponed** and carries a postpone record → kept, `dropped: true`.
- **Unreported Step in a past week** → removed (spliced). Nothing happened on it.
- **Unreported Step in the current or a future week** → removed (spliced).
- **A Step already marked `dropped` before the cancel** (removed by a J1 edit) → left exactly as it is.
- **Every Step is unreported** (a Journey canceled before any check-in) → all Steps are removed and
  `journey.steps` becomes empty. This is legal and must not crash any renderer (§11).

### 4.3 Step Dependencies interaction (shipped 2026-08-13)

- **`deferDependents` must NOT run on cancel.** That cascade exists to keep a slipped predecessor's chain
  reachable *next week*. There is no next week. The implementer must not reuse the report-flow path here;
  canceling is not "reporting the predecessor not done".
- **A spliced predecessor unlinks its dependents.** After the splice, every remaining Step whose
  `dependsOnStepId` points at a removed Step must have that field cleared — the identical unlink loop
  `updateJourney` already runs after `removeStepIds`. No Step is ever left pointing at a ghost.
- **A kept (dropped) predecessor is already safe.** `isStepLocked` fails **open** for a `dropped`
  predecessor, so a preserved dependent can never be rendered as permanently waiting.
- **Net effect:** after a cancel, no Step in the Journey is locked, waiting, or stacked. A canceled
  Journey's history renders as a flat list of what happened. No waiting-deck UI ever appears in history.

### 4.4 What is preserved (everything else)

`id`, `title`, `why`, `description`, `durationDays`, `rhythm`, `createdAt`, `startsAt`, `activatedAt`,
Milestones, `dreamId` / `secondaryDreamIds`, and every kept Step's id, title, `plannedFor` and history.
Two optional additive fields are written at cancel:

- `abandonedAt?: number` — epoch ms of the transition (the history list sorts and dates by it).
- `stepsAtAbandon?: { done: number; total: number }` — a **snapshot of the Step counts taken BEFORE the
  splice**.

### 4.5 Why the snapshot is not optional — the 100% trap

`toJourneyView` computes `progress = doneSteps / totalSteps` over the **live** `journey.steps` array. If
we splice the unlived Steps and then render the same view model, a Journey where the user did 3 of 12
Steps becomes 3 of 3 — **a canceled Journey would display 100% and a full progress bar.** That is exactly
the failure `Friend_Profile_PRD.md` §4.2 warns about: an abandoned Journey reading as a success. It would
also be a lie to the user about their own history.

Requirement: a canceled Journey's card and detail read **"3 of 12 Steps done"** from `stepsAtAbandon`,
and **show no percentage and no progress bar**. `toJourneyView` must either take the snapshot into
account or the history surfaces must not use its `progress` field at all. This is a hard acceptance
criterion, not a polish item.

### 4.6 Notifications and timers

Before the splice, the implementer must cancel every pending postpone one-shot
(`step.postponeNotificationId`) — the same pre-read `AppCore.deleteJourney` already performs, and for the
same reason: the event carries no Step ids, so the ids must be read while the Steps still exist.
Otherwise a canceled Journey fires a notification about a Step that no longer exists.

## 5. Reversibility — recommendation, NOT a decision (blocks build)

The founder did not say. Both readings are defensible, so this section gives a recommendation with its
reasoning and flags it for his confirmation (§12.1).

**Recommendation: canceling is FINAL, with a short immediate undo.**

1. **"Canceled" reads final in both languages.** A status the user can flip back cheapens the word, and
   the word was the founder's choice.
2. **The reversible pause already exists and is called Pause.** Two reversible stop-states would be a
   product with two identical answers to "I need a break", and users would pick the wrong one. Freeze is
   the temporary stop; cancel is the decision that the pause is permanent.
3. **The Steps are physically gone.** An "un-cancel" would restore a Journey whose unlived plan was
   spliced out — an empty or half-empty shell. Making that useful means *re-planning*, which is a
   different feature (the coach), not a status flip. A one-tap "restore" that silently hands back a
   broken plan is worse than no restore.
4. **Symmetry with D41.** Completion is final. Making the other terminal state final too gives one
   coherent rule: *terminal states are terminal; only Pause is reversible.*
5. **But mistaps are real** and the splice is genuine data loss. So: an **undo affordance immediately
   after the action** — a snackbar/undo on the Journeys screen that survives until the user navigates
   away or ~10 seconds, whichever comes first. Implementation note: undo is only truthful if the splice
   is deferred or the removed Steps are held in memory for the window; the implementer must not offer an
   undo it cannot honor.
6. **The restart path is "start it again", not "un-cancel".** From a canceled Journey the user can start
   a **new** Journey seeded from this one (same title/why, a fresh plan built by the coach). That is
   honest — it is a new commitment — and it keeps the record of the first attempt intact, which is
   exactly the material the coach needs to plan a more realistic second one. **Recommend this as a
   fast-follow, not MVP slice 1** (see §12.5).

### 5.7 Founder decision (2026-08-13) — FINAL, no undo window (closes §12.1, logged as D46)

**Decided: canceling a Journey is IRREVERSIBLE. There is no undo window.** The founder was offered the
short-undo recommendation above (point 5) and **explicitly declined it.** Instead: pressing the action
raises a confirmation that asks the user whether they are sure **and states plainly that the action is
irreversible.** On confirm, it is done and final.

What this means for the reasoning above, item by item — nothing here is deleted, only resolved:
- **Points 1–4 stand as decided.** The founder's answer matches this reasoning exactly: "canceled" reads
  final, Pause is the one reversible stop-state, the spliced Steps make an "un-cancel" a broken shell
  anyway, and finality is symmetric with D41 (completion is final).
- **Point 5 (the snackbar/undo window) is REJECTED, not built.** The founder considered the recommended
  few-second undo and turned it down. The session did not capture his stated reason verbatim, so none is
  invented here — the fact of the rejection is recorded, not a guessed justification. Concretely: no
  undo affordance of any kind, immediate or delayed. §8.4 point 5 (below) and its copy must say the
  action is final, never offer a grace window.
- **Point 6 (restart as a new Journey, seeded from the canceled one) is superseded — see §5.8.** The
  founder did not approve any restart-from-canceled path.

This closes **§12.1**, the one question this PRD had flagged as blocking.

### 5.8 "Start again" — founder decision (2026-08-13) and what it turns out to be (closes §12.5)

The founder's decisions named a **"start again"** affordance and was explicit that it appears **only for
FROZEN Journeys** — meaning there is **no restart-from-canceled path at all.** This supersedes point 6
above and §5.6's recommended fast-follow ("start it again as a new Journey, seeded from a canceled one"):
that idea is not being built, neither now nor as a fast-follow. A canceled Journey's only further action
stays Delete (§7, unchanged).

**Verified against the shipped code, per the founder's own instruction not to assume this is a new
feature to build:** a frozen Journey already has exactly this affordance today —
`JourneyEngine.resumeJourney` (`app/src/core/engines/JourneyEngine.ts`), surfaced on the Journey-detail
screen as **"Resume journey"** / **"חידוש המסע"** (`app/src/app/journey/[id].tsx`, i18n keys
`detail.resume` / `detail.resumeA11y` in `journey.json`), and on the inactivity-return screen as
**"Choose Journeys to resume"** / **"Resume"** / **"חידוש"** (`app/src/app/return.tsx`,
`inactivity.json`). **Finding: "start again" IS that existing Resume affordance, not a distinct one.** No
new UI, no new copy, and no new engine transition are needed to satisfy this part of the founder's
decisions — it is already built and already correctly named in-product. This reading (that "start again"
is the plain-language description of the shipped Resume, not a request for a new mechanism) is recorded
as a finding, not assumed as fact beyond doubt; if it is wrong, that needs to come back as its own
question rather than be silently re-guessed a second time.

This closes **§12.5** — with a different resolution than either option that question originally posed
(not "slice 1," not "fast-follow"): the feature it asked about **is not being built**, because the
existing Resume already covers the one Journey status ("start again") the founder's decisions describe.

## 6. What happens to everything else (the founder's Q2, answered)

| Concern | Behavior | Already handled by shipped code? |
|---|---|---|
| **Reminders** | Stop. `isRunning` is false for `abandoned`, so the scheduler plans nothing. The new `JourneyAbandoned` event **must be added to AppCore's `onReconcile` subscriptions** (alongside `JourneyDeleted`/`JourneyFrozen`) or the already-scheduled notifications keep firing. | Gate: yes. Wiring: **new work.** |
| **Postpone one-shots** | Explicitly cancelled before the splice (§4.6). | Pattern exists in `deleteJourney`; **new call site.** |
| **Home / weekly planning** | The Journey and its Steps disappear from Home, `getTodaySteps`, `getWeekSteps`, `weekly-planning`, and `activeJourneyCount` — all gate positively on `isRunning`. | **Yes, automatic.** |
| **Published progress (Allies)** | Withdrawn. `SocialProvider.publishAll` withdraws the summary and clears Companion Step names for anything not `isRunning`. | **Yes, automatic** (on the next debounced publish). |
| **Pending Ally invitations** | **Recommend closing them** (`closeJourneyInvites`), as delete does — an open invitation to a canceled Journey is misleading. Note the consequence: closing is irreversible for the recipient (`respondToAllyInvite` only accepts a still-`requested` row). That is consistent with cancel being final, and is a further argument for §5. | **New work** (deliberately different from freeze, which keeps invites open). |
| **Accepted Allies** | The `journey_allies` rows are **left alone** — no relationship is severed, nothing is deleted from the other person's account. They simply stop receiving this Journey's progress. | Yes, by not acting. |
| **Telling the Circle** | **Recommend silence by default** — no automatic "X canceled their Journey" notice. Announcing a stop to an audience is the single most shame-inducing thing this feature could do. See §12.4 for the optional owner-initiated note. | New; recommend NOT building the notice. |
| **XP** | **Never revoked.** `RewardEngine` awards XP to the account/Buddy, not to the Journey. Earned is earned. | Yes — just never add a revoke. |
| **Coins** | **Never revoked.** Same reasoning. | Yes. |
| **Streak** | **Never touched.** The streak is an account-level day count that resets only on an URGENT `StepMissed`. Canceling must produce **no** `StepMissed` for the removed Steps, and must never zero the streak. Explicit invariant + a QA assertion. | Yes if we emit nothing; **must be asserted in tests.** |
| **Pending Weekly Review proposal** | `approveWeeklyReview` rebases through `computeJourneyProposals`, which only proposes for Journeys resolving to `active` — a canceled Journey silently drops out of a later approval. **But** the review screen renders from the stored review object, so its card would still *name* the canceled Journey. Requirement: the review UI must filter its proposals by current status before rendering. | Engine: **yes.** UI: **new work.** |
| **Pending Completion ceremony** | Cannot co-occur: a completed Journey can never be canceled (§7), and `getPendingCompletionCeremony` filters on `status === 'completed'`. The engine guard makes this structurally impossible. | Yes, by the guard. |
| **Dream link** | **Preserved.** `dreamId` / `secondaryDreamIds` stay on the Journey; the Dream keeps no back-reference (Journeys are derived on read), so nothing to clean up. A canceled Journey must not be counted as an active Journey under its Dream. For MVP slice 1, recommend it is simply **not shown** on the Dream screen (smallest change); showing canceled Journeys in a Dream's history is a later refinement (§12.6). | Data: yes. Filtering: **verify `journeysForDream` consumers.** |
| **Local export** | Canceled Journeys and their kept Steps **must be included** in the local data export (`Backfill/Account_Deletion_and_Data_Export_PRD.md`). Keeping the record is the whole point of the feature. | **Verify.** |

## 7. Which Journeys can be canceled

| Current status | Cancel available? | Why |
|---|---|---|
| `active` | **Yes** | The main case. |
| `frozen` (manual pause, J3) | **Yes** | This is the *most* important case. A pause becomes a cancel when the user realizes they are not coming back. The action must be reachable on the paused detail screen. |
| `frozen` (`account_inactivity`, J5) | **Yes** | On return from a long absence, "I'm not picking this one back up" is the healthy answer. See §7.1. |
| `future` | **No — DELETE only, not Cancel.** Founder decision 2026-08-13, D46; supersedes the §7.2 recommendation below. | A Future Journey has never run — by §4.1 it has zero history, so it is deleted, not canceled: it simply disappears. See §7.2. |
| `completed` | **Never** | D41: completion is FINAL. The action is hidden and the engine guard refuses. A completed Journey can be deleted, never un-completed. |
| `abandoned` | **No** (idempotent no-op) | Already canceled. Only **Delete** remains available on a canceled Journey — that is the escape hatch for erasing it entirely. |

### 7.1 Interaction with the inactivity freeze (J5)

- Canceling an inactivity-frozen Journey is allowed and is a legitimate return decision.
- **The cancel must not resolve or clear the `accountInactivity` marker.** Marker resolution stays owned
  by the return flow — canceling one Journey is not "returning".
- `getInactivityReturn` buckets by `j.status === 'frozen'`, so a canceled Journey drops out of the resume
  set automatically. Verify the return screen renders correctly when the user cancels every frozen
  Journey (the resume set becomes empty — it must not show an empty resume button).
- **Recommendation:** the inactivity-return screen should offer per-Journey "keep it paused / cancel it"
  rather than only resume-or-nothing. That is a small extension of `Account_Inactivity_Freeze_PRD.md` and
  is flagged there rather than assumed here (§12.7).

**Founder decision (2026-08-13, D46) — resolves §12.7: confirmed.** The inactivity-return screen also
offers cancelling a Journey — the per-Journey "keep it paused / cancel it" extension recommended above is
approved, not merely a recommendation. `Account_Inactivity_Freeze_PRD.md` should be updated to reflect
this extension the next time that file is opened for work (not done in this pass — this repo-steward
pass is scoped to this PRD and the files named in its brief, to avoid an unreviewed edit landing in a
file this session did not otherwise touch).

### 7.2 Canceling a Future Journey

A `future` Journey has never run; by §4.1 **all** its Steps are unreported, so all are removed and
`journey.steps` becomes empty. What remains is a record of an intention: "I planned this and decided not
to do it."

Recommendation: **allow it**, with its own confirmation copy ("nothing has happened on this yet — this
just puts the plan away"), and let it land in history as canceled. The intention itself is real signal
for the coach. The counter-argument — that with zero history there is nothing to preserve, so Delete is
the honest action — is also reasonable; flagged as **§12.2** for the founder.

**Founder decision (2026-08-13, D46) — resolves §12.2:** the counter-argument above was chosen, not the
primary recommendation. **A Future Journey is DELETED, not canceled — it simply disappears.** With zero
history there is nothing to preserve, so Delete is the honest action; offering Cancel alongside Delete
for a Future Journey would be exactly the clutter the counter-argument warned about. Consequence for
§8.3: the Journey-detail action row for a `future` Journey is **Delete**, not Cancel — an active or
frozen Journey gets Cancel, a Future Journey gets Delete, never both. The confirmation shown is the
existing delete confirmation, not §8.4's cancel confirmation. The primary recommendation this replaces
(allow cancel, with its own copy, landing in history as canceled) is preserved above, unedited, as the
option that was considered and not chosen.

## 8. What the user sees

### 8.1 Where a canceled Journey lives — recommendation on the tab

The Journeys tab has exactly three buckets: **Current · Completed · Future**. Two facts make this a real
decision, not a detail:

- `bucketOf` currently **falls through to `'active'` for any status it does not name** — so with no
  change, a canceled Journey would appear in **Current**, alongside the user's live commitments. This
  must be fixed regardless of anything else in this PRD.
- The Completed tab's card renders a **"DONE" pill** and a **progress percentage**. Dropping a canceled
  Journey in unchanged would present it as an achievement.

**Recommendation (founder to confirm — §12.3): rename the Completed tab to "History"** (Hebrew:
**"היסטוריה"**), and inside it render two groups with headers — **Completed** first, then **Stopped** —
each sorted newest-first by `completedAt` / `abandonedAt`.

Why the rename rather than reusing "Completed": a tab named "Completed" that contains canceled Journeys
is a label that lies, and the fix-by-styling alternative (leave the name, mark the cards differently)
leaves the user reading "Completed → my canceled Journey". "History" is honest about both, and it is the
word the founder used for the destination.

Copy implications of the rename, so it is priced honestly:
- `journeys.tabs.completed` → a new `tabs.history` key (en + he), plus the two new group headers.
- The empty state `completed.empty.title` / `.body` must be rewritten to cover both types, and a new
  empty state is needed for "history with only canceled Journeys".
- Accessibility labels on the segmented control.
- Any doc/spec referring to "the Completed tab" (`Information_Architecture.md`, UX specs, this folder's
  other PRDs) needs a note, not a rewrite.
- **The `JourneyBucket` type and `bucketOf` change together**; `journeys.tsx`'s `buckets` memo currently
  builds only `active` and `completed` and must be extended so nothing falls through to Current.

**If the founder prefers not to rename:** keep "Completed", and add an explicit "Stopped" section header
inside it with the canceled cards below the completed ones. Everything in §8.2 still applies. This is the
smaller change and the weaker one.

**Founder decision (2026-08-13, D46) — resolves §12.3: approved as recommended.** The tab is renamed
**"History"** (Hebrew **"היסטוריה"**), with **Completed** and **Stopped** grouped inside it exactly as
proposed above. The "if the founder prefers not to rename" fallback paragraph immediately above is
therefore not needed — it is left in place only as the record of the smaller alternative that was priced
and not chosen.

### 8.2 How a canceled card must read

Non-negotiable, from `Friend_Profile_PRD.md` §4.2 — **a canceled Journey can never read as a success**:

- A neutral **"Canceled" / "מבוטל"** pill. Muted/neutral ink — never the completion styling, never green,
  never gold, never the celebratory teal accent.
- **No percentage and no progress bar** (§4.5). Instead an honest line: "3 of 12 Steps done" from
  `stepsAtAbandon`.
- No trophy, no confetti, no completion card, no share affordance. Those belong to completion (D42) and
  reusing any of them would both mislead and devalue the real ceremony.
- Footer reads the date it was stopped, not an "ends in…" projection.
- Opening it shows the detail screen in a read-only history mode: the kept Steps and their real outcomes,
  the "why", the linked Dream. No check-in CTA, no edit pencil, no pause, no reminder card.

### 8.3 The detail-screen actions

The Journey detail screen currently ends with one destructive row: a coral trash "Permanently
delete/abandon". After this feature it ends with **two clearly distinct rows**:

1. **Cancel this Journey** — secondary/neutral-destructive, not coral-red. Sub-label conveys "stop this,
   keep what I did".
2. **Delete permanently** — unchanged coral, unchanged behavior. Sub-label conveys "remove this and
   everything in it".

Both hidden on a completed Journey for the cancel action (delete stays, per D41's "can be deleted, never
reopened"). On an already-canceled Journey only Delete shows. **On a `future` Journey, per §7.2's
resolution (D46), only Delete shows — Cancel never appears for a Journey that has not started.**

### 8.4 The confirmation — what it must state

Follow the honesty pattern of `app/src/components/settings/DeleteAccountSheet.tsx`: state the real
consequences, count them accurately, and never fabricate a number you do not have (that sheet
deliberately refuses to show a made-up `0` impact count). The confirmation must state:

1. **What stops** — reminders stop and this Journey leaves Home and the Current list.
2. **What is removed** — the exact count: *"N Steps that haven't happened yet will be removed."* When
   N = 0, say so plainly instead of showing "0 Steps" ("there are no Steps left to remove").
3. **What is kept** — everything reported: the check-ins, the record of what was done, and the XP and
   Coins already earned. **Say explicitly that the streak is not affected.**
4. **Who else is affected** — only when true: *"your Support Circle stops seeing this Journey"* and, if
   there are pending invitations, *"N pending invitations will be withdrawn."* Never rendered when the
   Journey has no Circle, and never a fabricated count.
5. **Whether it can be undone** — **decided 2026-08-13 (D46, §5.7): it cannot.** State plainly that the
   action is final/irreversible. No undo window, no grace period — this is a hard requirement of the
   confirmation copy, not a style choice.
6. **A visible alternative: "Pause it instead."** This is the highest-value element of the whole flow.
   Someone who needs three weeks off should not have to choose between destroying a plan and pretending.
   The pause option must be an equal-weight action in the sheet, not a footnote.

Actions: `Pause instead` · `Not now` · `Cancel this Journey`. The confirm action carries the weight; the
dismiss is neutral and never guilt-flavored ("Not now", never "Keep going!" or "Don't give up").

## 9. Emotional framing (the reason this PRD matters)

PushApp exists to help people become who they choose to be. **Stopping a Journey is a legitimate act of
self-knowledge, and the product must never frame it as failure.** `Product_Philosophy.md` is explicit —
"if users repeatedly fail to complete a Journey, the product should not conclude that the user failed…
PushApp never tries to motivate people through guilt" — and `AI_Product_Principles.md` names guilt,
punishment and shame as forbidden motivators.

### 9.1 Tone rules (binding on content-writer)

- **Matter-of-fact respect.** Not sad, not congratulatory, not therapeutic. The register of a good friend
  who says "okay" and means it.
- **Forbidden words and moves:** fail/failure, gave up, quit, abandoned, dropped out, lost, broke,
  "unfinished", "incomplete". Also forbidden: any sad emoji, any wilting/darkening Buddy reaction, any
  "we'll miss you".
- **Forbidden framing — loss-aversion:** the flow must **never** show what the user is about to lose.
  No "you'll lose your 12-day streak", no "you're 60% of the way there, are you sure?", no "you've
  invested 14 days". That is textbook sunk-cost retention pressure. It is the standard pattern in habit
  and fitness apps, it measurably increases retention, and it is precisely the engagement-over-growth
  trade this product refuses. **Flagging the tension explicitly: this pattern works. We are not using
  it.** Stating the factual Step count (§8.4.2) is different — that is informed consent about data
  removal, not leverage.
- **Never present cancel as an admission.** No "why are you giving up?" and no required reason.
- **Do use** one honest sentence of recognition after the fact: what actually happened is real and stays.

### 9.2 Should the coach be involved?

**Recommendation: not before, only after, and only once.**

- **Never as a gate.** A coach conversation placed *in front of* the cancel button is a churn-prevention
  interstitial wearing a coach costume. It converts a two-tap decision into a negotiation with an AI,
  and it drives time-in-app rather than growth. Explicitly rejected.
- **Optional and after.** Once the cancel is done, a single, dismissible offer: *"want to say what
  changed?"* If the user takes it, the coach listens, and — only if the user wants — can propose
  something smaller or different. If dismissed, it never comes back for that Journey.
- **The real value is planning quality.** A stated reason ("it was too much", "life changed", "this
  stopped mattering") is the best signal the planner will ever get about whether it builds realistic
  Journeys. That is a growth argument, not an engagement one. But it must stay optional, on-device, and
  never gate the cancel.

### 9.3 Should stopping ever be celebrated?

**Recommendation: acknowledged, never celebrated.** No confetti, no ceremony, no shareable card. Those
are completion's language (D42); borrowing them would blur "canceled is not success" and cheapen the real
ceremony people work months for.

What it *should* get is one quiet, truthful line after the action — recognizing the work that actually
happened ("You did 4 Steps on this. That work is yours, it doesn't disappear.") and, when the user has
consciously chosen to stop rather than drift, treating that as a decision rather than a defeat.

There is a genuine product question underneath: is "choosing to stop something that stopped serving you"
itself an act of becoming who you choose to be — and therefore something PushApp should positively
affirm? A strong case says yes. But affirmation and celebration are different volumes, and the founder
should set the volume. **§12.4.**

## 10. How it integrates with the shipped code

- **One new engine transition**, `JourneyEngine.abandonJourney(journeyId, at)`, next to `freezeJourney` /
  `resumeJourney` / `activateJourney`. It: guards on the current resolved status (§7); snapshots
  `stepsAtAbandon` **before** touching Steps; splices the no-history Steps; unlinks dangling dependents;
  marks the rest `dropped: true`; sets `status = 'abandoned'` and `abandonedAt`; clears `freezeReason`;
  emits `JourneyAbandoned`.
- **Idempotent by construction**, mirroring `activateJourney`: it bails and returns `null` unless the
  Journey currently resolves to a cancelable status. A double tap, a duplicate lifecycle beat, or a
  second device is a no-op — one transition, one event.
- **One new event**, `JourneyAbandoned`. **Scalar/enum-only payload (G1)** — the id and counts at most;
  never the title, never Step titles, never a reason string.
- **AppCore facade** `abandonJourney(journeyId)`: cancels the postpone one-shots first (reading Step ids
  while they exist), delegates, and — critically — the new event must be added to **both** the persist
  (`onChanged`) and the reminder reconcile (`onReconcile`) subscriptions.
- **`bucketOf`** gains an explicit `abandoned` branch. It must stop falling through to `'active'`.
- **`journeys.tsx`** buckets must gain the canceled group (§8.1).
- **`journey/[id].tsx`** gains the second action row and its confirmation, and a read-only history mode.
- **Nothing else needs to change to be correct** — `isRunning`, `weeklyReview`'s exclusions, and
  `SocialProvider.publishAll`'s positive allowlist already handle `abandoned` today. That is the payoff
  of the positive-gate discipline, and it should be stated in the build plan so nobody "fixes" them.

## 11. Standard edge-case checklist (per `README.md`)

- **Empty / first-run:** no Journeys → the action is unreachable. A canceled Journey with zero kept Steps
  must render a clean history detail, not an empty crash.
- **Offline:** the cancel is a **purely local write** and must complete offline. The two network touches
  — withdrawing published progress and closing pending invites — are **best-effort and must never block
  or fail the local transition**, exactly as `onConfirmDelete` already does (`void
  social.closeJourneyInvites(...)` then the local delete). If they fail, the next `publishAll` retries
  the withdraw. The Journey must never be left half-canceled waiting on a server.
- **Permission denied:** N/A — no new permission. Notification permission is irrelevant to canceling.
- **Completed / frozen / future / already-abandoned states:** §7. All four have defined answers and an
  engine guard.
- **Concurrent actions:** double-tap is absorbed by the idempotent guard. **Cancel racing a final-Step
  check-in:** if the check-in lands first and completes the Journey, the cancel must be **refused** —
  completion wins and is final (D41). Cancel while the Weekly Review sheet is open → its proposal card
  for that Journey must stop rendering (§6). Cancel while the Journey detail is open on a second
  surface → the snapshot subscription re-renders it into history mode. Multi-device divergence is
  local-first and unsynced today — noted, not solved.
- **Very long / empty input:** Journey titles must truncate in the confirmation and the history card. The
  MVP flow takes **no free-text input**; if the optional post-cancel reason (§9.2) ships, it needs a
  length cap and stays on-device (never in an event, never in a social payload).
- **RTL:** the confirmation modal, the two action rows, and the history group headers all mirror. Hebrew
  plural rules for "N Steps" (one/two/many) must be handled through i18next plurals, not string
  concatenation. The Canceled pill must not rely on colour alone to carry meaning.
- **Form of address (gender):** every string in this flow — the confirmation, the recognition line, and
  any coach follow-up — uses the D31 gender-aware form of address. content-writer delivers both forms in
  Hebrew.
- **Deletion / data loss:** the splice is genuine, irreversible removal of unlived Steps. It must be
  stated honestly in the confirmation (§8.4.2) and it must not be described as "archiving". Canceled
  Journeys must appear in the local data export.
- **Error states:** unknown id, already-canceled, or a completed Journey → a silent no-op that returns
  `null`. Never a crash and never a success toast for something that did not happen.

## 12. Open questions

Five of the original seven questions were answered by the founder on 2026-08-13 (D46), in the same
session as the initial spec. Each resolution is recorded in place at the section it affects — this list
now only summarizes, with pointers, and keeps the two genuinely still-open questions clearly marked as
open.

**12.1 Is canceling reversible? (was BLOCKING.) — RESOLVED, D46.** Irreversible; no undo window. The
confirmation states plainly that the action is final. See §5.7 for the full decision and what happened to
each part of the original recommendation (the short-undo idea was offered and explicitly declined).

**12.2 Can a Future Journey be canceled, or only deleted? — RESOLVED, D46.** Only deleted. A `future`
Journey has zero history, so Delete is the honest action; Cancel never appears for it. See §7.2.

**12.3 Rename the Completed tab to "History"? — RESOLVED, D46.** Yes, approved as recommended — "History"
/ "היסטוריה", with Completed and Stopped grouped inside it. See §8.1.

**12.4 How loudly do we affirm stopping? — STILL OPEN.** §9.3 recommends acknowledged-not-celebrated: one
honest recognition line, no ceremony. Not answered by the founder on 2026-08-13: does he want a stronger,
explicit affirmation that choosing to stop can itself be growth — and does the Support Circle ever get an
owner-initiated "I'm stopping this one" note (§6), or is silence permanent? Both parts of this question
remain open.

**12.5 Is "start it again" in slice 1 or a fast-follow? — RESOLVED, D46, differently than either option
posed.** Not built at all, in either form. The founder's decisions clarified that "start again" applies
only to frozen Journeys, and that affordance already exists as Resume (§5.8) — there is no
restart-from-canceled path to schedule as slice-1 or fast-follow.

**12.6 Do canceled Journeys appear under their Dream? — STILL OPEN.** §6 recommends hidden from the Dream
screen for slice 1 (data preserved, never counted as active). Not answered by the founder on 2026-08-13.
A later refinement could show a Dream's full history including what was stopped.

**12.7 Does the inactivity-return screen (J5) offer a per-Journey cancel? — RESOLVED, D46.** Yes,
confirmed. See §7.1. `Account_Inactivity_Freeze_PRD.md` still needs this extension written into it (not
done in this pass).

## 13. Success metrics & instrumentation

**Note on reality:** there is **no analytics pipeline in the app today** (a repo-wide search finds no
tracking SDK; "analytics" appears only in privacy prohibitions). The list below is therefore the **event
contract to wire when the analytics seam lands**, and in the meantime the equivalents are the in-process
scalar-only `JourneyAbandoned` domain event plus QA assertions. Every event below is **scalar/enum-only**
— no Journey title, no Step title, no free text, ever (G1, and Dreams are barred from analytics payloads
entirely per `Dream_Management_PRD` §8).

### 13.1 Success signals — how we'll know it works

1. **Primary — the destructive exit stops being the only exit.** Hard deletes of Journeys *that had
   reported history* fall sharply, replaced by cancels. If people still delete Journeys they invested
   in, the cancel path is not being found or not being trusted.
2. **Stopping unblocks starting.** A meaningful share of cancels is followed within 14 days by a new
   Journey that gets **at least one real check-in**. This is the growth metric — not the cancel itself.
3. **Pause catches the people who only needed a break.** A healthy fraction of opened cancel sheets end
   in "Pause instead". If that is near zero, the two actions are not distinguishable in the copy.
4. **Cancel does not become the default exit.** Watch cancel rate against completion rate. Rising cancels
   with flat starts means the *plans are too big* — a planner/coach problem this feature merely surfaces.
5. **Zero regressions in earned state.** No cancel ever coincides with a streak reset or an XP/Coin
   decrease. This is a QA assertion, not a metric to watch.

### 13.2 Events to instrument (hand to implementer; qa-engineer verifies)

| Event | When | Properties (enum/bucketed only) |
|---|---|---|
| `journey_cancel_opened` | the confirmation opens | `entry` (detail·inactivity_return) · `status_before` (active·frozen·future) · `freeze_reason` (manual·account_inactivity·none) · `steps_reported_bucket` · `steps_unlived_bucket` · `days_since_start_bucket` · `has_support_circle` |
| `journey_cancel_confirmed` | the transition commits | same, plus `pending_invites_bucket` · `undo_offered` — **always `false` per D46; kept as a property slot in case a future feature reintroduces any grace window, not because one exists today.** |
| `journey_cancel_dismissed` | backed out | same as opened, plus `dismiss_reason` (not_now·scrim) |
| `journey_cancel_switched_to_pause` | "Pause instead" taken | same as opened — **the key growth event** |
| `journey_cancel_undone` | undo used inside the window | `seconds_to_undo_bucket` — **N/A per D46 (2026-08-13): there is no undo window, so this event never fires.** Kept in the table as the documented record of what was considered and not built, not as a wiring instruction. |
| `journey_delete_confirmed` | existing hard delete (add if absent) | `status_before` · `had_reported_history` — the baseline signal 13.1.1 is measured against |
| `journey_history_opened` | the History tab is opened | `completed_count_bucket` · `canceled_count_bucket` |
| `journey_history_item_opened` | a history card is opened | `status` (completed·canceled) — do people ever look back? |
| `journey_started_after_cancel` | a new Journey is created ≤14 days after a cancel | `days_since_cancel_bucket` · `seeded_from_canceled` (bool) |
| `journey_cancel_reason_offered` / `_answered` | the optional post-cancel coach offer | `answered` (bool) · `reason_id` **only if it is a closed enum** — never free text |

### 13.3 QA assertions (not analytics — must be tests)

- Canceling never emits `StepMissed` and never changes `streak`.
- Canceling never decreases `buddy.xp` or `buddy.coins`.
- A canceled Journey never appears in the Current tab, on Home, in `getTodaySteps`/`getWeekSteps`, in
  `activeJourneyCount`, in a Weekly Review proposal, or in a published Ally payload.
- A canceled Journey never renders a percentage, a progress bar, a DONE pill, or a completion card.
- Every kept Step retains its `CheckIn` and `reasonLog` rows; no removed Step leaves a dangling
  `dependsOnStepId` behind.
- A completed Journey cannot be canceled; a canceled Journey cannot be canceled twice.
- The cancel completes with the network unavailable.

## 14. Out of scope / deferred

- **Un-cancel as a status flip** — DECIDED against, 2026-08-13 (D46, §5.7/§12.1). No undo window of any
  kind either; cancel is final the moment it is confirmed.
- **"Start it again" seeded from a canceled Journey** — DECIDED against, 2026-08-13 (D46, §5.8/§12.5).
  There is no restart-from-canceled path at all. ("Start again" does exist in the product, but only for
  frozen Journeys, and it is the already-shipped Resume — §5.8.)
- **A canceled-Journey reflection surface** (patterns across everything a user has stopped) — real
  long-term value for the coach, but it needs several canceled Journeys to exist first. Future.
- **Telling the Support Circle** that a Journey was canceled — still open, §12.4.
- **Cross-device reconciliation** of the cancel — backend-gated, like every other lifecycle transition.
- **Cleaning up orphaned `behaviorLog` rows** for spliced Steps — same known, harmless local-growth issue
  the delete path already has (`Journey_Lifecycle_Management` §5.3); becomes real only with a backend.
- **Showing canceled Journeys on the Dream screen** — still open, §12.6.
