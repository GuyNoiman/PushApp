/**
 * The report vocabulary of PRD §8, in one place — because the database, the app
 * and this page each learned it separately and they have already drifted once.
 *
 * §8.6 names seven statuses. Migration 0008 shipped five; 0010 adds the two that
 * were missing. The mapping below is the record of which word in the PRD is which
 * value in the column, and it exists so that the next person does not have to
 * guess whether `triage` means "In progress".
 */

export const STATUSES = Object.freeze([
  { value: 'open', label: 'New', terminal: false },
  { value: 'triage', label: 'In progress', terminal: false },
  { value: 'waiting', label: 'Waiting for user', terminal: false },
  { value: 'resolved', label: 'Resolved', terminal: true },
  { value: 'cannot_reproduce', label: 'Cannot reproduce', terminal: true },
  { value: 'duplicate', label: 'Duplicate', terminal: true },
  { value: 'closed', label: 'Closed', terminal: true },
]);

export const CATEGORIES = Object.freeze([
  { value: 'not_working', label: 'Something is not working' },
  { value: 'account', label: 'Account problem' },
  { value: 'payment', label: 'Payment problem' },
  { value: 'content', label: 'Incorrect or inappropriate content' },
  { value: 'other_user', label: 'Problem with another user' },
  { value: 'suggestion', label: 'Improvement suggestion' },
  { value: 'feedback', label: 'General feedback' },
  { value: 'other', label: 'Other' },
]);

export const SEVERITIES = Object.freeze([
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]);

const byValue = (list) => Object.fromEntries(list.map((x) => [x.value, x.label]));
const STATUS_LABELS = byValue(STATUSES);
const CATEGORY_LABELS = byValue(CATEGORIES);
const SEVERITY_LABELS = byValue(SEVERITIES);

export const statusLabel = (v) => STATUS_LABELS[v] ?? v ?? '—';
export const categoryLabel = (v) => CATEGORY_LABELS[v] ?? v ?? '—';
/** Null severity is "not yet triaged" and says so, rather than borrowing a level. */
export const severityLabel = (v) => (v ? (SEVERITY_LABELS[v] ?? v) : 'Not triaged');

export const isTerminal = (v) => STATUSES.some((s) => s.value === v && s.terminal);

/**
 * A safety report (§8.7) is held apart: reporter and subject references live in a
 * separately protected area and only Owner and Safety may reach it. Until that
 * area exists, the honest thing is to KNOW which reports are in that class rather
 * than to list them beside the rest as if they were ordinary.
 */
export const isSafety = (row) => row.category === 'other_user';

/**
 * Turn the filter form into a PostgREST query. Every filter is a column
 * comparison — there is no free-text search over descriptions, and there should
 * not be one: the search box that greps everybody's words is how a support queue
 * becomes a surveillance tool.
 */
export function buildReportQuery(filters = {}) {
  const params = [];
  if (filters.status) params.push(['status', `eq.${filters.status}`]);
  if (filters.category) params.push(['category', `eq.${filters.category}`]);
  if (filters.platform) params.push(['platform', `eq.${filters.platform}`]);
  if (filters.appVersion) params.push(['app_version', `eq.${filters.appVersion}`]);
  if (filters.severity) params.push(['severity', `eq.${filters.severity}`]);
  if (filters.sinceIso) params.push(['created_at', `gte.${filters.sinceIso}`]);
  if (filters.openOnly) params.push(['status', 'in.(open,triage,waiting)']);
  params.push(['order', 'created_at.desc']);
  params.push(['limit', String(filters.limit ?? 200)]);
  return params;
}

/** The counts above the list. Terminal statuses are collapsed; the queue is what is left. */
export function summarise(rows) {
  const out = { total: rows.length, open: 0, waiting: 0, terminal: 0, untriaged: 0, safety: 0 };
  for (const r of rows) {
    if (isTerminal(r.status)) out.terminal += 1;
    else if (r.status === 'waiting') out.waiting += 1;
    else out.open += 1;
    if (!r.severity && !isTerminal(r.status)) out.untriaged += 1;
    if (isSafety(r)) out.safety += 1;
  }
  return out;
}

/**
 * The prepared reply (§8.6): a mailto: the operator's own client opens. No
 * outbound mail provider is introduced by this feature, and the report REFERENCE
 * travels in the subject so a reply can be matched back without anybody quoting
 * the description into an email thread.
 */
export function replyMailto(row, { productName = 'PushApp' } = {}) {
  if (!row.contact_email) return null;
  const subject = `${productName} — your report ${shortRef(row.id)}`;
  const body = `Hello,\n\nAbout the report you sent us on ${new Date(row.created_at).toLocaleDateString()} (reference ${shortRef(row.id)}):\n\n`;
  return `mailto:${encodeURIComponent(row.contact_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Eight characters is enough to name a report to a person and not enough to guess one. */
export const shortRef = (id) => (id ? String(id).slice(0, 8) : '');
