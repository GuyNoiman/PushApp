/**
 * Tab 2 — KPIs (PRD §7).
 *
 * Every number here carries its own definition, because §7.2 requires it and
 * because the alternative is what usually happens: two people reading the same
 * percentage as two different things. Numerator and denominator are shown beside
 * the percentage for the same reason §6.2 demands it of the health number.
 *
 * What cannot be computed is listed rather than left out. Four of §7.3's eight
 * headline KPIs need something the event stream does not carry, and a dashboard
 * with four silent holes is a dashboard that looks complete.
 */
import { el, clear, when } from '../dom.js';
import {
  KPIS, NOT_YET_COMPUTABLE, WINDOWS, CLASS_LABELS, TAXONOMY_VERSION, SIGN_IN_FAILURE_REASONS,
  indexCounts, computeKpi, computeFunnel, computeSignIn, computeAccountEscape,
} from '../kpi-model.js';

export async function renderKpis(root, ctx) {
  let days = 30;

  const body = el('div');
  const header = el('section', { class: 'card' }, [
    el('h1', { text: 'KPIs' }),
    el('p', {
      class: 'muted',
      text:
        'Whether the product helps people turn intention into action. Engagement may appear as ' +
        'diagnostic context and is never the goal — time in app, sessions, opens and streak length ' +
        'are not on this page and are not allowed to be.',
    }),
    el('label', { text: 'Window' }, [
      el(
        'select',
        { onchange: (e) => { days = Number(e.target.value); void draw(); } },
        WINDOWS.map((w) => el('option', { value: String(w.value), selected: w.value === days, text: w.label })),
      ),
    ]),
  ]);

  async function draw() {
    clear(body);
    body.append(el('p', { class: 'muted', text: 'Loading…' }));
    const until = new Date();
    const since = new Date(until.getTime() - days * 86400000);
    let rows;
    let versions = [];
    try {
      [rows, versions] = await Promise.all([
        ctx.api.rpc('kpi_counts', { p_since: since.toISOString(), p_until: until.toISOString() }),
        ctx.api.rpc('kpi_versions_seen').catch(() => []),
      ]);
    } catch (e) {
      clear(body);
      body.append(el('section', { class: 'card' }, [
        el('p', { class: 'error', text: `Could not read the KPI stream: ${e.message}` }),
        el('p', { class: 'muted', text: 'This needs the operations, developer or product role.' }),
      ]));
      return;
    }

    const index = indexCounts(rows);
    const total = [...index.values()].reduce((sum, entry) => sum + entry.events, 0);

    clear(body);

    if (total === 0) {
      body.append(
        el('section', { class: 'card' }, [
          el('h2', {}, [el('span', { class: 'dot gray' }), 'No events in this window']),
          el('p', {
            text:
              'The stream is wired and accepting events; none has arrived in the selected window. ' +
              'An installed build that predates the KPI work emits nothing, which is the most likely ' +
              'reason on any given day this early.',
          }),
        ]),
      );
    }

    body.append(funnelCard(computeFunnel(rows)), signInCard(computeSignIn(rows), computeAccountEscape(rows)));

    for (const kpi of KPIS) {
      body.append(kpiCard(computeKpi(kpi, index)));
    }

    body.append(
      el('section', { class: 'card' }, [
        el('h2', { text: 'Not computable yet' }),
        el('p', { class: 'muted', text: 'Named rather than omitted, so the page cannot look more complete than it is.' }),
        ...NOT_YET_COMPUTABLE.map((item) =>
          el('div', { class: 'note' }, [el('b', { text: item.title }), el('p', { class: 'muted small', text: item.blockedBy })]),
        ),
      ]),
      el('section', { class: 'card' }, [
        el('h2', { text: 'Definitions and versions' }),
        el('p', {
          class: 'muted small',
          text:
            `The console describes taxonomy version ${TAXONOMY_VERSION}. Every event carries the version it ` +
            'was emitted under, so a definition change never silently recomputes history — it appears as a ' +
            'new version in the list below.',
        }),
        versions?.length
          ? el('ul', {}, versions.map((v) =>
              el('li', { text: `version ${v.taxonomy_version} · ${v.events} events · ${when(v.first_at)} → ${when(v.last_at)}` }),
            ))
          : el('p', { class: 'muted', text: 'No version has produced an event yet.' }),
        el('p', {
          class: 'muted small',
          text:
            'Every KPI on this page is PROVISIONAL: the founder accepted the set as a starting point and the ' +
            'formulas may be refined. A refinement is a version bump, not an edit.',
        }),
      ]),
    );
  }

  clear(root);
  root.append(header, body);
  await draw();
}

function kpiCard(kpi) {
  const unknown = kpi.percent === null;
  return el('section', { class: 'card' }, [
    el('h2', {}, [
      el('span', { class: `dot ${unknown ? 'gray' : 'green'}` }),
      kpi.title,
      el('span', { class: 'pill', text: CLASS_LABELS[kpi.klass] ?? kpi.klass }),
      el('span', { class: 'pill', text: 'provisional' }),
    ]),
    el('p', { class: 'verdict', text: unknown ? 'Nothing to divide yet' : `${kpi.percent}%` }),
    // §6.2's rule, applied to product metrics: the numerator and denominator sit
    // beside the percentage. A percentage on its own is where two people start
    // reading the same number as two different things.
    el('p', { class: 'muted', text: `${kpi.numerator} of ${kpi.denominator}` }),
    el('p', { text: kpi.definition }),
    el('p', { class: 'muted small', text: `Excludes: ${kpi.exclusions}` }),
  ]);
}

const table = (headings, rows) =>
  el('div', { class: 'wrap' }, [
    el('table', {}, [
      el('thead', {}, [el('tr', {}, headings.map((h) => el('th', { text: h })))]),
      el('tbody', {}, rows),
    ]),
  ]);

/** A signed change, so a stage that GAINED installations reads as a gain rather than a loss. */
const signed = (n) => (n > 0 ? `−${n}` : n < 0 ? `+${-n}` : '0');

function funnelCard(stages) {
  const empty = stages.every((stage) => stage.installs === 0);
  return el('section', { class: 'card' }, [
    el('h2', {}, [el('span', { class: `dot ${empty ? 'gray' : 'green'}` }), 'First run — where people stop']),
    el('p', {
      class: 'muted',
      text:
        'Installations that reached each step, in order, and how many fewer than the step before. The ' +
        'account step is the mandatory sign-in wall (D104); the conversation’s two rows are the first answer ' +
        'and the confirmed understanding check.',
    }),
    empty
      ? el('p', { class: 'muted', text: 'No installation has reported a first-run step in this window.' })
      : table(
          ['Step', 'Installations', 'Lost since previous', 'Lost %'],
          stages.map((stage) =>
            el('tr', {}, [
              el('td', { text: stage.label }),
              el('td', { text: String(stage.installs) }),
              el('td', { text: stage.drop === null ? '—' : signed(stage.drop) }),
              el('td', { text: stage.dropPercent === null ? '—' : `${stage.dropPercent}%` }),
            ]),
          ),
        ),
    el('p', {
      class: 'muted small',
      text:
        'Each step counts once per installation. A negative loss is real, not a bug: “I already have an ' +
        'account” skips from Welcome to Account, and a phone that was already mid-flow when this build ' +
        'arrived starts counting wherever it was. Builds before the first-run measurement report nothing here.',
    }),
  ]);
}

function signInCard(providers, escape) {
  const escaped = escape.reduce((sum, e) => sum + e.events, 0);
  const anySucceeded = providers.some((p) => p.succeeded > 0);
  const anyAttempt = providers.some((p) => p.attempts > 0);
  const dot = escaped > 0 ? 'red' : anySucceeded ? 'green' : anyAttempt ? 'yellow' : 'gray';
  return el('section', { class: 'card' }, [
    el('h2', {}, [el('span', { class: `dot ${dot}` }), 'Sign-in — has it worked for anybody']),
    el('p', {
      class: 'muted',
      text:
        'Events, not installations: three tries that end in one success are three attempts. A cancel is the ' +
        'person closing the sheet and is never counted as a failure.',
    }),
    table(
      ['Provider', 'Attempts', 'Succeeded', 'Cancelled', 'Failed', ...SIGN_IN_FAILURE_REASONS.map((r) => `· ${r}`), 'No outcome'],
      providers.map((p) =>
        el('tr', {}, [
          el('td', { text: p.provider === 'apple' ? 'Apple' : 'Google' }),
          el('td', { text: String(p.attempts) }),
          el('td', { text: String(p.succeeded) }),
          el('td', { text: String(p.cancelled) }),
          el('td', { text: String(p.failed) }),
          ...SIGN_IN_FAILURE_REASONS.map((reason) => el('td', { text: String(p.failures[reason]) })),
          el('td', { text: String(p.unaccounted) }),
        ]),
      ),
    ),
    el('p', {
      class: 'muted small',
      text:
        'unavailable — this build or device could not run the provider · rejected — the provider said yes and ' +
        'our server refused the token · error — anything else. No outcome — the app closed mid-attempt, or ' +
        'the attempt straddles the window.',
    }),
    el('div', { class: 'note' }, [
      el('b', { text: `No-provider escape used: ${escaped}` }),
      el('p', {
        class: escaped > 0 ? 'error small' : 'muted small',
        text:
          escaped > 0
            ? escape
                .filter((e) => e.events > 0)
                .map((e) => `${e.bucket === 'no_backend' ? 'no backend' : 'no provider'}: ${e.events} (${e.installs} installations)`)
                .join(' · ') + ' — these people passed the account wall with no session.'
            : 'The account step’s escape for a build that can sign nobody in. It should stay at zero on real devices.',
      }),
    ]),
  ]);
}
