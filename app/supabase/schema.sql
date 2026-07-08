-- ============================================================================
-- PushApp — POC social / Allies backend: schema + Row-Level Security (RLS)
-- ----------------------------------------------------------------------------
-- Run ONCE in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run (uses "if not exists" / "or replace"; policies dropped first).
--
-- Reviewed by security-privacy (2026-07-09). Fixes applied: F1 visibility now
-- enforced server-side (title masked unless 'full'); F2 snapshots kept OFF
-- realtime; F3 server-stamped updated_at; F4 ally-update re-checks friendship;
-- F5 friend accept is one-way; F8 helper EXECUTE limited to authenticated.
--
-- Guarantees (Engineering Bible §8/§12, Social_Backend_Proposal.md §5):
--   • Only a progress SUMMARY leaves the device; reflections/"why" NEVER sync.
--   • RLS ON for every table; the DB — not the client — enforces who sees what.
-- ============================================================================

-- ── 1. PROFILES ────────────────────────────────────────────────────────────
-- One row per authenticated user. Cosmetic + discovery only.
-- NOTE (security-privacy F7): buddy_summary is free jsonb — app code must keep it
-- cosmetic only ({name, stage, level}); never write real names / PII into it.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text unique not null,
  buddy_summary jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles_read_all"    on public.profiles;
drop policy if exists "profiles_insert_own"   on public.profiles;
drop policy if exists "profiles_update_own"   on public.profiles;
create policy "profiles_read_all"   on public.profiles for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── 2. FRIENDSHIPS ─────────────────────────────────────────────────────────
create table if not exists public.friendships (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
alter table public.friendships enable row level security;

drop policy if exists "friendships_read_own"   on public.friendships;
drop policy if exists "friendships_request"     on public.friendships;
drop policy if exists "friendships_respond"     on public.friendships;
drop policy if exists "friendships_delete_own"  on public.friendships;
create policy "friendships_read_own" on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friendships_request"  on public.friendships for insert to authenticated
  with check (requester_id = auth.uid());
-- F5: accept is one-way (pending → accepted), addressee only.
create policy "friendships_respond"  on public.friendships for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');
create policy "friendships_delete_own" on public.friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create or replace function public.are_friends(u1 uuid, u2 uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = u1 and f.addressee_id = u2)
        or (f.requester_id = u2 and f.addressee_id = u1))
  );
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon;   -- F8
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- ── 3. JOURNEY ALLIES ──────────────────────────────────────────────────────
create table if not exists public.journey_allies (
  journey_id text not null,
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  ally_id    uuid not null references public.profiles(id) on delete cascade,
  visibility text not null default 'progress' check (visibility in ('full','progress','anonymous')),
  created_at timestamptz not null default now(),
  primary key (journey_id, owner_id, ally_id),
  check (owner_id <> ally_id)
);
alter table public.journey_allies enable row level security;

drop policy if exists "allies_read"         on public.journey_allies;
drop policy if exists "allies_owner_insert"  on public.journey_allies;
drop policy if exists "allies_owner_update"  on public.journey_allies;
drop policy if exists "allies_owner_delete"  on public.journey_allies;
create policy "allies_read" on public.journey_allies for select to authenticated
  using (owner_id = auth.uid() or ally_id = auth.uid());
create policy "allies_owner_insert" on public.journey_allies for insert to authenticated
  with check (owner_id = auth.uid() and public.are_friends(owner_id, ally_id));
-- F4: update must ALSO re-check friendship (insert-parity), so ally_id can't be
-- re-pointed at a non-friend.
create policy "allies_owner_update" on public.journey_allies for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and public.are_friends(owner_id, ally_id));
create policy "allies_owner_delete" on public.journey_allies for delete to authenticated
  using (owner_id = auth.uid());

create or replace function public.is_ally(p_journey text, p_owner uuid, p_viewer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.journey_allies ja
    where ja.journey_id = p_journey and ja.owner_id = p_owner and ja.ally_id = p_viewer
  );
$$;
revoke all on function public.is_ally(text, uuid, uuid) from public, anon;   -- F8
grant execute on function public.is_ally(text, uuid, uuid) to authenticated;

-- ── 4. PROGRESS SNAPSHOTS ──────────────────────────────────────────────────
-- The minimal shared summary. NO reflections, NO "why", NO step detail.
create table if not exists public.progress_snapshots (
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  journey_id text not null,
  title      text,
  progress   numeric not null default 0 check (progress between 0 and 1),
  streak     int not null default 0 check (streak >= 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, journey_id)
);
alter table public.progress_snapshots enable row level security;

-- Owner manages their own snapshots. (F1/F2) Allies do NOT read the base table
-- directly and it is NOT on realtime — they read the masked function below, so
-- 'progress'/'anonymous' can never leak `title`.
drop policy if exists "snapshots_owner_all" on public.progress_snapshots;
drop policy if exists "snapshots_ally_read"  on public.progress_snapshots;   -- F1: removed
create policy "snapshots_owner_all" on public.progress_snapshots for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- F3: server-stamp updated_at so the "last active" signal can't be forged client-side.
create or replace function public.stamp_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_snapshots_stamp on public.progress_snapshots;
create trigger trg_snapshots_stamp before insert or update
  on public.progress_snapshots for each row execute function public.stamp_updated_at();

-- F1: the ONLY way an Ally reads snapshots. SECURITY DEFINER + own WHERE enforces
-- access; title is masked unless visibility = 'full'.
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
  where ja.ally_id = auth.uid();
$$;
revoke all on function public.ally_snapshots() from public, anon;   -- F8
grant execute on function public.ally_snapshots() to authenticated;

-- ── 5. CHEERS ──────────────────────────────────────────────────────────────
create table if not exists public.cheers (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null references public.profiles(id) on delete cascade,
  to_id      uuid not null references public.profiles(id) on delete cascade,
  journey_id text not null,
  kind       text not null default 'cheer' check (kind in ('cheer','nudge')),
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
alter table public.cheers enable row level security;

drop policy if exists "cheers_read"      on public.cheers;
drop policy if exists "cheers_send_ally"  on public.cheers;
create policy "cheers_read" on public.cheers for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
-- may cheer only someone whose Journey you are an Ally on (no spoofing from_id).
create policy "cheers_send_ally" on public.cheers for insert to authenticated
  with check (from_id = auth.uid() and public.is_ally(journey_id, to_id, auth.uid()));

-- ── 6. REALTIME ────────────────────────────────────────────────────────────
-- Cheers only. (F2) progress_snapshots is intentionally NOT published — realtime
-- respects only base-table RLS and would bypass the title-masking function.
-- Ally progress is fetched via ally_snapshots() on open / refresh.
alter publication supabase_realtime add table public.cheers;

-- ── 7. INDEXES ─────────────────────────────────────────────────────────────
create index if not exists idx_cheers_to       on public.cheers (to_id, created_at desc);
create index if not exists idx_allies_ally      on public.journey_allies (ally_id);
create index if not exists idx_snapshots_owner   on public.progress_snapshots (owner_id);
create index if not exists idx_friendships_addr  on public.friendships (addressee_id);

-- Done. RLS ON everywhere; the publishable key reaches only what these policies
-- allow; visibility is enforced by the DB. Nothing here can incur a Free-tier charge.
-- Deferred to Commercial (security-privacy F6/F7): cheer rate-limiting, handle
-- enumeration limits — noted, POC-acceptable at this scale.
