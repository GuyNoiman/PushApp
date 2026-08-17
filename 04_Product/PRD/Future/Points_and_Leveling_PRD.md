# PRD — XP and Buddy Leveling

Status: **Approved direction; numerical tuning, implementation details, and unlock catalog remain open. Not approved for implementation.**
Stage: **Future** — explicitly removed from MVP by the founder on 2026-08-12.
Owner: founder + AI product team.
Related: B1 XP/Buddy Level, B3 Achievements, B4 Missions, `Support_Score_PRD.md`,
`../Daily_Step_Reporting_PRD.md`, `../Weekly_Review_PRD.md`, and completion celebration I1.

---

## 1. Purpose

PushApp needs a progression system that makes investment in personal growth visible, celebrates meaningful
progress before a Journey ends, gives Journey completion a powerful aspirational payoff, and actively
encourages helping other people.

The system must be understandable immediately. Its user-facing explanation is:

> Follow your daily plan, complete Journeys, and help friends to earn XP and raise your Buddy Level.

The mechanism must not reward time in the app, task-list inflation, or artificial social activity. Buddy Level
represents the combination of how much a person invests in their own development and how much they help
others. A person without friends in PushApp must still be able to progress fully; social contribution is an
accelerator, never an eligibility requirement.

In localized copy, XP may be explained as “Experience Points” or its natural equivalent. This PRD does not
introduce a new currency: **XP is the canonical progression unit** and **Buddy Level is the canonical Level**.

## 2. Product principles

1. **Simple outside, protected inside.** Users see a few clear earning rules. Anti-abuse protections remain
   mostly behind the scenes.
2. **Real growth, not app activity.** Opening PushApp, creating/editing a Journey, changing reminders, or
   browsing tools never earns XP.
3. **One Buddy Level.** Personal-development and friend-support XP feed the same lifetime progression.
4. **No punishment.** XP and Buddy Levels are monotonic. Misses, frozen Journeys, and difficult periods never
   remove previously earned progress.
5. **Journey completion matters most.** Finishing a Journey creates the largest single progression moment.
6. **No social prerequisite.** A user can reach every Buddy Level without having friends or Allies.
7. **XP is not Coins.** XP determines Buddy Level and cannot be spent or purchased. Coins remain a separate
   future game economy.

## 3. Sources of XP

The future mechanism has four distinct earning beats:

1. end-of-day plan completion;
2. Journey completion;
3. a weekly friend-support Mission;
4. Streak milestones.

Future self-development tools may become additional bounded sources (§8), but are not part of the approved
initial mechanism.

## 4. End-of-day plan completion

### 4.1 No per-Step award

Reporting an individual Step does **not** immediately add XP to the lifetime balance. This prevents a
Journey with many trivial Steps from out-earning a Journey with fewer meaningful Steps.

After each report, PushApp updates a visible **expected end-of-day XP award**. The user receives immediate
progress feedback without the XP entering the Buddy Level balance yet.

Example:

> Step completed. Your expected award is now 15 XP at the end of the day.

Expected XP must be visually and linguistically distinct from earned XP. It may rise or fall if a
report changes before day close.

### 4.2 Daily percentage

At day close, PushApp calculates the completed share of the day's **derived daily Step set** and grants one
award. This is not a new canonical object: it is the subset of existing Steps that the authoritative plan
requires today. The number of Steps does not increase the maximum daily award.

Approved provisional table:

| Completed share | End-of-day XP |
|---|---:|
| Below 10% | 0 |
| 10%–24% | 2 |
| 25%–49% | 5 |
| 50%–74% | 10 |
| 75%–99% | 15 |
| 100% | 20 |

These values are **tuning defaults, not final economy constants**. The percentage-based mechanism and daily
cap are approved.

For calculation purposes:

- Done contributes the Step's full weight.
- Partial contributes half of the Step's weight.
- Not Done contributes zero.
- Only Steps in the authoritative derived daily Step set at close are included.
- A Step scheduled for that day and a previously flexible Step that becomes Urgent both enter that set.
- A lawful Postpone that removes a Step from today before close removes it from today's denominator.
- A Step from a Journey frozen before close is removed according to the authoritative freeze/reporting rules.

### 4.3 Daily-plan integrity

The system must preserve an authoritative daily-plan snapshot/audit trail so users cannot raise the percentage
by deleting unfinished Steps, splitting/merging Steps, or adding easy Steps after work is already done.
Coach-approved same-day adaptations must be recorded explicitly and applied consistently; ordinary edits
default to affecting future days.

The calculation is idempotent: a calendar day can settle only once. Offline and multi-device reconciliation
must not duplicate an award.

## 5. Streak

Founder decision (2026-08-12):

> A Streak advances when the user completes every Step in that day's derived daily Step set.

This deliberately changes the older urgent-miss-only Streak rule currently documented elsewhere. Those
documents must be reconciled before this Future feature is promoted; they are not edited by this PRD.

A Step may enter the set because it was scheduled for that day or because it became Urgent. The reason it
entered the set does not change the Streak rule.

- 100% completion advances the Streak.
- Anything below 100% does not preserve the Streak, subject to the separately approved Postpone, Grace, and
  plan-adaptation rules.
- Partial is not full completion for Streak purposes.
- A day with no Steps in the derived daily set neither breaks nor advances the Streak.

Streak earns XP only at milestones, not every day. Approved provisional milestones:

| Streak milestone | Bonus XP |
|---|---:|
| 3 successful Daily-Step days | 6 |
| 7 | 14 |
| 14 | 28 |
| 30 | 60 |
| Each additional 30 | 60 |

The milestone mechanism is approved; exact milestones and values remain subject to economy tuning.

## 6. Weekly friend-support Mission

### 6.1 Purpose and eligibility

Helping friends is an optional weekly Mission and a meaningful Buddy Level accelerator. It resets at the user's
authoritative week boundary.

Home identifies friends who may need support using non-sensitive descriptions such as:

- a friend paused a Journey;
- a friend reported a miss or difficulty;
- a friend has not progressed according to the plan;
- a friend asked for support;
- a friend returned after inactivity;
- a future Coach signal identified an appropriate support moment.

Home must never expose the Journey name, Step name, report content, or reason for difficulty. It may say only:

> [Friend] may need your support.

Visibility and eligibility must respect friendship, Ally permissions, blocking/removal, account deletion,
and the privacy rules of the originating event.

### 6.2 Qualifying action

The user opens a friend marked by the system as needing support and successfully sends a message. By explicit
founder decision, sending that message counts as helping. PushApp does not inspect or score its content;
eligibility and frequency are bounded instead, avoiding surveillance while limiting artificial activity.

- Opening the surface without sending does not count.
- A predefined supportive message and a personally written message both count.
- A regular message outside an eligible Home support opportunity does not earn XP.
- The same friend can count only once per week.
- A support opportunity can award XP only once to the same helper.
- Users may continue helping after the weekly cap, without additional XP.

### 6.3 Progressive weekly award

XP is granted immediately after each qualifying message:

| Distinct supported friend this week | Immediate XP | Weekly total |
|---|---:|---:|
| First | 8 | 8 |
| Second | 10 | 18 |
| Third | 12 | 30 |

The rising sequence encourages completing the Mission. It is optional and adapts to available opportunities:
the user is never shown a failed requirement merely because fewer than three eligible friends exist. A user
with no friends or no eligible support opportunities is not blocked or disadvantaged in Buddy Level eligibility.

The sequence and 30-XP cap are approved provisional values; their ratio to daily and completion rewards
will be tuned later.

## 7. Journey-completion award

Completing a Journey grants a large, immediate, one-time XP award inside the Journey-completion ceremony.
It does not wait for end-of-day settlement.

The award must be materially larger than a normal daily award so Journey completion remains aspirational.
The user sees the available completion award before finishing the Journey.

The award may vary by the Journey's approved scope, but duration or Step count alone cannot determine value:
both are gameable and do not necessarily represent difficulty or transformation. A future calibration model
may consider duration, approved weekly commitment, complexity, and expected effort within bounded tiers.

Required protections:

- awarded once per Journey identity;
- reopening, reversing, freezing/resuming, or migrating a completed Journey cannot re-award it;
- duplicating a Journey creates no award until the new Journey is genuinely completed;
- later Step inflation cannot retroactively raise the completion award;
- any scope tier and completion value are established before completion and versioned when an approved Coach
  re-plan materially changes the Journey.

Exact tiers, tier names, and award values remain open for future calibration.

## 8. Future self-development tools

Tools such as a personality questionnaire, journal, personal vision, structured reflection, or future Coach
exercise may award XP if the activity produces meaningful development rather than app usage.

Each tool requires its own feature PRD and must define:

- the meaningful completion event;
- whether the award is one-time or frequency-bounded;
- a cap preventing repetitive low-value use;
- privacy rules, especially for journal/reflection content;
- why XP rather than an Achievement is the correct reward.

No tool earns XP merely for being opened, and free-text length must never be treated as quality.

## 9. Buddy Level behavior and value

Buddy Level is a lifetime, non-purchasable expression of investment in personal development and support of
others. It is calculated from total earned XP and never decreases.

The user may inspect the contribution breakdown without creating separate Levels:

- daily personal progress;
- Journey completion;
- friend support;
- Streak milestones;
- future approved self-development tools.

Buddy Level must eventually provide value beyond status, but essential transformation, safety, privacy,
accessibility, recovery, reminders, basic Coach access, Journey creation, and Support Circle functionality
must never be locked behind it.

Candidate unlocks must add optional depth or presentation, not gate meaningful development. Examples include
additional achievement-sharing templates, optional profile presentation, special Missions, and community
leadership capabilities. Advanced Coach help, reflection, or insights may unlock only when a meaningfully
useful base remains available to everyone and access is also based on need/readiness rather than grinding.
The catalog is **not yet approved** and requires a growth-before-engagement review.

## 10. Presentation moments

- **Step report:** celebrate the report and update expected end-of-day XP; do not claim XP was earned.
- **Day close:** settle one daily award and show completion percentage, earned XP, Streak result, and any
  milestone bonus.
- **Friend support:** grant and show XP immediately, plus weekly Mission progress.
- **Journey completion:** grant the large completion award immediately in the completion ceremony.
- **Buddy Level up:** show a clear celebration and any genuinely unlocked value.

The economy explanation must remain short. Detailed caps, snapshots, idempotency, and fraud controls belong
in help/technical documentation rather than the primary UI.

## 11. Edge cases

- no Steps in the derived daily set;
- a flexible Step becomes Urgent and enters the derived daily set during the day;
- Partial later changes to Done or Not Done before close;
- report reversal before or after settlement;
- Journey freeze, resume, completion, abandonment, or deletion before close;
- Postpone across a day/week boundary;
- week-start, time-zone, daylight-saving, and device-time changes;
- app remains closed at close time;
- offline reports and delayed synchronization;
- concurrent settlement on multiple devices;
- Coach edits today’s plan;
- a friend loses eligibility, removes friendship, blocks, or deletes the account during messaging;
- duplicate send, failed send, or retry;
- fewer than three eligible friends all week;
- account deletion and retained aggregate analytics;
- legacy users with XP earned under the current experimental formula.

## 12. Technical requirements

- Framework-free progression engine behind the Repository abstraction; UI never calculates awards.
- Stable, versioned reason codes for every Point transaction.
- Append-only/idempotent Point ledger with unique keys for day settlement, Streak milestone, support event,
  and Journey completion.
- Store earned and expected XP separately; expected XP is derived/draft state, not ledger balance.
- One authoritative daily Step set, day boundary, and week boundary shared with reporting, Streak, Missions,
  and Weekly Review.
- Server-authoritative social eligibility and award deduplication when the social backend is active.
- No message text, Step text, Journey title, or sensitive support reason in Point analytics/events.
- Configuration-before-code for thresholds, milestone tables, caps, and Journey completion tiers.
- Backward-compatible migration policy is required before enabling the system.

## 13. Competitive references and lessons

- [Duolingo](https://blog.duolingo.com/time-spent-learning-well/) demonstrates that raw XP incentives can
  cause users to grind efficient activities instead of pursuing the intended outcome. PushApp therefore caps
  daily plan XP rather than paying per Step.
- [Finch](https://help.finchcare.com/hc/en-us/articles/37780134479757-Energy-vs-Rainbow-Stones)
  separates daily progress energy from spendable currency. PushApp likewise separates XP from Coins, but
  does not reward opening the app.
- [Habitica](https://habitica.com/static/faq) provides immediate rewards but allows self-defined task volume
  and includes punitive loss. PushApp adopts immediate feedback while rejecting punishment and volume mining.
- [Todoist Karma](https://www.todoist.com/help/articles/introduction-to-karma-OgWkWy) shows the clarity of
  permanent Levels but also the weakness of rewarding task creation and product-feature usage.
- [Strava Challenges](https://support.strava.com/en-us/articles/15401916-strava-challenges) use explicit
  eligibility rules and bounded achievement events. PushApp applies comparable eligibility discipline without
  public ranking or exposing sensitive activity.
- [Apple Fitness](https://support.apple.com/en-ca/guide/iphone/iph9a08e004e/ios) adapts goals to the user's
  schedule and protects planned pauses. PushApp similarly evaluates the user's approved plan rather than a
  universal volume target.

## 14. Out of scope

- Coins, Shop, paid boosts, or purchasable progression;
- public leaderboards or competitive ranking;
- Support Score formula;
- Achievement engine and Achievement catalog;
- implementation of future self-development tools;
- exact Buddy Level thresholds and economy balancing;
- final Buddy Level unlock catalog;
- retrospective scoring of qualitative message or journal content.

## 15. Acceptance criteria for future implementation

1. A user can explain the earning mechanism from the short product statement in §1.
2. Reporting Steps changes expected XP without changing the earned balance before day close.
3. Every eligible day settles exactly once and the award depends on percentage, not raw Step count.
4. Completing 100% advances Streak and grants any milestone bonus exactly once.
5. Qualifying support messages award the rising weekly sequence to three distinct eligible friends.
6. Users without friends can reach every Buddy Level and never receive an impossible social requirement.
7. Journey completion grants one large immediate award and cannot be farmed by reopening or duplication.
8. No approved miss, freeze, recovery, or plan adaptation removes lifetime XP or Buddy Level.
9. No purchase, app-open, configuration action, or raw content quantity can raise Buddy Level.
10. Offline, multi-device, week/day boundaries, RTL, accessibility, error, and legacy migration states are
    covered before release.

## 16. Remaining future decisions

These decisions do not block parking the feature, but must be closed before implementation:

1. final daily, Streak, friend-support, and Journey-completion values after economy simulation;
2. Journey-completion scope tiers and their assignment/versioning rules;
3. Buddy Level thresholds and progression curve;
4. the first approved Buddy Level unlock catalog;
5. exact day-close behavior across time zones, offline use, and multiple devices;
6. migration or retirement of XP/Buddy Levels already created by the experimental implementation;
7. whether the feature launches with an option to hide Buddy Level/progression surfaces.
