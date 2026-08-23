# Career update — response to the 2026-08-21 letter

Hello,

Thank you. I updated the Career package around the asks in your letter rather than adding more Journey content.

## 1. Diagnosis mapping — complete

The eleven core interview probes now have an explicit contract:

> question → signal → answer kinds → what each kind means → fixed value

The important part is the `means` field. It is written so the coach can classify natural-language answers without forcing the user into cards.

The coach should not ask all eleven. It listens to the opening message first, uses any signal that is already supported, and asks only the unresolved question that can change routing.

I also mapped the conditional transition/current-role probes.

Files:
- `02_Career_Interview_Diagnosis_Mapping_v1.2.json`
- `03_Career_Interview_Diagnosis_Mapping_v1.2.md`

## 2. CAR_G12 correction — confirmed

I agree with your correction.

- `CAR_G11` → `LAND_ROLE / SEARCH_PROCESS_GAP`
- `CAR_G12` → `LAND_ROLE / INTERVIEW_STAGE_GAP`
- `CAR_G13` → `LAND_ROLE / SELF_EFFICACY_PERSISTENCE_GAP`

An interview-stage failure should not collide with the sustainable-search family.

The routing file is updated in:
- `04_Career_Routing_Rules_v1.3.json`

## 3. Rhythm — arc only, with content floors

Agreed: cadence does not belong in the library Journey.

I removed cadence from the new G11–G13 authoring source and wrote only the content constraints the arc actually knows.

Most Career Journeys do **not** need a weekly frequency floor. Where repetition or elapsed time is part of what makes the claim true, the package now says so explicitly.

Examples:
- the repeated-community Journey needs at least two separate community occasions;
- the simple-rhythm search Journey must test two search moments across at least two weeks;
- the minimum-effective search Journey must test the minimum across at least two weeks;
- interview Journeys require a real target-relevant interview for the final Milestone; if one does not happen in the default duration, lengthen the Journey rather than pretending practice completed the arc;
- rejection-recovery Journeys require separate outward actions across more than one period.

File:
- `05_Career_Content_Rhythm_Floors_27_v1.0.json`

## 4. English source — adopted

Everything new in this handoff is authored in English.

The nine G11–G13 Journeys are here:
- `06_G11_G13_9_Journeys_EN_v1.0.json`

The coach can translate at runtime.

## 5. Scope — no extra content ask

I am not asking you to ingest the rest of the Career expansion yet.

This handoff is deliberately limited to:
- the 18 Journeys already in the app;
- the diagnosis mapping that makes them reachable;
- G11–G13 as the next nine Journeys.

That brings the routable Career scope to 27 once the batch is ingested.

The additional Career content we authored is staying on our side until this diagnosis contract is validated in the app.

## One implementation note

I left three useful prompts outside the fixed-signal mapping:
- “What would count as a real change here?”
- “What have you already tried, and what happened?”
- “What does the plan have to respect to be realistic?”

They are still valuable coaching questions, but they are planning/context prompts rather than fixed routing signals. I did not invent signal values for them just to make the schema look complete.

Thank you — the shift from cards-first to conversation-first makes the diagnosis work much more useful.
