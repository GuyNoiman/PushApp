# Inbox and Direct Messaging — Approved Design Contract

Status: **Founder-approved direction, 2026-08-23.**
Stage: **MVP**.
Related PRD: `../PRD/Inbox_Direct_Messaging_PRD.md`.

## 1. Direction

The Inbox is calm human correspondence, not an activity feed. Cards are used for conversations because the
current Design System requires a visible surface and edge, but internal content stays light: one avatar, one
name, one preview, one time and one unread signal.

## 2. Inbox layout

```text
┌──────────────────────────────────────┐
│ Inbox                    New message │
│ [ Search conversations             ] │
│  Chats       Groups · Soon   Requests│
├──────────────────────────────────────┤
│ (Avatar) Name                  Time  │
│          Last message           (2)  │
├──────────────────────────────────────┤
│ (Avatar) Name                  Time  │
│          Last message                │
└──────────────────────────────────────┘
```

- Chronological order; unread styling does not reorder.
- Groups remains locked and labelled Soon.
- Requests count is separate from unread conversation styling.
- New Message is a real compact action, not a dead icon.

## 3. Conversation layout

- Header: Back · identity/relationship · overflow.
- Quiet encryption explanation; do not permanently consume a large card.
- Received bubbles at logical start; own bubbles at logical end.
- Read sits quietly under the most recent relevant own message.
- Composer contains one text field and one Send control; no attachment control in MVP.
- Overflow: mute, profile, block, report.

## 4. Message Request layout

- Explain before the message that reading is private and Accept does not create Friendship.
- Show minimal public sender identity and the pending messages.
- Action hierarchy:
  1. Accept chat — filled primary.
  2. Delete request — neutral outline.
  3. Block or report — quiet safety action.
- Show expiry only when useful and close enough to matter; never manufacture urgency.

## 5. New Message layout

- Search by display name or `@username`.
- Friends/Allies appear first with a small relationship descriptor.
- Selecting a known person opens the canonical thread.
- Before first send to an unknown person, explain that it creates a Message Request.

## 6. RTL/LTR and Light/Dark

Required QA matrix:

| Language | Direction | Light | Dark |
|---|---|---|---|
| Hebrew | RTL | Inbox + Conversation | Requests + New Message |
| English | LTR | Inbox + Conversation | Requests + New Message |

- Use logical start/end for avatars, previews, bubbles, timestamps, unread badges and Back.
- User-authored bidi text keeps natural Unicode behavior inside its bubble.
- Light uses warm near-white page, white cards and visible hairlines.
- Dark uses deep green-neutral page, lifted card surfaces and AA contrast.
- Teal means primary/approved action; unread also requires weight/count, not color alone.
- Safety actions use gentle coral text only when needed, never alarm styling.

## 7. States to design and test

- Empty Chats; empty Requests; locked Groups.
- Loading/cache/offline/error/retry.
- Read/unread/muted/deleted-account conversation.
- Sending/sent/read/failed/retry message.
- Pending request under limit; five-message limit reached; expired/deleted/blocked request.
- Long name, long preview, large type, keyboard open and mixed-direction user text.

The interactive concept in the associated Codex task demonstrates Inbox, Conversation, Request and New
Message in Hebrew RTL and English LTR with Light/Dark switching. This document and the PRD are the permanent
implementation contract; sample names and copy in the concept are illustrative.
