# Reply to Guy — Career diagnosis card copy update

Guy,

Great — this is exactly the validation we needed before adding more Career content.

I went through the fixed answer values and wrote the user-facing card wording in both English and Hebrew. I treated this as routing copy rather than UI copy: the goal is not just to sound good, but to make the distinction between routes as hard to misread as possible.

I also agree with the small schema point you raised. From here I would remove the second readable answer-kind name entirely and key `answerKinds` by the contract value itself. So:

- `activeJobSearch`: `yes / no`, with the old `active / not_active` kept only as legacy metadata in this update;
- `visibleProofMissing`: `yes / no / unknown`, with `missing / available` kept only as legacy metadata.

No signal values changed. This is only removing a silent-failure trap in the authoring contract.

The approved copy is in:
- `03_Career_Diagnosis_Card_Copy_v1.0.json`
- `04_Career_Diagnosis_Card_Copy_v1.0.md`

And the normalized full mapping is:
- `02_Career_Interview_Diagnosis_Mapping_v1.3.json`

I also added the 60-day planning limit to the authoring constraints. Nothing in the current 27 is affected, and for future content I will treat 60 days as the maximum initial Journey plan, with explicit extension rather than authoring a longer initial arc.

No new Career Journey content in this package. I agree we should wait for real-user evidence from the diagnosis before writing the next batch.
