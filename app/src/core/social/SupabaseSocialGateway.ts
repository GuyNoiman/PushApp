/**
 * SupabaseSocialGateway — the Supabase implementation of SocialGateway.
 * The ONLY consumer of `supabaseClient`. Enforces nothing itself: the database's
 * Row-Level Security (app/supabase/schema.sql) is the real gate. This class just
 * maps our domain calls to tables/RPCs and shapes results back to DTOs.
 *
 * Auth: anonymous sign-in — no email, no SMTP, no cost. The user picks a handle
 * so friends can find them. (Upgradable to email/password later, Commercial-stage.)
 */
import { supabase } from './supabaseClient';
import {
  bundleFromVisibility,
  bundleToVisibility,
  NotFriendsError,
  type AllyBundle,
  type AllyInvite,
  type AllyInviteStatus,
  type AllyMember,
  type AllyProgress,
  type AllyRelationRow,
  type Cheer,
  type CheerKind,
  type CompanionStep,
  type CompanionStepInput,
  type Friend,
  type FriendProfileView,
  type JourneyStatusEvent,
  type SocialGateway,
  type SocialProfile,
  type UnfriendImpact,
  type Visibility,
} from './SocialGateway';
import { computeUnfriendImpact, sharedJourneysFrom, summarizeRelationship } from './friendProfile';
import { canonicalHandle } from './username';
import type { StepStatus } from '../status/stepStatus';

type ProfileRow = { id: string; handle: string; buddy_summary: SocialProfile['buddySummary'] };

function toProfile(row: ProfileRow): SocialProfile {
  return { id: row.id, handle: row.handle, buddySummary: row.buddy_summary ?? {} };
}

export class SupabaseSocialGateway implements SocialGateway {
  readonly enabled = supabase !== null;
  /** Cached current user id, kept fresh via onAuthStateChange (needed for realtime filters). */
  private uid: string | null = null;

  constructor() {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => { this.uid = data.user?.id ?? null; });
    supabase.auth.onAuthStateChange((_e, session) => { this.uid = session?.user?.id ?? null; });
  }

  private client() {
    if (!supabase) throw new Error('Social pillar is disabled (no Supabase env).');
    return supabase;
  }

  // ── Identity / auth (anonymous) ──
  async signInAnonymously(): Promise<void> {
    const c = this.client();
    const { data: userData } = await c.auth.getUser();
    if (userData.user) { this.uid = userData.user.id; return; } // already signed in
    const { data, error } = await c.auth.signInAnonymously();
    if (error) throw error;
    this.uid = data.user?.id ?? null;
  }

  async signOut(): Promise<void> {
    await this.client().auth.signOut();
    this.uid = null;
  }

  async currentProfile(): Promise<SocialProfile | null> {
    const { data: userData } = await this.client().auth.getUser();
    const id = userData.user?.id;
    if (!id) return null;
    const { data } = await this.client().from('profiles').select('id, handle, buddy_summary').eq('id', id).maybeSingle();
    return data ? toProfile(data as ProfileRow) : null;
  }

  async upsertProfile(handle: string, buddySummary: SocialProfile['buddySummary']): Promise<SocialProfile> {
    const { data: userData } = await this.client().auth.getUser();
    const id = userData.user?.id;
    if (!id) throw new Error('Not signed in.');
    // Stored in the ONE canonical form (2026-08-27). It used to be stored exactly as typed, so an
    // `@` somebody typed out of habit became part of their name and a capital letter made them
    // unfindable — see `canonicalHandle` for why that is one function and not a convention.
    const { data, error } = await this.client()
      .from('profiles')
      .upsert({ id, handle: canonicalHandle(handle), buddy_summary: buddySummary })
      .select('id, handle, buddy_summary')
      .single();
    if (error) throw error;
    return toProfile(data as ProfileRow);
  }

  // ── Support Circle (friends) ──
  async findByHandle(handle: string): Promise<SocialProfile | null> {
    // The SAME canonical form the upsert stores. An exact, case-sensitive match against a
    // verbatim-stored string is how two people ended up unable to find each other while both
    // spelling the name correctly.
    const wanted = canonicalHandle(handle);
    if (!wanted) return null;
    const { data } = await this.client().from('profiles').select('id, handle, buddy_summary').eq('handle', wanted).maybeSingle();
    return data ? toProfile(data as ProfileRow) : null;
  }

  async requestFriend(profileId: string): Promise<void> {
    const id = await this.requireUid();
    const { error } = await this.client().from('friendships').insert({ requester_id: id, addressee_id: profileId });
    if (error) throw error;
  }

  async respondToFriend(requesterId: string, accept: boolean): Promise<void> {
    const id = await this.requireUid();
    if (accept) {
      const { error } = await this.client().from('friendships')
        .update({ status: 'accepted' }).eq('requester_id', requesterId).eq('addressee_id', id);
      if (error) throw error;
    } else {
      const { error } = await this.client().from('friendships')
        .delete().eq('requester_id', requesterId).eq('addressee_id', id);
      if (error) throw error;
    }
  }

  async listFriends(): Promise<Friend[]> {
    const id = await this.requireUid();
    const { data, error } = await this.client()
      .from('friendships')
      .select('requester_id, addressee_id, status, created_at, requester:profiles!requester_id(id,handle,buddy_summary), addressee:profiles!addressee_id(id,handle,buddy_summary)')
      .or(`requester_id.eq.${id},addressee_id.eq.${id}`);
    if (error) throw error;
    return (data ?? []).map((row: any): Friend => {
      const outgoing = row.requester_id === id;
      const other = outgoing ? row.addressee : row.requester;
      return {
        profile: toProfile(other as ProfileRow),
        status: row.status,
        direction: outgoing ? 'outgoing' : 'incoming',
        // The column has always been there (`friendships.created_at`, not null); it was simply
        // never selected. The bell needs it to place the request in time.
        ...(row.created_at ? { requestedAt: new Date(row.created_at).getTime() } : {}),
      };
    });
  }

  // ── Friend Profile (viewer-scoped, Friend_Profile_PRD.md) ──
  async friendProfile(friendId: string): Promise<FriendProfileView> {
    const me = await this.requireUid();
    await this.assertFriends(friendId);
    const c = this.client();
    // PRD §4.1 / acceptance criterion 3 (no private field may ever ARRIVE in this payload) is
    // satisfied STRUCTURALLY, not by this select list: `public.profiles` holds only
    // (id, handle, buddy_summary, created_at), so email, age/birthday, country, gender/form of
    // address and auth-provider data physically cannot come back. Adding ANY column to `profiles`
    // means re-reviewing this read against §4.1.
    const { data: prof, error: profErr } = await c
      .from('profiles')
      .select('id, handle, buddy_summary')
      .eq('id', friendId)
      .maybeSingle();
    if (profErr) throw profErr;
    // A friendship row with no profile behind it means the account is gone. Treat it exactly like
    // "not connected" so a deleted user can never expose stale shared data (PRD §6).
    if (!prof) throw new NotFriendsError();
    const [rows, allShared] = await Promise.all([this.allyRowsWith(friendId), this.allyProgress()]);
    return {
      profile: toProfile(prof as ProfileRow),
      relationship: summarizeRelationship(rows, me, friendId),
      // Active-only (PRD §4.3) holds by construction: the owner withdraws the snapshot the moment
      // a shared Journey stops being Active (see `withdrawProgress`), so `ally_snapshots()` serves
      // Active Journeys only. `ally_snapshots()` also applies the per-viewer title mask server-side.
      sharedActive: sharedJourneysFrom(allShared, friendId),
      fetchedAt: Date.now(),
    };
  }

  async unfriendImpact(friendId: string): Promise<UnfriendImpact> {
    const me = await this.requireUid();
    return computeUnfriendImpact(await this.allyRowsWith(friendId), me, friendId);
  }

  async removeFriend(friendId: string): Promise<void> {
    const me = await this.requireUid();
    const c = this.client();
    // Delete the `friendships` row in BOTH orientations — either side may have sent the request,
    // and `friendships_delete_own` permits both.
    //
    // Do NOT touch `journey_allies` here. The `trg_friendships_unfriend` trigger runs
    // `cascade_unfriend()` as SECURITY DEFINER and removes every Ally row in BOTH directions —
    // including still-pending invites — whichever side pressed the button. A client-side delete
    // could only reach the rows this user's RLS lets them write, i.e. half the relationship.
    const [outgoing, incoming] = await Promise.all([
      c.from('friendships').delete().eq('requester_id', me).eq('addressee_id', friendId),
      c.from('friendships').delete().eq('requester_id', friendId).eq('addressee_id', me),
    ]);
    if (outgoing.error) throw outgoing.error;
    if (incoming.error) throw incoming.error;
  }

  /**
   * Every `journey_allies` row between the current user and one friend, in both directions.
   * Deliberately TWO plain queries rather than one PostgREST `.or('and(...),and(...)')` group:
   * the nested-boolean syntax is easy to get subtly wrong, and two `.eq().eq()` reads are
   * trivially correct and obviously RLS-clean.
   */
  private async allyRowsWith(friendId: string): Promise<AllyRelationRow[]> {
    const me = await this.requireUid();
    const c = this.client();
    const cols = 'journey_id, owner_id, ally_id, status, visibility, decided_at';
    const [mine, theirs] = await Promise.all([
      c.from('journey_allies').select(cols).eq('owner_id', me).eq('ally_id', friendId),
      c.from('journey_allies').select(cols).eq('owner_id', friendId).eq('ally_id', me),
    ]);
    if (mine.error) throw mine.error;
    if (theirs.error) throw theirs.error;
    return [...(mine.data ?? []), ...(theirs.data ?? [])].map((row: any): AllyRelationRow => ({
      journeyId: row.journey_id,
      ownerId: row.owner_id,
      allyId: row.ally_id,
      status: row.status as AllyInviteStatus,
      bundle: bundleFromVisibility(row.visibility as Visibility),
      decidedAt: row.decided_at ? new Date(row.decided_at).getTime() : null,
    }));
  }

  /**
   * Fail closed unless an ACCEPTED friendship exists in one orientation or the other. A missing row
   * and a still-`pending` one are treated identically — nothing about a person is shown before the
   * friendship is mutual. This is a client-side courtesy that produces the right SCREEN state; the
   * real gate is `are_friends()` inside the SECURITY DEFINER reads.
   */
  private async assertFriends(friendId: string): Promise<void> {
    const me = await this.requireUid();
    const c = this.client();
    const [outgoing, incoming] = await Promise.all([
      c.from('friendships').select('status').eq('requester_id', me).eq('addressee_id', friendId).maybeSingle(),
      c.from('friendships').select('status').eq('requester_id', friendId).eq('addressee_id', me).maybeSingle(),
    ]);
    // A transport/permission failure must surface as itself — an offline blip is not a broken
    // friendship, and the two states get very different screens (PRD §6).
    if (outgoing.error) throw outgoing.error;
    if (incoming.error) throw incoming.error;
    const accepted = [outgoing.data, incoming.data].some(
      (row) => (row as { status?: string } | null)?.status === 'accepted',
    );
    if (!accepted) throw new NotFriendsError();
  }

  // ── Support Circle: per-Journey Ally invites (consent-gated, D2) ──
  async inviteAlly(journeyId: string, allyId: string, bundle: AllyBundle): Promise<void> {
    const id = await this.requireUid();
    // Upsert so re-inviting after a Declined/Cancelled invite re-opens the SAME row (no duplicate
    // active invitation — D2 §4). The recipient must accept again; reset the decision timestamps.
    const { error } = await this.client().from('journey_allies').upsert(
      {
        journey_id: journeyId,
        owner_id: id,
        ally_id: allyId,
        visibility: bundleToVisibility(bundle),
        status: 'requested',
        decided_at: null,
        closed_at: null,
      },
      { onConflict: 'journey_id,owner_id,ally_id' },
    );
    if (error) throw error;
  }

  async respondToAllyInvite(journeyId: string, ownerId: string, accept: boolean): Promise<void> {
    const id = await this.requireUid();
    const { error } = await this.client()
      .from('journey_allies')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('journey_id', journeyId)
      .eq('owner_id', ownerId)
      .eq('ally_id', id)
      .eq('status', 'requested'); // guard the stale-request race (D2 §8)
    if (error) throw error;
  }

  async cancelInvite(journeyId: string, allyId: string): Promise<void> {
    const id = await this.requireUid();
    const { error } = await this.client()
      .from('journey_allies')
      .update({ status: 'cancelled' })
      .eq('journey_id', journeyId)
      .eq('owner_id', id)
      .eq('ally_id', allyId)
      .eq('status', 'requested');
    if (error) throw error;
  }

  async removeAlly(journeyId: string, allyId: string): Promise<void> {
    const id = await this.requireUid();
    // Close (not delete) to retain relationship history (D2 §6); the read-gate on status='accepted'
    // cuts access immediately. A later re-invite re-opens the same row.
    const { error } = await this.client()
      .from('journey_allies')
      .update({ status: 'closed' })
      .eq('journey_id', journeyId)
      .eq('owner_id', id)
      .eq('ally_id', allyId);
    if (error) throw error;
  }

  async changeAllyBundle(journeyId: string, allyId: string, bundle: AllyBundle): Promise<void> {
    const id = await this.requireUid();
    const { error } = await this.client()
      .from('journey_allies')
      .update({ visibility: bundleToVisibility(bundle) })
      .eq('journey_id', journeyId)
      .eq('owner_id', id)
      .eq('ally_id', allyId);
    if (error) throw error;
  }

  async listJourneyAllies(journeyId: string): Promise<AllyMember[]> {
    const id = await this.requireUid();
    const { data, error } = await this.client()
      .from('journey_allies')
      .select('visibility, status, ally:profiles!ally_id(id,handle,buddy_summary)')
      .eq('journey_id', journeyId)
      .eq('owner_id', id)
      .in('status', ['requested', 'accepted', 'declined']); // hide cancelled/closed rows
    if (error) throw error;
    return (data ?? []).map((row: any): AllyMember => ({
      profile: toProfile(row.ally as ProfileRow),
      bundle: bundleFromVisibility(row.visibility as Visibility),
      status: row.status as AllyInviteStatus,
    }));
  }

  async listAllAllies(): Promise<AllyMember[]> {
    const id = await this.requireUid();
    // Every Journey of mine at once, ACCEPTED only — the same row shape as `listJourneyAllies`,
    // without the per-Journey filter. A person in three of my circles comes back three times; the
    // pure `globalAllies` derivation is what collapses them into one person.
    const { data, error } = await this.client()
      .from('journey_allies')
      .select('visibility, status, ally:profiles!ally_id(id,handle,buddy_summary)')
      .eq('owner_id', id)
      .eq('status', 'accepted');
    if (error) throw error;
    return (data ?? []).map((row: any): AllyMember => ({
      profile: toProfile(row.ally as ProfileRow),
      bundle: bundleFromVisibility(row.visibility as Visibility),
      status: row.status as AllyInviteStatus,
    }));
  }

  async incomingAllyInvites(): Promise<AllyInvite[]> {
    const id = await this.requireUid();
    const { data, error } = await this.client()
      .from('journey_allies')
      .select('journey_id, visibility, status, requested_at, owner:profiles!owner_id(id,handle,buddy_summary)')
      .eq('ally_id', id)
      .eq('status', 'requested');
    if (error) throw error;
    return (data ?? []).map((row: any): AllyInvite => ({
      owner: toProfile(row.owner as ProfileRow),
      journeyId: row.journey_id,
      bundle: bundleFromVisibility(row.visibility as Visibility),
      status: row.status as AllyInviteStatus,
      ...(row.requested_at ? { requestedAt: new Date(row.requested_at).getTime() } : {}),
    }));
  }

  async closeJourneyInvites(journeyId: string): Promise<void> {
    const id = await this.requireUid();
    const { error } = await this.client()
      .from('journey_allies')
      .update({ status: 'closed' })
      .eq('journey_id', journeyId)
      .eq('owner_id', id)
      .in('status', ['requested', 'accepted']);
    if (error) throw error;
  }

  async publishCompanionSteps(journeyId: string, steps: CompanionStepInput[]): Promise<void> {
    const id = await this.requireUid();
    const c = this.client();
    // Replace the Journey's Companion rows so a removed/renamed Step never lingers server-side.
    const { error: delErr } = await c
      .from('companion_steps')
      .delete()
      .eq('owner_id', id)
      .eq('journey_id', journeyId);
    if (delErr) throw delErr;
    if (steps.length === 0) return;
    const rows = steps.map((s) => ({
      owner_id: id,
      journey_id: journeyId,
      step_id: s.stepId,
      title: s.title,
      status: s.status,
      reported_at: s.reportedAt != null ? new Date(s.reportedAt).toISOString() : null,
    }));
    const { error } = await c.from('companion_steps').insert(rows);
    if (error) throw error;
  }

  async companionSteps(ownerId: string, journeyId: string): Promise<CompanionStep[]> {
    const { data, error } = await this.client().rpc('ally_journey_steps', {
      p_owner: ownerId,
      p_journey: journeyId,
    });
    if (error) throw error;
    const rows = (data ?? []) as {
      step_id: string; title: string; status: StepStatus;
      reported_at: string | null; updated_at: string;
    }[];
    return rows.map((r) => ({
      stepId: r.step_id,
      title: r.title,
      status: r.status,
      reportedAt: r.reported_at ? new Date(r.reported_at).getTime() : null,
      updatedAt: new Date(r.updated_at).getTime(),
    }));
  }

  // ── Allies (per-Journey sharing) ──
  async publishProgress(summary: { journeyId: string; title: string; progress: number; streak: number }): Promise<void> {
    const id = await this.requireUid();
    const { error } = await this.client().from('progress_snapshots').upsert({
      owner_id: id,
      journey_id: summary.journeyId,
      title: summary.title,
      progress: summary.progress,
      streak: summary.streak,
    });
    if (error) throw error;
  }

  async withdrawProgress(journeyId: string): Promise<void> {
    const id = await this.requireUid();
    // Delete the SNAPSHOT only (permitted by `snapshots_owner_all`) — never the `journey_allies`
    // rows. The Support Circle stays intact and still `accepted`, so resuming a Frozen Journey
    // republishes it and it reappears for the same Allies with the same bundle (PRD §4.3).
    const { error } = await this.client()
      .from('progress_snapshots')
      .delete()
      .eq('owner_id', id)
      .eq('journey_id', journeyId);
    if (error) throw error;
  }

  async allyProgress(): Promise<AllyProgress[]> {
    const c = this.client();
    const { data, error } = await c.rpc('ally_snapshots');
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      owner_id: string; journey_id: string; title: string | null;
      progress: number; streak: number; updated_at: string; visibility: Visibility;
    }>;
    if (rows.length === 0) return [];
    // Fetch owner profiles (cosmetic) for display.
    const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id)));
    const { data: profs } = await c.from('profiles').select('id, handle, buddy_summary').in('id', ownerIds);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, toProfile(p as ProfileRow)]));
    return rows.map((r) => ({
      owner: byId.get(r.owner_id) ?? { id: r.owner_id, handle: '', buddySummary: {} },
      journeyId: r.journey_id,
      title: r.title,
      progress: Number(r.progress),
      streak: r.streak,
      updatedAt: new Date(r.updated_at).getTime(),
      visibility: r.visibility,
    }));
  }

  async mySharedJourneyIds(): Promise<string[]> {
    const id = await this.requireUid();
    const { data, error } = await this.client()
      .from('journey_allies')
      .select('journey_id')
      .eq('owner_id', id);
    if (error) throw error;
    // Distinct: a Journey may have several Allies (one row each).
    return Array.from(new Set((data ?? []).map((r: any) => r.journey_id as string)));
  }

  async myCompanionJourneyIds(): Promise<string[]> {
    const id = await this.requireUid();
    const { data, error } = await this.client()
      .from('journey_allies')
      .select('journey_id')
      .eq('owner_id', id)
      .eq('visibility', 'full') // Companion bundle
      .in('status', ['requested', 'accepted']);
    if (error) throw error;
    return Array.from(new Set((data ?? []).map((r: any) => r.journey_id as string)));
  }

  // ── Cheers ──
  async sendCheer(toId: string, journeyId: string, kind: CheerKind): Promise<void> {
    const id = await this.requireUid();
    const { error } = await this.client().from('cheers').insert({ from_id: id, to_id: toId, journey_id: journeyId, kind });
    if (error) throw error;
  }

  async listReceivedCheers(days: number): Promise<Cheer[]> {
    const id = await this.requireUid();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.client()
      .from('cheers')
      .select('id, from_id, to_id, journey_id, kind, created_at')
      .eq('to_id', id)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any): Cheer => ({
      id: r.id,
      fromId: r.from_id,
      toId: r.to_id,
      journeyId: r.journey_id,
      kind: r.kind,
      createdAt: new Date(r.created_at).getTime(),
    }));
  }

  // ── Journey status events (R6, D79) ─────────────────────────────────────────────────────────

  /**
   * Record that this user paused or resumed one of their own Journeys.
   *
   * THE INSERT IS THE PRIVACY BOUNDARY, and it is written as a closed literal on purpose: three
   * fields, all of them ids or an enum. There is no spread, no options bag and no caller-supplied
   * object, so a later change cannot quietly add a reason to it — and the SQL has no column for one
   * either (migration 0009). Two locks, because this is the row an Ally reads.
   */
  async publishJourneyStatusEvent(journeyId: string, kind: 'paused' | 'resumed'): Promise<void> {
    const ownerId = await this.requireUid();
    const { error } = await this.client()
      .from('journey_status_events')
      .insert({ owner_id: ownerId, journey_id: journeyId, kind });
    if (error) throw error;
  }

  /**
   * Pause/resume events on Journeys this user is an Ally of, within the last `days`.
   *
   * The query asks for every row it is allowed to see and RLS answers with exactly the Journeys
   * this user is an accepted Ally of — plus their OWN, which are filtered out here: somebody does
   * not need a notification about a button they just pressed.
   */
  async allyJourneyStatusEvents(days: number): Promise<JourneyStatusEvent[]> {
    const uid = await this.requireUid();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.client()
      .from('journey_status_events')
      .select('id, owner_id, journey_id, kind, created_at')
      .neq('owner_id', uid)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any): JourneyStatusEvent => ({
      id: r.id,
      ownerId: r.owner_id,
      journeyId: r.journey_id,
      kind: r.kind,
      at: new Date(r.created_at).getTime(),
    }));
  }

  subscribeToCheers(uid: string, onCheer: (cheer: Cheer) => void): () => void {
    if (!supabase) return () => {};
    if (!uid) return () => {}; // caller has no session yet; it re-subscribes with the uid
    const client = supabase; // narrowed non-null for the unsubscribe closure
    const channel = client
      .channel(`cheers:${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cheers', filter: `to_id=eq.${uid}` },
        (payload) => {
          const r = payload.new as any;
          onCheer({ id: r.id, fromId: r.from_id, toId: r.to_id, journeyId: r.journey_id, kind: r.kind, createdAt: new Date(r.created_at).getTime() });
        })
      .subscribe();
    return () => { client.removeChannel(channel); };
  }

  // Ally progress is NOT realtime (security fix F2: snapshots off the realtime
  // publication so the title mask can't be bypassed). Callers refresh via
  // allyProgress() on open. Kept for interface parity.
  subscribeToAllyUpdates(): () => void {
    return () => {};
  }

  private async requireUid(): Promise<string> {
    if (this.uid) return this.uid;
    const { data } = await this.client().auth.getUser();
    this.uid = data.user?.id ?? null;
    if (!this.uid) throw new Error('Not signed in.');
    return this.uid;
  }
}
