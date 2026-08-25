/**
 * ReportGateway — the boundary for sending a user report.
 *
 * ONE METHOD, and it takes a {@link ReportDraft} plus {@link ReportDiagnostics} rather than an open
 * object, so the set of things that can be sent is the set of things the types name. Vendor-
 * independent (Engineering Bible §3): one implementation file touches the SDK.
 */
import type { ReportDiagnostics, ReportDraft } from './model';

export interface ReportGateway {
  readonly enabled: boolean;
  /**
   * Send it. Returns the new report's id, or null when it could not be sent — which the screen says
   * out loud rather than pretending, because a report that silently vanished is worse than a form
   * that admits it failed.
   */
  send(draft: ReportDraft, diagnostics: ReportDiagnostics): Promise<string | null>;
}

export const NullReportGateway: ReportGateway = {
  enabled: false,
  async send() {
    return null;
  },
};
