/**
 * The creator's own page: who they publish as, and every Journey Template they
 * have authored for the community.
 *
 * "For the community" is the distinction that matters and it is structural, not
 * a filter: a person's OWN Journeys live on their device and never appear in
 * `journey_templates` at all. Everything on this page is something authored to
 * be adopted by somebody else.
 */
import { el, clear, when } from '../dom.js';
import {
  statusLabel, isAdoptable, withStats, missingBeforePublish, suppressionNote,
  languageLabel, relativeTime, workspaceOverview, filterTemplates, SORTS,
} from '../model.js';

export async function renderProfile(root, ctx, { onOpen, onCreate }) {
  clear(root);
  root.append(el('p', { class: 'muted', text: 'Loading…' }));

  const [templates, stats] = await Promise.all([
    ctx.api.select('journey_templates', [
      ['select', '*'],
      ['creator_id', `eq.${ctx.api.userId}`],
      ['order', 'updated_at.desc'],
    ]),
    ctx.api.rpc('creator_my_template_stats').catch(() => []),
  ]);

  const statsById = new Map((stats ?? []).map((s) => [s.template_id, s]));
  const rows = (templates ?? []).map((t) => withStats(t, statsById.get(t.id)));

  clear(root);
  root.append(identityCard(ctx, rows, onCreate));

  if (!rows.length) {
    root.append(
      el('section', { class: 'card' }, [
        el('div', { class: 'empty-mark', text: '✦' }),
        el('h2', { text: 'Build your first Journey' }),
        el('p', {
          text:
            'A Journey Template is the reusable definition somebody else adopts — their own copy of it ' +
            'becomes a Journey Instance, and it is theirs from that moment on.',
        }),
        el('p', {
          class: 'muted',
          text:
            'Start with the Journey’s promise, audience, effort and rules. Milestones, Steps and dependencies ' +
            'will be added in the structure builder without changing this foundation.',
        }),
        el('button', { type: 'button', text: 'Create a Journey', onclick: onCreate }),
      ]),
    );
    return;
  }

  const list = el('section', { class: 'journey-list' }, [
    el('div', { class: 'section-heading' }, [
      el('div', {}, [
        el('p', { class: 'eyebrow', text: 'Your library' }),
        el('h2', { text: 'Journeys authored for the community' }),
      ]),
      el('button', { type: 'button', text: 'Create Journey', onclick: onCreate }),
    ]),
  ]);

  // The filter state lives here rather than in a module variable: a Creator who
  // leaves the page and comes back is starting a new look at their library, not
  // resuming a search.
  const filters = { query: '', status: '', sort: 'updated' };
  const results = el('div', { class: 'journey-results' });

  const draw = () => {
    clear(results);
    const shown = filterTemplates(rows, filters);
    if (!shown.length) {
      results.append(
        el('p', { class: 'muted no-results', text: 'No Journey matches that. Clear the search or choose another status.' }),
      );
      return;
    }
    for (const t of shown) results.append(templateRow(t, onOpen));
  };

  list.append(
    el('div', { class: 'library-filters', role: 'search' }, [
      el('label', { class: 'visually-hidden', for: 'library-search', text: 'Search Journeys' }),
      el('input', {
        id: 'library-search',
        type: 'search',
        placeholder: 'Search Journeys',
        oninput: (e) => { filters.query = e.target.value; draw(); },
      }),
      el('label', { class: 'visually-hidden', for: 'library-status', text: 'Filter by status' }),
      el('select', {
        id: 'library-status',
        onchange: (e) => { filters.status = e.target.value; draw(); },
      }, [
        el('option', { value: '', text: 'All statuses' }),
        // Only statuses this Creator actually has — a menu of eight lifecycle
        // states, six of which match nothing, is a menu that teaches nothing.
        ...[...new Set(rows.map((r) => r.status))].map((value) =>
          el('option', { value, text: statusLabel(value) }),
        ),
      ]),
      el('label', { class: 'visually-hidden', for: 'library-sort', text: 'Sort' }),
      el('select', {
        id: 'library-sort',
        onchange: (e) => { filters.sort = e.target.value; draw(); },
      }, SORTS.map((s) => el('option', { value: s.value, text: s.label }))),
    ]),
    results,
  );
  draw();
  root.append(list);
}

function identityCard(ctx, rows, onCreate) {
  const m = ctx.creator ?? {};
  const overview = workspaceOverview(rows);
  return el('section', { class: 'studio-hero' }, [
    el('div', { class: 'hero-copy' }, [
      el('p', { class: 'eyebrow', text: 'Creator workspace' }),
      el('h1', { text: `Welcome, ${m.display_name || ctx.api.email || 'Creator'}` }),
      el('p', {
        class: 'hero-lede',
        text: 'Turn your method into a Journey people can keep moving through—then learn where it helps and where it needs work.',
      }),
      // The access stage left the metric grid when the design gave that slot to the
      // completion rate. It is kept here rather than dropped: which release stage
      // admitted somebody is a real fact about their account, and §13.1's staged
      // rollout is the reason it is recorded at all.
      el('p', { class: 'muted', text: [m.credentials, `admitted as ${stageLabel(m.stage)}`].filter(Boolean).join(' · ') }),
      el('button', { type: 'button', text: 'Create a new Journey', onclick: onCreate }),
    ]),
    el('div', { class: 'hero-metrics', 'aria-label': 'Creator overview' }, [
      overviewMetric(overview.templates, 'Journey Templates'),
      overviewMetric(overview.published, 'Published'),
      overviewMetric(overview.started, 'People started'),
      // Null when no template has enough participants for a breakdown. A dash is
      // the honest answer; 0% would read as "nobody finishes these", which is a
      // claim about the work rather than about how much is known.
      overviewMetric(overview.completionRate === null ? '—' : `${overview.completionRate}%`, 'Completion rate'),
    ]),
  ]);
}

const overviewMetric = (value, label) =>
  el('div', { class: 'overview-metric' }, [el('b', { text: String(value) }), el('span', { text: label })]);

const stageLabel = (stage) =>
  ({ internal: 'internal team', invited: 'an invited professional', catalogue: 'a catalogue creator' })[stage] ?? 'a creator';

function templateRow(t, onOpen) {
  const s = t.stats;
  const missing = missingBeforePublish(t);
  return el('article', { class: 'row-card' }, [
    el('div', { class: 'row-head' }, [
      // The cover, or a mark standing in for one. A tile either way, so a library
      // of drafts does not look like a different product from a library of
      // published Journeys.
      t.cover_url
        ? el('img', { class: 'row-cover', src: t.cover_url, alt: '', loading: 'lazy' })
        : el('div', { class: 'row-cover row-cover-empty', 'aria-hidden': 'true', text: isAdoptable(t.status) ? '↗' : '✦' }),
      el('div', { class: 'row-main' }, [
        el('h3', { text: t.name }),
        t.short_description ? el('p', { class: 'muted', text: t.short_description }) : null,
        el('div', { class: 'pills' }, [
          el('span', { class: `pill ${isAdoptable(t.status) ? 'live' : ''}`, text: statusLabel(t.status) }),
          t.language ? el('span', { class: 'pill', text: languageLabel(t.language) }) : null,
          missing.length
            ? el('span', {
                class: 'pill warn',
                title: `Needed before publishing: ${missing.join(', ')}`,
                text: `${missing.length} field${missing.length === 1 ? '' : 's'} to fill`,
              })
            : null,
        ]),
      ]),
    ]),
    el('div', { class: 'row-stats' }, statRow(s)),
    el('div', { class: 'row-footer' }, [
      // Relative in the label, exact in the tooltip: the question is "is this the
      // one I was working on", and precision stays one hover away.
      el('div', { class: 'muted small', title: when(t.updated_at), text: `Updated ${relativeTime(t.updated_at)}` }),
      el('button', {
        type: 'button',
        class: 'ghost row-action',
        text: isAdoptable(t.status) ? 'View insights' : 'View draft',
        onclick: () => onOpen(t.id),
      }),
    ]),
  ]);
}

function statRow(s) {
  if (!s) return [el('span', { class: 'muted', text: 'Numbers unavailable' })];
  if (s.suppressed) return [el('span', { class: 'muted', text: suppressionNote(s.enrolled) })];
  return [
    stat(s.enrolled, 'started'),
    stat(s.active, 'in progress'),
    stat(s.completed, 'completed'),
    stat(s.abandoned, 'left'),
    s.averageRating !== null ? stat(s.averageRating, 'average rating') : null,
  ];
}

const stat = (value, label) =>
  el('span', { class: 'stat' }, [el('b', { text: value === null ? '—' : String(value) }), el('span', { text: label })]);
