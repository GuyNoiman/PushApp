# Reply — the 15 onboarding findings, 2026-09-06

Every point below was checked against the code before it was answered. Where a finding is confirmed,
the file is named. Where I could not reproduce it, I say so rather than agreeing politely.

**The headline: you are right about the cause, and it is #13.** The character already forbids
almost everything you listed. The flow still forces it. A prompt cannot win against a loop, and
that is exactly what is in the code: `CoachOrchestrator` walks a fixed array with `questionIndex++`.
Ten of your fifteen findings are that one fact seen from ten angles.

---

## Confirmed, in the code

### 1. The opening is still a chatbot line — **confirmed, exactly as you quote it**

`src/i18n/resources/en/coachContent.json` line 2 reads, literally:

```json
"opening": "Hi, how can I help you today?"
```

It is one string. It is also the cheapest thing on this list and it is a real change, not a cosmetic
one: the first line decides whether the next ten minutes are a service desk or a conversation.

Spec §4.2. Fix: replace the string, in both languages, with the change-oriented opening.

### 2. It runs a questionnaire rather than a conversation — **confirmed, and this is the root**

`CoachOrchestrator` holds `private questions: DomainQuestion[]` and `private questionIndex = 0`, and
advances with `this.questionIndex++` (line 1061). The next question is *the next element of an
array*. Nothing consults what has already been said.

The orders themselves are in `interviewPlaybook.ts`:

```ts
const PROGRESSIVE_ORDER = ['processType','milestones','motivation','failureRisks','timing','locationCalendar','supportCircle'];
```

That is your "question → answer card → question" loop, in one line of code.

Spec §4.4. This is the orchestration change, not a copy change.

### 3. Journey routing is exposed — **confirmed, and it is deliberate today**

`CoachOrchestrator` builds `journeyChoiceQuestion` whose options are the Journey-family labels
(line 814). It is not a bug; it is the current design, and the spec already says it must stop:

> If routing is resolved, choose the Journey family internally. Do not show domain/family/variant
> taxonomy merely to confirm the engine's own decision. — §4.7

Fix: when routing resolves, select internally and confirm the *meaning* in natural language. Show
options only when the engine is genuinely unresolved.

### 5. Almost no real reflection — **confirmed; there is no reflection mechanism at all**

The only thing in the orchestrator that reflects anything is the multi-goal focus turn, which names
back the goals it detected when somebody described several. There is no code path that combines two
answers into an observation, and no place a reflection could be inserted between a question and the
next one.

This is not "the model is not doing it". There is nowhere for it to happen.

Spec §4.5, and the character's rules for it are already written (§3).

### 6. There is no question budget — **confirmed**

Seven extraction fields, plus the diagnosis questions, plus the family choice, plus a variant
question, plus the horizon question. Nothing anywhere counts, and nothing stops. Your list of what
you were asked — current state, time, blocker, what will keep you going, working style, duration,
scheduling — is that sequence read back.

Spec §4.3: normally 2–4 in Phase A, a hard ceiling of 4.

### 7. Understanding and reality-fit are not separated — **confirmed, same cause as #6**

Both live in the same array, so `timing`, `locationCalendar` and `supportCircle` are asked in the
same uninterrupted run as `motivation` and `failureRisks`. There is no seam where the flow could
stop and reflect, because there is only one list.

Spec §4.1's three phases exist as a description and nowhere in the code.

### 8. No starting-point summary — **confirmed; nothing exists**

There is no phase, no turn type and no screen for it. `phase` goes to `'done'` and the closing turn
is built (line 1185 onward).

Spec §4.8. It is also the single highest-value item on your list, because it is the moment the
person finds out they were listened to.

### 9. The pre-build line is generic — **confirmed, and I can show you why**

What you saw comes from `coachContent.json`:

```json
"ambitious": "This is a real stretch — doable, but it will ask for steady effort."
```

It is one of a handful of feasibility strings chosen by a bucket. Everybody in that bucket gets the
same sentence, which is why it reads as though it could belong to anyone. It could.

Spec §4.8 replaces this with the grounded summary.

### 10. Capacity is asked more than once — **confirmed**

The onboarding capacity signal is read in exactly one place, as a *fallback for the feasibility
calculation*. The orchestrator's own comment says it:

> the expert's time question, or failing that onboarding capacity

The expert's time question is asked regardless of what is already known. So yes: answer it once,
get asked again.

Spec §4.9's precedence — this conversation, then an existing signal, then ask — is not implemented.

### 12. It does not skip what is already known — **confirmed**

There is exactly one skip in the whole orchestrator: a chosen Journey's variant question is skipped
when the profile has already answered it. Nothing else is ever skipped, and nothing is ever resolved
from natural language.

Spec §4.4 is the fix and it is the same work as #2.

### 13. The character is not the problem any more — **agreed, and this is the correct diagnosis**

Everything you name is already in `coachCharacter.ts`: never assume a fact they did not give you,
never ask what they have already told you, reflect before proposing, no hidden questionnaire. The
character is not being ignored — it is being **overruled by the flow**, which hands the model one
predetermined question at a time and gives it nowhere to put a reflection.

So: agreed. The next change is orchestration, and calling anything else done would be theatre.

### 14. It fails the basic acceptance test — **agreed**

"I answered a series of questions and then a plan was built" is an accurate description of what the
code does. §9 of the spec is the checklist and it is not close to passing.

### 15. The build did not match the spec — **my error, already fixed**

You are right and it was mine. I added the acknowledgement screen on 6 September, logged the
decision, updated the Backlog, and did not update the one document that claims to be the only one.

Fixed in this commit: spec §2 now lists six screens and **§2.2** carries the screen, its copy, its
button, and why it deliberately does not wear the introduction's chrome. The section also records
that the build changed while the document did not — a spec that catches up silently teaches nobody.

The change itself was intentional: it is the founder's first conclusion from the competitor
analysis, an opening that acknowledges the difficulty before selling a solution (D98).

---

## Could not reproduce

### 4. Question copy paired with the wrong answer set

I could not find this in the code, and I would rather say so than agree and fix nothing.

`interview.foundation` ("Why does this matter to you right now?") is a prompt with no options of its
own; the family labels belong to `career.journeyChoice`, which carries its own prompt. Every turn
ships its prompt and its options in the same object, so a crossed pair should not be constructible.

Two possibilities, and I cannot tell them apart from here:

1. what you saw was two adjacent turns — the foundation question answered, then the family cards
   arriving under a bubble that was still on screen; or
2. there is a real path I have not found.

**A screenshot of that exact screen would settle it in a minute.**

### 11. Weekly capacity rendered with duration answers

Same answer, and I checked all three:

| Question | Prompt | Options |
|---|---|---|
| `general.time` | how much time each week | Under 1 hour · 1–3 · 3–5 · More than 5 |
| `career.time` | how much time each week | the same four |
| `shared.horizon` | how long do you want to give this | About a month · About two months · No fixed end |

They are correctly paired **today**. What does not exist is the thing you actually asked for: a test
that makes crossing them impossible. Nothing stops the next edit from doing it, which is presumably
how it happened the first time. Filed as `O-27`, and it is cheap.

---

## One thing you did not list, which I found while checking yours

**The career expert's questions are hard-coded English.** `core/learning/domains/career/index.ts`
holds prompts and options as literal strings rather than locale keys:

```ts
{ id: 'career.time', prompt: 'How much time can you give to this each week?',
  options: ['Under 1 hour', '1–3 hours', '3–5 hours', 'More than 5 hours'] }
```

Every English answer card you reported leaking into the Hebrew run comes from that one file, and the
other three domains are built the same way. This is the cause of the leak you reported twice. Filed
as `O-26`; it is contained and it does not need the orchestration work to land first.

---

## What happens next

Ten of your findings are one piece of work: **§4 of the spec, implemented in the orchestrator** —
who decides the next turn, when an answer card is shown at all, when a signal counts as resolved,
when a reflection happens, when understanding stops, and when the build begins.

Three are independent and can land without it: the opening string (#1), the hard-coded English
(O-26), and the pairing guard (#11 / `O-27`).

Your test for the next build is the right test, and it is now §9 of the spec. Nothing should be
reported as done against it until a real run passes it.
