/**
 * Evaluating a service card. The distinction under test is the one that is easy
 * to lose in a refactor: a check that never ran and a check that failed must not
 * come out the same colour.
 */
import { evaluateService, evaluateAll } from '../src/health.js';
import { STATE } from '../src/status.js';
import { SERVICES } from '../src/registry.js';

const now = Date.UTC(2026, 7, 28, 12, 0, 0);
const service = { id: 'db', name: 'Database', signal: 'db', metric: 'Reachability' };

describe('evaluateService', () => {
  it('is gray with the reason when no check is wired', () => {
    const card = evaluateService({ id: 'x', name: 'X', signal: null, blockedBy: 'Nothing counts installations.' }, undefined, now);
    expect(card.state).toBe(STATE.GRAY);
    expect(card.detail).toBe('Nothing counts installations.');
  });

  it('is gray, not red, when a wired check has not reported', () => {
    expect(evaluateService(service, undefined, now).state).toBe(STATE.GRAY);
  });

  it('is red when the check ran and failed', () => {
    const card = evaluateService(service, { ok: false, at: new Date(now).toISOString(), detail: 'Unreachable' }, now);
    expect(card.state).toBe(STATE.RED);
    expect(card.detail).toBe('Unreachable');
  });

  it('goes gray again when a passing check goes stale', () => {
    const stale = new Date(now - 60 * 60 * 1000).toISOString();
    const card = evaluateService(service, { ok: true, at: stale, intervalMs: 5 * 60 * 1000 }, now);
    expect(card.state).toBe(STATE.GRAY);
  });

  it('takes the worst of freshness, capacity and open issues', () => {
    const at = new Date(now).toISOString();
    expect(evaluateService(service, { ok: true, at, intervalMs: 60000 }, now).state).toBe(STATE.GREEN);
    expect(evaluateService(service, { ok: true, at, intervalMs: 60000, capacityPct: 90 }, now).state).toBe(STATE.RED);
    expect(
      evaluateService(service, { ok: true, at, intervalMs: 60000, issues: [{ severity: 'medium' }] }, now).state,
    ).toBe(STATE.YELLOW);
  });
});

describe('evaluateAll against the real registry', () => {
  it('draws every unwired service gray and counts them as unknown', () => {
    const { cards, overall } = evaluateAll(SERVICES, {}, now);
    expect(cards).toHaveLength(SERVICES.length);
    expect(cards.every((c: { state: string }) => c.state === STATE.GRAY)).toBe(true);
    expect(overall.unknown).toBe(SERVICES.length);
    expect(overall.known).toBe(0);
  });

  it('gives every service in the registry either a signal or a written reason it has none', () => {
    for (const s of SERVICES) {
      if (!s.signal) expect(typeof s.blockedBy).toBe('string');
      expect(s.metric.length).toBeGreaterThan(0);
    }
  });
});
