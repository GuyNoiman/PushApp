-- ============================================================================
-- Migration 0010 — what the admin console needs that 0008 did not leave room for
-- ----------------------------------------------------------------------------
-- APPLIED to the live project on 2026-08-28 (`npx supabase db push`, from `app/`).
-- Idempotent (if-not-exists / policies and constraints dropped first), so it is
-- safe to re-run. The canonical full schema lives in
-- app/supabase/schema.sql; this file is the incremental delta.
--
-- Stage 3 of `11_Engineering_Bible/Operational_Monitoring_Implementation_Plan.md`
-- is the console itself. Building it against 0008 surfaced four things: one is a
-- bug that silently defeats an explicit PRD requirement, and three are columns
-- §8.6 asks the list to show which no table has.
--
-- ── 1. THE BUG: the audit log cannot be written by the people it is about ──
--
-- 0008's append policy reads:
--
--     with check (actor_id = auth.uid() and public.has_admin_role('readonly'))
--
-- The comment above it says "anyone who IS an operator appends their own rows",
-- and that is the intent — but `has_admin_role('readonly')` asks whether the
-- caller holds the ROLE NAMED 'readonly', not whether they hold any role at all.
-- A support operator whose roles are `{support}` fails it. An owner passes only
-- because `has_admin_role` treats `owner` as universal.
--
-- §10 requires an audit entry for opening an attachment. The console refuses to
-- open one when the audit write fails, because an unlogged open is exactly the
-- thing the requirement exists to prevent — so for every non-owner operator, the
-- bug does not merely lose a log line, it removes the capability. Hence a
-- separate `is_admin_member()`: "do you hold any role" is a different question
-- from "do you hold this role", and it deserves its own function rather than a
-- role named `readonly` doing double duty.
--
-- ── 2. OPERATOR NOTES GO IN THEIR OWN TABLE, NOT A COLUMN ─────────────────
--
-- §8.6 lets an operator add internal notes. The obvious move is a column on
-- `app_reports` — and it would be a leak: 0008's `app_reports_read_own` grants
-- the REPORTER select on their whole row, so an internal note in a column on
-- that row is readable by the person it is written about. Postgres RLS is
-- row-level; it has no opinion about columns. A separate table with its own
-- policy is the only version of this that is actually private.
--
-- ── 3. SEVERITY AND THE TWO MISSING TERMINAL STATUSES ─────────────────────
--
-- §8.6 lists seven statuses; 0008's check constraint has five. `Duplicate` and
-- `Cannot reproduce` are missing, and they are not decoration: they are how a
-- queue stops growing. Both are terminal, so retention has to sweep them the way
-- it sweeps `resolved` and `closed` — a report parked in a status the purge does
-- not recognise is kept forever, which §12 forbids.
-- ============================================================================

-- ── 1. "Are you an operator at all?" ────────────────────────────────────────
--
-- SECURITY DEFINER for the same reason `has_admin_role` is: it must read
-- `admin_members` past the policy that hides other people's rows. It takes NO
-- argument, so like its neighbour there is no way to ask it about somebody else.
create or replace function public.is_admin_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_members m where m.user_id = auth.uid());
$$;

grant execute on function public.is_admin_member() to authenticated;

comment on function public.is_admin_member() is
  'Does the caller hold ANY operator role? Distinct from has_admin_role(text), which asks about one.';

drop policy if exists "admin_audit_append" on public.admin_audit;
create policy "admin_audit_append" on public.admin_audit for insert to authenticated
  with check (actor_id = auth.uid() and public.is_admin_member());

-- ── 2. Operator notes on a report (§8.6), invisible to the reporter ────────
create table if not exists public.report_notes (
  id        uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.app_reports(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  -- Operator-authored, and the only thing that may ever be written here. It is
  -- not a place to copy the user's words into, and not a place for anything the
  -- telemetry contract (§11.4) keeps off the wire in the first place.
  note      text not null,
  created_at timestamptz not null default now()
);

create index if not exists report_notes_report_idx on public.report_notes (report_id, created_at desc);

alter table public.report_notes enable row level security;
drop policy if exists "report_notes_operators" on public.report_notes;

-- Read and write for the two roles that work a report. Deliberately NOT the
-- reporter: see the header.
create policy "report_notes_operators" on public.report_notes for all to authenticated
  using (public.has_admin_role('support') or public.has_admin_role('safety'))
  with check ((public.has_admin_role('support') or public.has_admin_role('safety'))
              and author_id = auth.uid());

comment on table public.report_notes is
  'Operator working notes on a report (PRD §8.6). Separate table because RLS is row-level: a column '
  'on app_reports would be readable by the reporter through app_reports_read_own.';

-- ── 3. Severity, and the two terminal statuses that were missing ───────────
alter table public.app_reports add column if not exists severity text;

do $$
begin
  alter table public.app_reports drop constraint if exists app_reports_severity_check;
  alter table public.app_reports add constraint app_reports_severity_check
    check (severity is null or severity in ('critical','high','medium','low'));
exception when duplicate_object then null;
end;
$$;

-- Severity is an OPERATOR's judgement, not the reporter's claim: nothing in the
-- app writes it, and the column is nullable because "not yet triaged" is a real
-- and common state that should not be disguised as `medium`.
comment on column public.app_reports.severity is
  'Operator-assigned severity (PRD §8.6). Null means not yet triaged.';

do $$
begin
  alter table public.app_reports drop constraint if exists app_reports_status_check;
  alter table public.app_reports add constraint app_reports_status_check
    check (status in ('open','triage','waiting','resolved','closed','duplicate','cannot_reproduce'));
end;
$$;

-- Linking a report to what it is about (§8.6). Both nullable, both on delete set
-- null: losing the issue must not lose the report.
alter table public.app_reports add column if not exists linked_issue_id uuid
  references public.ops_issues(id) on delete set null;
alter table public.app_reports add column if not exists linked_version_id uuid
  references public.app_versions(id) on delete set null;

-- ── 4. Retention has to know about the new terminal statuses (§12) ─────────
--
-- Same function as 0008, with `duplicate` and `cannot_reproduce` added to the
-- terminal set. Everything else is unchanged and is repeated rather than patched,
-- because a `create or replace` of half a function is not a thing.
create or replace function public.purge_operational_data()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
  n integer;
begin
  delete from public.app_reports
   where status in ('resolved','closed','duplicate','cannot_reproduce')
     and resolved_at is not null
     and resolved_at < now() - interval '90 days'
     -- A safety report is held for twelve months (§12), so it is not swept with the ordinary ones.
     and category <> 'other_user';
  get diagnostics n = row_count; removed := removed + n;

  delete from public.app_reports
   where category = 'other_user'
     and created_at < now() - interval '12 months';
  get diagnostics n = row_count; removed := removed + n;

  delete from public.kpi_events where at < now() - interval '90 days';
  get diagnostics n = row_count; removed := removed + n;

  delete from public.admin_audit where at < now() - interval '12 months';
  get diagnostics n = row_count; removed := removed + n;

  return removed;
end;
$$;

revoke all on function public.purge_operational_data() from public;
revoke all on function public.purge_operational_data() from anon;
revoke all on function public.purge_operational_data() from authenticated;

-- ── 5. KPI freshness without a select policy on kpi_events ────────────────
--
-- 0008 gives `kpi_events` no select policy for anybody, on purpose: a table
-- nobody can select is a table nobody can turn into a per-person timeline. The
-- console still has to answer "is the KPI stream alive", and §3.4 says an
-- unmeasurable signal is GRAY, not green — so it needs a real answer or none.
-- One timestamp is the smallest thing that answers it, and a timestamp is not a
-- timeline.
create or replace function public.kpi_last_event_at()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.has_admin_role('operations')
      or public.has_admin_role('developer')
      or public.has_admin_role('product')
    then (select max(at) from public.kpi_events)
    else null
  end;
$$;

grant execute on function public.kpi_last_event_at() to authenticated;

comment on function public.kpi_last_event_at() is
  'The single timestamp the console needs for KPI freshness. Deliberately not a row reader.';

-- ── 6. BOOTSTRAP, and why it is not in this file ──────────────────────────
--
-- There are no rows in `admin_members` and this migration does not add one. A
-- migration that inserts the first owner would mean a file in the repository
-- decides who can read production, and the id would be a permanent, greppable
-- claim about a person. The founder runs this once, in the SQL editor, with his
-- own account's id:
--
--     insert into public.admin_members (user_id, roles)
--     values ('<the auth user id>', array['owner'])
--     on conflict (user_id) do update set roles = excluded.roles;
--
-- Until that row exists the console signs in and correctly says the account
-- holds no operator role, which is the right behaviour and not a bug.

-- ── 7. Coach cost, without a row reader (§6.5 "Coach/AI gateway") ─────────
--
-- `llm_usage` has RLS on and no policy for anybody: it is written and read by the
-- Edge Function's service-role client alone, and 0002 explains why — a client
-- that could write its own usage row could zero it and uncap itself. That
-- reasoning is about ROWS. The console needs the shape of the bill, not the bill
-- per person, so it gets four numbers and no way to ask about anyone.
--
-- Note what is NOT here: a per-day series. `llm_usage` keeps a cumulative total
-- and a last-seen timestamp, so "requests in the last 24 hours" is not derivable
-- from it, and this function does not pretend otherwise by dividing something.
-- The card says what the data supports and the rest stays gray.
create or replace function public.coach_usage_summary()
returns table (total_bytes bigint, total_requests bigint, users_total bigint, users_active_24h bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- plpgsql rather than sql for one reason: an aggregate query with no GROUP BY
  -- returns a row even when its WHERE matched nothing, so a role check in the
  -- WHERE would hand a non-operator four zeros and let them read that as "the
  -- coach is idle". Returning NO ROWS is the difference between "nothing" and
  -- "you may not ask", and the console renders them differently.
  if not (public.has_admin_role('operations') or public.has_admin_role('developer')) then
    return;
  end if;
  return query
    select
      coalesce(sum(u.bytes), 0)::bigint,
      coalesce(sum(u.requests), 0)::bigint,
      count(*)::bigint,
      count(*) filter (where u.last_at > now() - interval '24 hours')::bigint
    from public.llm_usage u;
end;
$$;

grant execute on function public.coach_usage_summary() to authenticated;

comment on function public.coach_usage_summary() is
  'Aggregate coach usage for the console (PRD §6.5). Four numbers, no rows, no per-person answer.';
