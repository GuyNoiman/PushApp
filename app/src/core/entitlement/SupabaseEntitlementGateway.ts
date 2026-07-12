/**
 * SupabaseEntitlementGateway — the Supabase implementation of EntitlementGateway
 * and the ONLY entitlement file that touches the vendor SDK. Reuses the EXISTING
 * Supabase singleton (`../social/supabaseClient`) so it shares the same auth
 * session as the rest of the app (there must be exactly one client).
 *
 * READ-ONLY by design. It SELECTs the current user's own `entitlements` row; RLS
 * scopes the read to `auth.uid()` and grants NO write to `authenticated`, so the
 * client physically cannot upgrade itself to `subscriber` — that row is written
 * only by the server (verified receipt / service role). See schema.sql.
 *
 * PRIVACY: maps only the tier/date/source columns into our vendor-free
 * Entitlement — no PII exists in this table to leak (Auth_Backend_Proposal R1).
 */
import { supabase } from '../social/supabaseClient';
import { type AccountTier, type Entitlement, type EntitlementSource } from '../types/entitlement';
import { type EntitlementGateway } from './EntitlementGateway';

/** The shape of the `entitlements` row we SELECT (server-owned). */
interface EntitlementRow {
  tier: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  source: string;
  updated_at: string;
}

const TIERS: readonly AccountTier[] = ['free', 'trial', 'subscriber'];
const SOURCES: readonly EntitlementSource[] = ['none', 'trial', 'iap', 'grant'];

export class SupabaseEntitlementGateway implements EntitlementGateway {
  readonly enabled = supabase !== null;

  private client() {
    if (!supabase) throw new Error('Entitlement pillar is disabled (no Supabase env).');
    return supabase;
  }

  async getEntitlement(): Promise<Entitlement | null> {
    const c = this.client();
    // maybeSingle: no row yet (never subscribed) is not an error — fall back to
    // the offline-first free default at the caller.
    const { data, error } = await c
      .from('entitlements')
      .select('tier, trial_ends_at, current_period_end, source, updated_at')
      .maybeSingle<EntitlementRow>();
    if (error) throw error;
    if (!data) return null;
    return toEntitlement(data);
  }
}

/** Map a server row into our vendor-free Entitlement, hardening unknown values. */
function toEntitlement(row: EntitlementRow): Entitlement {
  const tier: AccountTier = (TIERS as string[]).includes(row.tier) ? (row.tier as AccountTier) : 'free';
  const source: EntitlementSource = (SOURCES as string[]).includes(row.source)
    ? (row.source as EntitlementSource)
    : 'none';
  return {
    tier,
    trialEndsAt: toEpoch(row.trial_ends_at),
    currentPeriodEnd: toEpoch(row.current_period_end),
    source,
    updatedAt: toEpoch(row.updated_at) ?? 0,
  };
}

/** Parse a nullable ISO timestamp into epoch ms, or undefined. */
function toEpoch(iso: string | null): number | undefined {
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? undefined : ms;
}
