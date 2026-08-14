/**
 * Circle-list rules — the pure, framework-free shaping behind the Support Circle people list
 * (`(tabs)/friends.tsx`). No React, no vendor, no copy: the screen owns every string (Bible §19).
 *
 * THE DEFECT THIS FIXES: the list used to map `allyProgress`, so it was a list of shared JOURNEYS
 * wearing a person's face — a friend with nothing shared was invisible, and a friend sharing two
 * Journeys appeared twice. The Support Circle is a list of PEOPLE (Friend_Profile_PRD §8 criterion
 * 1: every accepted friend is an entry point to their profile), so it is built from the friends
 * list and ally progress folds in as the status line only.
 */
import type { AllyProgress, Friend, SocialProfile } from './SocialGateway';

/**
 * What we can honestly say about a friend's shared Journeys, as DATA rather than copy.
 * `title: null` means the owner shared this Journey as an Encourager, so the server masked the
 * title — the screen renders its own "a Journey" placeholder rather than inventing one here.
 */
export type CircleRowStatus =
  | { kind: 'none' }
  | { kind: 'one'; pct: number; title: string | null }
  | { kind: 'many'; count: number; pct: number; title: string | null };

/** One person in the Support Circle list. Exactly one row per accepted friend. */
export interface CircleRow {
  /** The friend's stable profile id — also the row key and the `/friend/[id]` target (PRD §7). */
  id: string;
  profile: SocialProfile;
  status: CircleRowStatus;
  /**
   * Where a Cheer would land: their most recently updated shared Journey, or null when nothing is
   * shared. Null means the screen shows NO Cheer action — the `cheers_send_ally` policy requires
   * `is_ally(journey_id, ...)`, so a Cheer with nothing shared is guaranteed to be rejected.
   */
  cheerTarget: { toId: string; journeyId: string } | null;
}

/** 0..1 progress as a whole percent, clamped — a bad server value can never render as -4% or 130%. */
function percent(progress: number): number {
  return Math.round(Math.max(0, Math.min(1, progress)) * 100);
}

/**
 * One row per ACCEPTED friend, in the order the gateway returned them. Pending requests are
 * deliberately absent: they live in the Inbox, and someone who has not accepted yet is not a
 * friend whose profile may be opened.
 */
export function buildCircleRows(
  friends: readonly Friend[],
  allyProgress: readonly AllyProgress[],
): CircleRow[] {
  return friends
    .filter((f) => f.status === 'accepted')
    .map((friend) => {
      // Most-recently-updated first, so both the status line and the Cheer target describe the
      // Journey this person actually moved on last.
      const shared = allyProgress
        .filter((ap) => ap.owner.id === friend.profile.id)
        .sort((a, b) => b.updatedAt - a.updatedAt);
      const latest = shared[0];
      const status: CircleRowStatus = !latest
        ? { kind: 'none' }
        : shared.length === 1
          ? { kind: 'one', pct: percent(latest.progress), title: latest.title }
          : { kind: 'many', count: shared.length, pct: percent(latest.progress), title: latest.title };
      return {
        id: friend.profile.id,
        profile: friend.profile,
        status,
        cheerTarget: latest ? { toId: friend.profile.id, journeyId: latest.journeyId } : null,
      };
    });
}
