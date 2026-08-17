# PRD — Calendar Context Integration

Status: **Future Vision — initial founder direction captured; detailed specification pending.**  
Stage: **Future / Commercial** — not part of the POC or MVP.  
Related: `Integrations_Settings_Hub_PRD.md`, `Context_Aware_Step_Scheduling_PRD.md`, Smart Notification Timing,
privacy, permissions, and calendar-provider architecture.

---

## 1. Purpose

With explicit user permission, use calendar availability as a contextual constraint for scheduling or surfacing
Steps. Examples include showing a Step only when the user is not in an event, avoiding a busy period, or
finding an appropriate window around the user's existing commitments.

## 2. Approved direction

- Calendar connection is optional and user-initiated from Settings → Integrations.
- Once calendar access is active, **all PushApp notifications default to calendar-aware delivery**: they are
  not sent while the user is in a busy calendar event.
- The user may define Journey or Step rules using understandable availability concepts rather than raw event
  data.
- Initial examples include “only when I am free,” “not during an event,” and “within an available window.”
- Calendar context constrains eligible timing; it does not prove that a Step was completed.
- The system must provide a non-calendar fallback and allow the user to disable the integration at any time.
- Calendar data must not be shared with creators, Buddies, Allies, or Support Circles by default.

### 2.1 Default busy-event avoidance

Calendar-aware delivery is a global eligibility guard, not a separate setting the user must configure for
every Journey. At the intended send time:

1. if current calendar availability is reliably busy, defer the notification to the nearest eligible time
   inside the applicable active hours and Journey window;
2. if no eligible time remains, follow the notification type's approved fallback instead of interrupting the
   event or silently inventing a new time;
3. if calendar state is unavailable or stale, use the approved time-only behavior and record that calendar
   context was unavailable—not that the user ignored a notification.

The user may later receive controls for calendars, event types, or exceptions, but the safe default after
connection is simple: do not notify during an event marked busy. Events that directly represent the Step,
all-day events, tentative events, and user-created exceptions require detailed rules in the future session.

## 3. Privacy direction

Prefer deriving the minimum necessary state—such as busy/free and eligible window—without retaining event
titles, attendees, descriptions, meeting links, or locations. Any broader scope requires a separately approved
use case and explicit disclosure.

## 4. Key edge cases

- multiple connected calendars and conflicting events;
- all-day, recurring, tentative, cancelled, private, and travel events;
- time-zone changes and daylight-saving transitions;
- events added or changed after a Step was scheduled;
- provider outage, expired authorization, delayed synchronization, and offline use;
- calendars that reveal sensitive health, religious, family, or work information;
- no available window before a Step expires;
- two Journeys competing for the same available window.

## 5. Open questions for the future session

1. Is read-only busy/free access sufficient for the first release?
2. Which calendars are included and how does the user choose among them?
3. May PushApp create calendar events, or only read availability?
4. How recent must synchronization be before calendar context is considered trustworthy?
5. What happens when no eligible time exists: ask the user, use a fallback, or propose a Journey change?
6. Which computations can remain on-device?
7. How does calendar context interact with active hours, smart notification learning, and Weekly Review?
