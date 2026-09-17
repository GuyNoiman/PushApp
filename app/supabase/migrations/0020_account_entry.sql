-- ============================================================================
-- 0020 — every real account gets a profile row, and the app can ask whether an
--        account it just signed into is new or existing
-- ----------------------------------------------------------------------------
-- Idempotent: safe to run twice, and safe on a project where a hand-made
-- profile trigger already exists. Plan:
-- `04_Product/Dev_Accounts_And_Restore_Plan_2026-09-17.md`, Stage 0.
--
-- ── WHY (found 2026-09-17, while planning test accounts) ───────────────────
--
-- 1. BACKUPS NEED A PROFILE ROW NOTHING CREATES. `account_state.user_id`
--    references `public.profiles` (0004), and `profiles.handle` is NOT NULL.
--    The first run used to end on a profile page that created the row; that page
--    left the first run on 2026-09-03 and nothing took over its job. So unless a
--    trigger was made by hand in the dashboard, every backup write for a new
--    account fails the foreign key, and the app swallows the failure — which is
--    correct for the app and means nobody ever saw it.
--
-- 2. APPLE AND GOOGLE DO NOT SAY WHETHER AN ACCOUNT IS NEW. `signInWithIdToken`
--    creates the account when it does not exist and signs in when it does. The
--    account-choice screen (Stage 2) needs to know which happened, and whether
--    there is anything to restore. `account_entry_status()` answers that about
--    the caller and nobody else.
--
-- ── WHAT IS DELIBERATELY NOT HERE ──────────────────────────────────────────
--
-- · No profile row for ANONYMOUS sessions. The app opens one on every launch of
--   a fresh install; a row each would fill `profiles` (which every signed-in
--   session can read) with handles nobody chose, for accounts that stop being
--   reachable at the next reinstall. The app no longer backs up anonymous
--   accounts either, so they have nothing that needs the row. An anonymous user
--   who sets a handle in the Circle still creates their own row as before.
-- · No email, no name, no provider in the generated handle. `user-` and ten
--   random hex characters, because `handle` is readable by every signed-in
--   session and must say nothing about who is behind it.
--
-- ── BEFORE APPLYING (the live-project checks in the plan) ─────────────────
--
--   select tgname, p.proname from pg_trigger t join pg_proc p on p.oid = t.tgfoid
--    where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
--   select count(*) from auth.users u left join public.profiles p on p.id = u.id
--    where p.id is null and not coalesce(u.is_anonymous, false);
--   select count(*) from public.account_state;
--
-- Trigger order: Postgres fires same-event triggers in NAME order. The trigger
-- below is named `zz_…` so that any hand-made profile trigger fires FIRST and
-- this one then finds the row and does nothing (`on conflict (id) do nothing`),
-- rather than this one inserting first and a hand-made plain `insert` failing
-- the sign-up on a duplicate key.
-- ============================================================================

-- ── 1. Create one profile row with a generated handle ──────────────────────
-- Shared by the trigger and the backfill so there is one definition of what a
-- generated profile is. NOT callable by any client role: it writes a row for
-- an id it is given.
drop function if exists public.create_generated_profile(uuid);

create or replace function public.create_generated_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt int := 0;
begin
  loop
    attempt := attempt + 1;
    begin
      insert into public.profiles (id, handle)
      values (p_user_id, 'user-' || substr(md5(gen_random_uuid()::text), 1, 10))
      -- A row that already exists (a hand-made trigger, or a person who set a
      -- handle first) is kept exactly as it is.
      on conflict (id) do nothing;
      return;
    exception when unique_violation then
      -- Only the HANDLE can collide here (the id conflict is absorbed above):
      -- 16^10 possibilities, so a retry is close to theoretical. Bounded anyway.
      if attempt >= 5 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

revoke all on function public.create_generated_profile(uuid) from public, anon, authenticated;

-- ── 2. The trigger: real accounts only ─────────────────────────────────────
drop trigger if exists zz_profile_for_new_account on auth.users;
drop function if exists public.profile_for_new_account();

create or replace function public.profile_for_new_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;
  begin
    perform public.create_generated_profile(new.id);
  exception when others then
    -- A trigger on auth.users that raises FAILS THE SIGN-UP, and a person who
    -- cannot sign in is a far worse outcome than a missing profile row, which
    -- the backfill below repairs when re-run. So it warns and lets the account
    -- be created.
    raise warning 'profile_for_new_account: no profile row for % (%)', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.profile_for_new_account() from public, anon, authenticated;

create trigger zz_profile_for_new_account
  after insert on auth.users
  for each row execute function public.profile_for_new_account();

-- ── 3. Backfill: real accounts that exist today without a row ──────────────
do $$
declare
  missing record;
begin
  for missing in
    select u.id
      from auth.users u
      left join public.profiles p on p.id = u.id
     where p.id is null
       and not coalesce(u.is_anonymous, false)
  loop
    perform public.create_generated_profile(missing.id);
  end loop;
end;
$$;

-- ── 4. account_entry_status(): new or existing, about the caller only ──────
-- Dropped by exact signature first: `create or replace` cannot change a return
-- type, and with a different argument list it would add an overload beside the
-- old function instead of replacing it.
drop function if exists public.account_entry_status();

create or replace function public.account_entry_status()
returns table (
  created_now boolean,
  has_backup boolean,
  onboarding_complete boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  created timestamptz;
  backup text;
  completed boolean := false;
begin
  if caller is null then
    return;
  end if;

  select u.created_at into created from auth.users u where u.id = caller;
  select s.state into backup from public.account_state s where s.user_id = caller;

  if backup is not null then
    begin
      -- `onboardingCompletedAt` is the AppState field (core/types/domain.ts): epoch ms once the
      -- first run finished, absent before. JSON null reads as not complete.
      completed := (backup::jsonb ->> 'onboardingCompletedAt') is not null;
    exception when others then
      -- A backup that is not JSON cannot say the first run finished. It is still a backup.
      completed := false;
    end;
  end if;

  return query select
    coalesce(created > now() - interval '60 seconds', false),
    backup is not null,
    completed;
end;
$$;

revoke all on function public.account_entry_status() from public, anon;
grant execute on function public.account_entry_status() to authenticated;
