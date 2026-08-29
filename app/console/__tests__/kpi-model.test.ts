/**
 * The console's KPI arithmetic.
 *
 * The two tests worth having are about the difference between zero and unknown:
 * a denominator of nothing is not 0%, and distinct installations cannot be
 * summed across buckets. Both are places where a plausible simplification would
 * put a confident wrong number on a dashboard.
 */
import { KPIS, NOT_YET_COMPUTABLE, WINDOWS, indexCounts, computeKpi, TAXONOMY_VERSION } from '../src/kpi-model.js';

const kpi = (id: string) => KPIS.find((k) => k.id === id)!;

describe('indexCounts', () => {
  it('sums events across a name’s buckets', () => {
    const index = indexCounts([
      { name: 'step_reported', bucket: 'done', events: 10, installs: 4 },
      { name: 'step_reported', bucket: 'partial', events: 3, installs: 2 },
    ]);
    expect(index.get('step_reported')!.events).toBe(13);
    expect(index.get('step_reported')!.buckets.get('done')).toBe(10);
  });

  it('never adds distinct installations together', () => {
    // The same installation can appear in two buckets, so 4 + 2 is not 6 people.
    // With no bucketless row the honest answer is "unknown", not a sum.
    const index = indexCounts([
      { name: 'step_reported', bucket: 'done', events: 10, installs: 4 },
      { name: 'step_reported', bucket: 'partial', events: 3, installs: 2 },
    ]);
    expect(index.get('step_reported')!.installs).toBeNull();
  });

  it('takes distinct installations from the bucketless row when there is one', () => {
    const index = indexCounts([{ name: 'app_first_open', bucket: null, events: 12, installs: 9 }]);
    expect(index.get('app_first_open')!.installs).toBe(9);
  });
});

describe('computeKpi', () => {
  it('divides distinct installations for activation, not raw events', () => {
    const index = indexCounts([
      { name: 'app_first_open', bucket: null, events: 40, installs: 20 },
      { name: 'first_journey_created', bucket: null, events: 11, installs: 11 },
    ]);
    const out = computeKpi(kpi('activation'), index);
    expect(out).toMatchObject({ numerator: 11, denominator: 20, percent: 55 });
  });

  it('says nothing rather than 0% when nothing has reached an outcome', () => {
    const out = computeKpi(kpi('journey_completion'), indexCounts([]));
    expect(out.denominator).toBe(0);
    expect(out.percent).toBeNull();
  });

  it('adds the two end outcomes into completion’s denominator', () => {
    const index = indexCounts([
      { name: 'journey_completed', bucket: null, events: 6, installs: 6 },
      { name: 'journey_abandoned', bucket: null, events: 4, installs: 4 },
    ]);
    expect(computeKpi(kpi('journey_completion'), index)).toMatchObject({ numerator: 6, denominator: 10, percent: 60 });
    // Cancellation is the same denominator, shown beside it rather than hidden.
    expect(computeKpi(kpi('journey_cancellation'), index)).toMatchObject({ numerator: 4, denominator: 10, percent: 40 });
  });

  it('reads a bucket for the follow-through measure', () => {
    const index = indexCounts([
      { name: 'step_reported', bucket: 'done', events: 8, installs: 3 },
      { name: 'step_reported', bucket: 'slipped', events: 2, installs: 1 },
    ]);
    expect(computeKpi(kpi('step_follow_through'), index)).toMatchObject({ numerator: 8, denominator: 10, percent: 80 });
  });

  it('keeps one decimal rather than rounding a small cohort into a lie', () => {
    const index = indexCounts([
      { name: 'journey_created', bucket: null, events: 3, installs: 3 },
      { name: 'journey_first_report', bucket: null, events: 1, installs: 1 },
    ]);
    expect(computeKpi(kpi('journeys_truly_start'), index).percent).toBe(33.3);
  });
});

describe('the definitions', () => {
  it('gives every KPI its definition and exclusions in words (§7.2)', () => {
    for (const k of KPIS) {
      expect(k.definition.length).toBeGreaterThan(20);
      expect(k.exclusions.length).toBeGreaterThan(20);
      expect(['primary', 'supporting', 'diagnostic', 'guardrail']).toContain(k.klass);
    }
  });

  it('names no forbidden objective (§7.5)', () => {
    const forbidden = ['time_in_app', 'session', 'dau', 'mau', 'streak', 'notification_open'];
    for (const k of KPIS) for (const word of forbidden) expect(k.id).not.toContain(word);
  });

  it('lists what it cannot compute rather than leaving silent holes', () => {
    expect(NOT_YET_COMPUTABLE.map((n) => n.title)).toContain('Retention');
    for (const item of NOT_YET_COMPUTABLE) expect(item.blockedBy.length).toBeGreaterThan(30);
  });

  it('shows completion and cancellation as a pair', () => {
    expect(KPIS.map((k) => k.id)).toEqual(expect.arrayContaining(['journey_completion', 'journey_cancellation']));
  });

  it('states the taxonomy version it describes', () => {
    expect(TAXONOMY_VERSION).toBe(0);
    expect(WINDOWS.map((w) => w.value)).toEqual([7, 30, 90, 3650]);
  });
});
