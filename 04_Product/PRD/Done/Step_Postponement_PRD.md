# PRD — Step Postponement

Status: **Implemented** — blocking questions closed with the founder 2026-08-10 (see §11, "Resolved
decisions"), Decision **D37**; built commit `11dd409` (per-occurrence one-shot postpone reminder, fast
reason-free default path, day-crossing shorten rule down to a 30-minute floor). The **required update to
`../Miss_Recovery_PRD.md`** (§7) is done — see the "[Superseded for MVP by D37 …]" annotations in that
file. **Deferred (§5/§11.3, explicitly post-MVP):** the supportive AI-Coach intervention on repeated
same-occurrence postponement — needs `featureFlags.intervention` + the Coach; `postponeCount` is persisted
per occurrence now so the signal exists, but no threshold fires and no Coach prompt surfaces yet.
Stage: **MVP**.
Owner: founder + AI product team.
Source: mobile-authored “Daily Step Reporting & Weekly Review” draft, 2026-08-10.
Related: `Daily_Step_Reporting_PRD.md`, `Weekly_Review_PRD.md`, J4 reminder management, Journey editing,
and `../Miss_Recovery_PRD.md`.

Boundary dependency: `Week_Boundary_Preference_PRD.md` is an externally implemented source of truth.
Postponement consumes its materialized week boundary and must not change that PRD. Cross-day/week behavior
must adapt to the boundary contract already delivered by Claude.

---

## 1. Purpose

Postponement should help a Step fit reality without silently pretending that its original commitment was
met. The common action must be fast, while repeated postponement becomes a supportive signal.

## 2. Competitor reference

[Finch](https://help.finchcare.com/hc/en-us/articles/37779940291213-Creating-and-Completing-Goals)
allows users to snooze, pause, or edit goals directly. PushApp adds explicit scheduling constraints,
pattern capture, and a supportive path to Journey adaptation.

## 3. Proposed MVP flow

- The common path is **fast and reason-free**: one tap = “remind me again in two hours” (§11.2). The user
  may instead pick a specific time, and may optionally add a reason — a reason is **never required** to
  postpone.
- Postponement schedules a **per-occurrence one-shot reminder** for THIS Step at the postponed-until time,
  independent of the Journey's recurring reminder (§11.4). It does not retime the whole Journey.
- Postponement count, timestamps, and the current postponed-until value are stored per occurrence
  (on-device). **“Postponed” is an action, not a terminal status** — the Step stays Unreported (§11.1).
- The user later submits a final report or postpones again.
- **Any final report clears the pending one-shot.** Done, **Partial**, and Couldn't are all final reports
  (founder 2026-08-10: a Partial is a final report of execution), so each cancels the pending postpone
  reminder. Only re-postponing reschedules it. (§11.6a)
- If no final report exists at week close, the occurrence remains raw Unreported and is interpreted by
  Weekly Review according to that PRD.

## 4. Scheduling constraints

### Day-specific occurrence

Postponement normally stays within the valid day. Crossing its boundary requires a clear warning that the
original day's commitment will not count as completed on schedule. The app never silently moves it to a
different day while preserving the original commitment as met.

**Default-2h day-crossing rule (founder 2026-08-10, §11.6c):** if the fixed 2-hour default would land on the
next day, **shorten** the interval so the reminder still fires **today**, shortening **down to a 30-minute
minimum, never less**. If even 30 minutes from now already crosses into the next day (i.e. less than 30
minutes remain in the day), tell the user that **no further reminder can be created today** (and offer
let-go or pick-a-time). This keeps a day-specific commitment's nudge on its own day. Concretely, with
`maxToday = endOfLocalDay − now`: `≥ 2h → 2h`; `30min ≤ maxToday < 2h → maxToday` (shortened); `< 30min →
block with the "no reminder today" message`.

### Flexible weekly occurrence

Postponement may move it to another valid day within the open week, subject to the Journey's constraints
and remaining valid slots.

## 5. Repeated postponement (deferred; count persisted in MVP)

The supportive AI-Coach intervention on repeated same-occurrence postponement is **deferred to post-MVP**
(§11.3): it depends on the intentionally-off intervention engine (`featureFlags.intervention`) and on the
Coach. MVP **persists `postponeCount` per occurrence** so the signal exists and Weekly Review (or a later
intervention) can use it, but **no threshold fires and no Coach prompt is surfaced in MVP**. If a threshold
is later chosen, the count is meaningful **per occurrence** (not per day or per week) — “this specific thing
keeps slipping.” This removes the earlier conflict with the POC's deliberately-unspecified threshold.

## 6. User-initiated editing

Relevant negative signals may offer “Adjust your Journey,” opening the existing coach-led Journey edit
flow. The product does not automatically change the Journey after a postponement.

## 7. Existing-decision conflicts — resolved (require a Miss_Recovery update)

Resolved with the founder 2026-08-10 (§11). Each resolution that changes existing behavior requires
updating `../Miss_Recovery_PRD.md` before or alongside build:

- **Reason on Postpone → now OPTIONAL**, with a fast reason-free path (§11.2). Supersedes Miss_Recovery's
  "reason required on Postpone." → update Miss_Recovery.
- **Retiming → now per-occurrence** (a one-shot reminder for the Step, §11.4). Supersedes the current
  Journey-level reminder retiming for the postpone path. → update Miss_Recovery / its reminder note.
- **Escalation threshold → deferred** (no threshold in MVP; only the count is persisted, §11.3). No
  conflict remains.
- **`Other` reason free text stays on-device-only** and never flows to Weekly AI analysis. Unchanged.

**NOTE:** `../Miss_Recovery_PRD.md` is currently in a locally-modified (Codex) state. The founder
aligns/commits it first; then we apply these updates — we never overwrite it.

## 8. Data requirements

- occurrence, Step, and Journey IDs;
- postpone action ID/version for idempotency;
- previous and requested reminder time;
- effective postponed-until time;
- local calendar day and authoritative week boundary;
- postponement count and timestamps;
- constraint evaluation result;
- intervention surfaced/dismissed/opened outcome.

Operational scheduling data must be separated from analytics. Raw timestamps and responsiveness events
may be retained only at the minimum granularity and duration required for reminder delivery and the
approved weekly pattern analysis. They are excluded from social payloads and third-party engagement
analytics by default, and must be covered by export/deletion.

## 9. Edge cases

- two-hour default crosses the day/week/Journey end;
- chosen time is in the past or during DST missing/repeated time;
- reminder permission denied/revoked;
- no valid time remains;
- repeated taps or concurrent devices schedule duplicates;
- Journey freezes/completes/is abandoned/deleted;
- occurrence receives a final report while a reminder is queued;
- app remains offline across the requested time;
- coach unavailable after the third postponement;
- week closes while the postponement sheet is open.

## 10. Out of scope

- reason-taxonomy redesign;
- automatic Journey modification;
- Weekly Review analysis/UI;
- reminder management for the entire existing Journey (J4).

## 11. Resolved decisions

Closed with the founder 2026-08-10, grounded in the current codebase (Decision D37). Original questions
preserved verbatim so the reasoning stays legible.

**11.1 — Is Postponed a status or an action?**
**Decision:** an **action**, not a terminal status. The Step stays `unreported` (consistent with the code —
`postponeStep` changes no field today — and with the four statuses in `Daily_Step_Reporting_PRD.md` §5). The
UI shows a lightweight "postponed to <time>" affordance when a `postponedUntil` exists; it is not a fifth
status in the status enum.

**11.2 — Does Postpone require a reason?**
**Decision:** **reason OPTIONAL, with a fast one-tap reason-free path** ("remind me in two hours" / pick a
time). Matches §1 (the common action must be fast) and the parallel Partial-note decision (D35.6). This
**supersedes Miss_Recovery's "reason required on Postpone"** → that PRD must be updated (§7).

**11.3 — Third same-day postponement threshold + count reset?**
**Decision:** the Coach intervention is **deferred to post-MVP** (depends on the off `intervention` engine +
the Coach). MVP **persists `postponeCount` per occurrence** only; no threshold fires. If a threshold is later
chosen, the count is **per occurrence** (not per day/week). Removes the POC-threshold conflict.

**11.4 — Per-occurrence retiming for MVP?**
**Decision:** **Yes** — postpone schedules a **per-occurrence one-shot reminder** for the Step at
`postponedUntil`, layered on top of (and independent of) the Journey's recurring reminder. This is the
correct semantics for "remind me about THIS step later" and **supersedes the current Journey-level retiming**
for the postpone path (§7). It is the heaviest part of the build (touches the reminder scheduler; relates to
J4). It does not require rewriting the reminder model — it adds a one-shot alongside the existing rules.

**11.5 — Retention / granularity / deletion.**
**Decision:** **already covered for MVP** by the single encrypted `AppState` blob (postpone count/timestamps
on-device; `ReasonEntry` on-device with `note` only for `other`; events carry ids only). Cascade-deleted via
`resetToFirstRun()`/account deletion and included in `exportStateJson()`. Excluded from social payloads and
third-party analytics (no such pipeline exists). Intervention-response telemetry is **N/A until the
intervention engine ships** — revisit granularity/retention with security-privacy then.

**11.6 — Implementation decisions (founder 2026-08-10).**
- **(a) Partial CANCELS the pending reminder** — a Partial is a *final* report of execution, so it clears the
  one-shot exactly like Done/Couldn't. (Overrides the earlier "keep on Partial" suggestion.)
- **(b)** The **2-hour default is fixed**; the user may instead **pick the exact time** the reminder fires.
- **(c) Day-crossing shorten rule** — see §4: if the 2h default would cross into the next day, shorten to keep
  the reminder today, down to a **30-minute floor**; if even 30 minutes crosses the day, tell the user no
  further reminder can be created today.
- **(d) Architecture** — a pure helper (`core/util/postpone.ts`) + orchestration in `AppCore`, **not** a
  dedicated engine (minimal surface, consistent with the existing Miss-Recovery slice).
