/**
 * notifications — the pure feed behind the bell: everything ANOTHER PERSON did for this user,
 * newest first, each one carrying whether it has been seen.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE INBOX. The Inbox is correspondence; this is activity. Today
 * the two are fused, and the seam is already visible: the mail badge counts cheers, friend requests
 * and Support-Circle invites — none of which is a message. This module is where the activity half
 * finally has a home of its own (founder, 2026-08-21).
 *
 * THE ONE RULE, and it is a product rule, not a technical one:
 * **a notification is something a HUMAN did for you.** A cheer, a nudge, a friend request, an
 * invitation to support a Journey. Never something the app decided to say — no "you have not opened
 * this in three days", no "your friend is ahead of you". The moment the bell fills with things the
 * app wanted, it becomes a machine for pulling people back, which is the opposite of what PushApp
 * is for (CLAUDE.md §3.4: growth before engagement). The type enforces it as far as a type can:
 * every notification REQUIRES an `actorId`, so there is nowhere to put an event with no human
 * behind it.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: it does not invent times. Every source carries a real server
 * timestamp (`cheers.created_at`, `friendships.created_at`, `journey_allies.requested_at`), so
 * nothing here falls back to "now" to make the sort look tidy — a fabricated time is worse than a
 * missing row.
 *
 * Pure TypeScript — no React, no vendor imports, no storage. The read marks live in
 * `notificationReads.ts`; the gateway supplies the rows.
 */
import type { AllyBundle, AllyInvite, Cheer, Friend } from './SocialGateway';

/** What kind of thing a person did. */
export type NotificationKind = 'cheer' | 'nudge' | 'friendRequest' | 'allyInvite' | 'mirrorInvite';

/**
 * One thing a person did for this user.
 *
 * `id` must be STABLE for the same event across reloads (the read mark keys on it) and DIFFERENT
 * for a genuinely new event. That is why the request/invite ids carry their timestamp: someone who
 * asks again after being declined is asking again, and a mark left on the old ask must not swallow
 * the new one.
 */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  /** The person who did it. There is no such thing as a notification with no human behind it. */
  actorId: string;
  /** Epoch ms it happened, from the server. Never guessed. */
  at: number;
  /** True while it is still a question addressed to the user (request / invite). */
  actionable: boolean;
  /** The Journey it concerns, when there is one. */
  journeyId?: string;
  /** Ally invites only: what accepting would expose, so the row can say it before the tap. */
  bundle?: AllyBundle;
  /** Whether this user has already seen it. */
  read: boolean;
}

/** Everything the feed is built from. All of it already exists on the server today. */
export interface NotificationFeedInput {
  /** Cheers and nudges RECEIVED, from the history query (not only the live subscription). */
  receivedCheers: readonly Cheer[];
  /** The whole friend list; only incoming pending ones become notifications. */
  friends: readonly Friend[];
  /** Support-Circle invites awaiting this user's answer. */
  incomingAllyInvites: readonly AllyInvite[];
  /**
   * Mirror rounds this person has been asked to answer and has not yet.
   *
   * It arrives here rather than in the Inbox because it is a REQUEST — something a person did,
   * addressed to this one — and that is what this centre is for (Notification Center PRD §5). The
   * row carries the asker and the round id and NOTHING about the questions: what a person chose to
   * ask about themselves is not lock-screen material, and it is not feed material either.
   */
  mirrorInvites?: readonly { roundId: string; ownerId: string; invitedAt: number }[];
  /** Ids already marked read, from `notificationReads`. */
  readIds: ReadonlySet<string>;
}

/** The id of a received cheer/nudge. Uuid-backed, so it is stable on its own. */
export function cheerNotificationId(cheer: Cheer): string {
  return `cheer:${cheer.id}`;
}

/** The id of an incoming friend request. Carries the ask's time — a second ask is a second row. */
export function friendRequestNotificationId(profileId: string, requestedAt: number): string {
  return `friendreq:${profileId}:${requestedAt}`;
}

/** The id of a Mirror invitation. Per round and asker; a round is asked once. */
export function mirrorInviteNotificationId(roundId: string, ownerId: string): string {
  return `mirror:${ownerId}:${roundId}`;
}

/** The id of an incoming Support-Circle invite, per owner + Journey + the time of the ask. */
export function allyInviteNotificationId(
  ownerId: string,
  journeyId: string,
  requestedAt: number,
): string {
  return `allyinv:${ownerId}:${journeyId}:${requestedAt}`;
}

/**
 * Build the feed: newest first, read marks applied.
 *
 * Chronological and nothing else — no "unread first", no pinning the actionable ones to the top.
 * A feed that reorders itself around what the app considers important stops being a record of what
 * happened, and the user loses the one thing an activity list is for.
 */
export function buildNotifications(input: NotificationFeedInput): AppNotification[] {
  const items: AppNotification[] = [];

  for (const cheer of input.receivedCheers) {
    const id = cheerNotificationId(cheer);
    items.push({
      id,
      kind: cheer.kind === 'nudge' ? 'nudge' : 'cheer',
      actorId: cheer.fromId,
      at: cheer.createdAt,
      actionable: false,
      journeyId: cheer.journeyId,
      read: input.readIds.has(id),
    });
  }

  for (const friend of input.friends) {
    if (friend.status !== 'pending' || friend.direction !== 'incoming') continue;
    // No timestamp means the row did not come from the server. Skipping is deliberate: the
    // alternative is inventing a time, and the request is still visible (and answerable) in the
    // Inbox's Requested tab either way.
    if (friend.requestedAt === undefined) continue;
    const id = friendRequestNotificationId(friend.profile.id, friend.requestedAt);
    items.push({
      id,
      kind: 'friendRequest',
      actorId: friend.profile.id,
      at: friend.requestedAt,
      actionable: true,
      read: input.readIds.has(id),
    });
  }

  for (const invite of input.incomingAllyInvites) {
    if (invite.requestedAt === undefined) continue;
    const id = allyInviteNotificationId(invite.owner.id, invite.journeyId, invite.requestedAt);
    items.push({
      id,
      kind: 'allyInvite',
      actorId: invite.owner.id,
      at: invite.requestedAt,
      actionable: true,
      journeyId: invite.journeyId,
      bundle: invite.bundle,
      read: input.readIds.has(id),
    });
  }

  for (const invite of input.mirrorInvites ?? []) {
    const id = mirrorInviteNotificationId(invite.roundId, invite.ownerId);
    items.push({
      id,
      kind: 'mirrorInvite',
      actorId: invite.ownerId,
      at: invite.invitedAt,
      actionable: true,
      read: input.readIds.has(id),
    });
  }

  // Newest first; ties broken by id so the order is deterministic between renders.
  return items.sort((a, b) => (b.at - a.at) || a.id.localeCompare(b.id));
}

/** How many are unread — the number on the bell. Zero hides the badge. */
export function unreadNotificationCount(items: readonly AppNotification[]): number {
  return items.filter((n) => !n.read).length;
}

/**
 * Drop read marks whose event is no longer in the feed, so the stored set cannot grow forever.
 * Called after a feed is built, with that feed.
 */
export function pruneReadIds(
  readIds: ReadonlySet<string>,
  items: readonly AppNotification[],
): Set<string> {
  const live = new Set(items.map((n) => n.id));
  const kept = new Set<string>();
  for (const id of readIds) if (live.has(id)) kept.add(id);
  return kept;
}
