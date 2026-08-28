/**
 * The report vocabulary, and the two properties that are actually load-bearing:
 * a terminal status is one retention can sweep, and a filter is a column
 * comparison rather than a search over what people wrote.
 */
import {
  STATUSES,
  statusLabel,
  severityLabel,
  isTerminal,
  isSafety,
  buildReportQuery,
  summarise,
  replyMailto,
  shortRef,
} from '../src/reports-model.js';

describe('statuses', () => {
  it('covers all seven of PRD §8.6', () => {
    expect(STATUSES.map((s) => s.label)).toEqual([
      'New',
      'In progress',
      'Waiting for user',
      'Resolved',
      'Cannot reproduce',
      'Duplicate',
      'Closed',
    ]);
  });

  it('marks exactly the statuses retention sweeps as terminal', () => {
    // Migration 0010's purge deletes on this set. A status that is terminal to a
    // human and not to this list is a report kept forever.
    expect(STATUSES.filter((s) => s.terminal).map((s) => s.value)).toEqual([
      'resolved',
      'cannot_reproduce',
      'duplicate',
      'closed',
    ]);
    expect(isTerminal('waiting')).toBe(false);
  });

  it('says "not triaged" rather than borrowing a severity', () => {
    expect(severityLabel(null)).toBe('Not triaged');
    expect(severityLabel(undefined)).toBe('Not triaged');
    expect(severityLabel('high')).toBe('High');
  });

  it('falls back to the raw value rather than hiding an unknown one', () => {
    expect(statusLabel('something_new')).toBe('something_new');
  });
});

describe('buildReportQuery', () => {
  it('never sends the description anywhere near a filter', () => {
    const params = buildReportQuery({ status: 'open', platform: 'ios', appVersion: '1.0.0' });
    const keys = params.map(([k]) => k);
    expect(keys).not.toContain('description');
    expect(new URLSearchParams(params).toString()).not.toMatch(/description/);
  });

  it('orders newest first and caps the page', () => {
    const params = Object.fromEntries(buildReportQuery({}));
    expect(params.order).toBe('created_at.desc');
    expect(params.limit).toBe('200');
  });

  it('turns the queue filter into the three non-terminal statuses', () => {
    const params = buildReportQuery({ openOnly: true });
    expect(params).toContainEqual(['status', 'in.(open,triage,waiting)']);
  });
});

describe('summarise', () => {
  const rows = [
    { status: 'open', severity: null, category: 'not_working' },
    { status: 'triage', severity: 'high', category: 'account' },
    { status: 'waiting', severity: 'low', category: 'other' },
    { status: 'resolved', severity: 'low', category: 'feedback' },
    { status: 'duplicate', severity: null, category: 'other_user' },
  ];

  it('counts the queue, not the archive', () => {
    expect(summarise(rows)).toEqual({ total: 5, open: 2, waiting: 1, terminal: 2, untriaged: 1, safety: 1 });
  });

  it('does not count a closed report as untriaged just because nobody set a severity', () => {
    expect(summarise([{ status: 'closed', severity: null, category: 'other' }]).untriaged).toBe(0);
  });
});

describe('safety reports', () => {
  it('recognises the category that §8.7 holds apart', () => {
    expect(isSafety({ category: 'other_user' })).toBe(true);
    expect(isSafety({ category: 'not_working' })).toBe(false);
  });
});

describe('replyMailto', () => {
  const row = { id: '9f2c1d4e-0000-0000-0000-000000000000', contact_email: 'someone@example.com', created_at: '2026-08-20T10:00:00Z' };

  it('is null when nobody left an address', () => {
    expect(replyMailto({ ...row, contact_email: null })).toBeNull();
  });

  it('carries the reference and not the description', () => {
    const href = replyMailto({ ...row, description: 'my private words' })!;
    expect(href).toContain(encodeURIComponent('9f2c1d4e'));
    expect(href).not.toContain('private');
  });

  it('shortens the id to eight characters — enough to name one, not enough to guess one', () => {
    expect(shortRef(row.id)).toBe('9f2c1d4e');
    expect(shortRef(null)).toBe('');
  });
});
