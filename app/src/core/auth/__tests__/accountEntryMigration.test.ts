/**
 * Migration 0020 (account entry) — the properties that must hold before anyone applies it.
 *
 * A static read of the SQL, because the file is applied to the live project by hand after review and
 * there is no database in CI. What is pinned is what would be expensive to get wrong there:
 *  · a trigger on `auth.users` that raises FAILS SIGN-UP for everybody, and one that fires for
 *    anonymous sessions fills a table every signed-in session can read;
 *  · the file must survive being run twice, and a hand-made profile trigger already in place;
 *  · `create or replace` cannot change a return type and overloads on a different argument list
 *    (Current_Context "Traps"), so the RPC is dropped by exact signature first;
 *  · the RPC answers only to `authenticated`, and the helpers answer to nobody.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sql = readFileSync(
  join(__dirname, '../../../../supabase/migrations/0020_account_entry.sql'),
  'utf8',
);

/** The SQL without `--` comments, so prose in the header can never satisfy an assertion. */
const code = sql
  .split('\n')
  .map((line) => line.replace(/--.*$/, ''))
  .join('\n')
  .replace(/\s+/g, ' ')
  .toLowerCase();

function bodyOf(fn: string): string {
  const start = code.indexOf(`create or replace function public.${fn}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const open = code.indexOf('as $$', start);
  const close = code.indexOf('$$;', open + 5);
  return code.slice(open, close);
}

describe('the profile trigger', () => {
  it('fires after insert on auth.users', () => {
    expect(code).toContain(
      'create trigger zz_profile_for_new_account after insert on auth.users for each row execute function public.profile_for_new_account();',
    );
  });

  it('returns before creating anything for an anonymous account', () => {
    const body = bodyOf('profile_for_new_account');
    const guard = body.indexOf('if coalesce(new.is_anonymous, false) then return new; end if;');
    const create = body.indexOf('perform public.create_generated_profile(new.id)');
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(create).toBeGreaterThan(guard);
  });

  it('never fails the sign-up: any error becomes a warning', () => {
    const body = bodyOf('profile_for_new_account');
    expect(body).toContain('exception when others then raise warning');
  });

  it('keeps an existing profile row, and retries only a handle collision', () => {
    const body = bodyOf('create_generated_profile');
    expect(body).toContain('on conflict (id) do nothing');
    expect(body).toContain('exception when unique_violation');
    expect(body).toContain("'user-' || substr(md5(gen_random_uuid()::text), 1, 10)");
  });

  it('backfills only real accounts that have no row', () => {
    const backfill = code.slice(code.indexOf('do $$'), code.indexOf('end; $$;', code.indexOf('do $$')));
    expect(backfill).toContain('left join public.profiles p on p.id = u.id');
    expect(backfill).toContain('where p.id is null and not coalesce(u.is_anonymous, false)');
  });
});

describe('idempotence', () => {
  it('drops the trigger before creating it', () => {
    const drop = code.indexOf('drop trigger if exists zz_profile_for_new_account on auth.users;');
    expect(drop).toBeGreaterThanOrEqual(0);
    expect(code.indexOf('create trigger zz_profile_for_new_account')).toBeGreaterThan(drop);
  });

  it('drops every function by its exact signature before creating it, and never uses a bare create', () => {
    expect(code).not.toMatch(/create function/);
    const created = [...code.matchAll(/create or replace function (public\.\w+)\(([^)]*)\)/g)];
    expect(created.map((m) => m[1]).sort()).toEqual([
      'public.account_entry_status',
      'public.create_generated_profile',
      'public.profile_for_new_account',
    ]);
    for (const [whole, name, args] of created) {
      // Argument TYPES only: `p_user_id uuid` is dropped as `(uuid)`.
      const types = args
        .split(',')
        .map((arg) => arg.trim().split(' ').pop())
        .filter(Boolean)
        .join(', ');
      const drop = code.indexOf(`drop function if exists ${name}(${types});`);
      expect(drop).toBeGreaterThanOrEqual(0);
      expect(drop).toBeLessThan(code.indexOf(whole));
    }
  });
});

describe('account_entry_status()', () => {
  it('answers about the caller only, and nothing without a session', () => {
    const body = bodyOf('account_entry_status');
    expect(body).toContain('caller uuid := auth.uid()');
    expect(body).toContain('if caller is null then return; end if;');
    expect(body).toContain('where u.id = caller');
    expect(body).toContain('where s.user_id = caller');
  });

  it('returns the three facts, reading onboardingCompletedAt from the backup', () => {
    expect(code).toContain(
      'returns table ( created_now boolean, has_backup boolean, onboarding_complete boolean )',
    );
    const body = bodyOf('account_entry_status');
    expect(body).toContain("interval '60 seconds'");
    expect(body).toContain("->> 'onboardingcompletedat'");
  });

  it('is security definer with a pinned search_path', () => {
    const start = code.indexOf('create or replace function public.account_entry_status(');
    const header = code.slice(start, code.indexOf('as $$', start));
    expect(header).toContain('security definer');
    expect(header).toContain('set search_path = public');
  });

  it('is granted to authenticated and to nobody else', () => {
    expect(code).toContain('revoke all on function public.account_entry_status() from public, anon;');
    expect(code).toContain('grant execute on function public.account_entry_status() to authenticated;');
    const grants = [...code.matchAll(/grant [^;]+;/g)].map((m) => m[0]);
    expect(grants).toEqual(['grant execute on function public.account_entry_status() to authenticated;']);
  });

  it('leaves the helpers callable by no client role', () => {
    expect(code).toContain(
      'revoke all on function public.create_generated_profile(uuid) from public, anon, authenticated;',
    );
    expect(code).toContain(
      'revoke all on function public.profile_for_new_account() from public, anon, authenticated;',
    );
  });
});
