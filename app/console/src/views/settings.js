/**
 * Settings — access, the audit log and the data contract (PRD §5: these live
 * behind a settings control rather than becoming a fifth primary tab).
 */
import { el, clear, when } from '../dom.js';
import { ACTIONS } from '../audit.js';

export async function renderSettings(root, ctx) {
  clear(root);
  root.append(
    el('section', { class: 'card' }, [
      el('h1', { text: 'Access' }),
      el('p', { text: `Signed in as ${ctx.api.email ?? '—'}` }),
      el('p', {}, [
        'Roles: ',
        el('b', { text: ctx.roles.length ? ctx.roles.join(', ') : 'none' }),
      ]),
      el('p', { class: 'muted', text: 'An operator can read their own membership row and nobody else’s. A list of who can see production is itself worth not handing out, so this console has no operator directory.' }),
      mfaNotice(ctx),
    ]),
  );

  const auditCard = el('section', { class: 'card' }, [el('h2', { text: 'Audit log' })]);
  root.append(auditCard);
  if (!ctx.roles.includes('owner')) {
    auditCard.append(el('p', { class: 'muted', text: 'Only the owner reads the audit log. Everyone writes to it.' }));
  } else {
    try {
      await ctx.audit.record(ACTIONS.AUDIT_VIEW, null);
      const rows = await ctx.api.select('admin_audit', [['order', 'at.desc'], ['limit', '200']]);
      if (!rows.length) auditCard.append(el('p', { class: 'muted', text: 'Empty.' }));
      const body = el('tbody');
      for (const r of rows) body.append(el('tr', {}, [el('td', { text: when(r.at) }), el('td', { text: r.action }), el('td', { text: r.subject ?? '—' })]));
      auditCard.append(el('div', { class: 'wrap' }, [el('table', {}, [el('thead', {}, [el('tr', {}, ['When', 'Action', 'Subject'].map((h) => el('th', { text: h })))]), body])]));
      auditCard.append(el('p', { class: 'muted', text: 'Append-only: there is no update or delete policy on this table, so there is no way to edit it from here or from anywhere else that speaks to the API.' }));
    } catch (e) {
      auditCard.append(el('p', { class: 'error', text: e.message }));
    }
  }

  root.append(
    el('section', { class: 'card' }, [
      el('h2', { text: 'Retention' }),
      el('ul', {}, [
        el('li', { text: 'An ordinary report: until it is resolved, plus 90 days.' }),
        el('li', { text: 'A report about another user: 12 months.' }),
        el('li', { text: 'KPI events: 90 days.' }),
        el('li', { text: 'This audit log: 12 months.' }),
        el('li', { text: 'Version registry: kept — it is operational history.' }),
      ]),
      el('p', { class: 'muted', text: 'Enforced by a nightly job in the database, not by anybody remembering. A terminal status stamps the resolution time, which is what the sweep reads.' }),
    ]),
  );
}

function mfaNotice(ctx) {
  if (ctx.mfa?.enrolled) {
    return el('p', { class: 'muted', text: `Multi-factor authentication is enrolled and this session is at assurance level ${ctx.aal ?? 'aal1'}.` });
  }
  return el('p', {
    class: 'error',
    text:
      '§10 requires multi-factor authentication before production access, and this account has no factor ' +
      'enrolled. Supabase Auth supports TOTP on the free tier; enrolling is done from the account, and ' +
      'until it is, this is a gate that is open rather than a rule that was dropped.',
  });
}
