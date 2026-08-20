/**
 * inboxWaiting — how many things in the Inbox are actually waiting for the user.
 *
 * It exists because that number now appears in TWO places: under the Inbox's own title, and on the
 * badge of the mail button that replaced the Inbox tab (founder, 2026-08-20, option 1). A badge and
 * a heading that disagree about how much is waiting is the kind of small dishonesty that teaches
 * people to stop trusting both, so the definition lives here once.
 *
 * WHAT COUNTS AS WAITING, and why each one:
 *  - an incoming CHEER or nudge, until it has been seen — somebody reached out;
 *  - an incoming FRIEND request, and an incoming SUPPORT-CIRCLE invite — these are questions
 *    addressed to the user, and a question with no answer is the definition of waiting.
 * What does NOT count: a friend simply being in your circle, and an Ally's shared progress. Those
 * are state, not correspondence, and badging them would mean the badge never reaches zero.
 *
 * Pure TypeScript — no React, no vendor imports.
 */
import type { AllyInvite, Cheer, Friend } from './SocialGateway';

/** The three sources of "someone is waiting for you", exactly as the Inbox screen reads them. */
export interface InboxWaitingInput {
  incomingCheers: readonly Cheer[];
  friends: readonly Friend[];
  incomingAllyInvites: readonly AllyInvite[];
}

/** How many items are waiting. Never negative, and zero means the badge is hidden. */
export function inboxWaitingCount(input: InboxWaitingInput): number {
  const requests = input.friends.filter(
    (f) => f.status === 'pending' && f.direction === 'incoming',
  ).length;
  return input.incomingCheers.length + requests + input.incomingAllyInvites.length;
}
