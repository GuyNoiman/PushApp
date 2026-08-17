# PRD — Future Journey Management

Status: **Approved** — founder-confirmed 2026-08-11.
Stage: **MVP**.
Owner: founder + AI product team.
Related: `Dream_Management_PRD.md`, `Coach_Context_Summaries_PRD.md`,
`Journey_Reminder_Management_PRD.md`, coach-led Journey editing, and L1/H1 in
`../MVP_Task_List.md`.

---

## 1. Purpose and problem

A Future Journey is a complete Journey intentionally saved for later. It preserves a fully formed plan
without adding it to the user's current workload. The approved UX already includes Active, Completed,
and Future tabs, but the current Future tab is a hard-coded sample: creation always starts immediately
and there is no authoritative start model.

This PRD completes the existing design. It does not create another Dream/Goal layer and does not treat an
unexplored aspiration as a Journey.

## 2. Product-philosophy fit

- Preserves direction without pressuring the user to work on everything now.
- Keeps current action focused while protecting meaningful plans for later.
- Lets the Coach recommend focus, but never starts or edits a Journey without the agreed rule or user
  approval.
- Limits accumulation so the Future list does not become a guilt-producing backlog.

## 3. Existing baseline

Already approved in `../UX/Journeys_Screen.md` and `../UX/Journey_Creation_Screen.md`:

- My Journeys contains Active, Completed, and Future tabs.
- A Future card shows its planned start, or an unscheduled/manual-start state.
- Journey creation offers Start now or a future start.
- A Future Journey is complete, opens normal Journey detail, and remains editable before start.

Current gaps:

- `app/src/app/(tabs)/journeys.tsx` always renders `SAMPLE_FUTURE`.
- `Journey` has no real start field; display code temporarily overloads `createdAt`.
- `JourneyEngine.createJourney` always creates an Active Journey now.
- no start selection, activation event, cap, manual-start action, or Coach relevance flow exists.

`createdAt` must remain the true creation timestamp and must never represent start time.

## 4. Competitor references

- [Todoist's start-date guidance](https://www.todoist.com/help/articles/does-todoist-support-start-dates-qhqlgZhk)
  keeps future work accessible while excluding it from today's focus. Its workaround shows why PushApp
  needs a first-class start model rather than a reminder hack.
- [Todoist Upcoming](https://www.todoist.com/help/articles/get-started-with-todoist-OgNNJR) separates
  current focus from scheduled future work while preserving project detail.

PushApp's distinction: a Future Journey is not a task backlog entry. It is an approved transformation
plan that remains inactive until its start condition is reached.

## 5. Start modes and state invariants

Every new Journey selects exactly one start mode during final approval:

1. **Start now** — Active immediately.
2. **Scheduled start** — Future until the stored start instant.
3. **Manual start** — Future without a date until the user explicitly starts it.

Claude chooses the exact schema, subject to these invariants:

- `createdAt` records creation only;
- `startsAt`, when present, records the intended instant and time-zone context;
- Future Journeys are inactive;
- Scheduled becomes Active once `now >= startsAt`;
- Manual never activates from the clock;
- activation is idempotent and produces one event;
- Active, Frozen, Completed, and Abandoned remain unambiguous.

## 6. Saved information

A Future Journey is created only after the complete normal proposal is approved. Save the same
structured information as an immediate Journey:

- wording, Why, and linked Dreams;
- duration, rhythm, constraints, and Journey Rules;
- Milestones and Steps;
- reminders;
- privacy and Support Circle configuration where available;
- start mode, instant, and time-zone context;
- optional private Coach context defined in `Coach_Context_Summaries_PRD.md`.

Do not store raw transcripts or raw interview answers merely because the Journey starts later. Persist
the approved plan, structured decisions, constraints, and minimal derived context.

## 7. Future tab

Replace the sample with real Future Journeys. Each card shows:

- Dream context where available;
- Journey name;
- planned start date/time or “Start when ready”;
- a calendar/state indicator;
- no progress implying work has begun;
- no overdue/failure language before activation.

Sort scheduled Journeys by nearest start, followed by manual-start Journeys. Tapping opens Journey detail
in Future mode. The empty state offers quiet planning, never pressure to fill the list.

## 8. Editing before start

A Future Journey may be edited through the normal Coach proposal-and-approval pattern. The user may
change every valid creation-time setting, including wording, Why, Dream links, duration, rhythm,
Milestones, Steps, constraints, reminders, privacy, Support Circle, and start mode/time.

Editing does not activate it. The Coach may recommend an edit or earlier start, but every change requires
approval. No reports, XP, Streak, or progress exist before activation.

## 9. Activation

### Scheduled

- Activate automatically when the authoritative instant arrives.
- Reconcile correctly when offline, app-killed, or first opened after the instant.
- Do not emit a burst of stale notifications after a long absence.
- Use the approved start as schedule anchor; existing recovery rules handle genuinely elapsed Steps.

### Manual or early

The detail screen offers **Start Journey**. Show the effective start and resulting plan, then require
confirmation. Starting early rebases future Steps/reminders from the actual start without changing their
order or content.

### Effects

One transition moves Future → Active, exposes eligible Steps on Home, enables approved reminders and
Support Circle lifecycle behavior, and preserves all IDs. It never duplicates Steps, reminders, or events.

## 10. Capacity

- Hard maximum: **10 Future Journeys**.
- At 5, the Coach may gently offer an optional relevance review.
- Starting, deleting, or abandoning one frees a slot.
- Other lifecycle states do not count.
- At 10, the system cannot silently replace one; the user may start, edit, reschedule, or remove one.

The cap reduces cognitive load; it is not a storage or scarcity mechanism.

## 11. Coach behavior

When relevant, the Coach may identify an existing Future Journey and offer to review, edit, schedule, or
start it. Only titles, structured metadata, and the minimum relevant encrypted context enter retrieval.
Do not inject the whole Future list or memory catalog into every prompt. Recommendations never act without
approval or create guilt about waiting.

## 12. Multiple aspirations are not Future Journeys

When one conversation identifies several Dreams:

1. show them for approval/correction;
2. ask which one to work on first;
3. build a complete Journey only for the selected Dream;
4. save the other approved aspirations in My Dreams;
5. create no Future Journey until a complete proposal is built and approved.

This supersedes interpreting transient `GoalSpec.deferredGoals` as finished Journeys.

## 13. Edge cases

- start while offline, logged out, app-killed, or across DST/time-zone change;
- start passes during editing;
- duplicate activation on two devices;
- Dream changes before start;
- reminder permission denied;
- pending Ally invitation;
- deletion/account deletion before start;
- legacy fake sample must never migrate;
- long content, RTL, accessibility, loading/error/retry.

Preserve one authoritative start instant plus time-zone context; never activate twice or silently change
the user's chosen calendar meaning.

## 14. Acceptance criteria

1. A complete Journey can start now, at a scheduled instant, or manually later.
2. Real data replaces the Future sample.
3. `createdAt` remains creation time.
4. Future Journeys expose no Home Steps, reminders, reports, or progress before start.
5. Activation occurs once without duplication.
6. Future Journeys can be started, rescheduled, edited, or removed.
7. The 10 cap and optional review at 5 work.
8. Coach suggestions require approval.
9. Unchosen Dreams do not become partial Future Journeys.
10. Full approved structure persists; raw conversations do not.

## 15. Out of scope

- Journey Template marketplace/sharing;
- dependency start such as “after Journey X completes”;
- Calendar/location-triggered starts;
- automatic Coach edits/reprioritization;
- raw conversation storage.

## 16. Open questions

None.
