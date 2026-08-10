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
  management, and lifecycle notifications. **Stage: MVP · Status: Approved.**
- `Week_Boundary_Preference_PRD.md` — Country-derived, user-editable start of week shared by every
  weekly engine and screen. **Stage: MVP · Status: Approved.**
- Existing PRD (pre-dating this folder): `../Miss_Recovery_PRD.md` — Miss-Recovery & Adaptive Reminders.

### Future

Features in `Future/` preserve approved or exploratory long-term direction but are not ready to be
implemented. When a feature is promoted to an active roadmap stage, move its PRD back to this folder
and update its Stage, Status, open questions, and Decision Log reference before development.

- `Future/Accountability_Ally_PRD.md` — Mandatory Step approval and private proof-media workflow.
  **Stage: Future · Status: Future Vision; not approved for implementation.**
- `Future/Support_Score_PRD.md` — Future support-quality signal within the Points/Leveling system.
  **Stage: Future · Status: Future Vision; not approved for implementation.**
