/**
 * EntitlementProvider — the React bridge for the account-tier pillar. It exposes
 * the current account's EFFECTIVE tier (free / trial / subscriber) and a feature
 * gate the UI reads. Mirrors AuthProvider: when the pillar is off (no Supabase
 * env) it renders children with inert `free` defaults, so every existing pillar
 * works identically and the app still boots fully local ($0 foundation).
 *
 * Composition: this sits INSIDE AuthProvider — entitlement depends on the
 * signed-in user (the server row is keyed on auth.uid()). The server entitlement
 * is READ-ONLY here; a `subscriber` tier is written server-side only. The single
 * client-writable elevation is the LOCAL dev trial (startTrial), persisted
 * on-device via AppCore/Repository — it can never reach `subscriber`.
 *
 * PRIVACY (R1): the Entitlement carries NO PII — only a tier and a couple of
 * expiry timestamps.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getEntitlementGateway } from '@/core/entitlement';
import { EntitlementEngine } from '@/core/engines/EntitlementEngine';
import type { GatedFeature } from '@/core/config/tiers';
import { FREE_ENTITLEMENT, type AccountTier, type Entitlement } from '@/core/types/entitlement';
import { useApp } from '@/state/AppProvider';
import { useAuth } from '@/state/AuthProvider';

interface EntitlementContextValue {
  /** The stored entitlement (server row or local trial). */
  entitlement: Entitlement;
  /** The EFFECTIVE tier for the current clock (a lapsed trial reads as `free`). */
  tier: AccountTier;
  /** Whether a feature is unlocked at the effective tier. */
  isActive: (feature: GatedFeature) => boolean;
  /** Start a LOCAL dev/POC trial for `days` days. Returns whether it started. */
  startTrial: (days: number) => boolean;
  /** True while the initial server read is in flight (false when the pillar is off). */
  loading: boolean;
}

const EMPTY: EntitlementContextValue = {
  entitlement: FREE_ENTITLEMENT,
  tier: 'free',
  isActive: () => true, // off ⇒ nothing is gated; every feature is available
  startTrial: () => false,
  loading: false,
};

const EntitlementContext = createContext<EntitlementContextValue>(EMPTY);

export function EntitlementProvider({ children }: { children: ReactNode }) {
  return <ActiveEntitlementProvider>{children}</ActiveEntitlementProvider>;
}

function ActiveEntitlementProvider({ children }: { children: ReactNode }) {
  const gateway = getEntitlementGateway();
  const { core, ready } = useApp();
  // Entitlement is keyed on the auth session; re-read when the uid changes.
  const { user } = useAuth();
  const uid = user?.id ?? null;

  // The stored entitlement: the local (on-device) trial by default; overridden by
  // the server row when the backend reports a higher tier (e.g. subscriber).
  const [stored, setStored] = useState<Entitlement>(FREE_ENTITLEMENT);
  const [loading, setLoading] = useState<boolean>(gateway.enabled);

  // Seed from AppCore's persisted (local) entitlement once the core is ready, so a
  // local trial survives relaunch. Server reads (below) may then elevate it.
  useEffect(() => {
    if (ready) setStored(core.getEntitlement());
  }, [core, ready]);

  // ── Read the server entitlement when the pillar is on and a session exists ──
  // Read-only: we never write the server tier from the client. The server row
  // wins ONLY when it reports a paid/granted tier the local state doesn't have.
  useEffect(() => {
    if (!gateway.enabled) {
      setLoading(false);
      return;
    }
    let mounted = true;
    if (!uid) {
      // No session ⇒ nothing to read; fall back to the local/free default.
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const server = await gateway.getEntitlement();
        if (!mounted) return;
        // Prefer a server subscriber/grant over a local trial; otherwise keep the
        // local (possibly trial) state. The server is authoritative for paid tiers.
        if (server && server.tier === 'subscriber') {
          setStored(server);
        } else if (server && server.source === 'grant') {
          setStored(server);
        }
      } catch {
        // A backend hiccup must never lock a user out — stay on the local default.
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [gateway, uid]);

  // The engine computes the effective tier from `stored` against the runtime
  // clock; startTrial persists the local trial through AppCore/Repository.
  const engine = useMemo(
    () =>
      new EntitlementEngine(
        () => stored,
        (e) => {
          setStored(e);
          core.setEntitlement(e); // persist the local trial offline-first
        },
      ),
    [stored, core],
  );

  const tier = engine.getEffectiveTier();

  const isActive = useCallback((feature: GatedFeature) => engine.isActive(feature), [engine]);
  const startTrial = useCallback((days: number) => engine.startTrial(days), [engine]);

  const value: EntitlementContextValue = {
    entitlement: stored,
    tier,
    isActive,
    startTrial,
    loading,
  };

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement(): EntitlementContextValue {
  return useContext(EntitlementContext);
}

/**
 * Small helper: whether a single feature is unlocked for the current account.
 * Sugar over useEntitlement().isActive — the common read from screens.
 */
export function useFeatureGate(feature: GatedFeature): boolean {
  return useEntitlement().isActive(feature);
}
