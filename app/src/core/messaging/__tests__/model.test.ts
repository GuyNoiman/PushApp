/**
 * Direct messaging: one conversation per pair, permission that outlives the relationship that
 * granted it, and limits that say when rather than going silent.
 */
import {
  APPROVED_MESSAGE_MAX_CHARS,
  approveConversation,
  blockConversation,
  canSend,
  counterpartOf,
  deliveryStateOf,
  inboxBadgeCount,
  isMuted,
  markRead,
  muteUntil,
  openRequestsFor,
  pairId,
  relationshipApproves,
  relationshipEnded,
  REQUEST_MESSAGES_PER_DAY,
  REQUEST_MESSAGE_MAX_CHARS,
  requestExpired,
  sortChats,
  startConversation,
  unreadFor,
  type DirectMessage,
} from '../model';

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const msg = (over: Partial<DirectMessage> = {}): DirectMessage => ({
  id: 'm1',
  conversationId: pairId('me', 'you'),
  senderId: 'you',
  body: 'hello',
  kind: 'text',
  createdAt: NOW,
  ...over,
});

describe('one pair, one conversation', () => {
  it('gives the same id whoever asks', () => {
    expect(pairId('me', 'you')).toBe(pairId('you', 'me'));
  });

  it('names the other person from either side', () => {
    const c = startConversation('me', 'you', 'approved', NOW);
    expect(counterpartOf(c, 'me')).toBe('you');
    expect(counterpartOf(c, 'you')).toBe('me');
  });
});

describe('permission is not relationship', () => {
  it('a request expires thirty days from when it started', () => {
    const c = startConversation('me', 'you', 'requested', NOW);
    expect(requestExpired(c, NOW + 29 * DAY)).toBe(false);
    expect(requestExpired(c, NOW + 31 * DAY)).toBe(true);
  });

  it('an approved conversation never expires', () => {
    const c = approveConversation(startConversation('me', 'you', 'requested', NOW), NOW);
    expect(c.expiresAt).toBeUndefined();
    expect(requestExpired(c, NOW + 900 * DAY)).toBe(false);
  });

  it('becoming Friends approves a pending request, without a duplicate thread', () => {
    const pending = startConversation('me', 'you', 'requested', NOW);
    const approved = relationshipApproves(pending, NOW + HOUR);
    expect(approved.id).toBe(pending.id);
    expect(approved.permission).toBe('approved');
  });

  it('does not restamp a conversation that was already approved', () => {
    const c = approveConversation(startConversation('me', 'you', 'requested', NOW), NOW);
    expect(relationshipApproves(c, NOW + 5 * DAY)).toBe(c);
  });

  it('ending the friendship does NOT send the conversation back to Requests', () => {
    const c = approveConversation(startConversation('me', 'you', 'requested', NOW), NOW);
    expect(relationshipEnded(c).permission).toBe('approved');
  });

  it('only a block closes it', () => {
    const c = blockConversation(approveConversation(startConversation('me', 'you', 'requested', NOW), NOW));
    expect(c.permission).toBe('blocked');
  });
});

describe('what may be sent', () => {
  const approved = approveConversation(startConversation('me', 'you', 'requested', NOW), NOW);
  const pending = startConversation('me', 'you', 'requested', NOW);

  it('refuses an empty message', () => {
    expect(canSend(approved, '   ', [], NOW)).toEqual({ reason: 'empty' });
  });

  it('holds a request to five hundred characters and a chat to two thousand', () => {
    const long = 'x'.repeat(REQUEST_MESSAGE_MAX_CHARS + 1);
    expect(canSend(pending, long, [], NOW)).toMatchObject({ reason: 'tooLong', max: REQUEST_MESSAGE_MAX_CHARS });
    expect(canSend(approved, long, [], NOW)).toBeNull();
    expect(canSend(approved, 'x'.repeat(APPROVED_MESSAGE_MAX_CHARS + 1), [], NOW)).toMatchObject({
      reason: 'tooLong',
    });
  });

  it('stops at five pending messages in twenty-four hours, and says when the next one is possible', () => {
    const sent = Array.from({ length: REQUEST_MESSAGES_PER_DAY }, (_, i) => ({
      createdAt: NOW - (i + 1) * HOUR,
    }));
    const refusal = canSend(pending, 'again', sent, NOW);
    expect(refusal).toMatchObject({ reason: 'rateLimited' });
    // The OLDEST of the five is the one whose window expiry frees the next slot.
    expect((refusal as { retryAt: number }).retryAt).toBe(NOW - 5 * HOUR + DAY);
  });

  it('lets the sixth through once the oldest has aged out', () => {
    const sent = Array.from({ length: REQUEST_MESSAGES_PER_DAY }, (_, i) => ({
      createdAt: NOW - DAY - i * HOUR,
    }));
    expect(canSend(pending, 'again', sent, NOW)).toBeNull();
  });

  it('does not rate-limit an approved conversation', () => {
    const sent = Array.from({ length: 50 }, () => ({ createdAt: NOW - HOUR }));
    expect(canSend(approved, 'hi', sent, NOW)).toBeNull();
  });

  it('refuses on a blocked or expired conversation', () => {
    expect(canSend(blockConversation(approved), 'hi', [], NOW)).toEqual({ reason: 'blocked' });
    expect(canSend(pending, 'hi', [], NOW + 31 * DAY)).toEqual({ reason: 'expired' });
  });
});

describe('unread and the badge', () => {
  it('counts my own messages as read, always', () => {
    const mine = msg({ senderId: 'me' });
    expect(unreadFor([mine], 'me')).toEqual([]);
  });

  it('counts a conversation once however many messages are waiting', () => {
    const c = { ...approveConversation(startConversation('me', 'you', 'requested', NOW), NOW), lastMessageAt: NOW };
    const messages = [msg({ id: 'a' }), msg({ id: 'b' }), msg({ id: 'c' })];
    expect(inboxBadgeCount([c], { [c.id]: messages }, 'me', NOW)).toBe(1);
  });

  it('adds open requests, and ignores expired and blocked ones', () => {
    const open = startConversation('me', 'ann', 'requested', NOW);
    const old = startConversation('me', 'bo', 'requested', NOW - 40 * DAY);
    const blocked = blockConversation(startConversation('me', 'cy', 'requested', NOW));
    expect(inboxBadgeCount([open, old, blocked], {}, 'me', NOW)).toBe(1);
  });

  it('marks only the messages that were actually rendered', () => {
    const messages = [msg({ id: 'a' }), msg({ id: 'b' })];
    const after = markRead(messages, ['a'], 'me', NOW + 10);
    expect(after[0].readAt).toBe(NOW + 10);
    expect(after[1].readAt).toBeUndefined();
  });

  it('never re-stamps a message that was already read', () => {
    const messages = [msg({ id: 'a', readAt: NOW })];
    expect(markRead(messages, ['a'], 'me', NOW + 500)[0].readAt).toBe(NOW);
  });
});

describe('order', () => {
  it('is newest activity first, and unread does not jump the queue', () => {
    const older = { ...approveConversation(startConversation('me', 'ann', 'requested', NOW), NOW), lastMessageAt: NOW - HOUR };
    const newer = { ...approveConversation(startConversation('me', 'bo', 'requested', NOW), NOW), lastMessageAt: NOW };
    const sorted = sortChats([older, newer]);
    expect(sorted.map((c) => c.id)).toEqual([newer.id, older.id]);
  });

  it('keeps requests out of Chats', () => {
    const pending = startConversation('me', 'ann', 'requested', NOW);
    expect(sortChats([pending])).toEqual([]);
    expect(openRequestsFor([pending], 'me', NOW)).toHaveLength(1);
  });
});

describe('muting', () => {
  it('has four windows, and "until I turn it back on" has no end', () => {
    expect(muteUntil('hour', NOW)).toBe(NOW + HOUR);
    expect(muteUntil('eightHours', NOW)).toBe(NOW + 8 * HOUR);
    expect(muteUntil('week', NOW)).toBe(NOW + 7 * DAY);
    expect(muteUntil('forever', NOW)).toBeNull();
  });

  it('tells the three states apart', () => {
    expect(isMuted(undefined, NOW)).toBe(false);
    expect(isMuted(null, NOW)).toBe(true);
    expect(isMuted(NOW + HOUR, NOW)).toBe(true);
    expect(isMuted(NOW - 1, NOW)).toBe(false);
  });
});

describe('delivery state', () => {
  it('shows failed and sending before anything else', () => {
    expect(deliveryStateOf(msg(), { failed: true, showRead: true })).toBe('failed');
    expect(deliveryStateOf(msg(), { pending: true, showRead: true })).toBe('sending');
  });

  it('never shows Read in a conversation that has not been accepted', () => {
    const read = msg({ senderId: 'me', readAt: NOW, deliveredAt: NOW });
    expect(deliveryStateOf(read, { showRead: false })).toBe('delivered');
    expect(deliveryStateOf(read, { showRead: true })).toBe('read');
  });
});
