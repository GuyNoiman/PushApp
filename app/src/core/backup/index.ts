/**
 * The backup pillar's entry point — one factory, one inert fallback, mirroring the other pillars so
 * no caller has to know whether a backend is configured.
 */
import { NullStateBackupGateway, type StateBackupGateway } from './StateBackupGateway';
import { SupabaseStateBackupGateway } from './SupabaseStateBackupGateway';

export * from './backupPolicy';
export * from './StateBackupGateway';

let gateway: StateBackupGateway | null = null;

export function getStateBackupGateway(): StateBackupGateway {
  if (!gateway) {
    const supabaseGateway = new SupabaseStateBackupGateway();
    gateway = supabaseGateway.enabled ? supabaseGateway : NullStateBackupGateway;
  }
  return gateway;
}
