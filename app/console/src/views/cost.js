/**
 * Tab — Model cost.
 *
 * The founder has asked twice for a limit on spending, and every number we could
 * put on one was a guess: the proxy counted bytes for life, per user, and bytes
 * are not what Google bills. This page answers the question a limit needs
 * answering first — what does ONE conversation cost, and how much worse is the
 * worst one than the typical one.
 *
 * Three deliberate refusals, all of them the same refusal:
 *
 *  · The mean never appears alone. A limit is set for the tail, and the tail is
 *    invisible in an average, so the median, p90, the maximum and a histogram
 *    are beside it.
 *  · Unknown never renders as zero. Calls the provider reported no tokens for,
 *    and models with no rate, are counted and named; the conversations that
 *    contain them are excluded from the statistics and their cost is shown as a
 *    floor.
 *  · The rate is shown with its source and the date it was read. A cost figure
 *    computed from a price nobody can check is not a cost figure.
 *
 * Nothing on this page exists until migration 0019 is applied AND the proxy is
 * redeployed; until then it reads an empty table and says so.
 */
import { el, clear } from '../dom.js';
import { WINDOWS } from '../kpi-model.js';
import {
  conversationCosts,
  formatUsd,
  indexPrices,
  summarise,
} from '../cost-model.js';

export async function renderCost(root, ctx) {
  let days = 30;

  const body = el('div');
  const header = el('section', { class: 'card' }, [
    el('h1', { text: 'Model cost' }),
    el('p', {
      class: 'muted',
      text:
        'What one conversation with the coach costs, measured on the server from the token counts ' +
        'the provider itself reports. The device is not asked — a client that reports its own spend ' +
        'can report zero.',
    }),
    el('label', { text: 'Window' }, [
      el(
        'select',
        {
          onchange: (e) => {
            days = Number(e.target.value);
            void draw();
          },
        },
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
    let priceRows;
    try {
      [rows, priceRows] = await Promise.all([
        ctx.api.rpc('llm_conversation_costs', {
          p_since: since.toISOString(),
          p_until: until.toISOString(),
        }),
        ctx.api.rpc('llm_model_prices').catch(() => []),
      ]);
    } catch (e) {
      clear(body);
      body.append(
        el('section', { class: 'card' }, [
          el('p', { class: 'error', text: `Could not read model cost: ${e.message}` }),
          el('p', {
            class: 'muted',
            text:
              'This needs the operations, developer or product role — and migration 0019, which ' +
              'creates the function this page calls. An unapplied migration reads exactly like a ' +
              'missing role from here.',
          }),
        ]),
      );
      return;
    }

    const prices = indexPrices(priceRows);
    const conversations = conversationCosts(rows, prices);
    const { kinds, unattributed } = summarise(conversations);

    clear(body);

    if (!conversations.length) {
      body.append(
        el('section', { class: 'card' }, [
          el('h2', {}, [el('span', { class: 'dot gray' }), 'Nothing recorded in this window']),
          el('p', {
            text:
              'No call has been recorded against a conversation here. Either nobody talked to the ' +
              'coach, or the proxy has not been redeployed since the token accounting landed — an ' +
              'older proxy records bytes only, and those calls never reach this table.',
          }),
        ]),
      );
    }

    for (const kind of kinds) body.append(kindCard(kind));

    if (unattributed.calls > 0) body.append(unattributedCard(unattributed));

    body.append(priceCard(prices));
  }

  clear(root);
  root.append(header, body);
  await draw();
}

/**
 * One kind, with its distribution. The line that matters most is not the average
 * — it is "measured N of M": a mean over a third of the conversations is a mean
 * that should not be acted on, and the only way to know is to be told.
 */
function kindCard(kind) {
  const incomplete = kind.conversations - kind.measured;
  return el('section', { class: 'card' }, [
    el('h2', { text: kind.label }),
    el('p', { class: 'counts' }, [
      el('span', {}, [el('b', { text: formatUsd(kind.mean) }), ' average per conversation']),
      el('span', {}, [el('b', { text: formatUsd(kind.median) }), ' median']),
      el('span', {}, [el('b', { text: formatUsd(kind.p90) }), ' p90']),
      el('span', {}, [el('b', { text: formatUsd(kind.max) }), ' most expensive']),
    ]),
    el('p', { class: 'counts' }, [
      el('span', {}, [el('b', { text: String(kind.conversations) }), ' conversations']),
      el('span', {}, [el('b', { text: String(kind.calls) }), ' calls']),
      el('span', {}, [el('b', { text: formatUsd(kind.totalUsd) }), ' total in window']),
      el('span', {}, [
        el('b', { text: `${kind.measured} of ${kind.conversations}` }),
        ' fully measured',
      ]),
    ]),
    incomplete > 0
      ? el('div', { class: 'note' }, [
          el('b', { text: `${incomplete} conversation${incomplete === 1 ? '' : 's'} not fully measured` }),
          el('p', {
            class: 'muted small',
            text:
              `${kind.callsWithoutUsage} call${kind.callsWithoutUsage === 1 ? '' : 's'} came back with no ` +
              'token counts' +
              (kind.unpricedModels.length
                ? `, and no rate is set for ${kind.unpricedModels.join(', ')}`
                : '') +
              '. Those conversations are left out of the figures above and their spend is a floor, ' +
              'not a total. Unknown is not zero.',
          }),
        ])
      : null,
    histogramBlock(kind.histogram, kind.measured),
  ]);
}

/**
 * The distribution, because the expensive tail is what a spending limit is for.
 * A plain bar per bucket: this console has no chart library and does not want one.
 */
function histogramBlock(buckets, total) {
  if (!total) {
    return el('p', {
      class: 'muted small',
      text: 'No fully measured conversation in this window, so there is no distribution to show.',
    });
  }
  const peak = Math.max(...buckets.map((b) => b.count), 1);
  return el('div', {}, [
    el('p', { class: 'muted small', text: 'Distribution across fully measured conversations' }),
    ...buckets
      .filter((bucket) => bucket.count > 0)
      .map((bucket) =>
        el('div', { class: 'row' }, [
          el('span', {
            class: 'muted small',
            style: 'min-width: 9rem',
            text: bucket.to === null ? `over ${formatUsd(bucket.from)}` : `${formatUsd(bucket.from)} – ${formatUsd(bucket.to)}`,
          }),
          el('span', {
            class: 'pill',
            style: `min-width: ${Math.max(2, Math.round((bucket.count / peak) * 20))}rem`,
            text: `${bucket.count}`,
          }),
        ]),
      ),
  ]);
}

/**
 * Calls that carry no conversation id — an older build, or a coach surface that
 * does not tag yet (Journey editing, the Dream coach, the tools). They are shown
 * as CALLS and never folded into an average, because they are not a conversation
 * and pretending otherwise would drag every average towards a fiction.
 */
function unattributedCard(unattributed) {
  return el('section', { class: 'card' }, [
    el('h2', { text: 'Calls not attributed to a conversation' }),
    el('p', { class: 'counts' }, [
      el('span', {}, [el('b', { text: String(unattributed.calls) }), ' calls']),
      el('span', {}, [
        el('b', { text: formatUsd(unattributed.costUsd) }),
        unattributed.lowerBound ? ' or more' : ' total',
      ]),
    ]),
    el('p', {
      class: 'muted small',
      text:
        'These are real spend and are counted here, but they are not conversations and are kept out ' +
        'of every average above. A build that predates the conversation id, or a coach surface that ' +
        'does not send one, lands here.',
    }),
  ]);
}

/** The rates the page costed with, and where they came from. */
function priceCard(prices) {
  const rows = [...prices.values()];
  return el('section', { class: 'card' }, [
    el('h2', { text: 'Rates used' }),
    rows.length
      ? el(
          'ul',
          {},
          rows.map((rate) =>
            el('li', {}, [
              el('b', { text: rate.model }),
              el('span', {
                class: 'muted small',
                text:
                  ` — $${rate.input} in / $${rate.output} out per million tokens` +
                  (rate.notedOn ? ` · read ${rate.notedOn}` : '') +
                  (rate.source ? ` · ${rate.source}` : ''),
              }),
            ]),
          ),
        )
      : el('p', {
          class: 'muted',
          text:
            'No rate is readable. Every conversation above is therefore unpriced rather than free — ' +
            'the price table lives in the database (llm_model_price) and is changed with an UPDATE, ' +
            'never a deploy.',
        }),
    el('p', {
      class: 'muted small',
      text:
        'Seeded rates must be verified against the provider’s published pricing before any ' +
        'decision rests on them. A rate nobody checked is a cost figure nobody can trust.',
    }),
  ]);
}
