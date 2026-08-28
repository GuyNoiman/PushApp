/**
 * The Supabase implementation — one insert into `kpi_events`, fire and forget.
 *
 * Three properties worth stating, because each is a decision rather than an
 * omission:
 *
 * **It never awaits and never throws.** A KPI that fails must not slow down or
 * break the thing the person was actually doing. A dropped event is a small,
 * acceptable loss; a report screen that hangs because a metric could not be
 * written is not.
 *
 * **It sends no session identity.** The row's only identifier is the random
 * installation id. `kpi_events` has an insert policy for `authenticated` and no
 * select policy for anybody — not even an operator — so a written row can never
 * be read back as a per-person timeline, only aggregated by a server function.
 *
 * **It batches nothing.** At this volume a queue is a place for events to be
 * lost on a crash, and the point of the stream is to be trustworthy rather than
 * efficient.
 */
import { supabase } from '../social/supabaseClient';
import { buildKpiEvent, type KpiContext, type KpiGateway, type KpiInput } from './KpiGateway';

export class SupabaseKpiGateway implements KpiGateway {
  constructor(private readonly context: () => KpiContext) {}

  get enabled(): boolean {
    return supabase !== null;
  }

  record(input: KpiInput): void {
    const client = supabase;
    if (!client) return;
    const event = buildKpiEvent(input, this.context());
    if (!event) return;
    void client
      .from('kpi_events')
      .insert({
        name: event.name,
        taxonomy_version: event.taxonomyVersion,
        install_id: event.installId,
        bucket: event.bucket,
        value: event.value,
        app_version: event.appVersion,
        platform: event.platform,
        channel: event.channel,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  }
}
