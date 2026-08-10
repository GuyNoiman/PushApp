# PRD — Daily Step Reporting

Status: **Ready for implementation** — blocking questions closed with the founder 2026-08-10
(see §12, now "Resolved decisions"), grounded in the current codebase. Logged as Decision D35.
Stage: **MVP**.
Owner: founder + AI product team.
Source: mobile-authored “Daily Step Reporting & Weekly Review” draft, 2026-08-10.
Related: `Step_Postponement_PRD.md`, `Weekly_Review_PRD.md`, Journey editing, I1 completion
celebration, and `../Miss_Recovery_PRD.md`.

Boundary dependency: `Week_Boundary_Preference_PRD.md` is an externally implemented source of truth.
This feature may consume its effective boundary but must not modify, duplicate, or reinterpret that PRD.
Any reporting requirement that conflicts with it must be resolved inside this PRD instead.

---

## 1. Purpose

Daily reporting is the smallest feedback loop between a planned Step and reality. It must let the user
record what happened in seconds from Home without forcing a conversation with the AI Coach. Daily
reporting collects evidence; it does not normally trigger proactive Journey replanning.

## 2. Product principles

- Completion is essentially one action.
- Missing data is Unreported, not immediate failure.
- Partial progress is represented independently.
- The user may initiate Journey editing at any time, but AI-initiated proactive adaptation belongs to
  Weekly Review.
- Reporting exists to improve real-life plans, not to increase check-in activity.

## 3. Competitor references

- [Finch](https://help.finchcare.com/hc/en-us/articles/37779940291213-Creating-and-Completing-Goals)
  supports one-tap completion from Home, retroactive completion, snooze, pause, and edit.
- [Strava goals](https://support.strava.com/en-us/articles/15401694-goals-on-the-strava-app)
  separates an overall weekly target from individual activities that contribute to it.
- [Strava Training Log](https://support.strava.com/en-us/articles/15402077-training-log) uses weekly
  summaries while preserving individual activity evidence.

PushApp's distinction is the explicit Unreported/Partial/Not Completed model feeding a user-controlled
weekly adaptation cycle.

## 4. Home presentation

Home exposes two logical groups:

- **Today's Steps** — occurrences assigned/recommended for today.
- **Week's Steps** — occurrences contributing to the active week, including flexible weekly commitments.

Every report targets a specific Step. PushApp has **no separate occurrence entity**: a Step is completed
once (`JourneyEngine`), so the Step *is* its own occurrence and reporting on it is reporting on that single
occurrence. A flexible target such as “three times this week” is represented as **multiple pre-created
Steps** for that week (grouped by the existing `stepsByWeek`), each reported independently — see §12.1.
This appears on Home as separate rows, which is the accepted MVP behavior; a single “x/y this week” counter
row and a true recurrence/occurrence model are both deferred (§12.1).

## 5. Step statuses

These are product-level statuses **derived** from the existing model (the code has no single `status` enum
today; state is reconstructed from `done` / `dropped` / `lastCheckInAt` + the emitted events + the
append-only `reasonLog`/`behaviorLog`):

- `unreported` — default; no final report submitted (`!done && !dropped`, no terminal report row);
- `completed` (`done === true`, `StepCheckedIn`);
- `partially_completed` (a `StepPartial` report; `done` stays `false`);
- `not_completed` (a "couldn't" report; `StepCancelled`).

Postponement is owned by `Step_Postponement_PRD.md`; whether it is also persisted as a current status is
not decided here.

Statuses remain distinct in storage and event history. Unreported may contribute as non-completion to
closed-week analysis, but the raw distinction remains available.

## 6. Reporting interaction

Support visible controls and optional swipe shortcuts from Home. The source concept maps right swipe to
Completed and left swipe to Not Completed; final gesture direction must be RTL-safe and device-tested.
Gestures supplement, never replace, accessible buttons.

### Completed

- Update immediately.
- No mandatory question.
- Trigger the approved small completion celebration.

### Not Completed

- Update immediately.
- Keep the reporting sheet open with an optional predefined reason list.
- `Other` reveals optional free text.
- Closing without a reason is valid.

The exact reason taxonomy remains owned by `../Miss_Recovery_PRD.md`; this PRD must not fork it.

### Partially Completed

- Available for every Step in MVP; the user decides whether it makes sense.
- **The explanation is OPTIONAL, never mandatory** (§12.6). The user may add a short free-text note (what
  was completed / what got in the way); closing without a note is valid. The note is **on-device only**,
  same rule as the `other` reason's captured note (G1).
- Uses a distinct non-failure visual treatment (founder, 2026-08-10): the Partial color is **yellow** or an
  **alternate-shade green** — never the full completion green and never the red "failure" treatment. The
  future calendar/journal marker for a Partial is a **check mark with a line through it** ("check-minus" /
  "וי-איקס") — signalling half-done, not failed. Exact tokens are ux-designer's to finalize; the current
  build ships a calm gold placeholder.
- The user never selects a percentage in MVP.
- **Partial carries no numeric weight in MVP** — progress stays binary (a partial Step counts as 0 toward
  `journeyProgress`, as today). A `0.75` analysis weighting remains a research hypothesis only (§12.4).

## 7. Open-week correction

Until the authoritative week boundary closes, the user may freely change a Step's report (any transition
between `unreported` / `completed` / `partially_completed` / `not_completed`, including reversing a
`completed` — §12.2). Every change **appends** to the `reasonLog`/`behaviorLog` (already append-only), so
earlier reasons/explanations are retained as history rather than overwritten; the current status is the
latest entry. Reversing a `completed` does **not** claw back XP in MVP (§12.2). Past (closed) weeks are
simply not surfaced for editing on Home — a product-history convention, not a hard storage lock (§12.3).

## 8. Data requirements

At minimum:

- occurrence ID, Step ID, Journey ID;
- planned date/period and scheduling constraints;
- current status and status timestamps;
- report timestamp and completion timestamp;
- selected reason ID where applicable;
- Partial explanation where applicable;
- whether the report was submitted before week close;
- boundary/time-zone context and event/version ID.

Free text must never enter a cloud AI, DomainEvent, social payload, analytics log, or long-term User Model
without a fresh security/privacy decision. Existing `Other` notes are explicitly on-device-only.

“Read-only after week close” is a product-history rule, not storage immutability. It never overrides
account deletion, user correction rights, or legally required erasure. Deletion must cascade through raw
reports, synchronized replicas, derived review snapshots/proposals, permitted audit records, backups, and
any approved AI processor according to a documented retention/deletion contract.

## 9. Edge cases

- duplicate taps and concurrent reports from multiple devices;
- change after a reward/celebration already fired;
- empty or extremely long required Partial explanation;
- app closes mid-report;
- report submitted at the exact week boundary;
- Journey freezes, completes, is abandoned, or is deleted during reporting;
- legacy Steps without occurrence IDs;
- offline report and later synchronization conflict;
- RTL swipe direction and accessibility alternatives;
- account export/deletion and retention of report history.

## 10. Acceptance direction

Acceptance must prove: one-action completion; the four distinct statuses (§5); optional Not-Completed
reason; **optional** Partial note (never blocking); free correction during the open week with append-only
history retained and **no XP clawback** on reversal; past weeks not editable from Home; idempotent
rewards/events on duplicate/repeated taps; and English/Hebrew LTR/RTL accessibility (buttons always
present, swipe as a supplement only).

## 11. Out of scope

- postponement behavior;
- week closure and Weekly Review UI;
- structured quantitative Partial reporting;
- long-term User Learning;
- reason-taxonomy redesign;
- proactive daily AI replanning.

## 12. Resolved decisions

Closed with the founder 2026-08-10, grounded in the current codebase (Decision D35). The original
questions are preserved verbatim so the reasoning stays legible.

**12.1 — Flexible weekly targets: how represented?**
_Q: pre-created occurrences, dynamically created occurrences, or an aggregate counter?_
**Decision:** as **multiple pre-created Steps** for the week (the existing one-shot `Step` model, grouped by
`stepsByWeek`), each reported independently. This shows as separate rows on Home, which the founder
confirmed is acceptable. No occurrence entity and no "x/y this week" counter row in MVP.
_Rationale:_ Journeys are finite (`durationDays`), so pre-creation is bounded, and per-instance evidence
already lives in `checkIns`/`reasonLog`. A single-row weekly counter (a small, non-occurrence enhancement)
and a true recurrence/occurrence entity are both **deferred to post-MVP**.

**12.2 — Allowed report transitions before week close; audit history?**
**Decision:** **all transitions are allowed** within the open week (including reversing a `completed`).
Every change **appends** to the append-only `reasonLog`/`behaviorLog`, so earlier reasons/explanations are
**retained as history**, never overwritten; the current status is the latest entry. Reversing a `completed`
does **not** claw back XP in MVP (kept forgiving/positive). _Note:_ `checkInStep` is one-way today, so an
"un-report" path is a small addition to build.

**12.3 — Is closed-week immutability absolute?**
**Decision:** **No hard immutability in MVP.** Past weeks are simply not surfaced for editing on Home — a
product-history convention, not a storage lock. Absolute immutability and time-zone-mistake handling are
deferred (no "closed week" state exists in the code today; nothing to enforce against).

**12.4 — Is Partial `0.75` an approved MVP metric?**
**Decision:** **Research hypothesis only.** Progress stays binary (a partial Step counts as 0). Partial is
a distinct non-failure status + signal (event + on-device behavior record); it gets no numeric weight in
any progress/streak/leveling math in MVP. (The `0.75` in the code is an unrelated pace threshold.)

**12.5 — May Weekly Review use Partial free text?**
**Decision:** Yes, but **on-device only.** The optional Partial note may feed the on-device
`reviewWeek`/`AdaptivePlanner`; it must never reach a cloud AI / DomainEvent / social payload / analytics
without a fresh security-privacy decision (matches §8 and the existing G1 on-device-only rule).

**12.6 — Is the free-text Partial explanation mandatory?**
**Decision:** **Optional, not mandatory** (§6). Mandatory text contradicts §2 ("completion is essentially
one action", "reporting exists to improve plans, not increase check-in activity"). It is a short optional
note, on-device only, never social-shared, and included in local export / cascade-deleted with the account
(§12.7). Max length + exact storage detail are an implementation nicety, not a blocker.

**12.7 — Retention and deletion cascades.**
**Decision:** **Already covered by the existing architecture for MVP.** All reporting data (`Step` fields,
`checkIns`, `reasonLog`, `behaviorLog`) lives inside the single encrypted `AppState` blob;
`resetToFirstRun()` / account deletion already clear ciphertext + DEK + in-memory state, and
`exportStateJson()` already includes it. There is no separate report store, cloud replica, audit table, or
AI processor holding this data. The elaborate cascade in §8 becomes relevant only once a backend sync
exists — flagged as **N/A until then**, to be revisited with security-privacy at that time.
