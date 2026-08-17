# PRD — Integrations Settings Hub

Status: **Future Vision — initial founder direction captured; detailed specification pending.**  
Stage: **Future / Commercial** — not part of the POC or MVP.  
Related: `Calendar_Context_Integration_PRD.md`, `Location_Context_Integration_PRD.md`,
`Saved_Places_Management_PRD.md`, `Context_Aware_Step_Scheduling_PRD.md`, privacy, permissions, and account deletion.

---

## 1. Purpose

Provide one understandable area under Settings where users can connect, inspect, configure, pause, and revoke
optional external integrations used to improve Journey timing and contextual support.

Initial integration categories:

- calendar;
- location;
- future context sources that receive their own PRD and consent model.

## 2. Approved direction

- Every integration is optional and disabled until the user explicitly enables it.
- Refusing an integration never blocks ordinary PushApp or Journey use.
- The hub explains the user benefit before requesting operating-system or provider permission.
- Each integration shows connection state, granted scope, last successful synchronization where applicable,
  and a clear disconnect action.
- The Calendar card explains that connecting it turns on busy-event avoidance for notifications by default.
- The Location card explains that PushApp does not retain movement history and may use bounded location checks
  plus Saved Place events to improve Step timing.
- Disconnecting stops new use immediately and explains what happens to previously derived rules and data.
- The hub links to the dedicated management surface for that integration, such as Saved Places.

## 3. Initial surface

Settings → Integrations should show cards for:

- Calendar — not connected, connected, attention required, or paused;
- Location — disabled, permission limited, active, or attention required;
- Saved Places — available only when the required location access is active.

The screen must distinguish connecting a provider account from granting device permission.

## 4. Guardrails

- Request only the minimum permission required for the approved feature.
- Never imply that an optional permission is required to receive effective support.
- Never use integration data for advertising or unrelated profiling.
- Never expose calendar, location, or derived context to Buddies, Allies, creators, or other users by default.
- Data export, deletion, retention, and account deletion must cover raw and derived integration data.

## 5. Open questions for the future session

1. Which calendar providers and operating-system integrations launch first?
2. Does the hub support temporary pause in addition to full disconnect?
3. Which permission states can be repaired inside PushApp versus operating-system Settings?
4. What data remains when an integration is disconnected?
5. How are errors, expired credentials, and partial permissions communicated without repeated nagging?
6. Which integrations may process data locally and which require a backend?
