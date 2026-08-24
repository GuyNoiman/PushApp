/**
 * The bell's feed: chronological, read-aware, and refusing to invent a time.
 */
import {
  allyInviteNotificationId,
  buildNotifications,
  cheerNotificationId,
  friendRequestNotificationId,
  pruneReadIds,
  unreadNotificationCount,
} from '../notifications';
import type { AllyInvite, Cheer, Friend, SocialProfile } from '../SocialGateway';

const profile = (id: string): SocialProfile => ({ id, handle: id, buddySummary: {} });

const cheer = (id: string, at: number, kind: 'cheer' | 'nudge' = 'cheer'): Cheer => ({
  id,
  fromId: 'ann',
  toId: 'me',
  journeyId: 'j1',
  kind,
  createdAt: at,
});

const request = (id: string, at?: number): Friend => ({
  profile: profile(id),
  status: 'pending',
  direction: 'incoming',
  ...(at === undefined ? {} : { requestedAt: at }),
});

const invite = (at?: number): AllyInvite => ({
  owner: profile('bo'),
  journeyId: 'j9',
  bundle: 'encourager',
  status: 'requested',
  ...(at === undefined ? {} : { requestedAt: at }),
});

const empty = { receivedCheers: [], friends: [], incomingAllyInvites: [], readIds: new Set<string>() };

describe('buildNotifications', () => {
  it('returns the three human sources, newest first', () => {
    const feed = buildNotifications({
      ...empty,
      receivedCheers: [cheer('c1', 100)],
      friends: [request('zed', 300)],
      incomingAllyInvites: [invite(200)],
    });
    expect(feed.map((n) => n.kind)).toEqual(['friendRequest', 'allyInvite', 'cheer']);
    expect(feed.map((n) => n.at)).toEqual([300, 200, 100]);
  });

  it('never reorders around what the app considers important', () => {
    // The actionable request is OLDER than the cheer, and stays below it.
    const feed = buildNotifications({
      ...empty,
      receivedCheers: [cheer('c1', 500)],
      friends: [request('zed', 100)],
    });
    expect(feed[0].kind).toBe('cheer');
    expect(feed[1].actionable).toBe(true);
  });

  it('marks read from the stored ids, and counts only the unread', () => {
    const read = new Set([cheerNotificationId(cheer('c1', 100))]);
    const feed = buildNotifications({
      ...empty,
      receivedCheers: [cheer('c1', 100), cheer('c2', 200)],
      readIds: read,
    });
    expect(feed.find((n) => n.id.endsWith('c1'))?.read).toBe(true);
    expect(unreadNotificationCount(feed)).toBe(1);
  });

  it('distinguishes a nudge from a cheer', () => {
    const feed = buildNotifications({ ...empty, receivedCheers: [cheer('c1', 1, 'nudge')] });
    expect(feed[0].kind).toBe('nudge');
  });

  it('ignores friends who are not an incoming pending request', () => {
    const accepted: Friend = { ...request('ann', 10), status: 'accepted' };
    const outgoing: Friend = { ...request('bo', 20), direction: 'outgoing' };
    const feed = buildNotifications({ ...empty, friends: [accepted, outgoing] });
    expect(feed).toEqual([]);
  });

  it('skips a request or invite with no server time rather than invent one', () => {
    const feed = buildNotifications({
      ...empty,
      friends: [request('ann')],
      incomingAllyInvites: [invite()],
    });
    expect(feed).toEqual([]);
  });

  it('carries what accepting an invite would expose', () => {
    const companion: AllyInvite = { ...invite(50), bundle: 'companion' };
    const feed = buildNotifications({ ...empty, incomingAllyInvites: [companion] });
    expect(feed[0]).toMatchObject({ bundle: 'companion', journeyId: 'j9', actionable: true });
  });

  it('gives a second ask a NEW id, so an old read mark cannot swallow it', () => {
    const first = friendRequestNotificationId('ann', 100);
    const second = friendRequestNotificationId('ann', 900);
    expect(first).not.toEqual(second);
    const feed = buildNotifications({
      ...empty,
      friends: [request('ann', 900)],
      readIds: new Set([first]),
    });
    expect(feed[0].read).toBe(false);
  });

  it('keeps ally invite ids unique per owner, Journey and time', () => {
    expect(allyInviteNotificationId('bo', 'j9', 1)).not.toEqual(
      allyInviteNotificationId('bo', 'j9', 2),
    );
    expect(allyInviteNotificationId('bo', 'j9', 1)).not.toEqual(
      allyInviteNotificationId('bo', 'j8', 1),
    );
  });

  it('is deterministic when two things happened at the same instant', () => {
    const a = buildNotifications({ ...empty, receivedCheers: [cheer('c2', 5), cheer('c1', 5)] });
    const b = buildNotifications({ ...empty, receivedCheers: [cheer('c1', 5), cheer('c2', 5)] });
    expect(a.map((n) => n.id)).toEqual(b.map((n) => n.id));
  });
});

describe('a Mirror invitation', () => {
  it('appears as an actionable row, carrying the asker and nothing about the questions', () => {
    const feed = buildNotifications({
      ...empty,
      mirrorInvites: [{ roundId: 'r1', ownerId: 'ann', invitedAt: 400 }],
    });
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({ kind: 'mirrorInvite', actorId: 'ann', actionable: true });
    // What a person chose to ask about themselves is not feed material.
    expect(JSON.stringify(feed[0])).not.toContain('question');
  });

  it('is one row per round, so a re-render cannot duplicate it', () => {
    const invite = { roundId: 'r1', ownerId: 'ann', invitedAt: 400 };
    const feed = buildNotifications({ ...empty, mirrorInvites: [invite, invite] });
    expect(new Set(feed.map((n) => n.id)).size).toBe(1);
  });

  it('sorts with everything else, by when it happened', () => {
    const feed = buildNotifications({
      ...empty,
      receivedCheers: [cheer('c1', 500)],
      mirrorInvites: [{ roundId: 'r1', ownerId: 'ann', invitedAt: 100 }],
    });
    expect(feed.map((n) => n.kind)).toEqual(['cheer', 'mirrorInvite']);
  });
});

describe('pruneReadIds', () => {
  it('drops marks whose event has left the feed and keeps the rest', () => {
    const feed = buildNotifications({ ...empty, receivedCheers: [cheer('c1', 1)] });
    const pruned = pruneReadIds(new Set(['cheer:c1', 'cheer:gone']), feed);
    expect([...pruned]).toEqual(['cheer:c1']);
  });
});
