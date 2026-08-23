/**
 * The backup rules: a fresh install restores, a live device never loses its evening to an older
 * copy, and a tie goes to the person in front of the screen.
 */
import {
  BACKUP_DEBOUNCE_MS,
  BACKUP_MAX_AGE_MS,
  decideRestore,
  shouldBackUp,
} from '../backupPolicy';

const NOW = 1_700_000_000_000;

describe('which copy to open with', () => {
  it('restores when this device has nothing — the lost-phone case', () => {
    expect(decideRestore(undefined, NOW)).toEqual({ kind: 'restore', reason: 'noLocalState' });
  });

  it('keeps local when there has never been a backup', () => {
    expect(decideRestore(NOW, undefined)).toEqual({ kind: 'keepLocal', reason: 'noBackup' });
  });

  it('restores when the server is genuinely newer', () => {
    expect(decideRestore(NOW - 60_000, NOW)).toEqual({ kind: 'restore', reason: 'serverIsNewer' });
  });

  it('keeps local when local is newer', () => {
    expect(decideRestore(NOW, NOW - 60_000)).toMatchObject({ kind: 'keepLocal' });
  });

  it('gives a TIE to the local copy — never overwrite what is in front of the person', () => {
    expect(decideRestore(NOW, NOW)).toEqual({ kind: 'keepLocal', reason: 'localIsNewerOrSame' });
  });

  it('a brand-new install with no backup starts clean rather than erroring', () => {
    expect(decideRestore(undefined, undefined)).toEqual({ kind: 'keepLocal', reason: 'noBackup' });
  });
});

describe('when to write a backup', () => {
  it('does nothing when nothing has changed', () => {
    expect(shouldBackUp(undefined, NOW - 10 * 60_000, NOW)).toBe(false);
  });

  it('writes the first backup as soon as there is something to keep', () => {
    expect(shouldBackUp(NOW, undefined, NOW)).toBe(true);
  });

  it('does not rewrite a change that is already backed up', () => {
    expect(shouldBackUp(NOW - 60_000, NOW, NOW)).toBe(false);
  });

  it('waits for the change to settle rather than writing on every tap', () => {
    const justChanged = NOW - 1_000;
    expect(shouldBackUp(justChanged, NOW - 60_000, NOW)).toBe(false);
    expect(shouldBackUp(NOW - BACKUP_DEBOUNCE_MS, NOW - 60_000, NOW)).toBe(true);
  });

  it('writes anyway once the backup has gone stale, however busy the person is', () => {
    // Someone typing continuously would otherwise never reach the settle window.
    const stillTyping = NOW - 1_000;
    expect(shouldBackUp(stillTyping, NOW - BACKUP_MAX_AGE_MS, NOW)).toBe(true);
  });
});
