# PRD — Journey Lifecycle Management

Status: **Backfill PRD** — documents an ALREADY-SHIPPED feature retroactively; captured 2026-08-13.
Not a forward spec.
Stage: **MVP** (tasks J1 · J2 · J3 · J5).
Owner: founder + AI product team.
Related Decision Log: **D29** (edit / delete / freeze confirmed IN the MVP; coach-led editing chosen for J1),
**D41** (Journey completion is FINAL), and the sibling `../Account_Inactivity_Freeze_PRD.md` (J5).
Related code: `app/src/core/engines/JourneyEngine.ts`, `app/src/core/coach/JourneyEditOrchestrator.ts`,
`app/src/core/coach/journeyEdit.ts`, `app/src/core/engines/InactivityEngine.ts`,
`app/src/core/util/journeyStatus.ts`, `app/src/components/journey/journeyView.ts`,
`app/src/app/(tabs)/journeys.tsx`, `app/src/core/types/domain.ts`.

---

## 1. Purpose

A Journey is the core finite transformation object, and a user needs to be able to change one, pause one,
or let one go without losing the history and effort already invested. This PRD documents the four lifecycle
transitions that ship today — **edit** (J1), **delete/abandon** (J2), **freeze/resume** (J3), and the
system-driven **inactivity freeze** (J5) — as a single coherent lifecycle, because they all mutate the same
`Journey.status` field and all feed the same Journeys-tab bucketing and reminder re-planning.

The organizing idea: `Journey.status` is the **single source of truth** for where a Journey appears and how
it behaves. Every transition below is a controlled write to that field (or a hard removal), and every one
preserves the invariant that completion is final and that no transition silently destroys check-in history
or earned XP.

## 2. The status model (what actually drives the tabs)

`JourneyStatus = 'active' | 'frozen' | 'completed' | 'abandoned'` (`core/types/domain.ts`). A new Journey is
created explicitly `active` (`JourneyEngine.createJourney`). The status is resolved by one pure function,
`resolveJourneyStatus`, which trusts an explicit `status` and, for Journeys persisted before the field
existed, derives `completed` from `completedAt` else `active`.

The Journeys screen (`journeys.tsx` + `journeyView.bucketOf`) buckets into **three tabs** — Active,
Completed, Future — not four:

- `completed` → **Completed** tab.
- `active` **and** `createdAt` in the future → **Future** tab (this bucket is derived from `createdAt`, not
  stored; a scheduled Journey flips to Active on its own when its start passes).
- `active` **and** `frozen` → **Active** tab. A frozen Journey lives under Active with a **"paused" pill**;
  it is distinguished by `status`, not by a separate bucket.
- `abandoned` → never reaches the view (see §5 — delete removes the Journey outright rather than
  soft-marking it).

## 3. Current shipped behavior

### 3.1 Edit (J1 — coach-led)

Editing is **coach-led**, per D29: a pencil on the Journey screen opens a scoped coach conversation rather
than a free-form edit form. Two layers ship:

- `JourneyEditOrchestrator` (`core/coach/`) manages the dialogue. `start()` returns a scoped greeting naming
  the Journey with **no model call**; `propose(changeText)` makes **exactly one** LLM "understanding" call,
  then parses the reply through `extractJourneyEdit` into a **validated** `JourneyEdit` plus a language-free
  `EditChange[]` the approval card renders. A transport/LLM failure **degrades to an empty proposal** —
  nothing is mutated and the surface never crashes. The orchestrator itself never mutates the Journey.
- `JourneyEngine.updateJourney(journeyId, edit)` enacts an approved edit in place. It preserves every Step's
  id, check-in history, and earned XP. Order: scalars (`title`, `why`, `rhythm`, `durationDays`) → edit
  existing Steps by id → remove Steps → add Steps (via the shared `makeStep` builder, so a late-added Step is
  built identically to an original). **Step removal follows a drop-vs-splice rule:** a Step that is `done` or
  carries check-in/reason history is marked `dropped: true` (record preserved, out of scope); a pristine,
  never-touched Step is spliced out entirely. It emits `JourneyUpdated`; AppCore persists and re-plans
  reminders off it. It **never** triggers the Weekly Review.
- **Guard:** `updateJourney` returns `null` for an unknown id **or** a completed Journey
  (`journey.completedAt` set) — a completed Journey is not editable (the UI hides the pencil; this is the
  belt-and-braces backstop). Cross-Journey / unknown Step ids in `editSteps` are ignored.

### 3.2 Delete / abandon (J2)

`JourneyEngine.deleteJourney(journeyId)` is a **hard remove** from `AppState.journeys` (a `splice`), distinct
from a pause. It emits `JourneyDeleted` (id only); AppCore persists off it and re-plans reminders, which
cancels the Journey's on-device notifications. Returns `false` on an unknown id. Orphaned on-device
`behaviorLog`/`reasonLog` rows that reference removed Step ids are left as harmless raw local logs.

Delete is the only path to remove a completed Journey — completion is final (D41), so a completed Journey can
be **deleted but never reopened**, which keeps its shareable completion card valid.

### 3.3 Freeze / resume (J3)

`freezeJourney(journeyId, reason = 'manual')` flips `status` to `frozen` and stamps `freezeReason`, losing no
progress (Step ids, check-in history, XP all stay). A frozen Journey fires **no reminders** (the
CommunicationScheduler skips it), gets its postpone one-shots cancelled, is excluded from the adaptive loop
and Weekly Review, and reads as "paused" in the UI. No-op (returns `null`) for an unknown id, an
already-frozen Journey, or a completed one.

`resumeJourney(journeyId)` flips a frozen Journey back to `active` (reminders schedule again) and **clears**
`freezeReason` so a later pause starts clean. No-op (returns `null`) for an unknown id or a Journey that is
not currently frozen. Emits `JourneyResumed`.

### 3.4 Inactivity freeze (J5 — related system transition)

`InactivityEngine.tick(now)` reuses the **same** J3 frozen path — it calls
`freezeJourney(journey.id, 'account_inactivity')` — so it invents no parallel state. It measures the elapsed
gap since `lastAuthenticatedActivityAt` on a local lifecycle beat and, once the gap crosses the configured
threshold (`config/inactivityPolicy`), freezes every started-active Journey with the `account_inactivity`
provenance. It is idempotent (once a cycle is recorded a later tick never re-freezes) and emits
**scalar-only** events (`AccountInactivityFrozen` with a count, `AccountInactivityReturned`) — no Journey
title or id list rides them (G1). First sight seeds the anchor and never freezes (grace). A resume clears the
provenance. The authoritative-server version (freezing while the app is closed) is deferred to the sibling
PRD; this ships the local-first POC only.

### 3.5 What each transition preserves

| Transition | `status` after | History / XP | Reminders | Reversible? |
|---|---|---|---|---|
| Edit (J1) | unchanged (`active`) | preserved; done/touched Steps dropped not deleted | re-planned | n/a |
| Delete (J2) | Journey removed | logs orphaned locally | cancelled | no |
| Freeze (J3) | `frozen` | fully preserved | suppressed | yes (resume) |
| Inactivity freeze (J5) | `frozen` (`account_inactivity`) | fully preserved | suppressed | yes (manual return, no auto-resume) |
| Completion (D41) | `completed` | locked | cancelled | **no (final)** |

## 4. Decisions already made

- **D29:** edit, delete/abandon, and freeze/resume are all IN the MVP; **editing is coach-led** (a pencil
  opens the coach conversation, the user must approve the proposed change before it applies).
- **D41:** Journey completion is **final** — `reverseReport` refuses when `status === 'completed'`, and
  `updateJourney` refuses a completed Journey. A completed Journey may be deleted, never reopened.
- **J5 / `Account_Inactivity_Freeze_PRD.md`:** inactivity freeze reuses the J3 frozen path with a
  `freezeReason` provenance; return is **explicit** (manual/coach), never automatic resume.

## 5. Open questions & edge cases NOT yet handled

1. **`abandoned` status is defined but never written.** `deleteJourney` hard-removes the Journey; nothing in
   `app/src` ever sets `status = 'abandoned'`. So there is no "let go but keep for reflection" state, no
   Abandoned view, and no way to distinguish a deliberately-abandoned Journey from one that never existed.
   The type, the JSDoc, and `journeyView` all acknowledge this ("removed outright today"). Decide whether
   abandon should become a soft state (needed if we ever want abandonment analytics or an "archive").
2. **Delete is silent and immediate.** `deleteJourney` has no confirmation gate at the engine layer (unlike
   account deletion, which has `DeleteAccountSheet`). Whether the UI wraps it in a confirm — and whether a
   completed Journey's deletion warns that the shareable completion card goes with it — is not specified
   here. Worth confirming the destructive-confirm parity.
3. **Orphaned logs after delete/edit-drop.** `deleteJourney` leaves `reasonLog`/`behaviorLog` rows pointing
   at removed Step ids; dropped Steps keep their rows too. Harmless locally, but this is unbounded growth
   over a long-lived install and becomes a real cascade question once a backend sync exists (flagged N/A
   until then, consistent with D35 §12.7).
4. **No re-plan of a frozen Journey's Steps on resume.** Resume simply flips status back to `active`; Steps
   that were scheduled for dates now in the past are not rescheduled. A Journey resumed after a long freeze
   can surface a pile of past-dated Steps. Whether resume should nudge the Weekly Review / re-plan is open.
5. **Editing a Future (not-yet-started) Journey.** `updateJourney` allows editing any non-completed Journey
   including a Future one; there is no special handling for changing the start/`createdAt`, and `createdAt`
   is not an editable scalar in `JourneyEdit`, so a Future Journey's start date cannot be moved through the
   coach-led edit today.
6. **Freeze does not stop the completion path.** A Journey can still be completed by a check-in only while
   `active`; but there is no guard preventing a check-in UI on a frozen Journey from other entry points —
   worth a QA pass that frozen Journeys expose no check-in affordance.
7. **Inactivity freeze granularity.** J5 freezes on the **next local beat**, not at the exact threshold
   moment, and only for the authenticated user; the exact-time, app-closed behavior is explicitly deferred.
   The threshold and whether Future Journeys should also be surfaced for a return decision are owned by the
   sibling PRD, not resolved here.
8. **Concurrent multi-device lifecycle.** All transitions are local-first with no sync; two devices could
   diverge (one freezes, one edits). N/A until a backend, but note it so it is not assumed solved.

## 6. Out of scope / deferred

- A soft `abandoned` archive view and abandonment analytics (§5.1).
- Server-authoritative inactivity freeze and app-closed / exact-time detection (sibling PRD).
- Rescheduling past-dated Steps on resume / a resume-triggered re-plan (§5.4).
- Editing a Journey's start date / moving a Future Journey (§5.5).
- Cross-device lifecycle reconciliation and orphaned-log cascade cleanup (backend-gated).
