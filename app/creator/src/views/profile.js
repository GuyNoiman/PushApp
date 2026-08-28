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
import { statusLabel, isAdoptable, withStats, missingBeforePublish, suppressionNote } from '../model.js';

export async function renderProfile(root, ctx, onOpen) {
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
  root.append(identityCard(ctx));

  if (!rows.length) {
    root.append(
      el('section', { class: 'card' }, [
        el('h2', { text: 'No Journey Templates yet' }),
        el('p', {
          text:
            'A Journey Template is the reusable definition somebody else adopts — their own copy of it ' +
            'becomes a Journey Instance, and it is theirs from that moment on.',
        }),
        el('p', {
          class: 'muted',
          text:
            'Authoring one is not built yet. This foundation covers signing in, proving you may author, ' +
            'and seeing what happened to what you published; the structure builder — Milestones, Steps, ' +
            'dependencies, release rules — is the next piece and the largest open design in the PRD.',
        }),
      ]),
    );
    return;
  }

  const list = el('section', { class: 'card' }, [el('h2', { text: 'Journeys you authored for the community' })]);
  for (const t of rows) list.append(templateRow(t, onOpen));
  root.append(list);
}

function identityCard(ctx) {
  const m = ctx.creator ?? {};
  return el('section', { class: 'card' }, [
    el('h1', { text: m.display_name || ctx.api.email || 'Creator' }),
    m.credentials ? el('p', { text: m.credentials }) : null,
    el('p', { class: 'muted', text: `Signed in as ${ctx.api.email ?? '—'} · admitted as ${stageLabel(m.stage)}` }),
  ]);
}

const stageLabel = (stage) =>
  ({ internal: 'internal team', invited: 'an invited professional', catalogue: 'a catalogue creator' })[stage] ?? 'a creator';

function templateRow(t, onOpen) {
  const s = t.stats;
  const missing = missingBeforePublish(t);
  return el('article', { class: 'row-card', onclick: () => onOpen(t.id) }, [
    el('div', { class: 'row-main' }, [
      el('h3', { text: t.name }),
      t.short_description ? el('p', { class: 'muted', text: t.short_description }) : null,
      el('div', { class: 'pills' }, [
        el('span', { class: `pill ${isAdoptable(t.status) ? 'live' : ''}`, text: statusLabel(t.status) }),
        t.language ? el('span', { class: 'pill', text: t.language }) : null,
        missing.length ? el('span', { class: 'pill warn', text: `${missing.length} field${missing.length === 1 ? '' : 's'} to fill before publishing` }) : null,
      ]),
    ]),
    el('div', { class: 'row-stats' }, statRow(s)),
    el('div', { class: 'muted small', text: `Updated ${when(t.updated_at)}` }),
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
