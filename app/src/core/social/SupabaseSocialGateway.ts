/**
 * SupabaseSocialGateway — the Supabase implementation of SocialGateway.
 * The ONLY consumer of `supabaseClient`. Enforces nothing itself: the database's
 * Row-Level Security (app/supabase/schema.sql) is the real gate. This class just
 * maps our domain calls to tables/RPCs and shapes results back to DTOs.
 *
 * Auth: email OTP (a code emailed to the user) — free, no password, no SMS cost.
 */
import { supabase } from './supabaseClient';
import type {
  AllyProgress,
  Cheer,
  CheerKind,
  Friend,
  SocialGateway,
  SocialProfile,
  Visibility,
} from './SocialGateway';

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

  // ── Identity / auth ──
  async signInWithEmail(email: string): Promise<void> {
    const { error } = await this.client().auth.signInWithOtp({ email });
    if (error) throw error;
  }

  async verifyOtp(email: string, code: string): Promise<SocialProfile> {
    const { data, error } = await this.client().auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw error;
    this.uid = data.user?.id ?? null;
    return (await this.currentProfile()) ?? { id: this.uid!, handle: '', buddySummary: {} };
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

  // ── Allies (per-Journey sharing) ──
  async setAllies(journeyId: string, allyIds: string[], visibility: Visibility): Promise<void> {
    const id = await this.requireUid();
    const c = this.client();
    // Replace the ally set for this Journey: clear then insert the chosen friends.
    const { error: delErr } = await c.from('journey_allies').delete().eq('journey_id', journeyId).eq('owner_id', id);
    if (delErr) throw delErr;
    if (allyIds.length === 0) return;
    const rows = allyIds.map((ally_id) => ({ journey_id: journeyId, owner_id: id, ally_id, visibility }));
    const { error } = await c.from('journey_allies').insert(rows);
    if (error) throw error;
  }

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

  // ── Cheers ──
  async sendCheer(toId: string, journeyId: string, kind: CheerKind): Promise<void> {
    const id = await this.requireUid();
    const { error } = await this.client().from('cheers').insert({ from_id: id, to_id: toId, journey_id: journeyId, kind });
    if (error) throw error;
  }

  subscribeToCheers(onCheer: (cheer: Cheer) => void): () => void {
    if (!supabase) return () => {};
    const uid = this.uid;
    if (!uid) return () => {}; // not signed in yet; caller re-subscribes after auth
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
