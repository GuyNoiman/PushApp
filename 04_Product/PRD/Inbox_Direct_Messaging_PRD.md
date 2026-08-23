# PRD — Inbox and Direct Messaging

Status: **Approved product specification; ready for architecture and implementation planning.**
Stage: **MVP** for one-to-one messaging, Message Requests, mute/block, unread state and the Inbox UI.
**Future** for Groups and Channels beyond a locked “Soon” preview.
Owner: founder + AI product team.
Related: `Notification_Center_PRD.md`, `Friend_Profile_PRD.md`,
`Done/Journey_Support_Circle_PRD.md`, `Tools_Documentation/Mirror_Feedback_PRD.md`,
`Future/Tool_Invitation_Inbox_and_Push_Delivery_PRD.md`, `../UX/Inbox_Screen.md`.
Design contract: `../UX/Inbox_Messaging_Design.md`.

---

## 1. Problem

PushApp already renders an Inbox-shaped surface, but it is not messaging. It currently mixes Friends,
received Cheers, Ally Journey progress, Friend Requests and Support Circle invitations; “New message” only
opens a coming-soon alert; Groups is permanently empty; and there is no conversation, message persistence,
read state or cross-device sync.

The Inbox must become the dependable home for human conversation. Social events and relationship requests
belong in the Notification Center. The Inbox contains only direct messages, future Group/Channel messages,
and Message Requests from people who are not yet allowed to enter the recipient’s conversation list.

## 2. Product principles

- Messaging exists to enable real support, not to maximize chat activity.
- One person-pair has one direct conversation, regardless of whether the people are Friends, Allies, both, or
  neither.
- Friendship, Ally membership and messaging permission are distinct relationships.
- Private human messages are end-to-end encrypted. PushApp cannot read ordinary conversation content.
- The recipient controls who may enter their Inbox. Blocking is always available.
- Empty/deferred UI is honest: Groups is visibly locked and labelled Soon, never presented as functional.
- App language, direction and appearance are first-class: Hebrew RTL and English LTR; Light and Dark.

## 3. Goals

- Replace the current mixed feed with real conversation threads.
- Support text/emoji direct messages and approved fixed Cheer templates.
- Add Message Requests for non-Friends/non-Allies.
- Preserve one thread when a relationship changes.
- Show reliable unread state and an account-synced Home mail badge.
- Allow mute, block and reporting from the conversation/request surfaces.
- Support external new-message notifications with privacy-safe defaults.
- Build an encrypted, offline-tolerant, multi-device architecture without exposing message content to Coach,
  analytics, search infrastructure or other product engines.

## 4. Non-goals

- No photos, video, voice notes, files, general attachments, calls or location sharing in MVP.
- No editing after send and no “delete for everyone”.
- No typing indicator in MVP.
- No conversation archive or conversation deletion in MVP; blocking is the only conversation-level removal
  control.
- No Group/Channel creation or messaging yet.
- No AI reading, summarization, suggested reply generation or Coach access to messages.
- No Journey-specific conversation threads and no automatic Journey context card.
- No delivery of Friend Requests, Support Circle requests, Cheers, Achievements or Journey lifecycle events
  through Inbox; those belong to Notification Center.

## 5. Current implementation and required realignment

Current code at `app/src/app/inbox.tsx` already provides a localized screen, search field, four tabs,
conversation-style cards, initials avatars, Light/Dark theming and real Friend/Ally/request data. It is a
useful visual shell but its domain model is wrong for messaging.

Required changes:

- Replace Friends/Allies tabs with **Chats**.
- Keep **Groups** visible but locked and labelled **Soon**.
- Replace the current Requested content with **Message Requests only**.
- Remove Cheers/Nudges, Friend Requests, Support Circle invitations and Ally progress rows; their canonical
  destination is Notification Center or Friend Profile.
- Replace the current `inboxWaitingCount` inputs with unread conversation and open Message Request counts.
- Replace the coming-soon Compose alert with the New Message flow.
- Add real thread navigation, persistence, synchronization, encryption and delivery.

No immutable `Done/` PRD is modified or superseded by this file.

## 6. Information architecture

### 6.1 Entry point and badge

- Home mail button opens Inbox.
- Its badge equals:
  - number of direct conversations containing at least one unread incoming message; plus
  - number of open Message Requests.
- Several unread messages in one approved conversation count as one badge item.
- Badge caps visually at `99+` and synchronizes across devices.
- Inbox and Notification Center counters never count the same object.

### 6.2 Tabs

1. **Chats** — every approved one-to-one conversation, newest activity first.
2. **Groups** — visible, locked, labelled Soon; tapping opens a concise explanation, not an empty list.
3. **Requests** — pending Message Requests only, with a count when non-zero.

Do not create separate Friends and Allies tabs. A person who is both would otherwise duplicate the same
thread, and relationship type does not change what a conversation is.

### 6.3 Search

- Inbox search filters existing Chats by current display name and `@username`.
- Search is local over loaded conversation metadata; it never decrypts/searches message bodies on the server.
- New Message has a separate people search (§9).

## 7. Conversation identity and permission

- Exactly one canonical direct conversation exists for each unordered pair of account ids.
- Entering from Friend Profile, Ally profile, Home support, Notification Center or New Message opens that same
  conversation.
- Navigation source does not inject Journey/Dream/Step context into the thread.
- Accepting a Message Request grants durable messaging permission but does not create Friendship or Ally
  membership.
- Accepting an Ally invitation grants messaging permission because the recipient explicitly agreed to support
  that person. Future messages go directly to Chats.
- Becoming Friends also approves any pending Message Request automatically.
- Once a conversation is approved, removing Friendship or Ally membership does **not** return it to Requests.
- Messaging permission persists until Block. There is no automatic revocation inferred from a relationship
  change.

## 8. Message Requests

### 8.1 Who enters Requests

A user with no approved messaging permission may message another discoverable, unblocked user. The first
message creates a Message Request. The sender may continue sending within the pending conversation, subject
to the limits below.

### 8.2 Limits

- Each message in a pending request: maximum 500 characters.
- Maximum **five messages per rolling 24 hours per pending sender-recipient conversation**.
- Further attempts show when sending becomes available again; they are not silently discarded.
- Server-configured global rate limits and abuse heuristics also limit high-volume outreach across recipients.
- Approved conversations use a high technical rate limit intended only to stop automation.
- A request expires 30 days from its original `createdAt`; later messages do not extend expiry.

### 8.3 Recipient experience

- Opening a request does not expose Seen/read state to the sender.
- Recipient can **Accept chat**, **Delete request**, **Block**, or **Report**.
- Accept moves the thread to Chats and enables read receipts from that point onward.
- Delete removes the request for the recipient and sends no decline/status event to the sender. It is not a
  Block; the sender may create another request subject to current limits.
- Block removes the request and prevents discovery, messaging and future requests according to the blocking
  contract.
- Report uses the approved report-reason flow; after submission, ask whether to Block.
- A pending request may show sender profile photo, display name and `@username`, but not private profile or
  Journey information.

### 8.4 Automatic approval

If the pair becomes Friends or the recipient accepts an Ally role while the request is pending, the existing
thread moves to Chats without creating a duplicate. The recipient’s first opening in approved state may mark
messages read normally.

## 9. New Message

- New Message opens people search.
- First results: Friends and approved Allies, labelled by relationship for recognition only.
- Search may find another user by exact/prefix `@username` subject to privacy and blocking rules.
- Selecting a person opens the existing canonical thread or creates one.
- Messaging an unapproved person clearly explains before send that the message will become a request.
- Contact-book invitation remains owned by the separate Invite feature and is not added to this composer.

## 10. Message capabilities

### 10.1 MVP content

- Plain Unicode text, including emoji.
- Approved fixed Cheer/encouragement templates represented as a typed message subtype, localized for the
  recipient rather than stored as translated prose.
- Approved conversation message length: maximum 2,000 characters.
- Empty/whitespace-only messages cannot send.
- Links remain text and use platform safe-link handling before opening.

### 10.2 Delivery states

- Sending → Sent → Delivered → Read, with honest degraded states Failed/Retry.
- UI displays Sent and Read as the primary visible checkpoints, Instagram/WhatsApp style; Delivered may be
  available to accessibility/detail without adding noise.
- A request never exposes Read before acceptance.
- No typing indicator in MVP.
- Sending is idempotent with a client-generated message id; retries cannot duplicate a message.

### 10.3 Editing and deletion

- Messages cannot be edited.
- A participant may hide/delete an individual message from their own view only.
- The other participant’s copy is unaffected.
- There is no unsend/delete-for-everyone.
- A report may explicitly include a decrypted copy of the reported message/context even if the reporter then
  hides it locally; explain this before submission.

## 11. Conversation screen

- Header: Back, profile photo/initials, display name, optional relationship label, overflow menu.
- Tapping identity opens the permitted profile surface.
- Show a quiet one-time/occasional encryption explanation, not a permanent promotional banner that consumes
  the conversation.
- Messages group by sender/time with locale-formatted day separators.
- Own bubbles align to logical end; received bubbles to logical start. This mirrors under RTL/LTR.
- Composer remains reachable above the keyboard and respects safe areas.
- Overflow menu in MVP: Mute notifications, View profile, Block, Report.
- No Journey title is surfaced merely because navigation originated from a Journey.

## 12. Muting

Mute options:

- 1 hour;
- 8 hours;
- 1 week;
- until turned back on.

Mute suppresses external device notifications for that conversation. Messages still arrive, update unread
state and count toward the Inbox badge. The conversation visibly indicates muted state without shaming the
sender. Mute preference is account-scoped and synchronizes across devices.

## 13. Blocking and reporting

- Blocking is available from approved conversations and requests.
- Block prevents profile discovery by the blocked account, direct messages, new requests and new social
  contact according to the approved blocking feature.
- The blocker may be warned about active mutual Support Circle relationships before confirmation; removing
  those relationships is a separate explicit choice, not automatic.
- Existing conversation content may remain visible to the blocker unless they hide individual messages; no
  new messages can be exchanged.
- Report reasons use the approved list: harassing messages, repeated unwanted messages, fake account,
  impersonation, and Other with text.
- Reporting an end-to-end encrypted conversation sends only the user-approved decrypted evidence and minimum
  metadata needed for moderation.
- Abuse systems may use non-content signals—request/message volume, account age, blocks/reports and rate-limit
  events—but may not inspect ordinary encrypted content.

## 14. End-to-end encryption

### 14.1 Required guarantee

All human one-to-one message bodies are end-to-end encrypted. Only participants’ authorized devices can
decrypt them. Server, PushApp staff, Coach, experts, analytics and AI cannot read message content.

### 14.2 Key and device behavior

- Every device has a cryptographic identity; conversation keys are distributed only to authorized devices.
- Adding/removing a device and key changes are auditable to participants through quiet security notices.
- Encrypted secure storage supports new-device/history restoration using an account/device-protected recovery
  method. Exact cryptographic primitives and library are architecture/security decisions, not UI code.
- If secure restoration cannot authenticate/decrypt, the product does not bypass encryption. Explain that
  older history cannot be restored and continue with a new secure session when safe.
- Key material never enters logs, analytics, crash reports or ordinary application storage unprotected.

### 14.3 Server-visible metadata

Minimum metadata may include participant ids, conversation/message ids, encrypted payload size bucket,
timestamps, delivery/read receipts, request state, mute/block state and key-envelope/device metadata. Retain
only what the service needs and document it in the privacy contract.

### 14.4 Push payload

External push contains opaque conversation/message ids. By default lock screen shows sender name plus “sent
you a message,” not message content. A user may enable previews in Settings; preview delivery must still use
an encryption-safe mechanism and respect OS lock-screen controls.

## 15. Notifications and preferences

- New incoming approved message: Inbox unread state + optional external device notification.
- New Message Request: Inbox Requests count + optional generic external notification.
- Messages never appear as Notification Center feed items.
- Default external preview hides body content.
- Settings may enable content previews. This is off by default and explained as a privacy choice.
- Tapping push opens the conversation/request and marks approved messages read only after the screen actually
  opens and renders them.
- Mute, global messaging-push preference, OS permission and Active Hours are all respected.

## 16. Sorting and unread state

- Chats sort by latest message/activity timestamp, newest first.
- Unread does not override chronological order.
- Unread conversation uses bold preview/name plus a dot/count; meaning is not color-only.
- Opening a conversation marks only rendered incoming messages read and synchronizes receipts/badge.
- Requests remain open until accepted/deleted/blocked/expired, independently of whether viewed.
- Read/delivery state is account-synchronized across devices and conflict-resolved by monotonic timestamps.

## 17. Retention and account lifecycle

- Human conversation history has no automatic deletion timer.
- Blocking does not rewrite already delivered copies.
- Account deletion removes profile and account-owned server data/keys. The counterpart retains already
  delivered message copies, labelled under “Deleted account,” consistent with previously approved sent-media
  behavior.
- Undelivered messages and pending requests from the deleted account are deleted and never delivered.
- The deleted account cannot be opened or messaged.
- Account export includes the requesting participant’s decryptable conversation data only when secure export
  authentication succeeds; never export the counterpart’s private account data beyond what appears in the
  conversation.

## 18. Groups and Channels

- Groups tab remains visible in MVP with a lock and Soon label because the founder wants the future space to
  be legible.
- Tapping shows a concise localized explanation. No fabricated groups, empty functional controls or fake
  composer.
- Group/Channel messaging is a separate Future PRD because membership, roles, moderation, encryption and
  leaving/deletion semantics differ substantially from one-to-one messaging.

## 19. Localization, direction and appearance

- Selected app language controls the entire surface.
- Hebrew uses RTL; English uses LTR. No mixed-language UI sentences.
- Logical start/end properties control avatar, bubble, timestamp, badge, Back icon and action order.
- Do not semantically mirror clocks, media or status icons.
- User-authored messages retain their own Unicode bidirectional behavior inside locale-aligned bubbles.
- Dates, times, pluralization and name lists use locale formatters.
- Light and Dark are separately authored with visible card edges and WCAG AA contrast.
- Dynamic Type may wrap rows/actions and grow bubbles without hiding status or composer.

## 20. Offline, concurrency and failures

- Cached conversations remain readable offline if their local encrypted keys are available.
- Outgoing offline messages show Pending and send in original order after reconnecting.
- Request acceptance, deletion, Block and Report require server confirmation; offline UI explains and does not
  display false success.
- Duplicate realtime/refetch events deduplicate by canonical message id.
- Two-device send/read/accept races resolve idempotently from authoritative state.
- Expired/deleted request while open becomes unavailable without leaking new content.
- Failed decrypt shows an unavailable-message state and security recovery path, never ciphertext.
- Clock/timezone changes do not reorder canonical server timestamps incorrectly.

## 21. Data model and architecture boundaries

Suggested domain entities:

```ts
type DirectConversation = {
  id: string;
  participantIds: [string, string];
  permission: 'requested' | 'approved' | 'blocked';
  requestedAt?: string;
  approvedAt?: string;
  expiresAt?: string;
  lastMessageAt?: string;
};

type EncryptedMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  ciphertext: string;
  keyVersion: string;
  kind: 'text' | 'cheer_template';
  createdAt: string;
  deliveredAt?: string;
};
```

Read receipts, device key envelopes, per-user hidden-message ids, mute preferences, reports and Block state
belong in separate scoped records. Never treat UI row state as the relationship source of truth.

Architecture requirements:

- Framework-free messaging engine over gateway/repository interfaces.
- Supabase may transport/store ciphertext and authorized metadata behind strict row-level policies.
- Encryption/decryption remains in a dedicated audited boundary, not React components.
- All send/accept/read commands are idempotent.
- Search indexes conversation metadata only, never plaintext bodies.
- External push adapter receives privacy-safe envelope data, not plaintext by default.

## 22. Accessibility

- Every conversation announces name, latest-message state, timestamp, unread count and mute state.
- Minimum 44×44 point targets.
- Screen reader separates row navigation from overflow/actions.
- Sent/failed/read changes and rate-limit errors are announced.
- Message Request explains that reading is private and approval does not create Friendship.
- Locked Groups tab communicates disabled/Soon state before activation.
- Reduced motion disables nonessential bubble/list animation.

## 23. Analytics and success

Allowed metrics: encrypted send/delivery/failure rates, request acceptance/block/report rates, rate-limit
events, unread synchronization failures and coarse latency. Never log message text, decrypted content, link
targets, encryption keys or semantic classifications.

Do not optimize for number of messages or time in chat. Success is dependable support with low unwanted-contact
and delivery-failure rates.

## 24. Acceptance criteria

1. Chats/Groups-locked/Requests replace Friends/Allies/Groups/Requested without duplicate person threads.
2. Cheers, Friend/Ally requests and Journey progress are absent from Inbox.
3. Compose opens existing thread or creates one canonical thread.
4. Unknown contact creates a request; up to five pending messages per rolling 24 hours, 500 characters each.
5. Request reading is private; Accept/Delete/Block/Report behave as specified.
6. Approved conversation remains approved after Friendship/Ally removal.
7. Text/emoji/templates send with honest states; no attachments/edit/unsend/typing.
8. Sent and Read appear Instagram/WhatsApp style; Requests expose no Read before approval.
9. Badge counts unread conversations plus open requests and syncs across devices.
10. Mute durations suppress push but not receipt or badge.
11. Default push hides content; the user may enable previews in Settings.
12. Human content is end-to-end encrypted and absent from server-readable logs/analytics/Coach/AI.
13. Deleted account behavior preserves delivered counterpart copies under Deleted account.
14. Hebrew RTL and English LTR pass Light/Dark, long-copy and Dynamic Type QA.
15. Offline/retry/concurrent-device paths never duplicate, falsely confirm or leak ciphertext/private content.

## 25. Required tests

- Unit: canonical pair id, permission transitions, five-per-24h request limit, character limits, expiry fixed
  to creation, sorting, unread badge, mute windows and local hide.
- Integration: encrypted send/deliver/read, offline retry, realtime/refetch deduplication, request automatic
  approval on Friend/Ally acceptance, relationship removal persistence, Block/Report, account deletion.
- Security: forged participant id, row-level access, replay, revoked device, key rotation, secure restore,
  ciphertext/log/push inspection and reporter-consented evidence.
- UI: all four language/theme combinations; keyboard; long names/messages; bidi user text; large text;
  locked Groups; empty/error/offline/rate-limited/expired/deleted account states.
- Regression: Notification Center and Inbox counters/content remain disjoint.

## 26. Approved / Future / Open

### Approved

Everything above, including five pending messages per rolling 24 hours, durable approval, E2EE, request
expiry, mute durations, content-preview default, and locked Groups visibility.

### Future Vision

- Groups and Channels.
- Media, proof-photo subtype, voice, calls, replies/reactions, edit/unsend and optional richer safe content.

### Open implementation choices delegated to architecture/security

- Audited cryptographic protocol/library and precise secure-recovery mechanism.
- Database/index/table shape and push provider.
- Configurable global anti-spam thresholds beyond the founder-approved per-request limit.

These choices may not weaken E2EE, product behavior, privacy or recovery honesty without an approved PRD
continuation.
