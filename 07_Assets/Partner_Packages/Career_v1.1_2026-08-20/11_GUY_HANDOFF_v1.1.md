# Handoff to Guy — Career Expert Complete Candidate v1.1

This update explicitly incorporates your note about the v0.6 integration.

## First: confirmation on §1

**I agree with the Journey / Version rule.**

For the six families already ingested in v0.6, the three routes were intended as **three distinct arcs**, not one arc at different pace.

Across the current full Career candidate, every multi-Journey family has different Milestone sequences between its member Journeys.

So the intended semantics are now:

> Different Milestones → different Journeys.  
> Same Milestones + different pace/workload/path → Versions of one Journey.

The current package authors **60 Journeys and 0 Journey Versions**.

`variantAxis` has been retained semantically as the **Goal-Family axis**: it explains the dimension along which member Journeys differ and includes the question that places a user on that axis.

No content is asking you to re-pool the Journeys as versions.

---

## Second: personas

Agreed.

Personas/Dreams/personalized why[] are now **completely absent from the canonical library file**.

They live only in:

`12_Authoring_QA_Fixtures_v1.1.json`

That file is explicitly non-importable QA material.

User-specific role names/options were also generalized in the Journey Steps.

---

## Third: Hebrew copy

The canonical user-facing content has been cleaned again for mixed internal English terminology.

The app can continue handling masculine/feminine conversion as you described; the authoring source can stay in the natural form used by the writer.

---

## The piece you said is missing: diagnosis

Please review this first:

`09_Career_Expert_Diagnosis_and_Selection_Guide_v1.1.md`

and:

`04_Career_Expert_Routing_Rules_v1.2.json`

The specific “I apply and nobody answers” flow is explicit:

1. target clarity;
2. capability vs proof;
3. access;
4. only then process / sample / later-stage failure.

So the Expert, not onboarding matching, decides whether this is CAR_G08, CAR_G09, CAR_G10, a capability family, CAR_G11/CAR_G12, or still insufficient evidence.

---

## G11–G13

They are included in the full library and are ready as the next content batch after v0.6:

- `CAR_G11` — sustainable job-search process — 3 Journeys
- `CAR_G12` — interview progression — 3 Journeys
- `CAR_G13` — return after rejection — 3 Journeys

That takes the already-ingested 18 to 27, exactly as requested.

---

## Full Career candidate

We continued authoring beyond G13 on our side so the Career Expert could be closed as a content candidate before handoff.

The full package currently contains:

- 20 canonical user goals;
- 30 Goal Families after bottleneck-specific splits;
- 60 Journeys;
- 0 authored Journey Versions;
- Career interview;
- diagnosis/routing;
- matching dictionary;
- on-call playbook;
- safety/boundaries.

I am **not** asking you to ingest all remaining Journeys before validating the diagnosis contract.

Recommended review/integration order:

1. confirm Journey/Version semantics — already aligned here;
2. review diagnosis/routing;
3. ingest G11–G13;
4. confirm the Goal-Family/axis selection contract;
5. then review the remaining Career expansion.

---

## Product questions still intentionally left to you

1. Exact persisted schema/field names for Journey ↔ Expert linkage.
2. Final `rhythm / sessionsPerWeek / recurring Step` convention.
3. Exact importer/builder mapping for the remaining authoring package fields.

The content package does not assert answers to those implementation questions.
