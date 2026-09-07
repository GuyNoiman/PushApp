/**
 * Tab 4 — Versions (PRD §9).
 *
 * Grouped by runtime rather than by date, because runtime is the thing that
 * decides whether an over-the-air update can reach a phone at all. This project
 * has already published an update that reached nobody; the page is arranged so
 * that the next one is visible before it is published rather than after.
 */
import { el, clear, dl, when } from '../dom.js';
import { readInstalls, shortRuntime, strandedNote } from '../installs-model.js';
import { identity, kindLabel, platformLabel, byRuntime, unreachableUpdates } from '../versions-model.js';

/**
 * How to name the update running on a group of installations.
 *
 * One number when they agree, a range when they do not — and the range is the point: two phones on
 * the same build sitting on different updates is the exact situation this tab exists to surface, and
 * it is invisible in a single value.
 */
function updateLabel(runtime) {
  const { newestOta, oldestOta } = runtime;
  if (newestOta == null) return 'update not reported';
  return newestOta === oldestOta ? `update ${newestOta}` : `updates ${oldestOta}–${newestOta}`;
}

export async function renderVersions(root, ctx) {
  clear(root);
  root.append(el('section', { class: 'card' }, [el('h1', { text: 'Versions' }), el('p', { class: 'muted', text: 'Loading…' })]));
  let rows;
  try {
    rows = await ctx.api.select('app_versions', [['order', 'released_at.desc'], ['limit', '200']]);
  } catch (e) {
    clear(root);
    root.append(el('section', { class: 'card' }, [
      el('h1', { text: 'Versions' }),
      el('p', { class: 'error', text: `Could not read the version registry: ${e.message}` }),
      el('p', { class: 'muted', text: 'This needs the operations, developer or product role.' }),
    ]));
    return;
  }

  clear(root);
  root.append(await installedSection(ctx));
  root.append(el('section', { class: 'card' }, [
    el('h2', { text: 'Release registry' }),
    el('p', {
      class: 'muted',
      text:
        'Every row here is something that was released. §9.2 lists ten statuses — draft, scheduled, ' +
        'paused, superseded and the rest — and nothing records them yet, so this page does not label a ' +
        'row with a status it would be making up. Adoption counts are absent for the same reason.',
    }),
    rows.length === 0
      ? el('p', { text: 'The registry is empty. Nothing writes to it automatically yet; a release is recorded by the publish tooling or by hand.' })
      : null,
  ]));

  const unreachable = unreachableUpdates(rows);
  if (unreachable.length) {
    root.append(el('section', { class: 'card' }, [
      el('h2', {}, [el('span', { class: 'dot red' }), 'Updates that could not have reached anybody']),
      el('p', { class: 'muted', text: 'These were published against a runtime that no recorded native build shares. An installation can only take an update built for its own runtime.' }),
      ...unreachable.map((r) => el('div', { class: 'note' }, [el('div', { text: identity(r) }), el('div', { class: 'muted', text: `runtime ${r.runtime_version} · ${when(r.released_at)}` })])),
    ]));
  }

  for (const group of byRuntime(rows)) {
    const section = el('section', { class: 'card' }, [
      el('h2', { text: `Runtime ${group.runtime}` }),
      el('p', { class: 'muted', text: `${group.builds.length} native build${group.builds.length === 1 ? '' : 's'} · ${group.updates.length} over-the-air update${group.updates.length === 1 ? '' : 's'}` }),
    ]);
    for (const r of [...group.builds, ...group.updates].sort((a, b) => new Date(b.released_at) - new Date(a.released_at))) {
      section.append(
        el('details', {}, [
          el('summary', { text: `${kindLabel(r.kind)} · ${platformLabel(r.platform)} · ${identity(r)} · ${when(r.released_at)}` }),
          dl([
            ['Channel', r.channel],
            ['Runtime', r.runtime_version],
            ['Update id', r.update_id],
            ['Commit', r.commit_sha],
            ['Notes', r.notes],
            ['Adoption', 'Not measured — nothing reports which installation is on which release.'],
          ]),
        ]),
      );
    }
    root.append(section);
  }
}

/**
 * WHAT IS ACTUALLY INSTALLED (founder option B, 2026-08-31).
 *
 * The release registry above says what we published; this says what is running.
 * They disagree in exactly the case that matters — and the case that already
 * happened: a tester on a build from a week earlier, receiving nothing, for
 * three days, found from a screenshot rather than from here.
 */
async function installedSection(ctx) {
  const section = el('section', { class: 'card' }, [
    el('h1', { text: 'Versions' }),
    el('p', {
      class: 'muted',
      text:
        'What is actually installed, reported by each app on launch. An over-the-air update reaches ' +
        'only installations built for its runtime, so a group of phones can be permanently cut off ' +
        'while looking healthy — running an update, just the last one that could ever reach them.',
    }),
  ]);

  let rows;
  try {
    rows = await ctx.api.rpc('installed_runtimes');
  } catch (e) {
    section.append(el('p', { class: 'muted', text: `Not readable: ${e.message}` }));
    return section;
  }

  const groups = readInstalls(rows);
  if (!groups.length) {
    section.append(
      el('p', {
        text:
          'No installation has reported yet. Reporting ships with the build after 2026-08-31, so a ' +
          'phone on an older one appears here only once it is reinstalled — which is itself the ' +
          'answer to whether it was stranded.',
      }),
    );
    return section;
  }

  for (const group of groups) {
    section.append(
      el('h3', {}, [
        el('span', { class: `dot ${group.strandedInstalls ? 'red' : 'green'}` }),
        `${group.platform} · ${group.installs} installation${group.installs === 1 ? '' : 's'}`,
        group.strandedInstalls
          ? el('span', { class: 'pill warn', text: `${group.strandedInstalls} cut off` })
          : null,
      ]),
    );
    for (const runtime of group.runtimes) {
      section.append(
        el('div', { class: 'note' }, [
          el('div', {}, [
            el('b', { text: `runtime ${shortRuntime(runtime.runtime)}` }),
            ' · ',
            `${runtime.installs} install${runtime.installs === 1 ? '' : 's'}`,
            // The number a person can say out loud, ahead of the identifiers that never move
            // between over-the-air updates. Its absence is a fact too: an installation that has
            // not reported one predates the numbering.
            ` · ${updateLabel(runtime)}`,
            runtime.appVersions.length ? ` · ${runtime.appVersions.join(', ')}` : '',
            runtime.channels.length ? ` · ${runtime.channels.join(', ')}` : '',
          ]),
          el('div', {
            class: 'muted small',
            text: runtime.newestUpdateAt
              ? `Newest update running here: ${when(runtime.newestUpdateAt)}`
              : 'Running the bundle it was installed with — no update has been applied.',
          }),
          el('div', { class: 'muted small', text: `Last seen ${when(runtime.lastSeen)}` }),
          runtime.stranded ? el('p', { class: 'error small', text: strandedNote(runtime) }) : null,
        ]),
      );
    }
  }
  return section;
}
