/**
 * Where an outcome-evidence row goes.
 *
 * Same shape as every other pillar: an interface, an inert default, and one
 * Supabase implementation. Inert means accepted and not sent, which is the state
 * under jest, on web, and on any build with no backend — so no call site branches
 * on whether the matching engine's data collection is configured.
 *
 * Unlike the KPI stream, this row IS account-scoped. It has to be: the future
 * engine's whole question is "which method suits THIS person", and an anonymous
 * event cannot answer it. That is also why the two are separate tables with
 * separate policies — mixing them would make the KPI stream attributable and
 * leave the matching evidence without enough to hold on to.
 */
import { supabase } from '../social/supabaseClient';
import { buildOutcome, type FeltOutcome, type OutcomeEvidence } from './model';

export interface OutcomeGateway {
  readonly enabled: boolean;
  /** Returns the new row's id, or null when nothing was written. Never throws. */
  record(evidence: OutcomeEvidence): Promise<string | null>;
  /**
   * Fill in the felt half of a row somebody answered about, later.
   *
   * A separate call rather than a field on `record` because the two happen at
   * different moments and either can be the only one: an ending always writes
   * evidence, and an answer may never come.
   */
  answer(id: string, felt: FeltOutcome): Promise<boolean>;
}

export const NullOutcomeGateway: OutcomeGateway = {
  enabled: false,
  async record() {
    return null;
  },
  async answer() {
    return false;
  },
};

export class SupabaseOutcomeGateway implements OutcomeGateway {
  get enabled(): boolean {
    return supabase !== null;
  }

  async record(evidence: OutcomeEvidence): Promise<string | null> {
    const client = supabase;
    if (!client) return null;
    try {
      const { data: userData } = await client.auth.getUser();
      const id = userData?.user?.id;
      // The participant comes from the SESSION, never from the caller — a client
      // that could name a different participant could file evidence in somebody
      // else's history.
      if (!id) return null;
      const { data, error } = await client
        .from('journey_outcomes')
        .insert({ ...evidence, participant_id: id })
        .select('id')
        .single();
      if (error || !data) return null;
      return (data as { id: string }).id;
    } catch {
      // A Journey ending must never fail because its evidence could not be
      // written. The row is lost; the person's Journey is not.
      return null;
    }
  }

  async answer(id: string, felt: FeltOutcome): Promise<boolean> {
    const client = supabase;
    if (!client || !id) return false;
    try {
      // Rebuilt through the same allowlist the row was written with, so an
      // answer cannot smuggle in a field the ending could not.
      const shaped = buildOutcome({ ending: 'completed' }, felt);
      if (!shaped) return false;
      const { error } = await client
        .from('journey_outcomes')
        .update({
          satisfaction: shaped.satisfaction,
          real_world_change: shaped.real_world_change,
          effort_accuracy: shaped.effort_accuracy,
          mismatch: shaped.mismatch,
          helped: shaped.helped,
          comment: shaped.comment,
          answered_at: new Date().toISOString(),
        })
        // RLS already restricts this to the participant's own rows; the id is
        // the only thing that needs naming.
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }
}

let gateway: OutcomeGateway | null = null;

export function getOutcomeGateway(): OutcomeGateway {
  if (!gateway) {
    const real = new SupabaseOutcomeGateway();
    gateway = real.enabled ? real : NullOutcomeGateway;
  }
  return gateway;
}

export function resetOutcomeGateway(): void {
  gateway = null;
}
