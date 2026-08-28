/**
 * Tab 3 — User Reports (PRD §8). The one tab that is fully answerable today.
 *
 * Two things in here are deliberate and easy to undo by accident:
 *
 * 1. **There is no search box over descriptions.** Every filter is a column
 *    comparison. A support queue with a full-text search over what people wrote
 *    is a different product than a support queue, and the difference is not
 *    visible in the UI once it is there.
 * 2. **The audit write comes before the sensitive action, and its failure stops
 *    the action.** §10 requires a log of attachment opens, assignments, status
 *    changes and notes. Doing the thing and then trying to log it produces the
 *    one state the requirement exists to prevent.
 */
import { el, clear, dl, when } from '../dom.js';
import { ACTIONS, subjects } from '../audit.js';
import {
  STATUSES, CATEGORIES, SEVERITIES,
  statusLabel, categoryLabel, severityLabel,
  buildReportQuery, summarise, isSafety, replyMailto, shortRef,
} from '../reports-model.js';

const SELECT_COLUMNS =
  'id,category,subcategory,description,contact_email,app_version,build,runtime_id,platform,os_version,' +
  'locale,correlation_id,source,status,severity,assigned_to,resolution_note,resolved_at,created_at';

let filters = { openOnly: true };

export async function renderReports(root, ctx) {
  clear(root);
  root.append(filterBar(root, ctx));
  const listHost = el('section', { class: 'card' }, [el('p', { class: 'muted', text: 'Loading…' })]);
  const detailHost = el('section', { id: 'report-detail' });
  root.append(listHost, detailHost);
  await loadList(listHost, detailHost, ctx);
}

function filterBar(root, ctx) {
  const rerender = () => renderReports(root, ctx);
  const select = (name, label, options, value) =>
    el('label', { text: label }, [
      el(
        'select',
        { name, onchange: (e) => { filters = { ...filters, [name]: e.target.value || undefined }; rerender(); } },
        [el('option', { value: '', text: 'Any' }), ...options.map((o) => el('option', { value: o.value, selected: value === o.value, text: o.label }))],
      ),
    ]);

  return el('section', { class: 'card' }, [
    el('h1', { text: 'User reports' }),
    el('div', { class: 'filters' }, [
      select('status', 'Status', STATUSES, filters.status),
      select('category', 'Category', CATEGORIES, filters.category),
      select('severity', 'Severity', SEVERITIES, filters.severity),
      select('platform', 'Platform', [{ value: 'ios', label: 'iOS' }, { value: 'android', label: 'Android' }, { value: 'web', label: 'Web' }], filters.platform),
      el('label', { text: 'App version' }, [
        el('input', {
          type: 'text', value: filters.appVersion ?? '', placeholder: 'e.g. 1.0.0',
          onchange: (e) => { filters = { ...filters, appVersion: e.target.value.trim() || undefined }; rerender(); },
        }),
      ]),
      el('label', { text: 'Since' }, [
        el('select', { onchange: (e) => { filters = { ...filters, sinceIso: e.target.value || undefined }; rerender(); } }, [
          el('option', { value: '', text: 'All time' }),
          el('option', { value: iso(7), text: 'Last 7 days' }),
          el('option', { value: iso(30), text: 'Last 30 days' }),
        ]),
      ]),
      el('label', { text: 'Queue only' }, [
        el('input', {
          type: 'checkbox', checked: Boolean(filters.openOnly),
          onchange: (e) => { filters = { ...filters, openOnly: e.target.checked || undefined, status: undefined }; rerender(); },
        }),
      ]),
    ]),
  ]);
}

const iso = (days) => new Date(Date.now() - days * 86400000).toISOString();

async function loadList(host, detailHost, ctx) {
  clear(host);
  let rows;
  try {
    rows = await ctx.api.select('app_reports', [['select', SELECT_COLUMNS], ...buildReportQuery(filters)]);
  } catch (e) {
    host.append(el('p', { class: 'error', text: `Could not read reports: ${e.message}` }));
    host.append(el('p', { class: 'muted', text: 'This needs the support or safety role. An account without one reads nothing, which is the database refusing rather than the page failing.' }));
    return;
  }
  if (!rows.length) {
    host.append(el('p', { class: 'muted', text: 'No report matches these filters.' }));
    return;
  }
  const s = summarise(rows);
  host.append(
    el('div', { class: 'counts' }, [
      el('span', {}, [el('b', { text: String(s.total) }), ' shown']),
      el('span', {}, [el('b', { text: String(s.open) }), ' in the queue']),
      el('span', {}, [el('b', { text: String(s.waiting) }), ' waiting on a reply']),
      el('span', {}, [el('b', { text: String(s.untriaged) }), ' without a severity']),
      s.safety ? el('span', {}, [el('b', { text: String(s.safety) }), ' about another user']) : null,
    ]),
  );

  const body = el('tbody');
  for (const r of rows) {
    body.append(
      el('tr', { onclick: () => showDetail(detailHost, r, ctx) }, [
        el('td', { text: shortRef(r.id) }),
        el('td', {}, [categoryLabel(r.category), isSafety(r) ? el('span', { class: 'pill safety', text: 'safety' }) : null]),
        el('td', { text: severityLabel(r.severity) }),
        el('td', { text: statusLabel(r.status) }),
        el('td', { text: [r.platform, r.app_version].filter(Boolean).join(' ') || '—' }),
        el('td', { text: when(r.created_at) }),
      ]),
    );
  }
  host.append(
    el('div', { class: 'wrap' }, [
      el('table', {}, [
        el('thead', {}, [el('tr', {}, ['Ref', 'Category', 'Severity', 'Status', 'Build', 'Created'].map((h) => el('th', { text: h })))]),
        body,
      ]),
    ]),
  );
}

async function showDetail(host, row, ctx) {
  clear(host);
  const card = el('section', { class: 'card' });
  host.append(card);
  card.append(el('h2', { text: `Report ${shortRef(row.id)}` }));
  if (isSafety(row)) {
    card.append(
      el('p', { class: 'error', text: 'This is a report about another user (§8.7). Reporter and subject references belong in a separately protected area that does not exist yet — so this view shows the report and nothing about the accounts involved.' }),
    );
  }
  card.append(el('div', { class: 'description', text: row.description }));
  card.append(
    dl([
      ['Category', categoryLabel(row.category)],
      ['Subcategory', row.subcategory],
      ['Created', when(row.created_at)],
      ['App version', row.app_version],
      ['Build', row.build],
      ['Runtime', row.runtime_id],
      ['Platform', row.platform],
      ['OS', row.os_version],
      ['Locale', row.locale],
      ['Correlation id', row.correlation_id],
      ['Entry point', row.source],
      ['Reply address', row.contact_email],
      ['Resolution', row.resolution_note],
      ['Resolved', row.resolved_at ? when(row.resolved_at) : null],
    ]),
  );

  card.append(el('h3', { text: 'Triage' }));
  const feedback = el('p', { class: 'muted' });
  const act = async (fn) => {
    feedback.textContent = 'Working…';
    try {
      await fn();
      feedback.textContent = 'Saved.';
      feedback.className = 'muted';
    } catch (e) {
      feedback.textContent = e.message;
      feedback.className = 'error';
    }
  };

  const statusSelect = el('select', {}, STATUSES.map((s) => el('option', { value: s.value, selected: s.value === row.status, text: s.label })));
  const severitySelect = el('select', {}, [
    el('option', { value: '', selected: !row.severity, text: 'Not triaged' }),
    ...SEVERITIES.map((s) => el('option', { value: s.value, selected: s.value === row.severity, text: s.label })),
  ]);
  const resolution = el('textarea', { rows: '2', placeholder: 'Resolution summary, shown to nobody but operators and kept with the report' }, [row.resolution_note ?? '']);

  card.append(
    el('div', { class: 'row' }, [
      el('label', { text: 'Status' }, [statusSelect]),
      el('label', { text: 'Severity' }, [severitySelect]),
      el('button', {
        type: 'button',
        text: 'Save',
        onclick: () =>
          act(async () => {
            const next = statusSelect.value;
            const nextSeverity = severitySelect.value || null;
            if (next !== row.status) await ctx.audit.record(ACTIONS.REPORT_STATUS, subjects.status(row.id, row.status, next));
            if (nextSeverity !== (row.severity ?? null)) await ctx.audit.record(ACTIONS.REPORT_SEVERITY, subjects.report(row.id));
            const patch = { status: next, severity: nextSeverity, resolution_note: resolution.value.trim() || null };
            // `resolved_at` is what retention sweeps on (§12). A terminal status
            // without it means a report kept forever, so it is stamped here and
            // cleared if the report is reopened.
            const terminal = STATUSES.find((s) => s.value === next)?.terminal;
            patch.resolved_at = terminal ? (row.resolved_at ?? new Date().toISOString()) : null;
            await ctx.api.update('app_reports', [['id', `eq.${row.id}`]], patch);
            Object.assign(row, patch);
          }),
      }),
      el('button', {
        type: 'button', class: 'ghost', text: 'Assign to me',
        onclick: () =>
          act(async () => {
            await ctx.audit.record(ACTIONS.REPORT_ASSIGN, subjects.report(row.id));
            await ctx.api.update('app_reports', [['id', `eq.${row.id}`]], { assigned_to: ctx.api.userId });
            row.assigned_to = ctx.api.userId;
          }),
      }),
      replyLink(row, ctx),
    ]),
  );
  card.append(el('label', { text: 'Resolution summary' }, [resolution]));
  card.append(feedback);

  card.append(await notes(row, ctx));
  card.append(await attachments(row, ctx));
}

function replyLink(row, ctx) {
  const href = replyMailto(row);
  if (!href) return el('span', { class: 'muted', text: 'No reply address was given.' });
  return el('button', {
    type: 'button', class: 'ghost', text: 'Prepare reply',
    onclick: async () => {
      await ctx.audit.record(ACTIONS.REPLY_PREPARED, subjects.report(row.id));
      window.location.href = href;
    },
  });
}

async function notes(row, ctx) {
  const section = el('section', {}, [el('h3', { text: 'Operator notes' })]);
  const list = el('div');
  section.append(list);
  const input = el('textarea', { rows: '2', placeholder: 'A note for whoever picks this up next' });
  const refresh = async () => {
    clear(list);
    try {
      const rows = await ctx.api.select('report_notes', [
        ['select', 'id,note,created_at,author_id'],
        ['report_id', `eq.${row.id}`],
        ['order', 'created_at.desc'],
      ]);
      if (!rows.length) list.append(el('p', { class: 'muted', text: 'None yet.' }));
      for (const n of rows) list.append(el('div', { class: 'note' }, [el('div', { text: n.note }), el('div', { class: 'muted', text: when(n.created_at) })]));
    } catch (e) {
      list.append(el('p', { class: 'muted', text: `Notes are unavailable: ${e.message}. Migration 0010 creates this table; it may not be applied yet.` }));
    }
  };
  await refresh();
  section.append(
    el('div', { class: 'row' }, [
      el('label', { text: 'Add a note' }, [input]),
      el('button', {
        type: 'button', text: 'Add',
        onclick: async () => {
          const note = input.value.trim();
          if (!note) return;
          await ctx.audit.record(ACTIONS.REPORT_NOTE, subjects.report(row.id));
          await ctx.api.insert('report_notes', { report_id: row.id, author_id: ctx.api.userId, note });
          input.value = '';
          await refresh();
        },
      }),
    ]),
  );
  return section;
}

/**
 * §8.4: access is audited and role-restricted. The audit row is written FIRST and
 * a failure to write it stops the open — see the file header.
 */
async function attachments(row, ctx) {
  const section = el('section', {}, [el('h3', { text: 'Attachment' })]);
  let rows = [];
  try {
    rows = await ctx.api.select('report_attachments', [['select', 'id,storage_path,bytes,mime'], ['report_id', `eq.${row.id}`]]);
  } catch (e) {
    section.append(el('p', { class: 'muted', text: `Not readable: ${e.message}` }));
    return section;
  }
  if (!rows.length) {
    section.append(el('p', { class: 'muted', text: 'None. The app cannot attach a screenshot yet — stage 2 shipped without it.' }));
    return section;
  }
  for (const a of rows) {
    section.append(
      el('div', { class: 'row' }, [
        el('span', { class: 'muted', text: `${a.mime ?? 'file'} · ${a.bytes ?? '?'} bytes` }),
        el('button', {
          type: 'button', class: 'ghost', text: 'Open (logged)',
          onclick: async () => {
            await ctx.audit.record(ACTIONS.ATTACHMENT_OPEN, subjects.attachment(a.id));
            const signed = await ctx.api.signedUrl('report-attachments', a.storage_path, 60);
            window.open(`${ctx.api.url}/storage/v1${signed.signedURL ?? signed.signedUrl}`, '_blank', 'noopener');
          },
        }),
      ]),
    );
  }
  return section;
}
