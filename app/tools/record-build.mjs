#!/usr/bin/env node
/**
 * Write `landing/current-build.json` from the newest FINISHED build on each
 * platform, so an installed app can find out that a newer one exists.
 *
 * ── WHY A PUBLIC FILE AND NOT THE DATABASE ───────────────────────────────
 *
 * The phone that most needs this answer is the one that can no longer receive
 * anything. An over-the-air update only reaches an installation built for its
 * runtime, so the app on a stranded phone cannot be told by an update — but it
 * can still make an ordinary network request. A public JSON file on the site
 * that already hosts the installer needs no session, no key and no schema, and
 * is reachable by every build that ever shipped.
 *
 * ── WHY IT IS GENERATED AND NOT HAND-WRITTEN ─────────────────────────────
 *
 * The runtime version is a fingerprint that changes on every native build. A
 * manifest somebody edits by hand is a manifest that is wrong one build later,
 * and a WRONG manifest is worse than none: it would tell people they are behind
 * when they are not, and they would stop believing it.
 *
 * Run after a build finishes, then deploy the landing directory:
 *   node tools/record-build.mjs
 *   npx eas-cli@latest deploy --prod --export-dir landing
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(appDir, 'landing', 'current-build.json');

/** The page that explains how to install, in both languages. */
const INSTALL_PAGE = 'https://pushapp-invite.expo.app';

function builds() {
  const raw = execFileSync(
    'npx',
    ['eas-cli@latest', 'build:list', '--limit', '30', '--json', '--non-interactive'],
    { cwd: appDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 },
  );
  return JSON.parse(raw);
}

const newest = (list, platform) =>
  list
    .filter((b) => b.platform === platform && b.status === 'FINISHED')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

const manifest = { generatedAt: new Date().toISOString(), platforms: {} };
const all = builds();

for (const [key, platform] of [['android', 'ANDROID'], ['ios', 'IOS']]) {
  const b = newest(all, platform);
  if (!b) continue;
  manifest.platforms[key] = {
    // The runtime is the identity of the build: it changes exactly when the
    // thing that must be REINSTALLED changes, which is the question being asked.
    runtimeVersion: b.runtime?.version ?? b.fingerprint?.hash ?? null,
    appVersion: b.appVersion ?? null,
    buildNumber: b.appBuildVersion ?? null,
    builtAt: b.completedAt ?? b.createdAt ?? null,
    // Android installs from the artifact directly; iOS goes through TestFlight,
    // which is a page rather than a file.
    installUrl:
      key === 'android'
        ? (b.artifacts?.applicationArchiveUrl ?? INSTALL_PAGE)
        : 'https://testflight.apple.com',
    installPage: INSTALL_PAGE,
  };
}

if (Object.keys(manifest.platforms).length === 0) {
  console.error('No finished build found. Nothing written — an empty manifest would read as "you are up to date".');
  process.exit(1);
}

writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
for (const [k, v] of Object.entries(manifest.platforms)) {
  console.log(`  ${k}: ${v.appVersion} (${v.buildNumber}) · runtime ${String(v.runtimeVersion).slice(0, 8)}`);
}
