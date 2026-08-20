/**
 * The global Ally list — Circle's second tab (founder, 2026-08-20): *"allies are everyone who is in
 * at least one of my Support Circles and is not saved as a friend"*.
 *
 * The rules worth holding down are the ones where a mistake would say something untrue about a
 * relationship: a friend must never be listed as a mere Ally, one person in three circles is still
 * one person, and someone who has only been INVITED is not in a circle yet.
 */
import { globalAllies } from '../circleRows';
import type { AllyMember, Friend, SocialProfile } from '../SocialGateway';

const profile = (id: string, handle: string): SocialProfile => ({
  id,
  handle,
  buddySummary: { stage: 'egg', level: 1 },
});

const member = (id: string, handle: string): AllyMember => ({
  profile: profile(id, handle),
  bundle: 'encourager',
  status: 'accepted',
});

const friend = (id: string, handle: string, status: Friend['status'] = 'accepted'): Friend => ({
  profile: profile(id, handle),
  status,
  direction: 'outgoing',
});

describe('who counts as an Ally', () => {
  it('lists someone in a Support Circle who is not a friend', () => {
    expect(globalAllies([member('a', '@ana')], []).map((p) => p.handle)).toEqual(['@ana']);
  });

  it('never lists a friend as an Ally — they belong in the other tab', () => {
    expect(globalAllies([member('a', '@ana')], [friend('a', '@ana')])).toEqual([]);
  });

  it('still lists someone whose friend request is only PENDING', () => {
    // A request is a negotiation, not a relationship. The tab shows what is true today.
    expect(globalAllies([member('a', '@ana')], [friend('a', '@ana', 'pending')])).toHaveLength(1);
  });

  it('counts a person once even when they are in three of my circles', () => {
    const thrice = [member('a', '@ana'), member('a', '@ana'), member('a', '@ana')];
    expect(globalAllies(thrice, [])).toHaveLength(1);
  });

  it('sorts by handle, so the list does not reshuffle between loads', () => {
    const people = [member('c', '@cara'), member('a', '@ana'), member('b', '@bo')];
    expect(globalAllies(people, []).map((p) => p.handle)).toEqual(['@ana', '@bo', '@cara']);
  });

  it('is empty when nothing is shared with anyone', () => {
    expect(globalAllies([], [friend('a', '@ana')])).toEqual([]);
  });
});
