/**
 * Tab 4 — Versions (PRD §9).
 *
 * Grouped by runtime rather than by date, because runtime is the thing that
 * decides whether an over-the-air update can reach a phone at all. This project
 * has already published an update that reached nobody; the page is arranged so
 * that the next one is visible before it is published rather than after.
 */
import { el, clear, dl, when } from '../dom.js';
import { identity, kindLabel, platformLabel, byRuntime, unreachableUpdates } from '../versions-model.js';

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
  root.append(el('section', { class: 'card' }, [
    el('h1', { text: 'Versions' }),
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
