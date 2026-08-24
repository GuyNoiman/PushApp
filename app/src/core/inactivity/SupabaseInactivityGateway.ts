/**
 * The Supabase implementation of {@link InactivityGateway} — one RPC, and the only file in this
 * feature that imports the SDK.
 *
 * It sends NOTHING. Not a timestamp, not a device id, not a state: the function reads `auth.uid()`
 * from the caller's own token and `now()` from the database. That is what makes the answer
 * authoritative rather than agreed.
 */
import { supabase } from '../social/supabaseClient';
import type { AccountLifecycleVerdict, InactivityGateway } from './InactivityGateway';

export class SupabaseInactivityGateway implements InactivityGateway {
  get enabled(): boolean {
    return supabase !== null;
  }

  async touch(): Promise<AccountLifecycleVerdict | null> {
    const client = supabase;
    if (!client) return null;
    try {
      const { data, error } = await client.rpc('touch_account_activity');
      if (error) return null;
      // The function returns one row; the SDK hands back an array for a set-returning function.
      const row = (Array.isArray(data) ? data[0] : data) as
        | { last_active_at?: string; frozen_at?: string | null; freeze_reason?: string | null }
        | undefined;
      if (!row?.last_active_at) return null;
      const lastActiveAt = Date.parse(row.last_active_at);
      if (!Number.isFinite(lastActiveAt)) return null;
      const frozenAt = row.frozen_at ? Date.parse(row.frozen_at) : NaN;
      return {
        lastActiveAt,
        ...(Number.isFinite(frozenAt) ? { frozenAt } : {}),
        ...(row.freeze_reason ? { reason: row.freeze_reason } : {}),
      };
    } catch {
      // Offline, or the migration has not been applied to this project. Either way the local sweep
      // still runs, so a returning user is still met properly.
      return null;
    }
  }
}
