/**
 * Tab 4's vocabulary (PRD §9).
 *
 * §9.2 lists ten statuses; `app_versions` stores none of them. That is not an
 * oversight to paper over with a guess — a release status is a decision somebody
 * makes, and until something records it, every row here is simply "Released" with
 * a date, and the page says so rather than inventing "Fully released".
 */

export const KINDS = Object.freeze({
  build: 'Native build',
  update: 'Over-the-air update',
});

export const PLATFORMS = Object.freeze({ ios: 'iOS', android: 'Android', both: 'Both', web: 'Web' });

export const kindLabel = (v) => KINDS[v] ?? v ?? '—';
export const platformLabel = (v) => PLATFORMS[v] ?? v ?? '—';

/**
 * What identifies this release to a human. A build is its number, an update is
 * its id — which is exactly the expression the unique index in 0008 encodes, and
 * the reason it is an index rather than a constraint.
 */
export function identity(row) {
  if (row.kind === 'build') return `${row.version ?? '?'} (${row.build_number ?? '?'})`;
  return row.update_id ? `update ${String(row.update_id).slice(0, 8)}` : `update ${row.version ?? '?'}`;
}

/**
 * Group by runtime version. This is the one grouping that matters operationally:
 * an over-the-air update can only reach installations on its own runtime, so a
 * runtime with no installed build under it is an update that reaches nobody —
 * the failure that has already happened here once.
 */
export function byRuntime(rows) {
  const groups = new Map();
  for (const r of rows) {
    const key = r.runtime_version ?? '(none recorded)';
    if (!groups.has(key)) groups.set(key, { runtime: key, builds: [], updates: [] });
    groups.get(key)[r.kind === 'build' ? 'builds' : 'updates'].push(r);
  }
  return [...groups.values()].sort((a, b) => latestAt(b) - latestAt(a));
}

function latestAt(group) {
  const all = [...group.builds, ...group.updates];
  return all.reduce((m, r) => Math.max(m, new Date(r.released_at).getTime() || 0), 0);
}

/**
 * The warning this page exists to give: an update published against a runtime
 * that no installed build shares. §9.3 wants adoption; adoption we cannot
 * measure, but "this could not possibly have reached anybody" we can.
 */
export function unreachableUpdates(rows) {
  const buildRuntimes = new Set(rows.filter((r) => r.kind === 'build' && r.runtime_version).map((r) => r.runtime_version));
  return rows.filter((r) => r.kind === 'update' && r.runtime_version && !buildRuntimes.has(r.runtime_version));
}
