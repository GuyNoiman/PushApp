/**
 * Tab 1 — System Health (PRD §6).
 *
 * The honest shape of this page today: two of thirteen services can be measured
 * from the data that exists, and the headline number of §6.2 cannot be computed
 * at all — it needs a count of active installations, and nothing counts them.
 * So the headline says that, in those words, instead of showing 100%.
 */
import { el, clear, dl, when, bytes } from '../dom.js';
import { readInstalls } from '../installs-model.js';
import { SERVICES } from '../registry.js';
import { evaluateAll } from '../health.js';
import { STATE } from '../status.js';

export async function renderHealth(root, ctx) {
  clear(root);
  root.append(el('p', { class: 'muted', text: 'Loading checks…' }));
  const probes = await runProbes(ctx);
  const { cards, overall } = evaluateAll(SERVICES, probes, Date.now());

  clear(root);
  root.append(banner(overall));
  root.append(headline(probes.installs?.total ?? null));
  root.append(el('h2', { text: 'Services' }));
  root.append(el('div', { class: 'grid' }, cards.map(serviceCard)));
  root.append(await issues(ctx));
}

function banner(overall) {
  const label = { healthy: 'Healthy where measured', attention: 'Attention needed', incident: 'Incident' }[overall.state];
  const dot = { healthy: STATE.GREEN, attention: STATE.YELLOW, incident: STATE.RED }[overall.state];
  return el('section', { class: 'card banner' }, [
    el('span', { class: 'verdict' }, [el('span', { class: `dot ${dot}` }), label]),
    el('span', { class: 'muted', text: `${overall.known} of ${overall.total} services checked · ${overall.unknown} unknown` }),
  ]);
}

/**
 * §6.2 asks for a percentage with its numerator and denominator beside it. Both
 * are missing, and a percentage without them is the exact thing the PRD wrote
 * that requirement to prevent — so the card carries the requirement and what it
 * is waiting for, and no number at all.
 */
function headline(installs) {
  // §6.2 asks for a percentage with its numerator and denominator beside it.
  // The DENOMINATOR now exists — installations report themselves — and the
  // numerator does not, because nothing turns "an error happened" into "this
  // installation was blocked". Showing the half we have, and naming the half we
  // do not, is more useful than a gray card that says nothing: it tells whoever
  // reads it exactly which piece to go and build.
  return el('section', { class: 'card' }, [
    el('h3', { text: 'Installations without a blocking failure (24h)' }),
    el('p', { class: 'verdict' }, [
      el('span', { class: `dot ${installs === null ? 'gray' : 'yellow'}` }),
      installs === null ? 'Not measurable yet' : 'Half measurable',
    ]),
    el('p', {
      class: 'muted',
      text:
        installs === null
          ? 'Needs a count of active installations and a blocking-failure stream. Neither reports yet.'
          : `${installs} installation${installs === 1 ? '' : 's'} are reporting in — that is the ` +
            'denominator. There is still no numerator: Sentry reports errors, and nothing yet turns ' +
            '"an error happened" into "this installation was blocked". §6.2 requires both beside the ' +
            'percentage, which is why there is no percentage here.',
    }),
  ]);
}

function serviceCard(card) {
  return el('article', { class: 'service' }, [
    el('h3', {}, [el('span', { class: `dot ${card.state}` }), card.name]),
    el('div', { class: 'metric', text: card.metric }),
    card.detail ? el('div', { class: 'detail', text: card.detail }) : null,
    el('div', { class: 'muted', text: card.lastCheckAt ? `Checked ${when(card.lastCheckAt)}` : 'Never checked' }),
  ]);
}

async function issues(ctx) {
  const section = el('section', { class: 'card' }, [el('h2', { text: 'Active issues' })]);
  try {
    const rows = await ctx.api.select('ops_issues', [
      ['status', 'in.(open,acknowledged,mitigated)'],
      ['order', 'opened_at.desc'],
      ['limit', '50'],
    ]);
    if (!rows?.length) {
      section.append(el('p', { class: 'muted', text: 'No open issue is recorded. Nothing opens one automatically yet — an issue is written by a person.' }));
      return section;
    }
    for (const i of rows) {
      section.append(
        el('div', { class: 'note' }, [
          el('h3', {}, [el('span', { class: `pill`, text: i.severity }), ' ', i.title]),
          dl([
            ['Service', i.source],
            ['Status', i.status],
            ['Opened', when(i.opened_at)],
            ['Notes', i.notes],
          ]),
        ]),
      );
    }
  } catch (e) {
    section.append(el('p', { class: 'muted', text: `Could not read issues: ${e.message}` }));
  }
  return section;
}

/**
 * Every probe reports `{ ok, at, detail }` and nothing more elaborate, because a
 * probe that cannot answer must return NOTHING rather than a default — the
 * difference between "checked and fine" and "never checked" is the whole point
 * of the gray state.
 */
async function runProbes(ctx) {
  const probes = {};
  const started = Date.now();
  try {
    await ctx.api.select('app_versions', [['select', 'id'], ['limit', '1']]);
    const ms = Date.now() - started;
    probes.db = { ok: true, at: new Date().toISOString(), detail: `Round trip ${ms} ms` };
  } catch (e) {
    probes.db = { ok: e.status === 401 || e.status === 403 ? true : false, at: new Date().toISOString(), detail: e.status === 401 || e.status === 403 ? 'Reachable; this account may not read the version registry' : `Unreachable: ${e.message}` };
  }

  probes.auth = ctx.api.signedIn
    ? { ok: true, at: new Date().toISOString(), detail: `Session valid, assurance level ${ctx.aal ?? 'aal1'}` }
    : undefined;

  try {
    const last = await ctx.api.rpc('kpi_last_event_at');
    probes.kpis = last
      ? { ok: true, at: last, intervalMs: 24 * 60 * 60 * 1000, detail: `Last event ${when(last)}` }
      : undefined;
  } catch {
    probes.kpis = undefined;
  }

  try {
    const rows = await ctx.api.select('app_versions', [['order', 'released_at.desc'], ['limit', '1']]);
    const latest = rows?.[0];
    probes.updates = latest
      ? { ok: true, at: latest.released_at, intervalMs: 30 * 24 * 60 * 60 * 1000, detail: `Last release ${when(latest.released_at)}` }
      : undefined;
  } catch {
    probes.updates = undefined;
  }

  try {
    const rows = await ctx.api.rpc('installed_runtimes');
    const groups = readInstalls(rows);
    const total = groups.reduce((sum, g) => sum + g.installs, 0);
    const stranded = groups.reduce((sum, g) => sum + g.strandedInstalls, 0);
    probes.installs = groups.length
      ? {
          ok: true,
          at: new Date().toISOString(),
          total,
          // A stranded installation is a real, actionable problem rather than a
          // quiet one: it cannot receive anything we publish.
          issues: stranded ? [{ severity: 'high' }] : [],
          detail: stranded
            ? `${total} reporting · ${stranded} cannot receive updates — see Versions`
            : `${total} reporting, all on a current runtime`,
        }
      : undefined;
  } catch {
    probes.installs = undefined;
  }

  try {
    const rows = await ctx.api.rpc('coach_usage_summary');
    const s = Array.isArray(rows) ? rows[0] : rows;
    probes.coach = s
      ? {
          ok: true,
          at: new Date().toISOString(),
          detail: `${bytes(s.total_bytes)} over ${s.total_requests} requests · ${s.users_active_24h} of ${s.users_total} accounts active in 24h`,
        }
      : undefined;
  } catch {
    probes.coach = undefined;
  }

  return probes;
}
