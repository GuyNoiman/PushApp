# PRD — User Active Hours

Status: **Approved — Implemented (account-level slice)**, commit `969cd43`, 2026-08-11. Product
specification confirmed 2026-08-10; the account-level Active Hours slice below shipped 2026-08-11 with one
material behavior change from this PRD's original §4 (**clamp, not disable** — see the §4 supersession
note, Decision Log **D40**). Deferred: per-Journey validation UI (§4's "Journey editor" checks) and
cross-device **sync** (this slice is **local-only** for now; see the §2/§6 supersession notes and
`11_Engineering_Bible/Sync_Manifest.md`, which tracks `schedulingPrefs`/Active Hours as **Sync** once a
backend exists).
Stage: **MVP**.
Owner: founder + AI product team.
Related: `Journey_Reminder_Management_PRD.md`, `Smart_Notification_Timing_PRD.md`, Settings,
`Done/Own_Profile_PRD.md` (immutable predecessor/dependency; do not edit),
`11_Engineering_Bible/Sync_Manifest.md`, and Decision Log **D40**.

---

## 1. Purpose

User Active Hours define the outer account-level boundary within which PushApp may send optional Journey
communications. They prevent every Journey from inventing its own interpretation of when the user is
available and provide one clear user-controlled limit.

## 2. Approved settings model

- Default mode: one local start time and one local end time applied to every day.
- An additional action, “Set each day separately,” expands the editor to seven independent day rows.
- Each day has an enabled state plus local start/end time.
- The user can return to one shared daily range; the UI previews the replacement before saving.
- Values use the device's local wall-clock time and named time zone.
- Active Hours are account preferences and, in the target model, synchronize across devices with a local
  offline cache. **Implementation note (D40, 2026-08-11):** the shipped account-level slice is **local-only**
  for now (extends `SchedulingPrefs` on-device) — sync is deferred until a backend exists, tracked in
  `11_Engineering_Bible/Sync_Manifest.md`. This paragraph's synchronization language remains the target
  behavior, not yet built; it is not a change of intent, only of sequencing.

## 3. Settings experience

Settings shows an **Active Hours** row with a concise summary. The editor contains:

- shared start/end controls in default mode;
- “Set each day separately” action;
- seven day rows in advanced mode;
- validation summary showing Journeys that would conflict;
- Save and Cancel.

The screen must explain that Journeys can choose narrower relevant windows but can never schedule an
optional reminder outside Active Hours.

## 4. Validation and existing-Journey conflicts

**Superseded by D40 (2026-08-11) — CLAMP, not disable.** The bullets below are the original 2026-08-10
spec, preserved for its reasoning (silently moving a user-chosen time felt like it could surprise the user
more than a clear "needs attention" state); the founder revisited this 2026-08-11 and decided the opposite
trade-off is better: **an out-of-hours reminder is moved earlier to fit within Active Hours (clamped), never
disabled.** This reuses the shipped clamp mechanism + the Step-Postponement shorten-rule logic (D37), so
there is no silent behavior reversal introduced by this feature — Active Hours changes now behave exactly
like every other scheduling-time clamp already in the app. **Implemented** in `CommunicationScheduler`
(day-aware clamp; a uniform daily reminder coalesces back to one daily rather than fanning out per day),
commit `969cd43`.

Original spec (2026-08-10), superseded on the "disable" points below:

- A Journey window must be fully contained within Active Hours for every enabled day.
- A Journey editor may accept typed out-of-range values temporarily but cannot save them.
- Its error links to Settings → Active Hours.
- ~~If an Active Hours edit conflicts with existing Journeys, Save is allowed because the account-level
  preference is authoritative. Conflicting Journey reminders are disabled immediately.~~ **Superseded
  (D40):** Save is still allowed because the account-level preference is authoritative, but a conflicting
  Journey reminder is **clamped into the day's allowed window**, not disabled.
- ~~The user is shown the affected Journeys and must return to each Journey to choose a valid window, or
  revise Active Hours again.~~ **Superseded (D40):** no user repair action is required for the clamp itself
  — it happens automatically; the per-Journey validation UI referenced here (surfacing "affected Journeys"
  for the user to review) is **deferred**, not part of the shipped account-level slice.
- ~~PushApp never silently clamps or moves an existing Journey reminder to the nearest allowed time.~~
  **Superseded (D40): this is now the opposite of the shipped behavior** — see the clamp note above.

## 5. Edge cases

- overnight ranges crossing midnight;
- disabled day with an existing Journey occurrence;
- daylight-saving missing/repeated local time;
- travel/time-zone change;
- concurrent edits on two devices;
- offline edit and later synchronization;
- notification permission disabled;
- active Journey becomes Frozen/Completed/Abandoned during conflict resolution;
- locale week ordering and RTL layout;
- migration from users with no Active Hours preference.

## 6. Technical requirements

- Use one framework-independent availability service consumed by all communication scheduling.
  **Implemented** as the pure `availability.ts` service (`isAllowed`/`allowedWindowFor`), commit `969cd43`.
- Store normalized per-day ranges plus whether the UI is in shared or per-day mode.
- Preserve wall-clock intent across time-zone changes; never store only a fixed UTC offset.
- Validate on both client and authoritative persistence boundary.
- ~~Publish an idempotent preference-change event so reminder reconciliation disables conflicts.~~
  **Superseded (D40):** reconciliation **clamps** conflicting occurrences into the day's window instead of
  disabling them; the event/reconciliation mechanism is unchanged, only its resolution action is.
- Include the preference in account export/deletion.
- **Local-only for now (D40):** no sync layer yet; see the header supersession note and
  `11_Engineering_Bible/Sync_Manifest.md`.

## 7. Acceptance criteria

1. A user can define one shared daily range or seven separate day ranges.
2. Journey windows cannot save outside the effective range.
3. ~~Changing Active Hours disables, but never silently moves, conflicting reminders.~~ **Superseded
   (D40):** changing Active Hours **clamps** conflicting reminders into the day's allowed window; it never
   disables them.
4. ~~Affected Journeys are listed with a clear path to repair.~~ **Deferred (D40):** the clamp is automatic
   and needs no repair action; a per-Journey validation UI (surfacing affected Journeys) is deferred, not
   part of the shipped account-level slice.
5. ~~The preference synchronizes through the account and works from local cache offline.~~ **Deferred
   (D40):** the shipped slice is **local-only**; sync is future work (see header + `Sync_Manifest.md`). The
   local-cache/offline half of this criterion is met today.
6. DST, travel, overnight, concurrent-edit, English/Hebrew, LTR/RTL, light/dark, and validation states
   are covered.

## 8. Out of scope

- choosing a reminder time inside an allowed range;
- notification frequency or copy;
- Calendar/location context;
- Week Boundary Preference;
- per-Journey validation UI surfacing affected Journeys (deferred, D40);
- cross-device sync (deferred, D40 — see `11_Engineering_Bible/Sync_Manifest.md`).

