/** Product KPIs — one factory, one inert fallback, as the other pillars do it. */
import { NullKpiGateway, withOnceGuard, type KpiContext, type KpiGateway, type OnceStore } from './KpiGateway';
import { SupabaseKpiGateway } from './SupabaseKpiGateway';

export * from './KpiGateway';
export * from './installId';
export * from './kpiFromEvents';
export * from './taxonomy';

let gateway: KpiGateway | null = null;

/**
 * The gateway, built once. `context` is a thunk because the app version and
 * channel are known later than this module is imported, and the installation id
 * is read from storage.
 */
export function getKpiGateway(context: () => KpiContext, once: OnceStore): KpiGateway {
  if (!gateway) {
    const supabaseGateway = new SupabaseKpiGateway(context);
    gateway = supabaseGateway.enabled ? withOnceGuard(supabaseGateway, once) : NullKpiGateway;
  }
  return gateway;
}

/** Test seam: forget the built gateway. */
export function resetKpiGateway(): void {
  gateway = null;
}
