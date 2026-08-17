# PRD — Smart Notification Timing

Status: **Approved** — product specification complete; founder-confirmed 2026-08-10.
Stage: **MVP**.
Owner: founder + AI product team.
Related: `Journey_Reminder_Management_PRD.md`, `User_Active_Hours_PRD.md`,
`Weekly_Review_PRD.md`, and `Communication_Style_Profile_PRD.md`.

---

## 1. Purpose

Smart timing learns when communication is more likely to reach the user while sending as few notifications
as possible. Each Journey keeps independent timing evidence because different transformations fit different
parts of life. Meaningful changes are proposals in Weekly Review and require explicit approval.

## 2. Product rules

- Notification response is a timing/availability proxy, not the product mission metric.
- Product success remains real Step/Journey progress.
- Silence is uncertainty, not failure or resistance.
- No frequency increase, same-day chasing, guilt, or hidden schedule change.
- User Active Hours and Journey windows are hard boundaries.
- Manual edits reset the affected learned candidate and always win.

## 3. Low-frequency aggregate communication

- Default maximum: one adaptive aggregate notification per local day.
- Maximum two only when eligible Journeys occupy two completely separate windows, such as morning/evening.
- User-requested Postpone and explicit Fixed reminders do not count toward this adaptive cap.
- Aggregate only actionable pending Steps from Active Journeys whose relevant window includes the candidate
  time.
- If nothing is pending at send time, suppress it.
- If the app is already foregrounded, suppress and exclude from learning.
- One aggregate may summarize several Steps/Journeys and opens Home/Today's Focus.

## 4. Outcome model

### General communication response

Success if the app enters foreground within 30 minutes of the actual delivery time where known, otherwise
the scheduled time. Record tap vs organic foreground separately; neither proves causality.

### Journey-specific evidence

For every included Journey:

- opening/viewing/acting on that Journey within 30 minutes is positive timing evidence;
- completing or partially completing its relevant Step later that local day makes the day neutral/positive
  and prevents a negative timing conclusion;
- no Journey interaction and no Completed/Partial outcome that day is negative evidence;
- contaminated trials (other notification in the 30-minute window, uncertain suppression/delivery) are
  tagged low-confidence or excluded.

## 5. Evaluation and proposal rule

Evaluation occurs during Weekly Review using up to the last six eligible trials, limited to four weeks,
for each Journey/day model.

- Require at least two eligible samples.
- If more than 50% are negative under §4, propose a new candidate.
- Explore alternately 15 minutes later and 15 minutes earlier when no better historical candidate exists.
- A proposal moves at most 15 minutes per Weekly Review.
- Total learned movement may reach three hours from the user's current anchor but never leaves that day's
  Journey window or account Active Hours.
- Separate per-day windows learn independently. A deliberately shared all-days window shares one model.
- After approval, evaluate the new candidate separately; preserve old evidence as history.
- Rejection keeps the current time and the same proposal is not repeated without new evidence.

## 6. Weekly Review contract

Timing changes never apply automatically. Weekly Review shows evidence, old time, exact proposed time, and
resulting schedule. The user may approve, choose another valid time, or keep the current time. Multiple
reminder proposals can be selected, discussed, and included in one final weekly-plan confirmation. Only the
complete approved plan applies atomically.

## 7. Account storage and privacy

The learned model belongs to the account and survives device replacement. Exact schema is an architecture
decision, but synchronize only minimal derived state per Journey/day/window: eligible count, positive/
negative aggregate, current/previous candidate, confidence, last update, and model version. Keep a local
offline cache. Do not sync a detailed behavioral timeline merely for timing optimization.

All data is included in account export/deletion. Exclude free-text reasons, coach content, Calendar/location,
and social content. Raw operational events have bounded retention and are excluded from social payloads and
third-party engagement analytics.

## 8. Future-ready eligibility seam

Calendar free/busy and coarse location may later answer whether a candidate is eligible. They are inert in
MVP, require separate explicit consent, operate with minimum/transient data, and cannot become profiling
inputs. Declining those permissions preserves the complete time-only experience.

Approved future direction, governed by the dedicated Future PRDs:

- a connected calendar makes busy-event avoidance the default for all notifications;
- approved Saved Place conditions restrict candidate delivery times;
- a point-in-time location check may occur when a Step outcome is reported;
- raw coordinates and movement history are not retained;
- only minimal per-Step/place aggregate evidence may inform a Weekly Review proposal;
- the user approves every new or changed location rule through the complete weekly plan;
- context signals narrow candidate times and must never increase notification frequency.

See `Future/Calendar_Context_Integration_PRD.md`, `Future/Location_Context_Integration_PRD.md`,
`Future/Saved_Places_Management_PRD.md`, and `Future/Context_Aware_Step_Scheduling_PRD.md`.

## 9. Edge cases

- sparse once-weekly Step;
- two samples split 50/50 (no proposal);
- app opens organically or via another push;
- unknown OS delivery, Focus/DND, provisional permission;
- notification opened after relevant Steps already completed;
- several Journeys bundled but only one viewed;
- Journey freezes/completes/is abandoned/deleted;
- window/anchor/manual edit/time-zone change invalidates candidate;
- DST/travel and multiple devices;
- Active Hours conflict disables the reminder;
- proposal approved mid-week and rebased by Weekly Review;
- offline outcomes synchronize out of order.

## 10. Acceptance criteria

1. Adaptive sends respect one-per-day default/two-window maximum and never chase after silence.
2. Response and Journey outcomes are measured separately as specified.
3. Sparse data cannot move time after one sample.
4. Proposals use the percentage rule, 15-minute movement, alternating exploration, and three-hour cap.
5. No change applies before final Weekly Review approval.
6. Account-derived state synchronizes minimally and deletion/export work.
7. Fixed, Postpone, frozen, permission, conflict, DST/travel, offline, and contaminated-trial cases pass.

## 11. Out of scope

- automatic copy experimentation;
- free AI-generated notification copy;
- automatic communication-channel selection;
- Calendar/location implementation;
- Support Circle outreach.
