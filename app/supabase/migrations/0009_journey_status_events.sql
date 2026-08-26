-- ============================================================================
-- Migration 0009 — an Ally learns about a pause (R6, decision D79)
-- ----------------------------------------------------------------------------
-- APPLIED to the live project on 2026-08-27 (`npx supabase db push`, from `app/`).
-- Idempotent (if-not-exists / policies dropped first), so it is safe to re-run.
-- The canonical full schema lives in app/supabase/schema.sql; this file is the
-- incremental delta for an already-deployed project.
--
-- ── THE PROBLEM ────────────────────────────────────────────────────────────
-- What leaves a device for an Ally is a whitelist of exactly four fields, and it
-- has no status in it. So a paused Journey silently DISAPPEARS from an Ally's
-- view and reappears on resume — the opposite of what supporting somebody means.
--
-- ── WHY AN EVENT AND NOT A FIELD (D79, founder 2026-08-25) ─────────────────
-- Adding a status to the whitelist would make "paused" a permanent property of a
-- shared object, readable by an Ally at any time, for as long as it lasts — and
-- every widening of that whitelist is a privacy decision that has to be made
-- again. An EVENT is narrower: it says one thing once, at the moment the person
-- chose it, to people already allowed to know the Journey exists. Nothing an Ally
-- can see AT REST changes.
--
-- ── WHAT MAY RIDE THIS ROW ─────────────────────────────────────────────────
-- Ids, a kind and a timestamp. There is no reason column, no note column and no
-- free-text column of any shape — not "reserved for later", not nullable. A
-- column that does not exist cannot be filled by a later commit that forgot why.
-- ============================================================================

create table if not exists public.journey_status_events (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  journey_id text not null,
  -- Deliberately only two. A pause and a resume are the two moments an Ally's
  -- view would otherwise change without explanation; nothing else belongs here.
  kind       text not null check (kind in ('paused','resumed')),
  created_at timestamptz not null default now()
);
alter table public.journey_status_events enable row level security;

drop policy if exists "journey_status_owner_insert" on public.journey_status_events;
drop policy if exists "journey_status_read"          on public.journey_status_events;
drop policy if exists "journey_status_owner_delete"  on public.journey_status_events;

-- Only the owner may say their own Journey paused, and only about themselves.
create policy "journey_status_owner_insert" on public.journey_status_events
  for insert to authenticated
  with check (owner_id = auth.uid());

-- The owner, and an ACCEPTED Ally of that exact Journey who is still a friend.
-- `is_ally` already carries both gates, so this policy cannot drift from the one
-- that governs every other Ally read.
create policy "journey_status_read" on public.journey_status_events
  for select to authenticated
  using (owner_id = auth.uid() or public.is_ally(journey_id, owner_id, auth.uid()));

-- The owner may delete their own events. There is deliberately NO update policy:
-- an event is a record of a moment, not a value; correcting it would mean the
-- moment is negotiable after the fact.
create policy "journey_status_owner_delete" on public.journey_status_events
  for delete to authenticated
  using (owner_id = auth.uid());

create index if not exists idx_journey_status_owner_journey
  on public.journey_status_events (owner_id, journey_id, created_at desc);
create index if not exists idx_journey_status_created
  on public.journey_status_events (created_at desc);

-- ── RETENTION ──────────────────────────────────────────────────────────────
-- An event is only interesting while it is news. Anything older than 30 days is
-- deleted, which also keeps the table from growing without bound on an account
-- that pauses often. Run from the SQL editor, or schedule it with pg_cron if the
-- project has that extension; the client also reads a bounded window, so a
-- missed sweep degrades to storage rather than to a wrong feed.
create or replace function public.prune_journey_status_events()
returns void language sql security definer set search_path = public as $$
  delete from public.journey_status_events where created_at < now() - interval '30 days';
$$;
revoke all on function public.prune_journey_status_events() from public, anon, authenticated;
