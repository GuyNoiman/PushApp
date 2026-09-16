/**
 * The one KPI gateway the running app records on — the core AND the screens.
 *
 * ── WHY A SCREEN NEEDS THIS AT ALL ────────────────────────────────────────
 *
 * Almost every KPI is a domain event mapped in `kpiFromEvents`, and a screen never has to know the
 * stream exists. The first run is the exception: "this step was shown", "the person pressed
 * cancel on Apple's sheet" are facts about a screen, and no engine sees them. So a screen records
 * them here — on the SAME gateway the core is handed, with the same closed taxonomy, the same
 * once-per-install guard and the same single insert. This is not a second path; it is the first
 * path, reachable from the screen.
 *
 * ── WHY IT HOLDS EVENTS BEFORE IT IS ATTACHED ─────────────────────────────
 *
 * The first step of the first run is shown on the first frame. The real gateway exists only after
 * the installation id has been read from storage, and a row is accepted only once the device holds
 * a Supabase session (`kpi_events` inserts are `to authenticated`), which on a fresh install is an
 * anonymous sign-in a network round-trip later. Recording straight onto an unattached gateway would
 * lose exactly the first step of every fresh install, and the funnel would show a drop at its top
 * that no person caused.
 *
 * So what is recorded before then waits, up to a small cap, and is handed over in order the moment
 * the real gateway is attached. Attaching `null` — no backend on this build — drops what waited and
 * makes every later call a no-op, which is exactly what `NullKpiGateway` would have done.
 *
 * Pure TypeScript — no React, no vendor imports.
 */
import type { KpiGateway, KpiInput } from './KpiGateway';

/** Enough for a whole first run several times over; small enough that a stuck launch costs nothing. */
export const PENDING_KPI_LIMIT = 100;

export interface PendingKpiGateway extends KpiGateway {
  /** Hand over to the real gateway (or to nothing), flushing what waited in the order it was recorded. */
  attach(gateway: KpiGateway | null): void;
}

export function createPendingKpiGateway(limit: number = PENDING_KPI_LIMIT): PendingKpiGateway {
  let target: KpiGateway | null = null;
  let settled = false;
  let waiting: KpiInput[] = [];
  return {
    get enabled() {
      return target?.enabled ?? false;
    },
    record(input) {
      if (target) {
        target.record(input);
        return;
      }
      if (settled) return;
      // The FIRST events are kept rather than the latest: they are the top of the funnel, and a
      // launch that never gets a session has nothing later worth more than its beginning.
      if (waiting.length < limit) waiting.push({ name: input.name, bucket: input.bucket, value: input.value });
    },
    attach(gateway) {
      settled = true;
      target = gateway;
      const flush = waiting;
      waiting = [];
      if (gateway) for (const input of flush) gateway.record(input);
    },
  };
}

/** The app's instance. `AppProvider` attaches the real gateway; everything else only records. */
export const appKpi: PendingKpiGateway = createPendingKpiGateway();
