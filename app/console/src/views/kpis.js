/**
 * Tab 2 — KPIs (PRD §7).
 *
 * The tab exists and is empty on purpose. Its data needs a consent that has not
 * been asked for (§11.2), and that consent is a separate state from the
 * operational-diagnostics disclosure — declining it must not weaken crash
 * monitoring or reduce anything the person can do. Shipping a KPI chart before
 * that consent exists would be the exact swap the PRD forbids.
 */
import { el, clear } from '../dom.js';

export function renderKpis(root) {
  clear(root);
  root.append(
    el('section', { class: 'card' }, [
      el('h1', { text: 'KPIs' }),
      el('p', {
        text:
          'Nothing here yet, and not because the charts are unwritten. `kpi_events` exists and accepts ' +
          'events; the app does not send any, because sending them needs a consent nobody has been asked ' +
          'for.',
      }),
      el('h2', { text: 'What has to happen first' }),
      el('ul', {}, [
        el('li', { text: 'The event taxonomy is authored and versioned — a closed set of names, buckets and numbers, with no free text anywhere (§7.2).' }),
        el('li', { text: 'A separate product-analytics consent, reusing the versioned-consent module Coach Context Summaries already has rather than inventing a second one.' }),
        el('li', { text: 'Aggregate-only read functions. `kpi_events` has no select policy for anybody on purpose: a table nobody can select cannot become a per-person timeline.' }),
      ]),
      el('h2', { text: 'What will never be here' }),
      el('p', {
        class: 'muted',
        text:
          'Time in app as an objective, a per-person activity viewer, or anything that rewards keeping ' +
          'somebody on their phone (§7.5). The product exists to close the gap between intention and ' +
          'action; a metric that goes up when somebody stays longer measures the opposite.',
      }),
    ]),
  );
}
