/**
 * friendProfile — the pure relationship arithmetic behind the Friend Profile (PRD §4.2/§4.5).
 *
 * These are the numbers the app shows ABOUT ANOTHER PERSON, and the ones a destructive
 * confirmation is read against, so the rules are pinned here rather than trusted to a screen:
 * what counts as a relationship, what a remove will really cut, and when an action is offerable
 * at all. No React, no backend — just rows in, meaning out.
 */
import {
  computeUnfriendImpact,
  everAccepted,
  friendActions,
  sharedJourneysFrom,
  summarizeRelationship,
} from '../friendProfile';
import type { AllyBundle, AllyInviteStatus, AllyProgress, AllyRelationRow } from '../SocialGateway';

const ME = 'me';
const FRIEND = 'friend-1';

function row(
  ownerId: string,
  allyId: string,
  status: AllyInviteStatus,
  overrides: Partial<AllyRelationRow> = {},
): AllyRelationRow {
  return {
    journeyId: `j-${ownerId}-${allyId}-${status}`,
    ownerId,
    allyId,
    status,
    bundle: 'encourager' as AllyBundle,
    decidedAt: status === 'accepted' ? 1_700_000_000_000 : null,
    ...overrides,
  };
}

function progress(ownerId: string, journeyId: string, updatedAt: number): AllyProgress {
  return {
    owner: { id: ownerId, handle: ownerId, buddySummary: {} },
    journeyId,
    title: 'Run 5km',
    progress: 0.5,
    streak: 3,
    updatedAt,
    visibility: 'full',
  };
}

describe('everAccepted', () => {
  it('counts a live accepted relationship', () => {
    expect(everAccepted(row(ME, FRIEND, 'accepted'))).toBe(true);
  });

  it('counts a closed relationship that WAS accepted (it really happened)', () => {
    expect(everAccepted(row(ME, FRIEND, 'closed', { decidedAt: 1_700_000_000_000 }))).toBe(true);
  });

  it('does NOT count an invite that was never accepted', () => {
    expect(everAccepted(row(ME, FRIEND, 'requested'))).toBe(false);
    expect(everAccepted(row(ME, FRIEND, 'declined'))).toBe(false);
    expect(everAccepted(row(ME, FRIEND, 'cancelled'))).toBe(false);
    // Closed with no decision = cancelled/closed before anyone accepted; nothing was ever shared.
    expect(everAccepted(row(ME, FRIEND, 'closed', { decidedAt: null }))).toBe(false);
  });
});

describe('summarizeRelationship (PRD §4.2)', () => {
  it('counts each direction separately and totals them', () => {
    const rows = [
      row(ME, FRIEND, 'accepted', { journeyId: 'a' }),
      row(ME, FRIEND, 'closed', { journeyId: 'b', decidedAt: 1 }),
      row(FRIEND, ME, 'accepted', { journeyId: 'c' }),
    ];
    expect(summarizeRelationship(rows, ME, FRIEND)).toEqual({
      theySupportMe: 2,
      iSupportThem: 1,
      total: 3,
      lifecycle: null,
    });
  });

  it('ignores rows involving anyone else', () => {
    const rows = [
      row(ME, 'someone-else', 'accepted'),
      row('someone-else', ME, 'accepted'),
      row(ME, FRIEND, 'accepted'),
    ];
    expect(summarizeRelationship(rows, ME, FRIEND)).toMatchObject({ theySupportMe: 1, iSupportThem: 0, total: 1 });
  });

  it('always reports lifecycle as null — a breakdown must never be fabricated', () => {
    expect(summarizeRelationship([], ME, FRIEND)).toEqual({
      theySupportMe: 0,
      iSupportThem: 0,
      total: 0,
      lifecycle: null,
    });
  });
});

describe('computeUnfriendImpact (PRD §4.5)', () => {
  it('counts only LIVE accepted relationships, plus pending invites either way', () => {
    const rows = [
      row(ME, FRIEND, 'accepted', { journeyId: 'a' }),
      row(ME, FRIEND, 'accepted', { journeyId: 'b' }),
      row(FRIEND, ME, 'accepted', { journeyId: 'c' }),
      row(ME, FRIEND, 'requested', { journeyId: 'd' }),
      row(FRIEND, ME, 'requested', { journeyId: 'e' }),
    ];
    expect(computeUnfriendImpact(rows, ME, FRIEND)).toEqual({
      journeysTheySupportForMe: 2,
      journeysISupportForThem: 1,
      pendingInvites: 2,
    });
  });

  it('does not count relationships that already ended — they cannot be cut twice', () => {
    const rows = [
      row(ME, FRIEND, 'closed', { journeyId: 'a', decidedAt: 1 }),
      row(FRIEND, ME, 'declined', { journeyId: 'b' }),
      row(ME, FRIEND, 'cancelled', { journeyId: 'c' }),
    ];
    expect(computeUnfriendImpact(rows, ME, FRIEND)).toEqual({
      journeysTheySupportForMe: 0,
      journeysISupportForThem: 0,
      pendingInvites: 0,
    });
  });
});

describe('sharedJourneysFrom', () => {
  it('keeps only this friend’s Journeys, most recently updated first', () => {
    const all = [
      progress(FRIEND, 'j1', 100),
      progress('other', 'j2', 999),
      progress(FRIEND, 'j3', 500),
    ];
    expect(sharedJourneysFrom(all, FRIEND).map((p) => p.journeyId)).toEqual(['j3', 'j1']);
  });

  it('returns an empty list when nothing is shared', () => {
    expect(sharedJourneysFrom([progress('other', 'j2', 1)], FRIEND)).toEqual([]);
  });
});

describe('friendActions (PRD §4.5)', () => {
  it('offers Cheer only when there is a shared Journey to cheer on', () => {
    expect(friendActions(true)).toEqual(['cheer', 'remove']);
    expect(friendActions(false)).toEqual(['remove']);
  });

  it('never offers a message action while direct messaging is deferred (D29/D40)', () => {
    expect(friendActions(true)).not.toContain('message');
  });
});
