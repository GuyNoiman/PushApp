/**
 * The first run's measurement (founder, 2026-09-16).
 *
 * The tests that matter are the ones a plausible change would break quietly: a step counted twice
 * because somebody went Back, the first step lost because the gateway was not attached yet, a
 * retired page appearing as a row in the funnel, and the step list drifting away from the flow.
 */
import { ONBOARDING_STEP_ORDER } from '../../onboarding/questions';
import { createPendingKpiGateway, PENDING_KPI_LIMIT } from '../appKpi';
import { accountEscapeUsed, introductionCompleted, introductionStarted, onboardingStepReached } from '../firstRunKpi';
import { buildKpiEvent, onceKey, withOnceGuard, type KpiGateway, type KpiInput, type OnceStore } from '../KpiGateway';
import { KPI_EVENTS, ONBOARDING_STEP_BUCKETS, isAllowedBucket, isKnownEvent } from '../taxonomy';

const ctx = { installId: 'install-1', appVersion: '1.0.0', platform: 'ios' as const, channel: 'production' };

function memoryStore(): OnceStore & { keys: Set<string> } {
  const keys = new Set<string>();
  return { keys, has: (k) => keys.has(k), remember: (k) => void keys.add(k) };
}

function capture(): KpiGateway & { sent: KpiInput[] } {
  const sent: KpiInput[] = [];
  return { sent, enabled: true, record: (i) => void sent.push(i) };
}

describe('the taxonomy', () => {
  it('counts exactly the steps the flow has, in its order', () => {
    // If this fails, the first run changed. Decide whether the new step belongs in the funnel, then
    // change ONBOARDING_STEP_BUCKETS and the console's FUNNEL_STAGES together.
    expect([...ONBOARDING_STEP_BUCKETS]).toEqual([...ONBOARDING_STEP_ORDER]);
  });

  it('declares every first-run event, and none of them carries an open bucket', () => {
    for (const name of [
      'onboarding_step_reached',
      'sign_in_attempted',
      'sign_in_succeeded',
      'sign_in_cancelled',
      'sign_in_failed',
      'account_escape_used',
      'introduction_started',
      'introduction_completed',
    ]) {
      expect(isKnownEvent(name)).toBe(true);
    }
    expect(buildKpiEvent({ name: 'onboarding_step_reached', bucket: 'somewhere I typed' }, ctx)).toBeNull();
    expect(buildKpiEvent({ name: 'sign_in_failed', bucket: 'apple:nonce mismatch' }, ctx)).toBeNull();
  });

  it('keeps a cancel out of the failure buckets', () => {
    const failed = KPI_EVENTS.find((e) => e.name === 'sign_in_failed')!;
    expect(failed.buckets).toEqual([
      'apple:unavailable', 'apple:rejected', 'apple:error',
      'google:unavailable', 'google:rejected', 'google:error',
    ]);
    expect(failed.buckets!.some((b) => b.includes('cancel'))).toBe(false);
  });
});

describe('each step, once per installation', () => {
  it('counts every step once, however often it is shown', () => {
    const inner = capture();
    const guarded = withOnceGuard(inner, memoryStore());
    // Forward, Back, forward again, then a resume onto the same screen.
    for (const step of ['language', 'welcome', 'purpose', 'welcome', 'purpose', 'prepare', 'account', 'prepare', 'account', 'account']) {
      guarded.record(onboardingStepReached(step)!);
    }
    expect(inner.sent.map((e) => e.bucket)).toEqual(['language', 'welcome', 'purpose', 'prepare', 'account']);
  });

  it('keeps the bucketless key an installation already holds', () => {
    // A phone that already sent `app_first_open` remembered it under its bare name. Changing that key
    // would send it again from every existing installation.
    expect(onceKey({ name: 'app_first_open' })).toBe('app_first_open');
    expect(onceKey({ name: 'onboarding_step_reached', bucket: 'account' })).toBe('onboarding_step_reached.account');
  });

  it('does not remember a bucket the event does not declare', () => {
    const store = memoryStore();
    const inner = capture();
    withOnceGuard(inner, store).record({ name: 'onboarding_step_reached', bucket: 'personalInfo' });
    expect(store.keys.size).toBe(0);
    expect(inner.sent).toHaveLength(0);
  });

  it('counts the introduction once each', () => {
    const inner = capture();
    const guarded = withOnceGuard(inner, memoryStore());
    guarded.record(introductionStarted);
    guarded.record(introductionStarted);
    guarded.record(introductionCompleted);
    guarded.record(introductionCompleted);
    expect(inner.sent.map((e) => e.name)).toEqual(['introduction_started', 'introduction_completed']);
  });

  it('does not limit sign-in attempts, which are worth counting every time', () => {
    const inner = capture();
    const guarded = withOnceGuard(inner, memoryStore());
    guarded.record({ name: 'sign_in_attempted', bucket: 'apple' });
    guarded.record({ name: 'sign_in_attempted', bucket: 'apple' });
    expect(inner.sent).toHaveLength(2);
  });
});

describe('the step helpers', () => {
  it('does not turn a retired page into a funnel row', () => {
    expect(onboardingStepReached('personalInfo')).toBeNull();
    expect(onboardingStepReached('q4')).toBeNull();
    expect(onboardingStepReached('account')).toEqual({ name: 'onboarding_step_reached', bucket: 'account' });
  });

  it('says why the escape was offered, and nothing else', () => {
    expect(accountEscapeUsed(false)).toEqual({ name: 'account_escape_used', bucket: 'no_backend' });
    expect(accountEscapeUsed(true)).toEqual({ name: 'account_escape_used', bucket: 'no_provider' });
    expect(isAllowedBucket('account_escape_used', 'no_backend')).toBe(true);
    expect(isAllowedBucket('account_escape_used', 'no_provider')).toBe(true);
  });
});

describe('the pending gateway', () => {
  it('holds what is recorded before it is attached, and hands it over in order', () => {
    const pending = createPendingKpiGateway();
    pending.record({ name: 'onboarding_step_reached', bucket: 'language' });
    pending.record({ name: 'onboarding_step_reached', bucket: 'welcome' });
    const inner = capture();
    pending.attach(inner);
    pending.record({ name: 'onboarding_step_reached', bucket: 'purpose' });
    expect(inner.sent.map((e) => e.bucket)).toEqual(['language', 'welcome', 'purpose']);
  });

  it('dedups what waited through the once guard at hand-over', () => {
    const pending = createPendingKpiGateway();
    pending.record(onboardingStepReached('language')!);
    pending.record(onboardingStepReached('language')!);
    const inner = capture();
    pending.attach(withOnceGuard(inner, memoryStore()));
    expect(inner.sent).toHaveLength(1);
  });

  it('drops what waited, and everything after, when there is no backend', () => {
    const pending = createPendingKpiGateway();
    pending.record(introductionStarted);
    pending.attach(null);
    pending.record(introductionCompleted);
    expect(pending.enabled).toBe(false);
  });

  it('keeps the first events when a launch never gets a session', () => {
    const pending = createPendingKpiGateway(3);
    for (const step of ['language', 'welcome', 'purpose', 'prepare', 'account']) {
      pending.record({ name: 'onboarding_step_reached', bucket: step });
    }
    const inner = capture();
    pending.attach(inner);
    expect(inner.sent.map((e) => e.bucket)).toEqual(['language', 'welcome', 'purpose']);
    expect(PENDING_KPI_LIMIT).toBeGreaterThanOrEqual(ONBOARDING_STEP_BUCKETS.length * 4);
  });

  it('holds only the allowed fields, so nothing else waits on the device', () => {
    const pending = createPendingKpiGateway();
    pending.record({ name: 'sign_in_failed', bucket: 'apple:error', message: 'user@example.com' } as unknown as KpiInput);
    const inner = capture();
    pending.attach(inner);
    expect(JSON.stringify(inner.sent)).not.toContain('example.com');
  });
});
