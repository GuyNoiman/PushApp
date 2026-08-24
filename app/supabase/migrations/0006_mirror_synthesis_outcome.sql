-- Mirror Feedback, part two: what a confidential round GIVES BACK, and when the raw words go.
--
-- 0005 built the collection side and the promise underneath it. This adds the two things the
-- producing side needs, and neither of them widens what a requester can reach.
--
-- ── 1. A QUESTION THAT PRODUCED NOTHING IS STILL AN ANSWER ──────────────────────────────────────
--
-- Three of the round's five questions can be publishable while two are not: the model may return
-- nothing usable, the answers may not repeat enough to say anything safely, or the local leak check
-- may catch a source word surviving into the summary. Every one of those is a legitimate result the
-- screen has words for — and every one of them has to be RECORDED, or the next time the screen is
-- opened the whole round is produced again, and the founder pays for the same synthesis twice.
--
-- So a row is written for every question either way: `body` carries the published text, and
-- `rejection` says why there is none. A row with a rejection is the receipt that the work was done.
alter table public.mirror_synthesis add column if not exists rejection text;

alter table public.mirror_synthesis drop constraint if exists mirror_synthesis_rejection_check;
alter table public.mirror_synthesis add constraint mirror_synthesis_rejection_check
  check (rejection is null or rejection in ('leaked','noPattern','empty'));

comment on column public.mirror_synthesis.rejection is
  'Null when body is a published synthesis. Otherwise why nothing was published: leaked | noPattern | empty.';

-- ── 2. THE RAW ANSWERS HAVE A LAST DAY ──────────────────────────────────────────────────────────
--
-- D68: a contributor's words survive seven days past the round's closure and no longer. Until now
-- nothing in the system could enforce that — the rule existed in `core/tools/mirror/round.ts` as a
-- constant that no process ever read, which is a promise with nobody keeping it.
--
-- The one exception is the founder's (2026-08-21): nobody reads a contributor's answer UNLESS the
-- person who received the synthesis reports it, and then we must be able to look back. A report
-- therefore FREEZES the clock. That table does not exist yet, so the freeze is written here as the
-- `mirror_reports` lookup it will be, guarded so this function is correct before and after it lands.
create or replace function public.mirror_purge_expired_responses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted integer;
  has_reports boolean;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'mirror_reports'
  ) into has_reports;

  with expired as (
    select r.id
    from public.mirror_rounds r
    where r.status = 'closed'
      and r.closed_at is not null
      and r.closed_at < now() - interval '7 days'
      -- A round with an unresolved report keeps its evidence, segregated, until the report closes.
      and (
        not has_reports
        or not exists (
          select 1 from public.mirror_reports mr
          where mr.round_id = r.id and mr.resolved_at is null
        )
      )
  )
  delete from public.mirror_responses resp
  using expired
  where resp.round_id = expired.id;

  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

comment on function public.mirror_purge_expired_responses() is
  'Deletes raw Mirror answers seven days after their round closed (D68). Reported rounds are held.';

-- Nobody calls this from a client. It runs on a schedule, and the Edge Function calls it
-- opportunistically so the rule still advances if the schedule is ever missing.
revoke all on function public.mirror_purge_expired_responses() from public;
revoke all on function public.mirror_purge_expired_responses() from anon;
revoke all on function public.mirror_purge_expired_responses() from authenticated;

-- ── 3. THE SCHEDULE, IF THIS PROJECT HAS ONE ────────────────────────────────────────────────────
--
-- pg_cron is available on Supabase but is not enabled by default, and a migration that FAILS on a
-- project without it would block everything above — which is the part that matters. So it is tried
-- and its absence is survivable: the Edge Function's opportunistic sweep is the fallback, and the
-- gap is written down rather than assumed away.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if exists (select 1 from cron.job where jobname = 'mirror-purge-expired-responses') then
      perform cron.unschedule('mirror-purge-expired-responses');
    end if;
    perform cron.schedule(
      'mirror-purge-expired-responses',
      '17 3 * * *',
      'select public.mirror_purge_expired_responses()'
    );
  end if;
exception
  when insufficient_privilege or undefined_table or undefined_function or undefined_object then
    -- No scheduler here. The sweep in the Edge Function still runs, and DEPLOY.md says so.
    null;
end;
$$;
