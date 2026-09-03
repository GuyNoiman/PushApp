# 36 — Relationships Routing and Clarification Journey

**Version:** 0.1 content draft  
**Status:** Candidate content; not clinically approved.  
**Stage:** MVP content foundation.  
**Related contract:** `Master_Specs_Original/35_Relationships_Loneliness_Value_Ids.md`

## 1. Two different ways to gain enough information

### A. Adaptive routing conversation

Use when the user's current goal can probably be understood now. The Coach asks only missing,
discriminating questions and then consults the Relationships Expert.

### B. Clarification Journey

Use when a conversation cannot responsibly distinguish what the user needs. The user is told plainly:

> Before we choose a Journey, it may help to spend a short period noticing when you feel connected,
> when you feel alone, who and what changes that feeling, and what kind of connection is actually
> missing. Then we can choose a Journey using evidence from your real life rather than guessing.

This is not treatment and does not diagnose a disorder. It is a short evidence-gathering Journey.

## 2. When to offer the Clarification Journey

Offer it when one or more of these remain true after the short routing conversation:

- the user alternates between wanting more people and wanting more depth;
- no existing relationship candidate comes to mind, but the user is unsure whether new people are
  actually the answer;
- the user cannot identify when loneliness increases or decreases;
- context, bottleneck or desired connection remains `unclear`;
- several Journeys remain equally plausible because the relevant pattern occurs over time;
- the user explicitly prefers to observe before choosing.

Do not use it when:

- the need and relevant Journey are already clear;
- the library lacks content for a clear diagnosis (`no_match`);
- a safety or professional-referral condition is active;
- it would merely delay a small, reversible and clearly suitable first action.

## 3. Duration and effort

- Default duration: **7 days**.
- Extend once to **14 days** only when the first week was materially unrepresentative or fewer than
  three useful observations were possible.
- One optional check-in per day; target time: **under 2 minutes**.
- The user may record both a connected moment and a lonely moment, but is never required to produce
  either on demand.
- Completion requires evidence collection, not emotional improvement.

## 4. Milestone arc

| Arc id | Milestone # | Milestone title | Weight 1–5 | Ordered Step intentions | Cadence | Minutes / Step | Done when |
|---|---:|---|---:|---|---|---:|---|
| `RELATIONSHIP_CLARIFICATION` | 1 | Choose what to notice | 1 | choose observation week; name the current uncertainty; choose reminder preference | once | 5 | The user knows what the Journey is and consents to observe rather than receive an immediate recommendation. |
| `RELATIONSHIP_CLARIFICATION` | 2 | Notice moments of connection and loneliness | 1 | record a moment; select context; select what felt present or missing; optionally add a short note | daily, optional | 1–2 | At least three useful observations exist, or the user completes seven days and confirms no representative moments occurred. |
| `RELATIONSHIP_CLARIFICATION` | 3 | Look for a pattern | 2 | compare connected and lonely moments; identify people/settings; identify the likely missing connection function | once | 10 | The user and Coach produce one or more explicit pattern hypotheses without presenting them as facts. |
| `RELATIONSHIP_CLARIFICATION` | 4 | Choose the next Journey | 2 | Expert re-consult; present up to three matches with reasons; user asks/edits/chooses | once | 10–20 | The user approves a Journey, chooses to continue clarifying, or declines without a fabricated recommendation. |

## 5. Daily structured check-in

The check-in should prioritise taps over writing:

1. **How connected did you feel in this moment?** `connected`, `neutral`, `alone`
2. **What was happening?** `alone`, `one_to_one`, `small_group`, `large_group`, `online_contact`,
   `shared_activity`, `other`
3. **Who was relevant?** `existing_close_tie`, `casual_tie`, `new_person`, `community_or_group`,
   `no_specific_person`, `prefer_not_to_say`
4. **What felt present or missing?** `presence`, `belonging`, `depth`, `support`,
   `romantic_connection`, `voice_and_boundaries`, `unclear`
5. **Optional short note:** what seemed to make the difference?

The Expert receives the structured pattern summary, not raw notes or identities. If Coach analysis of
optional notes is offered, it requires explicit user action and follows the same server-side
privacy boundary used by other smart analyses: process only what is needed, do not send identity or
unrelated profile data, and retain only the resulting structured insight unless the user explicitly
saved the note as their own record.

## 6. End-of-Journey pattern summary

The Coach may say:

- “You tended to feel more connected in small, repeated settings than in large one-off events.”
- “The main difference did not seem to be how many people were present, but whether you felt known.”
- “One existing relationship appeared repeatedly in your connected moments; deepening it may fit
  better than adding more events.”

It must not say:

- “You have social anxiety.”
- “This person is good/bad for you.”
- “Your attachment style is…”
- “We proved that you need…”

Every conclusion is presented as a hypothesis the user can confirm, reject or correct. After an edit,
the Expert re-runs matching on the approved structured signals.

## 7. Cross-domain architecture

The Clarification Journey pattern is applicable across domains:

> short observation period → structured evidence → pattern hypotheses → user correction → Expert
> re-consult → approved Journey selection.

Each Domain Expert owns its domain-specific observation schema. The generic engine owns duration,
check-in completion, summary approval and the transition to a subsequent Journey. A Clarification
Journey is stored in the same central Journey repository as every other Journey; it is not a hidden
Expert-only object and not a parallel library.

Examples for later domain authoring:

- Career: observe energy, interest and friction across real work activities before choosing a direction.
- Body image: observe triggering contexts and desired function without weight surveillance or diagnosis.
- Addiction: only where medically safe; observation must never delay withdrawal-risk assessment or care.

## 8. Evidence and inspiration

- WHO distinguishes social isolation, loneliness and social connection, supporting observation of
  structure and subjective quality rather than a contact-count assumption:
  https://www.who.int/publications/i/item/978240112360
- Loneliness intervention reviews distinguish social opportunity, social support, social skills and
  social cognition, supporting bottleneck identification before selection:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3865701/
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9593938/
- Perceived partner responsiveness research supports examining moments of feeling understood,
  cared for and appreciated, while not proving causation for an individual relationship:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC5922804/

## 9. Acceptance tests

1. A user with clear depth need and an existing safe tie is not sent through clarification.
2. A user with inconsistent “more people” and “more depth” signals may choose clarification.
3. A clear diagnosis with missing library content returns `no_match`, not clarification.
4. A safety signal exits ordinary routing immediately.
5. Three useful observations may be sufficient; seven daily entries are not mandatory.
6. No observation is interpreted as evidence of failure.
7. The user can correct the summary before it becomes an Expert input.
8. Raw identities and notes never enter the Domain Expert consultation.
9. Final selection still requires the normal user approval boundary.

