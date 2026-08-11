# PRD — Journey Support Circle

Status: **Ready** (pending a light security-privacy pass) — resolved by the founder 2026-08-11 (Decision Log
**D40**); prior: Approved 2026-08-10. **D40 resolution:** add a **consent/acceptance gate** before any sharing
(and fix, in the same slice, the current bug where a removed friend still sees shared snapshots). **Companion
IS IN**, but MVP scope = **system-generated Step progress only (names + statuses)** — NO images, NO user
free-text, no cloud image storage (proof images/text belong to `Future/Accountability_Ally`); access is
**revocable at any time**. store-compliance/cost are **N/A** for this slice. Build against the real Supabase
schema; validate with a seeded second account until general sign-up lands. Bundle names (Encourager/Companion)
pending product-guardian.
Stage: **MVP**.
Owner: founder + AI product team.
Related: `Friend_Profile_PRD.md`, `Future/Accountability_Ally_PRD.md`, Decision Log D29, Journey notifications, and the
separately specified Inbox / Direct Messaging feature.

---

## 1. Purpose and problem

A Journey owner needs to choose specific friends who may support that Journey, control what each Ally
can see, and revoke that access. The friend must knowingly accept the support relationship before any
Journey information becomes visible.

The feature turns existing friendship into consent-based, Journey-specific support without making a
user's Journeys public.

## 2. Product-philosophy fit

- Human support is invited, consensual, contextual, and reversible.
- Allies encourage; they do not punish or police the user.
- Privacy follows least access: every Ally sees only the Journey and detail explicitly shared with them.
- Refusing a request is a legitimate boundary and must never harm a score or relationship state.

## 3. Core model

- Friendship and Ally status are separate relationships.
- An Ally relationship belongs to exactly one Journey and references two users.
- A Journey may have multiple Allies without a product-level quantity cap in MVP.
- Each Ally has an independent permission bundle and invitation status.
- Removing an Ally does not remove friendship.
- Removing friendship removes every Ally relationship between the users in both directions.

### 3.1 Invitation statuses

At minimum:

- Requested;
- Accepted;
- Declined;
- Cancelled;
- Closed because the Journey ended or was deleted.

An initial invitation always requires the recipient's explicit acceptance. No Journey data becomes
available before acceptance.

### 3.2 MVP permission bundles

Use two clear presets with approved user-facing names:

**Encourager** (`מעודד`)

- Journey name;
- lifecycle status;
- total Step count;
- completed Step count;
- completion percentage.

The Ally cannot open the Step list.

**Companion** (`מלווה`)

- everything available to an Encourager;
- ability to open an Ally-facing Journey view;
- Step names and current Step statuses;
- completion report status: Done, Partial, or Not Done;
- report date/time;
- text or image the Journey owner explicitly chose to attach/share with that completion report.

The Ally cannot see a reason for non-completion, coach conversations, private reflections, or unrelated
profile/account data. The implementation must not infer broader access from the word “full.”

Changing between these two bundles does not require renewed acceptance because it changes exposure of
the Journey owner's own information. This rule applies only to the two MVP viewing bundles. The Ally
receives a clear notification describing the change and a clear in-app route to leave that Journey's
Support Circle. Notification previews never contain newly exposed Step/report content.
Moving to the Future Accountability Ally capability does require renewed acceptance.

## 4. Owner flow

From **My Journey**, the owner opens Support Circle and sees:

- invited member identity;
- current invitation status;
- current permission bundle;
- actions appropriate to that status.

The owner can:

- invite an existing friend;
- select the permission bundle before sending;
- cancel a Requested invitation;
- explicitly resend after a Declined invitation;
- change an Accepted Ally's permission bundle;
- remove an Accepted Ally.

Duplicate active invitations for the same friend/Journey are not created; the existing entry is shown
and managed. There is no time-based invitation expiry. Open invitations close automatically when the
Journey completes, is abandoned, or is deleted.

## 5. Recipient flow

The request shows before acceptance:

- inviter identity;
- Journey name;
- requested permission bundle and a plain-language list of exactly what it exposes;
- Accept and Decline actions.

Accept creates the active Ally relationship and notifies the sender. Decline changes only this request
and notifies the sender neutrally; it does not remove friendship and does not affect any score. The owner
may later send a new explicit request.

## 6. Friend-profile visibility

After acceptance, the Journey appears under “Journeys shared with me” on the Ally's view of the owner's
Friend Profile. It is rendered according to that Ally's permission bundle.

- Only Active Journeys appear.
- When Frozen, it disappears from the active list and the Ally receives an informational notification.
- Tapping that notification opens the owner's Friend Profile with the relevant context, from which the
  Ally may Cheer or message when those features are available.
- Resume restores the Journey with the prior permission, without a new invitation.
- Completion removes it from the active list, notifies all active Allies, and keeps only relationship
  history.
- Abandonment removes it from the list and retains only relationship history.
- Deletion removes it and closes/revokes every related request and permission.

## 7. Notifications

Create notifications for:

- new Support Circle request;
- request accepted;
- request declined;
- permission bundle changed;
- Ally removed;
- Journey frozen;
- Journey resumed;
- Journey completed;
- request closed because the Journey ended.

OS notification copy is privacy-safe by default: do not include a Journey name, Step, report text/image,
or sensitive lifecycle detail on the lock screen. Fetch the detail only after authenticated app open and
recheck authorization before resolving a deep link. Copy must be supportive and informational, never
guilt-inducing. Direct Messaging behavior belongs to the separate Inbox PRD.

## 8. Edge cases

- simultaneous accept and owner cancellation: the latest authoritative request version wins;
- simultaneous permission edits use optimistic concurrency/versioning and must not silently overwrite;
- accepting a stale/closed request returns a clear explanation;
- friendship removal immediately revokes all Journey access in both directions;
- removing one Ally leaves friendship and other Journey-specific Ally relationships intact;
- renamed users continue to resolve by stable ID;
- deleted/blocked users cannot receive, accept, or retain access;
- frozen/completed/abandoned/deleted Journeys reject invalid invitations/actions;
- legacy Journeys/users missing status or permission fields receive safe migration defaults;
- sensitive social detail requires connectivity and is not available as a durable offline cache. Encrypt
  short-lived cache data, use a short authorization lease, purge on local remove/block events, and
  revalidate on foreground;
- social invitations and permission changes require connectivity.

## 9. Technical/data requirements

The implementation must represent these concepts; exact schema placement may adapt to the existing
architecture:

- Support Circle membership/invitation ID;
- Journey ID, owner ID, Ally ID;
- invitation status and status timestamps;
- permission bundle/version;
- inviter and recipient decision timestamps;
- lifecycle audit fields sufficient for race resolution and account deletion.

Server-side authorization must enforce every read. A client permission flag alone is insufficient.
Notifications must be derived from idempotent domain events to avoid duplicates. Social payloads must
exclude reasons, coach content, reflections, private profile fields, and any Step data not allowed by the
current bundle. Store only the minimum information needed.

## 10. Acceptance criteria

1. A Journey owner can invite a friend with one of two permission bundles and manage the request from
   My Journey → Support Circle.
2. The recipient sees the Journey name and exact access before accepting.
3. No Journey data is visible before acceptance.
4. Multiple Allies with different permissions can support one Journey.
5. Each Ally sees only the authorized Active Journeys and fields on the owner's Friend Profile.
6. Permission changes notify the Ally and take effect without renewed acceptance between the two MVP
   bundles. The notification opens the friend's Journey view, from which the Ally can remove themselves
   from that Journey's Support Circle.
7. Cancellation, decline, reinvite, removal, freeze/resume, completion, abandonment, deletion, friendship
   removal, and stale-request races behave as specified.
8. All access is enforced server-side and verified by authorization tests.
9. The flow works in English/Hebrew, LTR/RTL, light/dark, and loading/empty/error states.

## 11. Out of scope

- mandatory approval of Step completion;
- proof-photo workflow;
- Accountability Ally (separate Future PRD);
- Journey collaboration or competition (Future Vision);
- group Support Circles;
- Inbox/Direct Messaging implementation;
- Support Score.
