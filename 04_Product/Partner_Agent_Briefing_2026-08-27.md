# PushApp — a briefing for the partner's agent

Date: **2026-08-27**
Audience: **the domain partner's AI agent**, and the partner reading over its shoulder.
Purpose: enough of the product, the plan and the machine that you can propose things we can
actually build — and can tell, before you write a word, which proposals are cheap, which are
expensive, and which are impossible.

**How to read this.** It is long on purpose, but it is not a specification. Sections 1–4 are what the
product IS and must not be argued with lightly. Sections 5–8 are what EXISTS today, verified against
the code on the date above, not aspirational. Sections 9–12 are the plan, the gaps and how to send us
something we can build from. If you read only two sections, read **§3 (the vocabulary)** and
**§12 (how to write a spec we can build)**.

**What we are not asking you for.** Screens, components, data schemas or implementation. We have an
engineering side and it is opinionated. What we need from you is the thing we cannot generate:
**domain truth** — what a real practitioner would ask, in what order, what the answer means, and what
a person should actually do next.

---

## 1. The mission, and the one sentence everything is measured against

> **Helping people become who they choose to be.**

The belief underneath it: people rarely fail because they do not know what to do. They fail because
life pulls them away from the path they chose. PushApp exists to close the gap between **intention
and action**.

Three consequences that will constrain what you propose, so they are worth internalising now:

1. **This is not a habit tracker, a task manager or a productivity app.** If a proposal would be at
   home in one of those, it is probably wrong here.
2. **Growth before engagement.** We do not add a feature because it drives usage. The test is *does
   this help somebody become who they chose to be*, not *does this bring them back*. A mechanism that
   makes people open the app more without making them finish anything is a failure by our own
   standard, and we will decline it.
3. **The vision never shrinks.** If something is too hard for now, it moves later in the roadmap; it
   is never deleted. So "not now" from us is a scheduling answer, not a rejection — and you should
   read it that way.

### The product principles that most often decide an argument

- **Reality is always correct.** If somebody missed four days, the plan was wrong about their life,
  not the person. The app adapts; it never scolds.
- **Progress over perfection.** A partial Step is progress. A broken streak is information.
- **Support before pressure.** Every nudge is help. Nothing shames.
- **AI should feel invisible.** The coach is a voice, not a feature list. The user should never be
  asked to think about models, prompts, signals or variants.
- **Every screen has one job.**
- **Every Journey must end.** Open-ended is a lifestyle; a Journey is a commitment with a last day.

---

## 2. The shape of the product in one paragraph

A person tells the coach what they want to change. The coach understands it, asks only what it still
needs, and builds a **Journey** — a bounded plan of **Steps**, grouped into **Milestones**, pointing
at a **Dream**. Each day the app shows what is due. The person reports what happened, including when
nothing happened, and the plan adapts. They can invite people they trust to see a little of it and
cheer. When the Journey ends, it is celebrated and closed.

---

## 3. The vocabulary — use these words exactly

This is the part an agent most often gets wrong, and getting it wrong costs us real time. These are
not preferences; they are the product's nouns, and a document that renames them cannot be merged.

| Term | What it means | Never call it |
|---|---|---|
| **Dream** | The life direction. Aspirational, has no end date, is never "completed". A person has few. | goal, vision board |
| **Journey** | A bounded, ending plan that moves a person toward a Dream. Has a length (max 60 days at planning time). | challenge, program, plan, course |
| **Milestone** | The optional mid-layer: an ordered arc of Steps inside a Journey. | phase (retired), chapter, stage |
| **Step** | The smallest unit of progress. Belongs to exactly one Journey. Done once. | task, todo, action item |
| **Buddy** | The creature that represents the person's hope and progress. | pet, avatar, mascot |
| **Ally** | A specific person supporting a specific Journey, by invitation and acceptance. | friend (a friend is a different, weaker thing), buddy |
| **Support Circle** | The set of Allies around one Journey. | team, group, community |
| **Mission** | A small in-app objective that earns rewards. Not a Journey. | quest, task |
| **XP / Coins / Grace Tokens** | Progression, currency, and earned permission to miss without breaking a Journey. | points, gems, streak freeze |
| **the coach** | The AI that understands and plans. Internally the meta-agent. | assistant, bot, AI |

Two distinctions we care about more than they may look:

- **A friend is not an Ally.** A friend is someone you keep. An Ally is someone standing with you on
  one specific Journey, who may be a stranger otherwise. Merging them would imply a relationship
  nobody agreed to.
- **A Dream is not a big Journey.** A Journey ends. A Dream does not. Proposals that give a Dream a
  deadline are proposing something else.

Canonical source, if you need the full definitions: `09_Product_Philosophy/Product_Terminology.md`.

---

## 4. The object model

```
Dream  (no end date, few per person)
  └── Journey  (bounded, ≤60 days at planning, has a "why", has a status)
        └── Milestone  (optional, ordered)
              └── Step  (done once, may carry a date, a duration, a difficulty, a dependency)
```

Things worth knowing because they change what a proposal can assume:

- **A Journey has a status**: `active`, `frozen` (paused), `future` (approved, starts later),
  `completed`, `abandoned`. They behave differently and a spec should say which it means.
- **A Step is completed once.** There is no recurrence entity. `cadence` on a Step is a pace *hint*,
  not a rule. A "do this every Tuesday" plan is expressed as many Steps, not one repeating Step.
- **A Step may have no date at all.** Frequency-based plans carry a weekly session target instead.
  Any proposal that assumes every Step has a calendar date is wrong for most Journeys today.
- **A Step carries no weekday.** The weekday a Step falls on is an artifact of the dates, not stored
  intent. We cannot tell whether "Sunday" was meaningful or incidental, and we refuse to pretend we
  can. This is a real modelling gap and it is written down as one.
- **Reports are append-only.** A Step's history — done, partial, could not — is a record. Nothing
  rewrites it.

---

## 5. What actually exists today

Verified against the code on 2026-08-27. This is the part most likely to save you from proposing
something that already ships, or assuming something that does not.

### 5.1 The coach

- A **live conversational coach** on a paid Gemini key. It reads what a person writes, routes to a
  **domain expert**, runs that expert's interview, and produces a structured goal spec.
- It **skips what it already knows**: an answer present in the opening message is not asked again.
- It **understands or it stops.** With no connection it says so rather than guessing — it will not
  turn whatever somebody typed into the title of a Journey.
- **Sensitive domains are handed off, not planned.** Addiction and a relationship in difficulty are
  routed to a person; they never become a Journey. This is a hard rule, not a setting.
- The coach **remembers**, with separate consent: a few bounded lines per Dream and per Journey — the
  outcome, the constraints, the obstacle categories. Never the conversation.

### 5.2 The career domain, which is where your work has landed

- **9 goal families × 3 variants = 27 authored Journeys**, live in the app: next step, two options,
  fit test, job target, proof, access, search process, interview stage, return after rejection.
- **A diagnosis tree** that maps subtype + bottleneck to a goal family, then selects the variant.
- Selection precedence: what the person said in conversation, then this Journey's own variant
  question, then the profile, then the variants' own ratings, then the authored default — and a
  default is reported as a default, never dressed up as a match.
- **Known open thread on your side:** the diagnosis asks one question per message. Asking the
  remaining ones in a single natural sentence is the next layer. And the labels of the diagnosis
  options are ours, not yours — they were meant to come back to you for correction.

### 5.3 Planning and the day

- A deterministic **Planner** lays Steps across real dates or a weekly frequency, bounded by what the
  person said they realistically have.
- **Home** shows today, the week, and each running Journey.
- **Reporting** is done / partial / could not / postpone, with an optional reason from a closed list
  and an optional note that never leaves the device.
- **Miss-Recovery**: after a miss, the app offers a way back rather than a verdict.
- **Weekly Review**, freeze and resume, cancel with history preserved, completion with a celebration.

### 5.4 Reminders and notifications

- On-device local notifications only. **We hold no push token and cannot send anything from a
  server.**
- Per-Journey reminders: **Off / Fixed / Smart**. Smart hands the timing to the app, which groups a
  day's smart reminders into **one aggregate send** instead of one per Journey.
- Every notification is written in the **communication style** the person chose — four voices, two
  languages.

### 5.5 People

- Anonymous accounts by default; optional Google/Apple sign-in.
- Friends by username; **Allies** per Journey, by invitation and acceptance, with two bundles:
  *Encourager* sees progress, *Companion* also sees system-generated Step names. **A Journey somebody
  typed themselves can never be shared as Companion**, because its words are theirs.
- Cheers and nudges. Direct messages, **end-to-end encrypted**.
- An Ally is told when a Journey pauses or resumes — as an event, with no reason attached.

### 5.6 Tools

Life Wheel, Values Clarification, My Best Possible Year, Direction Statement, Passion Map, Strength
Evidence, and **Mirror** — which asks people who know you what they see in you, and returns a
de-identified synthesis. Raw Tool answers **never leave the device**; only each Tool's short derived
result is used, and only by the parts of the app that Tool names.

### 5.7 The rest

Two languages (Hebrew and English) with full RTL and grammatical gender. Account backup so a lost
phone is not a lost life. Account export and deletion. Buddy, XP, Coins, Missions, Grace Tokens.

---

## 6. The machine, and what it makes cheap or expensive

Expo / React Native / TypeScript. **Engine-based**: the logic lives in pure, framework-free engines;
screens render what engines decide. Offline-first, with an encrypted local store; a Supabase backend
carries only the account and the social layer.

What this means for your proposals:

| Cheap | Expensive | Currently impossible |
|---|---|---|
| New copy, in any voice or language | A new screen with real state | Anything needing a push token |
| A new authored Journey or variant | A new server table + its permissions | Background location or geofencing |
| A new question in an existing interview | Changing what leaves the device | Reading a calendar |
| A new closed reason, option or category | A new permission | Anything needing a native rebuild to reach the current testers |
| Anything expressed as data rather than code | Anything that must update without an app release | Server-sent notifications |

**The last row of the "expensive" column is worth understanding.** Everything written in JavaScript
reaches both test phones over the air within minutes. Anything native — a new permission, a new
native module — needs a rebuild and a new install. So a proposal that avoids native surface can be in
somebody's hands the same day, and one that does not may wait weeks.

**Configuration before code.** Reason lists, notification types, Journey variants, motivation content
— all of it is data in one place. A proposal that adds an *item* to an existing list is a config edit.
A proposal that adds a *kind* of thing is engineering.

---

## 7. Privacy, because it decides more proposals than anything else

There is a single line and it is not negotiable:

> **The raw wording a person writes stays on their device. Our reading of it may travel.**

So: the "why" behind a Journey, the note somebody leaves when a day went wrong, the note at the end
of a Journey, and every raw Tool answer — those never leave the phone. What travels is the closed
category that classifies the same event. This is enforced in code, in one place, with a test that
checks it field by field.

Additional standing rules:

- **Nothing on the lock screen may contain a Step title, a Journey "why", a reflection, or another
  person's private text.**
- **No analytics SDK and no crash SDK in the app.** None. So a proposal that says "we will measure
  whether this works" has to say *how*, on device, with no pipeline.
- **No advertising identifier, no tracking, no ads, no location, no calendar, no contacts, no
  microphone, no camera.**
- **A person's free text never becomes a global ranking signal.**

If a proposal needs any of that changed, say so explicitly and early. It may be possible; it will
need a privacy review and a founder decision, and discovering the need late is what kills a slice.

---

## 8. Where the AI is, and where it deliberately is not

The coach uses a model to **understand** what somebody wrote and to **voice** questions in natural
language. It does not use a model to decide the plan: the Planner is deterministic, the Journey
library is authored by a human expert, and the diagnosis is a tree. That division is intentional —
it is what makes the product's behaviour explainable, testable and cheap.

So when you propose "the coach should…", it helps enormously to say which of the two you mean:

- **Understanding or wording** — the model's job. Cheap, and mostly a matter of prompt and copy.
- **Deciding** — the engine's job. Needs a rule, a precedence order and an answer for the case where
  the signal is missing. "The coach figures it out" is not specifiable.

---

## 9. The plan

Four stages, and the current build is between the first two:

- **V1 — POC**: does the core bet hold? Journeys, the check-in loop, Buddy, the social layer,
  reminders. **Substantially built.**
- **V2 — MVP**: something a person would adopt alone and keep for months. Onboarding, a starter
  library, light AI, celebrations, Grace Tokens. **In progress — this is where we are.**
- **V3 — Commercial**: the adaptive intervention engine, weekly planning, achievements, challenges,
  a deeper economy, broader Ally types, subscriptions.
- **V4 — Scale**: the marketplace, Journey templates, the ecosystem.

Immediately in front of us: finishing the onboarding revision your side proposed, the personalised
motivation engine beyond its first slice, and getting two real people using it with each other.

---

## 10. What is missing, stated honestly

An agent that knows the gaps writes better proposals than one that assumes a finished product.

1. **Two real users have never successfully connected.** As of today exactly one account in the whole
   system has a username. The identity flow had a bug that showed people a suggested name as if it
   were theirs, with the Save button disabled — fixed today, unverified between two devices.
2. **No monitoring of any kind.** If something breaks for a real person, we learn about it when they
   tell us.
3. **No per-Step weekday or due-time model.** See §4. It limits how precisely a plan can be
   re-anchored after a pause.
4. **The privacy policy is written but not finished** — it needs a legal entity, a support address, a
   minimum age and two retention decisions before it can be published.
5. **The resume/re-plan of a paused Journey is fully specified and entirely unbuilt.**
6. **The motivation engine is one honest slice** — no push, no quotations, no health statements, no
   money metrics, no cross-user ranking. Each was excluded for a stated reason.
7. **Only one domain has an authored library.** Career. Everything else falls back to a generic plan.
8. **The onboarding conversation is still generic.** The revision's flow landed today; the *depth* —
   a focused opening, 2–4 adaptive questions, a grounded reflection, a starting-point summary — has
   not.

---

## 11. What each side owns

**You own the domain.** What a competent practitioner asks, in what order, and what an answer means.
The families of goal, the bottlenecks, the routes. The authored Journeys and their variants. The
words for the cards a person actually reads. Whether a question is worth asking at all.

**We own the product and the machine.** Terminology, philosophy, privacy, architecture, screens, the
selection precedence, what ships when. And the decision to say no — which we will explain rather than
just exercise.

**The seam between us** is the domain-expert contract: a family, its diagnosis signals, its Journeys,
their variants, and the copy. Everything you have sent so far has landed there cleanly.

---

## 12. How to send us something we can build from

The onboarding v2 document was a good specification and this section is written from what made it
good, and from the one thing it was missing.

**What made it good, and please keep doing:**

- It stated a **principle** first ("onboarding should already feel like the first coaching session"),
  so we could judge each part against it rather than argue part by part.
- It listed **what must be preserved** before what should change. That single section removed most of
  the risk.
- It went **question by question** through what exists and said, for each, keep / move / drop and
  *why*. Nothing had to be guessed.
- It kept our stable ids and said so explicitly.
- It gave a **phased sequence**, so a first slice was obvious.

**What it was missing, and what every future spec should include:**

1. **The failure case.** It routed first-run into the coach, and the coach needs a network call and a
   paid API. With no connection there was no way forward at all — the previous flow worked entirely
   offline. Every proposal should answer: *what happens when this cannot work?* Offline, permission
   denied, the model unavailable, the person skips.
2. **What it costs.** Not money precisely, but the shape: does this need a native rebuild, a server
   change, a new permission, a model call per user? A sentence is enough, and it changes whether the
   thing ships this week or next month.
3. **What it replaces.** If it changes a decision we already made, say so. Onboarding v2 reverses a
   founder decision from ten days earlier, for good reasons — but nobody in the document knew that,
   so it had to be caught by reading the code.
4. **How we would know it worked.** With no analytics, this has to be answerable on device or by
   watching two people use it. "Users will feel understood" is not measurable; "the person reaches a
   first Step within 90 seconds" is.
5. **Names.** Use §3's vocabulary. If the document introduces a new product name or a new term, flag
   it as a naming proposal rather than using it as though it were settled.

**A shape that works well:**

```
Principle           — the one sentence the whole thing is measured against
What must not change — the boundaries you are working inside
The change          — what happens instead, concretely
Item by item        — for each existing thing: keep / move / drop, and why
Failure cases       — offline, denied, skipped, unavailable
Cost                — native? server? permission? model call?
What it replaces    — any earlier decision this overturns
Success             — what we would observe, on device
Phases              — the smallest first slice, then the rest
```

**And the most useful thing you can send that is not a spec at all:** a real transcript. What a
practitioner actually says to a real person in the first five minutes, verbatim, with the reasoning
underneath it. We can build from that better than from any description of it.

---

## 13. Where to look

If your operator can see the repository, these are the documents behind this briefing, in the order
they should be read:

| Document | What it settles |
|---|---|
| `09_Product_Philosophy/Product_Philosophy.md` | The mission and the principles |
| `09_Product_Philosophy/Product_Terminology.md` | Every protected word |
| `04_Product/Version_Roadmap.md` | The four stages |
| `04_Product/MVP_Task_List.md` | What is actually being built, with status |
| `06_Decisions/Decision_Log.md` | Every founder decision, with the reasoning kept |
| `04_Product/Privacy_Contract_With_The_User.md` | What we hold and where it lives |
| `11_Engineering_Bible/Engineering_Decisions.md` | The stack and the module boundaries |
| `04_Product/PRD/` | One document per feature |
| `Current_Context.md` | Where the work stands right now |

The repository is the source of truth, not a conversation. If something here disagrees with those
documents, they are right and this briefing is stale — tell us and we will fix it.
