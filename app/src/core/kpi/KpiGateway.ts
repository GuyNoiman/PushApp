/**
 * The KPI stream's outbound boundary.
 *
 * ── WHAT MAY LEAVE, AND HOW IT IS GUARANTEED ─────────────────────────────
 *
 * The same discipline as `core/monitoring/telemetryContract.ts`: the event that
 * leaves is REBUILT from an allowlist rather than edited into shape. A field
 * added to the input by a future change is gone by construction rather than by
 * having been anticipated.
 *
 * There are six fields and no seventh. In particular there is no free-text
 * field of any kind — migration 0008 gives `kpi_events` no free-text column at
 * all, so this is the schema's guarantee as much as this file's — and no
 * identifier of a person, a Journey, a Dream or a Step.
 *
 * ── THE INSTALL ID ───────────────────────────────────────────────────────
 *
 * A random v4 id minted on this device and never derived from an account id, an
 * email, a handle, an advertising id or any device hardware identifier. It is
 * what makes "the same phone" countable without making "this person"
 * identifiable. It is deliberately NOT reset on sign-in or sign-out: an id that
 * tracked the account would be an account id wearing a disguise.
 *
 * Pure TypeScript apart from the storage port. No React, no vendor imports.
 */
import { KPI_EVENTS, TAXONOMY_VERSION, isAllowedBucket, isKnownEvent } from './taxonomy';

/** Exactly what a row in `kpi_events` may contain. */
export interface KpiEvent {
  name: string;
  taxonomyVersion: number;
  installId: string;
  bucket: string | null;
  value: number | null;
  appVersion: string | null;
  platform: 'ios' | 'android' | 'web' | null;
  channel: string | null;
}

/** What a call site offers. Anything here that is not in {@link KpiEvent} is dropped. */
export interface KpiInput {
  name: string;
  bucket?: string | null;
  value?: number | null;
}

export interface KpiContext {
  installId: string;
  appVersion?: string | null;
  platform?: 'ios' | 'android' | 'web' | null;
  channel?: string | null;
}

/**
 * Build the outbound event, or null when it must not be sent.
 *
 * Returning null rather than throwing is deliberate: a KPI that cannot be
 * recorded must never break the thing the person was actually doing. The
 * refusal is total, though — an unknown name is not "sent anyway and sorted out
 * later", because a stream that accepts anything is a stream nobody can define.
 */
export function buildKpiEvent(input: KpiInput, ctx: KpiContext): KpiEvent | null {
  if (!isKnownEvent(input.name)) return null;
  if (!isAllowedBucket(input.name, input.bucket ?? null)) return null;
  if (!ctx.installId) return null;
  const value = typeof input.value === 'number' && Number.isFinite(input.value) ? input.value : null;
  return {
    name: input.name,
    taxonomyVersion: TAXONOMY_VERSION,
    installId: ctx.installId,
    bucket: input.bucket ?? null,
    value,
    appVersion: ctx.appVersion ?? null,
    platform: ctx.platform ?? null,
    channel: ctx.channel ?? null,
  };
}

export interface KpiGateway {
  readonly enabled: boolean;
  record(input: KpiInput): void;
}

/** The default when there is no backend: everything is accepted and nothing is sent. */
export const NullKpiGateway: KpiGateway = {
  enabled: false,
  record() {},
};

/**
 * Events that may be sent AT MOST ONCE per installation. Enforced here rather
 * than at each call site, because "did this installation ever open the app
 * before" is a question the call site should not have to hold.
 */
const ONCE_PER_INSTALL = new Set(KPI_EVENTS.filter((e) => e.oncePerInstall).map((e) => e.name));

export interface OnceStore {
  has(name: string): boolean;
  remember(name: string): void;
}

/**
 * Wrap a gateway so once-per-install events really are once. A store that
 * forgets (a reinstall, cleared data) produces a new installation, which is what
 * the id means anyway.
 */
export function withOnceGuard(gateway: KpiGateway, store: OnceStore): KpiGateway {
  return {
    get enabled() {
      return gateway.enabled;
    },
    record(input) {
      if (ONCE_PER_INSTALL.has(input.name)) {
        if (store.has(input.name)) return;
        store.remember(input.name);
      }
      gateway.record(input);
    },
  };
}
