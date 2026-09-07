/**
 * Reading what is installed — pure, because the one judgement here is easy to
 * get confidently wrong.
 *
 * ── WHAT "STRANDED" MEANS, AND WHY IT IS NOT A SERVER FLAG ──────────────
 *
 * An over-the-air update reaches only installations built for its runtime. So a
 * group of phones can be permanently cut off while looking perfectly healthy —
 * they are running an update, it just happens to be the last one that could ever
 * reach them.
 *
 * The signal is COMPARATIVE: if one runtime's installations are running an
 * update published today and another's an update from last week, the second
 * group is not quiet, it is cut off. The database deliberately does not decide
 * this — it returns the dates and leaves the comparison here, where the rule can
 * be read and argued with.
 */

/** A runtime whose newest running update is this far behind the freshest is cut off. */
export const STRANDED_AFTER_HOURS = 24;

const at = (v) => (v ? new Date(v).getTime() || null : null);

/**
 * Group the rows by platform and mark the stranded ones.
 *
 * Comparison is WITHIN a platform, never across: iOS and Android have different
 * runtimes by construction, and comparing them would flag every install on one
 * of them every time the other was published to.
 */
export function readInstalls(rows, { strandedAfterHours = STRANDED_AFTER_HOURS } = {}) {
  const byPlatform = new Map();
  for (const row of rows ?? []) {
    const platform = row.platform ?? 'unknown';
    if (!byPlatform.has(platform)) byPlatform.set(platform, []);
    byPlatform.get(platform).push({
      platform,
      runtime: row.runtime_version ?? null,
      installs: Number(row.installs) || 0,
      appVersions: row.app_versions ?? [],
      channels: row.channels ?? [],
      newestUpdateAt: row.newest_update_at ?? null,
      oldestUpdateAt: row.oldest_update_at ?? null,
      // The update NUMBER (D100). A range rather than one value: two phones on the same build can
      // sit on different updates, and that gap is exactly the thing worth seeing.
      newestOta: row.newest_ota_version ?? null,
      oldestOta: row.oldest_ota_version ?? null,
      lastSeen: row.last_seen ?? null,
    });
  }

  const groups = [];
  for (const [platform, runtimes] of byPlatform) {
    // The freshest update anybody on this platform is running. Null when nobody
    // is running an update at all — a fleet entirely on embedded bundles is not
    // stranded, it is simply new.
    const freshest = runtimes.reduce((max, r) => Math.max(max, at(r.newestUpdateAt) ?? 0), 0) || null;
    const marked = runtimes.map((r) => {
      const mine = at(r.newestUpdateAt);
      const behindMs = freshest && mine ? freshest - mine : null;
      return {
        ...r,
        behindHours: behindMs === null ? null : Math.round(behindMs / 3600000),
        // Not stranded when nothing has been published to ANY runtime on this
        // platform: with one runtime there is nothing to be behind.
        stranded: Boolean(freshest && mine && freshest - mine > strandedAfterHours * 3600000),
      };
    });
    marked.sort((a, b) => (at(b.newestUpdateAt) ?? 0) - (at(a.newestUpdateAt) ?? 0));
    groups.push({
      platform,
      runtimes: marked,
      installs: marked.reduce((sum, r) => sum + r.installs, 0),
      strandedInstalls: marked.filter((r) => r.stranded).reduce((sum, r) => sum + r.installs, 0),
    });
  }
  groups.sort((a, b) => a.platform.localeCompare(b.platform));
  return groups;
}

/** Eight characters — enough to read a runtime out loud, and what the dashboard matches on. */
export const shortRuntime = (v) => (v ? String(v).replace(/-/g, '').slice(0, 8) : '—');

/** The sentence beside a stranded group. It says what to DO, not that something is wrong. */
export function strandedNote(runtime) {
  const behind = runtime.behindHours;
  const days = behind === null ? null : Math.round(behind / 24);
  const age = days && days >= 1 ? `${days} day${days === 1 ? '' : 's'}` : `${behind} hours`;
  return (
    `${runtime.installs} installation${runtime.installs === 1 ? '' : 's'} on this runtime are ` +
    `${age} behind the freshest update on this platform. An update cannot reach them: they need to ` +
    `install a build made for a newer runtime.`
  );
}
