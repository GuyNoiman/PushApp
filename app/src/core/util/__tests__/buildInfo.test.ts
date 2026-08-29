/**
 * buildInfo tests — the three states the About row has to tell apart, and the one that is easy to
 * get wrong: an EMBEDDED launch carries an updateId too, so only the flag can say that the phone
 * is still on the bundle that shipped inside the build. Pure input → pure output, no native module.
 */
import { describeBundle, shortRuntime, shortUpdateId } from '../buildInfo';

describe('describeBundle', () => {
  it('reports development when the module is missing entirely (web, jest)', () => {
    expect(describeBundle(null)).toEqual({ kind: 'development' });
  });

  it('reports development in a dev client, where the module exists but is disabled', () => {
    expect(describeBundle({ isEnabled: false, updateId: 'abc' })).toEqual({ kind: 'development' });
  });

  it('reports embedded when the build is running its own bundle', () => {
    expect(
      describeBundle({
        isEnabled: true,
        isEmbeddedLaunch: true,
        updateId: '01a03089-c5dc-7449-a9b3-13196b587822',
        channel: 'production',
      }),
    ).toEqual({ kind: 'embedded', channel: 'production', runtime: null });
  });

  it('reports the running update with its id, publication date and channel', () => {
    const createdAt = new Date('2026-08-24T18:40:48.621Z');
    expect(
      describeBundle({
        isEnabled: true,
        isEmbeddedLaunch: false,
        updateId: '01a03513-3ded-7d05-8b29-98a879474942',
        createdAt,
        channel: 'preview',
      }),
    ).toEqual({
      kind: 'update',
      id: '01a03513-3ded-7d05-8b29-98a879474942',
      createdAt,
      channel: 'preview',
      runtime: null,
    });
  });

  it('falls back to embedded when updates are on but no id came through', () => {
    expect(describeBundle({ isEnabled: true, updateId: null, channel: null })).toEqual({
      kind: 'embedded',
      channel: null,
      runtime: null,
    });
  });

  it('treats an empty channel string as no channel', () => {
    expect(describeBundle({ isEnabled: true, isEmbeddedLaunch: true, channel: '' })).toEqual({
      kind: 'embedded',
      channel: null,
      runtime: null,
    });
  });
});

describe('shortUpdateId', () => {
  it('takes the first eight characters, dashes removed, so it can be read aloud', () => {
    expect(shortUpdateId('01a03513-3ded-7d05-8b29-98a879474942')).toBe('01a03513');
  });

  it('is safe on an id shorter than the prefix', () => {
    expect(shortUpdateId('abc')).toBe('abc');
  });
});

describe('the running build', () => {
  it('reports the runtime version, which is the only value that names the BUILD', () => {
    // The app version does not move between builds — `1.0.0` was two different Android builds a
    // week apart, and the Android version code did not move either. This is what distinguishes them.
    const embedded = describeBundle({ isEnabled: true, isEmbeddedLaunch: true, runtimeVersion: 'ad3ed4b68b3b71b4' });
    expect(embedded).toMatchObject({ kind: 'embedded', runtime: 'ad3ed4b68b3b71b4' });

    const updated = describeBundle({
      isEnabled: true,
      isEmbeddedLaunch: false,
      updateId: '01a019df-6332-7b11-b151-c875b86d7796',
      runtimeVersion: 'ad3ed4b68b3b71b4',
    });
    expect(updated).toMatchObject({ kind: 'update', runtime: 'ad3ed4b68b3b71b4' });
  });

  it('says null rather than guessing when the runtime is not reported', () => {
    expect(describeBundle({ isEnabled: true, isEmbeddedLaunch: true })).toMatchObject({ runtime: null });
    expect(describeBundle({ isEnabled: true, isEmbeddedLaunch: true, runtimeVersion: '' })).toMatchObject({ runtime: null });
  });

  it('shortens a runtime to something a person can read out loud', () => {
    expect(shortRuntime('ad3ed4b68b3b71b492aa50a3ea8c1b3fbec69aa0')).toBe('ad3ed4b6');
  });
});
