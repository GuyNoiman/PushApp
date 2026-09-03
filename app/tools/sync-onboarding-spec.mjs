/**
 * Regenerate the code-derived sections of `04_Product/Onboarding_And_Coach_Spec.md`.
 *
 * WHY THIS EXISTS. Four documents describing four different versions of onboarding is what happens
 * when a specification is written once and the code moves afterwards. The half of the spec that
 * describes something the code already holds VERBATIM — the coach's permanent character — should
 * not be retyped by anybody. It is copied, and a test fails when the copy goes stale.
 *
 *   npx tsx tools/sync-onboarding-spec.mjs
 *
 * NOT an npm script, and that is not an oversight. `packageJson:scripts` is an Expo fingerprint
 * source: adding one changes the runtime version, and every already-installed build is silently cut
 * off from OTA updates until somebody makes a new native build. It was added as `spec:sync` on
 * 2026-09-03 and removed the same hour, caught only because `publish-ota.mjs` refuses to publish to
 * a runtime version no device is running.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const SPEC_PATH = resolve(here, '../../04_Product/Onboarding_And_Coach_Spec.md');

/** The fenced block that belongs between the character markers. */
export function characterBlock(character) {
  return ['```text', character, '```'].join('\n');
}

/** Replace the content between a named pair of markers. Throws if the markers are not there. */
export function replaceGenerated(markdown, name, body) {
  const begin = `<!-- BEGIN GENERATED: ${name} -->`;
  const end = `<!-- END GENERATED: ${name} -->`;
  const from = markdown.indexOf(begin);
  const to = markdown.indexOf(end);
  if (from === -1 || to === -1 || to < from) {
    throw new Error(`the spec has no "${name}" generated block — add the markers back`);
  }
  return markdown.slice(0, from + begin.length) + '\n' + body + '\n' + markdown.slice(to);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { coachCharacter } = await import('../src/core/coach/coachCharacter.ts');
  const next = replaceGenerated(
    readFileSync(SPEC_PATH, 'utf8'),
    'coach-character',
    characterBlock(coachCharacter()),
  );
  writeFileSync(SPEC_PATH, next);
  console.log('synced', SPEC_PATH);
}
