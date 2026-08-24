# Letter to the coaching partner — the diagnosis is wired, and one thing needs your correction

Status: **Ready to send.** Written 2026-08-24. It follows
`Partner_Letter_2026-08-21_Tools_And_Next_Package.md`, whose §2.1 ask he ANSWERED in the
`Career_v1.2_2026-08-23` package — so that letter's main request is closed and is not repeated here.

---

# Letter begins

Hello,

Your v1.2 package did exactly what we asked for, and it is now running in the app. Here is what it
turned into, and the one thing we need back from you.

---

## The diagnosis is wired

Until this week the Career Journeys you authored were in the app and **unreachable**. The coach asked
four fixed questions and built the same generic four-Milestone arc for everybody, whatever the person
had just said. Twenty-seven validated, translated Journeys, and no route from a conversation to any
of them.

Your mapping is what closed that. A career conversation now:

1. **listens first** — the understanding call the coach already makes reads your closed signals
   straight out of the opening message, so a question it has effectively answered is never asked;
2. **runs your diagnosis before anything else**, because it decides which JOURNEY somebody gets while
   the expert's own questions only shape one;
3. **routes on the family** your subtype + bottleneck names, and builds that Journey's authored arc —
   your Milestones and your Steps, in the user's language.

Your ordering held up: target first, then capability versus proof, then access, then process. The
stop rule is enforced rather than encouraged — as soon as one answer settles the diagnosis, nothing
further is asked.

We also kept your rule that an unresolved diagnosis is a legitimate result. `capabilityGap`,
`notEnoughEvidence` and `noClearPattern` are recorded on the plan rather than smoothed into the
nearest family.

## What we need from you — the wording of the answers

**This is the ask.** You wrote the answer kinds as CATEGORIES with a `means` line each, which is
exactly right for classifying free text. But a person tapping a card has to see a sentence, so we
turned each category into something somebody would say — and **those words are ours, not yours.**

They have not been through you, and they are the words a real user reads at the moment the routing is
decided. Example, from the target question:

| Your kind | Our card |
|---|---|
| `broad` | "Several different kinds of role" |
| `clear` | "One fairly clear kind of role" |

And from the proof question:

| Your kind | Our card |
|---|---|
| `no` (existingRelevantExperience) | "Honestly, I cannot do that work yet" |
| `yes` (visibleProofMissing) | "I can do it, but it is hard to show" |
| `no` (visibleProofMissing) | "Yes, I have clear relevant examples" |

Please correct them freely. A wording that makes somebody pick the wrong card is a wrong route, and
that is a content decision rather than an interface one — it belongs to you. The full set is in
`app/src/core/learning/experts/careerDiagnosis.ts`, and the Hebrew is in
`app/src/i18n/resources/he/library.json` under `career.diagnosis`.

## One small thing worth knowing about your own file

In `02_Career_Interview_Diagnosis_Mapping_v1.2.json`, an answer kind's NAME and the `value` it
carries are sometimes different words:

- `activeJobSearch`: kinds `active` / `not_active`, values `yes` / `no`
- `visibleProofMissing`: kinds `missing` / `available`, values `yes` / `no`

We had been following the readable half. It is not a mistake in your file — the `value` is clearly the
contract — but it fails **silently** when someone follows the other one: the value is dropped, the
signal reads as absent, and the coach quietly goes back to asking a question it did not need to ask.
Nothing errors. We now check every signal and value against your file automatically, so it cannot
drift again. If the two ever want to be the same word, that would remove the trap entirely — your
call.

## One planning constraint worth knowing for future content

A Journey is now planned for **up to sixty days**, and any length inside that (founder decision,
2026-08-25). Nothing you have sent is affected — every arc in the twenty-seven runs 21 to 35 days,
which we checked rather than assumed. It matters only for what gets authored next: an arc that needs
more than sixty days to make its claim true is an arc the creation flow cannot offer as-is. A Journey
may still RUN longer through an explicit extension, which is a decision made with the plan in hand.

## Content: still no ask

You said not to send more Career content until the diagnosis contract is validated in the app, and we
agree. It is validated in code and in tests; what it has not had yet is a real person in front of it.
When it has, we will tell you what actually happened rather than what we expected.

Thank you — this was the piece that made the rest of it reachable.
