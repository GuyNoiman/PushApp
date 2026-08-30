/**
 * A guard against the fourth username editor.
 *
 * ── WHY THIS TEST EXISTS ─────────────────────────────────────────────────
 *
 * "The username does not save" was reported three times and fixed twice. Both
 * fixes were correct and neither was the last one, because the same logic lived
 * in three places and each fix reached one of them:
 *
 *   `settings/profile.tsx`   — fixed 2026-08-29
 *   `ProfileIdentity.tsx`    — the identical bug, still there afterwards
 *   `onboarding.tsx`         — displays a suggestion, routes elsewhere to edit
 *
 * The shape of the bug was always the same: `void social.setHandle(next)` beside
 * an optimistic local write, so a refused save rendered as a saved one and
 * reverted on the next launch.
 *
 * `setHandle` now returns a result that cannot be read by accident. This test is
 * what stops the next screen from voiding it anyway, and what makes a fourth
 * editor a failing test rather than a fourth bug report.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SRC = resolve(__dirname, '../..');

/** Every editor that may save a username. Adding one here is a decision, not a detail. */
const KNOWN_EDITORS = [
  'app/settings/profile.tsx',
  'components/settings/ProfileIdentity.tsx',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === '__tests__' || entry === 'archive' ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

const callers = sourceFiles(SRC)
  .filter((file) => !file.endsWith('SocialProvider.tsx'))
  .map((file) => ({ file, text: readFileSync(file, 'utf8') }))
  .filter(({ text }) => /\bsetHandle\s*\(/.test(text))
  .map(({ file, text }) => ({ path: relative(SRC, file).replace(/\\/g, '/'), text }));

describe('who may save a username', () => {
  it('is exactly the editors we know about', () => {
    // A new screen that saves a username is not forbidden — it is a decision
    // that has to be made here, where the three-copies history is written down.
    expect(callers.map((c) => c.path).sort()).toEqual([...KNOWN_EDITORS].sort());
  });

  it('never voids the result — the bug was always a swallowed failure', () => {
    for (const caller of callers) {
      expect(caller.text).not.toMatch(/void\s+\w+\.setHandle\s*\(/);
    }
  });

  it('awaits the save in every editor', () => {
    for (const caller of callers) {
      expect(caller.text).toMatch(/await\s+\w+\.setHandle\s*\(/);
    }
  });

  it('never writes the name locally on the line before the save', () => {
    // The optimistic write is the other half of the bug: even with the result
    // read, setting the local name first means a refusal leaves the wrong name
    // on screen until something else re-renders it.
    for (const caller of callers) {
      expect(caller.text).not.toMatch(/setLocal\w*\([^)]*\);\s*\n\s*(await\s+)?\w+\.setHandle/);
    }
  });
});
