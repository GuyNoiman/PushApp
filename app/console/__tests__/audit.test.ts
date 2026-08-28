/**
 * The audit row. What matters is what it does NOT carry: §10 keeps sensitive
 * content out of URLs, and a row kept for twelve months deserves the same rule.
 */
import { entry, subjects, ACTIONS, createAuditor } from '../src/audit.js';

describe('entry', () => {
  it('carries an identifier and never content', () => {
    const row = entry('user-1', ACTIONS.ATTACHMENT_OPEN, subjects.attachment('att-9'));
    expect(row).toEqual({ actor_id: 'user-1', action: 'report.attachment_open', subject: 'attachment:att-9' });
  });

  it('records a status change as a transition, so the log reads as history', () => {
    expect(subjects.status('r1', 'open', 'resolved')).toBe('report:r1 open→resolved');
    expect(subjects.status('r1', null, 'open')).toBe('report:r1 —→open');
  });

  it('normalises a missing subject to null rather than to the string "undefined"', () => {
    expect(entry('user-1', ACTIONS.SIGN_IN).subject).toBeNull();
    expect(entry('user-1', ACTIONS.SIGN_IN, null).subject).toBeNull();
  });
});

describe('createAuditor', () => {
  it('writes to admin_audit as the caller', async () => {
    const insert = jest.fn().mockResolvedValue({});
    const auditor = createAuditor({ insert } as never, () => 'user-1');
    await auditor.record(ACTIONS.REPORT_NOTE, subjects.report('r1'));
    expect(insert).toHaveBeenCalledWith('admin_audit', { actor_id: 'user-1', action: 'report.note', subject: 'report:r1' });
  });

  it('refuses rather than writing an unattributed row', async () => {
    const insert = jest.fn();
    const auditor = createAuditor({ insert } as never, () => null);
    await expect(auditor.record(ACTIONS.REPORT_NOTE, 'report:r1')).rejects.toThrow('Not signed in');
    expect(insert).not.toHaveBeenCalled();
  });

  it('propagates a failed write, so a caller that awaits it cannot proceed unlogged', async () => {
    const insert = jest.fn().mockRejectedValue(new Error('permission denied'));
    const auditor = createAuditor({ insert } as never, () => 'user-1');
    await expect(auditor.record(ACTIONS.ATTACHMENT_OPEN, 'attachment:a1')).rejects.toThrow('permission denied');
  });
});
