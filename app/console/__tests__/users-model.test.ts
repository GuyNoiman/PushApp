/**
 * The permission model.
 *
 * The database is the authority — `admin_set_staff_roles` and `admin_may_change`
 * refuse regardless of what this file says. These tests pin the SCREEN's copy of
 * the rules, because a control that is offered and then refused is a worse
 * answer than a control that is disabled with a reason.
 *
 * The founder's model, 2026-08-29: a super admin may change anyone; an admin may
 * change anyone except a super admin, and may never add or remove staff.
 */
import {
  STAFF_ROLES, CREATOR_STAGES, TIERS,
  capabilitiesFor, refusalReason, toggleRole, describeAccount, isSuperAdmin, tooShort, MIN_QUERY,
} from '../src/users-model.js';

const SUPER = ['super_admin', 'owner'];
const ADMIN = ['owner', 'support'];
const NOBODY: string[] = [];

describe('who may change whom', () => {
  it('lets a super admin change anyone, including another super admin', () => {
    expect(capabilitiesFor(SUPER, SUPER)).toEqual({ staffRoles: true, creator: true, tier: true });
    expect(capabilitiesFor(SUPER, ADMIN)).toEqual({ staffRoles: true, creator: true, tier: true });
    expect(capabilitiesFor(SUPER, NOBODY)).toEqual({ staffRoles: true, creator: true, tier: true });
  });

  it('never lets an admin add or remove staff — the founder is the only route in', () => {
    // The stronger half of the rule: an admin account that is compromised
    // cannot mint a second one.
    expect(capabilitiesFor(ADMIN, NOBODY).staffRoles).toBe(false);
    expect(capabilitiesFor(ADMIN, ADMIN).staffRoles).toBe(false);
  });

  it('lets an admin change an ordinary account’s creator access and tier', () => {
    expect(capabilitiesFor(ADMIN, NOBODY)).toMatchObject({ creator: true, tier: true });
  });

  it('stops an admin at a super admin’s account entirely', () => {
    expect(capabilitiesFor(ADMIN, SUPER)).toEqual({ staffRoles: false, creator: false, tier: false });
  });

  it('gives somebody with no staff role nothing at all', () => {
    expect(capabilitiesFor(NOBODY, NOBODY)).toEqual({ staffRoles: false, creator: false, tier: false });
    expect(capabilitiesFor(undefined as never, NOBODY).creator).toBe(false);
  });

  it('recognises a super admin only by the explicit role, never by owner', () => {
    // This is the whole reason `is_super_admin()` exists in SQL without the
    // owner shortcut: `owner` answers true for every OTHER role check.
    expect(isSuperAdmin(['owner'])).toBe(false);
    expect(isSuperAdmin(['super_admin'])).toBe(true);
    expect(isSuperAdmin([])).toBe(false);
  });
});

describe('refusal reasons', () => {
  it('says which rule stopped it rather than "not allowed"', () => {
    expect(refusalReason(ADMIN, NOBODY, 'staffRoles')).toContain('super admin');
    expect(refusalReason(ADMIN, SUPER, 'creator')).toContain('super admin');
    expect(refusalReason(NOBODY, NOBODY, 'tier')).toBe('This account is not yours to change.');
  });

  it('is null when the action is allowed, so a control is only disabled for a reason', () => {
    expect(refusalReason(SUPER, SUPER, 'staffRoles')).toBeNull();
    expect(refusalReason(ADMIN, NOBODY, 'tier')).toBeNull();
  });
});

describe('toggling a role', () => {
  it('keeps a stable order, so the audit log does not record a change that is not one', () => {
    expect(toggleRole(['support', 'owner'], 'product', true)).toEqual(['owner', 'product', 'support']);
    expect(toggleRole(['product', 'owner'], 'product', true)).toEqual(['owner', 'product']);
  });

  it('removes cleanly, including down to nothing', () => {
    expect(toggleRole(['support'], 'support', false)).toEqual([]);
    expect(toggleRole(undefined as never, 'support', true)).toEqual(['support']);
  });

  it('never invents a role that is not in the catalogue', () => {
    expect(toggleRole(['made_up'], 'support', true)).toEqual(['support']);
  });
});

describe('the search is a search', () => {
  it('refuses a query too short to be one', () => {
    expect(MIN_QUERY).toBe(2);
    expect(tooShort('')).toBe(true);
    expect(tooShort(' a ')).toBe(true);
    expect(tooShort('gu')).toBe(false);
  });
});

describe('the catalogues', () => {
  it('puts super admin at the top and explains every role', () => {
    expect(STAFF_ROLES[0].value).toBe('super_admin');
    for (const role of STAFF_ROLES) expect(role.note.length).toBeGreaterThan(10);
  });

  it('offers exactly the stages and tiers the database accepts', () => {
    expect(CREATOR_STAGES.map((s) => s.value)).toEqual(['', 'internal', 'invited', 'catalogue']);
    expect(TIERS.map((t) => t.value)).toEqual(['free', 'trial', 'subscriber']);
  });
});

describe('the summary line', () => {
  it('always says the tier, and only mentions what exists', () => {
    expect(describeAccount({ roles: [], tier: 'free' })).toBe('tier: free');
    expect(describeAccount({ roles: ['support'], creator_stage: 'internal', creator_status: 'active', tier: 'subscriber' }))
      .toBe('staff: support · creator: internal · tier: subscriber');
    expect(describeAccount({ roles: [], creator_stage: 'invited', creator_status: 'suspended', tier: 'free' }))
      .toContain('(suspended)');
  });
});
