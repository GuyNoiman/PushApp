/**
 * Tell the server which build this phone is actually running.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────
 *
 * An over-the-air update only reaches an installation whose runtime it was built
 * for. The publish tooling protects us from publishing into a void; nothing
 * protects the person holding a phone that can no longer receive anything. Their
 * app simply stops changing.
 *
 * It has already cost real time: a tester spent three days on a build from a
 * week earlier, reporting bugs that had been fixed twice, and it was found from
 * a screenshot. This makes it a number in the console instead.
 *
 * ── WHAT IT SENDS, AND WHAT IT CANNOT ───────────────────────────────────
 *
 * The same random installation id the KPI stream uses — reused deliberately so a
 * phone is not counted twice under two schemes, and account-independent for the
 * same reason it is there: it makes "the same phone" countable without making
 * "this person" identifiable.
 *
 * Everything else is a fact about the BUILD: platform, runtime, app version,
 * channel, and the update currently running. Nothing about the person, nothing
 * about their Journeys, and no free text.
 *
 * Fire and forget. A launch must never be slower or fail because a diagnostic
 * could not be written.
 */
import { supabase } from '../social/supabaseClient';
import type { KpiContext } from './KpiGateway';
import { readRunningBundle } from '../util/buildInfo';

export interface RuntimeReporter {
  report(context: KpiContext, build?: string | null): void;
}

/** The default when there is no backend: accepted, and nothing sent. */
export const NullRuntimeReporter: RuntimeReporter = { report() {} };

export const supabaseRuntimeReporter: RuntimeReporter = {
  report(context, build) {
    const client = supabase;
    if (!client || !context.installId) return;
    const bundle = readRunningBundle();
    void client
      .rpc('note_installed_runtime', {
        p_install_id: context.installId,
        p_platform: context.platform ?? null,
        // The runtime is the identity of the BUILD — it changes exactly when the
        // thing that must be reinstalled changes, which is the whole question.
        p_runtime_version: bundle.kind === 'development' ? null : (bundle.runtime ?? null),
        p_app_version: context.appVersion ?? null,
        p_build: build ?? null,
        p_channel: context.channel ?? null,
        p_update_id: bundle.kind === 'update' ? bundle.id : null,
        p_update_at: bundle.kind === 'update' ? (bundle.createdAt?.toISOString() ?? null) : null,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  },
};

export function getRuntimeReporter(): RuntimeReporter {
  return supabase ? supabaseRuntimeReporter : NullRuntimeReporter;
}
