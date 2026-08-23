# PRD — Notification Center

Status: **Approved product specification; ready for implementation planning.**
Stage: **MVP** for the in-app center and preferences surface; **Commercial dependency** for reliable
remote push delivery until the authenticated multi-device backend and push-token delivery path exist.
Owner: founder + AI product team.
Related: `Backfill/Notification_Content_Service_PRD.md`, `Smart_Notification_Timing_PRD.md`,
`Communication_Style_Profile_PRD.md`, `Done/Journey_Support_Circle_PRD.md`, `Inbox_Screen.md`,
`Friend_Profile_PRD.md`, `Tools_Documentation/Mirror_Feedback_PRD.md`.
Design references: `../UX/Notification_Center_Design.md` and
`../UX/Notification_Center_Design_Board.svg`.

---

## 1. Problem

PushApp already has social activity, Support Circle requests, Cheers and a notification-content service,
but there is no dependable place inside the app where a person can find and act on those events. Direct
messages belong in Inbox; mixing requests, social events and messages there would create duplicate counters
and make the meaning of each surface unclear.

The Notification Center gives account activity one calm, recoverable home. It must help the person notice
what matters and respond quickly without turning PushApp into an attention feed. Its success is not time in
the feed; it is whether relevant human support and required decisions reach the person with minimal noise.

## 2. Goals

- Add a Bell button on Home next to Inbox, carrying the count of new Notification Center items.
- Present one chronological in-app list of social activity and actionable requests.
- Allow safe, simple requests to be approved or declined inline.
- Keep direct and requested messages exclusively in Inbox.
- Keep in-app visibility and external device push as independent user preferences.
- Make seen state and request state consistent across devices once authenticated multi-device sync exists.
- Support Hebrew RTL and English LTR as first-class layouts, in both Light and Dark appearance.
- Preserve the privacy floor: a notification reveals no Journey/Step content unless the recipient is still
  authorized to see it at open time.

## 3. Non-goals

- No social engagement feed, ranking algorithm, recommendations, likes count, or infinite history.
- No direct messages, group/channel messages, or message requests from non-Friends; those belong to Inbox.
- No separate General / Requests tabs in MVP. They may be added later if real volume justifies them.
- No notification search, filters, delete controls, or “mark all as read”.
- No bulk approval, bulk decline, mass Cheer, or mass Message action.
- No automatic notification timing optimization in this feature. The Smart Notification Timing mechanism is
  separate and must treat explicit preferences here as hard boundaries.
- No implementation of the missing remote-push backend inside the UI slice; the interface and requirements
  are specified here so it can be connected without redesign.

## 4. Information architecture

### 4.1 Entry point

- Home top bar contains Avatar, Bell and Inbox in the locale-appropriate visual order.
- Bell shows a badge with the number of **new** items: `1`–`99`, capped visually at `99+`.
- No badge is rendered for zero.
- Bell and Inbox have independent counters. An object must never appear in both surfaces merely to increase
  visibility.

### 4.2 Center structure

- One mixed reverse-chronological list in MVP.
- Optional quiet temporal labels such as New, Earlier and a date boundary may divide the list.
- On entry with new items, position the list at the first new item. With none, open at the top.
- Do not restore an old scroll offset after the person has left for a meaningful period.
- Pull-to-refresh is available; live updates may insert new events while the center is open without moving
  the person away from what they are reading.

### 4.3 Empty state

Localized meaning:

> All quiet for now. When Friends Cheer you, need support, or send you a request, it will appear here.

The final copy is authored independently in every supported language; it is not assembled by mixing Hebrew
and English terms in one UI sentence.

## 5. What belongs here

| Family | Examples | Default row behavior |
|---|---|---|
| Requests | Friend request; Support Circle request; Mirror Feedback invitation; Accountability Ally request; future collaboration/competition invitation | Inline decision only when no additional review is required |
| Friends and social activity | Friend Cheered/Nudged; invited person joined; Friend completed a Journey or earned an Achievement | Open the relevant person/event; optional response actions |
| Help and support | A Friend is identified as needing support | Open Friend Profile; optional Cheer/Message |
| Shared Journeys | Journey frozen/resumed; Ally permission changed; report approved/rejected | Open the authorized Friend Journey or relevant detail |
| Achievements and celebrations | Achievement, Level or reward event for the owner; supported Friend completion | Open the relevant celebration or Achievement |
| System and account | Security, account state, required policy/account action, critical service/permission failure | Open required destination; cannot be disabled when essential |

### 5.1 Explicit exclusions

- A message from a Friend, channel or group → Inbox.
- A message request from a non-Friend → Inbox Requested state.
- Routine promotional/product-news copy → not “System and account” and never mandatory.
- The sender's own outbound action → no self-notification. Only the counterpart response or a relevant state
  change may create an item for the sender.

## 6. Event and row model

Each feed item needs at minimum:

```ts
type NotificationCenterItem = {
  id: string;
  recipientUserId: string;
  eventType: NotificationCenterEventType;
  family: NotificationPreferenceFamily;
  actorUserIds: string[];
  targetType: 'profile' | 'journey' | 'achievement' | 'request' | 'account' | 'none';
  targetId?: string;
  requestId?: string;
  createdAt: string;
  seenAt?: string;
  resolvedAt?: string;
  resolution?: 'approved' | 'declined' | 'cancelled' | 'expired' | 'irrelevant';
  groupingKey?: string;
  privacyClass: 'lock-safe' | 'in-app-authorized';
};
```

The stored event references stable identifiers and safe display metadata. It must not copy private Journey,
Step, report, Coach or free-text content into a general activity record. Display copy is resolved from the
current language, communication style and current authorization.

## 7. Seen, new and badge behavior

- `new` means `seenAt == null`; it is not a synonym for unresolved.
- An item becomes seen when its row actually enters the visible list viewport. No dwell-time threshold is
  required.
- Opening the screen alone does not mark unseen rows below the viewport.
- When an external device notification opens its exact event or target, that event becomes seen.
- Seen state removes the new dot and decrements the Bell badge.
- Seen state synchronizes to the account across devices. The existing on-device
  `notificationReads.ts` store is an acceptable POC fallback only; it does **not** satisfy the approved
  multi-device requirement and must later sit behind a repository/gateway capable of server sync.
- A request can be seen and remain unresolved/actionable.
- Storage failure degrades toward showing an item again, never hiding it or crashing the center.

## 8. Actions and hierarchy

### 8.1 Navigation is the row

If an item has a valid target, tapping the row opens it. Do not render a redundant View button. The open
operation revalidates authorization and lifecycle before navigation.

### 8.2 Decision pair

Use for a simple request that can be decided without more information:

- Approve is the single filled primary action.
- Decline is a quiet text action, not a second equal white button and not a red destructive action.
- Once the server confirms, actions are replaced by historical copy such as “You approved Amit’s request.”
- If the server fails, restore the actions and show a concise recoverable error.
- Disable both controls while one response is in flight; retries must be idempotent.

If approval requires choosing permissions, viewing evidence, writing a response, or any other confirmation,
the row does not offer quick actions. Tapping it opens the required detail flow.

### 8.3 Parallel positive responses

When several responses are all legitimate—e.g. Cheer back and Message—show them at equal visual weight as
two outlined actions with distinct icons/labels. A filled action would incorrectly teach that the other
positive response is undesirable.

### 8.4 Initial mapping

| Event | Inline actions |
|---|---|
| Cheer received | Cheer back · Message, equal weight |
| Friend needs support | Cheer · Message, equal weight |
| Friend completed Journey / earned Achievement | Cheer when acting on one person; grouped rows open detail only |
| Simple request | Approve primary · Decline quiet text |
| Request requiring additional review | None; tap opens detail |
| Shared Journey status/permission change | None; tap opens target |
| Sent request approved/declined | None; tap opens profile when valid |
| Invited Friend joined | Message / say hello where messaging is available |

## 9. Grouping

- Consecutive compatible events may group by event type and target when doing so does not hide a required
  decision.
- Show up to three overlapping avatars and localized copy such as “Maya and 4 others…”.
- Never group actionable requests into one decision row.
- A grouped row never performs a mass action. It opens a detail/person list where the user chooses whom to
  respond to.
- Grouping is presentation only; each source event retains its own id and seen state. Showing the group marks
  all member events represented by that rendered row as seen.
- The exact grouping time window is an implementation/configuration value and must be testable, not embedded
  in UI components.

## 10. Preferences

Settings → Notifications opens a dedicated preferences screen. Each optional family has two independent
controls:

1. Show in Notification Center.
2. Send an external device notification.

Families: Requests · Friends and social activity · Help and support · Shared Journeys · Achievements and
celebrations.

Rules:

- In-app and device controls are independent.
- An unresolved request remains accessible until resolved even if its family is subsequently hidden; the
  settings screen must explain this exception.
- Essential System and account notifications are always available in-app and, when urgent/security-critical,
  also on the device. They appear locked with a short explanation and cannot be disabled.
- Routine product news is not essential and cannot use this exception.
- Smart timing and communication-style systems operate only inside the permissions set here. They cannot
  reactivate a disabled family or channel.
- OS-level denial overrides all device-push toggles. Show the current permission state and a route to device
  settings; do not repeatedly prompt.

## 11. Retention and lifecycle

- Ordinary activity remains available for 30 days from `createdAt`, then is deleted/omitted.
- An unresolved request remains until it is approved, declined, cancelled, expired by its owning object, or
  becomes irrelevant—even if older than 30 days.
- A Support Circle request closes when its Journey ends, consistent with the approved Journey Support Circle
  rules.
- After resolution, the historical row follows the ordinary 30-day-from-creation rule. It is acceptable for
  an old request resolved after day 30 to disappear immediately after showing confirmation.
- If the actor, target, relationship or authorization disappears, prefer removing the item. If an already
  rendered stale row is tapped, revalidate, show a neutral “This is no longer available” state, and remove it.
- Account deletion removes authored activity according to the product’s deletion policy and removes all read
  preferences/read receipts owned by the deleted account.

## 12. External device notifications

The in-app center and external device notifications are distinct channels backed by the same canonical event
when applicable.

- External notification payloads carry opaque ids only; no private Journey/Step/free-text content.
- Lock-screen text follows `Notification_Content_Service_PRD` privacy classifications and current locale.
- Tapping resolves the canonical event, marks it seen, revalidates authorization, and routes to the target or
  a safe unavailable state.
- Duplicate delivery must not create duplicate feed items or repeat a request response.
- Active Hours and future Smart Notification Timing apply to eligible device delivery, not to whether an
  event exists in the in-app center.
- Remote push delivery remains blocked until authenticated device tokens, server delivery and revocation are
  implemented. The in-app center must not pretend remote delivery succeeded.

## 13. Localization, RTL/LTR and appearance

### 13.1 Language and direction

- The whole screen follows the selected app language, not the device language independently.
- Hebrew is RTL; English is LTR. No mixed-language UI sentences.
- Mirrored: back chevron, row reading order, avatar/content alignment, new-dot edge, action order, overlapping
  avatar direction and badge anchoring.
- Not semantically mirrored: icon meaning, numerals, times, user-authored names, media and status meaning.
- Logical layout properties (`start`/`end`, not hard-coded `left`/`right`) are required.
- Long translated strings wrap; actions may wrap or stack without clipping. Dynamic Type must not obscure
  actor, event meaning, timestamp or decision actions.
- Grouped names use locale-aware list formatting and pluralization.

### 13.2 Light and Dark

- Both themes are product states, not simple color inversion.
- Newness uses a soft themed surface plus a dot/label; never color alone.
- Cards retain a visible surface and edge in both themes, following the current Design System.
- Teal remains the primary decision accent; social parallel actions remain neutral/equal in both themes.
- Dark mode preserves WCAG AA contrast and avoids pure black/white glare.
- System status-bar and icon colors follow the active theme.

See `../UX/Notification_Center_Design.md` for the approved component hierarchy and four required QA
combinations: Hebrew Light, Hebrew Dark, English Light, English Dark.

## 14. Loading, offline and error states

- First load uses quiet row skeletons; never fabricate activity.
- Empty is distinct from failed. Failure shows a retry action while retaining cached rows when available.
- Offline: cached rows remain readable; navigation to cached local targets may work. Server-backed request
  actions are disabled with an offline explanation and become available after reconnecting.
- Pull-to-refresh failure keeps existing rows and shows a non-blocking status.
- Concurrent decision from another device resolves idempotently and updates to the authoritative historical
  state.
- A newly arrived item does not jump the list while the user is reading; show a compact “New activity” affordance
  to return to the top.

## 15. Accessibility

- Bell, badge meaning, new state, actor, event, timestamp and actions have accessible labels.
- Minimum tap target is 44×44 points.
- Screen readers announce unresolved request state and action result; the new dot is never the sole signal.
- Row navigation and nested actions have distinct accessible roles and do not trigger each other.
- Focus returns predictably after an inline action; failed actions are announced.
- Respect reduced motion; no pulsing badge or attention-seeking animation.

## 16. Privacy and abuse controls

- Server query is recipient-scoped; a client-supplied user id is never trusted for authorization.
- Before opening a Friend Journey, validate the recipient’s current Ally permission level.
- Do not include Dream/Journey/Step names, report text, proof media, Coach content or inferred need in a
  lock-screen social notification.
- A blocked user cannot generate visible social activity for the blocker. Existing rows from the blocked
  actor are removed or made unavailable according to the blocking PRD.
- Rate limits and deduplication are required for Cheer/Nudge and request-generated events so the center cannot
  become a harassment channel.
- Notification content must not enter analytics. Analytics may record event type, channel, delivery/open/action
  outcome and coarse latency using pseudonymous identifiers.

## 17. Technical architecture

- Keep event collection, grouping, filtering, seen calculation and action commands in framework-free core
  modules behind repository/gateway interfaces; UI components render derived view models.
- Use a canonical server event id for deduplication across realtime, refresh and external push.
- Suggested boundaries:
  - `NotificationCenterGateway`: list/subscribe events, mark seen, prune, read preferences.
  - `NotificationActionGateway`: approve/decline/open-domain commands using the owning domain service.
  - pure `buildNotificationCenterView`: authorization-safe mapping, grouping and localized presentation keys.
  - `NotificationPreferenceRepository`: account-scoped channel/family preferences.
- Do not make the feed the source of truth for friendship, Ally or Journey status. Actions call the owning
  domain; the row reflects the authoritative response.
- Reuse `buildNotificationContent` for lock-screen content. Do not reuse lock-screen-short copy as the richer
  in-app row contract when more authorized context is available.
- Migrate the existing local read store behind the gateway. POC may read it for backward compatibility, then
  upload/merge once; server `seenAt` wins only when it exists, otherwise preserve local seen ids. Never turn a
  migration failure into unseen-item loss.

## 18. Analytics and success criteria

Allowed product metrics:

- percentage of required requests resolved;
- median time from request creation to resolution;
- duplicate-event and failed-action rate;
- external push open-to-event match rate;
- number of external pushes per active account, guarded by the product goal of fewer interruptions;
- accessibility and localization defect rate.

Do not optimize for center opens, scrolling depth or time spent. A quiet center with important requests
resolved is a successful outcome.

## 19. Acceptance criteria

1. Bell appears next to Inbox and shows a correct account-synced `0…99+` new count.
2. Only rows actually exposed in the viewport become seen; no dwell time is required.
3. Opening an external notification marks the matching item seen and syncs the badge.
4. Requests remain actionable after being seen and beyond 30 days until their owning lifecycle closes them.
5. Simple requests support idempotent Approve/Decline; complex requests open detail instead.
6. Navigation is performed by tapping the row; no View button exists.
7. Decision pairs and parallel positive responses use the distinct visual hierarchies in §8.
8. Grouping never combines requests or performs a mass action.
9. Inbox contains messages/message requests; Notification Center does not duplicate them.
10. Optional in-app and device preferences are independent; essential account/security notices cannot be
    disabled.
11. Hebrew RTL and English LTR pass layout tests in Light and Dark, including long copy and Dynamic Type.
12. Deleted, blocked, unauthorized and stale targets reveal no private content and degrade safely.
13. Offline/error/concurrent-action states never lose a request or show a false success.
14. Ordinary items leave after 30 days from creation; open requests follow the explicit exception.

## 20. Required tests

- Unit: grouping keys, no request grouping, count cap, retention, viewport-to-seen reducer, preference matrix,
  locale-aware copy keys and action-state transitions.
- Integration: realtime + refresh deduplication; approve/decline authoritative response; cross-device seen;
  external-push deep link; stale/deleted/blocked/unauthorized target; account deletion.
- UI: Hebrew/English × Light/Dark; narrow screen; large text; long names; `99+`; zero state; loading; cached
  offline; error and retry; wrapped actions; screen-reader focus.
- Security: recipient-scoped query, forged target id, revoked Ally access, blocked actor, payload inspection,
  logs/analytics/crash reports and request-action replay.
- Regression: Bell and Inbox counts never count the same object; notification preferences never alter Journey
  reminder rules unless that separate category is explicitly added later.

## 21. Dependencies and staged delivery

### MVP implementation order

1. In-app Bell, list, current social event adapter and local fallback seen state.
2. Inline request actions for domain flows that already have authoritative backend commands.
3. Account-scoped seen/preferences gateway and multi-device synchronization.
4. External push delivery adapter and deep-link reconciliation when auth/push infrastructure is ready.

The screen may ship before remote push, but it must label only real capabilities and retain the adapter seam.

## 22. Approved / Future / Open

### Approved

Everything in §§1–21, including one mixed list, 30-day creation-based retention, the unresolved-request
exception, viewport-based seen without dwell time, action hierarchy, preference boundaries, cross-device
state, and four direction/theme variants.

### Future Vision

- General / Requests tabs if real volume requires them.
- More request types for collaboration and competition.
- Smart delivery/channel selection inside the user’s explicit boundaries.

### Open implementation choices delegated to engineering

- Exact database table/index shape and realtime transport.
- Exact grouping time-window configuration.
- Cache and pagination library choices consistent with the existing Repository abstraction.

These choices may not change product behavior, privacy constraints or the approved hierarchy without a PRD
update.
