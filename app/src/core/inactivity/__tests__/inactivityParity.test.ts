/**
 * The threshold exists in two places, and they have to agree.
 *
 * `config/inactivityPolicy.ts` is the OFFLINE fallback — what the device measures when there is no
 * session or no network. `migrations/0007_account_activity.sql` is the authoritative evaluation, on
 * server time, on a schedule. Two numbers for one rule is a drift waiting to happen, and it would
 * drift silently: the account would freeze on one clock at 21 days and on the other at 30, and which
 * one somebody met would depend on whether they were online.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { INACTIVITY_POLICY } from '../../config/inactivityPolicy';

const MIGRATION = join(__dirname, '../../../../supabase/migrations/0007_account_activity.sql');
const sql = readFileSync(MIGRATION, 'utf8');

describe('inactivity threshold parity', () => {
  it('the scheduled evaluator uses the same number of days as the local fallback', () => {
    const days = INACTIVITY_POLICY.thresholdMs / (24 * 60 * 60 * 1000);
    expect(Number.isInteger(days)).toBe(true);
    expect(sql).toContain(`interval '${days} days'`);
  });

  it('the evaluator only ever touches accounts that are not already frozen', () => {
    // The idempotence the PRD asks for (§10) is this one clause. Without it, a second run of the job
    // would move `frozen_at` forward every night and the return flow would keep re-arming.
    expect(sql).toContain('where frozen_at is null');
  });

  it('no client can write the lifecycle state', () => {
    // Read-only for the owner, and no insert/update policy at all: an account that could freeze
    // itself could unfreeze itself, and then none of this is authoritative.
    expect(sql).toContain('for select to authenticated');
    expect(sql).not.toMatch(/for (insert|update|all) to authenticated/);
  });
});
