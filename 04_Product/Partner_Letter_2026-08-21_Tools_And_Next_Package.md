# Letter to the coaching partner — what we built, and what we need next

Status: **Ready to send.** Written 2026-08-21. Supersedes nothing; it follows
`Partner_Brief_2026-08-20_Diagnosis_Questions.md`, whose asks are still open and are repeated at the
end so he only has to read one document.

---

# Letter begins

Hello,

A lot moved this week, and most of it came out of things you sent us. Here is what exists now, then
what we need from you.

---

## Part one — what was built

### The Tools tab is real

It was a page of eight tiles, six of which did not exist. It is now a place: a search, three ways to
look at it, five rooms, and at most two recommendations. Six tools live in it, and every one of them
carries a sentence saying what it does **to you** — a name and an icon ask somebody to be curious,
and a sentence lets them choose.

**Life Wheel.** Eight areas of a life, and every one asked twice: how is it going, and how much does
it matter right now. The finding is the DISTANCE between those two, which is the whole difference
from the classic wheel. A low score in something a person does not currently care about is a life
with priorities in it, not a problem to fix.

**Values clarification.** Sixty-five values, sorted like cards — right for very important, left for
not for me now — then narrowed to five and put in order. The last step asks how present the top three
are in the person's life today, so the output is not a list but a distance.

**My Best Possible Year.** You write from a year ahead, in the past tense, as though it went as well
as it realistically could. It comes back to you on the date you choose, with a check-in halfway.

**Direction Statement.** One sentence about where somebody is pointed, built from what draws them and
what they bring. It is explicitly **not a goal and not a commitment**, so it ends without offering to
create anything.

**Passion map.** Six prompts, up to eight Sparks, grouped into themes the person renames — and then a
daily signal that tests the map against real days. Energy and pull are recorded separately, because
an exhausting thing can still be worth returning to.

### And the one that is new, which is the one you will care about most

**Mirror feedback.** A person chooses five questions from a bank of fifteen — or writes their own —
and asks people who know them. Two modes, and they are two different promises rather than two
settings:

- **Visible:** one or more people answer with their names showing, and each answer is read as it was
  written.
- **Confidential:** at least five people answer privately, we remove identifying detail, and the
  person receives one de-identified summary per question. **They never see the raw answers.**

The rules around it are where the work went, and they are worth knowing because they shape what the
tool can honestly claim:

- the threshold is **per question**, and the whole result stays sealed until every question clears
  it — otherwise the requester learns which question people would not answer;
- they see a **count, never a person**: not who answered, not who declined, not when;
- a round runs **one week**. The result is delivered when the round closes and never as answers
  arrive — otherwise somebody watching the counter learns when each person replied, and against a
  list of seven people you invited yourself, timing is an identity;
- on day three, if it is short, the person is told and invited to add more people. Everyone then gets
  at least five more days;
- if not enough people answer, there is **no result and none is invented** — and the answers that did
  arrive are deleted, because they were given under a promise that produced nothing.

We say **de-identified**, never anonymous. Context can still make somebody guessable, and no
threshold changes that.

**One thing is deliberately not built yet:** actually sending the invitations. That needs delivery
work that is in progress, and until it lands the app does not pretend an invitation went anywhere.

### The coach measures what a conversation costs

This one matters for what we ask you for next.

Every conversation now has a **budget in tokens**, with a call ceiling behind it. It runs through
three states: while there is room the coach can ask open questions; as the budget runs down it stops
asking anything that costs and keeps to the parts that are free; and at the end it builds the best
plan it can from what it already knows. **The person is never told they ran out** — the budget
changes what the coach asks, not what it says.

### Which changes what we want from the interview

Until now our interview was almost entirely **closed**: the coach asks, and the person taps one of a
few option cards. That is fast, predictable and costs nothing — and it reads like a form.

We are moving the other way, deliberately: **fewer closed answers, more of a real conversation.** The
budget is what makes that affordable. Three things make it work:

1. **We listen before we ask.** The opening message usually already answers one or two of the
   questions we were about to ask. Those are simply not asked.
2. **We ask in words and read the answer**, rather than offering cards for everything.
3. **Cards stay, underneath, as an offer** — somebody who wants to tap can tap, and it costs nothing.

So when you write questions from here, **write them as a coach would say them out loud.** We are no
longer looking for a list of options for everything; we are looking for the question, and for what
the different kinds of answer MEAN.

---

## Part two — what we need from you

### 1. The answers to your diagnosis questions (repeated from the 20th, and still the main ask)

Your `DIAGNOSE_APPLY_NO_RESPONSE` tree is complete and it is built — a real conversation now reaches
five of our nine Career families because of it. What is missing is the same thing everywhere else:
you gave us **36 signals with fixed values** and **14 routing rules that consume them**, but the
bridge between an interview question and a signal value exists only inside that one worked tree. Your
eleven interview questions are open and unmapped.

**We are not asking for more content.** Twenty-seven Journeys is already more than we can route to.
What would unlock everything you have already written is that mapping: question → the kinds of
answer → which signal and which value.

Given the change above, the shape we want is:

```json
{
  "question": "לאילו תפקידים אתה מגיש כרגע?",
  "signal": "targetClarity",
  "answerKinds": {
    "broad":  { "means": "applying across unrelated roles", "value": "broad" },
    "clear":  { "means": "one reasonably defined family of roles", "value": "clear" }
  }
}
```

The `means` line is the important one and it is the part only you can write: it is what tells the
coach how to recognise that kind of answer when somebody says it in their own words.

### 2. Two corrections to check on your side

**CAR_G11 and CAR_G12 carry the same `primaryBottleneck`** while your own tree separates them at its
last question. In our model a Goal Family is identified by the (subtype, bottleneck) pair, so a
shared pair routes to whichever was declared first — somebody who stalls in interviews would be sent
to fix their pipeline. We gave CAR_G12 `INTERVIEW_STAGE_GAP`. Please confirm or correct it.

**Three titles arrived with broken grammar** from what looks like a terminology substitution in your
tooling — for example `"קיצרתי אותם ל-הוכחה ברור"`. We translated them to what they plainly mean, but
it is worth checking that pipeline, because a scar like that reaching a user reaches them in their
own language.

### 3. The rhythm constraints your content actually knows

We settled how rhythm works: a library Journey carries an ARC and never a cadence, and the coach sets
the rate from the person's profile and from how much time they want to give that Journey. You were
right to mark every `frequencyPolicy` provisional.

But it is a combination, not a handover. **Please do tell us the floors your content knows** — that a
Step is worth nothing done once, that twice a week is the minimum below which an arc stops working,
that a Milestone needs a fortnight to be real. Advisory floors: the coach schedules inside them, and
where somebody's capacity conflicts we lengthen the Journey rather than drop below your floor.

### 4. English, from here

Hebrew was fine for the packages so far and we have translated them. Going forward, **please write in
English.** Our repository and our library are English and the coach translates to the user's language
at runtime, so a Hebrew source makes the English a translation of a translation. Your English is
closer to what you meant than ours will ever be.

### 5. If you want to write for a tool

Everything above is about the coach. If any of the six tools is somewhere you would rather put your
next batch of work, say so — the ones with the most obvious room for a coach's hand are the
**question bank in Mirror feedback** and the **prompts in the Passion map**, both of which are ours
today and would be better as yours.

Thank you. The diagnosis you sent was the piece that turned eighteen good documents into something a
person can actually arrive at.

# Letter ends

---

## Notes for the founder (not part of the letter)

- **§2.1 is the ask.** Everything else is confirmation or courtesy. The `answerKinds.means` shape is
  new in this letter — it replaces the "options array" framing from the 20th, because we have since
  decided to move toward open questions, and asking him for option labels we no longer want would
  have wasted his time.
- **§2.5 is a deliberate offer** and worth watching: he is a coach, not a copywriter, and the tool
  prompts are the place where that shows most. It is also the cheapest way to keep him engaged if the
  diagnosis bridge takes him a while.
- Nothing here commits us to a date, and nothing mentions the build or TestFlight.
