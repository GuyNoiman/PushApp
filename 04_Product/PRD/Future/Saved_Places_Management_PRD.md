# PRD — Saved Places Management

Status: **Future Vision — initial founder direction captured; detailed UX and provider specification pending.**  
Stage: **Future / Commercial** — not part of the POC or MVP.  
Related: `Location_Context_Integration_PRD.md`, `Context_Aware_Step_Scheduling_PRD.md`,
`Integrations_Settings_Hub_PRD.md`, map provider, privacy, and deletion.

---

## 1. Purpose

Allow a user who enabled the required location access to create named places that can be used when defining
Journey and Step context rules.

Examples:

- Home;
- Work;
- Gym;
- Park;
- another user-defined place.

The place name becomes the participant-facing term used elsewhere in PushApp. The system should not require
users or the Coach to work with coordinates or addresses when building a rule.

## 2. Approved direction

- Saved Places is available only when the required location capability is enabled.
- The management surface includes a map, address search, pin placement, and a user-defined name.
- The founder's initial provider direction is Google Maps; final selection requires architecture, privacy,
  platform-policy, availability, and cost review before development.
- Users may add, rename, move, and delete a Saved Place.
- Rules that reference a changed or deleted place must never silently switch to another location.
- Saved Places are private account data and are not social profile fields.

## 3. Minimum place model to explore

- stable internal identifier;
- user-defined display name;
- coordinates and an explicit or provider-derived radius;
- optional normalized address for confirmation;
- creation/update timestamp;
- provider reference only when necessary;
- list of rules currently using the place, shown before destructive changes.

## 4. Key edge cases

- two places with the same name;
- overlapping radii;
- an address search result points to a building entrance rather than the relevant area;
- apartment complexes, campuses, large workplaces, parks, and moving venues;
- a pin or provider place later changes;
- a user deletes a place used by active Steps;
- map/search unavailable while existing places still need management;
- location permission is revoked after places were created;
- address, map, or saved name reveals sensitive information on screen or in logs;
- account deletion and data export.

## 5. Open questions for the future session

1. Does the user choose a radius, or does PushApp provide safe presets?
2. What is the maximum number of Saved Places?
3. Are Home and Work suggested names or special system roles?
4. Can a place be temporarily disabled without deletion?
5. When a place is deleted, are dependent rules disabled, blocked for repair, or removed after confirmation?
6. Should address information be stored after coordinates and a user-defined name are confirmed?
7. How are map-provider cost, caching, attribution, and regional availability handled?

