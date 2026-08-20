# Brief for the coaching partner — the answers, not only the questions

Status: **Ready to send.** Written 2026-08-20, after ingesting `Career Expert Complete Candidate
v1.1` (`07_Assets/Partner_Packages/Career_v1.1_2026-08-20/`) and building the first diagnosis from
it. Founder decision: the diagnosis wording belongs in the partner's own files, not in our code.

---

# Brief begins

Thank you — v1.1 answered all three things we asked for, and then some. The "I apply and nobody
answers" tree was complete enough to build from directly, and it is built: a real conversation now
reaches five of our nine Career families. CAR_G11–G13 are ingested, which takes Career to 27 Journeys.

Two things came out of the build that we would like from you, and one of them is small.

## 1. The small one: two things to check on your side

**CAR_G11 and CAR_G12 carry the same `primaryBottleneck`** (`SEARCH_PROCESS_GAP`), while your own
decision tree separates them at its last question — "the search keeps collapsing" versus "I reach
interviews and it stops there". In our model a Goal Family is identified by the pair
(subtype, bottleneck), so two families sharing a pair route to whichever was declared first: somebody
who stalls in interviews would be sent to go and fix their pipeline. We have given CAR_G12
`INTERVIEW_STAGE_GAP`. **Please confirm that is what you meant, or tell us the name you would prefer.**

**Three titles arrived with their grammar broken by what looks like a terminology substitution in
your tooling** — for example `"קיצרתי אותם ל-הוכחה ברור"` and `"זיהיתי ראיות קיים ליכולת"`. We
translated them to what they plainly mean rather than reproducing them, but it is worth checking the
pipeline that produced them, because a scar like that reaching a user reaches them in their own
language.

## 2. The real one: the ANSWERS, not only the questions

Your diagnosis gives us the questions and what each kind of answer means. What it does not give us is
what a person is offered when the question appears — and that is now the missing piece, because of
how our coach works.

**Our interview is closed.** The coach asks, and the person taps one of a few option cards. A tapped
card is recorded with no model call at all, which is what keeps the coach nearly free to run and
completely predictable. Your questions are written as a coach would say them out loud, with the
answer described as a category (`many_or_broad`, `one_clear_target`). Those categories ARE the cards
— but turning a category into words a person would actually choose is authoring, and we have had to
do it ourselves. Here is what we wrote for your first question, so you can see the shape:

> **You:** "לאילו תפקידים אתה מגיש כרגע — משפחה אחת די ברורה, או כמה סוגי תפקידים שונים?"
> **Us, as cards:** `broad` → "Several different kinds of role" · `clear` → "One fairly clear kind
> of role"

That is our wording, not yours, on a question where the exact words decide the diagnosis. **We would
rather it was yours.**

### What to add, and where

In `04_Career_Expert_Routing_Rules`, each `orderedQuestions` entry already has `question` and
`interpretation`. Please add an `options` array beside them, one entry per interpretation key:

```json
{
  "order": 1,
  "question": "…",
  "options": [
    { "value": "many_or_broad",   "label": "כמה סוגים שונים של תפקידים" },
    { "value": "one_clear_target","label": "סוג אחד די ברור של תפקיד" }
  ],
  "interpretation": { "many_or_broad": "…", "one_clear_target": "…" }
}
```

Three rules for the labels, and they matter more than they look:

1. **A label is what the PERSON would say**, in the first person, not a description of their state.
   "I can do it, but it is hard to show" — never "proof gap".
2. **Every `value` must already exist in `interpretation`.** The two lists are the same list; if a
   card has no interpretation it cannot route, and if an interpretation has no card it can never be
   chosen.
3. **No label may imply a right answer.** Somebody choosing "I cannot do that work yet" has just told
   us the most useful thing in the whole tree, and it must not feel like the losing option.

The same shape applies to a Goal Family's `placementQuestion` — the one that places a person among a
family's Journeys. It has the question but not the answers, and it needs the same `options` array.

### The bigger version of the same ask

The one worked tree is complete. The other nineteen goals are not, and it is the same gap: you have
given us **36 signals with closed values** and **14 routing rules that consume them**, but the bridge
— which interview question, with which answers, produces which signal value — exists only inside
`DIAGNOSE_APPLY_NO_RESPONSE`. Your eleven interview questions (C1–C11, T1, T2) are open-ended and
unmapped.

**We are not asking for more content.** Twenty-seven Journeys is already more than we can route to.
What would unlock everything you have already written is that mapping, in the same shape as above:
question → options → signal + value.

## 3. Two answers from us, to questions you left open

You listed three product questions as deliberately ours. Two now have answers:

**The rhythm.** A library Journey carries an ARC and never a cadence — you were right to mark every
`frequencyPolicy` provisional. The coach sets the rate, from the person's profile and from how much
time they want to give that particular Journey. But it is a combination, not a handover: **please do
tell us the rhythm CONSTRAINTS your content actually knows** — that a Step is worth nothing done
once, that two a week is the floor below which an arc stops working, that a Milestone needs a
fortnight to be real. Those are things you know and the coach cannot infer. Advisory floors, and the
coach schedules within them; where a person's capacity conflicts, we lengthen the Journey rather than
drop below your floor.

**The language.** Hebrew was fine for these packages and we have translated them. Going forward,
**please write in English.** Our repository and our library are English, and the coach translates to
the user's language at runtime — so a Hebrew source makes the English a translation of a translation.
Your English is closer to what you meant than ours will ever be.

The third — the persisted Journey ↔ Expert linkage — is genuinely ours, and we will tell you when it
settles.

# Brief ends

---

## Notes for the founder (not part of the brief)

- **§2 is the ask.** Everything else is courtesy or confirmation. If he answers only one thing, it
  should be the `options` arrays — they are cheap for him and they are the difference between our
  wording and his on the questions that decide a diagnosis.
- **§2's "bigger version" is the same ask at scale**, deliberately framed as *less* work rather than
  more: he offered another content batch, and the honest answer is that content is not what we are
  short of.
- The rhythm paragraph is D65 as amended by the founder, phrased as a request rather than a ruling —
  the constraint he supplies is the half we cannot write ourselves.
