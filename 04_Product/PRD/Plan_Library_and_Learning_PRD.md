# PRD — The Journey Library, the User Profile, and the Matching Layer

*(File name predates the widened scope of 2026-08-17/18 and is kept so existing links hold. The subject
is the three-layer architecture below, not a single feature.)*

Status: **Founder-decided in principle (Decision Log D52), specification in progress, NOT ready to
build.** The founder set the direction on 2026-08-17 and widened it on 2026-08-18 to its full shape:
*"This is the essence of the app. This is its uniqueness."* What is decided is the architecture and the
data boundary. What is **not** decided is the objective function's final form, the participating domains,
the consent model, and the k-threshold — §17's blocking questions, which are the founder's.

Stage: **MVP** for Layers 1–2 as local, on-device capability (§15 Stages 0–1, buildable now with no
backend and no privacy change) → **Commercial** for the outbound record and the central learning loop
(§15 Stages 3–4). The marketplace layer (§10) is **Future** and is only designed *against*, not designed.

Owner: founder + AI product team. Required reviewers before any implementation of §§11–13:
**security-privacy** and **store-compliance** (§14).

Source: founder decision 2026-08-17 (the data boundary and the Spotify comparison), widened 2026-08-18
(the three layers, end-of-Journey feedback as the label, conditional matching, and the
fewer-notifications objective).

**Companion research (owns the parameters; this PRD owns the architecture and the outbound contract):**
`05_Research/User_Matching_Parameters_Research_2026-08-17.md`. It answers *by which parameters should we
categorise a user*, with an evidence review, a ranked tier A/B/C/D shortlist, a do-not-collect list, and
the cold-start answer. **Layer 1 below defers to it rather than duplicating it**, and §11.2 was
*changed* by it (§11.2.2). Where the two disagree, the research wins on parameter selection and this
document wins on what leaves the device.

Related PRDs: `Communication_Style_Profile_PRD.md` (Layer 1's "how to address them", built but not
wired), `Smart_Notification_Timing_PRD.md` (Layer 1's timing faculty), `../Miss_Recovery_PRD.md` (the
reason log — Layer 1's abandonment signal), `Future/User_Learning_PRD.md` (the *within-user* model, a
different thing — §5.5), `Done/Completion_Celebration_PRD.md` (**immutable**; the host surface for
end-of-Journey feedback — §9.6), `Journey_Abandonment_PRD.md` (the *other*, more important host surface —
§9.7), `Future/Personalized_Motivation_Engine_PRD.md` (the Helpful/Not-helpful precedent and its
"success measured primarily by explicit helpfulness, not notification opens" principle),
`Future/Creator_Journey_Authoring_Platform_PRD.md` (V4 — what the marketplace layer becomes),
`Weekly_Review_Contributions_02_PRD.md` (D50), `Backfill/Account_Deletion_and_Data_Export_PRD.md`.

Related Decision Log: **D52** (this decision), **D24/D53** (the four domains; Addiction and
Relationships & Loneliness gated behind expert review before release — D53, 2026-08-18, corrects D24's
mechanism from a development-stage gate to a release-stage review), **D25** (framework-not-content), **D30**
(experts are internal tools; the coach is the only user-facing voice), **D40** (on-device red lines),
**D42/I1** (the completion ceremony), **D46** (cancellation is irreversible), **D51** (measurement, not a
gate, as the response to a growth-before-engagement tension).

Grounding — read, not assumed: `app/src/core/learning/DomainExpert.ts`,
`app/src/core/learning/experts/BodyImageExpert.ts`, `app/src/core/types/domain.ts` (`ReasonId`,
`LeverId`, `ReasonEntry`, `OutreachInsight`), `app/src/core/social/SocialGateway.ts` (`ProgressSummary`),
`app/src/core/insights/InsightGateway.ts`, `11_Engineering_Bible/Sync_Manifest.md` §§1–4,
`11_Engineering_Bible/Encryption_Design.md` §§1, 12, `10_Partner_Coaching_Content/Journeys/*`,
`04_Product/PRD/Communication_Style_Profile_PRD.md` §4. **No code was written or changed.**

---

## 1. Purpose

This is not a feature PRD. It describes **what PushApp is**.

The founder, 2026-08-18:

> "The app must produce an accurate user profile that knows how to address the user, what motivates them
> most, what makes them abandon plans, and more — so we know how to communicate with them best and build
> plans that are as precise as possible. […] **This is the essence of the app. This is its uniqueness.**
> We need to know the user well enough to send **few** notifications but ones that actually move them to
> action; well enough to build a plan that genuinely fits; well enough to speak in a language that makes
> them comfortable."

Three layers make that real, and none of them works alone:

1. **The user profile** — who this person is, in the operational sense: how to address them, what moves
   them, and what makes them stop.
2. **The Journey Library** — several Journeys per goal, with the evidence to tell the good ones from the
   bad ones.
3. **The matching layer** — which Journey suits which kind of person, discovered from outcomes rather
   than declared up front.

The single question this document answers: **how do all three work, and learn, without us ever holding
what a named person is trying to change about their life?**

---

## 2. The failure that triggered this

Two data points, both from the founder, both about the product as it exists today.

**One.** A user asked for help drinking a protein shake every day. The request routed to
`BodyImageExpert`. The Journey they received contained Steps about walking, stretching, eating meals at
regular times, and noticing one thing they appreciate about their body. The goal never reached the
content.

**Two, and this is the one that matters more:**

> "So far the plan that was built for me didn't help me at all."

The first is a routing failure and is embarrassing. The second is the product failing at its purpose,
reported by the person best placed to judge it. Note what we would have recorded about that Journey
today: **nothing.** No structure was chosen from alternatives, so there is nothing to compare. No
feedback was asked for, so the verdict exists only in a conversation. No outcome was captured, so the
next user gets the identical plan. **The most important fact we have learned about our own product
reached us by chat message.**

---

## 3. What we have today is the opposite of this architecture

Not "an early version of it". The opposite of it, in four specific ways.

| The architecture needs | The code has |
|---|---|
| Several Journeys per goal, so there is something to choose between | **One fixed arc per domain.** `BodyImageExpert`: `MILESTONES` is a four-entry `const`, `STEP_TITLES` is a fixed `Record` of twelve strings. Four experts, four arcs, for every user alive. |
| A profile that shapes the plan | **Three levers.** `buildStructure` reads a 0/1/2 baseline, a minutes figure, and a staged boolean. Everything else the interview collected is discarded, including every free-text answer. |
| Outcome capture per Journey | **None.** No record is written when a Journey completes, is cancelled, or quietly dies. |
| End-of-Journey feedback as ground truth | **None.** There is no moment where anyone is asked whether it helped. |
| Matching | **None.** Routing is domain → expert → the one arc. |

The partner's quality rule is *if you can swap the user's name and the Journey barely changes, it is too
generic.* Our code does not merely fail that test — **it is identical for every user in a domain, by
construction.**

**There is nothing to compare, so there is nothing to learn from.** That is the whole problem in one
sentence, and it is why the library is not an enhancement.

**The library replaces the template model; it does not sit beside it.** Each expert's fixed arc becomes
**Journey Template #1** in the library for its domain — preserved, not deleted (CLAUDE.md §3.3), and
demoted from "the answer" to "one candidate among several". The `DomainExpert` seam survives and its
role changes: an expert becomes the **interviewer, router and safety authority** for its domain, and
stops being a content source. `proposeMilestones` / `stepTemplatesFor` / `buildStructure` keep their
signatures and are re-implemented to select from the library rather than to hard-code an answer, so the
`Planner` never learns that anything changed.

---

## 4. Terminology

| Term | Meaning | Not to be confused with |
|---|---|---|
| **Journey** | One person's live, personal, finite transformation. Unchanged, canonical. | — |
| **Journey Template** | An authored, inert, reusable structure in the library: a Milestone arc, its Step templates, the conditions it suits, its ambition level, its provenance and version. A Journey is *instantiated from* a Journey Template. | A Journey. A template is nobody's; a Journey is somebody's. |
| **Journey Library** | The versioned corpus of Journey Templates. Our content. | The user's list of Journeys. |
| **User Profile** | The on-device operational model of one person (§5). | The `pushapp.profile` identity blob (name, country, birth date), which is a different, existing thing and is **not** this. |
| **Cohort** | A coarse bucket of user attributes, used only for aggregate learning. Never an individual. | A segment for messaging. It is never used to address anyone. |

`Repository_Guidelines.md` bars "Plan" as a synonym for Journey. **Journey Template** follows the
founder's own words ("Journey library", "several Journeys per goal") and keeps "Journey" attached to the
live object where it belongs. An earlier draft of this PRD used "Plan Template"; the change is recorded
rather than silently made. Ratification is **Open Question 6** and product-guardian's call.

---

## 5. Layer 1 — the user profile

### 5.1 What it is for

Not the thin matching vector. A profile good enough to answer three operational questions:

1. **How do we address this person?** So the coach sounds like something they want to hear.
2. **What actually moves them?** So a notification is worth the interruption it costs.
3. **What makes them abandon?** So the plan is shaped around their real failure mode instead of a
   generic one.

The third is the one we already half-collect and never use, and it is the most valuable of the three.

### 5.2 The four faculties, and what exists today

| Faculty | Signal | State today |
|---|---|---|
| **Address** — how to speak to them | `CommunicationStyle`: Direct / Explanatory / Warm / Energizing (`Communication_Style_Profile_PRD.md` §4) | **Built and dormant.** The quiz ships and persists a style; `profileToCoachStyle()` exists; nothing calls `buildNotificationContent` with it. Selecting a style currently changes one confirmation screen and nothing else. |
| **Motivate** — what moves them | The `motivation` and `foundation` interview intents (multi-select closed options plus free text), the "why" | Collected at Journey creation, used for nothing. `buildStructure` never reads them. |
| **Abandon** — what makes them stop | `ReasonId`: `forgot` · `no_time` · `lost_motivation` · `too_hard` · `did_partially` · `couldnt` · `not_relevant` · `other`, each mapped by config to a `LeverId` (`retime` · `refrequency` · `retone` · `rally` · `reconnect_why` · `reshape` · `mirror` · `grace`), appended to `reasonLog` as structured `ReasonEntry` rows | **This is the find.** A closed, structured, already-persisted abandonment vocabulary with a documented intent — its own type comment calls it *"the seed of the 'learn the user' data"* — and **nothing consumes it for planning.** The taxonomy the architecture needs already exists and has been accumulating. |
| **Timing / load** — when they can act | `behaviorLog` → `InsightModel`, `SchedulingPrefs`, Active Hours, `Smart_Notification_Timing_PRD.md` | Partly built, `adaptiveEnabled`-gated, dormant in production. |

**The immediate consequence, and it needs no backend, no library and no permission:** the reason log
should feed planning. A person whose last six misses were `no_time` and a person whose last six were
`lost_motivation` have different problems, and today they receive the same next Journey. Wiring
`reasonLog` → lever distribution → plan shape is buildable now and is §15 Stage 0.

### 5.3 Which parameters — deferred to the companion research

`05_Research/User_Matching_Parameters_Research_2026-08-17.md` owns the parameter question and should be
read before anyone implements Layer 1. Its four load-bearing conclusions, carried here so this document
is not silently inconsistent with it:

1. **The strongest parameters are behavioural and already on device.** Its tier A — revealed adherence,
   revealed-vs-stated capacity, restart-after-miss, dominant friction reason, revealed daypart — is
   entirely derived from behaviour we already record. Its own summary: the matching problem is *"far
   more a derivation and plumbing problem than a data-collection problem."* That is why §15 Stage 0 is
   buildable now and why "ask more questions" is the wrong instinct.
2. **Stated answers are a cold-start prior with a short half-life**, not the model. The
   intention–behaviour gap says an onboarding answer is a statement of intention: a legitimate prior and
   a terrible model.
3. **Two attractive parameters are refused outright**, and the reasons should be quoted at anyone who
   proposes them later: a **personality/conscientiousness inventory** (genuinely predictive, but revealed
   adherence measures the same construct from behaviour for free, and a stable trait label invites
   fatalistic matching), and a **readiness/stage-of-change classifier** (the evidence says stage-matched
   interventions do not beat well-designed unmatched ones).
4. **Demographics never enter matching.** Age, gender and country are weak predictors and our strongest
   re-identifiers, which is the worst possible combination for this purpose. We keep collecting them for
   grammar, week start and language, and they never touch the vector.

**The delivery/matching firewall, stated because the research warns it will be attacked.**
Communication style, Active Hours, language and form of address are **delivery** parameters: they change
*how and when we speak*, never *what plan we build*. The moment style enters the matching vector,
"Direct-style users get harder Journeys" becomes a defensible-sounding sentence with no evidence behind
it — a preference about tone reused as a claim about capability. D40 already binds the style layer to
"adapts presentation only, never facts, logic, timing, safety"; the matching layer inherits that
constraint verbatim. Note that §11.2's section B contains **no delivery parameter**, and that is a rule,
not an oversight.

**One honest caveat carried forward.** The research flags the reason→lever idea (its A4, this document's
`dominantLever`) as *"our most attractive untested idea"* — no supporting trial evidence, and its
closest analogue in the literature, stage-matching, was tested and failed. It is cheap because the data
is already collected as enums, and it should be treated as **a hypothesis to test first**, not as an
established mechanism. §16 instruments it accordingly.

### 5.4 The profile is built and kept on the device

This is the load-bearing architectural claim of the whole document, and everything in §11–13 depends on
it.

**All raw material stays on device, permanently:** the free-text goal, every "Other" answer, the "why",
`reasonLog` including its `note`, `behaviorLog`, coach conversation text, onboarding answers as given,
check-in times, exact dates, `pushapp.profile` (display name, handle, country, birth date, form of
address). This is `Sync_Manifest.md` §4 and the G1/G2 comments in `SocialGateway.ts` and `domain.ts`,
unchanged and unweakened by this PRD.

**The derived profile also stays on device.** The `UserProfile` object — style, motivation weights,
lever distribution, capacity estimate — is computed locally, stored inside the encrypted `AppState`
blob, and **is never uploaded, in whole or in part**. There is no "profile sync", no server-side user
model, and no endpoint that accepts one.

**What may leave is not the profile.** It is a handful of coarse buckets *describing the kind of person
an outcome came from*, attached to that outcome and to nothing else (§11.2 section B). The difference is
not cosmetic: a profile is about a person and accumulates; a cohort descriptor is a property of a
measurement and is discarded into an aggregate.

The founder asked us to "build some profile of each client so we know how to match the right plans to
them." **We do exactly that. It lives on their phone.** That is not a limitation on the idea; it is what
makes the idea safe enough to ship (§12.5).

---

## 6. Layer 2 — the Journey Library

### 6.1 Shape

**Several Journey Templates per goal**, not one per domain. The unit of choice is the goal ("drink a
protein shake daily", "get back to running", "leave this job well"), not the domain. A domain may hold
dozens of goals; a goal holds several templates that differ in ambition, structure, pace and emphasis.

Each Journey Template carries: the Milestone arc and its Step templates; an **authored ambition level**
(§8.3 depends on it); the conditions its author believes it suits; **provenance (who wrote it), licence
terms, and version** (§9.2 — all three from day one, not retrofitted); locale/translations; and its
safety-review status. It carries **nothing about any person**.

The partner's Golden Journeys in `10_Partner_Coaching_Content/Journeys/` are exactly this content and
are the seed corpus.

### 6.2 The four quality signals

The founder named these precisely. All four are needed; the first three are behaviour and the fourth is
truth.

1. **Persistence rate** — how many people were still going at all.
2. **The stage they reached before dropping — a drop-off curve, not a binary.** This is the signal most
   easily lost by a naive implementation, and it is the most diagnostic one: a template where 80% clear
   Milestone 1 and 15% clear Milestone 2 has a **specific, findable defect at Milestone 2**. A binary
   completed/not-completed hides that entirely. Implementation: record `milestonesReached` out of
   `milestonesTotal` (small integers, our own structure), which yields a survival curve per template.
3. **Completion rate** — adjusted for ambition (§8.3), never raw.
4. **End-of-Journey feedback — did it help, and a rating.** §6.3.

### 6.3 End-of-Journey feedback is the label on the training data

Signals 1–3 are behaviour. Behaviour tells us what happened; it does not tell us whether it was *good*.
A person can complete every Step of a Journey that changed nothing, and abandon in week 2 a Journey that
gave them the one thing they needed. **Without a human verdict, Layer 3 has no ground truth and cannot
work at all.** This is not a nice-to-have that improves the model. It is the label, and a supervised
learning problem without labels is not a hard problem, it is not a problem.

It does not exist today. Specified:

- **Two questions, both optional, both skippable, never blocking.**
  - *"Did this help?"* → `yes` / `partly` / `no`. Three options, not two: "partly" is where most honest
    answers live and forcing a binary would destroy the signal.
  - A **1–5 rating**.
- **One optional free-text box** — *"anything you'd tell someone starting this?"* This is the most
  valuable content in the product for improving templates, and it is **on-device-only, forever**
  (§11.3). It may be surfaced to the person themselves and to the coach locally. It never leaves. If we
  ever want it centrally, that is a new decision, a new consent, and a new review, and the answer is
  probably still no.
- **Precedent to follow, not reinvent:** `Future/Personalized_Motivation_Engine_PRD.md` §6 already
  establishes the house rules for this kind of feedback — optional, never blocking, correctable,
  *"lack of feedback is not a dislike"*, and *"success measured primarily by explicit helpfulness, not
  notification opens"*. That last line is the ancestor of §8 and should be treated as settled doctrine.

### 6.4 The survivorship trap, which would quietly destroy the dataset

**The completion ceremony only ever meets people who finished.** If end-of-Journey feedback is asked
only there, every label in the corpus comes from a success, the model learns that everything works, and
the library ranks templates by how good they are at retaining the people they were already working for.
That is survivorship bias in its purest form and it would be invisible in every dashboard.

**The most valuable feedback comes from the people who quit.** They are the ones who know what was
wrong.

So the feedback moment needs **three hosts**, not one:

1. **Completion** — the big ceremony (`Done/Completion_Celebration_PRD.md`, D42/I1).
2. **Cancellation** — the "Cancel this Journey" flow (`Journey_Abandonment_PRD.md`). Asked *gently and
   after* the cancellation is done, never as a condition of leaving, and never in a way that reads as
   arguing with the decision (D46: the app informs a choice, it never overrules it).
3. **Quiet death** — a Journey that reaches its end date incomplete, or that returns from the inactivity
   freeze and is not resumed. This is the largest group and the one with no natural moment, so it needs
   a designed one: a single, low-key ask, once, easy to dismiss forever.

**A structural finding, flagged rather than assumed:** `Done/Completion_Celebration_PRD.md` is in
`Done/` and is **immutable** under the README's Done-file protection rule. Adding a feedback step to the
ceremony therefore requires a `Completion_Celebration_02_PRD.md` continuation, not an edit. The
cancellation and quiet-death hosts belong to `Journey_Abandonment_PRD.md` (still in specification, seven
open questions) and to a surface that does not exist yet. **Recommendation:** one continuation PRD
owning all three hosts as a single feedback moment with three entry points, so the copy and the data
shape cannot drift apart. Sited here as a dependency; not written by this document.

---

## 7. Layer 3 — the matching layer

### 7.1 The shape to design for

The founder's example is the specification:

> "Journey A is very good for task-oriented people with at least 6 hours a week, but not good for people
> with fewer hours."

Read that carefully. It is not "Journey A is good". It is **"Journey A is good *conditional on* two user
attributes, and bad when one of them flips."** Three consequences:

1. **A template has no single fitness score.** It has a *function* from user attributes to fitness. A
   global leaderboard of templates is the wrong object and must not be built, because the average across
   cohorts is exactly the number that hides the finding.
2. **The conditions are discovered, not declared.** An author may *propose* who their template suits
   (§6.1), and that proposal seeds the ranking when there is no data. But the system's job is to find
   the conditions that actually hold, including ones no author thought of, and to overrule the
   proposal when outcomes disagree.
3. **What we are looking for is an interaction effect**, in the statistical sense: not "does time
   available predict success" (it does, everywhere, trivially) but "does the *effect of this template*
   differ by time available, more than it does for other templates". That is a harder question and needs
   more data than a main effect.

### 7.2 How a condition is discovered

- **The base cell** is the three fixed cohort slots (§11.2 B): `domain` + `baselineLevel` +
  `weeklyTimeBucket`. Everything is measured relative to that base.
- **The candidate condition** is whatever attribute the record's rotating slot happens to carry
  (§11.2.1). Across the population every candidate is sampled; within any one comparison exactly one is
  under test. The founder's "task-oriented" arrives as a `motivation` or `lever` slot value.
- **Within each (base cell × template)** we hold the aggregate of the section-C outcome measures: the
  drop-off curve, the completion distribution, the did-it-help rate, the mean rating, and the
  interruption efficiency.
- **A condition is proposed** when a template's outcome differs across the levels of one condition
  attribute by more than the noise. It produces exactly the founder's sentence, in a form a human can
  read and a content author can act on: *"Template A: helped 71% at 6h+/week (n=140), 24% below 3h
  (n=160)."*
- **The device** computes its own base cell locally, reads the conditional ranking, then **re-ranks
  using the local profile signals the server has never seen** (§5.4) — the free-text goal, the lever
  distribution, current load. Then it picks. Delivery parameters never enter this step (§5.3).

### 7.3 Before a condition is trusted

A "pattern" found by scanning many templates against many attributes is mostly noise. Four gates, all
required, none of them exotic:

1. **Support on both sides.** Each level of the condition must independently clear the k-floor (§12.2).
   A split of n=140 vs n=3 is not a condition, it is an anecdote with a denominator.
2. **Effect size, not just significance.** With enough records, trivial differences become
   "significant". A condition is only published if the gap is large enough to change which template we
   would recommend. If it does not change the choice, it is a finding, not a condition.
3. **Multiple-comparison correction.** We are testing eight candidate attributes across many templates,
   so uncorrected p-values will manufacture conditions. Correct for the number of tests, and record how
   many were run.
4. **Holdout confirmation.** A condition is proposed on one period's records and **confirmed on the
   next** before it changes any ranking. A condition that does not replicate is discarded, not weakened.

**Until a condition passes all four, the author's declared conditions stand.** Discovery overrules
authorship only on evidence, which is the inverse of the usual failure where a weak signal quietly
overrides a considered editorial judgement.

### 7.4 When the data is too thin, which is most of the time

At k = 20 and a rotating slot sampling one attribute in eight, **most cells will never support a
condition**, and that must be a normal, tested code path rather than an error state. The degradation
ladder, borrowed from the companion research:

> **Degrade to the parent bucket, never suppress silently.** Below the floor, drop the least-predictive
> field and re-check, recursively, down to domain alone; and if even that fails the floor, fall back to
> pure expert rules.

So: base cell → drop `weeklyTimeBucket` → drop `baselineLevel` → domain only → editorial ordering →
expert rules. **Every rung is a supported path with tests**, and the bottom rung is exactly what the
product does today, so the worst case of the entire learning layer is "no worse than now".

### 7.5 Cold start, honestly

Until a cell has data, ranking is **editorial**: the author's proposed conditions, ordered by the
partner's judgement. That is not a degraded mode, it is the normal mode for a long time, and it is
already better than today because there is more than one candidate. §15 Stage 4 is explicit that the
learning loop is a second-year capability. **The library is valuable long before the learning is.**

What conditional discovery costs, without softening: detecting an interaction needs substantially more
data than detecting an average; the k-gate sets a floor per cell, not per template; and the rotating
slot divides the sample per condition by roughly eight. Multiply those together and **Layer 3 is the
last layer to become real by a wide margin.** Expect the first confirmed conditions in the largest cells
only, for the most-used templates, and expect most of the corpus to stay editorial indefinitely. The
companion research reaches the same conclusion from the other direction and recommends no outbound loop
in the POC at all (its §13 Q2). Anyone promising faster is promising something the arithmetic does not
support.

---

## 8. The objective function: action per interruption

The founder's goal is **fewer notifications that actually move someone to action.** Every standard
metric in this industry rewards the opposite. Open rate, click-through, sessions, DAU, retention, sends
— each one goes up when you interrupt people more. A learning loop pointed at any of them drifts toward
nagging, and it drifts *while every dashboard shows improvement*. This section exists so that cannot
happen.

### 8.1 Definitions

- **Interruption** — any app-initiated outbound contact: a notification, a coach-initiated message, a
  nudge. A user-initiated app open is **not** an interruption and is never counted as a cost.
- **Action** — a Step reported done or partial, or a return to a lapsed plan, occurring in the window
  attributable to an interruption.
- **Helped** — the Layer 2 label: the person said `yes` (or `partly`, at half weight) at the end.

### 8.2 The objective, stated so that sending less is a win

It is **not a weighted sum.** A weighted sum always has an exchange rate at which more notifications buy
more completions, and the loop will find it. It is a **constrained optimisation**:

> **Maximise `Helped`. Subject to that, minimise interruptions. Never trade the second against the
> first in the other direction.**

Operationally, three ranked terms:

1. **Primary (the label):** the did-it-help rate, ambition-adjusted. Comes from the user, so the system
   cannot manufacture it.
2. **Efficiency (the founder's actual ask):** **interruptions per helped Journey.** Lower is strictly
   better. A strategy that reaches the same helped-rate with half the notifications **must rank strictly
   higher**, not equally.
3. **Harm (a constraint, not a term):** notification permission revoked, per-Journey reminders switched
   off, Journey cancelled shortly after an interruption. **Any strategy that raises these is a loss
   regardless of what it does to terms 1 and 2.**

**Zero interruptions with a helped Journey is the maximum score, not a null result.** A person who
quietly did the work and told us it helped is the best outcome the product can produce, and the metric
must say so out loud, because every instinct in analytics will read that user as "unengaged".

### 8.3 Why ambition adjustment is not optional

If completion is unadjusted, the loop learns to recommend the templates that ask for the least, because
they are the easiest to complete. Completion rises, lives do not change, and the product becomes a
pleasant machine for finishing trivial things. Every Journey Template therefore carries an **authored
ambition level** (§6.1), and finishing an ambitious template must outrank finishing a trivial one.

### 8.4 The rule that makes this real

**The loop is allowed to discover that nagging works. It is forbidden from acting on it.**

It may well be empirically true that more notifications produce more short-run completions. The design
does not argue with the finding; it refuses the action. Concretely: each user has an interruption budget
derived from their own profile, with a fixed ceiling. **The learning loop may lower a budget. It may
never raise one above the ceiling.** Interruption volume is not a free variable the optimiser may move.

This is CLAUDE.md §3.4 made operational rather than aspirational, and it is worth stating that it will
cost measurable short-run numbers. That is the trade the mission requires.

### 8.4.1 The drift detector — one number that catches the failure early

An objective function can be right and still drift, because the loop optimises what it can measure and
the damage shows up in the content long before it shows up in the outcome. The companion research names
the exact tripwire, and it is adopted here as a **mandatory counter-metric**:

> Track **median Step difficulty and median weekly minutes of recommended Journeys over time. If this
> trends down while retention trends up, the matcher is gaming us.**

It is cheap, it needs no extra data, and it is the single most useful line in this section because it
catches "the system learned to recommend easy things" *while it is happening*, rather than a year later
when someone asks why nobody's life changed. It must be on the same dashboard as the primary metric,
not in an appendix, and a sustained downward trend is an alarm that stops the loop rather than a chart
someone notices.

### 8.5 Forbidden as objectives, permanently, at any weight

Time in app · session count or length · notification send volume · open rate or click-through · response
latency to a notification · retention / DAU / MAU · number of Journeys started · streak length as a
terminal goal · re-engagement of lapsed users as a volume target · subscription conversion · and any
composite containing them.

If a future model needs one of these as a *control* variable, that requires an explicit product decision
and a Decision Log entry. It is never a score.

### 8.6 Guardrails on the library itself

1. **Downranking is allowed; deletion is not.** The loop may lower a template's fitness for a cohort. It
   may never remove a template from the corpus, and never the ambitious end of it (CLAUDE.md §3.3 — the
   vision never shrinks). "Everything I am offered is easy" is the failure this blocks.
2. **High completion plus never returning to any Journey is a warning, not a win**, and must be surfaced
   to a human.
3. **Editorial override always outranks the score.** The partner and the founder may pin, cap or
   withdraw a template regardless of the data. Content safety is not a majority vote (Open Question 11).

---

## 9. The future marketplace layer — designed against, not designed

The founder's stated future: **coaches upload workshops that enrich the expert agents.** Not specified
here, and not built. But the architecture must not foreclose it, so five constraints apply now, each of
which is nearly free today and expensive to retrofit:

1. **Journey Templates are data with a published schema, not code.** A third party must be able to author
   one without a release. This is already the direction of §15 Stage 1.
2. **`templateId` lives in a namespace that can hold third-party ids**, with an author/provenance field,
   a **licence/terms field**, and a version from day one. Retrofitting provenance onto an id space is
   painful; retrofitting *licensing* onto content already shipped to devices is worse, because the
   answer may be that we were not entitled to ship it. The partner's Golden Journeys are the first
   third-party content and they arrive in Stage 1, so **the licence field must exist before Stage 1
   ships, even if every value in it is "first-party" at first.** This is the one marketplace constraint
   that is genuinely urgent rather than merely cheap; Open Question 10 is its content.
3. **Fitness is per-template and portable.** Because §7.1 forbids a global leaderboard, a third-party
   template slots into the same conditional structure with no special case.
4. **Safety review status is a first-class field on the template**, not an out-of-band spreadsheet. D24/D53
   require expert review before release for two domains; a marketplace makes that gate a schema field or
   it makes it a leak.
5. **Whatever outcome data a third party may see is the k-gated cohort aggregate and nothing else**
   (§12.1) — never rows, never their own users' records. Deciding this later, after coaches expect
   analytics, is a much worse conversation.

Everything beyond that is `Future/Creator_Journey_Authoring_Platform_PRD.md` (V4), which already covers
authoring, versioning, publishing and privacy-safe analytics, and which this document should be read
alongside rather than duplicated into.

---

## 10. Goals and non-goals

**Goals.** (1) A person's Journey reflects *their* goal and *their* failure mode. (2) We can tell good
Journeys from bad ones with evidence, including the stage at which people drop and whether they said it
helped. (3) We can find the conditions under which a Journey works. (4) The evidence is gathered without
holding anything that could tell anyone what a named person is trying to change. (5) A user who declines
to contribute gets **identical product quality** (§13.2 makes this true, not aspirational). (6) Fewer
interruptions, more action.

**Non-goals.** Server-side personalisation from an uploaded profile (rejected, §13.2). Cross-Journey
longitudinal learning about individuals (out of scope, Open Question 7). The marketplace (§9). Replacing
the `DomainExpert` seam or the `Planner` (§3). Advertising, third-party data sharing, or data sale
(forbidden permanently, and the prohibition belongs in the privacy policy, not only here).

---

## 11. The outbound contract

Written as a **strict allowlist**, in the style and with the force of `ProgressSummary` in
`app/src/core/social/SocialGateway.ts`: *these fields and no others, and adding one requires a fresh
security-privacy review.*

### 11.1 Shape and chokepoint

One record type, `JourneyOutcomeRecord`, produced by **exactly one pure function**,
`deriveJourneyOutcomeRecord`, and accepted only by a `JourneyLearningGateway` whose default binding is
`NullJourneyLearningGateway`. This mirrors `deriveOutreachInsight` → `InsightGateway`, which exists for
this reason and works. No other call site may construct the type; a test enforces it.

At most two records per instantiated template: an optional mid-checkpoint and one terminal record.
No streaming, no per-Step events, no telemetry.

### 11.2 The allowlist, field by field

**A. Content identity — our data, no user component**

`schemaVersion` · `templateId` · `templateVersion` · `variantId` · `authorNamespace` (§9.2) · `domain`
(enum; participating domains are Open Question 3).

**B. Cohort descriptors — the candidate *conditions* for Layer 3. Coarse buckets only, and HARD-CAPPED
AT FOUR FIELDS PER RECORD.**

Every one is computed on device from **closed** options. None is free text. None is demographic. None is
a delivery parameter (§5.3).

**Three fixed slots**, present on every record:

| Field | Values | Source today |
|---|---|---|
| `domain` | see section A | Q1 + the coach's domain triage |
| `baselineLevel` | 0 / 1 / 2 | `levelFromOrderedOptions` |
| `weeklyTimeBucket` | `under1h` / `1to3h` / `3to5h` / `over5h` | the `time` intent's closed options |

**One rotating condition slot**, carrying exactly one further attribute plus a tag naming which:

| `conditionKey` | `conditionValue` | Source today |
|---|---|---|
| `feasibility` | `reasonable` / `ambitious` / `tooAmbitious` | `assessFeasibility` |
| `cadence` | `daily` / `weekly` / `once` | `GoalInput.cadence` |
| `duration` | `upTo2w` / `2to6w` / `6to9w` / `over9w` | `Journey.durationDays` |
| `obstacle` | one closed code | the `obstacles` intent |
| `staged` | true / false | `usesMilestones` |
| `motivation` | one closed code | the `motivation` intent |
| `lever` | one `LeverId` | the modal lever across `reasonLog` at instantiation |
| `load` | `1` / `2-3` / `4plus` | concurrent Journey count (research B5) |

The slot's key is assigned **pseudo-randomly per instance, on device, at instantiation**, from the
attributes that are actually known. Across the population every candidate condition gets sampled;
**no single record ever carries more than four cohort fields.**

### 11.2.1 Why the rotating slot exists — the research changed this design

The companion research sets a hard constraint: *"Cap the outbound matching vector at four fields. Not
'as few as convenient' — four, as a hard design constraint that a reviewer can check."* Its arithmetic
is the reason: five coarse categoricals already produce ~1,000 cells, and at our scale most cells hold
zero or one person, at which point a vector of individually-harmless fields becomes a unique identifier
with a description of someone's struggles attached.

**An earlier draft of this section had nine flat fields and was wrong.** It is recorded rather than
quietly corrected, because the reasoning matters: nine fields would have been ~15,000 cells, which is
precisely the failure the research names.

But Layer 3 needs conditions, and conditions live in the interaction between an attribute and an
outcome. The rotating slot resolves the two demands instead of trading one away, and it does so because
**discovering an interaction does not require every attribute in one key.** To learn "Journey A works
for task-oriented people with 6+ hours a week", you need a stable base (domain, baseline, capacity) plus
**one** candidate condition at a time. That is a four-field key, tested repeatedly, not a nine-field key
computed once.

**What it costs, stated honestly:** each candidate condition is measured on roughly one eighth of the
records, so reaching the k-floor for any single condition takes about eight times as long as it would
with a flat vector. Layer 3 was already the last layer to become real (§7.5); this makes it later still.
That is the correct trade — it buys a row-level cardinality that stays inside the reviewable cap
permanently, and there is no version of this feature worth a re-identifiable corpus.

**Deliberately excluded, though each would help learning:** age or birth date, gender or form of
address, country, language or locale, time of day, day of week, device type, app version. These are the
classic quasi-identifiers ([Sweeney](https://dataprivacylab.org/projects/identifiability/): ZIP + date
of birth + sex uniquely identifies 87% of the US population), and the research is blunt that adding
*any* demographic to a vector that already contains domain is the specific step that turns a behavioural
profile into a person. **A real cost, stated rather than hidden:** we cannot learn that a template works
better in one country or one age group. Revisit only with a fresh review and a raised k.

**No sentinel for an excluded domain.** Where a domain does not participate (§17, Q3), the record is **not
sent at all**. It must never be sent with `domain: 'withheld'` or any equivalent — in a population where
only two domains are withholding-eligible, the sentinel *is* the disclosure. This is the research's
point and it is the kind of mistake that looks like a privacy feature while being the opposite.

**C. Outcome — including the drop-off curve and the label**

| Field | Values | Note |
|---|---|---|
| `outcome` | `completed` / `cancelled` / `ended_incomplete` / `still_running_at_checkpoint` | `cancelled` is D46's explicit user cancellation |
| `milestonesReached` / `milestonesTotal` | small integers | **The drop-off curve.** §6.2 signal 2. Our own structure, not user data |
| `completionBucket` | `0-25` / `25-50` / `50-75` / `75-99` / `100` | Bucketed; a raw float is more identifying and no more useful |
| `breakWeek` | 1..12 / `13plus` / null | First week with a seven-day reporting lapse |
| `weeksActiveBucket` | `1` / `2-4` / `5-8` / `9plus` | |
| `didItHelp` | `yes` / `partly` / `no` / null | **The label** (§6.3). Null when not answered; §6.3's rule is that no answer is not a "no" |
| `rating` | 1..5 / null | **The label** |
| `feedbackHost` | `completion` / `cancellation` / `quiet_end` | Which of §6.4's three hosts produced the label. Without this we cannot correct for survivorship, which is the entire point of §6.4 |
| `interruptionsPerWeekBucket` | `none` / `under1` / `1to3` / `3to7` / `over7` | §8.2 term 2 |
| `remindersDisabledDuring` | boolean | §8.2 term 3, the harm constraint |
| `extensionCount` / `replanCount` | `0` / `1` / `2plus` | D51 measurement |
| `structureEditedByUser` | boolean | The strongest single signal that the authored template did not fit |
| `cohortPeriod` | `YYYY-Qn` | **The only time information in the record** (§11.5) |

**D. Linkage**

`instanceId` — a random 128-bit value minted on device at instantiation, joining that instance's two
records and **nothing else** (§11.4).

### 11.2.2 The record changed, and how each change was priced

The pre-widening draft had 20 flat fields. This version has **24**, and the shape is different in a way
that matters more than the count.

**Added, each justified individually above and none for convenience:**

| Added | Why it earns its place |
|---|---|
| `didItHelp` · `rating` | **The label.** Without a human verdict the corpus has outcomes and no ground truth, and Layer 3 is unanswerable (§6.3). This is the point of the exercise, not an enrichment. |
| `feedbackHost` | Without it we cannot correct for survivorship, and §6.4 shows survivorship would silently destroy the dataset. |
| `milestonesReached` / `milestonesTotal` | The drop-off curve the founder asked for by name. Our own content structure, not user data. |
| `interruptionsPerWeekBucket` · `remindersDisabledDuring` | §8's objective and its harm constraint. Without them "fewer notifications, more action" is unmeasurable and therefore unenforceable. |
| `authorNamespace` | The marketplace seam (§9.2). Free now, painful to retrofit onto an id space. |

**Removed, and this is the more important half:** the flat nine-field cohort vector became three fixed
slots plus one rotating condition slot (§11.2.1). Five fields that would have shipped on every record
now ship on roughly one in eight.

**The structural point that governs both directions:** the k-anonymity **cell key is section B only** —
now capped at four. Section C fields are the *measured values inside* a cell, not part of its key.
Adding outcome fields therefore does **not** increase cell sparsity or re-identification risk, which is
why the label and the drop-off curve could be added at the same time the cohort vector was being cut.
The two changes are not in tension; they act on different things. **Section B is where the discipline
has to bite, and that is exactly where the record got smaller.**

The negative space in §11.3 did not move.

### 11.3 The negative space, as a prohibition

`JourneyOutcomeRecord` must **never** carry, in any field, in any encoding, in any future version
without a new review: the goal title or any part of it; any Journey, Milestone, Step or Dream title; the
"why"; **the end-of-Journey free-text answer**; any `reasonLog` entry, note, count or sequence; any
`behaviorLog` record; any coach conversation text; **any "Other" free-text interview answer**; any
onboarding answer verbatim; the account uid, handle, display name or email; any Ally or Support Circle
information; birth date, age, gender, form of address, country, language, locale or timezone; any exact
date or time; any device, install or push identifier; any IP-derived value; any raw series of any kind.

**A hash, a truncation, an embedding, or a "de-identified" derivative of any item in that list is the
item in that list.** That sentence exists because it is the loophole every such system eventually tries.

### 11.4 Identity: the three options, and the trade

| Option | Learning power | Re-identification risk |
|---|---|---|
| **(A) Stable user id** | Highest: true user-based collaborative filtering, longitudinal learning, ordering effects. | Highest, and unacceptable. The uid is linkable to the person through `profiles`/auth in the same system, and it accumulates a years-long dossier of what a named account tried to change about their life. This is the shape of data the FTC fined [BetterHelp $7.8M](https://www.ftc.gov/news-events/news/press-releases/2023/07/ftc-gives-final-approval-order-banning-betterhelp-sharing-sensitive-health-data-advertising) for disclosing. |
| **(B) No identifier** | Loses deduplication, loses distinct-contributor counting (which the k-gate needs), loses any way to honour "delete what you sent". The last is a compliance problem, not an inconvenience. | Lowest in theory. |
| **(C) Per-instance pseudonym** — **recommended** | Everything Layers 2 and 3 need: which template, for which cohort, with which outcome and which label. Loses (A)'s longitudinal and ordering signal. | Low. Random, per-instance, never derived from the uid, never reused. |

**Recommendation: (C).** The founder's question — "which Journeys are good in which cases and for which
users" — is answered by the **cohort vector**, not by identity. The "which users" half is section B.
Identity would add only the longitudinal dimension: the most sensitive thing we could hold, with the
least payoff for the three layers as specified.

**What (C) costs, named:** no sequence effects (does Template A prepare someone for Template B?), no
repeat-versus-first-timer comparison, and no flood detection beyond rate limits.

**The delete path (C) enables:** the device keeps a small `instanceId → journeyId` map inside the
encrypted `AppState` blob. It is the **only** link that exists anywhere between a record and a person,
and it never leaves the device. Withdrawing consent, or deleting a Journey, issues deletes for those
ids. Deleting the account destroys the map, after which we genuinely cannot identify whose rows those
were — which must be told to the user in exactly those words (§13.4), because the alternative is a
promise we would be unable to keep.

### 11.5 When it is sent

Never immediately. A record uploaded the evening a Journey ends tells anyone with server logs *when* it
ended, which is a strong join key. Instead: written to a local outbox; uploaded on a **randomised 3-to-14
day delay**, batched, on a schedule unrelated to app usage; and the server records **no row-level
ingestion timestamp** and **no client IP** (§12.3). The only time value that exists is `cohortPeriod`.

The cost is freshness, and it is cheap: content learning operates on quarters. Nothing here needs a fast
telemetry loop, and building one would be the first step toward what §8 forbids.

---

## 12. Where matching happens, and re-identification

### 12.1 Learn centrally, match locally

The founder compared this to Spotify, which does collaborative filtering server-side because it must:
its model is trained on hundreds of millions of playlists, and taste has no describable features — you
cannot say "songs like this" without enumerating the crowd
([overview](https://music-tomorrow.com/blog/how-spotify-recommendation-system-works-complete-guide)).
**We should not simply copy that, because our problem differs in a way that matters.**

| Sub-problem | Central? | Why |
|---|---|---|
| Learn "template T works for cohort C, conditional on attribute X" | **Yes, unavoidably** | A device sees one user. Aggregation is the whole point. |
| Store and serve the corpus | **Yes** | Content must update without a release. It is our data. |
| **Match this person to a template** | **No, and it is better on device** | The strongest signals are exactly the barred ones: the free-text goal, "Other" answers, the reason log, the behaviour log, active hours, current load, style. A server can never see them. A device sees all of them. |
| Personalise the chosen template into a Journey | **No** | Already on-device (`Planner`/`AdaptivePlanner`). Unchanged. |

**Recommendation: hybrid.** The server publishes a **Match Manifest** — the corpus plus, per cohort
cell, the conditional ranking with support counts. The device computes its own cell locally, reads the
ranking, re-ranks with the local profile (§5.4), and picks. **Nothing about the user is sent in order to
receive a recommendation.** This is the product analogue of the pattern Google and Apple settled on for
on-device suggestions: aggregate centrally, personalise on device
([Gboard federated learning](https://arxiv.org/pdf/2305.18465)).

Why not the Spotify shape: our items *are* describable, so cohort-conditioned aggregates suffice and no
user × item matrix is needed; our catalogue is hundreds of templates, not a hundred million tracks, so
there is no long tail for CF to rescue; and the payoff asymmetry runs the other way (§12.5). Most
importantly, it is what makes an honest opt-in affordable: **declining costs the user nothing**, because
matching is local. Under the Spotify shape, opting out would mean opting out of recommendations, and the
consent would be coerced in substance.

**The one trap.** If the device fetches only its own domain's slice of the manifest to save bandwidth,
**the request discloses the user's domain through ordinary request logs** — undoing much of §11, since
`domain` is the most sensitive field. Requirement: fetch **whole**, from an unauthenticated CDN URL
identical for every user, no query parameters, no auth header. If size ever forces slicing, slice by
version or shard, **never by domain**. Estimated size is kilobytes to low megabytes, so the trade does
not arise today.

### 12.2 Small categorical vectors are far more identifying than they look

The section-B cell key now has nine dimensions and on the order of tens of thousands of cells. With a
few thousand users **most cells hold zero or one record: at small N, a "cohort" is a person.** Same
arithmetic as Sweeney's 87%.

Mandatory mitigations:

1. **A server-side k-anonymity gate.** Arriving records land in quarantine. A record is admitted to the
   learning corpus only when its cell holds at least **k** records from at least **k** distinct
   `instanceId`s. **Recommended: a floor of k ≥ 20, with k = 50 as the target as we grow** (Open
   Question 5). *An earlier draft of this PRD proposed 25 on judgement alone; the companion research
   supplies the evidence base and the reconciled numbers are its — re-identification risk flattens out
   around k ≈ 20 in the published analyses, and Google adopted k = 50 for Privacy Sandbox cohorts.*
   Below the floor, the record **degrades to the parent bucket** by the §7.4 ladder and is re-tested;
   if even domain-only fails the floor it is **discarded, not stored**. Nothing below k is queryable,
   displayable or exportable — including to a third-party author (§9.5).
2. **At most one code per multi-select question.** The `obstacles` and `motivation` questions are
   multi-select; three-of-six checkboxes is one of 41 possibilities and close to a fingerprint in
   combination. One code costs a little learning power and removes a large uniqueness contribution.
3. **`dominantLever` is a mode, never a distribution.** A lever *distribution* would be a behavioural
   fingerprint of how a specific person fails. The mode is one of eight values.

### 12.3 Can a record be linked back to a person?

| Adversary | Can they? | What protects us |
|---|---|---|
| **Us, with our own database** | **No, by construction.** No uid, no timestamp finer than a quarter, no locale, no demographic, no ingestion metadata. The only link that ever existed is the on-device `instanceId → journeyId` map, which we have never seen. | The absence of the data, not a policy. Policies change; a field never collected cannot be queried. |
| **An attacker with the whole database** | Not to a name. But they read "someone, ambitious, addiction domain, dropped at Milestone 2, said it did not help". Unattributed, the *content* is still sensitive, and a rare template used by three people that quarter tells someone who knows one of them a great deal. | The k-gate, and the domain restriction (Open Question 3). |
| **An attacker with the database plus outside data** | **The real risk.** The natural join key is time. A `created_at` column, a retained client IP, or sequential row ids let a known Journey-end date or a network log align against the corpus. | §11.5's randomised batched upload; **no row-level ingestion timestamp**; **no client IP retention**; **random primary keys, not sequences**; physical separation from the social backend (§12.4). |
| **A subpoena, or an insider** | Yes, to whatever we hold. No technical answer exists. | **Hold less.** This is the entire justification for §11.2's strictness. |

**The template id is itself a quasi-identifier.** A template used by twelve people is nearly as
identifying as a demographic, so the k-gate applies to `templateId` as well as to the cell. A newly
published template is therefore silent for a while. That is correct and must not be "fixed".

### 12.4 What encryption does and does not buy

The founder asked that we "encrypt the information properly". Right, and it must not be mistaken for the
protection. TLS covers transit; at-rest encryption covers a stolen disk. **Neither protects the data
from us, our cloud provider, or a lawful demand, because we hold the keys** — the same honest point
`Encryption_Design.md` §1.2 makes about the on-device scheme. **The only real protection for a corpus we
operate is that it is minimal and unlinkable.** Encryption is a necessary layer on top of that, never a
substitute.

Two structural requirements carry most of the real security:

- **Physical separation from the social backend.** No shared database, schema, credential, connection
  pool, foreign key or row-id space with `profiles` / `friendships` / `progress_snapshots`. **No write
  inside an authenticated session, ever** — a write inside an authenticated session is a join, whether
  or not anyone intended it.
- **A separate, narrower retention rule**, so sub-k records expire on a fixed schedule instead of
  waiting indefinitely for a cell to fill.

### 12.5 The sensitivity asymmetry, which is why the allowlist is stricter than Spotify's, not looser

Spotify's worst case is a leaked listening history. Ours is a leaked record of **what people are trying
to change about their lives**, in a product whose four domains (D24) include **addiction** and
**relationships and loneliness** — and, now, whether they said it helped.

Not rhetoric; a regulatory fact pattern. The FTC banned BetterHelp from sharing consumers' health data
for advertising and required $7.8M, treating app-collected mental-health questionnaire data as sensitive
health information, and proposed a $7M settlement against Cerebral on comparable facts
([FTC](https://www.ftc.gov/legal-library/browse/cases-proceedings/2023169-betterhelp-inc-matter)). Under
GDPR, health data is an Art. 9 special category, and pseudonymised data remains personal data where
re-identification is reasonably possible (Recital 26). *"Addiction domain, ambitious, dropped at
Milestone 2"* is arguably health data with no name attached.

---

## 13. What the user is told

Today the honest statement is "nothing about you leaves this device except what you deliberately share
with a friend". After this it becomes "nothing about you leaves this device; a small anonymous note
about how a Journey performed does". Small in substance, large in trust, and it must be disclosed as
though it were large.

### 13.1 Three surfaces

1. **At the moment it first becomes true** — when a Journey is first created from a library template.
   One short paragraph and an explicit choice. Not at install, where nobody reads. Not inside
   onboarding, where every screen is a tap-through.
2. **A permanent Settings page, "What we learn from"**, listing every field in plain language and —
   the part that makes it credible rather than performative — **showing this device's actual pending
   records with their real values**. A user should be able to read the exact tuple before it is sent.
3. **The privacy policy**, which does not exist yet and is an independent release blocker.

### 13.2 Consent

**Recommendation: opt-in, default off** (Open Question 4). Because at least two domains are
health-adjacent and Art. 9 requires explicit consent; because "legitimate interest" for shipping
behavioural outcome data off-device is contestable and this is not where to spend a first regulatory
encounter; because Apple's privacy label and Google Play's Data safety form require declaring it anyway
(§14.2), so nothing is saved by making it a default; and above all because §12.1 makes an honest opt-in
**cheap** — declining costs the user nothing at all.

**The trade, plainly:** opt-in participation is a fraction of opt-out participation. With a k-floor of
20 and a rotating condition slot, that directly delays the point at which any cell produces usable
signal, possibly by a year or more. The
founder should decide knowing that cost, which is why it is an open question and not a settled
recommendation.

### 13.3 Copy intent

Final wording to content-writer, English and Hebrew, human tone, no em-dashes, no scare language.

> **Helping the next person**
>
> When a Journey ends, we can send a short anonymous note about how it went. Something like: this kind of
> Journey, for someone starting where you started, got two thirds of the way and was rated helpful.
>
> It never includes your goal, anything you wrote, your name, your age, or where you live. You can read
> the exact list any time in Settings.
>
> Saying no changes nothing about your Journeys or your app. It only means we learn a little slower.
>
> [Yes, send it] [No thanks]

Three properties: it is true, it says what is *not* included before the user has to ask, and the "no" is
not punished.

### 13.4 Turning it off, and what we can honestly promise

Turning it off stops all future sends and issues deletes for every `instanceId` still in the local map.
What we **cannot** promise, and must not imply, is retrieval after account deletion: once the map is
gone the rows are genuinely unlinkable. Say so directly. That is the privacy design working, and people
understand it when it is explained rather than discovered.

---

## 14. Required reviews before any implementation

Neither is advisory. Nothing in §§11–13 may be built before both have signed off in writing.

### 14.1 security-privacy must approve

1. The §11.2 field list **and its negative space in §11.3**, field by field, with a written
   re-identification assessment at the realistic corpus size — specifically including the **four-field
   cap and the rotating condition slot** (§11.2.1), the claim that per-instance random slot assignment
   does not itself leak, and the §11.2.2 claim that section-C additions do not affect cell sparsity.
2. The confirmation that the `lever` condition value as a **mode** is acceptable where a distribution
   would not be, and that no reason count, sequence or note can reach it.
3. The identity model (§11.4 option C), the on-device `instanceId → journeyId` map, and its behaviour
   under export and account deletion.
4. The k-threshold and the quarantine → generalise → discard behaviour (§12.2), including retention for
   records that never reach k.
5. Physical separation from the social backend (§12.4): no shared database, schema, credential, pool,
   foreign key or row-id space; random primary keys; **no write inside an authenticated session**.
6. No row-level ingestion timestamp; no client IP retention; the randomised batched upload (§11.5).
7. The manifest fetch (§12.1): unauthenticated, identical URL, **no domain-based slicing**.
8. The end-of-Journey **free-text** answer remaining on-device-only, with no path by which it can reach
   a record, a log line, or an analytics payload (§6.3, §11.3).
9. Transport and at-rest configuration, plus an explicit written statement of what encryption does
   **not** protect against here (§12.4), so nobody later mistakes it for the guarantee.
10. A type-level chokepoint: `deriveJourneyOutcomeRecord` the only producer, `JourneyLearningGateway`
    the only consumer, `NullJourneyLearningGateway` the default, and a test that fails if any other call
    site constructs the type.
11. Confirmation that no red line in `Sync_Manifest.md` §4 is weakened, moved or reinterpreted, and
    specifically that the on-device `UserProfile` (§5.4) has no sync path.

### 14.2 store-compliance must approve

1. **Apple:** Privacy Nutrition Label entries and `PrivacyInfo.xcprivacy` — which data types are
   declared, "linked to you" vs "not linked to you" (we claim not-linked; the claim must be defensible
   against §12), and purpose. Confirmation that this is **not** ATT tracking given no cross-app linkage
   and no advertising use, with "never for advertising, never shared with third parties" written into
   the policy rather than assumed.
2. **Google Play:** Data safety form entries, and whether including `body_image` triggers the Health
   apps declaration.
3. The **privacy policy text**, which does not exist and is a hard prerequisite.
4. A **GDPR Art. 9 assessment** and the stated lawful basis per participating domain, plus a DPIA if any
   health-adjacent domain is included.
5. Whether the **end-of-Journey rating** constitutes user-generated content or a review for store
   purposes, and whether the marketplace seam (§9) changes that answer later.
6. Age gating. If under-16 users are in scope, §13.2's consent model changes and may be unavailable.
7. Reconciliation with `Backfill/Account_Deletion_and_Data_Export_PRD.md`, including §13.4's honest
   limit.

---

## 15. Sequencing

Arranged so that **all the immediate product value lands before any privacy posture changes at all.**

| Stage | What | Depends on | Privacy change |
|---|---|---|---|
| **0 — now** | **Use the profile we already collect.** Wire `reasonLog` → lever distribution → plan shape; wire the dormant `CommunicationStyle` into coach and notification copy; read the `motivation`/`foundation` answers in `buildStructure`. No library needed. | Nothing. | **None.** |
| **1 — now** | **Turn the fixed arcs into a local library.** Extract each expert's `MILESTONES`/`STEP_TITLES` into versioned Journey Templates (each becomes template #1 for its domain, preserved), ingest the partner's Golden Journeys, add variants per goal, and give `buildStructure` a **local matcher**. Ships as app content. | Stage 0; Open Question 6 (naming). | **None.** |
| **2 — now** | **The feedback moment and local outcome capture.** The three hosts (§6.4) via a `Completion_Celebration_02_PRD.md` continuation; `deriveJourneyOutcomeRecord` as a pure function; `NullJourneyLearningGateway`; records written to a local outbox and shown in a debug screen. **Nothing is transmitted.** Proves the shape and lets QA verify the allowlist before a wire exists. | Stages 0–1; the continuation PRD. | **None.** |
| **3 — needs backend + legal** | The outbound record: opt-in consent, the Settings disclosure page, delayed batched upload, separate store, k-gate. Plus the Match Manifest served remotely (editorial ranking). | Privacy policy; §14.1 and §14.2 sign-off; Open Questions 1–5. | **This is the change.** Gated. |
| **4 — Commercial** | Conditional fitness discovery (§7.2) published in the manifest. The loop closes. | Stage 3 plus enough admitted records to clear k in real cells. | None beyond Stage 3. |

**Stages 0–2 are the recommendation for what to do now, and none of them is a compromise.** They fix the
protein-shake failure, they make "the plan didn't help me" a *measured* fact instead of a chat message,
and they need no backend, no policy, no consent and no review beyond product-guardian.

**The honest arithmetic in Stage 4:** with opt-in consent, a k-floor of 20, and a rotating condition slot
that samples each candidate on about one record in eight, meaningful conditional signal needs on the
order of thousands of participating users — and interaction effects (§7.5) need more than main effects
do. Expect the learning loop to be a second-year capability at the earliest. **The library is valuable
long before the learning is**, and nothing about that expectation should delay Stage 0 by a day.

---

## 16. Success metrics and instrumentation

### 16.1 Signals

| Stage | Does it work? |
|---|---|
| **0** | Two users with the same domain but different lever distributions receive **materially different** plan shapes. Measured as the share of Journeys whose shape differs from the domain default. |
| **1** | The name-swap test passes. Share of created Journeys matched to a non-default template; share whose Steps reference the user's actual goal; falling `structureEditedByUser`. |
| **2** | **Feedback response rate at each of the three hosts**, tracked separately. If the cancellation and quiet-end hosts respond far below completion, the dataset is biased and §6.4 has not actually been solved. |
| **3** | Consent take-up, and more revealingly, the rate at which people open "What we learn from" and **stay** opted in. A page that drives opt-outs means the copy or the field list is wrong. |
| **4** | Do cells with a learned conditional ranking beat cells on editorial ordering, **on `didItHelp`** and not on completion? And does **interruptions per helped Journey** fall over time? |

### 16.2 Events to instrument (implementer to wire, qa-engineer to verify)

**Stages 0–2, entirely local:**

- `profile_lever_distribution_computed` — modal lever, sample size
- `plan_shaped_by_profile` — which faculty changed the plan, and how
- `journey_template_matched` — `templateId`, `templateVersion`, `domain`, score, candidate count
- `journey_template_fallback` — no template cleared the threshold and the generic arc was used.
  **The most important event in Stage 1**: it measures the size of the remaining gap.
- `journey_structure_edited_after_creation`
- `journey_feedback_prompted` / `journey_feedback_submitted` / `journey_feedback_dismissed` — each with
  `feedbackHost`, so §6.4's bias is visible from day one
- `journey_outcome_recorded` — written to the outbox, whether or not sending is enabled

**Stage 3, gated on consent:**

- `learning_consent_shown` / `_granted` / `_declined` / `_withdrawn`
- `learning_disclosure_opened`
- `outcome_batch_uploaded` — batch size only, never contents
- `outcome_delete_requested`

**Interruption accounting (§8), local:**

- `interruption_sent` — kind and Journey, never content
- `action_after_interruption` — the attributable action
- `interruption_budget_lowered` / `interruption_budget_ceiling_hit` — the second must be rare and is an
  alarm, not a metric to improve
- `reminders_disabled_by_user` / `notification_permission_revoked` — the §8.2 harm constraint

**Server-side, learning store only:** `record_quarantined` · `record_generalised` ·
`record_discarded_below_k` · `cell_admitted` · `condition_proposed` · `condition_confirmed_on_holdout`
· `condition_failed_holdout` (this one must be *reported*, not silently dropped — a high failure rate
means §7.3's gates are finding noise and the discovery pass needs tightening).

**The drift detector (§8.4.1), which is not optional:** `recommended_journey_shape` — median Step
difficulty and median weekly minutes of what the matcher recommends, sampled per period. It goes on the
same dashboard as the primary metric. A sustained downward trend while retention rises stops the loop.

**The first hypothesis test.** §5.3 flags reason→lever matching (`dominantLever`) as our most attractive
*untested* idea, whose closest analogue in the literature was tested and failed. It should be the first
thing we ever A/B, and the events above already carry what that needs: `plan_shaped_by_profile` records
whether the lever changed the plan, and the §16.1 Stage-0 signal measures whether it changed anything
that mattered. Wire it so the hypothesis can be *disconfirmed* cheaply, and treat a null result as a
finding rather than a failure.

The companion research's §10 has its own event table (`plan_matched`, `capacity_calibration`,
`restart_after_miss`, and others) covering the *matching-quality* side. It is not restated here.
**`capacity_calibration` is the one it singles out to wire first**, because it replaces the invented
60–70% first-week discount with a measured constant after roughly a hundred users. Nothing in this PRD
competes with that ordering.

No event here may carry a goal title, a Step title, free text, or a user identifier. **An analytics
pipeline is a sync path with a friendlier name**, and the §11.3 allowlist governs it identically.

---

## 17. Open questions — the founder's, not ours

**Blocking Stage 3:**

1. **What counts as "it worked"?** §8 gives the structure — constrained optimisation, `didItHelp`
   primary, interruptions-per-helped-Journey second, harm as a hard constraint — but the exact weights,
   the attribution window for "action after interruption", and the half-weight for `partly` are product
   calls. The structure is the important part and I believe §8 has it right; the parameters are yours.
2. **Is the interruption ceiling (§8.4) a fixed global number, a per-style number, or user-settable?**
   Recommendation: a global ceiling the loop may only lower, plus a user-facing "fewer messages" control
   that lowers it further and can never raise it.
3. **Which domains participate in the outbound record at v1?** Recommendation: `career` and `general`
   only. `addiction` and `relationships` require expert review before release regardless (D24/D53);
   `body_image` pulls in the Play Health
   declaration and a probable Art. 9 analysis.
4. **Opt-in or opt-out?** Recommendation: opt-in, default off, accepting a materially slower corpus.
5. **The k threshold.** Recommendation: a floor of **k ≥ 20**, targeting **50** as we grow (§12.2). A
   product trade between learning speed and safety, not an engineering constant.

**Blocking Stage 1:**

6. **Terminology ratification: "Journey Template" and "Journey Library".** product-guardian's call,
   given that `Repository_Guidelines.md` bars "Plan" as a Journey synonym and the founder's own words
   are "Journey library". It names files and types, so it is needed early.

**Not blocking, but wanted:**

7. **Do we ever want cross-Journey longitudinal learning?** That is §11.4 option (A) under another name
   and needs its own decision, review and consent. Deciding now only affects whether we deliberately
   keep the schema door open. Recommendation: keep it closed and reopen explicitly if the need is shown.
8. **Who authors the library, and at what rate?** Layer 2 is only as good as its corpus, and "several
   Journeys per goal" is a content commitment before it is an engineering one. This is the largest
   unpriced cost in the document.
9. **Hosting and cost.** Must go through **cost-guardian** before anything is provisioned (CLAUDE.md
   §3.10). Not yet estimated.
10. **Partner content terms.** Do the partner's authored Journeys carry attribution, licensing or
    exclusivity terms constraining redistribution, derived templates, or use of their outcome data?
    Needs an answer before Stage 3 ships their content to devices, and it interacts with §9.
11. **Content-safety escalation.** If a template is found harmful for a cohort, who pulls it and how
    fast? §8.6 says editorial override outranks the score; it does not say who holds the pen.

### 17.1 Overlap with the companion research's questions — one list, not two

`User_Matching_Parameters_Research_2026-08-17.md` §13 asks six questions of its own. Three are the same
decision seen from the other side and should be answered once:

| Research question | Here | Note |
|---|---|---|
| Its Q1 — is the composite target metric right? | **Q1 above** | Its proposal (still going at day 14 **and** one Milestone completed **and** not shrunk twice) is a *matching-quality* metric; §8's is a *template-quality* metric. They are compatible and both are needed: the first judges the match, the second judges the content. Answer them together so the two do not drift apart. |
| Its Q2 — does an outbound loop exist in the POC at all? | **§15 Stage 3** | Its recommendation is **no**, and this PRD agrees: the loop is Stage 3–4, gated on a privacy policy that does not exist. Nothing in Stages 0–2 depends on the answer. |
| Its Q3 — sensitive domains excluded from the loop? | **Q3 above** | Same question. Its §11 adds the reasoning this PRD adopts, including the no-sentinel rule (§11.2.1). |

Its remaining three (reframing onboarding Q3 as a per-Journey prior-attempt question; full birth date
vs. month + year; which hypothesis to test first) are **parameter and onboarding decisions, not
architecture decisions**, and stay in that document rather than being restated here. They should be
answered — the birth-date one is a free privacy reduction — but they do not block anything in this PRD.

---

## 18. Standard edge-case checklist

| Case | Behaviour |
|---|---|
| **First run / empty library** | The generic arc is the permanent fallback. A missing or unfetchable manifest is never a user-visible error. |
| **Offline** | Matching is local, so Journey creation works fully offline against the cached manifest. Records queue in the outbox indefinitely. |
| **Consent denied** | Full product, full matching, full feedback prompts (the label is still useful locally). Nothing queued, nothing sent. |
| **Feedback skipped** | `didItHelp: null`. **Not a "no"** (§6.3). A template with many nulls has a *response* problem, which is different from a quality problem and must not be scored as one. |
| **Journey cancelled (D46)** | Terminal record with `outcome: 'cancelled'`, feedback asked gently *after* the cancellation completes, `feedbackHost: 'cancellation'`. Cancellation is a result, not a gap. |
| **Journey frozen / inactivity freeze (J5)** | No record at the freeze. `replanCount` on the terminal record carries the signal (D51 fourth pass). A frozen Journey that never resumes becomes `quiet_end`. |
| **Journey deleted** | `instanceId` removed from the local map; deletes issued for any uploaded rows. |
| **Account deleted** | The map is destroyed; uploaded rows are unlinkable and remain. Disclosed in §13.4. |
| **Template withdrawn after a user started it** | The running Journey is untouched. A Journey already begun is the user's; the corpus changing beneath it must never alter it. |
| **Manifest version skew** | The device pins the `templateVersion` it instantiated and reports that one, never the current one. |
| **Very long / empty goal input** | A Stage-1 matching concern only. Never reaches a record: goal text is barred (§11.3). |
| **RTL / language** | Templates carry translations like all `coachContent`. **Language is barred from the record** even though it would be useful, because it is a quasi-identifier. |
| **Clock change / device date manipulation** | `cohortPeriod` is quarter-granular and `breakWeek` is a relative index; both degrade harmlessly. |
| **Concurrent Journeys from one template** | Distinct `instanceId`s; two independent records, never deduplicated. |
| **A user rates every Journey 1** | Their records are individually valid. The k-gate plus per-instance pseudonymity means no single person can dominate a cell, and rate limits cover the rest. |

---

## 19. Categorization

- **Approved (D52):** the three-layer architecture as the essence of the product; that the Journey
  Library is our content and several Journeys exist per goal; that the quality signal is persistence,
  drop-off stage, completion and end-of-Journey feedback; that matching is conditional on user
  attributes and discovered from outcomes; that a minimal, non-personal outcome record may leave the
  device; that all raw profile material and the derived profile stay on device.
- **Recommended, awaiting founder confirmation:** the §11.2 allowlist; per-instance pseudonymity;
  hybrid learn-centrally/match-locally; the §8 constrained objective and the §8.4 ceiling rule; opt-in
  consent; `career` + `general` at v1; a k-floor of 20 targeting 50; the three feedback hosts and the
  continuation PRD that owns them.
- **Open Question:** all of §17. None may be treated as decided.
- **Future Vision, designed against but not designed:** the coach marketplace (§9).
- **Not approved for implementation:** all of §§11–13. Stages 0–2 (§15) are implementable once Open
  Question 6 is answered; they change no privacy posture and need no review beyond product-guardian.
