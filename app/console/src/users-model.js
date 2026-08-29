/**
 * The permission model, as data — pure, so the rules a screen enforces and the
 * rules the database enforces can be compared side by side.
 *
 * The database is the authority. Everything here exists so the console does not
 * OFFER an action it knows will be refused: a disabled control with a reason is
 * a better answer than an error after the fact. Nothing here is a security
 * boundary, and a caller that ignored all of it would still be stopped by
 * `admin_set_staff_roles` / `admin_may_change`.
 */

/** Staff roles, PRD §10. `super_admin` is this migration's addition and sits above them all. */
export const STAFF_ROLES = Object.freeze([
  { value: 'super_admin', label: 'Super admin', note: 'May change anyone, including another super admin. Only a super admin may grant this.' },
  { value: 'owner', label: 'Owner', note: 'Passes every role check except super admin.' },
  { value: 'operations', label: 'Operations', note: 'System health, issues, versions.' },
  { value: 'developer', label: 'Developer', note: 'Technical diagnostics without report email or attachments.' },
  { value: 'product', label: 'Product', note: 'Aggregate KPIs and their definitions.' },
  { value: 'support', label: 'Support', note: 'User reports and the reply address.' },
  { value: 'safety', label: 'Safety', note: 'Reports about another user.' },
  { value: 'readonly', label: 'Read-only', note: 'Reads the sections assigned, changes nothing.' },
]);

export const CREATOR_STAGES = Object.freeze([
  { value: '', label: 'Not a creator' },
  { value: 'internal', label: 'Internal team' },
  { value: 'invited', label: 'Invited professional' },
  { value: 'catalogue', label: 'Catalogue creator' },
]);

export const TIERS = Object.freeze([
  { value: 'free', label: 'Free' },
  { value: 'trial', label: 'Trial' },
  { value: 'subscriber', label: 'Subscriber' },
]);

export const isSuperAdmin = (roles) => Array.isArray(roles) && roles.includes('super_admin');

/**
 * What the signed-in operator may do to this account.
 *
 * The founder's model, 2026-08-29: a super admin may change anyone; an admin may
 * change anyone EXCEPT a super admin, and may never add or remove staff. The
 * second half is the stronger property — an admin account that is compromised
 * cannot mint a second one.
 */
export function capabilitiesFor(viewerRoles, targetRoles) {
  const viewerIsSuper = isSuperAdmin(viewerRoles);
  const targetIsSuper = isSuperAdmin(targetRoles);
  const isStaff = Array.isArray(viewerRoles) && viewerRoles.length > 0;
  return {
    /** Staff roles are the super admin's alone. */
    staffRoles: viewerIsSuper,
    /** Creator access and paid tier: any admin, unless the target is a super admin. */
    creator: viewerIsSuper || (isStaff && !targetIsSuper),
    tier: viewerIsSuper || (isStaff && !targetIsSuper),
  };
}

/** Why a control is disabled, in words a person can act on. */
export function refusalReason(viewerRoles, targetRoles, action) {
  const can = capabilitiesFor(viewerRoles, targetRoles);
  if (can[action]) return null;
  if (action === 'staffRoles') return 'Only a super admin may add or remove a team member.';
  if (isSuperAdmin(targetRoles)) return 'A super admin’s account can only be changed by a super admin.';
  return 'This account is not yours to change.';
}

/**
 * The roles a search result should be SAVED with after a checkbox changes.
 *
 * Kept pure and ordered by {@link STAFF_ROLES} so the stored array does not
 * depend on the order somebody happened to click, which would make the audit
 * log's before/after read as a change when nothing changed.
 */
export function toggleRole(roles, role, on) {
  const set = new Set(roles ?? []);
  if (on) set.add(role);
  else set.delete(role);
  return STAFF_ROLES.filter((r) => set.has(r.value)).map((r) => r.value);
}

/** A one-line summary of an account for the result row. */
export function describeAccount(row) {
  const parts = [];
  if (row.roles?.length) parts.push(`staff: ${row.roles.join(', ')}`);
  if (row.creator_stage) parts.push(`creator: ${row.creator_stage}${row.creator_status === 'suspended' ? ' (suspended)' : ''}`);
  parts.push(`tier: ${row.tier ?? 'free'}`);
  return parts.join(' · ');
}

/** The shortest query the server will answer, repeated here only to explain it. */
export const MIN_QUERY = 2;
export const tooShort = (q) => (q ?? '').trim().length < MIN_QUERY;
