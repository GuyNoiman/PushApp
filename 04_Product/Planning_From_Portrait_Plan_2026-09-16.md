# The second conversation continues from the Portrait — implementation plan

**Status:** Approved approach, staged; Stage 0+1 in build for the 2026-09-17 release. Career only, per
the founder: "קודם כל הכל יעבוד מושלם על מומחה אחד ואז נוסיף נוספים". Written by the architect
2026-09-16.

**Why:** the intro Journey's fourth Step opens the coach in `planning` mode, which never sees the
Portrait. A person who just told the coach who they are is asked again — what they want, where they
are, what is in the way, what keeps them going. The founder's spec forbids exactly that ("must not
restart discovery from zero").

## Found while planning

1. Planning has no Portrait input at all (`CoachOrchestratorOptions`, `knownSoFar()` introduction-only,
   `coach.tsx` passes only the old onboarding summary).
2. **The founder's own example cannot reach its authored Journey.** `consultCareer` only runs the
   `APPLY_NO_RESPONSE` tree (all `LAND_ROLE` job-search families). The `FIND_DIRECTION` families
   (`career.nextStep`, `twoOptions`, `fitTest`) and `returnAfterRejection` exist but nothing routes to
   them — so "eight years in marketing, want out, don't know what next" gets the GENERIC career arc.
   The partner already authored the missing rule `ROUTE_G01_VS_G08`
   (`07_Assets/Partner_Packages/Career_v1.2_2026-08-23/04_Career_Routing_Rules_v1.3.json`) and approved
   he/en copy for its two questions C1/C2 (`.../Career_v1.3_2026-08-25/03_Career_Diagnosis_Card_Copy_v1.0.json`).
3. The library holds **27 career Journeys in 9 families; only 15 in 5 are reachable.** (The completion
   plan's "18 in 6" is stale.)
4. Only `career.baseline` (level) and `career.milestones` (staging) change the built plan; foundation,
   obstacles and motivation only shape wording.

## Design: a deterministic handoff at construction

Coverage is decided by tables, not by a model reading, so "never re-ask" holds offline too.

- **Text-trusted** field: confidence medium+. **Enum-trusted** (stage, bottleneck): stated at medium+
  or inferred at high. `low` never covers anything.
- **Handoff applies** when Portrait `domain` is career at medium+ and `primaryWant` is text-trusted;
  coverage switches on only when the goal read in THIS conversation is also career.

| Question | Covered when | Written to answers? |
|---|---|---|
| foundation | primaryWant and desiredOutcome text-trusted | No |
| baseline | stage enum-trusted and mapped, or currentState text-trusted | At `finish()` only if this conversation left it empty |
| obstacles | bottleneck text-trusted, not unknown | No |
| motivation | desiredOutcome text-trusted | No |
| time, horizon, scheduling | **Never** (D102 exact) | — |
| milestones, Journey version/axis | **Never** | — |

Stage → baseline option: explore/choose → 0; prepare/act/sustain → 1; grow → 2; unblock unmapped.
Covered questions are removed from the ASKING queue but still offered to the conversation reader, so
what the person says now overwrites the Portrait default.

**Opening (Stage 1, no model call):** stated want → quote it ("Last time you told me: "…". Let's start
there. Is that still what you want to work on, or has something changed?"); inferred want → remember
without quoting; thin or no Portrait → exactly today's opening. Inferred lines are never quoted as if
said.

**A different goal** ("I want to get fit" with a career Portrait): no seeding at all; byte-for-byte
today's path for that domain; the Portrait is untouched.

**Once only:** `AppState.portraitHandoffUsedAt`; the handoff reopens only if `primaryWant` changed since.

## Stages

- **0 — lock today.** Snapshot every model request of a no-Portrait career planning conversation; every
  later stage keeps it identical.
- **1 — "the coach remembers me."** Constructor option, marker, template opening, seeded goal-reading
  call with a Portrait fallback, coverage table, baseline default, Portrait facts in `knownSoFar()`.
  **0 new calls; about 4 question turns (~8 calls) fewer — net cheaper.**
- **2 — "explorers get the direction Journey."** Portrait → C1 (`careerDirectionClarity`) only;
  `ROUTE_G01_VS_G08` before `APPLY_NO_RESPONSE`; the C2 question with the partner's copy. Nothing else in
  the Portrait maps honestly onto job-search signals C2–C8 (D109 kept those for this conversation).
- **3 — the second conversation teaches the Portrait.** `refreshPortrait` once at the check and per
  correction; a stated contradiction replaces, an inferred one only lowers confidence. +1 call.
- **4 — a composed opening** from the Portrait (template on failure). +1 call.

Roughly 21 calls today for a career planning conversation → about 14 after all four.

## Risks

Portrait free text reaches three more model calls (security-privacy to confirm purpose wording);
the opening quoting a stated line vs D111 "not shown in the UI" (product-guardian quick gate — reading:
the coach speaking, like the check already does); partner question: should C1 `partial` with two
concrete options go to `twoOptions` rather than G01 (no rule authored, so not routed).

## Related
`04_Product/Onboarding_Journey_Matching_And_Coach_Handoff_Spec_v2_2026-09-14.md` §§26–27 ·
`04_Product/Onboarding_Completion_Plan_2026-09-15.md` S5 · `06_Decisions/Decision_Log.md` D102, D108–D111
