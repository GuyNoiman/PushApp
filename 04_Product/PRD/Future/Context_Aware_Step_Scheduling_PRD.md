# PRD — Context-Aware Step Scheduling

Status: **Future Vision — initial founder direction captured; rule model and UX require a dedicated session.**  
Stage: **Future / Commercial** — not part of the POC or MVP.  
Related: `Calendar_Context_Integration_PRD.md`, `Location_Context_Integration_PRD.md`,
`Saved_Places_Management_PRD.md`, Smart Notification Timing, active hours, reminders, and Journey authoring.

---

## 1. Purpose

Allow eligible Journey Steps to use user-approved context signals when determining when they should appear or
when a reminder may be sent. Initial signals come from Saved Places and calendar availability.

Examples:

- relevant only while at Home;
- relevant after leaving Work;
- relevant while returning from Work, subject to later route-inference approval;
- relevant only when the calendar shows no event;
- relevant within active hours, at Home, and while calendar availability is free.

## 2. Approved direction

- Context rules are optional constraints on a Step, not evidence that it was performed.
- Rules may only use integrations and places the user explicitly enabled.
- The rule builder uses plain language and Saved Place names.
- A user must be able to understand why a Step appeared or did not appear.
- If permission or data becomes unavailable, the system follows a visible fallback rather than silently
  concluding that the Step was irrelevant or missed.
- Context-aware timing must still respect account active hours and notification permissions.
- Creator-authored context requirements become proposals during adoption; a creator cannot force access to
  location or calendar data.
- When calendar access is active, busy-event avoidance is the default eligibility guard for all notifications.
- When location access is active, Weekly Review asks whether the user wants to associate eligible Steps with
  a Saved Place.

### 2.1 Weekly Review location association

During weekly planning, if location access is active and the upcoming plan contains eligible Steps without an
approved location rule, the user is asked whether any of them should be associated with a Saved Place.

The interaction must:

- remain optional and skippable;
- show the relevant Steps and existing Saved Places;
- allow no location, one location, or an applicable simple place condition per Step;
- allow creation of a new Saved Place through the dedicated management flow;
- show the resulting rule in the proposed weekly plan;
- apply all selected associations only when the user approves the complete weekly plan;
- avoid repeating the question for Steps the user already declined unless new evidence or a meaningful
  configuration change justifies asking again.

The system may use completion-time aggregate evidence to propose an association—for example, that a Step is
often completed at Home—but it never activates the rule automatically.

## 3. Initial rule model to explore

Start with a limited conjunction of approved conditions rather than a general automation language:

- day/time window;
- inside, outside, entering, or leaving one Saved Place;
- calendar free/busy state;
- optional minimum dwell time;
- fallback window when context cannot be determined.

Arbitrary nested logic, scripts, cross-user location, and unrestricted creator rules are out of scope for the
first version.

### 3.1 Signal priority direction

All delivery candidates must pass the applicable guards before a notification is sent:

1. notification permission and product frequency cap;
2. account active hours and Journey window;
3. busy-calendar avoidance when connected;
4. approved location condition when one exists;
5. current Journey/Step eligibility and pending state.

Smart timing chooses the best candidate only from times that pass these guards. Location and calendar context
do not increase notification frequency; they narrow or improve the delivery opportunity.

## 4. Required explanations

The participant should be able to see statements such as:

> This Step is waiting until you are at Home during your active hours.

> Calendar access is unavailable, so this Step will use your fallback window at 18:00–20:00.

The system must distinguish “condition not met,” “context unavailable,” and “Step missed.”

## 5. Key edge cases

- no eligible context occurs before the Step deadline;
- calendar says free while location says the user is in an unsuitable place;
- context changes while the user is viewing or performing the Step;
- permission is revoked after the weekly plan was approved;
- several eligible Steps compete at the same moment;
- a context event arrives late or more than once;
- smart timing recommends a time outside the context rule;
- the user travels or changes Home/Work;
- an urgent Step needs attention even when ordinary context is not met;
- the Coach or creator proposes a rule that requires an integration the user declined.

## 6. Open questions for the future session

1. Does context control visibility, reminders, scheduling, or all three?
2. Which conditions may be combined, and is only “all conditions” supported initially?
3. What fallback is required for every rule?
4. When does failure to find a valid context become a Weekly Review insight rather than a missed Step?
5. How does the user override a context rule for today?
6. Can the Coach propose new context rules, and how are they approved?
7. How are rules represented in creator-authored Journey templates without pressuring users to grant access?
8. What is the priority order among context rules, active hours, fixed reminders, smart timing, and urgent
   Steps?
