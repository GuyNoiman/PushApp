/**
 * The Android keyboard regression, guarded.
 *
 * Every composer in the app once passed `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`,
 * which means NO keyboard avoidance on Android. It was correct while Android resized its window for
 * the keyboard, and it silently stopped being correct when edge-to-edge landed — the partner then
 * met a coach composer sitting under the keyboard, unable to see what he was typing.
 *
 * The failure arrived without a commit, so the test is written against the SOURCE: no screen may
 * quietly go back to deciding this for itself.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { KEYBOARD_AVOIDING_BEHAVIOR } from '../KeyboardSafeView';

const SRC = join(__dirname, '../../..');

function everyTsxFile(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== '__tests__' && entry !== 'node_modules') everyTsxFile(full, out);
    } else if (entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

describe('keyboard avoidance', () => {
  it('is decided in one place, and that place avoids on Android too', () => {
    // `undefined` here is the bug: it is what "do nothing" looks like when it is written as a
    // platform check rather than as a decision.
    expect(KEYBOARD_AVOIDING_BEHAVIOR).toBe('padding');
  });

  it('is never re-decided by a screen', () => {
    const offenders = everyTsxFile(SRC).filter((file) => {
      if (file.endsWith('KeyboardSafeView.tsx')) return false;
      const source = readFileSync(file, 'utf8');
      // A raw KeyboardAvoidingView ELEMENT (not the word in a comment) means a screen deciding for
      // itself again.
      return /<KeyboardAvoidingView[\s>]/.test(source);
    });

    expect(offenders.map((f) => f.replace(SRC, ''))).toEqual([]);
  });

  it('is never simply ABSENT from a scrolling screen that holds a text input', () => {
    // The 2026-08-26 fix corrected the nine screens with a PINNED composer and stopped there. It
    // left nine more — the Tools above all, where people type the most — scrolling inside a bare
    // ScrollView with a TextInput in it and no avoidance of any kind. On Android under edge-to-edge
    // that is a keyboard sitting on the field, reported from a device on 2026-08-27.
    //
    // Checking the source rather than the render, for the same reason as the test above: this
    // failure arrives by somebody reaching for `ScrollView` out of habit, not by a decision.
    const offenders = everyTsxFile(SRC).filter((file) => {
      if (file.includes(join('components', 'ui'))) return false; // the containers themselves
      const source = readFileSync(file, 'utf8');
      if (!/<TextInput[\s>]/.test(source)) return false;
      if (!/<ScrollView[\s>]/.test(source)) return false; // not a scrolling screen
      // Any of the three safe containers counts; `TabScrollView` wraps KeyboardSafeScrollView.
      return !/(KeyboardSafeScrollView|KeyboardSafeView|TabScrollView)/.test(source);
    });

    expect(offenders.map((f) => f.replace(SRC, ''))).toEqual([]);
  });
});
