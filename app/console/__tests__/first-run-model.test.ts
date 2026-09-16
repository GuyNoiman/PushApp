/**
 * The console's first-run arithmetic (founder, 2026-09-16).
 *
 * The funnel's one job is the loss between two steps, and there are two plausible simplifications
 * that would put a confident wrong number on it: clamping a negative loss to zero (people DO skip
 * steps — "I already have an account" goes from Welcome to Account), and reporting 0% where the step
 * before had nobody in it. Sign-in's job is keeping a cancel apart from a failure.
 */
import {
  FUNNEL_STAGES,
  SIGN_IN_FAILURE_REASONS,
  computeAccountEscape,
  computeFunnel,
  computeSignIn,
} from '../src/kpi-model.js';
import {
  KPI_EVENTS,
  ONBOARDING_STEP_BUCKETS,
  SIGN_IN_FAILURE_REASONS as APP_FAILURE_REASONS,
  SIGN_IN_PROVIDERS as APP_PROVIDERS,
  isAllowedBucket,
} from '../../src/core/kpi/taxonomy';

/**
 * The console's copy is a copy (see the top of kpi-model.js): the two deploy separately. A test can
 * still hold them together, so a step added to the app cannot silently go missing from the funnel.
 */
describe('the console describes what the app sends', () => {
  it('has a funnel row for every step bucket, and every row is something the app can send', () => {
    const stepRows = FUNNEL_STAGES.filter((s) => s.event === 'onboarding_step_reached').map((s) => s.bucket);
    expect(stepRows).toEqual([...ONBOARDING_STEP_BUCKETS]);
    for (const stage of FUNNEL_STAGES) {
      expect(KPI_EVENTS.some((e) => e.name === stage.event)).toBe(true);
      expect(isAllowedBucket(stage.event, stage.bucket ?? null)).toBe(true);
    }
  });

  it('knows the same providers and failure reasons', () => {
    expect([...SIGN_IN_FAILURE_REASONS]).toEqual([...APP_FAILURE_REASONS]);
    expect(computeSignIn([]).map((p) => p.provider)).toEqual([...APP_PROVIDERS]);
  });
});

const step = (bucket: string, installs: number) => ({ name: 'onboarding_step_reached', bucket, events: installs, installs });

describe('computeFunnel', () => {
  it('walks the first run in order, with the conversation between its opening and the handoff', () => {
    expect(FUNNEL_STAGES.map((s) => s.id)).toEqual([
      'language', 'welcome', 'purpose', 'prepare', 'account', 'conversation',
      'introduction_started', 'introduction_completed', 'handoff', 'firstJourney',
    ]);
  });

  it('gives each stage its installations and the loss since the stage before', () => {
    const funnel = computeFunnel([
      step('language', 200),
      step('welcome', 180),
      step('purpose', 150),
      step('prepare', 120),
      step('account', 100),
      step('conversation', 40),
      { name: 'introduction_started', bucket: null, events: 30, installs: 30 },
      { name: 'introduction_completed', bucket: null, events: 12, installs: 12 },
      step('handoff', 12),
      step('firstJourney', 11),
    ]);
    const byId = Object.fromEntries(funnel.map((s) => [s.id, s]));

    expect(byId.language).toMatchObject({ installs: 200, drop: null, dropPercent: null });
    expect(byId.welcome).toMatchObject({ installs: 180, drop: 20, dropPercent: 10 });
    // The account wall: 100 reached it, 40 got past it.
    expect(byId.conversation).toMatchObject({ installs: 40, drop: 60, dropPercent: 60 });
    // The introduction gap.
    expect(byId.introduction_completed).toMatchObject({ installs: 12, drop: 18, dropPercent: 60 });
    expect(byId.firstJourney).toMatchObject({ installs: 11, drop: 1, dropPercent: 8.3 });
  });

  it('reads INSTALLATIONS, not events', () => {
    const funnel = computeFunnel([{ name: 'onboarding_step_reached', bucket: 'language', events: 9, installs: 4 }]);
    expect(funnel[0].installs).toBe(4);
  });

  it('shows a negative loss rather than clamping it', () => {
    // Somebody who already has an account skips purpose and prepare.
    const funnel = computeFunnel([step('prepare', 10), step('account', 14)]);
    const account = funnel.find((s) => s.id === 'account')!;
    expect(account.drop).toBe(-4);
    expect(account.dropPercent).toBe(-40);
  });

  it('says "unknown", not 0%, after a stage nobody reached', () => {
    const funnel = computeFunnel([step('welcome', 3)]);
    // language had nobody — the funnel predates this build on these phones.
    expect(funnel[1]).toMatchObject({ id: 'welcome', installs: 3, drop: -3, dropPercent: null });
    expect(funnel[2]).toMatchObject({ id: 'purpose', installs: 0, drop: 3, dropPercent: 100 });
  });

  it('is all zeros on an empty stream, never NaN', () => {
    for (const stage of computeFunnel([])) {
      expect(stage.installs).toBe(0);
      expect(Number.isNaN(stage.dropPercent)).toBe(false);
    }
  });
});

describe('computeSignIn', () => {
  const rows = [
    { name: 'sign_in_attempted', bucket: 'apple', events: 10, installs: 6 },
    { name: 'sign_in_succeeded', bucket: 'apple', events: 4, installs: 4 },
    { name: 'sign_in_cancelled', bucket: 'apple', events: 3, installs: 2 },
    { name: 'sign_in_failed', bucket: 'apple:rejected', events: 2, installs: 2 },
    { name: 'sign_in_failed', bucket: 'apple:error', events: 0, installs: 0 },
    { name: 'sign_in_attempted', bucket: 'google', events: 1, installs: 1 },
    { name: 'sign_in_failed', bucket: 'google:unavailable', events: 1, installs: 1 },
  ];

  it('counts each provider apart, and a cancel apart from a failure', () => {
    const [apple, google] = computeSignIn(rows);
    expect(apple).toMatchObject({ provider: 'apple', attempts: 10, succeeded: 4, cancelled: 3, failed: 2, unaccounted: 1 });
    expect(apple.failures).toEqual({ unavailable: 0, rejected: 2, error: 0 });
    expect(google).toMatchObject({ provider: 'google', attempts: 1, succeeded: 0, cancelled: 0, failed: 1, unaccounted: 0 });
    expect(google.failures).toEqual({ unavailable: 1, rejected: 0, error: 0 });
  });

  it('has a column for every failure reason the app can send', () => {
    expect([...SIGN_IN_FAILURE_REASONS]).toEqual(['unavailable', 'rejected', 'error']);
  });

  it('never reports a negative "no outcome" when outcomes straddle the window', () => {
    const [apple] = computeSignIn([{ name: 'sign_in_succeeded', bucket: 'apple', events: 2, installs: 2 }]);
    expect(apple.unaccounted).toBe(0);
  });
});

describe('computeAccountEscape', () => {
  it('reports both reasons, zero when absent', () => {
    expect(computeAccountEscape([{ name: 'account_escape_used', bucket: 'no_provider', events: 2, installs: 1 }])).toEqual([
      { bucket: 'no_backend', events: 0, installs: 0 },
      { bucket: 'no_provider', events: 2, installs: 1 },
    ]);
  });
});
