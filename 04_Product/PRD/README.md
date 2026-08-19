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

- `Coach_Conversation_PRD.md` — one rolling Coach thread with typed context from Journey edit, miss recovery,
  real-time support, Journey creation, and general reflection; protected history, seven-day unfinished drafts,
  explicit proposal approval, and production safety/failure rules. **Stage: MVP · Status: approved product
  behavior; agent/security architecture gates remain.**
- `Friend_Profile_PRD.md` — Friend identity, relationship summary, shared-Journey presentation, and
  entry points to Achievements/support actions. **Stage: MVP · Status: Approved.**
- `Own_Profile_PRD.md` — Editing the authenticated user's identity/adaptation fields and profile photo.
  **Stage: MVP · Status: Approved.**
- `Smart_Notification_Timing_PRD.md` — low-frequency Journey-specific timing learning and Weekly Review
  proposals. **Stage: MVP · Status: Approved.**
- `Communication_Style_Profile_PRD.md` — six realistic single-choice notification comparisons select one of
  four safe account-level styles for eligible Coach wording and notification copy. **Stage: MVP · Status:
  Partially implemented, kept in root — the quiz/styles/persistence are built (commit 8313fc7), but the
  style is not yet wired into any Coach phrasing or notification copy (see file header).**
- `Dream_Management_PRD.md` — Coach-led Dream creation, My Dreams, and approved many-to-many Journey
  relationships. **Stage: MVP · Status: Ready (slice 1), partially implemented, kept in root — read-only
  surfacing shipped 2026-08-13; the Coach-led authoring conversation (this PRD's core mechanism) is not
  built (see file header).**
- `Future_Journey_Management_PRD.md` — scheduled/manual Future Journeys, editing, activation, and
  overload guardrails. **Stage: MVP · Status: Approved.**
- `Journey_Abandonment_PRD.md` — "Cancel this Journey": the first code path that ever writes the
  long-defined `abandoned` status — removes only the unlived Steps, keeps every reported one, and moves the
  Journey to history labelled "canceled" (מבוטל), as the non-destructive alternative to the existing hard
  delete (both stay). Covers the no-guilt framing, the freeze/delete/cancel distinction, and the full
  lifecycle fan-out. **Stage: MVP · Status: founder-specified 2026-08-13, specification in progress — NOT
  ready to build; seven open questions in §12, reversibility is blocking.**
- `Step_Postponement_02_PRD.md` — **continuation of the immutable `Done/Step_Postponement_PRD.md` (D37).**
  Explicit, never-automatic Journey extension when an approved postponement lands past the Journey's last
  day: the append-only extension ledger + one shared `journeyEndAt` helper (which also fixes the
  `createdAt`-vs-`effectiveStartAt` drift in `AppCore.journeyEndsAt`), the exact trigger, and the
  two-choice approval moment. **D51: a Journey always has an end date, the two-month window is planning
  guidance rather than a cap, and there is no ceiling on extension — the invariant is that the end date
  only ever moves because the user said so.** **Stage: MVP · Status: founder-decided 2026-08-14 (§4/§8);
  contract in specification, eight open questions in §14, not ready to build.**
- `Week_By_Day_Home_PRD.md` — Home's week strip: seven day pills (letter only, no dates, current week
  only), a flat Step list per day with the Dream on the card, an always-present "you could also do today"
  section of pull-forward Steps, and the rule by which a missed Step does or does not travel to the next
  day (the SAME urgency computation that feeds `streakRole`, never a second definition). Replaces BOTH
  "Today's focus" and "This week". **Stage: POC/MVP · Status: BUILT 2026-08-19; §6's open clause was
  answered by the founder the same evening and the rule follows his wording.**
- `Coach_Context_Summaries_PRD.md` — optional, minimal, end-to-end encrypted Dream/Journey context for
  the Coach. **Stage: MVP · Status: Approved; security/privacy release gate.**
- `Account_Inactivity_Freeze_PRD.md` — server-authoritative 21-day inactivity freeze for Active/Future
  Journeys, privacy-safe Ally notices, and explicit Coach/manual return without automatic resume. **Stage: MVP ·
  Status: Ready for implementation, partially implemented, kept in root — a local-first POC shipped
  2026-08-13; the server-authoritative model this PRD specifies is not built (see file header).**
- `Invite_Friend_Acquisition_PRD.md` — Circle Invite share flow, verified HTTPS links for installed users,
  Android post-install attribution, cross-platform manual invitation-code fallback, and automatic pending
  friendship-request creation without automatic acceptance. **Stage: MVP foundation / Commercial completion ·
  Status: approved for staged implementation 2026-08-14; interim manual share may ship first, but full
  automatic attribution remains a required follow-up; blocked by real auth, backend linking, a stable web
  destination, and store distribution.**
- `Weekly_Review_Contributions_02_PRD.md` — continuation of the immutable `Done/Weekly_Review_PRD.md`:
  the **contribution socket** by which any domain expert or Journey may put information (and, bounded by
  the same 48h explicit-approval gate, a proposed change) into the ONE Weekly Review instead of creating a
  second one (D50). Defines the three contribution kinds, D30 re-voicing, volume caps, empty/degraded
  states, privacy red lines, and the Smart-Notification-Timing cross-check. **Stage: Future · Status:
  approved architecture (D50), interface NOT built, NOT scheduled; 7 open questions in §14.**
- `Plan_Library_and_Learning_PRD.md` — **the three-layer architecture the founder calls "the essence of
  the app"** (**D52**, decided 2026-08-17, widened 2026-08-18). *File name predates the widened scope;
  the subject is the architecture, not one feature.* **Layer 1 — the user profile**: how to address
  someone, what motivates them, and what makes them abandon (the last already exists as the unused
  `ReasonId`/`LeverId` taxonomy). **Layer 2 — the Journey Library**: several Journeys per goal, judged on
  persistence, the **stage reached before dropping**, completion, and **end-of-Journey feedback, which is
  the label on the training data and does not exist today**. **Layer 3 — matching**: a Journey's fitness
  is *conditional* on user attributes, discovered from outcomes rather than declared. Exists because the
  four `DomainExpert`s are the opposite of this — one fixed arc per domain, so a request to drink a
  protein shake daily returns Steps about walking and stretching, and there is nothing to compare and so
  nothing to learn from. Also specifies the outbound allowlist (hard-capped at four cohort fields, with a
  rotating condition slot) and its negative space, per-instance pseudonymity, the re-identification
  analysis, **learn centrally but match on device**, the disclosure/consent model, the marketplace seam
  as a future constraint only, and **the objective function: maximise "did it help", then minimise
  interruptions, never the reverse** — so that sending less and achieving more is a win by construction.
  Companion research owning the *parameters*: `../../05_Research/User_Matching_Parameters_Research_2026-08-17.md`.
  **Stage: MVP (Layers 1–2 as local capability — Stages 0–2 buildable now with zero privacy change) →
  Commercial (the outbound record and the learning loop) · Status: founder-decided in principle, NOT
  ready to build; §§11–13 blocked on security-privacy AND store-compliance sign-off and on a privacy
  policy that does not exist; eleven open questions in §17, five blocking Stage 3 and one blocking
  Stage 1.**
- `Future/Recurring_Routine_PRD.md` — **Practice** object: **PARKED (D39, 2026-08-11).** We are not building a
  distinct recurring object now; small recurring tasks + small goals use the existing Dream/Journey/Step model,
  revisited after real usage. The analysis + product-guardian conditions are preserved in the file. **Stage: Future.**
- Existing PRD (pre-dating this folder): `../Miss_Recovery_PRD.md` — Miss-Recovery & Adaptive Reminders.
- `PRD_Coverage_Gaps.md` — **not a PRD.** A code-grounded audit (2026-08-13) of every shipped surface,
  engine and flow that still has NO PRD behind it, prioritized P1/P2/P3, with the already-covered list so
  nothing gets re-specced by accident. **Living audit — the walkable to-do for new PRD work.**
- `Personal_Growth_Style_Assessment_Form.md` — **not a PRD; reference material.** The founder's Tally
  research form ("Discover Your Personal Growth Style"), extracted 2026-08-12 as source input for the
  Onboarding / Communication-Style / Coach specs. Kept in the PRD root as reference, not moved.

### Backfill

Retroactive PRDs for ALREADY-SHIPPED features that had no PRD — grounded in the actual code, documenting
current behavior + the edge cases the code does / does not handle (captured 2026-08-13). Each carries a
**Backfill PRD** status header. Not forward specs.

- `Backfill/Journey_Lifecycle_Management_PRD.md` — the combined Journey lifecycle: coach-led edit (J1),
  delete/abandon (J2), freeze/resume (J3), and the inactivity freeze (J5) as one `status`-driven model.
  **Stage: MVP.**
- `Backfill/Streak_Mechanism_PRD.md` — the day-count streak (B2): increments once per new check-in day,
  breaks only on an URGENT missed Step; flags that the break path is dormant while `adaptiveCoach` is off.
  **Stage: MVP.**
- `Backfill/Account_Deletion_and_Data_Export_PRD.md` — local-only export + remote-first destructive delete
  (O1); flags the undeployed Edge Function and the missing Google Play deletion URL. **Stage: MVP (release
  gate).**
- `Backfill/Notification_Content_Service_PRD.md` — the unified notification content service: 9 Support-Circle
  types + reminder, tone-ready seam, lock-safe classification; flags that it is built but not yet on a
  delivery path. **Stage: MVP.**
- `Backfill/i18n_Localization_and_RTL_PRD.md` — the i18n/RTL architecture (N1): 21 namespaces at en/he parity,
  form-of-address mechanism, restart handshake; flags English config/data strings + pending device RTL
  verification. **Stage: MVP.**

### Done (implemented — see each file's status header for what shipped vs. deferred)

- `Done/Week_Boundary_Preference_PRD.md` — one authoritative, country-derived, editable week start
  (D33). MVP slice shipped; IANA/travel/multi-device + boundary stamping deferred (backend-gated).
- `Done/Own_Profile_PRD.md` — the unified private profile + the My Profile screen (D34). Phase 1
  (fields + screen) shipped; the profile photo is Phase 2, auth-provider seeding wires in with E1.
- `Done/Daily_Step_Reporting_PRD.md` — one-action Done/Partial/Couldn't/Postpone reporting with derived
  statuses and append-only history (D35/D36); reports lock on a completed Journey (D41). Deferred: an
  "x/y this week" counter row + a true recurrence/occurrence entity (post-MVP).
- `Done/Step_Postponement_PRD.md` — fast reason-free per-occurrence one-shot postpone + a day-crossing
  shorten rule (D37). Deferred: the repeated-postponement Coach intervention (needs
  `featureFlags.intervention`); `postponeCount` is persisted but no threshold fires yet.
- `Done/Weekly_Review_PRD.md` — week-close proposal, forward-only apply, 48h approval window (D40/D43),
  closed 2026-08-13 with 4 coverage tests. `adaptiveEnabled`-gated (dormant in plain production); applies
  only on explicit user approval within 48h, never automatically.
- `Done/Journey_Support_Circle_PRD.md` — consent-gated Journey Ally invitations + the Companion bundle
  (D2/D40, commit b3a9ff5; hardened + reviewed 2026-08-13). Deferred: live-DB authorization-matrix QA with
  a 2nd account (a founder action).
- `Done/User_Active_Hours_PRD.md` — account-level communication hours, clamp-not-disable (D40, commit
  969cd43). Deferred: per-Journey validation UI + cross-device sync (backend-gated).
- `Done/Journey_Reminder_Management_PRD.md` — per-Journey Off/Fixed reminder view/edit (D40, commit
  b2d4008). Deferred: Smart mode, a distinct later phase gated on the separate
  `Smart_Notification_Timing_PRD.md` engine.
- `Done/Onboarding_Questionnaire_PRD.md` — K2's language-first → Personal Info → six-question flow (commit
  d67c9a6) plus K1's notification-permission step, closed 2026-08-13 (commit 1210206). Deferred: real
  sign-in inside onboarding (K1-owned, Apple/E1-gated).
- `Done/Completion_Celebration_PRD.md` — small Step celebration + the big Journey ceremony + a shareable
  completion card (D42, I1). Deferred: I1-a in-app Ally thanks message, I1-b device-verified image export,
  and the founder's on-device visual/RTL pass (Apple-gated, applies to every new MVP screen).
- `Done/Step_Dependencies_PRD.md` — linear single-predecessor Step unlocking with a fail-open waiting-deck
  UI, built 2026-08-13. Deferred: the coach does not yet PROPOSE a dependency in live conversation
  (coach-authoring, a separate design task).

### Future

Features in `Future/` preserve approved or exploratory long-term direction but are not ready to be
implemented. When a feature is promoted to an active roadmap stage, move its PRD back to this folder
and update its Stage, Status, open questions, and Decision Log reference before development.

- `Future/Accountability_Ally_PRD.md` — Mandatory Step approval and private proof-media workflow.
  **Stage: Future · Status: Future Vision; not approved for implementation.**
- `Future/Support_Score_PRD.md` — Future support-quality signal within the Points/Leveling system.
  **Stage: Future · Status: Future Vision; not approved for implementation.**
- `Future/Points_and_Leveling_PRD.md` — simple capped daily XP progression, Streak milestones, optional weekly
  friend-support XP, large Journey-completion awards, and one lifetime Buddy Level. **Stage: Future · Status:
  approved direction; tuning, implementation details, and unlock catalog remain open; explicitly removed from MVP.**
- `Future/Achievements_Engine_PRD.md` — predefined global identity milestones, separate from XP and Journey
  completion celebrations, organized into tiered behavior families with social anti-abuse requirements.
  **Stage: Future · Status: specification in progress; continue founder session before approval; explicitly
  removed from MVP.**
- `Future/Missions_PRD.md` — game-generated activities independent of Journeys; preserves the candidate weekly
  friend-support Mission without activating it. **Stage: Future · Status: placeholder; explicitly removed from MVP.**
- `Future/Adaptive_Communication_Engine_PRD.md` — future selection among approved communication channels
  and context signals. **Stage: Future / Commercial · Status: Future Vision; not approved for implementation.**
- `Future/Personalized_Motivation_Engine_PRD.md` — Dream-connected motivational content, truthful computed
  progress statements, explicit Helpful/Not-helpful feedback, central ranking, and expert/Coach architecture.
  **Stage: Future / Commercial · Status: initial concept with open product and architecture questions.**
- `Future/Creator_Journey_Authoring_Platform_PRD.md` — professional web authoring for creator-built Journeys,
  including rich media/input Steps, Milestones, repetition, dependencies, success rules, preview, versioning,
  publishing, and privacy-safe analytics. **Stage: Future / Commercial (V4) · Status: strategic direction
  approved; detailed product, UX, business, and architecture decisions remain.**
- `Future/Integrations_Settings_Hub_PRD.md` — optional integration connection, state, permission, repair, and
  revocation management under Settings. **Stage: Future / Commercial · Status: initial direction; detailed
  specification pending.**
- `Future/Calendar_Context_Integration_PRD.md` — privacy-minimized calendar availability for Step timing and
  eligibility. **Stage: Future / Commercial · Status: initial direction; detailed specification pending.**
- `Future/Location_Context_Integration_PRD.md` — optional location context for place entry, exit, presence,
  and later commute-aware Step timing. **Stage: Future / Commercial · Status: initial direction; detailed
  specification pending.**
- `Future/Saved_Places_Management_PRD.md` — private named places created through map search and pin placement
  for use in context rules. **Stage: Future / Commercial · Status: initial direction; detailed UX/provider
  specification pending.**
- `Future/Context_Aware_Step_Scheduling_PRD.md` — explainable Step eligibility and reminder constraints using
  user-approved calendar and location signals. **Stage: Future / Commercial · Status: initial direction; rule
  model requires a dedicated product session.**
- `Future/User_Learning_PRD.md` — durable but revisable cross-Journey user-model direction (Journey Memory
  vs. a minimal cross-Journey model), represented as hypotheses, not permanent facts. **Stage: Future ·
  Status: Future Vision; direction captured, not approved for implementation.**
