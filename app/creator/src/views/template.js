/**
 * One Journey Template: what the creator wrote about it, what happened to the
 * people who adopted it, and what they said.
 *
 * The page is arranged so that the boundary is visible rather than assumed. The
 * analytics section shows counts and nothing that could be traced to a person;
 * the reviews section shows words that were written to be read; and the last
 * card lists, in full, what this page will never show — because a list is
 * something a future change has to argue with, and an absence is not.
 */
import { el, clear, when } from '../dom.js';
import {
  FIELD_GROUPS, fieldValue, statusLabel, missingBeforePublish,
  normaliseStats, suppressionNote, NEVER_SHOWN,
} from '../model.js';

export async function renderTemplate(root, ctx, templateId, onBack) {
  clear(root);
  root.append(el('p', { class: 'muted', text: 'Loading…' }));

  const [template, statsRows, reviews] = await Promise.all([
    ctx.api.select('journey_templates', [['select', '*'], ['id', `eq.${templateId}`]], { single: true }),
    ctx.api.rpc('creator_template_stats', { p_template_id: templateId }).catch(() => []),
    ctx.api.rpc('creator_template_reviews', { p_template_id: templateId }).catch(() => []),
  ]);

  const stats = Array.isArray(statsRows) && statsRows.length ? normaliseStats(statsRows[0]) : null;

  clear(root);
  root.append(
    el('div', { class: 'crumbs' }, [el('button', { type: 'button', class: 'ghost', text: '← All Journeys', onclick: onBack })]),
  );
  root.append(header(template));
  root.append(analytics(stats));
  root.append(reviewsCard(reviews ?? [], stats));
  root.append(fieldsCard(template));
  root.append(boundaryCard());
}

function header(t) {
  const missing = missingBeforePublish(t);
  return el('section', { class: 'card' }, [
    el('h1', { text: t.name }),
    t.short_description ? el('p', { text: t.short_description }) : null,
    el('p', { class: 'muted', text: `${statusLabel(t.status)} · created ${when(t.created_at)}${t.published_at ? ` · published ${when(t.published_at)}` : ''}` }),
    missing.length
      ? el('div', { class: 'notice' }, [
          el('b', { text: 'Not ready to publish' }),
          el('p', { class: 'muted', text: 'A participant adopting this would not know what they were agreeing to without:' }),
          el('ul', {}, missing.map((m) => el('li', { text: m }))),
        ])
      : null,
  ]);
}

function analytics(s) {
  const card = el('section', { class: 'card' }, [el('h2', { text: 'What happened to the people who adopted it' })]);
  if (!s) {
    card.append(el('p', { class: 'muted', text: 'No numbers available for this Journey.' }));
    return card;
  }
  card.append(el('div', { class: 'big-stats' }, [big(s.enrolled, 'started it')]));
  if (s.suppressed) {
    card.append(el('p', { class: 'muted', text: suppressionNote(s.enrolled) }));
    card.append(
      el('p', {
        class: 'muted small',
        text:
          'The total is shown because a total identifies nobody. A breakdown can: with two participants, ' +
          '"1 completed, 1 left" is a fact about a person, and this page is not a way to learn one.',
      }),
    );
    return card;
  }
  card.append(
    el('div', { class: 'big-stats' }, [
      big(s.active, 'in progress'),
      big(s.completed, 'completed'),
      big(s.abandoned, 'left it'),
      big(s.paused, 'paused'),
      big(s.completionRate === null ? '—' : `${s.completionRate}%`, 'completion rate'),
    ]),
  );
  card.append(
    el('p', {
      class: 'muted small',
      text:
        'Leaving is a named outcome here rather than the absence of activity — somebody who stops is not ' +
        'the same as somebody who is between Steps, and a Journey nobody finishes is worth knowing about.',
    }),
  );
  return card;
}

const big = (value, label) =>
  el('div', { class: 'big-stat' }, [
    el('b', { text: value === null || value === undefined ? '—' : String(value) }),
    el('span', { text: label }),
  ]);

function reviewsCard(reviews, s) {
  const card = el('section', { class: 'card' }, [el('h2', { text: 'What participants said' })]);
  if (s && s.averageRating !== null) {
    card.append(el('p', {}, [el('b', { text: String(s.averageRating) }), ` average from ${s.reviews ?? reviews.length} review${(s.reviews ?? reviews.length) === 1 ? '' : 's'}`]));
  }
  if (!reviews.length) {
    card.append(el('p', { class: 'muted', text: 'No reviews yet.' }));
    return card;
  }
  for (const r of reviews) {
    card.append(
      el('div', { class: 'review' }, [
        el('div', { class: 'rating', text: '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) }),
        r.comment ? el('p', { text: r.comment }) : el('p', { class: 'muted', text: 'A rating with no words.' }),
        el('div', { class: 'muted small', text: when(r.created_at) }),
      ]),
    );
  }
  card.append(
    el('p', {
      class: 'muted small',
      text:
        'Reviews arrive without a name attached. A review is written knowingly, to be read by you — who ' +
        'wrote it is not part of that, and the query that fetches them has no column for it.',
    }),
  );
  return card;
}

function fieldsCard(t) {
  const card = el('section', { class: 'card' }, [el('h2', { text: 'What you filled in' })]);
  for (const group of FIELD_GROUPS) {
    card.append(el('h3', { text: group.title }));
    const dl = el('dl', { class: 'fields' });
    for (const f of group.fields) {
      const value = fieldValue(t, f);
      dl.append(el('dt', { text: f.label }));
      dl.append(
        value === null
          ? el('dd', { class: 'muted' }, [f.required ? el('span', { class: 'pill warn', text: 'needed to publish' }) : 'Not filled in'])
          : el('dd', { text: value }),
      );
    }
    card.append(dl);
  }
  card.append(
    el('p', {
      class: 'muted small',
      text:
        'The Journey’s structure — its Milestones and Steps — is not here yet. That is the authoring ' +
        'product, and it is deliberately not guessed at in this foundation.',
    }),
  );
  return card;
}

function boundaryCard() {
  return el('section', { class: 'card' }, [
    el('h2', { text: 'What this page will never show you' }),
    el('ul', {}, NEVER_SHOWN.map((x) => el('li', { text: x }))),
    el('p', {
      class: 'muted small',
      text:
        'Not a setting and not an omission: the table holding who is on which Journey has no read ' +
        'permission for a creator at all, and these numbers come from functions that return counts. ' +
        'Aggregate analytics must not become surveillance — this is what that sentence looks like in a schema.',
    }),
  ]);
}
