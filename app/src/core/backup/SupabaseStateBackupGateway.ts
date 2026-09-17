/**
 * SupabaseStateBackupGateway — the Supabase implementation of {@link StateBackupGateway}, and the
 * only file in this pillar that imports the SDK.
 *
 * It enforces nothing itself: the row-level policy in `supabase/migrations/0004_account_state_backup.sql`
 * is the gate, and it is written so an account can reach its own row and no other. This class maps
 * the domain calls onto that one table.
 */
import { supabase } from '../social/supabaseClient';
import {
  StateBackupAccountChangedError,
  type StateBackup,
  type StateBackupGateway,
} from './StateBackupGateway';

export class SupabaseStateBackupGateway implements StateBackupGateway {
  get enabled(): boolean {
    return supabase !== null;
  }

  private client() {
    if (!supabase) throw new Error('backup backend not configured');
    return supabase;
  }

  /**
   * The account the session holds RIGHT NOW, read on every call.
   *
   * THE BUG THIS REPLACES (found 2026-09-17): the id used to be cached on the first call. The first
   * call belongs to the anonymous session the app opens at launch, so after a real Apple or Google
   * sign-in every fetch read the anonymous account's row and every save was refused by RLS and
   * swallowed. Restoring on a new phone could not work for anybody. The session is read from local
   * storage (no network round trip), and RLS still decides what the id may reach.
   */
  private async requireUid(expectedUserId?: string): Promise<string> {
    const { data } = await this.client().auth.getSession();
    const id = data.session?.user.id ?? null;
    if (!id) throw new Error('not signed in');
    if (expectedUserId !== undefined && id !== expectedUserId) {
      throw new StateBackupAccountChangedError();
    }
    return id;
  }

  async fetch(expectedUserId?: string): Promise<StateBackup | null> {
    const id = await this.requireUid(expectedUserId);
    const { data, error } = await this.client()
      .from('account_state')
      .select('state, schema_version, updated_at, device_label')
      .eq('user_id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as {
      state: string;
      schema_version: number;
      updated_at: string;
      device_label: string | null;
    };
    return {
      state: row.state,
      schemaVersion: row.schema_version,
      updatedAt: new Date(row.updated_at).getTime(),
      ...(row.device_label ? { deviceLabel: row.device_label } : {}),
    };
  }

  async save(
    state: string,
    schemaVersion: number,
    deviceLabel?: string,
    expectedUserId?: string,
  ): Promise<number> {
    const id = await this.requireUid(expectedUserId);
    const updatedAt = new Date();
    const { error } = await this.client().from('account_state').upsert({
      user_id: id,
      state,
      schema_version: schemaVersion,
      device_label: deviceLabel ?? null,
      updated_at: updatedAt.toISOString(),
    });
    if (error) throw error;
    return updatedAt.getTime();
  }

  async clear(): Promise<void> {
    const id = await this.requireUid();
    const { error } = await this.client().from('account_state').delete().eq('user_id', id);
    if (error) throw error;
  }
}
