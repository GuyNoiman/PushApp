-- Account Inactivity Freeze, the half the PRD actually specified.
--
-- WHAT WAS WRONG WITH THE SHIPPED VERSION. The freeze was decided on the DEVICE, on the device's own
-- clock, on the next time the app happened to be opened. Three consequences, and the PRD names all
-- three (§2, §3, §10): a phone whose date is wrong decides somebody was away for a month; two phones
-- can disagree about whether the account is frozen; and "21 days have passed" is only ever noticed
-- when the person comes back, which is the one moment it should already have been true.
--
-- So the account's clock moves here, where `now()` is not somebody's device setting.
--
-- WHAT THIS TABLE IS NOT: it is not the Journeys. Freezing a Journey stays on the device, through the
-- same J3 path with `freezeReason='account_inactivity'` — the server records the ACCOUNT's lifecycle
-- and the device applies it. That boundary is deliberate: a server that edited Journeys would need to
-- understand plans, Steps and reminders, and this feature does not need it to.

create table if not exists public.account_activity (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  -- The last AUTHENTICATED foreground use, on server time. A push delivery, a background refresh or
  -- an Ally's action must never touch it (PRD §2) — only the person themselves being here.
  last_active_at timestamptz not null default now(),
  frozen_at      timestamptz,
  freeze_reason  text check (freeze_reason is null or freeze_reason in ('inactivity_21_days')),
  updated_at     timestamptz not null default now()
);

alter table public.account_activity enable row level security;
drop policy if exists "account_activity_own_read" on public.account_activity;

-- READ your own row, and nothing else. There is deliberately NO client write policy: `last_active_at`
-- is written through the function below so it is always the SERVER's clock, and `frozen_at` is not a
-- field a client may set — an account that could freeze itself could also unfreeze itself, and then
-- the lifecycle state is just another local flag with a network round trip in front of it.
create policy "account_activity_own_read" on public.account_activity for select to authenticated
  using (user_id = auth.uid());

-- ── The heartbeat ───────────────────────────────────────────────────────────
--
-- Called by the app when an authenticated session is actually in the foreground. It records the
-- server's time, never a time the client supplies — the client is trusted to say "I am here", which
-- it can only do about itself, and not to say when.
--
-- RETURNING is not unfreezing. The account's `frozen_at` is cleared, because they are plainly back;
-- their Journeys stay frozen until they choose to resume them (PRD §7 — a return never auto-resumes).
create or replace function public.touch_account_activity()
returns table (last_active_at timestamptz, frozen_at timestamptz, freeze_reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  was_frozen_at timestamptz;
  was_reason text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select a.frozen_at, a.freeze_reason into was_frozen_at, was_reason
  from public.account_activity a where a.user_id = uid;

  insert into public.account_activity as a (user_id, last_active_at, updated_at)
  values (uid, now(), now())
  on conflict (user_id) do update
    set last_active_at = now(),
        frozen_at = null,
        freeze_reason = null,
        updated_at = now();

  -- The verdict the caller needs is the one that was true when they arrived, not the cleared one:
  -- the device has to know it must apply a freeze it slept through.
  return query select now()::timestamptz, was_frozen_at, was_reason;
end;
$$;

comment on function public.touch_account_activity() is
  'Records authenticated foreground activity on SERVER time and returns the freeze verdict that was standing on arrival.';

grant execute on function public.touch_account_activity() to authenticated;

-- ── The scheduled evaluator ─────────────────────────────────────────────────
--
-- Idempotent by construction: it only ever touches rows where `frozen_at is null`, so running it
-- twice, or twice a day, cannot refreeze an account or re-emit anything (PRD §10).
create or replace function public.evaluate_account_inactivity()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  frozen integer;
begin
  update public.account_activity
  set frozen_at = now(), freeze_reason = 'inactivity_21_days', updated_at = now()
  where frozen_at is null
    and last_active_at < now() - interval '21 days';
  get diagnostics frozen = row_count;
  return frozen;
end;
$$;

comment on function public.evaluate_account_inactivity() is
  'Freezes accounts inactive for 21 days (PRD threshold). Idempotent: only rows with frozen_at is null.';

revoke all on function public.evaluate_account_inactivity() from public;
revoke all on function public.evaluate_account_inactivity() from anon;
revoke all on function public.evaluate_account_inactivity() from authenticated;

-- The threshold lives in TWO places on purpose and they must agree: `config/inactivityPolicy.ts` for
-- the offline fallback, and the interval above for the authoritative evaluation. The app's
-- `__tests__/inactivityParity.test.ts` fails if they drift.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if exists (select 1 from cron.job where jobname = 'evaluate-account-inactivity') then
      perform cron.unschedule('evaluate-account-inactivity');
    end if;
    perform cron.schedule(
      'evaluate-account-inactivity',
      '23 3 * * *',
      'select public.evaluate_account_inactivity()'
    );
  end if;
exception
  when insufficient_privilege or undefined_table or undefined_function or undefined_object then
    -- No scheduler on this project. The heartbeat still returns a standing verdict, and the app's
    -- own local sweep is the fallback it always was.
    null;
end;
$$;
