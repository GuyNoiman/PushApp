/**
 * Repository — the offline-first persistence boundary (Engineering Bible §3
 * vendor independence, §8 local-before-cloud). Engines depend on this interface,
 * never on a concrete provider. A cloud backend (e.g. Supabase, when the social
 * pillar lands) implements the SAME interface without touching any engine.
 * Pure TS — no vendor imports here.
 */
import type { AppState } from '../types/domain';

export interface Repository {
  /** Load persisted state, or null on first run / no data. */
  load(): Promise<AppState | null>;
  /** Persist the full state. */
  save(state: AppState): Promise<void>;
  /** Remove all persisted state. */
  clear(): Promise<void>;
}
