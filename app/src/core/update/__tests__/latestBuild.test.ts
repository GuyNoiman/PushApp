/**
 * Knowing that a newer build exists.
 *
 * Every test here is about the SAME risk from a different direction: this notice
 * must never say "you are behind" unless it is certain. It only has to be wrong
 * once — somebody reinstalls, nothing changes, and they stop believing it — and
 * then the next time they really are cut off, nobody looks.
 *
 * So every failure resolves to `unknown`, and `unknown` renders nothing.
 */
import { updateStanding, fetchBuildManifest, type BuildManifest } from '../latestBuild';

const manifest: BuildManifest = {
  platforms: {
    android: {
      runtimeVersion: 'ad3ed4b6',
      appVersion: '1.0.0',
      buildNumber: '2',
      builtAt: '2026-08-28T16:56:00Z',
      installUrl: 'https://example.test/app.apk',
      installPage: 'https://pushapp-invite.expo.app',
    },
  },
};

const base = { platform: 'android' as const, development: false, manifest };

describe('updateStanding', () => {
  it('says current when the runtime matches', () => {
    expect(updateStanding({ ...base, runtime: 'ad3ed4b6' })).toEqual({ state: 'current' });
  });

  it('says behind when it does not, and hands back where to install from', () => {
    const out = updateStanding({ ...base, runtime: '67160def' });
    expect(out.state).toBe('behind');
    if (out.state === 'behind') expect(out.latest.installPage).toBe('https://pushapp-invite.expo.app');
  });

  it('compares the RUNTIME and nothing else', () => {
    // 1.0.0 was two different Android builds a week apart, and Android's own
    // version code was 2 for both. Neither can answer this question.
    const sameVersionNewerBuild = updateStanding({ ...base, runtime: 'somethingelse' });
    expect(sameVersionNewerBuild.state).toBe('behind');
  });

  it('never claims behind from a missing manifest', () => {
    expect(updateStanding({ ...base, runtime: 'anything', manifest: null }))
      .toEqual({ state: 'unknown', reason: 'no-manifest' });
  });

  it('never claims behind when the device cannot report its own runtime', () => {
    expect(updateStanding({ ...base, runtime: null }))
      .toEqual({ state: 'unknown', reason: 'no-runtime' });
  });

  it('never claims behind for a platform the manifest does not mention', () => {
    expect(updateStanding({ ...base, runtime: 'x', platform: 'ios' }))
      .toEqual({ state: 'unknown', reason: 'no-entry' });
    expect(updateStanding({ ...base, runtime: 'x', platform: null }))
      .toEqual({ state: 'unknown', reason: 'no-entry' });
  });

  it('never claims behind when the entry has no runtime of its own', () => {
    const broken: BuildManifest = { platforms: { android: { ...manifest.platforms.android!, runtimeVersion: null } } };
    expect(updateStanding({ ...base, runtime: 'x', manifest: broken }).state).toBe('unknown');
  });

  it('says nothing at all in development', () => {
    // A dev client has no build to install and no runtime worth comparing.
    expect(updateStanding({ ...base, runtime: 'x', development: true }))
      .toEqual({ state: 'unknown', reason: 'development' });
  });
});

describe('fetchBuildManifest', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('returns the manifest when the server answers', async () => {
    global.fetch = (async () => ({ ok: true, json: async () => manifest })) as never;
    await expect(fetchBuildManifest('https://x.test/m.json')).resolves.toEqual(manifest);
  });

  it('returns null rather than throwing on any failure', async () => {
    global.fetch = (async () => { throw new Error('offline'); }) as never;
    await expect(fetchBuildManifest('https://x.test/m.json')).resolves.toBeNull();

    global.fetch = (async () => ({ ok: false })) as never;
    await expect(fetchBuildManifest('https://x.test/m.json')).resolves.toBeNull();

    global.fetch = (async () => ({ ok: true, json: async () => ({ nonsense: true }) })) as never;
    await expect(fetchBuildManifest('https://x.test/m.json')).resolves.toBeNull();

    global.fetch = (async () => ({ ok: true, json: async () => { throw new Error('bad json'); } })) as never;
    await expect(fetchBuildManifest('https://x.test/m.json')).resolves.toBeNull();
  });
});

describe('the generated manifest that actually ships', () => {
  it('names a runtime for every platform it lists', () => {
    // A manifest entry with no runtime would make every install on that platform
    // read as unknown — the notice would silently never appear again.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const shipped = require('../../../../landing/current-build.json') as BuildManifest;
    const entries = Object.entries(shipped.platforms);
    expect(entries.length).toBeGreaterThan(0);
    for (const [, entry] of entries) {
      expect(typeof entry!.runtimeVersion).toBe('string');
      expect(entry!.runtimeVersion!.length).toBeGreaterThan(8);
      expect(entry!.installPage).toContain('http');
    }
  });
});
