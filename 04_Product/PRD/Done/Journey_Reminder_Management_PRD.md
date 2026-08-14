# PRD — Journey Reminder Management

Status: **Implemented (Off/Fixed slice)** — resolved by the founder 2026-08-11 (Decision Log **D40**); prior:
Approved 2026-08-10. **D40 resolution:** the **Off/Fixed** per-Journey reminder view/edit is built (2026-08-12,
commit `b2d4008`: `JourneyReminderCard` + `ReminderRule.mode` + the creation wizard now creates a **managed**
Fixed rule) and this is this PRD's current shipped scope. **Smart mode is DEFERRED** as a distinct later
phase — it needs Weekly Review + the separate `Smart_Notification_Timing_PRD.md` engine (not yet built; a
`'smart'` enum exists but is non-selectable, shown "Coming soon"). The Active-Hours "needs attention /
disable-on-conflict" flow is **dropped**: account Active Hours now **clamps** a reminder into the window
(D40), it does not disable it.
Stage: **MVP**.
Owner: founder + AI product team.
Related: `User_Active_Hours_PRD.md`, `Smart_Notification_Timing_PRD.md`,
`Step_Postponement_PRD.md`, and J4 in the MVP task list.

---

## 1. Purpose

A Journey owner must be able to view, edit, disable, and repair reminder settings after Journey creation.
The feature owns user control and validation; smart learning is specified separately.

## 2. Entry point

Journey detail contains a **Reminders** row/action showing the current state: Off, Fixed, Smart, Disabled
by permission, or Needs attention. Opening it shows the complete Journey reminder configuration.

## 3. Modes

### Off

No Journey reminder is scheduled and no timing learning occurs.

### Fixed

The user selects enabled days and an exact local time. PushApp never moves it automatically. Fixed reminders
may coexist with the low-frequency aggregate smart notification only when daily caps and Active Hours allow.

### Smart

The user selects:

- enabled days;
- either one relevant time window for all enabled days or separate windows per day;
- an initial preferred/anchor time within each window.

Smart timing analyzes each Journey independently and proposes changes through Weekly Review. No learned
change applies without approval.

## 4. Validation

- Every fixed time and smart window must be fully inside the effective account Active Hours for that day.
- Invalid values can be entered but not saved.
- The error links to Settings → Active Hours.
- If an account-level change later creates a conflict, the reminder is disabled and marked Needs attention.
- Repair requires the user to edit the Journey window or Active Hours; no automatic clamping.

## 5. Lifecycle behavior

- Frozen: suspend all reminders and learning; preserve configuration/model.
- Resumed: reconcile and resume valid settings; invalid settings remain Needs attention.
- Completed or Abandoned: cancel reminders and stop learning.
- Deleted: cancel occurrences and delete Journey-owned reminder/model data according to retention rules.
- Journey schedule edit: reconcile future notifications without duplicating already reported occurrences.
- Notification permission revoked: show Disabled by permission, stop scheduling/learning, and link to OS
  settings; preserve the model for later restoration.

## 6. Notification destination and privacy

- Aggregate smart notifications open Home/Today's Focus.
- Fixed reminder deep-links to the relevant Journey/Step context when still valid.
- Stale notifications never change a status and revalidate authorization/lifecycle on open.
- Lock-screen detail follows the account notification-privacy preference; sensitive Step/Journey content
  is not exposed when hidden mode is selected.

## 7. Edge cases

- no enabled days;
- overnight window;
- time already passed today;
- DST missing/repeated time and device travel;
- multiple Journeys competing for the same slot;
- app already foregrounded;
- Step completed before send;
- fixed reminder plus user-requested Postpone;
- concurrent settings edits and duplicate scheduling;
- OS scheduling caps/delivery uncertainty;
- offline edit/sync conflict;
- Active Hours become invalid mid-editor.

## 8. Technical requirements

- One Communication Scheduler remains the only notification scheduler.
- Reminder rules use stable IDs, versions, wall-clock intent, named time zone, lifecycle, and reconciliation.
- Scheduling/cancellation is idempotent.
- Fixed and Smart modes share one Repository abstraction; UI contains no scheduling business logic.
- Future Calendar/location inputs plug into an eligibility seam but are inert in MVP.

## 9. Acceptance criteria

1. Existing Journeys can switch among Off, Fixed, and Smart modes.
2. Shared/per-day windows and anchor times persist and reconcile correctly.
3. Invalid Active Hours conflicts cannot save and later conflicts disable safely.
4. Frozen/resumed/completed/abandoned/deleted/permission states behave as specified.
5. No duplicate or stale notification can mutate Journey/Step state.
6. English/Hebrew, LTR/RTL, light/dark, offline, permission, error, and accessibility states are covered.

## 10. Out of scope

- learning/scoring algorithm;
- communication-style questionnaire;
- Calendar/location implementation;
- automatic Support Circle outreach;
- Postpone behavior itself.

