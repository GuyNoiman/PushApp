/**
 * How much is waiting in the Inbox — the number that now appears in two places at once: on the mail
 * button's badge in Home's status strip, and under the Inbox's own title.
 *
 * That is the whole reason this is a tested pure function. A badge that says 3 above a screen that
 * says 5 is a small dishonesty, and small dishonesties about numbers are how people learn to stop
 * reading them.
 */
import { inboxWaitingCount } from '../inboxWaiting';
import type { AllyInvite, Cheer, Friend, SocialProfile } from '../SocialGateway';

const profile = (id: string): SocialProfile => ({
  id,
  handle: `@${id}`,
  buddySummary: { stage: 'egg', level: 1 },
});

const cheer = (id: string): Cheer => ({
  id,
  fromId: 'them',
  toId: 'me',
  journeyId: 'j1',
  kind: 'cheer',
  createdAt: 0,
});

const friend = (id: string, status: Friend['status'], direction: Friend['direction']): Friend => ({
  profile: profile(id),
  status,
  direction,
});

const invite = (id: string): AllyInvite => ({
  owner: profile(id),
  journeyId: 'j1',
  bundle: 'encourager',
  status: 'requested',
});

const empty = { incomingCheers: [], friends: [], incomingAllyInvites: [] };

describe('what counts as waiting', () => {
  it('counts an incoming cheer — somebody reached out', () => {
    expect(inboxWaitingCount({ ...empty, incomingCheers: [cheer('c1'), cheer('c2')] })).toBe(2);
  });

  it('counts an incoming friend request — it is a question addressed to the user', () => {
    expect(
      inboxWaitingCount({ ...empty, friends: [friend('a', 'pending', 'incoming')] }),
    ).toBe(1);
  });

  it('counts an incoming Support-Circle invite', () => {
    expect(inboxWaitingCount({ ...empty, incomingAllyInvites: [invite('a')] })).toBe(1);
  });
});

describe('what does NOT count, so the badge can reach zero', () => {
  it('ignores a request the USER sent — waiting on someone else is not waiting on you', () => {
    expect(inboxWaitingCount({ ...empty, friends: [friend('a', 'pending', 'outgoing')] })).toBe(0);
  });

  it('ignores an accepted friend — being in your circle is state, not correspondence', () => {
    expect(inboxWaitingCount({ ...empty, friends: [friend('a', 'accepted', 'incoming')] })).toBe(0);
  });

  it('is zero for an empty inbox, which is what hides the badge', () => {
    expect(inboxWaitingCount(empty)).toBe(0);
  });
});

describe('everything together', () => {
  it('adds the three sources and nothing else', () => {
    expect(
      inboxWaitingCount({
        incomingCheers: [cheer('c1')],
        friends: [
          friend('a', 'pending', 'incoming'),
          friend('b', 'pending', 'outgoing'),
          friend('c', 'accepted', 'incoming'),
        ],
        incomingAllyInvites: [invite('d'), invite('e')],
      }),
    ).toBe(4);
  });
});
