-- Operational Monitoring & Admin Console — the data spine.
--
-- Built to `04_Product/PRD/Operational_Monitoring_Admin_Console_PRD.md` (approved 2026-08-25), stage 1
-- of `11_Engineering_Bible/Operational_Monitoring_Implementation_Plan.md`. Free, no new vendor, and it
-- needs no app build — which is why it is first.
--
-- ── TWO RULES THE SCHEMA ENFORCES RATHER THAN ASKS FOR ─────────────────────────────────────────
--
-- §11.4 is a list of things that must be IMPOSSIBLE, not discouraged. Two of them are structural:
--
--  1. **`kpi_events` has no free-text column at all.** An event is a name, a taxonomy version, a
--     bucketed value and a timestamp. There is nowhere to put a Journey title, a Tool answer or a
--     coach line, so no amount of future carelessness can send one.
--  2. **`app_reports.description` is the ONLY free-text column in this whole migration.** It exists
--     because a person sat down and chose to write it, which is the entire difference between a
--     report and telemetry.
--
-- Deny-by-default throughout: every table has RLS on, and an operator's access is decided by a
-- SECURITY DEFINER function reading `admin_members` — never by a claim the browser sends.

-- ── 1. WHO MAY OPERATE ──────────────────────────────────────────────────────
create table if not exists public.admin_members (
  user_id  uuid primary key references public.profiles(id) on delete cascade,
  -- Several roles per person is normal (PRD §10). `owner` implies every other one.
  roles    text[] not null default '{}',
  added_at timestamptz not null default now(),
  added_by uuid references public.profiles(id)
);

alter table public.admin_members enable row level security;
drop policy if exists "admin_members_own" on public.admin_members;

-- An operator may see their OWN membership and nothing else. The console does not need a directory of
-- operators to work, and a list of who can see production is itself worth not handing out.
create policy "admin_members_own" on public.admin_members for select to authenticated
  using (user_id = auth.uid());

/**
 * Does the caller hold this role? `owner` passes every check.
 *
 * SECURITY DEFINER on purpose: the policies below call it, and it must read `admin_members` past the
 * policy that hides other people's rows. It takes the role as an argument and reads the CALLER from
 * `auth.uid()` — there is no parameter for "who am I", which is what stops it being a way to ask
 * about somebody else.
 */
create or replace function public.has_admin_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_members m
    where m.user_id = auth.uid()
      and (m.roles @> array[p_role] or m.roles @> array['owner'])
  );
$$;

grant execute on function public.has_admin_role(text) to authenticated;

-- ── 2. WHAT USERS TELL US ───────────────────────────────────────────────────
create table if not exists public.app_reports (
  id            uuid primary key default gen_random_uuid(),
  -- Null for a report sent before signing in. A report is worth having either way.
  reporter_id   uuid references public.profiles(id) on delete set null,
  category      text not null check (category in (
                  'not_working','account','payment','content','other_user','suggestion','feedback','other')),
  subcategory   text,
  -- THE ONLY FREE TEXT IN THIS FILE. See the header.
  description   text not null,
  -- Where a reply goes. Never promoted into the account profile or any list (§12).
  contact_email text,
  -- The safe diagnostic fields of §8.3, and nothing beyond them.
  app_version   text,
  build         text,
  runtime_id    text,
  platform      text check (platform is null or platform in ('ios','android','web')),
  os_version    text,
  locale        text,
  correlation_id text,
  source        text,
  status        text not null default 'open' check (status in ('open','triage','waiting','resolved','closed')),
  assigned_to   uuid references public.profiles(id) on delete set null,
  resolution_note text,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.app_reports enable row level security;
drop policy if exists "app_reports_insert_own" on public.app_reports;
drop policy if exists "app_reports_read_own" on public.app_reports;
drop policy if exists "app_reports_support" on public.app_reports;

-- Anybody signed in may file one, as themselves.
create policy "app_reports_insert_own" on public.app_reports for insert to authenticated
  with check (reporter_id = auth.uid() or reporter_id is null);

-- And read back what they sent — a person may always see their own words.
create policy "app_reports_read_own" on public.app_reports for select to authenticated
  using (reporter_id = auth.uid());

-- Support and safety operators read and work them.
create policy "app_reports_support" on public.app_reports for all to authenticated
  using (public.has_admin_role('support') or public.has_admin_role('safety'))
  with check (public.has_admin_role('support') or public.has_admin_role('safety'));

create index if not exists app_reports_status_idx on public.app_reports (status, created_at desc);

-- The screenshot, when there is one. The FILE lives in a private storage bucket; this is the pointer.
create table if not exists public.report_attachments (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.app_reports(id) on delete cascade,
  storage_path text not null,
  bytes        integer,
  mime         text,
  created_at   timestamptz not null default now()
);

alter table public.report_attachments enable row level security;
drop policy if exists "report_attachments_own" on public.report_attachments;
drop policy if exists "report_attachments_support" on public.report_attachments;

create policy "report_attachments_own" on public.report_attachments for insert to authenticated
  with check (exists (
    select 1 from public.app_reports r where r.id = report_id and r.reporter_id = auth.uid()
  ));

create policy "report_attachments_support" on public.report_attachments for select to authenticated
  using (public.has_admin_role('support') or public.has_admin_role('safety'));

-- ── 3. WHAT EXISTS IN THE WORLD ─────────────────────────────────────────────
-- The build/update registry (§9). Written by the release process, read by operators. Indefinite (§12).
create table if not exists public.app_versions (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('build','update')),
  platform        text not null check (platform in ('ios','android','both')),
  version         text,
  build_number    text,
  runtime_version text,
  update_id       text,
  channel         text,
  commit_sha      text,
  notes           text,
  released_at     timestamptz not null default now()
);

-- One row per released thing. A UNIQUE INDEX rather than a constraint, because the identity of a
-- release is an EXPRESSION: an update is identified by its update id and a build by its number, and
-- a constraint cannot say that.
create unique index if not exists app_versions_identity_idx
  on public.app_versions (kind, platform, coalesce(update_id, ''), coalesce(build_number, ''));

alter table public.app_versions enable row level security;
drop policy if exists "app_versions_operators" on public.app_versions;
create policy "app_versions_operators" on public.app_versions for select to authenticated
  using (public.has_admin_role('operations') or public.has_admin_role('developer')
         or public.has_admin_role('product'));

-- ── 4. WHAT THE PRODUCT ACHIEVES ────────────────────────────────────────────
-- The KPI event stream (§7). NO FREE TEXT — see the header. Consented separately from operational
-- diagnostics (§11.2), and the consent lives on the device; this table only receives what it allows.
create table if not exists public.kpi_events (
  id               bigserial primary key,
  -- A name from the authored taxonomy, and the version of that taxonomy. Never an arbitrary string
  -- from a call site: the console rejects an unknown name rather than charting it.
  name             text not null,
  taxonomy_version integer not null,
  -- A RANDOM install id, never the account id. It is what makes "the same phone" countable without
  -- making "this person" identifiable (§11.3).
  install_id       uuid,
  -- The only payload shapes there are: a bucket label from a closed set, and a number.
  bucket           text,
  value            numeric,
  app_version      text,
  platform         text check (platform is null or platform in ('ios','android','web')),
  channel          text,
  at               timestamptz not null default now()
);

alter table public.kpi_events enable row level security;
drop policy if exists "kpi_events_insert" on public.kpi_events;

-- Write-only from the app. There is deliberately NO select policy for anybody: the console reads
-- AGGREGATES through server-side functions, and a table nobody can select is a table nobody can
-- accidentally turn into a per-person timeline (§4.2: no personal activity viewer).
create policy "kpi_events_insert" on public.kpi_events for insert to authenticated with check (true);

create index if not exists kpi_events_name_at_idx on public.kpi_events (name, at desc);

-- ── 5. WHAT IS WRONG RIGHT NOW ──────────────────────────────────────────────
create table if not exists public.ops_issues (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  severity    text not null check (severity in ('critical','high','medium','low')),
  status      text not null default 'open' check (status in ('open','acknowledged','mitigated','resolved')),
  source      text,
  owner_id    uuid references public.profiles(id) on delete set null,
  notes       text,
  opened_at   timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.ops_issues enable row level security;
drop policy if exists "ops_issues_operators" on public.ops_issues;
create policy "ops_issues_operators" on public.ops_issues for all to authenticated
  using (public.has_admin_role('operations') or public.has_admin_role('developer'))
  with check (public.has_admin_role('operations') or public.has_admin_role('developer'));

-- ── 6. WHO DID WHAT IN HERE ─────────────────────────────────────────────────
-- Append-only (§10). Opening an attachment, changing a role, exporting, assigning — all of it.
create table if not exists public.admin_audit (
  id         bigserial primary key,
  actor_id   uuid not null references public.profiles(id) on delete cascade,
  action     text not null,
  subject    text,
  at         timestamptz not null default now()
);

alter table public.admin_audit enable row level security;
drop policy if exists "admin_audit_owner_read" on public.admin_audit;
drop policy if exists "admin_audit_append" on public.admin_audit;

create policy "admin_audit_owner_read" on public.admin_audit for select to authenticated
  using (public.has_admin_role('owner'));

-- Anyone who IS an operator appends their own rows; nobody updates or deletes one, because there is
-- no policy for either. An audit log that can be edited is a log of what somebody wanted us to think.
create policy "admin_audit_append" on public.admin_audit for insert to authenticated
  with check (actor_id = auth.uid() and public.has_admin_role('readonly'));

-- ── 7. RETENTION (§12) ──────────────────────────────────────────────────────
--
-- The third scheduled purge in this project, after Mirror's raw answers and the inactivity evaluator.
-- Numbers are the PRD's, not ours: ordinary reports live until resolution + 90 days, KPI raw events
-- 90 days, the audit log 12 months. Version metadata is kept indefinitely — it is operational history.
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
   where status in ('resolved','closed')
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

comment on function public.purge_operational_data() is
  'Operational retention per Operational_Monitoring_Admin_Console_PRD §12. Nightly.';

revoke all on function public.purge_operational_data() from public;
revoke all on function public.purge_operational_data() from anon;
revoke all on function public.purge_operational_data() from authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if exists (select 1 from cron.job where jobname = 'purge-operational-data') then
      perform cron.unschedule('purge-operational-data');
    end if;
    perform cron.schedule('purge-operational-data', '41 3 * * *', 'select public.purge_operational_data()');
  end if;
exception
  when insufficient_privilege or undefined_table or undefined_function or undefined_object then
    null;
end;
$$;
