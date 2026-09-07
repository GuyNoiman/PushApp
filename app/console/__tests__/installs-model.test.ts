/**
 * Reading what is installed.
 *
 * The one judgement here is "stranded", and it is easy to get confidently wrong
 * in three directions: comparing across platforms, flagging a fleet that has
 * simply never been published to, and flagging a phone that is merely quiet
 * rather than cut off. Each has its own test, because the failure this whole
 * feature exists to catch already happened once and was found from a screenshot.
 */
import { readInstalls, shortRuntime, strandedNote, STRANDED_AFTER_HOURS } from '../src/installs-model.js';

// The model is plain JS (the console has no build step), so shapes it returns
// arrive here untyped. Naming the one used in assertions beats annotating each.
type Runtime = { runtime: string | null; stranded: boolean; installs: number; behindHours: number | null; appVersions: string[] };

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

const row = (over: Record<string, unknown>) => ({
  platform: 'android',
  runtime_version: 'aaaaaaaa1111',
  installs: 1,
  app_versions: ['1.0.0'],
  channels: ['production'],
  newest_update_at: hoursAgo(1),
  oldest_update_at: hoursAgo(1),
  last_seen: hoursAgo(1),
  ...over,
});

describe('stranded', () => {
  it('flags the runtime whose newest update is far behind another on the same platform', () => {
    // This is the real case: one build gets everything, an older one gets
    // nothing, and nothing on either phone says so.
    const [android] = readInstalls([
      row({ runtime_version: 'new', newest_update_at: hoursAgo(1), installs: 2 }),
      row({ runtime_version: 'old', newest_update_at: hoursAgo(96), installs: 1 }),
    ]);
    expect(android.strandedInstalls).toBe(1);
    expect((android.runtimes as Runtime[]).find((r) => r.runtime === 'old')!.stranded).toBe(true);
    expect((android.runtimes as Runtime[]).find((r) => r.runtime === 'new')!.stranded).toBe(false);
  });

  it('never compares one platform against another', () => {
    // iOS and Android have different runtimes by construction. Comparing them
    // would flag every install on one of them every time the other shipped.
    const groups = readInstalls([
      row({ platform: 'ios', runtime_version: 'ios-rt', newest_update_at: hoursAgo(96) }),
      row({ platform: 'android', runtime_version: 'and-rt', newest_update_at: hoursAgo(1) }),
    ]);
    expect(groups.every((g) => g.strandedInstalls === 0)).toBe(true);
  });

  it('does not flag a fleet that has never received an update at all', () => {
    // Everybody on the bundle they installed with is new, not cut off.
    const [group] = readInstalls([
      row({ runtime_version: 'a', newest_update_at: null }),
      row({ runtime_version: 'b', newest_update_at: null }),
    ]);
    expect(group.strandedInstalls).toBe(0);
    expect((group.runtimes as Runtime[]).every((r) => r.stranded === false)).toBe(true);
  });

  it('does not flag a single runtime — with one, there is nothing to be behind', () => {
    const [group] = readInstalls([row({ newest_update_at: hoursAgo(500) })]);
    expect(group.strandedInstalls).toBe(0);
  });

  it('leaves a merely quiet install alone, inside the threshold', () => {
    const [group] = readInstalls([
      row({ runtime_version: 'a', newest_update_at: hoursAgo(0) }),
      row({ runtime_version: 'b', newest_update_at: hoursAgo(STRANDED_AFTER_HOURS - 2) }),
    ]);
    expect(group.strandedInstalls).toBe(0);
  });

  it('reports how far behind, so the note can say it in days', () => {
    const [group] = readInstalls([
      row({ runtime_version: 'a', newest_update_at: hoursAgo(0) }),
      row({ runtime_version: 'b', newest_update_at: hoursAgo(72), installs: 3 }),
    ]);
    const behind = (group.runtimes as Runtime[]).find((r) => r.runtime === 'b')!;
    expect(behind.behindHours).toBeGreaterThanOrEqual(71);
    expect(strandedNote(behind)).toContain('3 days behind');
    expect(strandedNote(behind)).toContain('install a build');
  });
});

describe('grouping', () => {
  it('totals installs per platform and orders freshest first', () => {
    const [group] = readInstalls([
      row({ runtime_version: 'old', newest_update_at: hoursAgo(50), installs: 4 }),
      row({ runtime_version: 'new', newest_update_at: hoursAgo(2), installs: 1 }),
    ]);
    expect(group.installs).toBe(5);
    expect(group.runtimes[0].runtime).toBe('new');
  });

  it('survives a row with nothing but a count', () => {
    const [group] = readInstalls([
      { installs: 2, platform: null, runtime_version: null, newest_update_at: null, last_seen: null },
    ] as never);
    expect(group.platform).toBe('unknown');
    expect(group.runtimes[0].appVersions).toEqual([]);
  });

  it('returns nothing for nothing', () => {
    expect(readInstalls([])).toEqual([]);
    expect(readInstalls(undefined as never)).toEqual([]);
  });
});

describe('shortRuntime', () => {
  it('is short enough to read aloud and long enough to tell two apart', () => {
    expect(shortRuntime('ad3ed4b68b3b71b492aa50a3ea8c1b3fbec69aa0')).toBe('ad3ed4b6');
    expect(shortRuntime(null)).toBe('—');
  });
});

describe('the update number, which is the one thing a person can say out loud', () => {
  it('carries the range each runtime is running', () => {
    // A RANGE rather than one value: two phones on the same build sitting on different updates is
    // exactly the situation this tab exists to surface, and it is invisible in a single number.
    const [group] = readInstalls([
      {
        platform: 'ios',
        runtime_version: 'abc123',
        installs: 2,
        app_versions: ['1.0.0'],
        channels: ['production'],
        newest_update_at: '2026-09-08T10:00:00Z',
        oldest_update_at: '2026-09-07T10:00:00Z',
        newest_ota_version: 5,
        oldest_ota_version: 3,
        last_seen: '2026-09-08T10:05:00Z',
      },
    ]);
    expect(group.runtimes[0].newestOta).toBe(5);
    expect(group.runtimes[0].oldestOta).toBe(3);
  });

  it('reports nothing rather than zero for an installation that predates the numbering', () => {
    // Null is a fact — "an older build" — and zero would read as a real update number.
    const [group] = readInstalls([
      {
        platform: 'android',
        runtime_version: 'def456',
        installs: 1,
        app_versions: [],
        channels: [],
        newest_update_at: null,
        oldest_update_at: null,
        last_seen: '2026-09-08T10:05:00Z',
      },
    ]);
    expect(group.runtimes[0].newestOta).toBeNull();
  });
});
