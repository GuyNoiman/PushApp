# PRD — Week Boundary Preference

Status: **Approved · MVP slice IMPLEMENTED (2026-08-10)** — see §9 (current implementation) + §10
(resolution & MVP scope) and Decision Log **D33**. Deferred: IANA/travel/multi-device + boundary
stamping (gated on the backend + `Own_Profile`'s country field).
Stage: **MVP**.
Owner: founder + AI product team.
Related: C1 Week Review, `Own_Profile_PRD.md`, Settings, Streaks, Missions, Achievements, and Journey planning.

---

## 1. Purpose

PushApp needs one authoritative definition of when a user's week begins. Week Review, weekly Journey
planning, Streaks, Missions, Achievements, and progress summaries must not independently infer different
week boundaries.

## 2. Approved behavior

- Default week-start day is derived from the user's saved country.
- Country itself defaults from the device region without GPS/location permission and remains editable.
- The user is shown the selected week-start day and can edit it in Settings.
- A manual week-start choice always overrides the country-derived default.
- If the user has never overridden the value, changing country recalculates the country default.
- If the user has overridden the value, changing country does not replace the manual choice.
- Week-start time defaults to local midnight. It may be edited through advanced Settings.
- Week end is derived automatically as the instant before the next week starts; the user never enters a
  separate end value.
- Time zone follows the device's named time zone and handles daylight-saving changes through calendar
  rules, not a fixed UTC offset.

## 3. Settings experience

Show a row labeled “My week starts” with the effective day. Opening it allows the user to choose a day
of the week. Advanced options allow editing the local start time; the default is `00:00`.

When the user changes the day or time, explain that the change applies from the next week boundary and
does not rewrite completed weeks.

## 4. Change semantics

- Persist both the effective value and whether it is `country_default` or `user_override`.
- A change takes effect at the next valid week boundary under the previous definition.
- Existing/completed Week Reviews, Streak history, Achievement history, and progress aggregates are not
  recomputed retroactively.
- The active week retains the boundary with which it was created.
- Future weeks use the new preference.

## 5. Edge cases

- device time-zone change during an active week;
- daylight-saving transition at or near the configured boundary;
- country changes before and after a manual override;
- app remains unopened across several week boundaries;
- user changes the preference while a Week Review is pending;
- invalid or migrated legacy preference;
- local time occurs twice or does not occur because of a clock transition;
- multiple devices with different time zones update the same account;
- account has no country yet: use the device-region week convention until one is saved;
- offline edit queues locally and becomes authoritative after successful synchronization without
  rewriting prior weeks.

## 6. Technical requirements

- Provide a single framework-independent week-boundary service consumed by every engine and UI surface.
- Store a named IANA time zone alongside each materialized week boundary or review period.
- Use calendar arithmetic in that time zone; never model a week as a fixed number of milliseconds.
- Persist boundary/version identifiers on weekly records so historical calculations remain stable after
  preference changes.
- Synchronization must resolve concurrent edits deterministically and keep the latest confirmed account
  preference.

## 7. Acceptance criteria

1. A new user receives the correct country-derived default and can see it in Settings.
2. The user can change the start day and advanced start time.
3. Manual selection survives country and device-region changes.
4. A country change updates the default only when no manual override exists.
5. Every weekly consumer receives the same boundary from one authoritative service.
6. Preference changes affect only future weeks and preserve historical results.
7. Time-zone and daylight-saving tests cover missing/repeated local times and device travel.
8. The UI works in English/Hebrew, LTR/RTL, light/dark, and legacy/error states.

## 8. Out of scope

- Week Review analysis and UI content;
- deciding what counts toward Streaks, Missions, Achievements, or Level;
- changing historical week boundaries;
- automatic GPS-based country detection.

---

## 9. Current implementation & gaps (code audit, 2026-08-10)

Grounding the spec in the actual code found **three different, conflicting "week" notions** today — the
core reason "the current mechanism may not be good enough and must be fixed" (founder):

1. **Calendar week hardcoded to MONDAY, device-local time.** `app/src/core/util/date.ts` `weekKey`
   (Monday offset) drives the **Missions** weekly reset; `app/src/core/util/urgency.ts`
   (`startOfLocalWeek` / `remainingDaysInWeek`, also Monday-based) drives the **Streak** "no-slack /
   urgent" rule (D26.4). Both hardcode **Monday** — not configurable.
2. **Per-Journey ROLLING 7-day windows from `journey.createdAt`.** `app/src/components/journey/journeyView.ts`
   `stepsByWeek` groups Steps into "weeks" measured from the Journey's creation — NOT a calendar week
   with a start day. This powers the "Week X of Y" pager on the Journey detail.
3. **Fixed-milliseconds arithmetic** (`WEEK_MS = 7 * DAY_MS`) in `journeyView.ts` — which §6 forbids
   (DST-unsafe).

Additional gaps: everything is **device-local with no stored IANA time zone**; there is **no `country`
field** in the domain yet (it belongs to `Own_Profile_PRD` and is consumed here); and no
boundary/version is stamped on weekly records except Missions' `weeklyResetKey`.

## 10. Approved resolution & MVP scope (founder, 2026-08-10 — binding)

**Single source of truth.** One profile-level **`weekStartDay`**, defaulted from the profile's single
**`country`** field (until `Own_Profile` lands, derive the default from the device region per §2) and
user-editable. From the moment it is set, **every** week-referencing area aligns to it — Missions,
Streak, Week Review, **and the Journey "Week X of Y" pager** (which migrates OFF per-Journey
createdAt-relative weeks ONTO calendar weeks aligned to `weekStartDay`; note the Journey's first/last
week may therefore be partial). All of them read **one** framework-free week-boundary service; the
three models above are consolidated into it, and the fixed-ms arithmetic is replaced with calendar
arithmetic.

**MVP vs full scope (the three refinements, founder-approved):**
- **Advanced non-midnight start time → OUT of MVP.** Week starts at **local midnight** of the start
  day. (§2/§3's editable start-time is deferred.)
- **Time-zone depth → MVP is device-local calendar arithmetic** (no fixed-ms; DST handled *because*
  the math is calendar-based, not offset-based). The **IANA-named-zone storage, device travel, and
  multi-device sync** cases (§5, §6, §7.7) are **deferred** until the backend + a synced preference
  store exist (and they also depend on the `country` field from `Own_Profile`).
- **Historical stability → changes apply GOING FORWARD** ("applies from the next week boundary"). For
  MVP the **Streak is computed live** (not materialized), so a mid-week change can shift the current
  week's count — accepted for now; **stamping a boundary/version on weekly records is the next step**
  once a backend exists. Missions already stamp via `weeklyResetKey`.

**Dependencies:** the explicit editable `country` field comes from `Own_Profile_PRD`; multi-device
sync comes with the backend. **Reflected in:** `06_Decisions/Decision_Log.md` **D33**.

