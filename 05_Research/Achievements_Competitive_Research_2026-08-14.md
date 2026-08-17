# Competitive Research — Achievements and Recognition Systems

Date: 2026-08-14  
Status: Research input for `04_Product/PRD/Future/Achievements_Engine_PRD.md`; not a product decision.  
Scope: official product/help sources for Finch, Duolingo, Strava, Apple Fitness+, Fitbit/Google Health,
Todoist, Habitica, Calm, and Headspace.

## 1. Executive conclusion

Competitors repeatedly use five recognition patterns:

1. cumulative activity milestones;
2. streak milestones;
3. completion of a bounded challenge;
4. personal records;
5. profile trophy collections and sharing.

The most common systems are easy to understand, but many reward an app proxy rather than meaningful
real-world change. Finch counts opening/checking in, Todoist rewards adding tasks and use of product features,
and Habitica rewards every self-authored task. Those designs create precisely the inflation and engagement-for-
its-own-sake risks PushApp wants to avoid.

The strongest transferable pattern is not a competitor's catalog. It is the combination of:

- a small, visible catalog of durable recognition;
- milestones based on bounded outcomes or repeated eligible days/weeks;
- a personal trophy case rather than a public leaderboard;
- a clear explanation of what was earned;
- a bounded unlock celebration and optional sharing;
- eligibility based on authoritative events, not screen activity or raw self-created task volume.

## 2. Competitor patterns

### 2.1 Finch

Finch's streak grows from a daily app check-in; opening the app is sufficient. It offers pause and repair
mechanisms. This makes the system gentle and accessible, but the recognized behavior is product return rather
than demonstrated self-care.

Finch also runs bounded themed challenges. Its June 2026 Helping Hand challenge required completing 14 days
within the month, then awarded a profile Achievement and an optional decorative/physical collectible. This is
a stronger outcome definition than an app-open streak: the event has a theme, a finite window, an explicit
completion condition, and a permanent profile artifact.

**PushApp lesson:** adopt bounded Journey-completion recognition and permanent profile artifacts; reject
app-open eligibility. A future creator Journey may define a special bounded Achievement only under a separate
catalog-governance policy, not automatically for every creator.

Sources: [Finch streaks](https://help.finchcare.com/hc/en-us/articles/37780736136205-Understanding-Streaks),
[Finch Helping Hand challenge](https://help.finchcare.com/hc/en-us/articles/45450409820173-June-2026-Goal-Challenge).

### 2.2 Duolingo

Duolingo collects major milestones, personal records, social actions and unusual behavior awards on the
profile. Some awards have multiple difficulty levels. Examples published by Duolingo include adding friends,
a one-year streak, time-of-day surprises, perfect lessons, daily XP records and league results. The redesign
made awards more visible, celebratory and shareable.

**PushApp lesson:** progressive tiers, a single collection surface and shareable unlocks are effective UX.
Avoid awards based on app-time quirks, competitive leagues, or volume metrics that can become the user's goal
instead of transformation.

Source: [Duolingo Achievement badges](https://blog.duolingo.com/achievement-badges/).

### 2.3 Strava

Strava separates several kinds of recognition: completed challenge badges in a Trophy Case, recent trophies
on the profile, activity-specific achievement banners, and personal/best efforts. Challenge trophies appear
only after the final required milestone. Performance records can be tied to recorded activity, GPS/power data,
or official results. Privacy controls affect public eligibility.

**PushApp lesson:** separate durable catalog Achievements from one-off Journey completion cards and from
personal outcome metrics. When evidence can be authoritative, use it. Show only a small recent selection on a
profile and place the full collection behind a dedicated page.

Sources: [Strava Trophy Case](https://support.strava.com/en-us/articles/15402068-the-strava-trophy-case),
[Strava Best Efforts](https://support.strava.com/en-us/articles/15401646-best-efforts-overview),
[Strava profile](https://support.strava.com/en-us/articles/15402175-your-strava-profile-page),
[Strava activity privacy](https://support.strava.com/en-us/articles/15401987-activity-privacy-controls).

### 2.4 Apple Fitness+ and Fitbit / Google Health

Apple Fitness+ presents Awards in its activity experience, lets the user inspect details, and can recommend
the next activity that would maintain a streak or earn the next award. This connects recognition to a useful
next action rather than leaving it as a static trophy.

Fitbit historically used badges, but Google's announced 2026 Google Health transition removes badge support
and deletes historical badges, while shifting celebration toward the Coach. That change is an important
counterexample: a catalog can become legacy clutter, and deleting supposedly durable recognition damages the
meaning of permanence.

**PushApp lesson:** the Coach may use an earned Achievement to suggest the next meaningful action, but the
Achievement must remain independently durable. Catalog versioning and retirement rules are required from the
start; earned recognition should not disappear merely because the presentation strategy changes.

Sources: [Apple Fitness+ Awards](https://support.apple.com/guide/fitness-plus/see-personalized-recommendations-dev4b830ebf6/ios),
[Google Health transition and badge removal](https://support.google.com/googlehealth/answer/17068213).

### 2.5 Todoist

Todoist Karma combines a single level, trends, daily/weekly goals and streaks. It grants progress for adding
tasks, completing them, using advanced features and meeting task-count goals; overdue work can remove points.
Users can configure days off, vacation mode, celebrations, goals, or disable Karma entirely.

**PushApp lesson:** configuration and opt-out are valuable, but task creation and feature usage are poor
Achievement evidence. They reward operating the tool and make trivial-task inflation rational. PushApp should
not remove a permanent Achievement because later behavior declined.

Source: [Todoist Karma](https://www.todoist.com/help/articles/introduction-to-karma-OgWkWy).

### 2.6 Habitica

Habitica gives experience, currency and items for completing user-authored Habits, Dailies and To-Dos. More
difficult or neglected tasks can yield more reward. Parties and Quests turn individual completion into shared
progress and rewards.

This is transparent and playful, but it relies on self-authored task truth and is therefore easy to optimize
as a game. It also punishes missed recurring tasks through health loss.

**PushApp lesson:** social contribution can be meaningfully recognized, but not by counting messages or every
self-created Step. PushApp should not punish failure or make difficulty/repeated neglect a route to more
valuable Achievements.

Sources: [Habitica FAQ](https://habitica.com/static/faq),
[Habitica overview](https://habitica.com/static/overview?mobile-app=true&theme=wiki).

### 2.7 Calm and Headspace

Calm tracks history, calendar activity and a streak across a defined list of eligible content types; check-ins
do not count. Headspace similarly restricts its run streak to eligible meditation sessions and deduplicates
multiple sessions within a time window.

**PushApp lesson:** if a reporting or consistency Achievement is adopted, define an explicit eligibility list
and a time-window cap. Not every action that happens in the product should count.

Sources: [Calm stats and streak](https://support.calm.com/hc/en-us/articles/115002473827-How-to-View-Your-Meditation-Stats-History-and-Streak-in-Calm),
[Headspace run streak](https://help.headspace.com/hc/en-us/articles/215730567-How-does-the-run-streak-feature-work).

## 3. Pattern comparison

| Pattern | Common examples | Benefit | Risk | PushApp direction |
|---|---|---|---|---|
| App-return streak | Finch | Immediate and simple | Rewards opening the product | Reject as Achievement evidence |
| Raw task volume | Todoist, Habitica | Transparent progress | Trivial-task inflation | Reject |
| Eligible-session streak | Calm, Headspace | Clear qualification | Can still create pressure | Use only for the separately defined Streak family, based on the user's actual daily commitments |
| Bounded challenge completion | Finch, Strava | Clear beginning and end | Catalog/content governance | Journey completion already provides the safer PushApp equivalent |
| Progressive difficulty/tier | Duolingo | Long-term collection | Endless escalation | Use a small fixed number of tiers |
| Personal records | Duolingo, Strava, Fitbit | Measures improvement against oneself | Domain metrics differ | Future outcome-metrics layer, not initial global Achievement catalog |
| Trophy case/profile | Strava, Duolingo, Finch | Durable identity and recall | Can become clutter | Adopt dedicated page; friends see earned safe artifacts only |
| Public competition | Duolingo leagues, Strava segments | Strong external motivation | Comparison, gaming, privacy | Reject for initial system |
| Social/team progress | Habitica | Recognizes mutual effort | Spam, collusion, unequal access | Recognize bounded eligible support events across distinct people/weeks |

## 4. Recommended initial PushApp catalog

The research supports beginning with **five**, not six, families. A catalog should not add a weak family merely
for symmetry.

1. **Journey completion** — completed eligible Journeys.
2. **Consistency** — distinct eligible days on which all scheduled daily commitments were completed.
3. **Honest reporting** — distinct eligible reporting days, capped at one contribution per day; Done, Partial
   and Not Done may qualify because the recognized behavior is honest reflection, not success.
4. **Support given** — bounded support moments triggered by an actual friend/Ally need state, deduplicated per
   recipient and need event.
5. **Growing together** — sustained participation in Support Circles across distinct weeks and relationships,
   not raw invitations or contact count.

**Explicit rejection:** “return after failure” is not an Achievement family. It creates a prerequisite failure
and therefore a perverse route to recognition. The Coach may encourage a return without minting a collectible
reward.

Potential future families, only after their source features exist: completion of eligible reflection/growth
tools; verified personal outcome records; contribution to the creator/community ecosystem. Login, app opens,
notification clicks, task creation, raw message volume, unaccepted invitations and product exploration do not
qualify.

## 5. Remaining decisions

1. Approve or amend the five-family initial catalog.
2. Decide whether the user's own page shows locked families and exact next-tier progress.
3. Decide whether the public total counts earned families or earned tiers.
4. Decide whether Support Given and Growing Together are meaningfully distinct enough to remain separate.
5. Choose uniform tier material names versus family-specific evolution visuals.
6. Define thresholds only after event availability and anti-abuse rules are mapped; competitor numbers should
   not be copied because their eligible events are materially different.

