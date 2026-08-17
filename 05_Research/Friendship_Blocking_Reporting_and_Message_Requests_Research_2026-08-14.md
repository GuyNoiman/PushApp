# Competitive Research — Message Requests, Blocking, and Reporting

Date: **2026-08-14**  
Status: **Initial research complete; founder decisions required before the Friendship Lifecycle PRD.**  
Related gap: `../04_Product/PRD/PRD_Coverage_Gaps.md` PC-08 and PC-04/PC-17.

---

## 1. Research question

How should PushApp allow contact from non-friends while protecting private profile information, giving users
immediate control over unwanted contact, and escalating credible reports without enabling coordinated abuse?

The required product objects are distinct:

- friendship;
- message request;
- accepted conversation;
- Journey Support Circle relationship;
- personal block;
- user/content report;
- platform moderation action.

None should silently stand in for another.

## 2. Competitor findings

### 2.1 Discord — separate Message Requests and spam filtering

Discord sends messages from eligible non-friends into a separate Message Requests area. The recipient must
approve the request before direct conversation begins. Suspected automated spam may be moved to a more hidden
Spam area. The recipient can inspect limited context, accept, ignore, or report. Discord also offers safety
alerts and direct blocking for some potentially risky interactions.

Relevant lessons:

- an unknown sender does not deserve ordinary Inbox placement or read access merely by sending a message;
- message-request approval is permission to converse, not friendship;
- suspected spam may be separated without claiming certainty;
- global and contextual controls can limit who may send requests;
- a request should expose enough identity to decide safely, but not private profile information;
- a non-friend cannot send an unlimited sequence while awaiting approval.

Sources: [Discord Message Requests](https://support.discord.com/hc/en-us/articles/7924992471191-Message-Requests)
and [Discord Safety Alerts](https://support.discord.com/hc/en-us/articles/18210977897239-Discord-Safety-Alerts).

### 2.2 Reddit — report the specific message, then block separately

Reddit recommends reporting the specific chat message so moderators receive the relevant evidence. Blocking
is a separate action for ending contact. A request that is merely ignored may disappear, making evidence harder
to report afterward.

Relevant lessons:

- report a concrete message whenever the complaint concerns communication;
- preserve the reported item and minimum surrounding context in a protected moderation record even if the user
  later deletes or blocks the conversation;
- reporting does not guarantee or imply punishment;
- after reporting, offer blocking as a separate protective choice;
- the reporter should not need to keep harmful content visible to preserve the report.

Source: [Reddit — report a chat message](https://support.reddithelp.com/hc/en-us/articles/360043035472-How-do-I-report-a-chat-message).

### 2.3 Strava — block from profile, remove connections, hide communication

Strava exposes Block under the profile's three-dot menu. Blocking removes connection relationships, prevents
new connection/contact, hides most profile/activity detail, suppresses each user's comments from the other,
and removes their messaging conversation. The blocked person is not notified. Strava separately lets users
flag a specific received message, sending a copy to its Trust & Safety team, and offers profile-level reasons
such as impersonation, scam, or spam.

Relevant lessons:

- Block belongs on every accessible profile and in conversation/request safety controls;
- blocking is immediate personal protection and should not wait for moderation;
- the blocked person is not notified and should not receive a definitive “you were blocked” response;
- report reasons should distinguish profile identity problems from communication/content problems;
- a specific reported message provides stronger evidence than a profile-only allegation;
- blocking and deleting the user's local view must not delete the moderation evidence already submitted.

Sources: [Strava blocking](https://support.strava.com/en-us/articles/15402163-manage-followers-and-block-athletes),
[Strava messaging](https://support.strava.com/en-us/articles/15401651-messaging-on-strava), and
[Strava spam/reporting](https://support.strava.com/en-us/articles/15402158-spam-bots-and-unwanted-solicitations).

## 3. Market pattern

Common patterns:

- separate requests from ordinary conversations;
- explicit acceptance before free messaging;
- Block in the profile overflow menu and often in the conversation/request menu;
- no block notification;
- report reasons plus a specific-message path;
- a post-report prompt offering Block;
- immediate personal block independent of later platform review;
- moderation receives a protected snapshot of the reported content rather than relying on mutable live data.

Less consistently solved:

- coordinated false reports;
- transparently distinguishing temporary restrictions from account punishment;
- keeping Support Circle/professional relationships independent from friendship while still cutting them during
  a safety block;
- minimum public identity that allows informed consent without exposing private profile data;
- evidence retention after account deletion, balanced against privacy/legal requirements.

## 4. Recommended PushApp model

### 4.1 Non-friend message request

A non-friend may send one initial text request under strict limits. It appears in **Requested**, not the normal
conversation list. Until acceptance:

- the sender cannot see private profile information or read receipts;
- the recipient sees only the sender's minimum public identity and the initial message;
- the sender cannot send additional messages, attachments, links, images, voice, or repeated reminders;
- the recipient may Accept, Decline/Ignore, Report, or Block;
- accepting allows conversation but does not create friendship or Ally status;
- declining does not notify the sender of the reason and applies a cooldown before another request, if repeat
  requests are allowed at all.

This request model belongs primarily to the future Messaging/Inbox PRD but its safety behavior depends on the
same block/report infrastructure as friendship lifecycle.

### 4.2 Minimum non-friend identity

People who are not friends should see only what is needed for discovery and consent:

- display name;
- `@username`;
- profile image or initials;
- verified/professional status where real and relevant;
- shared-context label only when safely derived, such as “invited you to support a Journey.”

Do not expose age/date of birth, country, pronouns/form of address, email, Dreams, Journeys, Steps, relationship
counts, achievements, level, Support Score, friends, Allies, or activity. A future public-profile policy may
approve additional fields separately.

### 4.3 Personal block

Block should immediately and symmetrically prevent meaningful discovery and contact:

- neither account can find the other through username search or recommendations;
- existing friendship is removed;
- pending friendship, message, invite, and Support Circle requests between them are cancelled;
- no new messages, requests, Cheers, Nudges, invitations, or Support Circle relationships;
- existing conversations become inaccessible to both ordinary clients;
- all accepted Support Circle relationships between them close and Journey access ends immediately;
- neither receives notifications about the other's actions;
- public/aggregate surfaces must avoid revealing actionable profile links;
- the blocked user receives generic unavailable/not-found behavior, never confirmation of who blocked them.

Block differs from ordinary unfriend. Because it is a safety boundary, it should close Support Circle access
automatically rather than ask whether to preserve it.

The blocker can view and reverse blocks under Settings → Privacy & Safety → Blocked accounts. Unblocking does
not restore friendship, conversations, requests, or Ally status; new consent is required.

### 4.4 Report

Profile-level reason taxonomy recommendation:

- Harassment or threatening behavior;
- Repeated unwanted contact or spam;
- Fake account or automated account;
- Impersonation;
- Scam, fraud, or suspicious solicitation;
- Sexual or otherwise inappropriate content;
- Hate or abusive content;
- Self-harm or immediate safety concern;
- Other — required bounded free text.

When reporting a specific message, attach that message and a small amount of surrounding context, with a clear
disclosure. When reporting a profile without a message, optional bounded details help moderation but are not
required for urgent categories.

After submission, ask:

> Would you also like to block this profile?

Report submission must not silently block, except where the user chose a combined **Report and block** action.
Blocking must not wait for a moderation response.

### 4.5 Moderation escalation instead of “five reports = ban”

Five distinct reports can be an escalation signal but should not produce an automatic permanent/global block.
A fixed threshold is easy to weaponize against coaches, creators, minority users, former partners, or anyone
targeted by a coordinated group.

Recommended response tiers:

1. **Immediate severe-content path:** credible imminent danger, child sexual exploitation, explicit threats,
   or similarly severe categories enter urgent review independent of report count and may trigger a temporary
   protective restriction.
2. **Pattern escalation:** reports from several distinct, established accounts across a reasonable time window,
   with non-identical behavior and evidence, raise moderation priority.
3. **Temporary friction:** while risk is high, restrict new non-friend message requests, invitation generation,
   or messaging rate. Existing private Journeys remain available unless directly implicated.
4. **Human review:** moderation reviews evidence, report independence, account history, blocks, appeal history,
   and false-report indicators.
5. **Decision and appeal:** warning, feature restriction, temporary suspension, permanent suspension, or no
   action; significant sanctions require a reason category and appeal path where legally/product appropriate.

The founder's example of five independent reports should be treated as a configurable queue threshold, not a
public rule and not a sufficient truth test. “Irregular timing” alone does not prove human independence; bots
can randomize timing and real victims may report together after discussing abuse.

## 5. Data and privacy direction

- Blocks are private; only the blocker sees their blocked list.
- Reporters are not disclosed to the reported user.
- Store a report snapshot, reason, reporter/reported IDs, object/message IDs, evidence digest/copy where
  disclosed, timestamps, disposition, reviewer audit, and appeal relationship.
- Protect report evidence from ordinary staff access; use role-based moderation access and audit every view.
- Do not export other users' reported messages to the reporter or reported account as ordinary account data;
  legal access/export handling requires jurisdictional review.
- Account deletion must not automatically destroy evidence required for safety/legal defense, but retention
  must be bounded and disclosed.
- False-report detection must not become opaque reputation scoring visible to users.

## 6. Edge cases requiring PRD decisions

- user blocks a friend who is also an Ally in one or both directions;
- user blocks a professional coach or a future matched Ally;
- simultaneous block and message/report/support acceptance;
- block occurs while a message or notification is being delivered;
- unblock followed by immediate search/request;
- report submitted after sender deletes message/account;
- reported content edited between viewing and submission;
- duplicate reports of the same content by one account;
- five reports are coordinated, retaliatory, or generated by account farms;
- one credible severe report versus many low-evidence spam reports;
- both users block each other;
- blocked identity remains visible inside immutable historical artifacts or moderation evidence;
- existing completion cards, shared exports, or external links;
- username change, deleted account, suspended account, or reused username;
- offline block/report and uncertainty about whether protection reached the server;
- minor accounts, guardian approval, and age assurance;
- malicious “Other” free text, very long evidence, PII, or illegal media;
- moderation queue unavailable or no human team during early product stage;
- report subject requests appeal or data access;
- device cache briefly shows stale blocked content.

## 7. Founder decisions needed before PRD

1. Does Block automatically end every Support Circle relationship in both directions? **Recommendation: yes,
   because Block is a safety boundary; ordinary unfriend remains optional cleanup.**
2. May a non-friend send only one initial text before acceptance? **Recommendation: yes; no links or media.**
3. After Decline/Ignore, can the same person request again? **Recommendation: not for 30 days; Block remains
   available.**
4. Is minimum non-friend identity limited to display name, username, photo/initials, and real verification?
   **Recommendation: yes.**
5. Approve the report categories in §4.4, including a distinct urgent-safety category?
6. Should five distinct credible reports place an account into priority review and temporarily disable new
   non-friend outreach, without automatic suspension? **Recommendation: yes.**
7. During the earliest release, before a staffed moderation operation exists, should reporting be enabled?
   **Recommendation: only if there is a real monitored queue, urgent escalation owner, retention policy, and
   response process. A dead report button creates false safety.**

