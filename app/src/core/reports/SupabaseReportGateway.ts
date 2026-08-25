/**
 * The Supabase implementation — one insert into `app_reports`, and nothing else.
 *
 * The row's `reporter_id` comes from the SESSION, never from the caller: a report is from whoever is
 * signed in, and a client that could name a different reporter could file one in somebody's name.
 * An anonymous session simply has no profile row to point at, which is why the column is nullable —
 * a report from somebody who has not signed in is still worth having.
 */
import { supabase } from '../social/supabaseClient';
import type { ReportGateway } from './ReportGateway';
import { sendableDescription, type ReportDiagnostics, type ReportDraft } from './model';

export class SupabaseReportGateway implements ReportGateway {
  get enabled(): boolean {
    return supabase !== null;
  }

  async send(draft: ReportDraft, diagnostics: ReportDiagnostics): Promise<string | null> {
    const client = supabase;
    if (!client) return null;
    try {
      const { data: userData } = await client.auth.getUser();
      const { data, error } = await client
        .from('app_reports')
        .insert({
          reporter_id: userData?.user?.id ?? null,
          category: draft.category,
          description: sendableDescription(draft.description),
          contact_email: draft.contactEmail?.trim() || null,
          app_version: diagnostics.appVersion ?? null,
          build: diagnostics.build ?? null,
          runtime_id: diagnostics.runtimeId ?? null,
          platform: diagnostics.platform ?? null,
          os_version: diagnostics.osVersion ?? null,
          locale: diagnostics.locale ?? null,
          source: diagnostics.source ?? null,
        })
        .select('id')
        .single();
      if (error || !data) return null;
      return (data as { id: string }).id;
    } catch {
      return null;
    }
  }
}
