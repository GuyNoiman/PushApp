/**
 * buildInfo tests — the three states the About row has to tell apart, and the one that is easy to
 * get wrong: an EMBEDDED launch carries an updateId too, so only the flag can say that the phone
 * is still on the bundle that shipped inside the build. Pure input → pure output, no native module.
 */
import { describeBundle, shortUpdateId } from '../buildInfo';

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
    ).toEqual({ kind: 'embedded', channel: 'production' });
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
    });
  });

  it('falls back to embedded when updates are on but no id came through', () => {
    expect(describeBundle({ isEnabled: true, updateId: null, channel: null })).toEqual({
      kind: 'embedded',
      channel: null,
    });
  });

  it('treats an empty channel string as no channel', () => {
    expect(describeBundle({ isEnabled: true, isEmbeddedLaunch: true, channel: '' })).toEqual({
      kind: 'embedded',
      channel: null,
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
