# PRD — Achievements Engine

Status: **Future Vision — specification in progress; continue product session before approval.**
Stage: **Future** — explicitly removed from MVP by the founder on 2026-08-12.
Owner: founder + AI product team.
Related: B3, `Points_and_Leveling_PRD.md`, `Missions_PRD.md`, `Support_Score_PRD.md`, completion
celebration I1, Friend Profile, Achievement sharing, `../../../05_Research/Competitive_Landscape.md`, and
`../../../05_Research/Achievements_Competitive_Research_2026-08-14.md`.

---

## 1. Purpose

Recognize the different ways a person invests in real growth and helps other people grow. Achievements make
meaningful patterns visible as durable identity markers; they do not exist merely to increase activity inside
the application.

The system must celebrate more than Journey completion. It may recognize consistency, honest reporting,
real-world Step completion, recovery, social support, and meaningful participation across the PushApp
ecosystem.

## 2. Product principles

- The catalog is predefined and shared by all users. Achievements are not generated from the private topic or
  text of an individual Journey.
- Achievements are not sensitive information and may appear on the user's Achievement page and through the
  separate Friend Profile entry point.
- Achievement names and descriptions must reveal only the recognized behavior category, never a Dream,
  Journey, Step, report reason, health behavior, or private conversation.
- Achievements are separate from XP, Buddy Level, Coins, Missions, Support Score, and Journey-completion
  celebrations.
- A valid earned Achievement is permanent. Correcting a duplicated or fraudulent event is a separate integrity
  operation and must not silently remove a legitimate Achievement.
- The system rewards meaningful real-world behavior, not opening screens, repeated tapping, notification
  clicks, or time spent in the app.
- There are no public leaderboards or comparisons of people by Achievement count.

## 3. Tiered Achievement families

An Achievement family represents one meaningful behavior over time. Every initial family uses the same six
recognizable progression stages:

1. Certificate;
2. Bronze Medal;
3. Silver Medal;
4. Gold Medal;
5. Trophy;
6. Super Trophy (working user-facing name; final localization may use a clearer mastery name).

The founder's reference is SoloUno's category-specific progression: Awareness Fox for reports, Attention
Panda for urge work, Freedom Phoenix for streak, and Willpower Dragon for challenges. PushApp does not need to
copy creatures. The transferable principle is that each meaningful activity family develops independently
and has a recognizable visual identity.

The six stages are a common **meaning ladder**, not one generic medal recolored six times. The family defines
the central object, silhouette and metaphor; the tier changes its material, detail, scale and prestige. A
user should recognize the family from the artwork without reading its label. Color is never the only tier or
family signal: shape, iconography, tier name and accessible text also differ.

The first Certificate is already an earned Achievement. Before it is earned, the family may appear to its
owner as a locked silhouette if the final locked-catalog decision permits it. A newly earned stage replaces
the previous stage as the family's primary display, while the detail view may preserve the full earned-stage
history and dates. Earned stages never regress.

Tier requirements must increase in a way that reflects sustained or broadened behavior, not merely larger
tap volume. Each family needs its own eligibility and anti-abuse definition.

## 4. Approved initial Achievement families

The initial catalog contains five families. Exact names, thresholds and final art remain to be approved, but
the behavioral categories and family-specific visual direction are approved.

### 4.1 Journey completion

Recognizes completed eligible Journeys, including meaningful completion across time. It does not count raw
Step volume, Journey creation or empty/trivial Journeys.

**Visual direction:** a path, mountain, summit or flag. The artwork may grow from a simple summit certificate
through bronze/silver/gold summit medals into a mountain trophy and a rare mastery summit.

### 4.2 Consistency

Recognizes distinct eligible days on which the user completed all daily actions required by their actual
plan. It does not count app opens, notification clicks or arbitrary activity volume.

**Visual direction:** a spark, flame or unbroken ring. The visual develops from a small spark certificate to
increasingly substantial flame medals and a final flame/ring trophy.

### 4.3 Honest reporting

Recognizes a sustained pattern of reporting reality rather than disappearing when progress is imperfect.
Eligibility for Done, Partial and Not Done remains to be finalized with strict time-window caps; private
report text and reasons are never used as Achievement content.

**Visual direction:** a mirror, eye or truth mark. The visual develops from a truth certificate to increasingly
refined mirror/truth medals and a transparent or crystal-like mastery trophy.

**Rejected family — return after failure:** returning to action after a miss, interruption, or freeze does
not earn an Achievement and does not advance an Achievement tier. Although the Coach may acknowledge and
encourage the return, making it a collectible reward would create a perverse path in which a user must first
fail or interrupt their Journey to qualify. PushApp must never make deliberate failure an efficient route to
recognition. Founder decision, 2026-08-14.

### 4.4 Support given

Recognizes bounded help provided when a friend or Ally is genuinely marked as needing support. Progress must
be deduplicated per recipient and need event and broaden across distinct people or weeks at higher stages.

**Visual direction:** an outstretched hand lifting, protecting or offering a heart. This family represents the
act of helping, not friendship count.

### 4.5 Growing together

Recognizes sustained, consensual participation in Support Circles and mutual growth relationships across
time. It does not reward collecting contacts, sending invitations or merely being listed as an Ally.

**Visual direction:** a handshake, hug or two figures rising together. This family represents an ongoing
relationship, deliberately distinct from the one-directional helping hand of Support Given.

The engine must not reward message volume, repeated invitations, unsolicited outreach, or reciprocal farming.
Friendship and Support Circle membership alone may be a milestone, but higher tiers should represent durable,
meaningful participation rather than collection of contacts.

### 4.6 Deferred candidate families

- inviting friends who genuinely create and retain an account;
- completing eligible in-app growth tools, reflection tools, journaling, vision work, or future assessments;
- future contribution to the ecosystem where a separate feature defines what counts as meaningful.

Simple login/open events must not earn an Achievement merely for engagement. If an early-exploration Mission
recognizes learning the product, that belongs to Missions and does not become an enduring growth Achievement
by default.

No sixth family is added merely to make the catalog symmetrical. A future family enters only after its source
feature exists and its behavior meets the same meaningful-growth and anti-abuse tests.

## 5. Achievement page and presentation

The user's Achievement page shows:

- every earned Achievement;
- the current tier for each earned family;
- the total number of earned Achievements, using a future-approved counting rule;
- an understandable description of why each Achievement was earned;
- the earned date for the current tier or each tier, subject to design;
- optional progress toward the next tier only when progress can be shown without pressure or sensitive data.

Friend Profile provides a distinct button that opens the friend's earned Achievement page. It never exposes
locked Achievements, exact private activity history, Journey topics, or report contents.

Open counting issue: determine whether the total counts Achievement families or every earned tier. The UI
must not use an inflated total that makes one tiered family appear as many unrelated achievements.

## 6. Unlocking and celebration

- Unlocking is driven by authoritative domain events and is idempotent.
- An event can update progress in more than one valid family, but one user action must not mint duplicate tier
  unlocks on retry, sync, or multiple devices.
- A newly earned tier receives a bounded celebration distinct from the final Journey ceremony.
- The celebration may offer the separate Share Achievement flow when that feature is available.
- Historical events may be backfilled only under an explicit migration policy; users must not receive a burst
  of misleading celebrations after an upgrade.

## 7. Privacy and integrity

- Achievement progress stores counters and eligibility evidence, not private report text or Coach content.
- Social Achievements must use server-authoritative accepted relationships and eligible support events.
- Deleted accounts and removed friendships must follow the underlying data-retention rules. Previously valid
  personal Achievements remain unless the integrity model explicitly proves they were minted erroneously.
- Blocking, repeated add/remove cycles, self-invites, duplicate accounts, and coordinated farming must not
  create progress.
- Offline events may queue, but unlock only once after authoritative reconciliation.
- Analytics may record catalog identifiers and unlock events, never sensitive source context.

## 8. Initial technical direction

The engine should be configuration-first:

- stable Achievement-family and tier identifiers;
- localized presentation kept separate from eligibility logic;
- event eligibility rules and thresholds versioned with the catalog;
- idempotent progress and unlock ledger;
- provenance sufficient to debug an unlock without storing private content;
- server authority for social/cross-device achievements when backend support exists;
- deterministic replay tests for duplicate, delayed, reordered, and corrected events.

Existing sample data or dormant screens do not constitute an approved implementation.

## 9. Edge cases

- a user crosses several tiers through one historical import;
- tier thresholds change after users have earned a tier;
- one Step completion is later made invalid by an authoritative correction;
- the same event arrives from multiple devices;
- an invited person creates several accounts;
- two users repeatedly add/remove one another or exchange empty support messages;
- a user completes a Journey with no Steps or with artificially inflated Steps;
- an Achievement label is long in translation or displayed in RTL;
- the next tier would reveal a sensitive behavior count on a Friend Profile;
- an Achievement family is retired or replaced;
- the user deletes all source history while an earned Achievement remains;
- the app is offline when a threshold is crossed.

## 10. Open questions for the next session

### Catalog and meaning

1. What are the final localized names for the five families and six stages, especially the working label
   “Super Trophy”?
2. Do Not Done and Partial reports earn reporting progress, and what prevents empty or dishonest reports?
3. Does a Journey need minimum eligible content or duration before its completion can contribute?

### Thresholds and anti-abuse

4. Which thresholds use lifetime totals, distinct days, distinct weeks, distinct people, or Journey breadth?
5. What exactly qualifies as “helped a friend” without requiring the recipient to rate private support?
6. How do encouragement and messages qualify without rewarding spam?
7. Can user-created Steps contribute indirectly through Consistency, and what eligibility floor prevents
   trivial-plan inflation?
8. Do accepted invitations ever contribute, or remain excluded in favor of sustained participation?

### UX and lifecycle

9. Does the total count families or earned stages?
10. Are locked Achievements visible, partially visible, or hidden?
11. Is next-stage progress shown everywhere, only on the Achievement page, or not at all?
12. Does the detail view show every prior stage and earned date?
13. What celebration and sharing template belongs to a stage unlock?
14. How are catalog retirement, threshold changes, and historical backfill communicated?

## 11. Out of scope until promoted

- final names, rendered art assets, or tier thresholds;
- implementation of event processing or backfill;
- XP, Coin, or Level balance changes;
- Support Score calculation;
- Missions;
- public feeds, rankings, or competitive comparison;
- Achievement-based feature locks or commercial entitlements.
