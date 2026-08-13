# PRD — Account Inactivity Freeze and Return

Status: **Ready for implementation** — founder-approved product behavior 2026-08-12.
Stage: **MVP**.
Owner: founder + AI product team.
Related: J3 Journey Freeze/Resume, `Future_Journey_Management_PRD.md`,
`Journey_Support_Circle_PRD.md`, reminders, Streak, Weekly Review, and K1 authentication.

---

## 1. Purpose

Protect a user who has been away from PushApp from returning to accumulated overdue work, irrelevant
reminders, automatically activated Future Journeys, or a misleading plan. After 21 consecutive days without
authenticated account activity, PushApp places the account in an **inactive/frozen state** and suspends the
Journeys that would otherwise continue progressing.

Nothing is deleted and the user is never locked out. On return, the user decides what still fits before any
Journey resumes.

## 2. Definitions

### Authenticated account activity

A successful, authenticated use of PushApp that establishes the account as active. App launch without a valid
session, background refresh, push delivery, notification scheduling, server sync, or Ally activity does not
count. A valid foreground session may count even if the user performs no Step action.

### Inactivity threshold

The account becomes eligible when 21 complete consecutive 24-hour periods have elapsed since the last
authenticated activity, evaluated using authoritative server time. The threshold is configuration-driven but
fixed at 21 days for MVP.

### Account inactivity freeze

An account-level lifecycle state that suspends Journey execution without disabling authentication, deleting
data, removing friends, or blocking messages. This state is distinct from account deletion, suspension for
abuse/security, and a manually frozen Journey.

## 3. Entering the frozen state

At the threshold, an idempotent server-side lifecycle process:

1. marks the account inactive/frozen with timestamp and reason `inactivity_21_days`;
2. freezes every currently Active Journey;
3. prevents every Future Journey from auto-activating while the account is frozen;
4. cancels/suspends Journey reminders, smart-timing learning, and plan-progress nudges;
5. stops new Daily Step and Weekly Review obligations from being generated;
6. preserves all data, history, configuration, relationships, pending requests, and Coach context.

Completed and Abandoned Journeys do not change. A Journey already manually frozen remains manually frozen and
must not be relabeled as inactivity-frozen.

## 4. Journey provenance

The system records why and when each Journey was suspended:

- `manual` — frozen by the user;
- `account_inactivity` — Active when the account crossed the threshold;
- any future lifecycle reason must use a distinct value.

For each inactivity-frozen Active Journey, preserve its prior state and configuration. For a Future Journey,
preserve its Future lifecycle state and planned start date; record that activation is blocked by account
inactivity rather than converting it into an Active/Frozen Journey.

This provenance controls return behavior. PushApp never resumes a manually frozen Journey merely because the
account became active again.

## 5. Notifications and social behavior

### Journey communication

- Cancel scheduled Journey reminders and optional progress notifications.
- Do not send Streak-loss, missed-Step, overdue, Weekly Review, or Future-Journey activation notifications
  while frozen.
- Security, account, privacy, accepted friend-request, and direct-message delivery may continue according to
  their own preferences because they are not Journey obligations.

### Allies

Accepted Allies on a Journey that transitions from Active to frozen receive the already-approved lifecycle
notification that the Journey was paused. Copy is privacy-safe and does not reveal a Step, report, reason for
absence, or the account's precise last-active time.

The notification may say:

> Alex's Journey has been paused.

It must not say that Alex was inactive for three weeks. Opening it follows existing Friend Journey visibility
and lets the Ally send a message or support. It does not automatically remove anyone from the Support Circle.

Future Journeys do not notify Allies merely because activation was blocked, unless an accepted Ally was
already explicitly attached and the existing Future-Journey/Support-Circle policy requires lifecycle notice.

Pending Support Circle requests remain pending. They are not expired solely because the account froze.

## 6. Streak, reporting, and history

- Inactivity freeze does not create Not Done reports or retroactive misses.
- It does not remove XP, Level, Achievement, history, or completed progress.
- Once the account enters the frozen state, frozen days do not advance or break Streak.
- Existing pre-freeze reports remain unchanged.
- No backlog of Daily Steps is created for the frozen period.
- No Weekly Review is generated for fully frozen weeks. A partial boundary may record that Journeys were frozen
  without treating the remaining period as failure.

The current MVP Streak implementation and any future XP system must consume this lifecycle state rather than
inventing separate inactivity penalties.

## 7. Returning after inactivity

A successful login/foreground authentication clears the “away” condition but does **not** resume any Journey.
Before normal Home use, show a return experience:

> Good to see you again
>
> While you were away, we paused your Journeys so tasks and reminders wouldn't pile up. Let's check what still
> fits your life now.

Primary action: **Talk to the Coach**.

Secondary action: **Choose Journeys to resume**.

Tertiary action: **Not now**.

### Talk to the Coach

The Coach reviews only the Journeys suspended because of account inactivity and the Future Journeys whose
activation was blocked. It may propose:

- resume unchanged;
- adapt the Journey, then resume;
- keep frozen;
- abandon/delete through the authoritative Journey lifecycle flow;
- reschedule or edit a Future Journey.

Every proposed change requires the user's existing approval flow.

### Choose Journeys to resume

Show separate sections for:

- Journeys paused because the user was away;
- Future Journeys waiting to start;
- Journeys the user had paused manually, clearly labeled and not preselected.

The user explicitly selects each Journey. A selected inactivity-frozen Journey reconciles its plan from the
return date and resumes only after confirmation. A Future Journey requires an explicit new start decision if
its planned date passed while the account was frozen.

### Not now

Open Home with the account accessible and all affected Journeys still suspended. Show a persistent but calm
Home call to action to review them later. Do not repeatedly open the return modal on every foreground within
the same session; keep the review action accessible until resolved.

## 8. Replanning on resume

Resuming never creates a missed-work backlog. For an inactivity-frozen Journey:

- preserve completed Steps and report history;
- discard/close obligations that existed only inside the frozen interval without marking them Not Done;
- re-anchor upcoming scheduling from the approved resume date;
- reconcile reminders without duplicates;
- preserve Support Circle membership and permissions;
- notify accepted Allies that the Journey resumed, using the existing lifecycle notification only.

If the original plan can no longer fit its Journey end date, the user must approve a Coach adaptation or an
updated end date before resumption. PushApp does not compress missed weeks into an unsafe workload.

## 9. Future Journey behavior

While the account is frozen:

- scheduled Future Journeys remain Future;
- their start-date job is suppressed;
- no Steps, reports, progress, Streak, or reminders are created;
- the original planned date remains visible in history as the date that passed, not silently overwritten.

On return:

- a Future Journey whose date has not arrived remains scheduled unless the user edits it;
- one whose start date passed requires the user to choose Start now, choose a new date, edit with the Coach, or
  keep it waiting;
- no Future Journey auto-starts merely because the account becomes active again.

## 10. Data model and technical requirements

- Server-authoritative `lastAuthenticatedActivityAt` and account inactivity state/reason/timestamps.
- Idempotent scheduled evaluator; running it repeatedly cannot refreeze, resend notifications, or duplicate
  lifecycle events.
- Per-Journey suspension provenance and prior lifecycle state.
- Future-Journey activation gate reads account state atomically.
- Reminder cancellation/reconciliation uses the single Communication Scheduler.
- Return actions are transactional/idempotent across devices.
- All lifecycle events carry IDs/enums/timestamps only; no sensitive free text in analytics/logs.
- Account export includes lifecycle metadata; account deletion removes it.
- Configuration exposes the 21-day threshold without placing business logic in UI.

The architect may choose exact schemas and job infrastructure, but must preserve the product semantics above.

## 11. Edge cases

- account has no Active or Future Journeys;
- account crosses threshold while app is open on another device;
- device clock/time zone is wrong or changes;
- user is offline for more than 21 days and later reconnects;
- background push/sync occurs during inactivity;
- Journey completes, is manually frozen, abandoned, or deleted near the threshold;
- an Active Journey is already frozen for another reason;
- Future Journey start date equals/crosses the freeze timestamp;
- several devices attempt return/resume simultaneously;
- Ally removed/blocked/account-deleted during freeze;
- notification delivery fails or arrives after state changed;
- account restored immediately after server job runs;
- user repeatedly chooses Not now;
- all Journeys remain frozen indefinitely;
- account deletion while inactive;
- legacy account lacks activity/provenance fields.

## 12. Acceptance criteria

1. Exactly 21 days without authenticated account activity causes one idempotent account inactivity freeze.
2. Active Journeys stop; Future Journeys cannot auto-start; completed/abandoned/manual-frozen states are
   preserved correctly.
3. Journey reminders, misses, Streak loss, and backlogs do not accumulate during the frozen period.
4. Accepted Allies receive privacy-safe pause/resume lifecycle notices without inactivity details.
5. Returning never resumes a Journey automatically and presents Coach, manual selection, and Not now paths.
6. Manual freezes remain distinguishable and are never auto-selected for inactivity return.
7. Passed Future start dates require a new explicit decision; upcoming dates remain scheduled but gated until
   account return is resolved.
8. Resume preserves history/relationships, re-anchors future work, and creates no duplicate reminders/events.
9. Multi-device, offline, time-zone, no-Journey, deletion, privacy, accessibility, RTL, and legacy states pass
   verification.

## 13. Out of scope

- security/moderation suspension;
- account deletion or archival;
- automatic Journey abandonment;
- automatic Coach changes without user approval;
- inactivity marketing campaigns or re-engagement notification experiments;
- XP, Coins, Missions, or Achievements for returning;
- K1 sign-up/sign-in screen design.

