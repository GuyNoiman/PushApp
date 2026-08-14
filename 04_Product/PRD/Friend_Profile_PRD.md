# PRD — Friend Profile

Status: **Approved** — with a D40 clarification (founder, 2026-08-11). **D40 resolution:** direct messaging is
**deferred post-MVP (honors D29)** — this resolves the earlier D29 contradiction — but must be **planned into
the architecture now (keep a seam)** so it can land later without rework. The rest of the profile (header,
relationship summary, shared-Journey list, Cheer) stays as specced; the Achievements entry soft-depends on B3.
**Scope narrowed 2026-08-13 (founder): Level and the Achievements entry are deferred out of the MVP slice —
see §4.6. The requirements themselves are preserved unchanged as the approved target.**
Stage: **MVP**.
Owner: founder + AI product team.
Related: `Own_Profile_PRD.md`, `Journey_Support_Circle_PRD.md`, `Future/Accountability_Ally_PRD.md`,
B1 Leveling, B3 Achievements, Decision Log D29,
and the separately specified MVP Inbox / Direct Messaging feature.

---

## 1. Purpose and problem

The Friend Profile should answer one question: **how can I understand and support this friend?**
The current app has a friends list but no dedicated friend page. A profile is needed to establish
identity, summarize the relationship, expose only Journeys deliberately shared with the viewer, and
offer supportive actions.

This is not a public activity feed and not a place for the friend's private account information.

## 2. Product-philosophy fit

- Supports real human encouragement around personal transformation.
- Keeps support contextual and consent-based.
- Shows Level and Achievements only as evidence of real-world growth, never as a social ranking.
- Minimizes personal-data exposure and avoids engagement-for-engagement's-sake.

## 3. Competitor references

- [Strava profile](https://support.strava.com/en-us/articles/15402175-your-strava-profile-page): identity,
  recent achievements, a trophy case, and summarized performance rather than making the profile the
  activity list.
- [Habitica profile](https://habitica.fandom.com/wiki/Profile): separates identity, stats/Level, and
  Achievements while excluding private tasks, email, and financial details.
- [Finch friends](https://help.finchcare.com/hc/en-us/articles/37780316582413-Adding-Friends): mutual
  friendship, progress-aware support, and relationship-level concepts.
- [Finch Accountability Buddies](https://help.finchcare.com/hc/en-us/articles/37943772406413-Accountability-Buddies):
  goal visibility is specific to the people with whom it was shared and can be revoked.

PushApp's distinction: the profile is personalized per viewer and reflects real Support Circle
relationships around finite Journeys.

## 4. MVP requirements

### 4.1 Header

Show:

- profile photo; initials are the default when no photo exists;
- display name;
- `@username`;
- Level and progress toward the next Level — **DEFERRED out of the MVP slice, see §4.6**;
- a compact relationship summary.

Never show to friends:

- email;
- age or birthday;
- country;
- gender or form of address;
- authentication-provider information;
- any other private profile field used only to adapt the app.

### 4.2 Relationship summary

Count every Journey relationship between the two users, including Active, Frozen, Completed, and
Abandoned Journeys. Show at minimum:

- number of Journeys in which the viewed friend supported the viewer;
- number of Journeys in which the viewer supported the viewed friend;
- a total relationship count;
- a clear breakdown by lifecycle status so an Abandoned Journey is not implied to be a success.

Support Score is not part of this feature or the MVP. It is a separate Future feature within the
Points/Leveling system; see `Future/Support_Score_PRD.md`.

### 4.3 Journeys shared with me

Below the relationship summary, show only **Active Journeys** that this friend explicitly shared with
the current viewer through an accepted Support Circle invitation.

- Content is personalized to the viewer.
- Each card obeys that viewer's permission bundle.
- Frozen, Completed, and Abandoned Journeys are not shown in this list; they remain in relationship
  history only.
- A Frozen Journey reappears automatically with the same permission if resumed.
- A completed Journey disappears from the active list and cannot be opened through the profile.

The exact Journey card and Ally-detail presentation belong to `Journey_Support_Circle_PRD.md`.

### 4.4 Achievements entry

**DEFERRED out of the MVP slice — see §4.6.** The requirement below is preserved unchanged as the
approved target for when B3 exists.

Provide a distinct action that opens a separate Achievements page showing:

- every Achievement earned by the friend;
- the total number earned;
- a safe empty state.

The Achievement taxonomy, categories, unlock behavior, and visual system belong to B3 and must not be
invented inside this feature. The catalog is global and shared by all users. Achievements are based on
general quantities and behaviors — for example amount completed, Streak duration, friends invited, and
support given — and never reveal a Journey's subject or sensitive domain. All earned Achievements are
therefore visible to accepted friends.

### 4.5 Friend actions

Provide an overflow/action control containing:

- send Cheer;
- send a direct message;
- remove friend.

Direct Messaging is an approved MVP dependency but is specified separately with the Inbox. Until it
exists, do not ship a dead or misleading message action.

Removing a friend requires confirmation with real impact counts, for example: removing this friend
will remove them from X Journeys they support for you and remove you from Y Journeys you support for
them. On confirmation, friendship and all Ally relationships in both directions are removed. Removing
one Ally relationship alone never removes the friendship.

### 4.6 MVP scope narrowing — Level and Achievements deferred (founder, 2026-08-13)

This PRD was approved **before** the founder's 2026-08-12 decision that moved **B1 Leveling** and
**B3 Achievements** out of the MVP to Future (`MVP_Task_List.md` rows B1/B3;
`Future/Points_and_Leveling_PRD.md`, `Future/Achievements_Engine_PRD.md`). Both surfaces this PRD
asks for in §4.1 and §4.4 therefore have **no approved mechanism behind them** in the MVP.

**Decision (founder, 2026-08-13): omit both from the shipped MVP profile.** The build keeps a clean
seam — `SocialProfile.buddySummary.level` stays on the wire and the header/action layout leaves room —
so each surface can be switched on when its engine is specified, with no rework of this screen.

**Reasoning (why omit rather than show what exists):** the experimental XP/Level code still in the
repo is explicitly *not* the approved future mechanism. Rendering a number from it would show friends
a value that is guaranteed to change meaning later, which is worse than showing nothing — and the
Achievements catalog this PRD depends on (§4.4: "must not be invented inside this feature") does not
exist at all. Nothing in the vision shrinks here; both move later in the roadmap, per CLAUDE.md §3.3.

**Consequence for acceptance:** criterion 2 in §8 is met **partially** in the MVP slice — identity,
relationship summary, and viewer-authorized Active Journeys ship; Level and the Achievements entry do
not. Criteria 1, 3, 4, 5, 6, 7 are unaffected and remain in full force.

## 5. Profile-photo display

The friend's photo is read-only on this screen. Show initials when no photo exists. Photo editing and
upload belong only to the authenticated user's own profile and are specified in `Own_Profile_PRD.md`.
Server authorization must prevent one user from mutating another user's profile or media.

## 6. States and edge cases

- loading, empty, partial-data, error, and retry states;
- legacy users missing new fields use safe defaults;
- renamed usernames refresh on the next synchronization/app start; an old username search reports that
  the handle is no longer active;
- removed, blocked, or deleted users cannot expose stale shared Journey data;
- the Friend Profile and its sensitive social detail require connectivity; do not durably cache Step
  names, completion text, or report media for offline viewing. Encrypt any short-lived cache, use a short
  authorization lease, purge it on local remove/block events, and revalidate on foreground;
- duplicate Cheers must be safely handled;
- social actions require connectivity; the rest of the offline-first app remains usable;
- account deletion replaces identity in retained recipient-owned message history with “Deleted user.”

## 7. Technical/data requirements

- The server/gateway must return a viewer-scoped profile response; do not fetch all Journeys and rely
  only on client-side filtering.
- Use stable internal user IDs, never email or username, for relationships.
- Relationship aggregates must be derived from authoritative Support Circle/Journey lifecycle data.
- Permission changes and friendship removal must invalidate or version cached profile data.
- Accessibility: screen-reader labels for image/actions, scalable text, sufficient contrast, RTL-safe
  layout, and large touch targets.
- No new hard-coded sample profile data may ship as a fallback.

## 8. Acceptance criteria

1. An accepted friend can open the profile from every supported friend entry point.
2. The profile shows identity, Level, relationship summary, Achievements entry, and only viewer-authorized
   Active Journeys. **(MVP slice: Level and the Achievements entry are deferred — see §4.6.)**
3. Personal fields listed in §4.1 never appear or arrive in the friend-profile payload.
4. Different friends can see different Journey sets and detail for the same profile owner.
5. Freeze, resume, complete, abandon, permission change, friendship removal, and account deletion update
   the page according to this PRD.
6. Friend removal shows accurate impact counts and removes all Ally relationships in both directions.
7. The page works in English/Hebrew, LTR/RTL, light/dark, and empty/error/loading states.

## 9. Out of scope

- editing one's own private profile/settings;
- the Achievement system itself;
- Inbox and Direct Messaging behavior;
- public profiles or public Journey discovery;
- a social feed;
- collaboration or competition modes;
- Support Score (separate Future feature).
