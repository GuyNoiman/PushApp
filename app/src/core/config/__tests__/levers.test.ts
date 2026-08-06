/**
 * Lever config tests (Miss-Recovery slice). Lock the reason→lever mapping to EXACTLY
 * the PRD §4 table (config-before-code: the rules live in config, not an engine), and
 * the catalog's real-vs-placeholder flags. If a future change re-maps a reason, these
 * force a conscious edit rather than a silent drift.
 */
import type { ReasonId } from '../../types/domain';
import { LEVERS, REASON_LEVERS, resolveLever, resolveLevers } from '../levers';

describe('resolveLevers — exact PRD §4 mapping', () => {
  const cases: Array<[ReasonId, string[]]> = [
    ['forgot', ['retime', 'refrequency']],
    ['no_time', ['reshape']],
    ['lost_motivation', ['reconnect_why', 'rally']],
    ['too_hard', ['reshape']],
    ['did_partially', ['reshape']],
    ['couldnt', ['grace']],
    ['not_relevant', ['reshape']],
    ['other', []],
  ];

  it.each(cases)('%s → %j', (reason, levers) => {
    expect(resolveLevers(reason)).toEqual(levers);
  });

  it('covers every ReasonId in REASON_LEVERS (no gaps)', () => {
    const ids: ReasonId[] = [
      'forgot',
      'no_time',
      'lost_motivation',
      'too_hard',
      'did_partially',
      'couldnt',
      'not_relevant',
      'other',
    ];
    for (const id of ids) expect(REASON_LEVERS[id]).toBeDefined();
  });
});

describe('LEVERS catalog — real vs placeholder', () => {
  it('executes retime, refrequency, reshape, mirror, grace for real', () => {
    for (const id of ['retime', 'refrequency', 'reshape', 'mirror', 'grace'] as const) {
      expect(resolveLever(id)?.executesForReal).toBe(true);
    }
  });

  it('keeps retone, rally, reconnect_why as inert/placeholder (never executed this slice)', () => {
    for (const id of ['retone', 'rally', 'reconnect_why'] as const) {
      expect(resolveLever(id)?.executesForReal).toBe(false);
    }
  });

  it('never maps a reason to the inert retone lever', () => {
    for (const levers of Object.values(REASON_LEVERS)) {
      expect(levers).not.toContain('retone');
    }
  });

  it('has a catalog entry for every mapped lever', () => {
    const mapped = new Set(Object.values(REASON_LEVERS).flat());
    for (const id of mapped) expect(LEVERS.find((l) => l.id === id)).toBeDefined();
  });
});
