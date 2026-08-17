# Research — User Matching Parameters

**Question this document answers:** *By which parameters should we categorise a user, so we can match
the right Journey to them?*

**Date:** 2026-08-17 · **Author:** product-manager · **Status:** Research recommendation.
**Nothing here is Approved.** Every recommendation is a proposal for the founder; every hypothesis is
labelled as one. Companion document (written in parallel, owns the outbound contract):
`04_Product/PRD/Plan_Library_and_Learning_PRD.md`. This document owns only the *parameters*.

**Terminology note (read first).** Our user-facing object is a **Journey**. "Plan" in this document
means only the *internal engineering structure* the code already calls a plan (`Planner`,
`PlanConstraints`, `PlanStructure` — the Milestone arc plus Step templates before scheduling). We
never call a Journey a "plan" in user-facing copy. Where the founder's question says "match the right
plans", read: *choose the right Journey structure for this person*.

---

## 1. Executive answer

**The strongest matching parameters are things the user has already done inside the app, not things
they told us about themselves.** Every one of the top five is derived from behaviour, already exists
on device today, costs the user nothing to provide, and is non-identifying. The stated answers we
already collect at onboarding are worth keeping — but as a **cold-start prior with a short half-life**,
not as the model.

Demographics do not make the list. Age, gender and country are weak predictors of whether a Journey
will work and are the strongest re-identifiers we hold. That combination is the worst possible one for
this purpose. We already collect all three for other, legitimate reasons (grammar, week start,
language) — the recommendation is that **none of them ever enters the matching vector**.

Ranked shortlist (full detail in §7):

| # | Parameter | Have it? | Predictive | Privacy cost |
|---|-----------|----------|-----------|--------------|
| A1 | Revealed adherence (trailing 14 days) | Yes | High | P0 |
| A2 | Revealed capacity vs stated capacity | Partly | High | P0 |
| A3 | Restart-after-miss behaviour | Derivable, not computed | Medium-high (hypothesis) | P0 |
| A4 | Dominant friction reason | Yes | Medium (hypothesis) | P0 |
| A5 | Revealed daypart / weekday pattern | Yes | Medium | P0 |
| B1 | Goal domain | Yes | High | P0–**P2** (see §11) |
| B2 | Self-rated baseline level in this goal | Yes | Medium | P0 |
| B3 | Stated capacity + schedule variability | Yes | Medium (biased — §3.6) | P0 |
| B4 | Prior-attempt history *for this goal* | Partly — needs reframing, not a new question | Medium | P1 |
| B5 | Concurrent Journey load | Yes | Medium (hypothesis) | P0 |

Everything in tier A is behavioural. Everything in tier B is a stated prior used only until tier A
exists. Communication style, Active Hours and language are **delivery** parameters, not matching
parameters — §7.3 explains why keeping that line clean matters.

**One new question is worth asking, and it is not new.** Onboarding Q3 already asks about the user's
starting point at the *account* level, including "I've tried before but wasn't consistent". Asked again
at the *Journey* level, where the goal is concrete, that same question becomes B4 — the one stated
parameter with a real evidence base behind it (§3.5). This is a reframe of an existing question, not an
addition to the six.

---

## 2. The scoring rule: two axes, and a parameter must earn both

Every candidate below was judged on two axes at once.

**Axis 1 — does it predict?** Not "is it interesting", but: *does knowing this change which Journey
structure we should build, and is there evidence the change helps?* A parameter that correlates with
outcomes but does not map to a lever we can pull is a research finding, not a product parameter. The
discipline here is the one the onboarding-design literature states plainly: *every question should
change a later screen through a recommendation, a branch, or a copy change; if you cannot name the
screen an answer affects, cut the question*
([Adapty](https://adapty.io/blog/how-to-personalize-onboarding-and-paywalls-in-your-mobile-app/)).

Our levers are concrete and already in the code: which `DomainExpert` runs · the Milestone arc and
whether it is staged at all (`usesMilestones`) · Step `difficulty` 1–5 · `estimatedMinutes` ·
`rhythm` · `durationDays` · weekly load · `preferredDays` / `daypart` · reminder intensity · whether a
Support Circle is offered. A parameter that moves none of these is out.

**Axis 2 — what does it cost in privacy?** Three levels, used throughout:

- **P0** — non-identifying, non-sensitive: a coarse bucket about in-app behaviour that means nothing
  outside our own product (e.g. "completed 3 of 5 planned Steps last fortnight").
- **P1** — a quasi-identifier: coarse on its own, but combines with other coarse fields to single a
  person out. Age band, country, gender, an unusual goal category.
- **P2** — sensitive / special-category: reveals or implies health status, addiction, mental health,
  body image, sexuality. Under GDPR Article 9, **inference is enough** — if our processing intends to
  make an inference linked to a special category, we are processing special-category data regardless of
  how confident we are that the inference is correct, and any profiling that infers health status
  counts ([ICO — What is special category data?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/);
  [Art. 9 GDPR](https://gdpr-info.eu/art-9-gdpr/)).

**The rule this produces:** only P0 leaves the device. P1 leaves only bucketed, only inside a cohort
that meets the size floor in §9, and only if it earns its place on axis 1 — which, as it turns out,
none of our P1 candidates do. P2 never leaves, ever, and is gated even on device.

This mirrors the boundary the code already enforces: `RawBehaviorRecord` and `InsightModel` stay on
device forever; `OutreachInsight` is the single whitelisted projection, produced at one chokepoint
(`deriveOutreachInsight`). The matching vector should ride the same architecture, not invent a second
one.

---

## 3. What the behaviour-change evidence actually supports

### 3.1 Past behaviour beats stated intention — by a lot

The most robust finding relevant to us is the **intention–behaviour gap**. A meta-analysis of
experiments that *manipulated* intention found that a medium-to-large change in intention produced only
a small-to-medium change in behaviour (d+ = .36); "inclined abstainers" — people who intend to change
and don't — account for most of the gap
([Sheeran & Webb, 2016](https://compass.onlinelibrary.wiley.com/doi/abs/10.1111/spc3.12265);
[full text](https://content.workplacegivingaustralia.org.au/app/uploads/2020/10/Intention-Behaviour-Gap-Full-Article-SheeranWebb2016.pdf)).

**What this means for us:** an onboarding answer is a statement of intention. It is a legitimate prior
and a terrible model. Behaviour observed inside the app is not a nice-to-have refinement of the
questionnaire — it is a categorically better class of signal.

### 3.2 Early behaviour predicts persistence, and one week is enough

In digital health, first-week engagement alone predicts early dropout. A replication across four
digital tobacco-cessation interventions built dropout models from **log-in counts in the first seven
days**, reaching AUC ≈ 0.72 — using nothing but simple, automated, already-available counts
([Predicting Early Dropout in a Digital Tobacco Cessation Intervention](https://pmc.ncbi.nlm.nih.gov/articles/PMC11635322/);
[Can a Single Variable Predict Early Dropout?](https://pmc.ncbi.nlm.nih.gov/articles/PMC9898835/)).

**What this means for us:** the first 7–14 days are not a waiting period before we know anything. They
are the single most informative window we will ever have, and we already record every event in it. AUC
0.72 is a modest model, not a crystal ball — but it beats any questionnaire we could design, and it is
free.

### 3.3 Baseline level moderates; readiness stage does not

**Baseline level does moderate.** Across intervention literatures, where a person starts consistently
predicts how much a given intervention moves them — e.g. baseline severity is consistently associated
with greater intervention effect in child behaviour treatment
([Predictors, Moderators, and Treatment Parameters](https://pmc.ncbi.nlm.nih.gov/articles/PMC4349495/)).
The product analogue is Duolingo's beginner-vs-placement fork, already noted in our own
`05_Research/Signup_and_First_Run_Competitive_Research.md` §Duolingo.

**Readiness stage does not — and this is the most useful negative finding in this report.** The
Transtheoretical Model's stages of change are the most obvious thing to build a matching engine on, and
the evidence does not support it. Systematic reviews concluded the evidence "does not support the use
of stage-based interventions"; the Cochrane review of stage-based smoking cessation found no consistent
advantage over generic interventions; a Cochrane review of TTM for weight found little evidence of
effectiveness; and the stage-assignment algorithms themselves were never standardised or validated
([Adams & White critique, with commentaries](https://www.researchgate.net/publication/8113005_The_Transtheoretical_Model_and_stages_of_change_a_critique_Observations_by_five_Commentators_on_the_paper_by_Adams_J_and_White_M_2004_Why_don't_stage-based_activity_promotion_interventions_work);
[Stages of Change Theory — StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK556005/)).
Stage-matched interventions can work; they do not beat well-designed unmatched ones.

**Recommendation: do not build a readiness-stage classifier.** If a future proposal asks for one, this
paragraph is the answer.

### 3.4 Motivation quality predicts outcomes, but barely predicts *which* plan to give

Self-Determination Theory is well supported on the outcome side. A meta-analysis of 73 SDT-informed
health interventions found that increases in need support and **autonomous** motivation — but not
controlled motivation or amotivation — were associated with positive changes in health behaviour
([Ntoumanis et al., 2021, Health Psychology Review](https://www.tandfonline.com/doi/full/10.1080/17437199.2020.1718529)).

But the same literature reports **little evidence of moderation by individual differences** — autonomous
motivation's benefits look fairly universal across populations
([Autonomous and controlled motivational regulations across behaviours](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4346087/)).

**The honest distinction:** motivation quality is a **prognostic** marker (a controlled-motivation user
is more likely to fade, so expect to need more support) rather than a **matching** parameter (there is
no evidenced "plan type X for extrinsically motivated people"). We should record it and use it to
choose *how much scaffolding* to offer — not to fork the plan structure. And the design implication
that *is* well supported is not about segmentation at all: build autonomy support into the product for
everyone. Our "why" capture and user-approves-everything model already do this.

### 3.5 Prior attempts predict — with a twist

Both the **number** and especially the **duration** of previous attempts predict subsequent success.
People whose past attempts lasted longer than a few days are substantially more likely to succeed;
recency and number of prior attempts independently raise the odds of a future attempt
([Common predictors of smoking cessation in clinical practice](https://www.sciencedirect.com/science/article/pii/S0954611108000930);
[If at first you don't succeed, when should you try again?](https://pmc.ncbi.nlm.nih.gov/articles/PMC7163297/)).

The twist, and it matters: recent attempts predict *trying again* but also predict *relapsing again*.
So "has tried before" is not a simple positivity signal — it means **this person will start, and the
risk is concentrated at the point where it previously broke**. That is directly actionable: build the
first Milestone around the thing that broke last time rather than around a generic warm-up.

Evidence caveat: this literature is overwhelmingly smoking cessation. Transfer to career, learning or
relationship goals is an assumption, not a finding.

### 3.6 Stated capacity is systematically optimistic

The planning fallacy is one of the most replicated findings in judgement research: people
underestimate how long things take and overestimate what they will fit in, and do so even while holding
accurate beliefs about how long similar things took them before
([Planning fallacy — overview](https://thedecisionlab.com/biases/planning-fallacy);
[Kahneman & Tversky lineage summary](https://en.wikipedia.org/wiki/Planning_fallacy)).

**What this means for us:** Q6 ("How much room do you realistically have?") and each expert's `time`
question are useful — but the number they yield is biased upward, and the bias is in a knowable
direction. That converts a weakness into a design rule (§8).

### 3.7 If-then plans work — but only on top of existing commitment

Implementation intentions ("when X, I will do Y") carry a large meta-analytic effect (d ≈ 0.65 across
94 tests), and they work **better when the person already holds a strong goal intention**; they amplify
motivation rather than substitute for it. They also work better for *initiating* behaviours than for
suppressing them ([Gollwitzer & Sheeran, 2006](https://www.researchgate.net/publication/37367696_Implementation_Intentions_and_Goal_Achievement_A_Meta-Analysis_of_Effects_and_Processes);
[Gollwitzer chapter, NCI](https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf)).

**This is a real matching rule, with real evidence behind it:** a highly committed user should get
precisely scheduled Steps (fixed day, fixed daypart, concrete trigger). A low-commitment user should
*not* be handed a rigid schedule — for them a dense timetable manufactures misses. What we should not
do is *ask* how committed they are; §7.2 explains the revealed proxy.

### 3.8 One miss is not the failure. Not restarting is.

Lally et al. tracked 96 people forming a daily habit over 12 weeks. Median time to reach 95% of
automaticity was **66 days, range 18–254** — enormous individual variation. And critically: **missing
one opportunity did not materially affect the habit-formation process**
([Lally et al., 2010, EJSP](https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674);
[BPS summary](https://www.bps.org.uk/research-digest/how-form-habit)).

Two consequences. First, the 18–254 day range says a fixed `durationDays` default cannot be right for
everyone — the plan length itself is a matching output. Second, **the thing worth measuring is not the
miss, it is the return.** That is parameter A3, and it is one nobody in our competitive set appears to
measure.

### 3.9 Personality predicts — and we should still not collect it

Conscientiousness is a genuine predictor of adherence, and a better one than grit (which is largely a
facet of conscientiousness and adds little beyond it)
([I follow through: conscientiousness is associated with adherence](https://pmc.ncbi.nlm.nih.gov/articles/PMC11693223/);
[Beyond passion and perseverance: the science of grit](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.545526/full)).

This is the clearest case in the report of a parameter that **predicts well and should still be
refused**. Reasons, in order of weight: (1) revealed adherence measures the same construct directly,
from behaviour, for free; (2) a trait inventory is a long questionnaire for a signal we get in a
fortnight anyway; (3) a stable trait label invites fatalistic matching — "this person is low
conscientiousness, give them the easy Journey" is precisely the self-fulfilling categorisation our
onboarding PRD already forbids ("hypothesis-shaped, never a personality label", `Onboarding_Questionnaire_PRD.md`
§9); and (4) storing a personality profile is a meaningful privacy escalation for zero incremental
predictive value.

---

## 4. What comparable products segment on — and what is theatre

Our repo already holds a first-run competitive study
(`05_Research/Signup_and_First_Run_Competitive_Research.md`) covering Finch, Fabulous, Headspace, Calm,
Duolingo, Strava, Noom, Wysa and Fitbit's AI Coach. This section adds only the *matching* angle and
does not restate it.

**Noom is the most-copied model and the one to be most careful about.** Noom runs a ~10-minute intake:
goals, lifestyle, experience, obstacles, plus a ten-item "behavioural profile" slider quiz with items
such as "I struggle to relax, even with a lot of spare time." Public teardowns describe the purpose
candidly: segmentation data collected up front, enabling tailored messaging, pricing experiments and
higher early-stage conversion
([RevenueCat teardown of Noom's web-to-app funnel](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel);
[The Behavioral Scientist — Noom onboarding critique](https://www.thebehavioralscientist.com/articles/noom-product-critique-onboarding)).

**Inference, clearly labelled as inference:** much of that intake is doing commercial work, not planning
work. A long quiz raises conversion through effort justification and through the felt sense of being
understood — both of which are real effects that occur *whether or not the answers change the program*.
I could not find evidence that Noom's slider profile changes the actual curriculum. Treat the
conversion benefit as established and the matching benefit as unevidenced.

**MyFitnessPal is the honest version of the same pattern:** goal, current weight, activity level → a
personalised calorie target computed immediately. Few questions, and every answer visibly changes the
output. The stated user contract in the onboarding-design literature is exactly right: people will
answer five or six questions if the output is obviously personalised to them, and will resent the same
five or six if the result is generic
([Adapty](https://adapty.io/blog/how-to-personalize-onboarding-and-paywalls-in-your-mobile-app/)).

**Calm** asks a goal-selection question that is explicitly skippable and maps to a program list — a thin
but honest mapping. **Duolingo** is the best-in-class *matching* example in the set, and notably it does
not match on who you are: it matches on **demonstrated ability**, via a placement test. That is the
whole argument of this document, shipped by someone else.

**Who does it best, and why:** **Duolingo**, because it replaces self-description with a behavioural
measurement taken in the first two minutes, and because the fork it produces (beginner vs placed) maps
to a real difference in content. **MyFitnessPal** second, for the shortest question-to-visible-output
loop. Noom converts best and matches least.

**Patterns worth borrowing**
1. Duolingo's placement fork → our `DomainExpert.assessFeasibility` already grades a baseline level; we
   should let that level move `difficulty`, `estimatedMinutes` and whether the gentlest Milestone is
   skipped (`buildStructure` already does exactly this — the mechanism exists, it just needs to be
   fed by better inputs).
2. MyFitnessPal's immediate visible output → the first Journey proposal should visibly reflect the
   answers given, and the Coach should say which answer changed what.
3. Calm's skippability → already our rule; every onboarding question is skippable.

**Pitfalls to avoid**
1. **The long-quiz trap.** Any proposal to extend the questionnaire "for better matching" must name the
   plan lever each new question moves. Otherwise it is a conversion device wearing a personalisation
   costume, and it costs us disclosure we cannot take back.
2. **Projected-outcome claims.** Noom-style "you will reach X by date Y" screens convert well and
   overpromise. Our `FeasibilityAssessment` is deliberately the opposite — honest, non-clinical, never a
   directive. Keep it that way.
3. **Segmentation that becomes a label.** The moment a cohort is shown to the user ("people like you"),
   it stops being a planning device and becomes an identity claim.

---

## 5. Recommender practice: the cold start is our normal case

The recommender literature's framing is directly applicable. A brand-new user with no history is the
"cold user" problem; the standard solutions are (a) **active learning** — ask the smallest set of
maximally informative questions, (b) **content/attribute-based** recommendation from item features
rather than user history, and (c) **cross-domain** transfer. The consistent practical guidance is that
the elicitation questionnaire must be *short* to avoid fatiguing the user, and recent work focuses on
achieving the same accuracy with *fewer* queries
([Pairwise and Attribute-Aware Decision Tree-Based Preference Elicitation for Cold-Start
Recommendation, 2025](https://arxiv.org/html/2510.27342);
[Explainable Active Learning for Preference Elicitation](https://arxiv.org/pdf/2309.00356);
[RL for the cold-user problem](https://www.sciencedirect.com/science/article/pii/S0950705124003873)).

Two consequences we should be blunt about.

**First: at POC/MVP scale we cannot do collaborative filtering at all.** Cohort-outcome matching ("users
like you succeeded with this structure") needs enough completed Journeys per cohort cell to mean
anything, and §9 shows we will not have that for a long time. Until then, matching is **attribute-based
and rule-based** — which is exactly what the four `DomainExpert`s already are. That is not a compromise;
for a cold-start-dominated product it is the correct architecture, and it happens to be the private one.

**Second: the first week is the active-learning phase.** Rather than asking more questions, we should
treat the opening days of a Journey as the elicitation — a deliberately conservative first week whose
purpose is as much to *measure* the user as to serve them. §8 makes this concrete.

---

## 6. What we already hold (inventory before proposing anything new)

Taken from the code, not from memory.

**Stated, at account level** — `core/onboarding/`, six questions, all skippable, all on device:
Q1 desired life areas (7 + other) · Q2 desired outcome, free text · Q3 starting point (incl. "tried,
inconsistent") · Q4 preferred help · Q5 likely friction · Q6 realistic capacity (6 buckets) + optional
constraints text. Derived into `CoachOnboardingSummary` with `skipped` + `version` provenance.

**Stated, at Journey level** — each `DomainExpert.interviewQuestions()`, ordered by a stable
`QuestionIntent` funnel: `foundation` · `baseline` · `time` · `obstacles` · `motivation` · `milestones`.
`assessFeasibility` already grades a level 0–2 from the ordered baseline options and returns a
`FeasibilityVerdict`. `buildStructure` already uses that level to shrink/grow difficulty and minutes and
to skip the gentlest Milestone.

**Stated, scheduling** — `SchedulingPrefs` (`dayPart`, `preferredDays`), account `ActiveHours` (per-day
windows), `Journey.rhythm` (daily / few-times-week / weekly), `Journey.durationDays`, per-Step
`estimatedDuration` and `difficulty`.

**Stated, delivery** — `communicationProfile` (Direct / Explanatory / Warm / Energizing, six-item quiz,
plurality scored), form of address, language, country, week-start.

**Behavioural, on device** — `RawBehaviorRecord` per Step occurrence (`done` / `partial` / `couldnt` /
`slipped` / `postponed`, with `plannedFor`), capped at 50 per Step; `InsightModel` derives
`reliabilityByMilestone`, `slipRate`, `preferredDaypart`, `typicalSessionMinutes`, `paceRatio`,
`atRisk`, `daysSinceLastActivity`. `ReasonEntry` records a closed reason id (8 values) + resolved
lever(s) + outcome per miss. `Smart_Notification_Timing_PRD` already learns timing from behaviour.

**Already-whitelisted outbound** — `OutreachInsight`: `engagementState` (active/cooling/dormant),
`slippageFlag`, `streakBucket`, `contactWindow`, `channelPrefs`, `targetProximity`, produced only at
`deriveOutreachInsight`.

**Conclusion of the inventory:** we already hold, in structured form, everything in tiers A and B except
A3 (a derived metric nobody computes yet) and B4 (an existing question asked at the wrong scope). The
matching problem is far more a *derivation and plumbing* problem than a data-collection problem. That is
the most important sentence in this document.

---

## 7. The recommended parameter set

Each entry: what it is · bucketing · which lever it moves · evidence · have it? · privacy.

### 7.1 Tier A — behavioural (the model)

**A1 · Revealed adherence.** Share of planned Step occurrences reported done (partial counts as half)
over the trailing 14 days.
*Buckets:* `unknown` (fewer than 4 planned occurrences — report nothing rather than guess) ·
`low` (<40%) · `partial` (40–74%) · `high` (≥75%).
*Lever:* weekly load, Step `difficulty`, `estimatedMinutes`, whether the next Milestone advances or
repeats. This is already what `replan`'s "shrink toward the floor" path consumes.
*Evidence:* §3.1, §3.2. Strongest in the report.
*Have it:* yes — `InsightModel.paceRatio` / `reliabilityByMilestone` compute this; only the bucketing is
missing. *Privacy:* **P0**.

**A2 · Revealed capacity, and its gap from stated capacity.** Actual minutes of completed Step work per
week, on the *same ladder* as the stated capacity question so the two are directly comparable.
*Buckets:* `<30` · `30–89` · `90–179` · `180+` minutes/week. Plus a derived
`capacityGap` ∈ {`over_estimated`, `accurate`, `under_estimated`}.
*Lever:* `weeklyAvailabilityMinutes` into `PlanConstraints`, which drives feasibility and load shedding.
*Evidence:* §3.6 says the stated number is biased upward; measuring the gap turns a known bias into a
per-user correction. *Have it:* partly — `deriveConstraints` currently *approximates* weekly
availability from remaining Step estimates, with a comment in the code explicitly calling this a
placeholder for "a real availability signal". That real signal is A2, and `RawBehaviorRecord` already
carries the occurrences needed to compute it (though `actualMinutes` has no producer yet — the
completed-Step *estimate* is the usable proxy today). *Privacy:* **P0**.

**A3 · Restart-after-miss.** After a missed or postponed occurrence, what happens at the next planned
occurrence of that Step.
*Buckets:* `unknown` · `bounces_back` (next occurrence completed) · `slow_return` (completed within two
occurrences) · `stalls` (two or more consecutive misses).
*Lever:* the recovery response — how hard to shrink, whether to re-time, whether to offer a Grace Token,
whether to surface the Support Circle. Also whether to *say anything at all*: for a `bounces_back` user,
an intervention after a single miss is noise.
*Evidence:* Lally (§3.8) supports the underlying claim that one miss is not the failure. **Using the
restart *pattern* as a matching parameter is our hypothesis — I found no literature that does this.**
Treat as a hypothesis to test, not a finding. It is cheap to compute and cheap to be wrong about.
*Have it:* derivable today from `RawBehaviorRecord` + `plannedFor`; not currently computed.
*Privacy:* **P0**.

**A4 · Dominant friction reason.** The modal `ReasonId` across the last N misses.
*Buckets:* the existing closed list of 8 — `forgot` · `no_time` · `lost_motivation` · `too_hard` ·
`did_partially` · `couldnt` · `not_relevant` · `other`. Report only when the modal reason has ≥3
occurrences; otherwise `unknown`.
*Lever:* the `LeverId` mapping that already exists in config (`retime` · `refrequency` · `retone` ·
`rally` · `reconnect_why` · `reshape` · `mirror` · `grace`).
*Evidence:* **thin.** The reason→lever mapping is a plausible mechanism-matching design; I found no
trial evidence that matching a response to a self-reported obstacle beats a generic response — and note
that the closest analogue, stage-matching, *failed* that test (§3.3). This is our most attractive
untested idea. It is also our cheapest one, since the data is already collected as enums. Flagged
explicitly as **Open Question / hypothesis**, and a good candidate for the first real A/B we ever run.
*Have it:* yes. *Privacy:* **P0** for the enum. The `other` free-text note is on-device-only forever
(G1) and must never enter this parameter.

**A5 · Revealed daypart and weekday pattern.** When Steps actually get done, versus when they were
planned.
*Buckets:* `DayPart` enum + `mixed`; weekday pattern as `weekday_only` · `weekend_only` · `spread`.
*Lever:* `preferredDays`, `daypart`, reminder timing.
*Evidence:* direct and mechanical rather than theoretical — if 80% of completions happen in the evening,
planning mornings manufactures misses. `Smart_Notification_Timing_PRD` already establishes this
principle for notifications; this extends it to the plan itself. *Have it:* yes —
`InsightModel.preferredDaypart`. *Privacy:* **P0** as a daypart bucket. **Never as timestamps** — a
raw timestamp series is a movement pattern and is already banned from leaving the device (G1).

### 7.2 Tier B — stated priors (cold start only; decay as tier A arrives)

**B1 · Goal domain.** *Buckets:* on device, the precise domain (the four experts plus general). Outbound,
a coarse `domainFamily`, with addiction and body image handled per §11.
*Lever:* which expert runs; the entire Milestone arc. Highest-leverage single parameter.
*Evidence:* self-evident on the lever side. *Have it:* yes (Q1 + the Coach's domain triage).
*Privacy:* **P0 for neutral domains, P2 for addiction and body image** — see §11.

**B2 · Self-rated baseline level in this goal.** *Buckets:* the existing 0/1/2 ladder — `starting` ·
`some_ground` · `experienced` (a free-text "Other" answer already defaults to the middle level, which is
the right default: assume neither extreme).
*Lever:* `difficulty`, `estimatedMinutes`, whether the gentlest Milestone is skipped, `FeasibilityVerdict`.
*Evidence:* §3.3 (baseline moderates), plus Duolingo's placement fork as the product proof (§4).
*Have it:* yes — `levelFromOrdered` / `levelFromOrderedOptions` already compute it. *Privacy:* **P0**.

**B3 · Stated capacity + schedule variability.** *Buckets:* capacity on the same four-rung ladder as A2;
variability as `steady` · `varies` (Q6's "It changes a lot from week to week" is already this).
*Lever:* initial weekly load and `rhythm`; `varies` should produce a flexible plan (a weekly *quota*
rather than fixed days) instead of a dated timetable.
*Evidence:* capacity is a hard constraint, but stated capacity is biased upward (§3.6) — so it is used as
a *ceiling to discount from*, never as a target. The `varies` → flexible-plan mapping is intuitive and
**unevidenced**; hypothesis. *Have it:* yes (Q6 + each expert's `time` question). *Privacy:* **P0**.

**B4 · Prior-attempt history for this goal.** *Buckets:* `first_time` · `tried_faded` (started, didn't
hold) · `tried_held_then_lapsed` (held for a meaningful stretch, then stopped) · `ongoing`.
*Lever:* what the first Milestone is *about*. `tried_held_then_lapsed` is the highest-signal case — that
person can do the behaviour; the plan should start nearer their previous level and put the first
Milestone on whatever broke it. `first_time` gets the gentlest ramp.
*Evidence:* §3.5 — the strongest evidence base of any *stated* parameter, with the caveat that it comes
almost entirely from smoking cessation.
*Have it:* **partly, at the wrong scope.** Onboarding Q3 asks this once, about the person's life
("I've tried before but wasn't consistent"). The recommendation is to ask the same thing inside the
expert interview, about *this goal*, where the answer is concrete and actionable. **This is a reframe of
an existing question, not a seventh onboarding question.** *Privacy:* **P1** — "tried and failed at X
before" is a mildly revealing self-disclosure, and for a sensitive domain it is P2. Recommend it stays
on device and is used only by the local expert; it does not need to be in any outbound vector.

**B5 · Concurrent Journey load.** *Buckets:* `1` · `2–3` · `4+`.
*Lever:* whether to accept a new Journey now or offer to park it (`parkedGoals` already exists);
per-Journey load; the honesty of the feasibility note.
*Evidence:* **none found directly.** It is implied by our own experts' `scope_creep` and `overloaded`
risk signals and by basic capacity arithmetic. Hypothesis, but a near-free one — the count is already in
state. *Privacy:* **P0**.

**A note on commitment strength (deliberately not a parameter).** §3.7 gives a genuine matching rule:
precise if-then scheduling pays off when goal intention is strong, and backfires as manufactured misses
when it is not. The temptation is to ask "how important is this to you?" — but importance self-reported
*at the moment of setting a goal* is inflated by construction, and the answer is socially obvious.
**Recommend a revealed proxy instead:** did the user complete the first Step within 48 hours of the
Journey starting, and did they accept a reminder. Both are already observable, neither costs a question,
and both are behaviour rather than prediction. Buckets: `demonstrated` · `partial` · `not_yet`.

### 7.3 Tier C — delivery parameters, deliberately kept out of matching

`communicationProfile`, `ActiveHours`, language, form of address, week-start. These change **how we
speak and when we may speak**, not **what plan we build**.

Keeping this line clean is worth stating explicitly, because it will be attacked. The moment
communication style is allowed into the matching vector, "Direct-style users get harder Journeys"
becomes a defensible-sounding sentence, and it has no evidence behind it at all — it is a preference
about tone being reused as a claim about capability. The existing D40 design already says this
("adapts presentation only — never facts, logic, timing, safety"). The matching system should inherit
that constraint verbatim.

### 7.4 Tier D — evaluated and rejected for matching

| Candidate | Predicts? | Privacy | Verdict |
|-----------|-----------|---------|---------|
| Age / age band | Weak for behaviour change | **P1**, strong re-identifier | **Reject for matching.** Its only legitimate use is a safety/eligibility gate (under-18), which is a different system. |
| Gender | Weak | **P1** | **Reject for matching.** Needed for Hebrew grammar (D31), full stop. |
| Country | Weak | **P1** | **Reject for matching.** Needed for week start and language. |
| Personality inventory (Big Five / conscientiousness / grit) | **Genuinely predicts** (§3.9) | High escalation | **Reject.** Revealed adherence measures it better, from behaviour, free. See §3.9 for the full four-part reasoning. |
| Readiness / stage of change | **Evidence says no** (§3.3) | P1 | **Reject.** Do not build a stage classifier. |
| Occupation / income / education / marital status | Weak | **P1**, strongly identifying in combination | **Reject.** |
| Mental-health status, diagnoses, medication | Would predict | **P2** | **Reject.** Not our product, and Article 9 territory. |

---

## 8. The cold-start answer

The case that actually happens most: a user in their first session, with no behaviour and possibly with
several questions skipped.

**Recommendation, in order:**

1. **Match on exactly three things: B1 domain, B2 baseline level, B3 stated capacity.** Everything else
   we hold at that moment is either a delivery parameter, a prior with no lever, or absent. Three
   parameters is not a limitation to apologise for — it is what the cold-start literature says works, and
   more inputs at this moment mostly add noise and disclosure cost.

2. **Deliberately under-plan the first week.** Because stated capacity is optimistic in a *known
   direction* (§3.6), and because the cost is asymmetric: an over-planned first week produces a miss in
   the highest-risk window we have (§3.2), while an under-planned first week costs almost nothing and
   produces an early win. **Proposed starting point: plan week 1 at roughly 60–70% of stated capacity,
   then let A2 grow it.** *The direction is evidence-backed; the specific percentage is invented.* It
   must be measured, not assumed — see the `capacity_calibration` event in §10.

3. **Treat days 1–14 as the real elicitation.** This is the active-learning phase (§5). By day 14 we
   have A1, A2, A5 and often A3 and A4 — a strictly better model than any questionnaire we could have
   run, obtained without asking anything.

4. **Degrade gracefully on skips.** Every onboarding question is skippable and the summary already
   carries a `skipped` list. Missing B2 → assume the middle level (already the code's behaviour).
   Missing B3 → assume the second rung and under-plan harder. Missing B1 → the general expert. Never
   block, never re-ask, never treat a skip as a signal about the person.

5. **Do not use a cohort until it meets the floor.** Until §9's threshold is satisfiable, cold start is
   rule-based via the `DomainExpert`s. This is not a stopgap — for a product where most users are cold,
   it is the right architecture and it is the private one.

**What we should *not* do at cold start:** lengthen the questionnaire; infer a personality; show the
user a cohort label; or make an outcome projection. The last one is the Noom pitfall (§4) and it is
also a truthfulness problem — at cold start we genuinely do not know.

---

## 9. The combination trap, and the minimum cohort size

The instruction was to be alert to this, and the arithmetic is worse than it looks.

Take a modest outbound vector: `domainFamily` (say 7) × `capacityBucket` (4) × `baselineLevel` (3) ×
`adherenceBucket` (4) × `rhythm` (3) = **1,008 distinct cells** — and that is before daypart, restart
pattern, friction reason or load. Add A5 (4) and B5 (3) and it is over 12,000. At POC scale — hundreds
of users, not millions — **the overwhelming majority of cells contain zero or one person.** A vector of
five coarse, individually-harmless categoricals is then a unique identifier, and a description of that
person's goals and struggles attached to it.

This is the same mechanism as Sweeney's classic result: ZIP + gender + date of birth — three coarse
fields, none identifying alone — uniquely identified **87% of the US population**, and were enough to
re-identify a governor's medical record
([Sweeney, *Simple Demographics Often Identify People Uniquely*](https://www.researchgate.net/publication/267716853_Simple_Demographics_Often_Identify_People_Uniquely);
[Golle's re-analysis](https://dl.acm.org/doi/10.1145/1179601.1179615)). The lesson transfers exactly:
coarseness of each field is not the property that matters. **Cardinality of the combination is.**

**Recommendations:**

- **Cap the outbound matching vector at four fields.** Not "as few as convenient" — four, as a hard
  design constraint that a reviewer can check.
- **Enforce a cohort-size floor of k ≥ 20** before a cohort may influence any recommendation. Rationale:
  re-identification risk flattens out around k ≈ 20 in the published analyses, and Google adopted k = 50
  for Privacy Sandbox cohorts — 20 is a defensible floor for a product at our scale, 50 the target as we
  grow ([Google Privacy Sandbox k-anonymity](https://privacysandbox.google.com/private-advertising/protected-audience-api/k-anonymity);
  [Building K-Anonymous User Cohorts (CCWS)](https://arxiv.org/abs/2304.13677)).
- **Degrade to the parent bucket, never suppress silently.** Below the floor, drop the least-predictive
  field and re-check, recursively, down to domain alone — and if even that fails the floor, fall back to
  pure expert rules. The fallback must be a normal code path with tests, not an error case.
- **Never join the matching vector to anything identifying.** Not the pseudonymous `uid`, not a
  timestamp precise enough to act as one, not a Journey title. The existing `OutreachInsight` whitelist
  discipline and its single chokepoint are the right pattern to copy.
- **Where the set gets dangerous, concretely:** adding *any* demographic (age band, country) to a vector
  that already contains domain is the specific step that turns a behavioural profile into a person. That
  is why §7.4 rejects them even though each is individually coarse.

---

## 10. Success metrics and instrumentation

**The measurement trap, stated first, because it is the most important thing in this section.** A
matching system optimised for *retention* will reliably learn to recommend easy Journeys. Easy Journeys
retain. They also do not change anyone's life. That is engagement optimisation wearing a growth
costume, and it would be a direct violation of CLAUDE.md §3.4.

**Recommended target metric — a composite, never survival alone:**
> A match is good when the user is **still going at day 14** *and* has **completed at least one
> Milestone** without the plan having been shrunk more than once.

The second and third clauses are what stop the system from learning to under-ask.

**Signals**
- *Primary:* 14-day Journey survival **and** first-Milestone completion.
- *Secondary:* week-1 adherence bucket; magnitude and direction of the first Weekly Review re-plan (a
  large shrink at the first review is a mis-match we should be able to detect and learn from); ratio of
  `no_time` / `too_hard` reasons in weeks 1–2 (a load-calibration error signature).
- *Counter-metric, mandatory:* median Step difficulty and weekly minutes of recommended Journeys over
  time. **If this trends down while retention trends up, the matcher is gaming us.**

**Events to instrument** (all bucketed, no free text, no timestamps finer than a day, no titles — to be
handed to implementer to wire and to qa-engineer to verify):

| Event | Payload (buckets only) |
|-------|------------------------|
| `plan_matched` | `domainFamily`, `baselineLevel`, `statedCapacityBucket`, `source` (`expert_rules` \| `library`), `cohortSizeBucket` |
| `plan_first_week_result` | `adherenceBucket`, `plannedLoadBucket`, `completedLoadBucket` |
| `capacity_calibration` | `statedCapacityBucket`, `revealedCapacityBucket`, `capacityGap` |
| `plan_replan_applied` | `direction` (`shrink` \| `grow` \| `retime` \| `reshape`), `magnitudeBucket`, `triggeredBy` (`weekly_review` \| `recovery` \| `user_edit`) |
| `restart_after_miss` | `pattern` (`bounces_back` \| `slow_return` \| `stalls`) |
| `milestone_completed` | `milestoneIndex`, `daysBucket` |
| `journey_outcome` | `outcome` (`completed` \| `abandoned` \| `frozen` \| `running`), `dayBucket`, `topReasonId` |

`capacity_calibration` is the highest-value event in the table and worth calling out. It is the one that
converts §8's invented 60–70% discount into a measured constant — per domain, and eventually per user.
After roughly a hundred users it replaces a guess with a number. Wire it first.

---

## 11. The sensitive-domain question (D24/D53) — recommendation, not decision

**The question:** addiction and relationships (see correction below re: body image) require expert
review before release (D24; mechanism corrected by **D53**, 2026-08-18 — the requirement is expert
review before shipping to a real user, not a block on building the domain out). Should domain itself
be a matching parameter for those, given what "this user is in the addiction cohort" reveals?

**Correction (D53, 2026-08-18):** this section was written when D24 was read as also blocking
*development* of these domains ("flag/dev-only"). The founder has since clarified he never made that
ruling; D24's dev-stage-gate wording is rescinded and replaced by expert-review-before-release, which
was already the operative constraint in practice (nothing has shipped to a real user in any domain).
The sensitivity analysis and recommendation below are unaffected — they were always about the
*outbound learning* question, which remains gated on review regardless of build status.

**The legal fact, first, because it removes some of the discretion.** Under UK/EU GDPR, **inference is
enough**: if our processing is intended to make an inference linked to a special category, we are
processing special-category data — regardless of how confident we are that the inference is correct, and
including "any form of profiling which infers health status"
([ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)).
So a cohort key that reliably implies addiction *is* special-category data, whatever we name the field.
Euphemism is not a mitigation. Neither is bucketing "addiction" into a "health" family, if that family
is in practice diagnostic.

**Recommendation (founder decides):**

1. **On device: yes, precise domain.** The expert cannot do its job otherwise, and the data never
   leaves. No change from today.
2. **Outbound: no — exclude sensitive-domain Journeys from the outbound learning loop entirely.** They
   contribute no cohort data and receive no cohort-derived recommendation; they get expert-rule plans
   only. Not a `withheld` sentinel value either — a sentinel is itself the disclosure, since "this user
   withheld their domain" in a population where only two domains are withheld-eligible is a near-perfect
   inference.
3. **Cost of this recommendation, stated honestly:** we learn nothing at the population level from
   precisely the users who might benefit most from good matching. That is a real loss and the founder
   should weigh it, not have it hidden. Two things reduce the sting: (a) nothing ships to a real user in
   any domain yet (there is no release path today, and these two domains additionally require expert
   review before release — D24/D53), so the loss is currently zero and this is a cheap decision to make
   *now* rather than later under pressure; (b) tier-A behavioural parameters still work fully on device, so the
   *user's own* adaptation is unaffected — only the cross-user learning is.
4. **Also worth deciding at the same time:** whether sensitive-domain Journeys should be excluded from
   the Completion Card / share surfaces and from any Support Circle default. That is adjacent, already
   partly handled (`core/coach/sensitiveDomains.ts` double-gates parked goals), and belongs in the same
   conversation.

---

## 12. Do-not-collect list

An explicit refusal list is what stops scope creep later. Each entry names *why*, so a future proposal
has to argue with the reason rather than rediscover the question.

**Never collect, at all**
1. **Precise location / GPS.** Country from device region is sufficient and already in place. A location
   trail plus a goal domain is a near-perfect identifier.
2. **Contacts, calendar contents, photo library, health-kit data.** Each would improve some prediction.
   None survives the privacy axis. If calendar is ever revisited, it is free/busy *blocks* only, never
   event titles.
3. **Mental-health diagnoses, medication, treatment status, substance quantities.** Article 9 data with
   no matching lever we are qualified to pull. We are a framework, not a clinician — the experts already
   say so in their own headers.
4. **Weight, BMI, body measurements.** Body image is a gated domain precisely because these are harmful
   to collect and to display. There is no version of this that is a matching parameter.
5. **Sexual orientation, religion, ethnicity, political views, union membership.** Article 9. No lever.
6. **Income, occupation, employer, education level, marital/family status.** Weak predictors, strong
   quasi-identifiers, and each invites a demographic model we have already rejected.
7. **Free-text answers as matching input.** Q2's outcome text, `ReasonEntry.note`, "Other" answers,
   Coach conversation text, exact Journey and Step titles. All are G1 on-device-forever today. They are
   the richest signal we hold and they must stay exactly where they are. A matching parameter derived
   from free text may only ever be an enum produced on device.
8. **Any personality or psychometric inventory.** §3.9.
9. **Any cohort label shown to the user.** "People like you" turns a planning device into an identity
   claim, contradicts the onboarding PRD's hypothesis-not-label rule, and risks becoming
   self-fulfilling.

**Collect, but never use for matching** (already collected for a specific, different purpose)
10. Birth date, gender/form of address, country, language, `@username`, display name, photo.
    → Grammar, week start, localisation, identity. **None enters the matching vector.**

**Related open concern, flagged not decided:** the app collects **full birth date** at Personal Info
(`Onboarding_Questionnaire_PRD.md` §4). Full DOB is the single most re-identifying field we hold
(Sweeney, §9). If the product need is an age gate and a birthday greeting, **birth month + year** would
serve both at materially lower risk. Worth a deliberate answer — see §13, question 5.

---

## 13. Open questions for the founder

1. **Is the composite target metric right?** §10 proposes "still going at day 14 **and** one Milestone
   completed **and** not shrunk twice", explicitly refusing retention alone. This is the decision that
   determines whether the matcher serves growth or engagement, and it is genuinely his to make.
2. **Does an outbound learning loop exist in the POC at all?** My recommendation is **no** — matching
   stays fully on-device and rule-based until the k ≥ 20 floor is satisfiable, which is a long way off.
   That is a scope decision with real consequences for the companion PRD.
3. **Sensitive domains: exclude entirely from the loop** (§11 recommendation), or include under some
   scheme? Cheap to decide now, expensive later.
4. **Reframe Q3 as a per-Journey prior-attempt question inside the expert interview** (B4)? My
   recommendation is yes: highest-evidence stated parameter, no new onboarding question, asked where the
   answer is concrete.
5. **Full birth date, or birth month + year?** §12. A privacy reduction available for free if there is no
   product need for the day.
6. **Which single hypothesis do we test first?** My recommendation is the reason→lever mapping (A4) —
   most attractive, most untested, cheapest to measure, and the closest analogue in the literature
   (stage-matching) failed the same test.

---

## 14. Where the evidence is weakest — read this before quoting anything above

Stated plainly, because a confident-sounding recommendation built on nothing is worse than an honest
"unproven".

- **Reason→lever matching (A4)** — no supporting trial evidence found. Plausible mechanism; the nearest
  analogue in the literature (stage-matched intervention) was tested and *failed*. Hypothesis.
- **Restart-after-miss as a matching parameter (A3)** — Lally supports "one miss is survivable"; nothing
  found supports using the restart *pattern* to select a plan. Our own idea. Hypothesis.
- **The 60–70% first-week capacity discount (§8)** — direction supported by the planning-fallacy
  literature; the number is invented. Must be replaced by measurement (`capacity_calibration`).
- **`varies` → flexible-plan mapping (B3)** — intuitive, unevidenced.
- **Concurrent load (B5)** — arithmetic and our own experts' risk signals; no external evidence found.
- **Prior attempts (B4)** — good evidence, but almost entirely from smoking cessation. Transfer to
  career, learning and relationship goals is an assumption.
- **Autonomous motivation** — strong evidence it predicts *outcomes*; weak-to-absent evidence it should
  change *which plan we give*. §3.4 keeps those apart deliberately; do not let a summary collapse them.
- **Competitor internals** — what Noom, Calm and Fitbit actually *do* with intake answers is not public.
  Teardowns and help-centre docs are what we have. Everything in §4 about intent is labelled inference.
- **Scale** — every cohort/collaborative-filtering finding in §5 assumes populations we do not have and
  will not have soon. Anything premised on "learning across users" is a Future Vision item, not a POC one.

---

## 15. Sources

Behaviour-change science
- [Sheeran & Webb (2016), *The Intention–Behavior Gap*](https://compass.onlinelibrary.wiley.com/doi/abs/10.1111/spc3.12265) · [full text PDF](https://content.workplacegivingaustralia.org.au/app/uploads/2020/10/Intention-Behaviour-Gap-Full-Article-SheeranWebb2016.pdf)
- [Gollwitzer & Sheeran (2006), *Implementation Intentions and Goal Achievement: A Meta-Analysis*](https://www.researchgate.net/publication/37367696_Implementation_Intentions_and_Goal_Achievement_A_Meta-Analysis_of_Effects_and_Processes) · [Gollwitzer chapter (NCI)](https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf)
- [Lally et al. (2010), *How are habits formed*](https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674) · [BPS Research Digest summary](https://www.bps.org.uk/research-digest/how-form-habit)
- [Ntoumanis et al. (2021), *Meta-analysis of SDT-informed interventions in the health domain*](https://www.tandfonline.com/doi/full/10.1080/17437199.2020.1718529)
- [Autonomous and controlled motivational regulations for multiple health-related behaviours](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4346087/)
- [Adams & White, *Why don't stage-based activity promotion interventions work?* — critique with five commentaries](https://www.researchgate.net/publication/8113005_The_Transtheoretical_Model_and_stages_of_change_a_critique_Observations_by_five_Commentators_on_the_paper_by_Adams_J_and_White_M_2004_Why_don't_stage-based_activity_promotion_interventions_work) · [Stages of Change Theory (StatPearls/NCBI)](https://www.ncbi.nlm.nih.gov/books/NBK556005/)
- [Predictors, Moderators, and Treatment Parameters of Community and Clinic-Based Treatment](https://pmc.ncbi.nlm.nih.gov/articles/PMC4349495/)
- [Common predictors of smoking cessation in clinical practice](https://www.sciencedirect.com/science/article/pii/S0954611108000930) · [If at first you don't succeed, when should you try again?](https://pmc.ncbi.nlm.nih.gov/articles/PMC7163297/)
- [Conscientiousness is associated with adherence](https://pmc.ncbi.nlm.nih.gov/articles/PMC11693223/) · [Beyond passion and perseverance: the science of grit](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.545526/full)
- [Predicting Early Dropout in a Digital Tobacco Cessation Intervention](https://pmc.ncbi.nlm.nih.gov/articles/PMC11635322/) · [Can a Single Variable Predict Early Dropout From Digital Health Interventions?](https://pmc.ncbi.nlm.nih.gov/articles/PMC9898835/)
- [Planning fallacy (The Decision Lab)](https://thedecisionlab.com/biases/planning-fallacy) · [Planning fallacy (overview)](https://en.wikipedia.org/wiki/Planning_fallacy)

Product / competitive
- [RevenueCat — Inside Noom's web-to-app onboarding funnel](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel)
- [The Behavioral Scientist — Noom product critique: onboarding](https://www.thebehavioralscientist.com/articles/noom-product-critique-onboarding)
- [Adapty — How to personalise onboarding and paywalls](https://adapty.io/blog/how-to-personalize-onboarding-and-paywalls-in-your-mobile-app/)
- Internal: `05_Research/Signup_and_First_Run_Competitive_Research.md` (Finch · Fabulous · Headspace · Calm · Duolingo · Strava · Noom · Wysa · Fitbit AI Coach)

Recommenders / cold start
- [Pairwise and Attribute-Aware Decision Tree-Based Preference Elicitation for Cold-Start Recommendation (2025)](https://arxiv.org/html/2510.27342)
- [Explainable Active Learning for Preference Elicitation](https://arxiv.org/pdf/2309.00356)
- [Reinforcement learning for the cold-user problem in recommender systems](https://www.sciencedirect.com/science/article/pii/S0950705124003873)

Privacy / re-identification
- [Sweeney, *Simple Demographics Often Identify People Uniquely*](https://www.researchgate.net/publication/267716853_Simple_Demographics_Often_Identify_People_Uniquely) · [Golle, *Revisiting the uniqueness of simple demographics*](https://dl.acm.org/doi/10.1145/1179601.1179615)
- [Google Privacy Sandbox — k-anonymity](https://privacysandbox.google.com/private-advertising/protected-audience-api/k-anonymity) · [Building K-Anonymous User Cohorts (CCWS)](https://arxiv.org/abs/2304.13677)
- [ICO — What is special category data?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/) · [Art. 9 GDPR](https://gdpr-info.eu/art-9-gdpr/)

Internal (repo)
- `app/src/core/onboarding/` · `04_Product/PRD/Done/Onboarding_Questionnaire_PRD.md`
- `app/src/core/learning/DomainExpert.ts` · `app/src/core/learning/experts/` · `app/src/core/learning/deriveConstraints.ts` · `app/src/core/learning/BehaviorModelEngine.ts`
- `app/src/core/config/reasons.ts` · `app/src/core/communication/communicationProfile.ts` · `app/src/core/types/domain.ts` (`SchedulingPrefs`, `ActiveHours`, `InsightModel`, `OutreachInsight`, `RawBehaviorRecord`, `ReasonEntry`)
- `04_Product/PRD/Smart_Notification_Timing_PRD.md` · `06_Decisions/Decision_Log.md` D24, D30, D40, D43, D51
