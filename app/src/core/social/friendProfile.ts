/**
 * Friend-profile rules (Friend_Profile_PRD.md) — the pure, framework-free arithmetic behind the
 * relationship summary, the remove-friend impact counts, and which actions a profile may offer.
 * No React, no vendor imports: the gateway fetches rows, this decides what they MEAN, and the
 * screen only renders (Bible §19). One definition, shared by the gateway, the provider and the UI.
 *
 * PRIVACY: everything here counts rows the viewer is already authorized to read (RLS scopes both
 * `journey_allies` and `ally_snapshots()` to rows the viewer is a party to). Grouping an
 * already-authorized set is presentation — it is NOT the client-side filtering PRD §7 forbids.
 */
import type {
  AllyProgress,
  AllyRelationRow,
  FriendAction,
  RelationshipSummary,
  UnfriendImpact,
} from './SocialGateway';

/**
 * Whether this Journey↔Ally relationship was ever consented to. `accepted` obviously counts; a
 * `closed` row counts only when it carries a decision timestamp, which distinguishes "we shared
 * this Journey and it ended" from an invite that was never accepted. `requested`, `declined` and
 * `cancelled` never count — no data was ever shared, so there is no relationship to summarize.
 *
 * KNOWN EDGE (accepted, deliberate): `inviteAlly` re-upserts the SAME row with `decided_at: null`,
 * so an accepted → closed → re-invited relationship reads as not-yet-accepted until the friend
 * accepts again. That UNDERCOUNTS rather than inflates, which is the safe direction for a number
 * shown about another person.
 */
export function everAccepted(row: AllyRelationRow): boolean {
  return row.status === 'accepted' || (row.status === 'closed' && row.decidedAt !== null);
}

/**
 * The compact relationship summary (PRD §4.2): how many Journeys each of us opened to the other.
 * `lifecycle` is always `null` — the server holds no Journey lifecycle status, and a breakdown
 * derived from `journey_allies.status` would be wrong rather than merely missing (see
 * {@link RelationshipSummary}).
 */
export function summarizeRelationship(
  rows: readonly AllyRelationRow[],
  meId: string,
  friendId: string,
): RelationshipSummary {
  let theySupportMe = 0;
  let iSupportThem = 0;
  for (const row of rows) {
    if (!everAccepted(row)) continue;
    if (row.ownerId === meId && row.allyId === friendId) theySupportMe += 1;
    else if (row.ownerId === friendId && row.allyId === meId) iSupportThem += 1;
  }
  return { theySupportMe, iSupportThem, total: theySupportMe + iSupportThem, lifecycle: null };
}

/**
 * What removing this friend will actually cut, counted from live rows only (PRD §4.5). Unlike the
 * relationship summary this counts `accepted` rows ONLY: a closed row is already gone, so naming it
 * in a destructive confirmation would overstate the damage. Pending invites in EITHER direction are
 * counted separately because `cascade_unfriend()` deletes those too — the person confirming should
 * know an outstanding invite disappears with the friendship.
 */
export function computeUnfriendImpact(
  rows: readonly AllyRelationRow[],
  meId: string,
  friendId: string,
): UnfriendImpact {
  let journeysTheySupportForMe = 0;
  let journeysISupportForThem = 0;
  let pendingInvites = 0;
  for (const row of rows) {
    if (row.status === 'requested') {
      pendingInvites += 1;
      continue;
    }
    if (row.status !== 'accepted') continue;
    if (row.ownerId === meId && row.allyId === friendId) journeysTheySupportForMe += 1;
    else if (row.ownerId === friendId && row.allyId === meId) journeysISupportForThem += 1;
  }
  return { journeysTheySupportForMe, journeysISupportForThem, pendingInvites };
}

/**
 * The Journeys THIS friend shared with the viewer, most recently updated first. The server already
 * applied both the authorization gate and the title mask (`ally_snapshots()` returns a null title
 * unless the bundle is Companion), so this only narrows an authorized set to one owner.
 */
export function sharedJourneysFrom(
  allProgress: readonly AllyProgress[],
  friendId: string,
): AllyProgress[] {
  return allProgress
    .filter((p) => p.owner.id === friendId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Which actions the profile offers (PRD §4.5). Cheer appears ONLY with a shared Journey to cheer
 * ON: the `cheers_send_ally` policy requires `is_ally(journey_id, to_id, auth.uid())`, so a Cheer
 * with nothing shared is guaranteed to be rejected by the database — offering it would be a dead
 * button. Remove friend is always available. No message action exists yet (D29/D40): the seam is
 * the {@link FriendAction} union, not a greyed-out control.
 */
export function friendActions(hasSharedActiveJourney: boolean): FriendAction[] {
  return hasSharedActiveJourney ? ['cheer', 'remove'] : ['remove'];
}
