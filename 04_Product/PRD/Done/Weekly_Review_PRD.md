# PRD — Weekly Review

Status: **Implemented** — the §13 blocking questions were resolved by the founder 2026-08-11 (Decision Log
**D40**: week-close proposal, never-empty next week, forward-only apply, 48h approval window); built inside
the D40 batch (real week-boundary trigger `weekGate`, a real `weekly-review.tsx` screen); closed 2026-08-13
with 4 coverage tests (flag-off inert, empty-week, 48h expiry, late-approval rebase). **Two-layer split is
Decision Log D43:** the proposed plan applies only on **explicit user approval within its 48h window**,
never silently/automatically — a pending weekly proposal owns the plan for that window, but daily/automatic
apply never happens. **Gating — CORRECTED 2026-08-14.** This header previously read: *"the whole feature is
`adaptiveEnabled`-gated, so it stays dormant in plain production until that flag is on."* That was true when
written and is **no longer true**. The founder classified it as an implementation/activation gap rather than
a specification gap and had the accidental dependency removed, so the review now runs in plain production:
the week-close **summary**, the never-empty **next week**, and the **48h lifecycle** (generate → pending →
expire/approve/dismiss) all run with **no flag and no behaviour model**. Only the **Step-plan proposals**
(`computeJourneyProposals`) and the approval **rebase** still require a behaviour model, so on a plain build
a review is generated with `proposals: []` and the screen renders its no-changes branch. The separate daily
tactical auto-apply (D43) remains gated and did **not** change. Nothing about consent changed: the plan still
applies only on explicit user approval inside the 48h window, never silently.
*(Edited under a one-time founder authorization, 2026-08-14, expressly to correct a statement that had become
factually false. Files in `Done/` remain immutable — this is not a precedent, and the superseded sentence is
quoted above rather than deleted.)*
Prior state (2026-08-10): imported founder draft, Open Questions —
preserved in §13 alongside how each question was closed.
Stage: **MVP**.
Owner: founder + AI product team.
Source: mobile-authored “Daily Step Reporting & Weekly Review” draft, 2026-08-10; closed 2026-08-11 (D40).
Related: `Daily_Step_Reporting_PRD.md`, `Step_Postponement_PRD.md`,
`Done/Week_Boundary_Preference_PRD.md`, `Smart_Notification_Timing_PRD.md`,
`Communication_Style_Profile_PRD.md`, `Future/User_Learning_PRD.md`, coach-led Journey editing, and
Decision Log **D40**.

Implementation constraint: `Done/Week_Boundary_Preference_PRD.md` is implemented and immutable. It
must not be edited or re-scoped as part of Weekly Review. This feature consumes its effective/materialized
boundary. Any additional backend, scheduling, or locking need is specified here as a consumer requirement.

---

## 1. Purpose

Weekly Review converts one completed week's evidence into a concise understanding and, only when useful,
a proposed plan for the next week. Analysis may run automatically; meaningful Journey changes never apply
without explicit user approval.

## 2. Product principles

- Daily reporting collects signals; strategic adaptation happens at the weekly boundary.
- Unreported is preserved as distinct raw evidence even when counted as non-completion for analysis.
- Reality is used to improve the plan, never to blame the user.
- Explanations are concise, transparent, and actionable.
- The previous valid plan remains active while a proposal awaits a decision.

## 3. Competitor references

- [Strava Training Log](https://support.strava.com/en-us/articles/15402077-training-log) presents weekly
  activity summaries while preserving individual evidence.
- [Strava suggested goals](https://support.strava.com/en-us/articles/15401694-goals-on-the-strava-app)
  allows a suggested target to be accepted or customized rather than silently imposed.
- [Strava Focus](https://support.strava.com/en-us/articles/15401527-focus-setting-on-strava) uses recent
  activity history to generate weekly recommendations while retaining user control over focus details.

PushApp's distinction is analysis of the gap between a personal Journey plan and reality, followed by an
explicit approval contract for adaptations.

## 4. Boundary and countdown

`Done/Week_Boundary_Preference_PRD.md` is the sole authority for the user's week. This feature shows the
effective close time/countdown using that materialized boundary and local time zone; it does not define a
separate boundary per Journey.

## 5. Week close and locking

At the boundary:

1. the week closes;
2. its reports become read-only under the source proposal;
3. raw Unreported occurrences remain identifiable but contribute as non-completion to analysis;
4. Weekly Review is queued/runs;
5. the next weekly plan continues or a proposal is generated.

## 6. Review inputs

- Completed, Partially Completed, Not Completed, and Unreported occurrences;
- approved structured reasons;
- allowed explanations subject to the privacy decision in §13;
- postponement counts/timing/patterns;
- planned schedule/constraints and report timing;
- relevant Journey history;
- Journey lifecycle state at close.

## 7. Journey-level analysis

Evaluate whether workload, timing, frequency, Step size, recurring obstacles, repeated postponement, partial
progress, or consistent over-performance suggest that next week's plan should change. Do not create a
long-term user fact here; cross-Journey hypotheses belong to the Future User Learning feature.

Weekly Review is one user-level experience, not a separate screen per Journey. It begins with an overall
week summary and then uses a distinct section for every Journey that was active during the reviewed week.
This preserves Journey-specific evidence, recommendations, and diffs while producing one final weekly plan.

A Journey frozen during the reviewed week is mentioned in the summary and excluded from next-week changes.
A Journey that remained frozen for the entire reviewed week does not appear. If resumed during a later
week, only its active period is analyzed; frozen days are never interpreted as non-completion.

## 8. Outputs

### Screen open: past-week summary (D40)

The Weekly Review screen always opens with a **past-week summary** before any proposal or "no change"
output: how many Steps were done ("X Steps done"), and a note of any Journey that was frozen during the
reviewed week (per §7, a frozen Journey is mentioned in the summary and excluded from next-week changes).
This summary is shown regardless of whether a plan change follows.

### No change

Weekly Review still opens and shows the overall summary, encouragement, useful Journey-level insights, and
the unchanged upcoming plan. The experience is designed to host additional approved weekly actions in the
future, such as optional Journey recommendations, but those are not part of this MVP PRD.

### Never an empty next week (D40)

Resolves the former §13 blocking question #5 (empty-state Review). Next week must never present the user
with nothing to do. When the reviewed Journeys yield no upcoming Steps, Weekly Review falls back, in order,
to the first that applies, so the user is always kept in motion:

1. surface remaining Steps from the user's other active Journeys (Journeys not part of this review's
   analysis but still active);
2. if none exist, show a coach CTA to build a plan (opens the Coach, does not itself create a Journey);
3. if the user has no active Journeys at all, offer a Dream-based suggestion — a fitting existing Dream, or
   a Dream not yet addressed by an active Journey.

This fallback never fabricates a Journey or Step on the user's behalf; every path above either surfaces
already-real data or hands off to the Coach, which builds any new Journey through the normal coach-led
creation flow (see `Dream_Management_PRD.md`, D40 — the Coach owns the Dream layer itself, but creating a
new Journey from a Dream still goes through the existing Journey-creation approval the user already
controls).

### Change proposed

Show:

1. what the prior plan expected;
2. what happened;
3. what the system inferred at Journey level;
4. the proposed change;
5. the resulting upcoming plan.

The user can:

- Approve the complete upcoming plan;
- keep selected proposed changes out of the draft;
- mark selected changes for discussion;
- open the AI Coach and explain what is wrong or what should change.

Coach conversation never mutates a Journey directly. It updates the interpretation/context, builds a new
complete structured proposal, and returns to a final review. Closed-week report history is not rewritten;
the user's correction is stored as Journey context and the recommendation is regenerated from it.

All selected changes remain a draft until the user approves the complete final weekly plan. Application is
atomic: either every validated diff is applied or none is. The confirmation shows exactly what changes and
what remains unchanged.

### Communication adjustments

Weekly Review may include one or more exact 15-minute Journey reminder-time proposals produced by
`Smart_Notification_Timing_PRD.md`. Each is independently selectable but remains part of the one final
atomic weekly-plan approval.

The Review never recommends or applies a particular notification style. It may ask whether the user wants
to review how PushApp communicates and link to Settings → Communication Style. The scripted style screen is
separate, manual, and account-wide. Returning preserves the Weekly Review draft; the user may apply timing
changes, style changes, both, or neither.

## 9. Pending proposal

Weekly Review opens automatically on the first app entry after week close. The user may minimize it but
cannot permanently dismiss it without choosing an outcome.

- For the first 48 hours, Home shows a prominent top card with a Continue CTA, Journey count, whether
  changes are proposed, and time remaining in the week.
- After 48 hours, it becomes a compact persistent top card until resolved.
- At most one gentle external reminder may be sent after 24 hours when notification permission/preferences
  allow it; never remind daily.
- The previous valid plan is instantiated as a temporary baseline so the user is never left without Steps.
  This does not imply rejection of the proposal.
- Reports completed while the proposal waits remain authoritative.

**Retention window (D40, 2026-08-11):** a proposed plan-change is retained for at most **48 hours** from
generation. This is the same 48-hour boundary already used above for the Home card's prominent-vs-compact
presentation — it now also bounds the proposal's validity: if the user has not resolved it within 48 hours,
the draft expires and the previous valid plan (already the active baseline per the point above) simply
continues; nothing the user reported is lost, and no plan is force-applied. This does not replace the
"another week closes first" rule below, which still covers the separate case of a full week elapsing
unresolved.

Before late approval (i.e., within the 48-hour window), regenerate/rebase the proposal against current
reality: do not create occurrences on past days, never rewrite already-reported occurrences, and apply
changes only to future occurrences. Show the refreshed complete plan and require final approval. All
resulting future changes still apply atomically. Applying an approved plan is always **forward-only**:
already-reported/past data is immutable and is never altered by a later approval (D40; reaffirms the
closed-week immutability already stated in §5 and §10).

If another week closes first, mark the older Review as not completed, preserve that history, and generate
one current Review from the newly available evidence. Never stack two competing actionable proposals.

## 10. Failure and recovery

If analysis/proposal generation fails, keep the current plan active, show no fabricated insight, retry
idempotently, and provide a non-blocking status. Multiple app/device opens must not generate competing
proposals for the same Journey/week.

Journey-level conclusions are hypotheses, not facts. The MVP presentation must show the evidence behind a
proposal and let the user reject/dismiss it. Stored analysis is invalidated or regenerated when permitted
source records are corrected or deleted, expires with an approved retention rule, and never enters social
payloads or unrelated personalization.

## 11. Data requirements

- immutable review-period ID and materialized boundary/version;
- input snapshot/version and source occurrence IDs;
- structured analysis result separate from user-facing copy;
- no-change/proposal outcome;
- proposed diff and prior-plan reference;
- approval/decline/discuss status and timestamps;
- activation version/idempotency key;
- minimal audit trail explaining what the user approved.

## 12. Out of scope

- long-term User Learning and confidence model;
- KPI definition;
- silent plan changes;
- advanced permission boundaries for deleting/splitting/changing Journey goals;
- redefining week-boundary behavior;
- daily tactical recovery.

## 13. Blocking questions — resolved (Decision Log D40, 2026-08-11)

The original nine questions (imported draft, 2026-08-10) are preserved below for traceability, each with
its resolution. This closes the PRD to **Ready** (see status header).

1. **Does MVP review run locally on next app open, through a cloud AI/backend, or as a deterministic local
   analysis with optional AI phrasing?** **Resolved (D40):** hybrid. Analysis stays **on-device
   deterministic**; an **optional LLM narration** layer may phrase the result, gated behind the existing
   **live-coach flag** (`featureFlags.liveCoach`) — so this reuses the already-approved live-coach
   consent/data-flow boundary rather than opening a new cloud path. Without that flag, the deterministic
   analysis alone drives the screen.
2. **Which free text may be analyzed: Partial explanation, Not Completed `Other`, both, or neither?**
   **Resolved (D40): neither.** Free text is **not analyzed**, whether from the Partial explanation or the
   `Other` reason note; both remain on-device-only, exactly as today, and are excluded from analysis inputs
   in §6.
3. **Is closed-week immutability absolute, including accidental reports/time-zone errors?**
   **Resolved (D40): yes — forward-only.** Already-reported/past data is immutable; a plan change only ever
   applies to future occurrences (see the new §9 "forward-only" note). No mechanism edits a past report,
   including to correct a time-zone/accidental-report error; a correction is a new future-facing action, not
   a rewrite of history — consistent with §8's "Closed-week report history is not rewritten" rule.
4. **What exact Journey changes may the MVP proposal contain?** Answered by the existing §7 categories
   (workload, timing, frequency, Step size, and the recurring-obstacle/partial-progress/over-performance
   triggers) — D40 did not add or remove a change category, so this is closed against the spec already in
   §7/§8, not a new decision.
5. **Define the concise empty-state Review when there are no active Steps/data, and the handling of a
   Journey that completes or is abandoned exactly at close.** **Resolved (D40):** see the new §8 "Never an
   empty next week" section — the fallback chain (other Journeys' remaining Steps → coach CTA → Dream-based
   suggestion) is the empty-state answer. A Journey that completes or is abandoned exactly at close is
   excluded from next week's plan the same way a completed/abandoned Journey is excluded any other week;
   no special-cased timing race is introduced.
6. **Before any cloud/AI path, approve an explicit data-flow contract…** **Resolved (D40) by reuse:** the
   optional LLM narration in #1 above rides the **existing live-coach gate**, which already carries its own
   approved data-flow boundary (consent, provider, region, fallback). No new cloud path is opened by Weekly
   Review itself, so no separate contract is needed here; if the live-coach gate's terms change, that
   change governs this feature automatically.
7. **Define retention/deletion for input snapshots, structured analysis, user-facing proposal copy, audit
   history, backups, sync replicas, and processors.** **Resolved (D40): retention rides the encrypted
   blob.** Like the rest of the app's on-device state, Weekly Review data lives in the single encrypted
   `AppState` blob — cascade-deleted via `resetToFirstRun()`/account deletion and included in
   `exportStateJson()`. No separate retention schedule or processor list is needed until a backend/sync
   layer exists (see `11_Engineering_Bible/Sync_Manifest.md`, which already lists `weekReviewAt` + the
   pending-proposal snapshot as **Sync** once a backend lands).
8. **Define expiry/invalidation of Journey-level hypotheses after correction/deletion.** Not newly touched
   by D40; already answered by the existing §10 rule ("Stored analysis is invalidated or regenerated when
   permitted source records are corrected or deleted, expires with an approved retention rule") plus the
   new §9 48-hour retention window, which is the concrete expiry rule that rule referred to.
9. **Define a frozen boundary/time-zone context and trusted clock…** Not a D40 topic — this is explicitly
   owned by `Done/Week_Boundary_Preference_PRD.md` (see the Implementation constraint at the top of this
   file). Weekly Review only **consumes** that boundary; the IANA/travel/multi-device work is already
   tracked there as deferred (D33), not blocking here.
