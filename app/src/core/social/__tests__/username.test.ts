/**
 * Handles — the one form a name is stored and searched in.
 *
 * ── THE DEVICE REPORT THIS FILE EXISTS FOR (2026-08-27) ────────────────────────────────────────
 *
 * Two people could not find each other. The handle was stored exactly as typed and looked up with
 * an exact, case-sensitive equality, so a capital letter, a trailing space, or an `@` typed out of
 * habit each made somebody unfindable — and nothing on screen said why. These tests pin the
 * canonical form on both sides of that, because a lookup and a save that disagree is the whole bug.
 */
import { canonicalHandle, MIN_USERNAME_LENGTH, normalizeUsername, usernameError } from '../username';

describe('canonicalHandle', () => {
  it('strips the @, which is decoration the UI draws and never part of a name', () => {
    expect(canonicalHandle('@liam')).toBe('liam');
    expect(canonicalHandle('@@liam')).toBe('liam');
    // Typing it must not be able to change who you are.
    expect(canonicalHandle('@quiet-otter-9019')).toBe(canonicalHandle('quiet-otter-9019'));
  });

  it('folds case and trims, so the same name typed differently is the same name', () => {
    expect(canonicalHandle('  Liam  ')).toBe('liam');
    expect(canonicalHandle('QUIET-Otter-9019')).toBe('quiet-otter-9019');
  });

  it('KEEPS hyphens — a handle is read and typed by people', () => {
    // This is the difference from `normalizeUsername`, which strips them on purpose.
    expect(canonicalHandle('quiet-otter-9019')).toBe('quiet-otter-9019');
    expect(normalizeUsername('quiet-otter-9019')).toBe('quietotter9019');
  });

  it('drops anything that is not a letter, a digit or a hyphen', () => {
    expect(canonicalHandle('li am!')).toBe('liam');
    expect(canonicalHandle('li—am')).toBe('liam');
    expect(canonicalHandle('kind--fox')).toBe('kind-fox');
    expect(canonicalHandle('-liam-')).toBe('liam');
  });

  it('is idempotent — canonicalising a canonical handle changes nothing', () => {
    for (const raw of ['@Liam ', 'quiet-otter-9019', 'KIND--fox--6226']) {
      expect(canonicalHandle(canonicalHandle(raw))).toBe(canonicalHandle(raw));
    }
  });

  it('gives back nothing for input that is only decoration', () => {
    expect(canonicalHandle('@')).toBe('');
    expect(canonicalHandle('---')).toBe('');
    expect(canonicalHandle('   ')).toBe('');
  });
});

describe('usernameError', () => {
  const none = new Set<string>();

  it('rejects a name that canonicalises to nothing, however long it looked', () => {
    // "@@@@" is four characters and no name at all. Validating the typed string rather than the
    // stored one would have let it through.
    expect(usernameError('@@@@', none)).not.toBeNull();
    expect(usernameError('----', none)).not.toBeNull();
  });

  it('accepts a real handle, with or without the @', () => {
    expect(usernameError('quiet-otter-9019', none)).toBeNull();
    expect(usernameError('@quiet-otter-9019', none)).toBeNull();
  });

  it('still refuses one that is genuinely too short', () => {
    expect(usernameError('ab', none)).toContain(String(MIN_USERNAME_LENGTH));
  });

  it('still collides on names a registry would treat as the same', () => {
    const taken = new Set([normalizeUsername('Ronit Levi')]);
    expect(usernameError('ronit-levi', taken)).not.toBeNull();
    expect(usernameError('RonitLevi', taken)).not.toBeNull();
  });
});
