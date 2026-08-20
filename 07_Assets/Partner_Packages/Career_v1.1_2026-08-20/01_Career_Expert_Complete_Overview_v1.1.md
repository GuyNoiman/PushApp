# PushApp — Career Expert Complete Candidate v1.1 (Guy-aligned)

## Status

This is the updated complete Career candidate after incorporating Guy's feedback from the v0.6 app integration.

### Current content inventory

- **20 canonical user goals**
- **30 Goal Families**
- **60 Journeys**
- **0 authored Journey Versions**
- Career diagnosis + routing
- Goal-Family axis questions
- matching dictionary
- Expert interview
- on-call playbook
- safety / professional boundaries

---

## Architecture now aligned to the app semantics

### Central library

There is one central Journey Library.

### Goal Family

A Goal Family holds:
- the user-goal intent;
- the diagnosis that lands someone there;
- the axis along which member Journeys differ;
- the question used to place the user on that axis;
- its member Journeys.

### Journey

The Journey is the unit with its own Milestone arc and the unit that accumulates outcome evidence.

### Journey Version

A Version is used only when the **Milestones stay the same** and pace/workload/path changes.

The current Career candidate does not author any Journey Versions yet.

---

## Persona / Dream rule

Personas remain useful for human QA but are not library content.

The canonical Journey library contains:
- no synthetic persona;
- no synthetic Dream;
- no synthetic personalized why[].

QA fixtures are in a separate non-import file.

---

## Expert → Family → Journey

The routing order is:

> user goal → Career Expert diagnosis → Goal Family → family-axis placement → weaker profile/onboarding pull → Journey

The profile is not allowed to decide whether a professional problem is target vs proof vs access.

---

## What changed from v1.0

1. Removed the invented `LibraryJourneyTemplate` layer from the handoff semantics.
2. Reframed all authored items as Journeys inside Goal Families.
3. Added the explicit Journey-vs-Version rule from Guy.
4. Replaced `variant` language with family axis / Journey axis position.
5. Moved all personas to a separate QA fixture file.
6. Generalized persona-specific role names/options in Steps.
7. Added an explicit diagnostic tree for “I apply and nobody answers”.
8. Cleaned remaining mixed English from user-facing Hebrew copy.
9. Updated Expert, interview, routing and matching contracts to match the above.

---

## Recommended handoff order to Guy

Do not ask him to inspect all 60 Journeys first.

1. `11_GUY_HANDOFF_v1.1.md`
2. `09_Career_Expert_Diagnosis_and_Selection_Guide_v1.1.md`
3. `04_Career_Expert_Routing_Rules_v1.2.json`
4. G11–G13 inside the central library
5. Then the remaining Career expansion

