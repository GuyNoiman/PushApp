/** User reports — one factory, one inert fallback, as the other pillars do it. */
import { NullReportGateway, type ReportGateway } from './ReportGateway';
import { SupabaseReportGateway } from './SupabaseReportGateway';

export * from './model';
export * from './ReportGateway';

let gateway: ReportGateway | null = null;

export function getReportGateway(): ReportGateway {
  if (!gateway) {
    const supabaseGateway = new SupabaseReportGateway();
    gateway = supabaseGateway.enabled ? supabaseGateway : NullReportGateway;
  }
  return gateway;
}
