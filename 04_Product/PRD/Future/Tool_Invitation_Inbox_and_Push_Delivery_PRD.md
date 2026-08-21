# PRD — Tool Invitation Delivery via Inbox and Push

Status: **Future dependency placeholder; not implemented and not approved for release.**
Stage: **Future / Commercial**.
Owner: shared social and notification infrastructure.
First consumer: `../Tools_Documentation/Mirror_Feedback_PRD.md`.

---

## 1. Purpose

Provide one reusable, server-authoritative delivery path for invitations created by interactive Tools. When a
user sends a Tool invitation, the recipient receives both:

1. an actionable request in PushApp's Inbox;
2. a privacy-safe push notification that deep-links to that same request.

This is delivery infrastructure, not the Mirror Feedback experience itself. Future Tools may reuse it only by
registering their own typed invitation payload and consent screen.

## 2. Current gap

The product does not yet provide the complete production path for creating, persisting, authorizing, showing,
notifying, and resolving a Tool invitation across accounts. A design preview or local notification does not
count as delivery.

Until this PRD ships, consumers must declare the dependency and must not show a successful-send state in
production.

## 3. Core requirements

- A verified authenticated sender selects eligible recipients and confirms send.
- Backend creates one immutable invitation request per recipient with a typed Tool context, expiry, status, and
  idempotency key.
- Inbox displays pending requests separately from ordinary conversations and notifications.
- Push notification contains no question text, response mode, answer status, or sensitive Tool content.
- Tapping push or Inbox opens the same consent/request screen.
- Recipient may accept, decline, block sender, or report the invitation.
- Accepting grants access only to that invitation response flow; it creates no Friend, Ally, or Support Circle
  relationship.
- Sender sees only the status granularity allowed by the consuming Tool. Confidential Tools may suppress all
  contributor-level response/open/decline state.
- Expiry, cancellation, deletion, blocking, and duplicate retry reconcile Inbox and push state.
- Push denied/unavailable: Inbox remains authoritative; do not repeatedly request permission.

## 4. Notification contract

Example lock-safe copy:

> Alex invited you to share private feedback in PushApp.

The title/body and deep link are resolved from approved notification content at delivery time. Do not place
answers, questions, Dream/Journey names, confidentiality mode, or relationship inference on the lock screen.

## 5. Data and security

- Server authorization verifies sender, recipient, Tool type, invitation state, and expiry on every action.
- Use opaque invitation IDs; never encode identity or Tool answers in URLs.
- Rate-limit sender and recipient abuse; enforce block/report before delivery.
- Audit create/send/open/accept/decline/cancel without storing sensitive Tool content in analytics/logs.
- Push tokens are account/device scoped, revocable, and never exposed to Tool engines.
- Account deletion and block state cancel pending invitations and prevent future delivery.
- Deep links cannot bypass consent or open another recipient's invitation.

## 6. Edge cases and tests

- recipient has several devices, no active push token, notifications denied, or app uninstalled;
- invitation created twice by retry, sender cancels during delivery, or recipient acts on two devices;
- push arrives after request expired/deleted/blocked;
- recipient account deleted or username changed;
- confidential consumer must not leak per-person status to sender;
- offline Inbox shows cached state but server revalidates before action;
- RTL, accessibility, notification privacy settings, and locked-screen redaction;
- abuse rate limits, forged deep link, recipient mismatch, replay, and enumeration attempts.

## 7. Acceptance criteria

1. One send creates one authorized Inbox request per recipient and at most one push attempt per delivery event.
2. Inbox remains the source of truth when push fails or is denied.
3. Push and Inbox route to the same consent-gated request.
4. Accepting creates no unrelated social relationship.
5. Consumer-specific status visibility is enforced server-side.
6. Cancellation, expiry, blocking, reporting, deletion, retry, and multi-device actions are idempotent.
7. Security/privacy, notification, deep-link, offline, RTL, and accessibility tests pass.

## 8. Related work and open questions

Related: Inbox specification/backfill, notification delivery/content service, deep linking, block/report,
verified auth, and future invitation flows.

Open questions:

1. Which existing Inbox surface owns Tool requests, and does it need a dedicated Requests filter?
2. What default expiry applies per Tool?
3. Should senders receive any delivery acknowledgement when the consumer suppresses contributor-level status?
4. Is future email delivery needed? It is explicitly out of scope here and would require a separate PRD.

