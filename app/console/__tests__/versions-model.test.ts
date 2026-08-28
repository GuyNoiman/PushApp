/**
 * Tab 4's arithmetic. `unreachableUpdates` is the reason this file exists: this
 * project has already published an update that could not reach a single phone,
 * and the shape of that mistake is expressible as a set difference.
 */
import { identity, kindLabel, platformLabel, byRuntime, unreachableUpdates } from '../src/versions-model.js';

const build = (runtime: string, at: string, extra = {}) => ({
  kind: 'build', platform: 'ios', version: '1.0.0', build_number: '7', runtime_version: runtime, released_at: at, ...extra,
});
const update = (runtime: string, at: string, extra = {}) => ({
  kind: 'update', platform: 'both', update_id: 'abcdef1234', runtime_version: runtime, released_at: at, ...extra,
});

describe('identity', () => {
  it('names a build by its number and an update by its id', () => {
    expect(identity(build('r1', '2026-08-01'))).toBe('1.0.0 (7)');
    expect(identity(update('r1', '2026-08-02'))).toBe('update abcdef12');
  });

  it('does not pretend to know a missing field', () => {
    expect(identity({ kind: 'build' })).toBe('? (?)');
  });

  it('labels the two kinds in words rather than in database values', () => {
    expect(kindLabel('build')).toBe('Native build');
    expect(kindLabel('update')).toBe('Over-the-air update');
    expect(platformLabel('ios')).toBe('iOS');
  });
});

describe('byRuntime', () => {
  it('groups builds and updates under the runtime that decides reachability', () => {
    const groups = byRuntime([build('r1', '2026-08-01'), update('r1', '2026-08-03'), build('r2', '2026-08-05')]);
    expect(groups.map((g) => g.runtime)).toEqual(['r2', 'r1']); // newest activity first
    const r1 = groups.find((g) => g.runtime === 'r1')!;
    expect(r1.builds).toHaveLength(1);
    expect(r1.updates).toHaveLength(1);
  });

  it('keeps rows with no runtime rather than dropping them', () => {
    const groups = byRuntime([{ kind: 'update', released_at: '2026-08-01' }]);
    expect(groups[0].runtime).toBe('(none recorded)');
  });
});

describe('unreachableUpdates', () => {
  it('finds an update published against a runtime no build shares', () => {
    const rows = [build('r1', '2026-08-01'), update('r2', '2026-08-04'), update('r1', '2026-08-02')];
    expect(unreachableUpdates(rows).map((r: { runtime_version: string }) => r.runtime_version)).toEqual(['r2']);
  });

  it('is empty when every update has a build under it', () => {
    expect(unreachableUpdates([build('r1', '2026-08-01'), update('r1', '2026-08-02')])).toEqual([]);
  });

  it('does not accuse an update whose runtime was never recorded', () => {
    expect(unreachableUpdates([build('r1', '2026-08-01'), { kind: 'update', released_at: '2026-08-02' }])).toEqual([]);
  });
});
