# PRD — Dream Management

Status: **Ready (slice 1) — partially implemented, NOT moved to `Done/`.** Product specification complete;
founder-confirmed 2026-08-10; Coach-ownership model updated 2026-08-11 per Decision Log **D40** (see §0).
First UI slice ships **single-primary** (one primary Dream per Journey); the full many-to-many-with-primary
model is the target, not deferred. **Built 2026-08-13 (surfacing cut only, see F1 in `MVP_Task_List.md`):**
My Journeys → My Dreams nav entry, a read-only "Part of your Dream" card on the Journey detail screen, and a
link-approval card for Journeys not yet linked to a Dream (reuses `linkJourneyToDream`). **NOT built — and
this is this PRD's core mechanism, not a peripheral deferral:** the Coach-led Dream creation/rewording/merge
conversation itself (§5, §7 — the Coach actually forming and persisting Dream wording from a conversation).
Without it there is no way to create a first Dream or edit one; the shipped slice is read-only surfacing of
data that must still be seeded another way. Needs a joint founder design session (open questions remain).

**UPDATE 2026-08-24 — the authoring conversation SHIPPED.** §14's Open Questions section says *None*, so
the design session that line asks for was already answered. `app/src/app/dream-coach.tsx` +
`core/coach/DreamCoachOrchestrator` + `core/dreams/dreamEdit` implement §5 and §7: create, reword,
merge, remove, link and unlink, applied directly as part of the conversation per D40. Entry points are
My Dreams and each Dream's own screen. Every id is validated against what exists before anything is
applied, removal never orphans a running Journey, and a removed Dream is hidden rather than deleted so
a finished Journey keeps its attribution.
Kept in the PRD root, not `Done/`, until that authoring flow ships — see `04_Product/PRD/README.md`'s
Done-tracking rule (a file moves only once its approved/current scope is implemented).
Stage: **MVP**.
Owner: founder + AI product team.
Related: F1 in `../MVP_Task_List.md`, `Onboarding_Questionnaire_PRD.md`, coach-led Journey creation and
editing, `Done/Own_Profile_PRD.md` (immutable; this PRD adds the My Dreams entry point without
rewriting the completed profile PRD), and Decision Log **D40**.

---

## 0. Coach ownership update (Decision Log D40, 2026-08-11)

Founder decision, resolved in the D40 batch: **the Coach owns the Dream layer.** It infers and formulates
Dreams from the ongoing conversation and **may create, edit, or delete a Dream without the user's explicit
approval.** This supersedes every "explicit approval required before a Dream is created/changed" rule
below — those rules were written 2026-08-10 to keep the user in direct control of a persisting action,
before the founder decided the next day that the Dream layer itself should be Coach-owned, matching how a
Dream is already Coach-articulated rather than user-authored (§5's original step 1–4: the Coach asks
questions and proposes wording either way). The user's ability to shape a Dream through conversation is
unchanged — D40 removes a *blocking approval step*, not the user's voice in the conversation that produces
the Dream.

Superseded text is left in place below (§5 step 5, §7's "apply only after explicit approval," §10's "user
exits before approval," and acceptance criteria §11.2/§11.7) and marked inline, per the repository's
preserve-history rule, so the original approval model and why it was chosen remain legible.

Sync invariants (§9's "synchronization conflicts must not produce two primary Dreams," §10's "concurrent
changes on two devices") are **deferred to when a backend exists** (D40) — the invariants stay written as
the target model for that future build, not as MVP scope.

## 1. Purpose and problem

A Dream is the timeless aspiration that gives one or more finite Journeys their direction. Dreams
already exist in the data model and group Journey activity, but users do not have a real way to see,
create, reword, or reorganize them. New Journeys also lack an approved coach-led linking flow.

This feature provides one coherent place to understand the user's Dreams and uses the Coach to make
changes. It must not turn Dreams into tasks, projects, goals to complete, or another progress tracker.

## 2. Product-philosophy fit

- A Dream expresses who the user wants to become; a Journey expresses finite work toward that direction.
- The Coach helps the user articulate meaning instead of asking them to maintain a database.
- The user remains in control: no Dream or relationship change is persisted without explicit approval.
- Multiple Dreams may coexist without implying that the user must actively pursue all of them now.
- Dreams have no deadline, completion state, percentage, reward, or pressure mechanic.

## 3. Competitor references

- [Asana Goals](https://help.asana.com/s/article/get-started-with-asana-goals) connects a higher-level
  objective to the projects that advance it. PushApp adopts the useful hierarchy, but rejects business
  scoring and completion percentages for timeless Dreams.
- [Microsoft Viva Goals](https://support.microsoft.com/en-au/topic/create-objectives-key-results-and-initiatives-with-viva-goals-0587147d-84ed-438f-8a24-5c75f539814c)
  connects objectives to initiatives. PushApp similarly makes the relationship visible while keeping
  Journey execution separate from Dream meaning.
- [Strava Goals](https://support.strava.com/en-us/articles/15401694-goals-on-the-strava-app) shows how a
  high-level direction can anchor measurable activity. PushApp does not adopt its target-and-deadline
  model because a Dream is never completed.
- [Finch Goals](https://help.finchcare.com/hc/en-us/articles/37779940291213-Creating-and-Completing-Goals)
  makes personal intentions easy to find and manage. PushApp keeps comparable accessibility but routes
  meaning-changing actions through the Coach rather than a direct CRUD form.

## 4. Information architecture and entry points

### 4.1 My Dreams

Add a **My Dreams** entry under the authenticated user's profile area in Settings. The completed Own
Profile feature remains unchanged; implementation adds a new navigation entry owned by this feature.

Also provide:

- an entry from My Journeys to My Dreams;
- a Coach quick reply equivalent to **“Add a new Dream”**;
- contextual links from a Journey to its linked Dreams.

There is one visible Dreams list. Do not divide it into active, focus, later, completed, or archived
sections.

### 4.2 Dream detail

Each Dream shows:

- its Coach-approved wording;
- every Journey linked to it, across lifecycle states;
- each Journey's own lifecycle status and existing summary information;
- an action to discuss the Dream with the Coach.

A Journey linked to multiple Dreams appears under every linked Dream. Do not add a primary/secondary
badge to the user interface.

Do not show Dream progress, a completion percentage, target date, streak, reward, or “achieved” state.

## 5. Coach-led Dream creation

1. The user starts from My Dreams, the Coach quick reply, onboarding, or Journey creation.
2. The Coach asks enough questions to understand the aspiration and its meaning.
3. The Coach proposes structured Dream wording and, when relevant, Journey links.
4. The user may continue the conversation and ask for changes.
5. **Superseded by D40 (2026-08-11) — see §0.** Original rule: "The Dream is created only after the user
   explicitly approves the final proposal." **Current rule:** the Coach creates the Dream directly, as part
   of the conversation, once it has formed the wording — there is no separate approval gate. The user still
   sees the Coach-approved wording and can keep discussing/redirecting it (§7), just not as a precondition
   to creation.

The user does not create a Dream through a direct text form. The Coach constructs the Dream and, per D40,
persists it directly; the user is not required to review and approve it first, though the resulting wording
is always visible in My Dreams and open to discussion.

## 6. Journey linking rules

- Every newly created Journey must be linked to at least one Dream before final approval.
- One linked Dream is stored as the Journey's **primary relationship** for deterministic grouping and
  compatibility; the Journey may also have any number of additional Dream relationships.
- The primary relationship is an internal/data concept. It is not marked in My Dreams.
- One Dream may contain any number of Journeys.
- Linking or unlinking a Journey never edits the Journey's name, Steps, schedule, history, status, or
  reports.
- An already-active Journey may be relinked without recreating or restarting it.
- Journey creation should offer existing Dreams first. If none fits, it opens the short Coach-led Dream
  creation flow and returns to the Journey proposal after approval.
- The final Journey proposal must show all Dream relationships before the user approves it.

Legacy Journeys without a Dream remain usable. When the user next edits one or discusses it with the
Coach, the Coach proposes a relationship; no legacy Journey is silently assigned.

## 7. Rewording and reorganizing Dreams

There are no direct edit, merge, remove, or delete buttons. The user discusses the desired change with
the Coach. The Coach may propose:

- rewording a Dream;
- linking or unlinking Journeys;
- changing the primary Dream relationship;
- merging overlapping Dreams;
- removing a Dream from the visible list.

**Superseded by D40 (2026-08-11) — see §0.** Original rule: "Before persistence, show one structured
proposal containing the resulting Dream wording and all affected Journey relationships. Apply it atomically
only after explicit approval." **Current rule:** the Coach applies the resulting wording and affected
Journey relationships directly, atomically, as part of the conversation — no separate approval step blocks
it. Cancelling or leaving the conversation before the Coach reaches a decision makes no change (nothing is
committed mid-conversation; the atomicity guarantee is unchanged, only the approval gate is removed).

A material rewording may cause the Coach to ask whether existing Journey links still fit, but it must
never modify the Journeys themselves automatically.

### 7.1 Merge

Merging preserves every Journey relationship from both Dreams, removes duplicate relationships, chooses
one primary relationship where necessary, and removes the superseded Dream from My Dreams. Journey
history remains unchanged.

### 7.2 Remove from My Dreams

Removing a Dream means the user no longer wants it in the visible list. It is not presented as completed
and does not award anything.

- The Coach asks what changed and what should happen to its linked Journeys.
- Secondary links to the removed Dream may be removed without changing the Journey.
- If it is an active Journey's primary or only Dream, the proposal must reassign it to another approved
  Dream or create a replacement Dream before removal can be approved.
- Frozen, completed, and abandoned Journeys retain immutable historical attribution internally even when
  the Dream is no longer visible.
- The removed Dream disappears from My Dreams everywhere.

There is **no Dream history/archive screen in MVP or in the future vision**. Internal retention exists
only for referential integrity, audit, and historical Journey rendering. If the user later expresses the
same aspiration, the Coach may propose restoring the existing Dream relationship or creating a newly
worded Dream; either requires normal explicit approval.

## 8. Privacy and sharing

- Dreams are private account data by default.
- A friend or Ally seeing a shared Journey does not thereby gain access to the owner's Dream list or the
  names of other Journeys attached to that Dream.
- A Dream title must not be added to Friend Profile, Support Circle payloads, notifications, analytics,
  or social surfaces unless a later dedicated PRD explicitly defines consent and visibility.
- Account deletion deletes the user's Dreams and their relationship records together with the account,
  subject only to already-approved recipient-owned message retention rules.

## 9. Technical and data requirements

The current model supports only `Journey.dreamId` and `Dream.journeyIds`. Implementation must migrate to
one authoritative relationship model capable of many-to-many links while retaining a deterministic
primary Dream per Journey.

Claude must choose the exact schema and migration, subject to these invariants:

- stable IDs, not titles, identify relationships;
- every new Journey has at least one valid visible Dream at approval time;
- at most one relationship per Journey is primary;
- an approved change to Dreams and relationships commits atomically;
- duplicate links are impossible;
- deleting or archiving a relationship cannot cascade-delete a Journey;
- old one-Dream data migrates losslessly, with its existing Dream as primary;
- unknown or missing linked IDs fail safely and can be repaired through the Coach;
- synchronization conflicts must not produce two primary Dreams or a Journey with an invalid link.

Dream creation and editing should use structured Coach output validated by framework-free domain logic.
The UI must never directly trust or persist free-form model output.

## 10. States and edge cases

- First run with no Dreams: explain the concept briefly and open the Coach to create the first Dream.
- No network / Coach unavailable: show a recoverable unavailable state; do not create a partial Dream.
- Empty, extremely long, duplicate, or near-duplicate wording: the Coach clarifies or proposes a merge;
  domain validation enforces safe length and non-empty normalized content.
- **Superseded by D40 (2026-08-11) — see §0.** Original edge case: "User exits before approval: discard the
  draft or retain it only as an explicitly labeled local draft; never show it as an approved Dream."
  **Current rule:** since there is no separate approval step, the equivalent case is the user exiting
  **mid-conversation, before the Coach has formed a decision** — nothing is created in that case, so there
  is no draft to discard or label; the conversation simply has not yet produced a Dream.
- Concurrent changes on two devices: detect version conflict, reload current relationships, and ask for
  confirmation again rather than silently overwriting.
- Journey becomes completed, frozen, or abandoned during a Dream conversation: rebase the proposal onto
  current state before the Coach persists it (D40: there is no separate approval step to rebase against;
  the rebase happens against current state at the moment the Coach commits).
- Removing the last visible Dream while an active Journey depends on it: block final approval until a
  valid replacement relationship is included.
- Duplicate Journey display under the same Dream is prevented even if it has multiple relationship
  records due to corrupt legacy data.
- Account deletion, language change, RTL, long translations, accessibility text scaling, loading,
  empty, error, and retry states must be supported.

## 11. Acceptance criteria

1. The user can open My Dreams from their profile area and from My Journeys.
2. **Superseded by D40 — see §0.** Original: "The user can begin a Coach conversation to add a Dream and
   nothing persists before final approval." **Current:** the user can begin a Coach conversation to add a
   Dream; the Coach persists it directly once formed, without a separate approval step; nothing persists
   mid-conversation before the Coach reaches that point.
3. Every newly approved Journey is linked to at least one Dream. (Journey approval itself is unchanged by
   D40 — only Dream creation/edit/delete lost its own separate approval gate.)
4. A Journey may be linked to multiple Dreams and appears under each one without an extra badge.
5. One internal primary Dream relationship exists for deterministic behavior.
6. The Coach can propose rewording, relinking, merging, and removal without modifying Journey contents.
7. **Superseded by D40 — see §0.** Original: "All affected changes are previewed and applied atomically
   only after explicit user approval." **Current:** all affected changes are applied atomically by the
   Coach as part of the conversation; there is no separate preview-then-approve gate.
8. A removed Dream disappears from the visible list and no Dream history/archive screen exists.
9. Removing or merging a Dream never deletes, resets, or silently edits a Journey.
10. Friends and Allies do not receive Dream data merely because a Journey is shared with them.
11. Existing single-Dream and unlinked legacy Journeys continue to work and migrate without data loss.
12. The experience works in English/Hebrew, LTR/RTL, light/dark, empty/error/loading, and accessibility
    states.

## 12. Out of scope

- a separate Goal object or renaming Dream to Goal;
- Focus/Later categories;
- Dream completion, progress, deadlines, rewards, or scoring;
- direct form-based Dream creation or CRUD controls;
- a Dream history, archive, or deleted-items screen, now or in the future vision;
- public or friend-visible Dream lists;
- automatically changing an active Journey when its Dream changes;
- **Superseded by D40 — see §0.** Original: "automatically creating, linking, merging, or removing Dreams
  without approval" was out of scope. **Current:** this is now IN scope and approved — the Coach may
  create, edit, link, merge, or remove a Dream without a separate user-approval step (D40). What remains
  out of scope is the Coach silently changing an **active Journey's contents** (Steps, schedule, status) —
  that boundary is unchanged.

## 13. Related tasks and implementation handoff

- **F1:** this PRD is the product specification for Coach-owned Dream creation/editing and coach-suggested
  Journey linking (D40: the Dream side no longer requires user approval; Journey linking/approval is
  unchanged).
- **Onboarding:** candidate Dreams produced from onboarding are created by the Coach the same way (D40) —
  no separate approval flow.
- **Journey creation/editing:** add relationship selection and the validated many-to-many payload; do not
  introduce a second Dream creation mechanism.
- **Own Profile:** add navigation to My Dreams without editing `Done/Own_Profile_PRD.md`.
- **Home/Journeys:** replace single-`dreamId` assumptions with the authoritative relationship model while
  preserving deterministic primary grouping.

## 14. Decision classification

### Approved

All requirements in this PRD, including Coach ownership of creation/editing/deletion **without a user
approval gate** (D40, 2026-08-11 — supersedes the original 2026-08-10 "explicit approval" model recorded
and marked throughout this file, see §0), many-to-many relationships, one internal primary relationship
(first UI slice single-primary), no visible primary marker, and no history/archive screen.

### Future Vision

No additional Dream-management surface is currently approved. Future work may improve Coach reasoning or
presentation without changing the product invariants in this document. Cross-device sync invariants (§9,
§10) are Future Vision until a backend exists (D40).

### Open Questions

None.
