#!/usr/bin/env node
/**
 * The ONE way to publish an over-the-air update.
 *
 * ── THE MISTAKE IT EXISTS TO PREVENT (2026-08-28) ─────────────────────────────────────────────
 *
 * `runtimeVersion` is `{ "policy": "fingerprint" }`: Expo computes a hash of the app's NATIVE
 * configuration, and an update only reaches a device whose installed build carries exactly that
 * hash. Three lines were added to `app.json` — `CFBundleLocalizations`, `CFBundleDevelopmentRegion`
 * and `expo.locales` — the fingerprint moved, and an update published on top of it went to a runtime
 * version neither phone was on.
 *
 * It reached nobody, and it reached nobody SILENTLY. That is the whole cost: a publish that lands
 * on an empty runtime prints exactly the same cheerful success as one that works, so the failure is
 * only discovered when somebody says "it still looks the same" — and by then the natural assumption
 * is that the feature is broken rather than absent.
 *
 * ── AND THE SECOND FOOT-GUN, IN THE SAME COMMAND ──────────────────────────────────────────────
 *
 * There are two channels. The iPhone build listens to `production` and the Android build listens to
 * `preview`, so publishing to one alone reaches one person and nobody else. That has been written
 * down three times in the handoff and forgotten anyway, which is what a script is for.
 *
 * ── WHAT IT DOES ──────────────────────────────────────────────────────────────────────────────
 *
 *   1. Computes this project's fingerprint for both platforms.
 *   2. Asks EAS for the runtime version of the newest FINISHED build of each.
 *   3. REFUSES to publish if they differ, and says exactly what that means and what to do.
 *   4. Publishes to both channels only when they match.
 *
 * Usage:  node tools/publish-ota.mjs "what changed"          (run from `app/`)
 * Escape: `--force` publishes anyway. It is here because a deliberate publish onto a new runtime is
 *         legitimate the moment a matching build exists — but it must be a decision, not a default.
 *
 * ── AND WHY IT IS NOT AN `npm run` SCRIPT ─────────────────────────────────────────────────────
 *
 * Because adding one would have caused the exact bug it prevents. `packageJson:scripts` is itself a
 * fingerprint source: adding a single line to `package.json`'s `scripts` moves the runtime hash and
 * cuts every installed build off from updates. The guard caught its own installation, which is the
 * best evidence it works — and the reason this is a file you call directly.
 */
import { execFileSync } from 'node:child_process';

const PLATFORMS = ['ios', 'android'];
const CHANNELS = ['production', 'preview'];

const args = process.argv.slice(2);
const force = args.includes('--force');
const message = args.filter((a) => a !== '--force').join(' ').trim();

if (!message) {
  console.error('A message is required: npm run publish:ota -- "what changed"');
  process.exit(1);
}

const run = (cmd, cmdArgs) =>
  execFileSync(cmd, cmdArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** This project's fingerprint, as the update would be published under. */
function projectFingerprint(platform) {
  const out = run('npx', ['expo-updates', 'fingerprint:generate', '--platform', platform]);
  return JSON.parse(out).hash;
}

/**
 * The runtime the newest FINISHED build of this platform carries — what is actually on a phone.
 *
 * Read from `fingerprint.hash` rather than a `runtimeVersion` field: under the fingerprint policy
 * the API reports the hash there, and the field that LOOKS right (`runtimeVersion`) is null. Reading
 * the wrong one made this check pass "no finished build" for every platform, which would have made
 * the guard useless in the most dangerous way — silently permissive.
 */
function installedRuntime(platform) {
  const out = run('npx', [
    'eas-cli@latest', 'build:list',
    '--platform', platform,
    '--status', 'finished',
    '--limit', '1',
    '--json', '--non-interactive',
  ]);
  const build = JSON.parse(out)[0];
  return build?.fingerprint?.hash ?? build?.runtimeVersion ?? null;
}

console.log('Checking that this update can actually reach a phone…\n');

let blocked = false;
for (const platform of PLATFORMS) {
  const mine = projectFingerprint(platform);
  const theirs = installedRuntime(platform);
  const ok = theirs !== null && mine === theirs;
  console.log(`${platform.padEnd(8)} project ${mine}`);
  console.log(`${''.padEnd(8)} build   ${theirs ?? '(no finished build)'}   ${ok ? '✓ match' : '✗ MISMATCH'}\n`);
  if (!ok) blocked = true;
}

if (blocked && !force) {
  console.error(
    [
      'REFUSING TO PUBLISH — this update would reach nobody.',
      '',
      'The native configuration has changed since the installed builds were made, so the runtime',
      'fingerprint no longer matches. An update published now goes to a runtime version that exists',
      'on no device, and it does so silently.',
      '',
      'What changed it is almost always one of: app.json (ios/android config, infoPlist, locales,',
      'permissions), a plugin added or configured, or a dependency with native code.',
      '',
      'Two ways forward:',
      '  • Revert the native change, publish, and park it until there is a build. See locales/README.md',
      '    for how that was done last time.',
      '  • Make a new build, install it on both phones, then publish.',
      '',
      'If a matching build already exists and you know what you are doing: --force',
      '',
      'One surprising cause worth checking first: `packageJson:scripts` is a fingerprint source, so',
      'adding or renaming an npm script is enough on its own.',
    ].join('\n'),
  );
  process.exit(1);
}

if (blocked) console.log('--force given: publishing onto a runtime no installed build matches.\n');

for (const channel of CHANNELS) {
  console.log(`Publishing to ${channel}…`);
  run('npx', ['eas-cli@latest', 'update', '--branch', channel, '--message', message, '--non-interactive']);
  console.log(`  done: ${channel}`);
}

console.log('\nPublished to both channels. Opening the app is all either phone has to do.');
