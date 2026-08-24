/** The account lifecycle clock — one factory, one inert fallback, as the other pillars do it. */
import { NullInactivityGateway, type InactivityGateway } from './InactivityGateway';
import { SupabaseInactivityGateway } from './SupabaseInactivityGateway';

export * from './InactivityGateway';

let gateway: InactivityGateway | null = null;

export function getInactivityGateway(): InactivityGateway {
  if (!gateway) {
    const supabaseGateway = new SupabaseInactivityGateway();
    gateway = supabaseGateway.enabled ? supabaseGateway : NullInactivityGateway;
  }
  return gateway;
}
