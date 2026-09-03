# Domain Expert Authoring Guide — the brief for Codex

> **Every Step you author today is an ACTION Step** — a title, a description and a cadence,
> describing something the person does in the world. There is no way yet to author a questionnaire,
> a video, an audio piece or an image sequence as a Step. That is being designed (`PRD/Step_Types_PRD.md`,
> Backlog S-22); until it lands, write your Steps as actions rather than as instructions to consume
> something we cannot yet deliver. When it lands, this guide gains the way to declare a type.

Status: **Approved working method (2026-08-29).** Written after wiring the Career Expert end to end
and finding out, the expensive way, which parts of a content spec survive contact with code.
Owner: founder + AI product team.
Reference implementation: `10_Partner_Coaching_Content/Master_Specs_Original/20_Career_Expert_Master_Spec.md`
and everything under `app/src/core/learning/`.

> **Architecture correction — approved 2026-08-29:** the Coach is the only actor that speaks with
> the user. A Domain Expert is an internal consultation tool: it diagnoses, identifies information
> still missing, and recommends existing Journeys with structured reasons. It receives only the
> minimum closed signals required for that consultation — never the conversation transcript or a
> full user profile. Authoring a new Journey when the library has no fit belongs to a separate
> **Journey Creator Expert**, not to every Domain Expert.

---

## 0. Read this paragraph before anything else

You are not writing a coaching book. You are writing **a decision system that a program will execute**.

The test of every sentence you write is: *could a program follow this without guessing?* A sentence
that reads beautifully and cannot be executed is worse than no sentence, because it looks finished.

The Career Expert passed that test in its judgement layer and failed it at the boundary. That failure
cost roughly 3,000 lines of bridging code and one silent bug that shipped. §4 is that story, and it is
the most important section here.

---

## 1. What a domain is, and what it is not

A **domain** is an area of life a person may want to change: career, body image, relationships and
loneliness, addiction. It is served by a **Domain Expert** — a professional judgement layer that the
**meta-agent (the coach)** consults. The Expert never speaks to the user directly; the coach does.

The Expert's job is to answer five questions about one person, right now:

1. **What kind of problem is this?** (the subtype)
2. **What is actually in the way?** (the bottleneck)
3. **What relevant information is still missing?** (and only what can change the result)
4. **Which existing Journeys fit, and why?** (up to three; one is marked recommended only when the
   evidence makes it meaningfully more relevant)
5. **What would be a mistake here?** (the domain's traps)

That is all. It does not motivate, does not write copy, does not speak to the user, and does not
silently start a Journey. If exactly one valid Journey remains, the system may select it without a
choice menu, but the Coach must still explain the selection before the normal user-approval boundary.

If the current library has no sufficiently relevant Journey, the Expert returns a structured
`no_match` result. Until the Journey Creator Expert is connected, the Coach says this calmly and
offers to refine the goal or continue the conversation. This temporary branch must be removed — and
a regression test must prove its removal — when the Journey Creator Expert ships.

### The objects you may use

PushApp's hierarchy is fixed and you may not add to it:

> **Dream → Journey → Milestone (optional) → Step**

There is no Course, Program, Plan, Module, Lesson, Task, Challenge or Workshop object. If your domain
naturally speaks of "a programme", it is a **Journey** made of **Milestones** and **Steps**. Terminology
is canonical in `09_Product_Philosophy/Product_Terminology.md` and is not negotiable — a synonym
introduced here becomes a synonym in the product.

---

## 2. What you deliver: four files, not one

The Career domain shipped three files and needed a fourth that nobody wrote. Write all four.

| # | File | What it is | Why it exists |
|---|---|---|---|
| 1 | `<NN>_<Domain>_Expert_Master_Spec.md` | The judgement system | The reasoning |
| 2 | `<NN>_<Domain>_Expert_Calibration_<N>_Cases.md` | Judgement cases | The test suite |
| 3 | `<NN>_<Domain>_Full_Journey_Example.md` | One person, intake to first Steps | The end-to-end proof |
| 4 | `<NN>_<Domain>_Value_Ids.md` | **NEW — the closed value sets** | The reason the other three can become code |

File 4 is the change this guide exists to introduce. §4 explains why.

---

## 3. File 1 — the Master Spec

Follow the Career spec's section order. It is a good order and deviating from it costs review time.

### 3.1 Required sections

```
0.  One-sentence definition of the Expert
1.  Role in the two-layer model (coach ↔ expert)
2.  Professional stance — 3–5 numbered positions, each with what it rules OUT
3.  Subtypes — the kinds of problem this domain contains
4.  Bottleneck model — what can actually be in the way
5.  Interview — the minimum high-value content, and the stop rule
6..8. Frameworks — one per subtype cluster
9.  Milestone arcs — AS A TABLE (see §5)
10. Step-framing rules
11. Feasibility — what "reasonable / ambitious / too ambitious" means HERE
12. Persistence — how this domain specifically stalls
13. On-call support — the short, in-the-moment path
14. Referral and boundary rules — including the safety override
15. Calibration decisions — the numbered list, pointing at file 2
16. Full Journey content test — pointing at file 3
17. Consultation output contract — pointing at file 4
18. Hard anti-patterns — what the Expert must never do
19. Evidence and source hierarchy
```

### 3.2 Subtypes (§3)

Between four and six. Each gets a `SCREAMING_SNAKE` id, one sentence of definition, and — this is the
part usually missing — **what distinguishes it from its nearest neighbour**. Career's `FIND_DIRECTION`
and `CAREER_TRANSITION` are adjacent; the spec says which signal separates them, and that sentence is
what made the routing writable.

### 3.3 Bottleneck model (§4)

Between six and ten. `SCREAMING_SNAKE` ids again. Each needs:

- one sentence: what this gap IS;
- **the observable that reveals it** — what a person says or does that indicates it;
- **the cheapest way to rule it out**;
- what happens if you treat a different gap as though it were this one.

The last two are what turn a taxonomy into a diagnosis. Career's eight gaps have them; that is why
`careerDiagnosis.ts` exists at all.

### 3.4 Referral and boundaries (§14)

**Copy Career's §14 structure verbatim and adapt only the content.** It is the best part of the file:
a suicide/self-harm safety override that stops coaching entirely, then severity-based referral, then
regulated-advice boundaries, then the "structure what is ours, refer the judgement that is not" rule.

Domains differ in what they must refer. Addiction and body image carry clinical adjacency that career
does not — an eating-disorder screen is not a coaching decision, and a withdrawal risk is a medical
one. **Say plainly where your domain touches a clinical boundary and refuse there.** Erring toward
referral is always the correct error in this repository.

### 3.5 Anti-patterns (§18)

Ten to twenty, each a single imperative sentence starting "must not". These are read by reviewers and
by tests. Write the ones that are *tempting*, not the ones that are obviously wrong: "must not promise
hiring outcomes" earns its place; "must not be rude" does not.

---

## 4. File 4 — the value-id appendix, and the bug that requires it

**This is the section to read twice.**

### 4.1 What went wrong in Career

Career's §17 defines the consultation output "conceptually": field names, one line each. It never
declares the **values** those fields carry. So when the routing tree was written, it followed the
readable half of the partner's mapping — and the readable half was not the wire format:

| Signal | Answer KINDS in the mapping | Values they actually carry |
|---|---|---|
| `activeJobSearch` | `active` / `not_active` | `yes` / `no` |
| `visibleProofMissing` | `missing` / `available` | `yes` / `no` |

The tree emitted `active`. Nothing recognises `active`. **A value nothing recognises is dropped
silently** — the signal reads as absent, the coach goes back to asking a question it did not need to
ask, and *nothing errors*. It looked like a slightly chatty coach for weeks.

That class of bug is invisible to every reviewer reading prose, and unavoidable when a spec names a
field without naming its values.

### 4.2 What file 4 must contain

For **every** enumerated thing in your spec — subtype, bottleneck, signal, answer, verdict, arc id — a
table with these exact columns:

| Column | Rule |
|---|---|
| **Concept** | The human name used in the Master Spec |
| **Id** | The exact literal a program will compare against |
| **Type** | `subtype` / `bottleneck` / `signal` / `answer` / `verdict` / `arc` |
| **Allowed values** | The complete closed set, verbatim, comma-separated |
| **Meaning of each value** | One clause each |
| **Default when absent** | What the system should assume when unanswered |

Two rules with no exceptions:

1. **An id is written once and never repurposed.** Adding is free; changing meaning is a breaking
   change to stored data.
2. **Where a name and a value differ, say so in the row and explain why.** If they need not differ,
   make them identical — the safest value set is one where the readable name IS the literal.

### 4.3 The negative test

At the end of file 4, list every value a naive author would plausibly emit that the system does **not**
accept — for example "`active` is NOT a value of `activeJobSearch`; the values are `yes` and `no`".

That list is short, boring, and would have prevented the bug above.

---

## 5. The Milestone arc must be a table

Career's §9 gives four arcs in prose: "Direction: clarify criteria → generate hypotheses → inspect
roles → …". Readable, and it does not say how many Steps, how long, how hard, or when the Journey is
finished. That gap is where most of `app/src/core/learning/library/career/` came from — 2,897 lines
bridging prose to structure.

Give every arc as a table instead:

| Arc id | Milestone # | Milestone title | Weight 1–5 | Step titles (ordered) | Cadence | Minutes/Step | Done when |
|---|---|---|---|---|---|---|---|
| `DIRECTION_EVIDENCE` | 1 | Name what you are choosing between | 2 | "Write three criteria that matter", "List two directions worth testing" | weekly | 30 | Both written |

Rules:

- **3–6 Milestones.** More is a course, not a Journey.
- **2–5 Steps per Milestone.** A Step is one action a person can finish in one sitting.
- **A Step title is an action, not a topic.** "Talk to one person doing the work" — not "Networking".
- **Weight is difficulty 1–5**, and it becomes the Step's difficulty in code.
- **"Done when" must be observable by the person themselves.** If they cannot tell whether they did
  it, neither can the app, and the Journey cannot end. Every Journey must be able to end.
- **Also give the recurring shape** if your domain has one — some Journeys are a few setup Steps and
  then one repeated action, with no Milestone arc at all. Say which of your subtypes are which.

---

## 6. The interview must declare its own routing

Career's §5 lists "minimum high-value content" and high-information follow-ups. It does not say which
answer changes which branch — so the routing had to be inferred, which is how the wrong values got in.

Every question you write gets a row:

| Question id | Intent | Prompt | Options (closed) | Multi-select? | Which bottleneck it rules IN | Which it rules OUT | Skippable if |
|---|---|---|---|---|---|---|---|

Four constraints from the code contract, which you must satisfy exactly:

- **`intent` is one of a fixed set**: `foundation` · `baseline` · `time` · `obstacles` · `motivation` ·
  `milestones` · `variant`. You do not invent an intent.
- **`id` is domain-scoped**: `body_image.baseline`, `addiction.obstacles`.
- **Every question has ≥2 closed options AND always allows free text** ("Other"). Closed options are
  what can be analysed in aggregate; the free text is how a person stays a person.
- **Order is general → specific.** Never open with the most exposing question.

And the part that is usually forgotten:

> **The stop rule.** State how few questions the Expert may ask and still answer. Ours is a
> conversation, not a form — the founder's standing instruction is *fewer closed cards, more of a
> conversation*. Say explicitly: which signals must be present before routing; which may be inferred
> from what the person already said; and at what point the Expert answers with declared uncertainty
> rather than asking again.

**Listen before asking.** If the opening message already answers a question, it must not be asked.
Say which of your questions are answerable from an opening message and what phrasing indicates it.

---

## 7. File 2 — calibration cases

Twelve to twenty-four. Career has fourteen and that is a reasonable floor. Keep the exact shape:

```
## Case N — <the situation in the user's words, short>

**User:** "<what they actually say, in their own voice>"
**Expert read:** <subtype + bottleneck, using ids from file 4>
**Decision:** <what to conclude>
**Recommended move:** <the one next move>
**Avoid:** "<a plausible wrong answer, quoted>"
**Rule:** **<the generalised principle, bold, one line>**
```

The **Avoid** line is what makes these tests rather than illustrations. Write the wrong answer that a
competent generalist would actually give — the plausible one, not a strawman.

Cover at minimum: the request for certainty · expensive commitment before evidence · the reflex
solution ("which course?", "which diet?") · a real external constraint mistaken for an excuse · a
plateau · a relapse or regression · the safety override · a regulated-advice boundary · a case where
the correct answer is "this is not a coaching problem".

---

## 8. File 3 — the full Journey example

One fictional person, from their own words to their first Steps. Career's Dana is the model. Sections:

1. **Persona** — age, situation, and their own statement **in Hebrew**, as a real user would type it,
   plus real constraints (hours per week, money, what they will not do).
2. **What the coach should understand before consulting the Expert** — including what this is NOT.
3. **The consultation output**, filled in with real values from file 4.
4. **The Journey** — the actual Milestones and Steps this person gets, from your §9 table.
5. **What a weak generic expert would have produced instead**, written out. This is the section that
   earns the file: it is the difference the domain knowledge is supposed to make, made visible.

---

## 9. What the code will demand of you

Your content becomes an implementation of `DomainExpert`
(`app/src/core/learning/DomainExpert.ts`). You do not write the code, but if your spec cannot answer
these, the code cannot be written:

| Method | What it needs from your spec |
|---|---|
| `proposeMilestones` | The arc table (§5) |
| `stepTemplatesFor` | Step titles, minutes, difficulty (§5) |
| `interviewQuestions` | The question table (§6) |
| `assessFeasibility` | What `reasonable` / `ambitious` / `tooAmbitious` mean in this domain, and the one-line note for each |
| `usesMilestones` | Which answers mean this person needs a staged arc rather than a repeated action |
| `buildStructure` | How the arc CHANGES with the baseline answer — a beginner gets a shorter, easier start |
| `riskSignals` | The advisory risks, with the observable that raises each |

The last one is worth dwelling on: **an arc that is identical for a beginner and an experienced person
is a generic arc wearing a domain's name.** Career's three unwired sibling domains each have roughly
220 lines of exactly that. Do not produce a fifth.

---

## 10. Declare your coverage

End the Master Spec with a table stating what is actually authored, because "the domain is done" is
otherwise unfalsifiable:

| Subtype | Goal families | Authored arcs | Generic fallback? | Calibration cases |
|---|---|---|---|---|

Honesty here is worth more than completeness. A domain with two deeply authored subtypes and four
marked generic is useful and safe. A domain claiming six and delivering prose for four is neither.

---

## 11. Definition of done

- [ ] Four files, named to the convention, versioned per `10_Partner_Coaching_Content/00_VERSION_POLICY.md`
- [ ] Every enumerated concept appears in file 4 with its exact literal values
- [ ] The negative-test list (§4.3) is written
- [ ] Every arc is a table with "done when" observable by the person
- [ ] Every question declares which bottleneck it rules in or out, plus the stop rule
- [ ] The safety override and referral boundaries are present and domain-specific
- [ ] Anti-patterns are written as "must not" imperatives
- [ ] The full Journey example includes the weak-generic-alternative section
- [ ] The coverage table is filled in honestly
- [ ] Terminology checked against `Product_Terminology.md` — no new object, no synonym
- [ ] Hebrew appears only inside user-voice quotes; the spec itself is English (repo rule)

---

## 12. What not to do

- **Do not invent a new participant-facing object.** Not a Programme, not a Track, not a Module.
- **Do not write clinical content.** You are a coaching layer. Screening, diagnosis and treatment are
  referrals, not sections.
- **Do not promise outcomes.** No domain may promise hiring, weight, sobriety, or a relationship.
- **Do not turn a constraint into a character flaw.** Career's §2.4 — "context is not a mindset
  defect" — generalises to every domain and is one of the strongest lines in the source material.
- **Do not optimise for engagement.** If a recommendation's benefit is that the person opens the app
  more, it is wrong here. The product exists to close the gap between intention and action.
- **Do not fabricate evidence.** §19 lists real professional standards and named research. If your
  domain lacks an equivalent, say so — an honest "the evidence base here is thin and contested" is
  itself useful, and pretending otherwise in a domain like addiction is dangerous.

---

## 13. Suggested first target

Pick a domain that already has a Master Spec and no depth — **Body Image** or **Addiction** — and take
it all the way through this guide before authoring a genuinely new one. It will expose whatever this
guide still gets wrong while the cost of finding out is one domain rather than three.

Of the two, **Body Image** is the safer first pass: Addiction carries the heaviest clinical boundary,
and the referral sections deserve to be written second, by someone who has already been through the
process once.
