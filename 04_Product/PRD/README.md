# PRD — Product Requirement Documents

Status: Living folder. **The single home for every feature's PRD.** From here on, every feature or
change in the system gets an orderly PRD, and all PRD files live in this folder.

## Working method (founder decision, 2026-08-10)

1. Each PRD is one file in this folder (one feature/flow per file).
2. **The founder points to the specific file to work on** — explicitly says "read this file and
   implement it." Nothing here is picked up unprompted.
3. On being pointed to a file, the AI: **reads it → asks clarifying questions → surfaces problems and
   edge cases (especially ones we haven't discussed) → edits the file if we decide to → and only then
   develops** against it.
4. PRDs are grounded in the ACTUAL code for already-built features (current behavior + the edge cases
   the code does / does not handle), not generic specs.
5. Product decisions that come out of a PRD are also logged in `06_Decisions/Decision_Log.md`
   (the PRD links to the relevant D-entry), and the PRD is gated against vision/terminology by
   product-guardian.

## Done-file protection rule (founder decision, 2026-08-10)

1. Before creating or editing any PRD, search the complete `04_Product/PRD/` tree — including `Done/`
   and `Future/` — for an existing file for that feature.
2. A file inside `Done/` is immutable. Never edit, move, rename, or overwrite it.
3. If completed work needs a continuation, create a new file outside `Done/` with the same base feature
   name and the next two-digit serial suffix: `_02`, then `_03`, and so on.
4. Determine the next serial by checking every active, Future, and Done version first. Never assume `_02`
   is available.
5. A continuation must link to the Done predecessor and state what it extends or supersedes. It must not
   silently rewrite the completed decision history.
6. Files outside `Done/` may be edited while their feature is still under specification, subject to the
   repository's normal preserve-history rules.
7. **Done tracking (founder, 2026-08-10):** once a PRD's approved/current scope is IMPLEMENTED and
   green, its file MOVES to `Done/`. The file keeps its status header showing exactly what shipped and
   what is deferred (a later phase or a dependency), so the root folder stays a live picture of what is
   still open vs. what is done. If a deferred phase later becomes active work, note it (or spin a new
   PRD) rather than un-doing the move.

## Standard edge-case checklist (run against every PRD)

Empty / first-run · offline · permission denied · completed / frozen / abandoned states · concurrent
actions · very long / empty input · RTL · form of address (gender) · deletion / data-loss ·
error states.

## Index

- `Friend_Profile_PRD.md` — Friend identity, relationship summary, shared-Journey presentation, and
  entry points to Achievements/support actions. **Stage: MVP · Status: Approved.**
- `Own_Profile_PRD.md` — Editing the authenticated user's identity/adaptation fields and profile photo.
  **Stage: MVP · Status: Approved.**
- `Journey_Support_Circle_PRD.md` — Journey-specific Ally invitations, consent, viewing permissions,
  management, and lifecycle notifications. **Stage: MVP · Status: Ready (D40) — consent gate + Companion (system-generated Step progress only, no images/UGC); light security-privacy pass pending.**
- `User_Active_Hours_PRD.md` — account-level communication hours with shared or per-day configuration.
  **Stage: MVP · Status: Implemented (account slice, commit 969cd43; clamp-not-disable, D40).**
- `Journey_Reminder_Management_PRD.md` — view/edit/disable Fixed or Smart reminders for an existing Journey.
  **Stage: MVP · Status: Ready — Off/Fixed built (commit b2d4008); Smart deferred (D40).**
- `Smart_Notification_Timing_PRD.md` — low-frequency Journey-specific timing learning and Weekly Review
  proposals. **Stage: MVP · Status: Approved.**
- `Communication_Style_Profile_PRD.md` — one unified style driving coach + notifications, selected via onboarding.
  **Stage: MVP · Status: Open — selection gated on onboarding (D40).**
- `Dream_Management_PRD.md` — Coach-led Dream creation, My Dreams, and approved many-to-many Journey
  relationships. **Stage: MVP · Status: Ready (slice 1) — coach-owned Dreams, primary + secondary (D40).**
- `Future_Journey_Management_PRD.md` — scheduled/manual Future Journeys, editing, activation, and
  overload guardrails. **Stage: MVP · Status: Approved.**
- `Coach_Context_Summaries_PRD.md` — optional, minimal, end-to-end encrypted Dream/Journey context for
  the Coach. **Stage: MVP · Status: Approved; security/privacy release gate.**
- `Future/Recurring_Routine_PRD.md` — **Practice** object: **PARKED (D39, 2026-08-11).** We are not building a
  distinct recurring object now; small recurring tasks + small goals use the existing Dream/Journey/Step model,
  revisited after real usage. The analysis + product-guardian conditions are preserved in the file. **Stage: Future.**
- Existing PRD (pre-dating this folder): `../Miss_Recovery_PRD.md` — Miss-Recovery & Adaptive Reminders.

### Done (implemented — see each file's status header for what shipped vs. deferred)

- `Done/Week_Boundary_Preference_PRD.md` — one authoritative, country-derived, editable week start
  (D33). MVP slice shipped; IANA/travel/multi-device + boundary stamping deferred (backend-gated).
- `Done/Own_Profile_PRD.md` — the unified private profile + the My Profile screen (D34). Phase 1
  (fields + screen) shipped; the profile photo is Phase 2, auth-provider seeding wires in with E1.

### Future

Features in `Future/` preserve approved or exploratory long-term direction but are not ready to be
implemented. When a feature is promoted to an active roadmap stage, move its PRD back to this folder
and update its Stage, Status, open questions, and Decision Log reference before development.

- `Future/Accountability_Ally_PRD.md` — Mandatory Step approval and private proof-media workflow.
  **Stage: Future · Status: Future Vision; not approved for implementation.**
- `Future/Support_Score_PRD.md` — Future support-quality signal within the Points/Leveling system.
  **Stage: Future · Status: Future Vision; not approved for implementation.**
- `Future/Adaptive_Communication_Engine_PRD.md` — future selection among approved communication channels
  and context signals. **Stage: Future / Commercial · Status: Future Vision; not approved for implementation.**
