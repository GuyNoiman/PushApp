-- ============================================================================
-- Migration 0001 — Journey Support Circle (D2)
-- ----------------------------------------------------------------------------
-- FOUNDER ACTION REQUIRED: apply this ONCE to the live Supabase project
--   Supabase → SQL Editor → New query → paste → Run.
-- It is idempotent (if-not-exists / or-replace; policies dropped first), so it is
-- safe to re-run. The canonical full schema lives in app/supabase/schema.sql — a
-- fresh project can run that instead; this file is the incremental delta for an
-- ALREADY-DEPLOYED project.
--
-- What it does (all reviewed by security-privacy for D2):
--   1. Consent/acceptance gate on journey_allies (status + decision timestamps).
--   2. Recipient RLS "allies_respond" policy (requested → accepted/declined).
--   3. Gate EVERY Ally read on status='accepted' AND are_friends():
--      ally_snapshots(), is_ally(), and the new Companion RPC.
--   4. Removed-friend fix: cascade-delete journey_allies on unfriend (both ways).
--   5. Companion Step-progress table + definer RPC (coach-Journeys' system data only).
--
-- ⚠ MIGRATION DEFAULT (least access): every EXISTING journey_allies row is set to
-- status='requested' — i.e. sharing is REVOKED until the recipient re-accepts. This
-- is the safe default demanded by the consent gate (no Journey data visible before
-- acceptance). At POC scale (seeded second account) this is intended; re-invite from
-- the app to restore. Change the backfill below to 'accepted' ONLY if you consciously
-- want to grandfather existing shares.
-- ============================================================================

-- ── 1. Consent gate columns ─────────────────────────────────────────────────
alter table public.journey_allies
  add column if not exists status text not null default 'requested'
    check (status in ('requested','accepted','declined','cancelled','closed'));
alter table public.journey_allies
  add column if not exists requested_at timestamptz not null default now();
alter table public.journey_allies
  add column if not exists decided_at timestamptz;
alter table public.journey_allies
  add column if not exists closed_at timestamptz;

-- Backfill existing rows to the safe default (see MIGRATION DEFAULT note above).
update public.journey_allies set status = 'requested' where status is null;

-- ── 2. Server-stamp decision/close timestamps ───────────────────────────────
create or replace function public.stamp_ally_decision()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('accepted','declined') then new.decided_at = now();
    elsif new.status in ('cancelled','closed') then new.closed_at = now();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_allies_decision on public.journey_allies;
create trigger trg_allies_decision before update on public.journey_allies
  for each row execute function public.stamp_ally_decision();

-- ── 2b. Column-level UPDATE guard (security-privacy #1/#2) ───────────────────
-- RLS WITH CHECK can pin allowed columns but cannot reference OLD to FORBID rewriting the rest, so
-- close both holes here even against a raw PostgREST/JWT call:
--   • RECIPIENT may move ONLY `status` requested → accepted/declined; owner_id/journey_id/ally_id/
--     visibility are forced back to OLD (no Encourager→Companion self-escalation, no forged accept
--     on another owner's Journey).
--   • OWNER may set `status` ONLY to requested/cancelled/closed — never accepted/declined (no
--     self-accept, no reviving a decline, no resurrecting a closed row).
-- A null auth.uid() (service role / this migration's backfill) bypasses.
create or replace function public.enforce_ally_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;

  if auth.uid() = old.ally_id then
    new.owner_id   := old.owner_id;
    new.journey_id := old.journey_id;
    new.ally_id    := old.ally_id;
    new.visibility := old.visibility;
    if not (old.status = 'requested' and new.status in ('accepted','declined')) then
      raise exception 'ally recipient may only accept or decline a requested invite';
    end if;
    return new;
  end if;

  if auth.uid() = old.owner_id then
    if new.status is distinct from old.status
       and new.status not in ('requested','cancelled','closed') then
      raise exception 'ally owner may not set status to %', new.status;
    end if;
    return new;
  end if;

  raise exception 'not authorized to update this ally row';
end $$;
drop trigger if exists trg_allies_enforce on public.journey_allies;
create trigger trg_allies_enforce before update on public.journey_allies
  for each row execute function public.enforce_ally_update();

-- ── 3. Recipient responds (requested → accepted/declined), their own row only ─
drop policy if exists "allies_respond" on public.journey_allies;
create policy "allies_respond" on public.journey_allies for update to authenticated
  using (ally_id = auth.uid() and status = 'requested')
  with check (ally_id = auth.uid() and status in ('accepted','declined'));

-- ── 4. Gate every Ally read on consent + friendship ─────────────────────────
create or replace function public.is_ally(p_journey text, p_owner uuid, p_viewer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.journey_allies ja
    where ja.journey_id = p_journey and ja.owner_id = p_owner and ja.ally_id = p_viewer
      and ja.status = 'accepted'
      and public.are_friends(ja.owner_id, ja.ally_id)
  );
$$;
revoke all on function public.is_ally(text, uuid, uuid) from public, anon;
grant execute on function public.is_ally(text, uuid, uuid) to authenticated;

create or replace function public.ally_snapshots()
returns table (owner_id uuid, journey_id text, title text, progress numeric,
               streak int, updated_at timestamptz, visibility text)
language sql stable security definer set search_path = public as $$
  select s.owner_id, s.journey_id,
         case when ja.visibility = 'full' then s.title else null end as title,
         s.progress, s.streak, s.updated_at, ja.visibility
  from public.progress_snapshots s
  join public.journey_allies ja
    on ja.journey_id = s.journey_id and ja.owner_id = s.owner_id
  where ja.ally_id = auth.uid()
    and ja.status = 'accepted'
    and public.are_friends(ja.owner_id, ja.ally_id);
$$;
revoke all on function public.ally_snapshots() from public, anon;
grant execute on function public.ally_snapshots() to authenticated;

-- ── 5. Removed-friend fix: cascade-delete Ally rows on unfriend (both ways) ──
create or replace function public.cascade_unfriend()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.journey_allies ja
   where (ja.owner_id = old.requester_id and ja.ally_id = old.addressee_id)
      or (ja.owner_id = old.addressee_id and ja.ally_id = old.requester_id);
  return old;
end $$;
drop trigger if exists trg_friendships_unfriend on public.friendships;
create trigger trg_friendships_unfriend after delete on public.friendships
  for each row execute function public.cascade_unfriend();

-- ── 6. Companion Step-progress (coach-Journeys' system data only) ────────────
create table if not exists public.companion_steps (
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  journey_id  text not null,
  step_id     text not null,
  title       text not null,
  status      text not null
              check (status in ('unreported','completed','partially_completed','not_completed')),
  reported_at timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (owner_id, journey_id, step_id)
);
alter table public.companion_steps enable row level security;

drop policy if exists "companion_owner_all" on public.companion_steps;
create policy "companion_owner_all" on public.companion_steps for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Reuse the shared updated_at stamper (defined in schema.sql §4; declared here too so
-- this migration is self-contained on an older project).
create or replace function public.stamp_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_companion_stamp on public.companion_steps;
create trigger trg_companion_stamp before insert or update
  on public.companion_steps for each row execute function public.stamp_updated_at();

create or replace function public.ally_journey_steps(p_owner uuid, p_journey text)
returns table (step_id text, title text, status text, reported_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select cs.step_id, cs.title, cs.status, cs.reported_at, cs.updated_at
  from public.companion_steps cs
  join public.journey_allies ja
    on ja.journey_id = cs.journey_id and ja.owner_id = cs.owner_id
  where cs.owner_id = p_owner
    and cs.journey_id = p_journey
    and ja.ally_id = auth.uid()
    and ja.status = 'accepted'
    and ja.visibility = 'full'
    and public.are_friends(ja.owner_id, ja.ally_id);
$$;
revoke all on function public.ally_journey_steps(uuid, text) from public, anon;
grant execute on function public.ally_journey_steps(uuid, text) to authenticated;

-- companion_steps is intentionally NOT added to supabase_realtime (matches
-- progress_snapshots / F2): realtime respects only base-table RLS and would bypass
-- the definer RPC's consent+friendship gate. Allies fetch via ally_journey_steps().

-- ── 7. Indexes ──────────────────────────────────────────────────────────────
create index if not exists idx_allies_incoming on public.journey_allies (ally_id, status);
create index if not exists idx_companion_owner_journey on public.companion_steps (owner_id, journey_id);

-- Done. RLS ON everywhere; every Ally read requires an accepted invite + a live
-- friendship; unfriend cascades; Companion carries only system-generated Step data.
