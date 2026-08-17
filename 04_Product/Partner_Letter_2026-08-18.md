# Letter to the coaching partner — the architecture, what does not work today, and how we will know it works

Status: **Draft for the founder's review and sending. NOT SENT.** Prepared 2026-08-18 by product-manager.

**Supersedes** `04_Product/Partner_Reply_Terminology_2026-08-13.md`, which was never sent. That draft was
a terminology reply, and terminology turned out to be the smallest of the things we owe this partner an
answer about. Everything in it that is still true has been carried forward here (§7 and §8 below), and
the original file is kept, marked superseded, so the reasoning behind each terminology decision survives
in the place it was first written.

Sources this letter is built from, for whoever maintains it next:
`04_Product/Session_Handoff_2026-08-17_18.md` Part 1 (the architecture in the founder's own words),
the v1.3 review findings (scratchpad, 2026-08-17),
`04_Product/PRD/Plan_Library_and_Learning_PRD.md`,
`05_Research/User_Matching_Parameters_Research_2026-08-17.md`,
`06_Decisions/Decision_Log.md` (D24, D40, D46, D47, D48, D49, D50, D51, D52, D53),
and the code paths named in §4, which were read rather than assumed.

---

# Letter begins

Hello,

This is a longer message than our last one, and it is a different kind of message. Last time we wrote to
you about vocabulary. This time we need to explain the architecture the content is being authored into,
because it has changed shape, and because that change alters what we are asking you to produce.

There are five parts:

1. What v1.3 got right, specifically.
2. The architecture, and the one thing in it that changes your job.
3. What does not work in our product today, starting with what is our fault.
4. The concrete defects in the v1.3 JSON, with enough detail to fix them yourselves.
5. How we will know any of this works, and what that means for how a Journey must be built.

Then terminology, the decisions carried over from our previous letter, and the safety position, which
has not moved.

---

## 1. What v1.3 got right

We want to be precise about this rather than polite, because the specific things you did well are things
we would like repeated, and a general compliment does not tell you which ones.

**Terminology went from 164 required edits to 4.** That is the single clearest signal in the package.
You carried our previous letter into your master copies almost completely. `Step` used as a stage of a
mechanism: gone. `Arc` as an object name: gone. `intervention` in the reactive sense: gone, and `comment`
adopted cleanly. `Phase`: absent. No synonym for Journey anywhere. Details and the four remaining items
are in §6.

**Every enum value in the JSON is valid.** Every `cadence`, every `rhythm`, every `routing.domain`, every
`goalKind`. Nothing invented, nothing approximate. That is unusual for a first schema attempt and it made
the review fast.

**No invented fields inside the model objects.** All your extra metadata (`persona`, `expertJudgment`,
`durationRationale`, `completionMeaning`, `contentBoundaries`, `validation`) sits outside the
`journey` / `milestone` / `step` objects, at example level. That is exactly the right discipline: it means
the model objects can be loaded without stripping anything, and it means your reasoning is preserved
where a reviewer can read it. This is the first package to get that right and we would like it to be the
permanent convention.

**The dependency graph is correct, including a constraint you were not told about twice.** All eight
dependencies are within a single Milestone, the predecessor is always earlier in Step order, there is no
fan-out and no cycle, and the deepest chain (`rel_s2` to `rel_s3` to `rel_s4`) is exactly three Steps,
which is precisely our maximum. You read the limit and used all of it without exceeding it. The only
problem with the dependencies is the wire format, not the graph. See §5.3.

**Exactly one Starter Step per Journey, and it is the first Step, in all four.** That matches an invariant
our own planner holds. There is no validation in the engine that enforces it, so you matched a convention
rather than a rule.

**Three of your four Journeys pass your own swap-the-name test.** The Relationships Journey is the
standard we would like the rest measured against: it hangs on two facts Noam actually said, a prior
success with recurring board-game nights and a local meetup he had already spotted, and every Step
inherits them. `rel_s1` is "pick the next session of *that* meetup", not "find a group". Swap the name and
the Journey collapses, which is the point. Career is close behind: `career_s7` turns Dana's stated
energiser into a cheap reversible experiment and honours her constraint about not spending money on a
course first.

**Three of your authoring rules are better than ours and we are adopting them.**

- *A Milestone must not require a failure to occur.* `body_m4` ("I have a simple return rule after a
  miss") is completable before any miss happens. This fixes a genuinely harmful pattern and we had not
  named it.
- *"Needing less coaching" is not a user Milestone.* Correct, and it matters for us specifically, because
  our Milestones are user-visible progress.
- *A Journey ends with a real-world state change, not an insight.* `career_m5` ("I chose my next career
  move and started it") is the proof. The Journey does not end at "decided".

**The 2-minute Starter Step (`add_s1`) is close to ideal**, and dropping Career's starter from 25 minutes
to 8 was the right call. Your rule that *the Starter Step should create motion, not homework* is going
into our own authoring guidance verbatim.

**The duration disclaimers are the correct posture.** "Six weeks is a behaviour-support window, not a
medical prognosis" and "a product heuristic, not nutrition guidance" are the kind of sentence that
protects a non-clinical product, and they were yours, not ours.

**One of your new rules resolves an open question we had left open in our last letter.** We asked whether
a "maintain / ongoing" Journey is a Journey at all, given our definition says a Journey is finite. Your
rule that *a recurring `goalKind` does not mean an endless Journey, because the behaviour may recur while
the Journey is still a finite transformation* is a genuinely useful contribution, and it lines up with a
decision we took independently (a Journey always has an end date, which moves only on explicit user
action). Thank you for that one.

---

## 2. The architecture, and the change it makes to your work

### 2.1 What the app is actually trying to be

Our founder put the purpose in three sentences, and everything else follows from them:

> We need to know the user well enough to send **few** notifications, but ones that actually move them to
> action.
> We need to know them well enough to build a plan that genuinely fits them.
> We need to know them well enough to speak in a language that makes them comfortable.

Note what that inverts. The system is judged on **action per interruption**, never on engagement,
retention, or how much anyone uses the app. Sending less while achieving more has to be a win by
construction, not a nice sentiment. This is a binding rule for us, and it is the same rule as your own
Axiom 12 about fading the coach.

Three layers make that real. None of them works alone.

### 2.2 Layer 1 — the user profile

Not a thin matching vector. An operational model of one person that can answer three questions:

1. **How do we address them?** So the coach sounds like something they want to hear.
2. **What actually moves them?** So a notification is worth the interruption it costs.
3. **What makes them abandon?** So the plan is shaped around their real failure mode rather than a
   generic one.

The third is the one we already half-collect and never use. When a user misses a Step we ask why, and the
answer lands in a structured, closed vocabulary (forgot, no time, lost motivation, too hard, did it
partly, could not, not relevant, other), each mapped to a recovery lever. That data has been accumulating
and nothing reads it when the next plan is built. A person whose last six misses were "no time" and a
person whose last six were "lost motivation" have different problems, and today they get the same next
Journey.

**Everything in Layer 1 stays on the device.** The raw material and the derived profile both. Nothing
about a person is uploaded in order to receive a recommendation. This is not a limitation on the idea, it
is what makes the idea safe enough to ship, and it is the reason we can offer an honest opt-in later:
declining costs the user nothing, because the matching happens on their phone.

### 2.3 Layer 2 — the Journey library, and why several per goal

This is the layer that changes your work, so we want to state it carefully.

**Several Journeys per goal or Dream, not one per domain.**

The reason is not variety for its own sake, and it is not that one Journey is not good enough. The reason
is arithmetic:

> Without variants there is nothing to compare. Without comparison there is no learning.

Today our app produces one fixed arc per domain. That does not make it merely generic. It makes it
**structurally incapable of learning anything**, forever, no matter how many users it has, because there
is never a moment where two candidates existed and one was chosen. There is nothing to compare, so there
is nothing to learn from.

The unit is the **goal**, not the domain. "Drink a protein shake every day", "get back to running", "leave
this job well". A domain holds many goals. A goal holds several Journeys that differ in ambition,
structure, pace and emphasis.

### 2.4 What this changes about your brief, plainly

Until now the implicit brief was: **for this domain, author the best Journey you can.** You have been
doing that well.

The new brief is: **for this goal, author a small set of Journeys that differ from each other on
purpose, along axes we can learn from.**

That is a real change in how the work is done, so here is what it means concretely.

- **A set of four excellent Journeys that each differ in ten ways at once teaches us nothing.** When one
  of them wins, we cannot say why, and we cannot carry the lesson to the next goal. Variants that differ
  along one named axis at a time are worth far more than variants that are each individually better.
- **Name the axis.** For each set, tell us what the variants are varying: ambition level, weekly time
  demand, staged versus unstaged, front-loaded versus evenly paced, social versus solo, whether the
  Journey starts with observation or starts with action. One axis per comparison is what makes a result
  readable.
- **Declare who you think each variant suits, and expect to be overruled by evidence.** Your declared
  conditions are what ranks the variants at the beginning, when there is no data at all, and that is most
  of the time for a long time. But the system's job is to find the conditions that actually hold,
  including ones nobody proposed. When outcomes disagree with the declaration, outcomes win, and we will
  tell you when that happens rather than quietly re-ranking behind your back.
- **Variants are not difficulty tiers.** This is the trap we most want to avoid. A learning loop that
  maximises completion will drift toward recommending whatever is easiest, completion rates will rise,
  and nobody's life will change. So every Journey carries an authored **ambition level**, completion is
  scored relative to that ambition, and finishing an ambitious Journey outranks finishing a trivial one.
  We are not asking you for easier Journeys. We are asking you for **differently shaped** ones. If we ever
  ask you to soften content because a number went up, push back and quote this paragraph at us.
- **Nothing gets deleted.** A variant that performs badly for one kind of person is down-ranked for that
  kind of person. It is never removed from the library, and never at the ambitious end. We do not shrink
  the catalogue to make the averages look better.

Practically, for the next deliverable: **fewer goals, more variants per goal** is more useful to us than
more goals with one Journey each. Two goals with three deliberately different Journeys each would teach
us more than six goals with one apiece.

### 2.5 Layer 3 — matching

A Journey that is good for one kind of person can be bad for another. The founder's own example is the
shape we are designing for:

> "Journey A is very good for task-oriented people with at least 6 hours a week, but not good for people
> with fewer hours."

Read that as it is written. It is not "Journey A is good". It is "Journey A is good **conditional on** two
user attributes, and bad when one of them flips". Three consequences that matter to an author:

1. **A Journey has no single quality score.** There is no leaderboard, and we will not build one, because
   the average across different kinds of people is exactly the number that hides the finding.
2. **Conditions are discovered from outcomes, not declared.** You propose, evidence disposes, and only
   after the evidence has survived a replication on a later period.
3. **What we are hunting is an interaction**, not a main effect. "People with more time do better" is true
   everywhere and tells us nothing. "This Journey's advantage depends on how much time someone has" is the
   finding. That needs a lot more data than the first one, which is why we are honest below about the
   timeline.

### 2.6 Two things about scope, so you are not surprised later

**The library is our data, and it is not client data.** The Journeys are content, not anyone's personal
information, so they can live centrally and update without an app release. Progress and personal details
never leave the device. A small, coarse, non-personal note about how a Journey performed may leave later,
under explicit opt-in consent, and that is gated behind a privacy policy we have not written yet.

**There is a future in which coaches upload material that enriches the experts.** We are not specifying
that now, and you should not design for it. We mention it because it has one consequence today: we are
modelling **authorship, licensing and versioning on every Journey from the start** rather than
retrofitting them. Which raises a question we need an answer to at some point, listed in §9: what terms
apply to the Journeys you author for us.

---

## 3. What does not work today, and most of it is ours

You asked good questions in v1.3 and the honest answers are worse than you expected. We would rather you
design against the real product than against the documented one.

### 3.1 `cadence` creates no recurrence at all

You wrote that "the v1.3 content convention remains `cadence=daily` plus relevant-day / Planner gating".

There is no such gating, and `cadence` is not a scheduling instruction. In our model a Step is a **one-shot
object**. Its own type comment says `cadence` is a "planned pace hint (metadata; Steps are completed
once)". The check-in function sets `done = true` on the first check-in and returns immediately on every
call after that. There is no occurrence generator, no recurrence expander, and nothing anywhere reads
`cadence` to decide whether a Step is due today.

So the answer to your question is not "your `cadence: daily` Step fires every day", which is what you were
worried about. **It fires once, and then never again.**

The consequence for this package is severe, and it lands exactly where it hurts most. `body_s6` ("keep the
routine point on a relevant workday") and `add_s5` ("run your chosen action when the target moment
arrives") are the entire behavioural core of those two Journeys. Everything around them is one-off setup.
Modelled as one-shot checkboxes, both Journeys become **"spend an hour deciding things, then you are
finished."** The same applies to the three `cadence: weekly` Steps.

It also breaks two of your final Milestones. `add_m5` ("my support layer holds in the automatic moments I
chose") and `body_m5` ("the routine holds even in a busy week") are stability claims over time, and in our
model a Milestone completes when its Steps complete. Each hangs on a single recurring Step that is a
one-shot today, so **both of those final Milestones would complete on the day they start.** That is our
model failing your content, not the other way round.

**What to do in the meantime.** Until per-Step recurrence exists, do not model a recurring behaviour as
one Step with `cadence: daily`. Either express the frequency at the **Journey** level and keep Steps as
discrete one-shots, or emit N discrete Steps. We are opening per-Step scheduling as a proper piece of
work; it is the difference between the product being able to hold a habit at all and only being able to
hold a checklist. We will tell you when it lands.

### 3.2 `Step` has no weekday field anywhere in the model

This is the bigger hole underneath the first one, and we found it from our own side before your package
arrived.

Weekday meaning exists only in **account-level preferences**: preferred days, active hours, reminder
weekdays. There is no weekday on a Step and no weekday on a Journey. A plan's day pattern is therefore an
**artifact of whatever settings happened to be in force when the planner laid it down**, readable after
the fact off the scheduled date and stored nowhere as intent.

Three separate features are already working around the absence of this one concept: a weekly-planning
screen we archived because it was hashing a Step id to invent a display weekday; a re-plan spec that
explicitly says it "must not claim to preserve weekday semantics it never had"; and the next item.

### 3.3 `sessionsPerWeek`, the one field that could express "four workdays a week", is thrown away

Your headline schema question was how to express a behaviour that happens four days a week. The field that
would carry it exists. Our planner computes it and emits it. And the Journey builder **never reads it**.
There is no `sessionsPerWeek` on the built Journey at all. The value is calculated and dropped on the
floor at creation, and only the three-value `rhythm` bucket survives.

We are fixing this one first, because it is a small contained defect, it is ours, and it immediately fixes
the rhythm problem in §5.4.

### 3.4 `rhythm` does not mean what you thought, and this produced the worst defect in the package

In your model `rhythm` describes **how often the behaviour happens**. In our code it is **the streak's
weekly check-in target**: `daily` means the Journey demands 7 Step check-ins per week, `few-times-week`
means 3, `weekly` means 1. Those are not the same thing, and the difference is load-bearing.

| Journey | `rhythm` | check-ins demanded per week | Steps ÷ weeks | verdict |
|---|---|---:|---:|---|
| Career (Dana) | `few-times-week` | 3 | 9 ÷ 5 = 1.8 | under-supplied |
| Body (Maya) | `few-times-week` | 3 | 8 ÷ 6 = 1.3 | under-supplied |
| Relationships (Noam) | `weekly` | 1 | 7 ÷ 6 = 1.2 | correct |
| Addiction (Roni) | `daily` | **7** | 8 ÷ 6 = 1.3 | severely wrong |

Roni's Journey is `daily` with 8 Steps over six weeks. Our urgency rule fires when the remaining required
sessions for the week are at least the number of days left in the week, so from day one that Journey is in
the "no slack left" state, **every single day of its life**, for a user doing exactly what the plan asks.
For an addiction Journey that is the worst possible failure mode: we would be manufacturing pressure in
the one domain where pressure is harmful.

Half of this is our fault, since the field name promises a description and delivers a target. Fixing
`sessionsPerWeek` (§3.3) is what lets a Journey say "four times a week" without abusing `rhythm`.

### 3.5 Our own experts are hardcoded, and they fail your test worse than your content does

The most useful thing we can tell you about our product is what happened when our founder used it.

He asked for help **drinking a protein shake every day**. The plan he received contained Steps about
walking at a comfortable pace, stretching, eating meals at regular times, and noticing one thing he
appreciates about his body. His verdict: *"so far the plan that was built for me didn't help me at all."*

The cause is in our code, not in an LLM. Our body-image expert holds a hardcoded table of step titles,
four Milestones by three Steps, written in advance. The goal routed to that expert and it emitted its
fixed arc. The user's actual request never reached the content. Our four experts are not pure templates,
they do run an interview, assess feasibility and decide whether Milestones help, but they **select from a
closed menu and never author**. The answers change how many and how intense. They never change what.

Your own QA rule is: *if you can swap the user's name and the Journey barely changes, it is too generic.*
**Our code does not "barely" change. It is byte-identical for every user in a domain, by construction.**

We are telling you this because it reframes the library. Layer 2 is not a demand we are making of you
because your content needs improving. It is **our answer to our own problem**, and your authored variants
are what replaces the hardcoded tables. Each existing fixed arc becomes Journey number one in its
domain's library, preserved and demoted from "the answer" to "one candidate among several".

There is a second thing worth noting about that failure, and it is the one that motivated the whole
architecture. Consider what we recorded about that Journey: **nothing**. No structure was chosen from
alternatives, so there was nothing to compare. No feedback was asked for, so the verdict existed only in a
chat message. No outcome was captured, so the next user gets the identical plan. The single most important
fact we have ever learned about our own product reached us because the founder happened to be the user.

---

## 4. Also ours: two places where your content assumes a capability we do not have

Separate from the schema defects, because these are not things you did wrong.

**The Weekly Review contribution slot does not exist yet.** We told you in our last letter that there is
exactly one Weekly Review and that per-Journey review logic should be written as a contribution into it.
That is still the decision. But we approved the architecture and did not build the slot, so at the moment
there is nowhere for you to contribute *to*. That is why §5.5 asks you to remove two Steps rather than
rewrite them: the right home for that content does not exist yet, and we will tell you when it does.

**"Ordinary coaching stops here" is not implemented.** Your `contentBoundaries` correctly describe what
should happen when depression, suicidality or coercion appear. There is no bilingual inbound crisis
detector and no hardened safety layer in our product. The boundary you wrote is a note in a JSON file, not
a control. This is one of the reasons for §8.

---

## 5. The v1.3 validation defects

Six items. Enough detail that you can fix them at source rather than us patching them on import, which is
what we would prefer, since patching on import is how two copies of the truth start diverging.

### 5.1 `Milestone.order` is 1-based in your JSON and 0-based in our model

Our type comment is explicit: "0-based position within the Journey", and our planner emits `order: i`
starting at zero. Home renders the position as `order + 1`.

You emit `order: 1..5` in all four Journeys. Loaded as-is, the first Milestone displays as **"Milestone 2
of 5"** and the last as **"Milestone 6 of 5"**. That is visible to the user on the first screen they see.

Locations: every Milestone in all four Journeys (`career_m1..m5`, `body_m1..m5`, `rel_m1..m5`,
`add_m1..m5`), mirrored in the `Order` column of the Markdown tables.
Fix: `order` starts at **0**.

### 5.2 No `dreamId`, so every Dream you authored is orphaned

Each example builds a full Dream object (`dream_career_dana_01`, `dream_body_maya_01`, `dream_rel_noam_01`,
`dream_add_roni_01`), and **no `journey` object carries a `dreamId`**. The link is made by that field and
only by that field. Without it the Journey is unlinked from its Dream, loses its grouping on Home and in
the Journeys tab, and the Dream detail screen shows nothing.

Locations: all four `journey` objects.
Fix: add `"dreamId": "<the sibling dream.id>"` to each.

### 5.3 `dependsOnStepId` will vanish silently on the creation path

The graph is right (see §1). The wire format is not.

Our creation path **mints its own Step ids**, so a build-time dependency has to be **positional**. Our
creation input takes `dependsOnStepIndex`, documented as "an index into the same `steps[]`, which must be
less than its own index", and it is resolved into a real id after minting. The resolver reads only
`dependsOnStepIndex`.

A raw `dependsOnStepId` on the creation path is carried straight through as your own string (`"career_s1"`),
which matches no minted id, and our lock check then fails open. **The dependency disappears with no
error at all.** All eight in the package are affected.

Locations: `career_s2`, `career_s9`, `body_s2`, `body_s5`, `rel_s3`, `rel_s4`, `add_s2`, `add_s4`.
Fix: either emit `dependsOnStepIndex` (0-based index into the same `steps[]`), or state explicitly in the
README that the JSON is an authoring artefact and that we own id resolution on import. Either is fine.
It just has to be said, because today it fails quietly.

### 5.4 `rhythm` values need to change once we land `sessionsPerWeek`

Covered in §3.4. Immediate action: **the addiction Journey must not be `daily`**. Beyond that, hold until
we tell you `sessionsPerWeek` has landed, since that is the field that will actually carry your intent.

### 5.5 Two Steps are our app's own furniture wearing a user Step's clothes

`body_s8` ("at the weekly review, choose to stabilise, adapt or progress") and `add_s8` ("check once a week
which moment still destabilises the plan").

There is exactly one Weekly Review, and per-Journey content nests inside it rather than becoming a second
object. Making that decision a Step puts a system ritual into the user's Step list, where it counts in
progress, sits in the completion denominator, earns a check-in reward, and blocks Journey completion until
it is ticked. The user then meets the same decision twice, once as a Step and once at the real week
boundary.

This is also, said gently, a violation of **your own rule 5**: user transformation stays in the Journey,
coach behaviour stays in the coaching system. You correctly refused to make "needing less coaching" a
Milestone, and then made "do the weekly review" a Step. Same category.

Fix: remove both. The content is right, and its home is the Weekly Review contribution slot, which per §4
does not exist yet.

### 5.6 One line for the README: this is a creation payload

`Step.done`, `Journey.createdAt` and `Journey.status` are all required on our persisted types and all
absent from your JSON. That is **correct** for a creation payload and wrong if someone reads the file as
our domain objects. One sentence in the README saying which it is removes the ambiguity permanently.

---

## 6. How we will know it works

This is the part that is genuinely new to you, and it carries a constraint on how you author, so it is
worth reading closely.

### 6.1 The four signals

A Journey's quality is measured from four things, and all four are needed.

1. **Persistence rate.** How many people were still going at all.
2. **The stage they reached before dropping.** A drop-off curve, not a binary. This is the most
   diagnostic signal we have and the one a naive implementation loses first. A Journey where 80 percent
   clear Milestone 1 and 15 percent clear Milestone 2 has a **specific, findable defect at Milestone 2**.
   A binary completed / not-completed hides that completely.
3. **Completion rate**, adjusted for the authored ambition level, never raw (see §2.4).
4. **End-of-Journey feedback from the person.** Did it help (yes / partly / no), and a rating from 1 to 5.

### 6.2 The fourth one is the label on the training data

Signals 1 to 3 are behaviour. Behaviour tells us what happened. It does not tell us whether what happened
was **good**. Someone can complete every Step of a Journey that changed nothing, and abandon in week 2 a
Journey that gave them the one thing they needed.

Without a human verdict there is no ground truth, and Layer 3 is not a hard problem, it is an unanswerable
one. That verdict is the label. It does not exist in our product today, and building it is one of the
three things we are doing next.

Two details you may find useful, since you will have opinions:

- **Three options, not two.** "Partly" is where most honest answers live, and forcing a binary would
  destroy the signal.
- **The feedback moment cannot live only at completion.** The completion ceremony only ever meets people
  who finished. If we asked only there, every label in our corpus would come from a success, the model
  would learn that everything works, and we would rank Journeys by how good they are at retaining the
  people they were already working for. **The most valuable feedback comes from the people who quit.** So
  the ask has three homes: completion, explicit cancellation (asked gently, after the cancellation is
  done, never as a condition of leaving), and quiet death, which is the largest group and has no natural
  moment at all.

### 6.3 What this constrains in your authoring

Here is the consequence, and it is a design constraint on your content rather than just a metric we
compute:

> **A Journey must have identifiable stages a person can drop between, or the drop-off curve tells us
> nothing.**

If a Journey's Milestones are not distinguishable states, everyone who leaves leaves from "somewhere in
the middle", the curve is flat, and we cannot tell a Journey with a bad week 3 from a Journey with a bad
week 1. Concretely:

- **A Milestone has to be a state the person can recognise they are in.** Your own `rel_m5` ("I have a
  local connection rhythm I want to continue") passes: a person can answer yes or no. Your `rel_m2` ("I
  accumulated enough experience in that setting to know whether there's fit") does not: "enough" is not a
  state anybody can recognise, and the Milestone title is unfalsifiable even though its three Steps are
  concrete. That is the weakest Milestone in the package and it is weak for a measurable reason, not a
  stylistic one.
- **Milestones should be roughly comparable in weight.** If Milestone 1 is a day and Milestone 2 is a
  month, the curve reports our authoring shape rather than the user's experience.
- **A Milestone should not complete on the day it starts.** Which is exactly what §3.1 makes happen to
  `add_m5` and `body_m5` right now, through no fault of yours.

And one more, which we cannot ask you for yet but want you to know is coming: when we ask "did this
help?", the answer is attached to a specific Journey variant. **Variants that differ along one named axis
(§2.4) turn that answer into a usable comparison.** Variants that differ in ten ways at once turn it into
a mood.

### 6.4 The honest timeline

We are not going to oversell this. Detecting that "this Journey's advantage depends on how much time
someone has" needs far more data than detecting an average, our privacy design deliberately makes each
candidate condition sample slowly, and consent will be opt-in. Expect the learning loop to be a
second-year capability at the earliest, and expect most of the library to be ranked editorially, by your
judgement, for a long time.

**That is fine, and it does not reduce the value of what we are asking for.** The library is valuable long
before the learning is, because on day one it replaces "one hardcoded arc per domain" with "several real
Journeys per goal, chosen against a profile". The learning is what makes it better over years. The variety
is what makes it work at all.

---

## 7. Terminology

### 7.1 The v1.1 record, carried forward

For completeness, since our previous letter was never sent, here is what we changed in your v1.1 files and
why. We edited terminology only. No coaching content, sequencing or clinical judgement was altered.

| Change | Count | Why |
|---|---|---|
| `Step A–E` to `Stage A–E` | 5 | **Step** is a protected object: the smallest unit of progress, the thing a user reports on. Your headings used it to mean "stage of a mechanism" while the same section correctly said "the recurring Step has four content fields". We chose **Stage** deliberately, not "Phase", because Phase is our own retired name for Milestone. |
| `Arc` to `Milestones` | 60 | The numbered list under each `Arc` heading **is** the Milestone sequence, and your own package headed identical content `## Milestones` elsewhere. This removed an inconsistency inside your files as well as ours. Prose like "light Milestone arcs" was left alone: there "arc" is ordinary English attached to the correct noun. |
| `Meta-Coach` to our coach naming | 111 | Across 27 files and four casings. See §7.3. |
| `intervention` to `comment`, reactive sense only | 53 | See §7.3. The 45 academic and clinical uses were **not** touched. Four genuinely ambiguous ones were left rather than guessed at. |
| Loose `Ally` in crisis guidance | 3 | The safety point. See §8.2 of our previous letter, restated in §7.3 below. |

**Filenames were left unchanged**, so the package stays traceable to the version you sent. That means
`15_Meta_Coach_Master_Spec.md` now carries our naming inside a file that keeps your name. The mismatch is
deliberate.

We also want to name what we did **not** change. Roughly 515 flagged occurrences were reviewed and left
alone: every use of *plan*, *goal*, *challenge*, *habit*, *program* and *task* that is ordinary English or
established academic usage, including the named frameworks (WOOP's "Plan", GROW's "Goal, Reality, Options,
Will") and every academic citation about intervention research. Rewriting those would have damaged
evidence-grade prose and misrepresented your sources.

### 7.2 v1.3: four edits, from 164

| Class | v1.1 | v1.3 | Where |
|---|---:|---:|---|
| `Step` as a stage of a mechanism | 5 | **0** | clean |
| `Arc` as an object | 60 | **0** | three uses of "arc" as ordinary English remain and should **stay** |
| `Meta-Coach` | 111 | **1** | `01_...md` L47, "Fade is a Meta-Coach behavior triggered by stability" |
| `intervention`, reactive sense | 53 | **0** | the word does not appear; `comment` adopted cleanly |
| Loose `Ally` | 3 | **3** | `01_...md` L40 and L289, and `02_...json` L528 (`journey.description`, addiction) |

**Total: 4.** You did the work, and it shows.

On the three remaining `Ally` uses, the substance matters more than the count. In the Addiction Journey,
the person Roni agrees with is a real-world supporter, not somebody added to a Journey's Support Circle,
so under our model that person is not an Ally and there is no in-app object representing them. **The good
news is that the Step itself (`add_s6`) is written in correct plain language**, one person, no in-app term,
no routing. The misuse is confined to the Journey description and to QA prose, and it is not on a crisis
path, which is a real improvement on v1.1 where the misuse was *inside* the crisis routing. Still worth
fixing, because `journey.description` is user-visible.

### 7.3 The rules going forward

**The coach.** Your **Meta-Coach** is the same entity we call **the coach**. There is a fault on our side
worth stating: our internal name for it, "meta-agent", was defined only in a decision log and an authoring
guide and was **missing from our canonical terminology document**, so the brief you worked from was not in
the place you would look. We have added it. Canonical from now: **"the coach"** for anything user-facing,
**"meta-agent"** for architecture. No other renaming of your architecture is needed. Your **Expert** usage
matches ours exactly, including the rule that experts never speak to the user directly.

**`intervention` means opposite things in our two vocabularies.** Ours is a **proactive** action the app
initiates: a notification, a reminder, an outreach. Yours is a **reactive** coaching move inside a
conversation the user started. Decision: we keep `intervention` for the proactive sense, and your reactive
move is **`comment`**. Academic uses stay untouched, because they are citations.

**An Ally is only someone the user chose to add to the Support Circle of a particular Journey**, through an
explicit invitation and consent flow, with a permission model controlling what that person can see.
Nothing else is an Ally. Sponsors, clinicians and family are real and they matter, and they are **not
modelled in our product at all**. The concrete risk, stated once more because it is the one we care most
about: if that text were wired as written, a user in a high-risk moment would be pointed at an in-app Ally
list that may be completely empty, while the person who could actually help them is not represented
anywhere in the product. When your content refers to real-world or professional support, please use plain
language: "someone you trust", "your sponsor", "a professional". Never route a user to the Ally list as if
it were crisis support.

**Dreams stay user-visible for now.** Your spec says the coach owns the internal representation of Dreams
and should not expose the internal taxonomy. In our product a Dream is a first-class, user-visible object
with its own screen. You flagged the tension yourselves and deferred to us, which we appreciated. This is
explicitly revisitable, so please do not build content that depends on the user never seeing their Dreams
named. v1.3 respected this correctly, by the way: you authored real Dream objects with titles and
descriptions rather than an internal taxonomy. You then forgot to link them (§5.2).

**There is exactly one Weekly Review, and it is a shared mechanism.** Yours is not a second object, it
nests inside ours. The framing to design against: the Weekly Review is a shared surface available to every
domain expert and every Journey, into which they contribute information for display. Per §4, the
contribution slot does not exist in code yet, which is why §5.5 asks for removal rather than rewriting.

**Two mechanisms we already ship that your content still does not know about.** We raised these last time
and they are still absent, so we are raising them once more.

- **Grace Tokens.** Our non-punishing allowance for a missed commitment. This is precisely the mechanic
  your own axiom (*a lapse is data, not a reset*) is asking for, and it already exists.
- **Step Postponement.** A user can move a Step rather than fail it, and the system adapts around it.

Judged fairly, your "return rule after a miss" (`body_m4` / `body_s7`, `add_m4` / `add_s7`) is **better**
than v1.1's forgiveness handling, because it is prepared in advance rather than triggered by failure,
which is your own good new rule. And it is a user-level behavioural commitment rather than a competing
product mechanic, so it does not actually collide. But a user could end up holding two different
forgiveness models at once. Please write the return rule as something that **composes with** Step
Postponement and Grace Tokens rather than alongside them.

---

## 8. Safety: nothing ships without expert review, and your quality does not change that

**Addiction** and **Relationships & Loneliness** are not on the shipping path today, and will not be until
they have gone through **expert review before release**. Nothing goes out to our customers at all right
now — there is no release path yet, for any domain — and once there is, everything, these two domains
above all, goes through expert approval before it reaches a real user. That review has not happened, so
none of it ships today. (Internally: an earlier version of this rule was framed as also blocking these two
domains from being built out at all before a clinical review — our Decision Log **D24** — but the founder
has since clarified that was never his ruling and has rescinded that specific framing, **D53**, 2026-08-18.
The safety requirement itself is unchanged: unreviewed sensitive-domain content does not reach a real
user, ever. Only the mechanism moved, from a development-stage block to a release-stage review. Nothing
about how we're treating your content changes because of this.)

We want to be unambiguous about what this is and is not. **It is not a judgement about your content.** On
the contrary, the v1.3 material in those domains does not overreach, and we noticed:

- The Addiction Journey is explicitly adjunctive, and its persona constraints say the clinical plan stays
  outside the app.
- `add_s3` says in its own description that PushApp does not choose a substance, medication, dose or
  medical substitute.
- `contentBoundaries` lists "no claim that app support replaces cessation care".
- The Relationships boundaries correctly say ordinary coaching **stops** on depression, suicidality or
  coercion.

That is a real improvement on v1.1 and it shows you absorbed the previous feedback. But three things in
that content assume capabilities we do not have, and we would rather say so than let it stand:

1. **"Ordinary coaching stops" is a note, not a control** (§4). Nothing in the app makes it happen.
2. **`add_s7` asks the user to define what they do after a "non-acute" slip.** Distinguishing acute from
   non-acute is a clinical triage judgement. We have no triage layer and the coach cannot make that call.
   The Step is safe **as authored**, because it asks the user to write their own rule. It must never be
   read as licence for the coach to classify a slip.
3. **The personas assume an intake we cannot perform.** Roni's example is scoped by "no acute
   medical/crisis signal in this example", Noam's by "no known depression/suicide/social-anxiety safety
   override". Those are assumptions written into an example, not screens the product runs. A real user
   whose opening line matches Roni's is, to our current code, indistinguishable from one in crisis.

So both Journeys are accepted as **content held against the gate**: reviewed, filed, explicitly not wired,
exactly like the rest of the material we have from you. **Career and Body Image are the two that can
realistically inform the shipping path.** If you are choosing where to spend effort on the next
deliverable, spend it there.

---

## 9. What we are asking for next

In priority order.

1. **The six fixes in §5.** Ideally at source, in your master copies, so our two versions do not diverge.
2. **The four terminology edits in §7.2.** One `Meta-Coach`, three `Ally`.
3. **Not more Journeys. Interview questions per bottleneck.** This is the highest-value thing you could
   send us, and the reasoning is in your own package. Three of your four Journeys pass the swap-the-name
   test. The Addiction one fails it: strip "Roni" and what remains is the standard cue-to-routine
   substitution protocol. It is competent, arguably the most clinically defensible of the four, and
   nothing in it is Roni. The contrast with Noam is the diagnosis: Noam's Journey works because the
   interview surfaced a prior success that the plan could then use. **Roni said nothing the Journey used,
   because the interview never asked.** The pipeline's output is bounded by a stage that is not in this
   package, and that is where the remaining quality is.
4. **Then variants, per §2.4.** Two goals with three deliberately different Journeys each, one named axis
   of variation, a declared view of who each suits. Career and Body Image.
5. **Two smaller notes from the review, worth carrying into the next set:**
   - `career_s7` is 60 minutes against a persona whose stated capacity is about 2 hours a week. That is
     half her week in one sitting, and it is the pivotal Step of the Journey. It should be split ("map the
     problem" / "write the proposal"), which is also a natural dependency chain of the kind you already
     know how to author.
   - `estimatedDuration` is read by one of our adaptation levers as **effort**, so a long Step plus "no
     time" triggers an offer to shrink it. Your three 90-minute Relationships Steps are honest, because a
     board-game evening really is 90 minutes, but they are attendance rather than effort. Offering to
     shrink Noam's board-game night would be nonsense. Worth flagging any Step where the number means
     "how long the thing lasts" rather than "how much effort this costs".
6. **`expertJudgment.secondaryBottleneck` is captured and never used.** Maya's `ALL_OR_NOTHING_EATING` is
   arguably her real problem, since the "restart on Monday" loop is the thing she named first, and it is
   reduced to one Step and one Milestone. Roni's `TRIGGER_CONTEXT_GAP` never surfaces at all. If a
   secondary bottleneck never changes the plan, either delete the field or make it do work.
7. **A question about terms.** As we start treating your Journeys as library content that ships to devices
   and may later sit alongside third-party material, we need to know what applies: attribution, licensing,
   exclusivity, any constraint on derived variants or on our use of the outcome data. Better answered
   before we ship rather than after.

---

## 10. Still open on our side, so please do not design around them yet

- Whether real-world supporters (sponsor, clinician, family) ever become a modelled concept. We are
  deliberately **not** inventing a term for them yet, because naming something is how you accidentally
  decide it exists.
- Per-Step recurrence and weekday scheduling (§3.1, §3.2). Real work, not a patch. We will tell you when
  it lands and what the authoring convention becomes.
- Whether the Dream screen stays user-visible long term.
- Which domains participate in any outbound learning at all, the consent model, and the exact definition
  of "it worked". These are founder decisions and they are not made.

---

## 11. Housekeeping

`11_GUY_UPDATE_HE.md` is in Hebrew. Our repository language is English, but we keep partner correspondence
verbatim rather than translating it, and we have recorded that as a deliberate exception.

Your v1.1 package contained internal duplicates (`10_PushApp_v1.1_COMPLETE_QUALITY_EVALUATION.md` is a
concatenation of the whole set, and several files appear twice in different folders). We handled it. A
future version with a single source per document would reduce the chance of the copies drifting apart.

---

Thank you. The direction of travel between v1.1 and v1.3 is the right one, and the most useful thing we
can do in return is be equally exact about where our product is not yet ready for the content you are
writing.

# Letter ends

---

## Appendix — notes for the founder, not part of the letter

**Categorization of what this letter states.**

- **Approved and safe to send as stated:** the three-layer architecture and the several-Journeys-per-goal
  brief (D52); the data boundary; the terminology decisions (D47, D48, D49, D50); §8's safety framing —
  nothing ships without expert review (**D53**, corrected 2026-08-18 from the earlier D24 dev-stage-gate
  wording); the four quality signals; the ambition-adjustment rule.
- **Recommended, not yet decided:** the three feedback hosts and the yes/partly/no plus 1-to-5 shape
  (§6.2); the fix order in §9; the request for variants over new goals.
- **Open Question, presented as such:** everything in §10, plus the partner content terms in §9.7.

**Three things to check before sending.**

1. **The gated-until-review domains are Addiction and Relationships & Loneliness, not Body Image.** D24
   named those two, and D53 (2026-08-18) preserves that scope while correcting the mechanism — see §8.
   Body Image is not held to that standard by D24/D53; it carries a separate, lesser constraint (a
   probable Google Play Health declaration and an Art. 9 analysis if it ever enters outbound learning).
   §8 is written to D53 as logged. If the intent is to also hold Body Image to expert-review-before-
   release, that is a **new decision** and should be logged before this letter goes out, because the
   letter tells the partner to spend their next effort on Career and Body Image.
2. **§8 was rewritten same-day (2026-08-18) to reflect D53** — confirm the founder is comfortable with
   the corrected framing (expert review before release, not a development-stage gate) before this goes
   out; the original §8 wording stated D24 as a settled founder ruling that the founder says he never
   made.
3. **§9.7 asks the partner a commercial question** (attribution, licensing, exclusivity, derived
   variants). That is Open Question 10 in `Plan_Library_and_Learning_PRD.md` §17 and it is genuinely the
   founder's to ask, in the founder's own words. Reword or remove it if the timing is wrong.
