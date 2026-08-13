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
  type AllyBundle,
  type AllyInvite,
  type AllyInviteStatus,
  type AllyMember,
  type AllyProgress,
  type Cheer,
  type CheerKind,
  type CompanionStep,
  type CompanionStepInput,
  type Friend,
  type SocialGateway,
  type SocialProfile,
  type Visibility,
} from './SocialGateway';
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
    const { data, error } = await this.client()
      .from('profiles')
      .upsert({ id, handle, buddy_summary: buddySummary })
      .select('id, handle, buddy_summary')
      .single();
    if (error) throw error;
    return toProfile(data as ProfileRow);
  }

  // ── Support Circle (friends) ──
  async findByHandle(handle: string): Promise<SocialProfile | null> {
    const { data } = await this.client().from('profiles').select('id, handle, buddy_summary').eq('handle', handle).maybeSingle();
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
      .select('requester_id, addressee_id, status, requester:profiles!requester_id(id,handle,buddy_summary), addressee:profiles!addressee_id(id,handle,buddy_summary)')
      .or(`requester_id.eq.${id},addressee_id.eq.${id}`);
    if (error) throw error;
    return (data ?? []).map((row: any): Friend => {
      const outgoing = row.requester_id === id;
      const other = outgoing ? row.addressee : row.requester;
      return {
        profile: toProfile(other as ProfileRow),
        status: row.status,
        direction: outgoing ? 'outgoing' : 'incoming',
      };
    });
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

  async incomingAllyInvites(): Promise<AllyInvite[]> {
    const id = await this.requireUid();
    const { data, error } = await this.client()
      .from('journey_allies')
      .select('journey_id, visibility, status, owner:profiles!owner_id(id,handle,buddy_summary)')
      .eq('ally_id', id)
      .eq('status', 'requested');
    if (error) throw error;
    return (data ?? []).map((row: any): AllyInvite => ({
      owner: toProfile(row.owner as ProfileRow),
      journeyId: row.journey_id,
      bundle: bundleFromVisibility(row.visibility as Visibility),
      status: row.status as AllyInviteStatus,
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
