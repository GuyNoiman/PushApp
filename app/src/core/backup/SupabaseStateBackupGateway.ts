/**
 * SupabaseStateBackupGateway — the Supabase implementation of {@link StateBackupGateway}, and the
 * only file in this pillar that imports the SDK.
 *
 * It enforces nothing itself: the row-level policy in `supabase/migrations/0004_account_state_backup.sql`
 * is the gate, and it is written so an account can reach its own row and no other. This class maps
 * the domain calls onto that one table.
 */
import { supabase } from '../social/supabaseClient';
import type { StateBackup, StateBackupGateway } from './StateBackupGateway';

export class SupabaseStateBackupGateway implements StateBackupGateway {
  private uid: string | null = null;

  get enabled(): boolean {
    return supabase !== null;
  }

  private client() {
    if (!supabase) throw new Error('backup backend not configured');
    return supabase;
  }

  private async requireUid(): Promise<string> {
    if (this.uid) return this.uid;
    const { data } = await this.client().auth.getUser();
    this.uid = data.user?.id ?? null;
    if (!this.uid) throw new Error('not signed in');
    return this.uid;
  }

  async fetch(): Promise<StateBackup | null> {
    const id = await this.requireUid();
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

  async save(state: string, schemaVersion: number, deviceLabel?: string): Promise<number> {
    const id = await this.requireUid();
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
