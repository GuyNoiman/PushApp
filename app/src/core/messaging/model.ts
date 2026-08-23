/**
 * Direct messaging — the pure rules of a conversation between two people.
 *
 * ONE PAIR, ONE CONVERSATION. A person who is both a Friend and an Ally does not get two threads,
 * and neither does one reached from Home rather than from their profile. The identity of a
 * conversation is the unordered pair of account ids and nothing else (PRD §7), which is why
 * {@link pairId} sorts before it joins: `a|b` and `b|a` must be the same string forever.
 *
 * PERMISSION IS NOT RELATIONSHIP. Friendship, Ally membership and the right to message are three
 * different things. Becoming Friends approves a pending request; ending a friendship does NOT send
 * an approved conversation back to Requests. Once somebody has been let in, they stay in until they
 * are blocked — a permission that quietly revokes itself is one nobody can rely on (PRD §7).
 *
 * THE LIMITS ARE THE ANTI-HARASSMENT DESIGN, not a technical cap: five messages per rolling
 * twenty-four hours into a conversation nobody has accepted, five hundred characters each, and the
 * whole request expiring thirty days from when it started — later messages do not extend it. A
 * refused send says WHEN it becomes possible again rather than vanishing (PRD §8.2).
 *
 * WHAT IS NOT HERE: ciphertext, keys, and anything that talks to a server. This module reasons about
 * conversations; `crypto.ts` owns the envelope and the gateway owns the wire.
 *
 * Pure TypeScript — no React, no storage, no clock reads except where a caller passes `now`.
 */
import { perceivedLength } from '../tools/text';

/** Where a conversation stands. `blocked` is terminal for as long as the block lasts. */
export type ConversationPermission = 'requested' | 'approved' | 'blocked';

export interface DirectConversation {
  /** The canonical pair id — see {@link pairId}. */
  id: string;
  /** Both participants, in the same sorted order the id uses. */
  participantIds: [string, string];
  permission: ConversationPermission;
  requestedAt?: number;
  approvedAt?: number;
  /** When a PENDING request stops being deliverable. Fixed to its creation (PRD §8.2). */
  expiresAt?: number;
  lastMessageAt?: number;
}

/** What a message is. `cheerTemplate` carries an id, so it is localised for whoever reads it. */
export type MessageKind = 'text' | 'cheerTemplate';

export interface DirectMessage {
  /** Client-generated, so a retry cannot duplicate a message (PRD §10.2). */
  id: string;
  conversationId: string;
  senderId: string;
  /** The plaintext, on THIS device only. What crosses the wire is the ciphertext. */
  body: string;
  kind: MessageKind;
  createdAt: number;
  deliveredAt?: number;
  readAt?: number;
  /** Set when this device could not decrypt it. Never shows ciphertext to a person (PRD §20). */
  undecryptable?: boolean;
}

/** Limits, all from PRD §8.2 and §10.1. */
export const REQUEST_MESSAGE_MAX_CHARS = 500;
export const APPROVED_MESSAGE_MAX_CHARS = 2000;
export const REQUEST_MESSAGES_PER_DAY = 5;
export const REQUEST_EXPIRY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The one identity of a conversation between two people. Sorted, so it does not matter who asks.
 */
export function pairId(a: string, b: string): string {
  return [a, b].sort().join('|');
}

export function participantsOf(a: string, b: string): [string, string] {
  const [first, second] = [a, b].sort();
  return [first, second];
}

/** The other person in a conversation. */
export function counterpartOf(conversation: DirectConversation, me: string): string {
  return conversation.participantIds[0] === me
    ? conversation.participantIds[1]
    : conversation.participantIds[0];
}

/** A brand-new conversation, opened by `from` writing to `to`, in whichever state applies. */
export function startConversation(
  from: string,
  to: string,
  permission: Extract<ConversationPermission, 'requested' | 'approved'>,
  now: number,
): DirectConversation {
  return {
    id: pairId(from, to),
    participantIds: participantsOf(from, to),
    permission,
    ...(permission === 'requested'
      ? { requestedAt: now, expiresAt: now + REQUEST_EXPIRY_DAYS * DAY_MS }
      : { approvedAt: now }),
  };
}

/**
 * Approve a request. Idempotent, and it CLEARS the expiry: an accepted conversation does not expire.
 * Approving something already approved returns it untouched rather than restamping the moment
 * somebody was let in.
 */
export function approveConversation(
  conversation: DirectConversation,
  now: number,
): DirectConversation {
  if (conversation.permission === 'approved') return conversation;
  const { expiresAt: _e, ...rest } = conversation;
  return { ...rest, permission: 'approved', approvedAt: now };
}

/**
 * A relationship change that approves a pending request (PRD §8.4): becoming Friends, or accepting
 * an Ally role. It never DOWNGRADES — an approved conversation is not touched by anything here.
 */
export function relationshipApproves(
  conversation: DirectConversation,
  now: number,
): DirectConversation {
  return conversation.permission === 'requested' ? approveConversation(conversation, now) : conversation;
}

/**
 * Ending a friendship or an Ally role. Deliberately the identity function, and it exists so the rule
 * is written down somewhere a person can find it: approval survives the relationship that granted it
 * (PRD §7). Only a block closes a conversation.
 */
export function relationshipEnded(conversation: DirectConversation): DirectConversation {
  return conversation;
}

export function blockConversation(conversation: DirectConversation): DirectConversation {
  return { ...conversation, permission: 'blocked' };
}

/** Whether a pending request has run out of time. An approved conversation never expires. */
export function requestExpired(conversation: DirectConversation, now: number): boolean {
  if (conversation.permission !== 'requested' || conversation.expiresAt === undefined) return false;
  return now >= conversation.expiresAt;
}

/** Why a message cannot be sent right now. Each one is something the UI must be able to SAY. */
export type SendRefusal =
  | { reason: 'empty' }
  | { reason: 'tooLong'; max: number; length: number }
  | { reason: 'blocked' }
  | { reason: 'expired' }
  | { reason: 'rateLimited'; retryAt: number };

/**
 * Whether this message may be sent, and if not, why — never a silent drop (PRD §8.2).
 *
 * `sentInWindow` is the sender's own messages in this conversation, newest first or in any order;
 * only their timestamps matter.
 */
export function canSend(
  conversation: DirectConversation,
  body: string,
  sentByMe: readonly { createdAt: number }[],
  now: number,
): SendRefusal | null {
  if (body.trim().length === 0) return { reason: 'empty' };
  if (conversation.permission === 'blocked') return { reason: 'blocked' };

  const max =
    conversation.permission === 'approved' ? APPROVED_MESSAGE_MAX_CHARS : REQUEST_MESSAGE_MAX_CHARS;
  const length = perceivedLength(body);
  if (length > max) return { reason: 'tooLong', max, length };

  if (conversation.permission === 'requested') {
    if (requestExpired(conversation, now)) return { reason: 'expired' };
    const window = sentByMe.filter((m) => now - m.createdAt < DAY_MS);
    if (window.length >= REQUEST_MESSAGES_PER_DAY) {
      // The oldest message in the window is the one whose expiry frees the next slot.
      const oldest = Math.min(...window.map((m) => m.createdAt));
      return { reason: 'rateLimited', retryAt: oldest + DAY_MS };
    }
  }
  return null;
}

/** Messages this person has not read yet, in a conversation they are a participant of. */
export function unreadFor(messages: readonly DirectMessage[], me: string): DirectMessage[] {
  return messages.filter((m) => m.senderId !== me && m.readAt === undefined);
}

/**
 * The Inbox badge: conversations holding at least one unread incoming message, PLUS open requests.
 *
 * Several unread messages in one conversation count ONCE (PRD §6.1) — the badge counts people
 * waiting for you, not messages. Blocked and expired conversations count for nothing.
 */
export function inboxBadgeCount(
  conversations: readonly DirectConversation[],
  messagesByConversation: Readonly<Record<string, readonly DirectMessage[]>>,
  me: string,
  now: number,
): number {
  let count = 0;
  for (const conversation of conversations) {
    if (conversation.permission === 'blocked') continue;
    if (conversation.permission === 'requested') {
      // An open request counts whether or not it has been looked at (PRD §16).
      if (!requestExpired(conversation, now) && conversation.participantIds.includes(me)) count += 1;
      continue;
    }
    if (unreadFor(messagesByConversation[conversation.id] ?? [], me).length > 0) count += 1;
  }
  return count;
}

/**
 * Chats, newest activity first. Unread does NOT jump the queue (PRD §16): a list that reorders
 * itself around what you have not read stops being a record of what happened.
 */
export function sortChats(conversations: readonly DirectConversation[]): DirectConversation[] {
  return conversations
    .filter((c) => c.permission === 'approved')
    .sort((a, b) => (b.lastMessageAt ?? b.approvedAt ?? 0) - (a.lastMessageAt ?? a.approvedAt ?? 0));
}

/** Open requests addressed to this person, newest first. */
export function openRequestsFor(
  conversations: readonly DirectConversation[],
  me: string,
  now: number,
): DirectConversation[] {
  return conversations
    .filter(
      (c) =>
        c.permission === 'requested' &&
        !requestExpired(c, now) &&
        c.participantIds.includes(me),
    )
    .sort((a, b) => (b.requestedAt ?? 0) - (a.requestedAt ?? 0));
}

/** Mute windows, from PRD §12. `until` is an absolute instant; `forever` has none. */
export type MuteDuration = 'hour' | 'eightHours' | 'week' | 'forever';

export function muteUntil(duration: MuteDuration, now: number): number | null {
  switch (duration) {
    case 'hour':
      return now + 60 * 60 * 1000;
    case 'eightHours':
      return now + 8 * 60 * 60 * 1000;
    case 'week':
      return now + 7 * DAY_MS;
    case 'forever':
      return null;
  }
}

/**
 * Whether a conversation is muted right now. `null` means muted until turned back on, which is why
 * the argument is `number | null | undefined` and each of the three means something different:
 * a time (muted until then), null (muted indefinitely), undefined (not muted).
 */
export function isMuted(mutedUntil: number | null | undefined, now: number): boolean {
  if (mutedUntil === undefined) return false;
  if (mutedUntil === null) return true;
  return now < mutedUntil;
}

/**
 * Mark incoming messages read — only the ones actually rendered, which is the caller's judgement
 * (PRD §16). Returns a new list; a message already read keeps its original timestamp.
 */
export function markRead(
  messages: readonly DirectMessage[],
  ids: readonly string[],
  me: string,
  now: number,
): DirectMessage[] {
  const wanted = new Set(ids);
  return messages.map((m) =>
    wanted.has(m.id) && m.senderId !== me && m.readAt === undefined ? { ...m, readAt: now } : m,
  );
}

/** What the row under the newest own message says (PRD §10.2). */
export type DeliveryState = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export function deliveryStateOf(
  message: DirectMessage,
  opts: { pending?: boolean; failed?: boolean; showRead: boolean },
): DeliveryState {
  if (opts.failed) return 'failed';
  if (opts.pending) return 'sending';
  // A request never exposes Read before it is accepted (PRD §10.2).
  if (message.readAt !== undefined && opts.showRead) return 'read';
  if (message.deliveredAt !== undefined) return 'delivered';
  return 'sent';
}
