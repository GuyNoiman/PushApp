# Career Authoring Constraints — v1.0

These are the current content-side constraints after Guy's latest integration feedback.

## Conversation / diagnosis

- Start conversation-first.
- Listen before asking.
- A question may be skipped when the opening message already supports its signal.
- `means` remains the semantic contract for classifying free text.
- Cards are a fallback/shortcut and use the approved wording in `03_Career_Diagnosis_Card_Copy_v1.0.json`.
- `answerKinds` keys must equal the contract values. Do not introduce a second readable key.

## Journey planning

- A Journey can be initially planned for any duration up to **60 days**.
- If an arc needs more than 60 days to make its claim true, do not author it as an initial >60-day Journey.
- A running Journey may extend beyond 60 days through an explicit extension decision.
- The library stores the arc, not cadence.
- Content may still declare advisory floors/invariants; if capacity conflicts, lengthen the Journey rather than invalidate the arc.

## Language

- Source authoring is English.
- The coach translates to the user's language at runtime.

## Career content

- Do not add more Career Journeys until real-user diagnosis evidence comes back from the app.
- The 27-Journey routing/content scope is currently the validated integration surface.
