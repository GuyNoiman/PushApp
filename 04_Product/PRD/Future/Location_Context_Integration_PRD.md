# PRD — Location Context Integration

Status: **Future Vision — initial founder direction captured; detailed specification pending.**  
Stage: **Future / Commercial** — not part of the POC or MVP.  
Related: `Integrations_Settings_Hub_PRD.md`, `Saved_Places_Management_PRD.md`,
`Context_Aware_Step_Scheduling_PRD.md`, device permissions, background execution, and privacy.

---

## 1. Purpose

With explicit permission, allow PushApp to use location context when deciding when a Step is relevant. Examples
include a Step that becomes relevant at home, after leaving work, while travelling to work, or outside a
particular place.

## 2. Approved direction

- Location access is optional and initiated from Settings → Integrations.
- PushApp requests the least invasive permission that supports the selected behavior.
- Users define rules with their own Saved Place names, not raw coordinates.
- Location context determines eligibility or timing; it does not prove completion.
- The user can inspect and disable location use without losing ordinary Journey access.
- Raw or derived location is not exposed to creators, Buddies, Allies, or Support Circles by default.

### 2.1 Minimal location learning

Location permission also allows PushApp to learn which coarse place contexts are useful for each Step so that
future reminders can arrive at a more effective moment with fewer total notifications.

The approved privacy rule is:

- PushApp does **not** store the user's movement path or a chronological location history;
- when the user reports a Step outcome, PushApp may perform a point-in-time location check;
- that location is matched locally to a user-defined Saved Place when possible;
- the raw coordinate is transient and is not retained as a historical event;
- the account may retain only a minimal derived association, such as “this Step is often completed at Home,”
  together with aggregate count/confidence needed for timing decisions;
- an isolated observation is not treated as a stable routine;
- the user may inspect, reject, change, or remove any proposed location rule.

This learns the part of the user's routine that is relevant to successful Step execution. It must not attempt
to reconstruct where the user travels, where they spend their day, or unrelated behavioral patterns.

### 2.2 Location access without continuous tracking

Context-aware delivery may require awareness that the device entered or left a Saved Place. The preferred
architecture is operating-system region monitoring, significant-location events, or another battery-efficient
on-device mechanism—not continuous GPS polling and not server-side movement tracking.

The application may request a fresh location only at bounded, justified moments, such as Step reporting or
validation of a pending context condition. Exact platform behavior, background permission requirements,
battery impact, and reliability require architecture and on-device testing before implementation.

## 3. Product distinction

The system must distinguish:

- currently inside or outside a Saved Place;
- entering or leaving a Saved Place;
- a possible route or transition such as returning from work;
- an inferred pattern, which must never be presented as certain without sufficient evidence and user control.

“On the way to work” is materially more complex and sensitive than “left Work.” Route inference, travel mode,
and habitual-location learning require separate approval before implementation.

## 4. Key edge cases

- approximate-only permission, denied permission, background permission removed, or location services disabled;
- inaccurate GPS, overlapping places, tall buildings, poor signal, and geofence boundary oscillation;
- home/work changes, travel, time-zone changes, and temporary locations;
- delayed background events caused by the operating system;
- no network connectivity;
- device shared by several people;
- a sensitive place such as a clinic, place of worship, shelter, or another person's home;
- several Steps becoming eligible on the same location event;
- stalking, coercive control, or a creator attempting to require excessive location access.

## 5. Open questions for the future session

1. Which first-release rules are allowed: inside, outside, enter, and leave?
2. Is background location required, and how is its battery/privacy cost explained?
3. Are route and commute states inferred automatically or explicitly configured by the user?
4. What confidence and dwell-time rules prevent false triggers?
5. Can the implementation guarantee that raw coordinates and movement events are never persisted, including
   logs, crash reports, analytics, and backups?
6. What fallback applies when location is stale or unavailable?
7. Which rules run on-device versus server-side?
