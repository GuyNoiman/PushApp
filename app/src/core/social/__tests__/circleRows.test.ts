/**
 * circleRows — the pure shaping behind the Support Circle people list (Friend_Profile_PRD §8).
 *
 * This module exists because of ONE defect: the list used to be built from `allyProgress`, so it was
 * a list of shared JOURNEYS wearing a person's face. A friend who shared nothing was invisible, and a
 * friend who shared two Journeys appeared twice. Both halves of that defect are pinned here — the
 * Support Circle is a list of PEOPLE, exactly one row per accepted friend, whatever they share.
 *
 * The rest is the honesty rules around that row: a masked (Encourager) title stays `null` so the
 * screen supplies its own placeholder rather than inventing one, the Cheer target is the Journey the
 * person actually moved on last, and a pending request is not a friend yet. No React, no backend.
 */
import { buildCircleRows } from '../circleRows';
import type { AllyProgress, Friend, FriendStatus, SocialProfile } from '../SocialGateway';

function profile(id: string, handle: string): SocialProfile {
  return { id, handle, buddySummary: {} };
}

function friend(id: string, handle: string, status: FriendStatus = 'accepted'): Friend {
  return { profile: profile(id, handle), status, direction: 'outgoing' };
}

function progress(
  ownerId: string,
  journeyId: string,
  overrides: Partial<AllyProgress> = {},
): AllyProgress {
  return {
    owner: profile(ownerId, ownerId),
    journeyId,
    title: 'Run 5km',
    progress: 0.5,
    streak: 3,
    updatedAt: 1_000,
    visibility: 'full',
    ...overrides,
  };
}

describe('buildCircleRows — one row per PERSON (the defect this module fixes)', () => {
  it('renders a friend who shares NOTHING — exactly one row, with no Cheer target', () => {
    const rows = buildCircleRows([friend('f1', 'dan')], []);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('f1');
    expect(rows[0].status).toEqual({ kind: 'none' });
    // No shared Journey ⇒ no Cheer: `cheers_send_ally` requires an Ally row, so the database
    // would refuse the send. The screen reads this null and offers no action at all.
    expect(rows[0].cheerTarget).toBeNull();
  });

  it('renders a friend who shares TWO Journeys ONCE, not twice', () => {
    const rows = buildCircleRows(
      [friend('f1', 'dan')],
      [progress('f1', 'j1', { updatedAt: 100 }), progress('f1', 'j2', { updatedAt: 200 })],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toEqual({ kind: 'many', count: 2, pct: 50, title: 'Run 5km' });
  });

  it('keeps every accepted friend, in the order the gateway returned them', () => {
    const rows = buildCircleRows(
      [friend('f1', 'dan'), friend('f2', 'sam'), friend('f3', 'ada')],
      [progress('f2', 'j1')],
    );
    // The friend WITH a shared Journey does not jump the queue, and the two without still appear.
    expect(rows.map((r) => r.id)).toEqual(['f1', 'f2', 'f3']);
  });
});

describe('buildCircleRows — the status a row may honestly claim', () => {
  it('reports a single shared Journey with its title and whole-percent progress', () => {
    const rows = buildCircleRows([friend('f1', 'dan')], [progress('f1', 'j1', { progress: 0.44 })]);
    expect(rows[0].status).toEqual({ kind: 'one', pct: 44, title: 'Run 5km' });
  });

  it('leaves a MASKED (Encourager) title null — the screen supplies its own copy', () => {
    const rows = buildCircleRows(
      [friend('f1', 'dan')],
      [progress('f1', 'j1', { title: null, visibility: 'progress' })],
    );
    expect(rows[0].status).toMatchObject({ kind: 'one', title: null });
  });

  it('clamps a bad server progress value rather than rendering -4% or 130%', () => {
    const low = buildCircleRows([friend('f1', 'dan')], [progress('f1', 'j1', { progress: -0.4 })]);
    const high = buildCircleRows([friend('f1', 'dan')], [progress('f1', 'j1', { progress: 1.3 })]);
    expect(low[0].status).toMatchObject({ pct: 0 });
    expect(high[0].status).toMatchObject({ pct: 100 });
  });

  it('describes the MOST RECENTLY UPDATED shared Journey when there are several', () => {
    const rows = buildCircleRows(
      [friend('f1', 'dan')],
      [
        progress('f1', 'j-old', { updatedAt: 100, title: 'Old', progress: 0.1 }),
        progress('f1', 'j-new', { updatedAt: 900, title: 'New', progress: 0.9 }),
      ],
    );
    expect(rows[0].status).toEqual({ kind: 'many', count: 2, pct: 90, title: 'New' });
  });
});

describe('buildCircleRows — the Cheer target', () => {
  it('points at the friend and their most recently updated shared Journey', () => {
    const rows = buildCircleRows(
      [friend('f1', 'dan')],
      [progress('f1', 'j-old', { updatedAt: 100 }), progress('f1', 'j-new', { updatedAt: 900 })],
    );
    expect(rows[0].cheerTarget).toEqual({ toId: 'f1', journeyId: 'j-new' });
  });

  it('never targets someone else’s Journey', () => {
    const rows = buildCircleRows(
      [friend('f1', 'dan'), friend('f2', 'sam')],
      [progress('f2', 'j2')],
    );
    expect(rows[0].cheerTarget).toBeNull();
    expect(rows[1].cheerTarget).toEqual({ toId: 'f2', journeyId: 'j2' });
  });
});

describe('buildCircleRows — who counts as a friend', () => {
  it('excludes PENDING requests — they live in the Inbox, and their profile may not be opened', () => {
    const rows = buildCircleRows(
      [friend('f1', 'dan'), friend('f2', 'sam', 'pending')],
      // Even a pending person with shared progress stays out: they are not a friend yet.
      [progress('f2', 'j2')],
    );
    expect(rows.map((r) => r.id)).toEqual(['f1']);
  });

  it('returns nothing at all for an empty Support Circle', () => {
    expect(buildCircleRows([], [progress('f1', 'j1')])).toEqual([]);
  });
});
