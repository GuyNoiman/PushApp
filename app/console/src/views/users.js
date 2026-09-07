/**
 * Settings → Users — the one place account types are changed.
 *
 * ── IT LISTS, AND IT SEARCHES ────────────────────────────────────────────
 *
 * The console shipped without a listing on purpose: managing account types needs
 * a way to FIND a person, which is a smaller thing than a list of everybody.
 * That was right for a console nobody had signed into. It stopped being the
 * whole picture the moment there was an operator who has to answer "how many
 * people are on this?" and "did anybody sign up today?" — questions a search
 * cannot answer at all, because you have to already know a name to ask one
 * (founder, 2026-09-08).
 *
 * So the page opens on the newest accounts, and typing narrows to a search. Both
 * are admin-only, both are capped, and BOTH ARE AUDITED — one row per page and
 * one per search. The point of the audit was never that looking is rare; it is
 * that looking is on the record, and a listing is more worth recording than a
 * search rather than less.
 *
 * ── THE SCREEN DOES NOT DECIDE ANYTHING ─────────────────────────────────
 *
 * Every refusal is enforced in Postgres. `users-model.js` exists so a control
 * that would be refused is disabled with a reason instead of failing after the
 * click — that is a courtesy, not a boundary, and a caller that bypassed this
 * file entirely would be stopped just the same.
 */
import { el, clear, when } from '../dom.js';
import {
  STAFF_ROLES, CREATOR_STAGES, TIERS,
  capabilitiesFor, refusalReason, toggleRole, describeAccount, tooShort, PAGE,
} from '../users-model.js';

export async function renderUsers(root, ctx) {
  clear(root);

  const viewerRoles = ctx.roles ?? [];
  const results = el('div');
  const status = el('p', { class: 'muted' });

  const search = async (query) => {
    clear(results);
    if (tooShort(query)) {
      // Fewer than two characters is not a search; show the list instead of an instruction.
      return list();
    }
    status.textContent = 'Searching…';
    try {
      const rows = await ctx.api.rpc('admin_search_users', { p_query: query });
      status.className = 'muted';
      if (!rows?.length) {
        status.textContent = 'Nobody matches that handle or address.';
        return;
      }
      status.textContent = `${rows.length} account${rows.length === 1 ? '' : 's'}${rows.length === 25 ? ' (showing the first 25)' : ''}`;
      for (const row of rows) results.append(accountCard(row, viewerRoles, ctx, search, query));
    } catch (e) {
      status.className = 'error';
      status.textContent = e.message;
    }
  };

  /** The newest accounts, which is what the page shows before anybody types. */
  const list = async () => {
    clear(results);
    status.className = 'muted';
    status.textContent = 'Loading…';
    try {
      const [rows, total] = await Promise.all([
        ctx.api.rpc('admin_list_users', { p_limit: PAGE }),
        ctx.api.rpc('admin_count_users'),
      ]);
      const count = typeof total === 'number' ? total : null;
      if (!rows?.length) {
        status.textContent = 'No accounts yet.';
        return;
      }
      status.textContent =
        count != null && count > rows.length
          ? `Newest ${rows.length} of ${count} accounts. Search to find a specific one.`
          : `${rows.length} account${rows.length === 1 ? '' : 's'}.`;
      for (const row of rows) results.append(accountCard(row, viewerRoles, ctx, refresh, ''));
    } catch (e) {
      status.className = 'error';
      status.textContent = e.message;
    }
  };

  /** Whatever the page is currently showing — a search if one is typed, else the list. */
  const refresh = async (query) => (tooShort(query) ? list() : search(query));

  const input = el('input', {
    type: 'search',
    placeholder: 'Handle or email address',
    oninput: (e) => {
      clearTimeout(input._t);
      input._t = setTimeout(() => refresh(e.target.value), 250);
    },
  });

  root.append(
    el('section', { class: 'card' }, [
      el('h1', { text: 'Users' }),
      el('p', {
        text:
          'Staff roles, creator access and the paid tier live in three separate places because they ' +
          'answer three different questions: who works here, who may publish, and who is paying. ' +
          'They are shown together and changed separately.',
      }),
      el('label', { text: 'Find an account' }, [input]),
      el('p', { class: 'muted small', text: 'Every search and every page of this list is written to the audit log.' }),
      status,
    ]),
    results,
  );

  await list();
}

function accountCard(row, viewerRoles, ctx, research, query) {
  const can = capabilitiesFor(viewerRoles, row.roles);
  const feedback = el('p', { class: 'muted' });

  const act = async (fn) => {
    feedback.className = 'muted';
    feedback.textContent = 'Saving…';
    try {
      await fn();
      feedback.textContent = 'Saved.';
      await research(query);
    } catch (e) {
      feedback.className = 'error';
      feedback.textContent = e.message;
    }
  };

  const card = el('section', { class: 'card' }, [
    el('h2', { text: row.handle ? `@${row.handle}` : '(no handle)' }),
    el('p', { class: 'muted', text: row.email ?? '' }),
    el('p', { class: 'muted small', text: describeAccount(row) }),
  ]);

  // ── Staff roles ──
  card.append(el('h3', { text: 'Staff roles' }));
  const staffReason = refusalReason(viewerRoles, row.roles, 'staffRoles');
  if (staffReason) card.append(el('p', { class: 'muted small', text: staffReason }));
  const roleList = el('div', { class: 'role-list' });
  for (const role of STAFF_ROLES) {
    const checked = (row.roles ?? []).includes(role.value);
    roleList.append(
      el('label', { class: 'role-row', title: role.note }, [
        el('input', {
          type: 'checkbox',
          checked,
          disabled: Boolean(staffReason),
          onchange: (e) =>
            act(() =>
              ctx.api.rpc('admin_set_staff_roles', {
                p_user: row.user_id,
                p_roles: toggleRole(row.roles, role.value, e.target.checked),
              }),
            ),
        }),
        el('span', {}, [el('b', { text: role.label }), el('span', { class: 'muted small', text: ` ${role.note}` })]),
      ]),
    );
  }
  card.append(roleList);

  // ── Creator access ──
  card.append(el('h3', { text: 'Creator access' }));
  const creatorReason = refusalReason(viewerRoles, row.roles, 'creator');
  if (creatorReason) card.append(el('p', { class: 'muted small', text: creatorReason }));
  const stageSelect = el(
    'select',
    { disabled: Boolean(creatorReason) },
    CREATOR_STAGES.map((s) => el('option', { value: s.value, selected: (row.creator_stage ?? '') === s.value, text: s.label })),
  );
  const suspended = el('input', {
    type: 'checkbox',
    checked: row.creator_status === 'suspended',
    disabled: Boolean(creatorReason) || !row.creator_stage,
  });
  card.append(
    el('div', { class: 'row' }, [
      el('label', { text: 'Stage' }, [stageSelect]),
      el('label', { text: 'Suspended' }, [suspended]),
      el('button', {
        type: 'button',
        class: 'ghost',
        disabled: Boolean(creatorReason),
        text: 'Save creator access',
        onclick: () =>
          act(() =>
            ctx.api.rpc('admin_set_creator', {
              p_user: row.user_id,
              p_stage: stageSelect.value || null,
              p_status: suspended.checked ? 'suspended' : 'active',
            }),
          ),
      }),
    ]),
  );

  // ── Paid tier ──
  card.append(el('h3', { text: 'Subscription' }));
  const tierReason = refusalReason(viewerRoles, row.roles, 'tier');
  if (tierReason) card.append(el('p', { class: 'muted small', text: tierReason }));
  const tierSelect = el(
    'select',
    { disabled: Boolean(tierReason) },
    TIERS.map((t) => el('option', { value: t.value, selected: (row.tier ?? 'free') === t.value, text: t.label })),
  );
  card.append(
    el('div', { class: 'row' }, [
      el('label', { text: 'Tier' }, [tierSelect]),
      el('button', {
        type: 'button',
        class: 'ghost',
        disabled: Boolean(tierReason),
        text: 'Save tier',
        onclick: () => act(() => ctx.api.rpc('admin_set_tier', { p_user: row.user_id, p_tier: tierSelect.value })),
      }),
    ]),
    el('p', {
      class: 'muted small',
      text:
        'A tier set here is recorded as a grant, not as a verified purchase — the column exists to ' +
        'keep those two apart. The app itself can never write this table.',
    }),
    feedback,
  );

  return card;
}
