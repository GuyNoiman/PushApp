/**
 * The audit log (§10) — every login, role change, attachment open, export,
 * assignment, status change, note and policy change.
 *
 * Two rules live here rather than in the callers:
 *
 * 1. **The subject is an identifier, never content.** §10 also says no sensitive
 *    content in browser URLs, and the same reasoning applies with more force to a
 *    row that is kept for twelve months. `report:9f2c…` says which report was
 *    opened; it does not say what it said.
 * 2. **A failed audit write fails the action.** The caller is expected to await
 *    `record()` BEFORE doing the sensitive thing. An attachment opened without a
 *    log line is precisely what the requirement forbids, and "we tried to log it"
 *    is not the requirement.
 */

export const ACTIONS = Object.freeze({
  SIGN_IN: 'console.sign_in',
  SIGN_OUT: 'console.sign_out',
  REPORT_STATUS: 'report.status_change',
  REPORT_SEVERITY: 'report.severity_change',
  REPORT_ASSIGN: 'report.assign',
  REPORT_NOTE: 'report.note',
  ATTACHMENT_OPEN: 'report.attachment_open',
  REPLY_PREPARED: 'report.reply_prepared',
  AUDIT_VIEW: 'audit.view',
});

/** Pure: what the row will contain, so a test can assert what it does NOT contain. */
export function entry(actorId, action, subject) {
  return {
    actor_id: actorId,
    action,
    subject: subject === undefined || subject === null ? null : String(subject),
  };
}

export const subjects = Object.freeze({
  report: (id) => `report:${id}`,
  attachment: (id) => `attachment:${id}`,
  status: (id, from, to) => `report:${id} ${from ?? '—'}→${to}`,
});

export function createAuditor(api, getActorId) {
  return {
    async record(action, subject) {
      const actorId = getActorId();
      if (!actorId) throw new Error('Not signed in');
      await api.insert('admin_audit', entry(actorId, action, subject));
    },
  };
}
