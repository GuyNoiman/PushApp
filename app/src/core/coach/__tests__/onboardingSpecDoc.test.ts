/**
 * The spec and the code say the same thing, or the build fails.
 *
 * FOUR DOCUMENTS DESCRIBING FOUR DIFFERENT PRODUCTS is what this guards against, and it is not a
 * hypothetical: by 2026-09-03 the onboarding spec existed in three dated versions plus a separate
 * corrections file, and the partner and the founder were reading different ones. A specification
 * that quotes the code cannot be allowed to quote a version of it that no longer runs.
 *
 * So the coach's permanent character is COPIED into `04_Product/Onboarding_And_Coach_Spec.md` by
 * `tools/sync-onboarding-spec.mjs`, and this test fails the moment the two drift. The fix when it
 * fails is one command: `npm run spec:sync`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { coachCharacter } from '../coachCharacter';

const SPEC = resolve(__dirname, '../../../../../04_Product/Onboarding_And_Coach_Spec.md');

describe('the onboarding spec', () => {
  const markdown = readFileSync(SPEC, 'utf8');

  it('still has the generated block the sync script writes into', () => {
    expect(markdown).toContain('<!-- BEGIN GENERATED: coach-character -->');
    expect(markdown).toContain('<!-- END GENERATED: coach-character -->');
  });

  it('quotes the character the app is actually running', () => {
    // Not a substring check on a phrase or two: the whole text, exactly, so an edit anywhere in the
    // character is caught rather than only the parts somebody thought to assert.
    const begin = markdown.indexOf('<!-- BEGIN GENERATED: coach-character -->');
    const end = markdown.indexOf('<!-- END GENERATED: coach-character -->');
    const block = markdown.slice(begin, end);
    expect(block).toContain(coachCharacter());
  });

  it('is one file, and says so', () => {
    // The rule is the whole point of the document existing; losing the sentence loses the rule.
    expect(markdown).toContain('This is the only file');
  });
});
