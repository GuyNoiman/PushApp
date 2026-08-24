/**
 * SupabaseMirrorGateway — the Supabase implementation of {@link MirrorGateway}, and the only file in
 * this tool that imports the SDK.
 *
 * It enforces nothing itself. `supabase/migrations/0005_mirror_feedback.sql` is the gate, and the
 * important half of it is what it does NOT allow: there is no policy under which a requester can
 * select raw responses from a confidential round. If this class ever tried, the server would refuse.
 */
import { supabase } from '../../social/supabaseClient';
import type {
  MirrorGateway,
  MirrorInvitationRow,
  MirrorRejection,
  MirrorResponseRow,
  MirrorRoundRow,
  MirrorSynthesisRow,
  MirrorSynthesisStatus,
} from './MirrorGateway';
import type { MirrorMode } from './round';

function toRound(row: any): MirrorRoundRow {
  return {
    id: row.id,
    ownerId: row.owner_id,
    mode: row.mode as MirrorMode,
    questionIds: row.question_ids ?? [],
    customQuestions: row.custom_questions ?? [],
    status: row.status,
    ...(row.opened_at ? { openedAt: new Date(row.opened_at).getTime() } : {}),
    ...(row.closes_at ? { closesAt: new Date(row.closes_at).getTime() } : {}),
    ...(row.closed_at ? { closedAt: new Date(row.closed_at).getTime() } : {}),
  };
}

export class SupabaseMirrorGateway implements MirrorGateway {
  private uid: string | null = null;

  get enabled(): boolean {
    return supabase !== null;
  }

  private client() {
    if (!supabase) throw new Error('mirror backend not configured');
    return supabase;
  }

  private async requireUid(): Promise<string> {
    if (this.uid) return this.uid;
    const { data } = await this.client().auth.getUser();
    this.uid = data.user?.id ?? null;
    if (!this.uid) throw new Error('not signed in');
    return this.uid;
  }

  async openRound(input: {
    id: string;
    mode: MirrorMode;
    questionIds: string[];
    customQuestions: string[];
    contributorIds: readonly string[];
    closesAt: number;
  }): Promise<MirrorRoundRow> {
    const owner = await this.requireUid();
    const now = new Date();
    const { data, error } = await this.client()
      .from('mirror_rounds')
      .insert({
        id: input.id,
        owner_id: owner,
        mode: input.mode,
        question_ids: input.questionIds,
        custom_questions: input.customQuestions,
        status: 'open',
        opened_at: now.toISOString(),
        closes_at: new Date(input.closesAt).toISOString(),
      })
      .select('*')
      .single();
    if (error) throw error;

    if (input.contributorIds.length > 0) {
      const { error: inviteError } = await this.client().from('mirror_invitations').insert(
        input.contributorIds.map((contributorId) => ({
          round_id: input.id,
          contributor_id: contributorId,
        })),
      );
      if (inviteError) throw inviteError;
    }
    return toRound(data);
  }

  async myRounds(): Promise<MirrorRoundRow[]> {
    const owner = await this.requireUid();
    const { data, error } = await this.client()
      .from('mirror_rounds')
      .select('*')
      .eq('owner_id', owner)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toRound);
  }

  async invitationsForMe(): Promise<{ round: MirrorRoundRow; invitation: MirrorInvitationRow }[]> {
    const me = await this.requireUid();
    const { data, error } = await this.client()
      .from('mirror_invitations')
      .select('round_id, contributor_id, status, invited_at, round:mirror_rounds!round_id(*)')
      .eq('contributor_id', me);
    if (error) throw error;
    return (data ?? [])
      .filter((row: any) => row.round)
      .map((row: any) => ({
        round: toRound(row.round),
        invitation: {
          roundId: row.round_id,
          contributorId: row.contributor_id,
          status: row.status,
          invitedAt: new Date(row.invited_at).getTime(),
        },
      }));
  }

  async submitAnswers(
    roundId: string,
    answers: readonly { questionId: string; body: string }[],
  ): Promise<void> {
    const me = await this.requireUid();
    const { error } = await this.client().from('mirror_responses').upsert(
      answers.map((answer) => ({
        round_id: roundId,
        contributor_id: me,
        question_id: answer.questionId,
        body: answer.body,
      })),
      { onConflict: 'round_id,contributor_id,question_id' },
    );
    if (error) throw error;

    await this.client()
      .from('mirror_invitations')
      .update({ status: 'answered', answered_at: new Date().toISOString() })
      .eq('round_id', roundId)
      .eq('contributor_id', me);
  }

  async declineInvitation(roundId: string): Promise<void> {
    const me = await this.requireUid();
    const { error } = await this.client()
      .from('mirror_invitations')
      .update({ status: 'declined' })
      .eq('round_id', roundId)
      .eq('contributor_id', me);
    if (error) throw error;
  }

  async visibleResponses(roundId: string): Promise<MirrorResponseRow[]> {
    // The server decides whether this is allowed: the policy only permits it for a round whose mode
    // is 'visible'. A confidential round returns nothing here, which is the correct answer.
    const { data, error } = await this.client()
      .from('mirror_responses')
      .select('round_id, contributor_id, question_id, body, created_at')
      .eq('round_id', roundId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      roundId: row.round_id,
      contributorId: row.contributor_id,
      questionId: row.question_id,
      body: row.body,
      createdAt: new Date(row.created_at).getTime(),
    }));
  }

  async synthesis(roundId: string): Promise<MirrorSynthesisRow[]> {
    const { data, error } = await this.client()
      .from('mirror_synthesis')
      .select('round_id, question_id, body, rejection')
      .eq('round_id', roundId);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      roundId: row.round_id,
      questionId: row.question_id,
      body: row.body,
      ...(row.rejection ? { rejection: row.rejection as MirrorRejection } : {}),
    }));
  }

  /**
   * Ask the Edge Function for the confidential result.
   *
   * All this sends is a round id. Everything the answer depends on is read server-side from the
   * round row, because a client that could describe its own round could describe someone else's.
   *
   * A failure is `unavailable` and never an exception: this is called from a screen a person opened
   * hoping to read something, and "we could not produce it right now" is a sentence that screen has.
   */
  async requestSynthesis(roundId: string): Promise<MirrorSynthesisStatus> {
    try {
      const { data, error } = await this.client().functions.invoke('mirror-synthesis', {
        body: { roundId },
      });
      if (error) return 'unavailable';
      const status = (data as { status?: string } | null)?.status;
      return status === 'collecting' || status === 'delivered' || status === 'notEnough'
        ? status
        : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  /**
   * Close the round early.
   *
   * Only the owner's policy allows this, and closing is all it does — producing the result is a
   * separate ask, and one the server decides on its own terms.
   */
  async closeRound(roundId: string): Promise<void> {
    const owner = await this.requireUid();
    const { error } = await this.client()
      .from('mirror_rounds')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', roundId)
      .eq('owner_id', owner);
    if (error) throw error;
  }

  async answeredCount(roundId: string): Promise<number> {
    // A COUNT, never a list of who. Safe to show in both modes, which is why the readiness UI can
    // use the same call whichever mode the round is in.
    const { count, error } = await this.client()
      .from('mirror_invitations')
      .select('contributor_id', { count: 'exact', head: true })
      .eq('round_id', roundId)
      .eq('status', 'answered');
    if (error) throw error;
    return count ?? 0;
  }
}
