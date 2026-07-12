/**
 * EntitlementEngine unit tests — pure TS. Verify the effective-tier computation
 * against an INJECTED clock (a lapsed trial resolves to `free`), per-tier feature
 * gating, and the local `startTrial` guard rails (never clobbers a subscriber,
 * only ever reaches `trial`, never `subscriber`). Time is driven by the clock so
 * nothing depends on real time (Engineering Bible §18 + §3).
 */
import { EntitlementEngine } from '../EntitlementEngine';
import { FREE_ENTITLEMENT, type Entitlement } from '../../types/entitlement';

const DAY = 24 * 60 * 60 * 1000;

/** A tiny mutable store the engine reads/writes, plus a mutable clock. */
function setup(initial: Entitlement = FREE_ENTITLEMENT, startAt = 1_000_000) {
  let stored = initial;
  let clock = startAt;
  const engine = new EntitlementEngine(
    () => stored,
    (e) => {
      stored = e;
    },
    () => clock,
  );
  return {
    engine,
    get stored() {
      return stored;
    },
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe('EntitlementEngine — effective tier', () => {
  it('defaults to free with no stored entitlement', () => {
    const { engine } = setup();
    expect(engine.getEffectiveTier()).toBe('free');
  });

  it('an active trial reads as trial', () => {
    const { engine } = setup({ tier: 'trial', trialEndsAt: 1_000_000 + 5 * DAY, source: 'trial', updatedAt: 0 });
    expect(engine.getEffectiveTier()).toBe('trial');
  });

  it('a lapsed trial resolves to free (computed on read, no timer)', () => {
    const s = setup({ tier: 'trial', trialEndsAt: 1_000_000 + 2 * DAY, source: 'trial', updatedAt: 0 });
    expect(s.engine.getEffectiveTier()).toBe('trial');
    s.advance(3 * DAY); // cross the expiry
    expect(s.engine.getEffectiveTier()).toBe('free');
  });

  it('a trial with no end date resolves to free (never open-ended)', () => {
    const { engine } = setup({ tier: 'trial', source: 'trial', updatedAt: 0 });
    expect(engine.getEffectiveTier()).toBe('free');
  });

  it('a subscriber with a future period end reads as subscriber', () => {
    const { engine } = setup({
      tier: 'subscriber',
      currentPeriodEnd: 1_000_000 + 30 * DAY,
      source: 'iap',
      updatedAt: 0,
    });
    expect(engine.getEffectiveTier()).toBe('subscriber');
  });

  it('a lapsed subscriber resolves to free', () => {
    const s = setup({ tier: 'subscriber', currentPeriodEnd: 1_000_000 + DAY, source: 'iap', updatedAt: 0 });
    s.advance(2 * DAY);
    expect(s.engine.getEffectiveTier()).toBe('free');
  });
});

describe('EntitlementEngine — feature gating', () => {
  it('unknown features are ungated (available to every tier)', () => {
    const { engine } = setup();
    expect(engine.isActive('some_feature_not_in_the_map')).toBe(true);
  });

  it('known placeholder features are available to free today (zero behavior change)', () => {
    const { engine } = setup();
    expect(engine.isActive('advancedInsights')).toBe(true);
    expect(engine.isActive('unlimitedJourneys')).toBe(true);
  });

  it('gating follows the EFFECTIVE tier — a lapsed trial gates as free', () => {
    const s = setup({ tier: 'trial', trialEndsAt: 1_000_000 + DAY, source: 'trial', updatedAt: 0 });
    s.advance(2 * DAY);
    // Placeholders are all-true today, but the tier used is `free`, not `trial`.
    expect(s.engine.getEffectiveTier()).toBe('free');
    expect(s.engine.isActive('advancedInsights')).toBe(true);
  });
});

describe('EntitlementEngine — startTrial (local, dev/POC only)', () => {
  it('starts a trial from free and persists it', () => {
    const s = setup();
    expect(s.engine.startTrial(7)).toBe(true);
    expect(s.stored.tier).toBe('trial');
    expect(s.stored.source).toBe('trial');
    expect(s.stored.trialEndsAt).toBe(1_000_000 + 7 * DAY);
    expect(s.engine.getEffectiveTier()).toBe('trial');
  });

  it('never grants subscriber — startTrial only ever reaches trial', () => {
    const s = setup();
    s.engine.startTrial(7);
    expect(s.stored.tier).not.toBe('subscriber');
    expect(s.stored.tier).toBe('trial');
  });

  it('is a no-op while already trialing', () => {
    const s = setup();
    expect(s.engine.startTrial(7)).toBe(true);
    expect(s.engine.startTrial(30)).toBe(false); // already trialing
  });

  it('never clobbers an active subscriber', () => {
    const s = setup({
      tier: 'subscriber',
      currentPeriodEnd: 1_000_000 + 30 * DAY,
      source: 'iap',
      updatedAt: 0,
    });
    expect(s.engine.startTrial(7)).toBe(false);
    expect(s.stored.tier).toBe('subscriber');
  });

  it('rejects a non-positive or non-finite duration', () => {
    const s = setup();
    expect(s.engine.startTrial(0)).toBe(false);
    expect(s.engine.startTrial(-5)).toBe(false);
    expect(s.engine.startTrial(Number.NaN)).toBe(false);
    expect(s.stored.tier).toBe('free');
  });

  it('lets a lapsed trial start a fresh trial (effective tier is free again)', () => {
    const s = setup({ tier: 'trial', trialEndsAt: 1_000_000 + DAY, source: 'trial', updatedAt: 0 });
    s.advance(2 * DAY); // trial lapsed ⇒ effective free
    expect(s.engine.startTrial(7)).toBe(true);
    expect(s.engine.getEffectiveTier()).toBe('trial');
  });
});
