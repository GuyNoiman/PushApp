# Duolingo Persistence — Competitive Research

Status: Research, not an approved PushApp specification  
Date: 2026-09-06  
Scope: Why Duolingo gets people to return and act repeatedly; what PushApp should learn, reject, or test.

## 1. Executive conclusion

Duolingo's persistence is not produced by points or an owl alone. It is a coordinated loop:

1. make today's minimum action extremely small and unambiguous;
2. show the next action rather than asking the learner to plan;
3. reward completion immediately and visibly;
4. make accumulated consistency feel owned;
5. soften an occasional miss so one bad day does not end the relationship;
6. add social commitment without requiring a large network;
7. use reminders whose wording is eligible for the person's current state and whose performance is
   continuously tested;
8. personalize task difficulty so returning usually produces a challenge that feels achievable;
9. instrument the entire loop and change it through controlled experiments.

PushApp should learn from the loop, not copy its game skin. Our target is real-world movement toward
a chosen self, not daily app use. A mechanic is valid only when the protected action is meaningful
progress in the person's life.

## 2. Evidence that the system works

Duolingo reports that, at 31 December 2025, about 43 million daily users held a streak of at least
seven days and about 15 million held a streak of at least 365 days. These are company-reported
engagement figures, not independent proof of learning, but they establish the scale of repeated use.

Its published experiments also expose causal evidence for individual mechanisms:

- separating “one lesson keeps the streak” from the larger daily goal increased Day-14 retention by
  3.3%, daily active learners by 1%, and the share of daily learners on a streak by 10.5%;
- a seven-day streak wager increased Day-7 retention by 14% in the reported experiment;
- the notification-selection system increased total daily active users by 0.5% and new-user
  retention by 2% over an already strong baseline;
- Duolingo reports that learners with at least one Friend Streak are 22% more likely to complete
  their daily lesson. This is observational company evidence and should not be read as pure causal
  effect.

The important pattern is experimental discipline: Duolingo does not assume that a familiar game
mechanic works. It states the desired behavior, measures the funnel and tests changes.

## 3. The persistence mechanisms

### 3.1 A very low daily floor

One lesson is enough to preserve the streak, even when the user's daily learning goal is larger.
This separates continuity from ambition. A difficult day can still contain a genuine action.

**PushApp lesson:** distinguish a Journey's meaningful minimum from its full planned day. The minimum
must still advance the Journey; opening the app, reading a quote or checking a box without action
must never protect progress.

### 3.2 One obvious next action

The course path removes planning work. The learner normally sees where to continue, and a lesson is
short enough to begin immediately.

**PushApp lesson:** today's view may contain several Steps, but each Journey should make its current
state and available actions understandable without requiring the person to reconstruct the plan.
This does not justify inventing an arbitrary “next Step” across unrelated Journeys.

### 3.3 Immediate, layered feedback

Lesson completion can advance the course, XP, quests, streak, league and rewards at once. Animation,
sound, characters and milestone celebrations make small progress emotionally legible.

**PushApp lesson:** a completed Step should first communicate what changed in the real Journey. Small
celebrations can make that visible. XP and Achievements are later layers and must not replace the
meaning of the action.

### 3.4 A streak that is valuable but recoverable

Duolingo builds ownership around the accumulated run, then offers Streak Freeze and related recovery
mechanics. This uses loss aversion while preventing one miss from destroying a long relationship.

**PushApp lesson:** continuity can be motivating, but the current definition — completing all daily
Steps — is much harsher than Duolingo's one-lesson floor and spans heterogeneous real-life demands.
Before emphasizing streak visually, PushApp must test whether its streak measures committed action
or merely punishes ambitious plans. Recovery must never become shame, deception, or a paid escape.

### 3.5 Social commitment

Friend Streaks require an accepted invitation and one lesson from each person. Friends Quests add a
shared weekly target, while encouragement makes progress socially visible. Duolingo limits Friend
Streaks and reports that it analyzed the funnel rather than assuming more friend slots were better.

**PushApp lesson:** the Support Circle is potentially more meaningful because support relates to the
person's real change. Borrow the accepted mutual commitment and clear action, not competitive social
pressure. Measure whether support creates action and felt support, not messages sent or network size.

### 3.6 Personalized notification content

Duolingo selects from pre-written templates with explicit eligibility rules. Its published bandit
work addresses two practical problems: messages lose impact when repeated, and many templates are
valid only in particular states. The research dataset labels conversion when the user returns within
two hours; the algorithm balances known performance with novelty and temporary eligibility.

**PushApp lesson:** this strongly supports our planned architecture of approved templates, context
eligibility, communication style, per-person history and learning. We should optimize for meaningful
post-notification action, not notification taps alone. “Opened from notification” remains an
intermediate signal; Step progress within the relevant window is stronger.

### 3.7 Personalized challenge difficulty

Birdbrain models both the learner's ability and the difficulty of material, aiming for work that is
neither already mastered nor too advanced. This makes the product's next recommendation more likely
to feel achievable.

**PushApp lesson:** our deeper analogue is not reminder timing; it is user-to-Journey matching and
dynamic Journey fit. A Journey should have a stable method/core while pace, load and presentation
adapt to the person. Success and mismatch feedback should update understanding of both the person and
the Journey.

### 3.8 Visible progress at several horizons

The path shows immediate position; daily quests show today's progress; streaks show continuity;
leagues create a weekly horizon; scores and course sections show longer-term movement.

**PushApp lesson:** show Step, day/week, Journey and Dream progress as distinct truths. Do not collapse
them into one score. The Dream itself is not a progress bar; it is the aspiration above Journeys.

### 3.9 A memorable character and varied emotional expression

Duo gives reminders, rewards and missed days a recognizable voice. Widgets use changing expressions
and visual space rather than behaving as duplicated push notifications.

**PushApp lesson:** personality makes repeated contact feel less mechanical, but the Coach must remain
trustworthy and responsive to the user's communication style. Guilt-based comedy that works for a
language game could be harmful in addiction, body image, relationships or a difficult week.

### 3.10 Continuous experimentation

Duolingo publicly describes A/B testing product changes, measuring the full success funnel and
optimizing the largest bottleneck instead of only power users.

**PushApp lesson:** every persistence feature needs a declared success measure and a harm guardrail.
Examples: completion quality and Journey continuation as primary outcomes; notification opt-out,
postponement, negative feedback and abandonment as guardrails.

## 4. What not to copy

### 4.1 App engagement as the final objective

Duolingo's core action happens inside the app, so daily active use and learning frequently align.
PushApp's work happens mainly in life. Time in app, notifications opened and messages sent are not
success unless they support real action.

### 4.2 A fragile all-or-nothing streak

Research supports streaks as attention and persistence devices, but newer work also identifies
psychological fatigue and discontinuance risks. A person may optimize for preserving the counter,
choose the easiest action, or quit after losing it.

### 4.3 Competition by default

Leagues create urgency, but rank can reward volume, invite gaming and demotivate people whose life
constraints differ. PushApp's level is intended to reflect investment in growth and help for others,
not superiority over friends.

### 4.4 Punishing mistakes

Duolingo's Hearts slow progression after mistakes and connect recovery to practice or payment. That
may fit exercises with objectively correct answers. It does not fit honest reports of partial or
missed real-world action.

### 4.5 Guilt and aggressive reminders

Duolingo can turn guilt into brand humor. PushApp receives vulnerable goals and must not make care
conditional on performance. A reminder should preserve agency, privacy and dignity.

### 4.6 Rewarding proxy behavior

XP can be optimized separately from learning. PushApp should not award meaningful status for opening,
reporting, creating easy Steps or producing support spam. Rewards should follow bounded evidence of
real action.

## 5. PushApp hypotheses worth testing

These are research-derived hypotheses, not approved features.

1. **Meaningful minimum:** define the smallest real action that preserves continuity for each
   Journey rather than using one global rule.
2. **Two-layer daily progress:** distinguish “I kept moving” from “I completed today's full plan.”
3. **Loss-softening without erasing truth:** retain an honest history while preventing one difficult
   day from turning into abandonment.
4. **One Support Circle commitment:** test whether one accepted, clearly framed supportive
   relationship improves Journey action more than broad social exposure.
5. **Notification eligibility before optimization:** first decide whether a message is relevant and
   respectful now; only then optimize time and copy.
6. **Novelty budget:** avoid repeating the same motivation template even when it has historically
   performed well.
7. **Action-weighted notification success:** tap/open is useful evidence; relevant Step progress and
   completed daily action are stronger outcomes.
8. **Progress at four horizons:** Step, weekly plan, Journey and cross-Journey growth, each with a
   different visual role.
9. **Celebrate the meaning:** completion copy should connect the action to the person's stated
   reason, not only to XP or streak preservation.
10. **Experiment with guardrails:** no rollout is successful if completion rises while notification
    fatigue, false reporting or Journey abandonment also rise.

## 6. Proposed research follow-up

Before making product decisions, run a screen-by-screen teardown on a current Duolingo account over
the first seven days and after an intentional miss. Capture:

- first-session commitment and goal setting;
- the exact daily return loop;
- notification frequency, timing and wording;
- the moment the streak first becomes salient;
- completion celebration and the next-action transition;
- Streak Freeze before and after a miss;
- daily quests, Friend Streak and league activation timing;
- every place where pressure, guilt, scarcity or payment enters;
- which behaviors create language progress versus only app engagement.

Then map each observed mechanism to one of three outcomes: **adopt principle**, **test carefully**, or
**reject for PushApp**.

## 7. Sources

Primary Duolingo sources:

- [Duolingo 2025 Form 10-K — learning experience and streak scale](https://investors.duolingo.com/static-files/f19d76fb-dee4-4f13-96ae-138ebfd0f2d3)
- [Improving the streak — reported retention experiment](https://blog.duolingo.com/improving-the-streak/)
- [How streaks keep learners committed — Streak Wager and recovery experiments](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)
- [Friend Streak — product and reported association with daily lessons](https://blog.duolingo.com/friend-streak/)
- [How Duolingo built Friend Streak — funnel and limit decisions](https://blog.duolingo.com/product-lessons-friend-streak/)
- [Notification content optimization — KDD paper](https://research.duolingo.com/papers/yancey.kdd20.pdf)
- [Duolingo notification research dataset description](https://research.duolingo.com/)
- [Birdbrain personalization](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/)
- [Duolingo product mechanics overview](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/)
- [Duolingo widget and retention](https://blog.duolingo.com/widget-feature/)

Independent caution/evidence:

- [Counting days as a spacing incentive — npj Science of Learning](https://www.nature.com/articles/s41539-025-00322-5)
- [Post-adoption gamification, fatigue and discontinuance — Information & Management](https://www.sciencedirect.com/science/article/abs/pii/S0378720625000369)
- [Winning streak effects in Duolingo — JAIST repository](https://dspace.jaist.ac.jp/dspace/handle/10119/15292?locale=en)

