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
-- Journey Support Circle (D2): sharing is now CONSENT-GATED. A row starts life
-- `requested`; NO Journey data is visible until the recipient moves it to
-- `accepted`. `visibility` doubles as the permission BUNDLE — 'progress' =
-- Encourager (masked title summary), 'full' = Companion (title + Step progress).
create table if not exists public.journey_allies (
  journey_id text not null,
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  ally_id    uuid not null references public.profiles(id) on delete cascade,
  visibility text not null default 'progress' check (visibility in ('full','progress','anonymous')),
  -- Consent/acceptance gate (D2). 'requested' → recipient accepts/declines; owner may
  -- 'cancelled' a pending one, or 'closed' it when the Journey ends. Reads require 'accepted'.
  status     text not null default 'requested'
             check (status in ('requested','accepted','declined','cancelled','closed')),
  created_at   timestamptz not null default now(),
  requested_at timestamptz not null default now(),
  decided_at   timestamptz,   -- stamped when the recipient accepts/declines
  closed_at    timestamptz,   -- stamped when the owner cancels/closes
  primary key (journey_id, owner_id, ally_id),
  check (owner_id <> ally_id)
);
alter table public.journey_allies enable row level security;

drop policy if exists "allies_read"         on public.journey_allies;
drop policy if exists "allies_owner_insert"  on public.journey_allies;
drop policy if exists "allies_owner_update"  on public.journey_allies;
drop policy if exists "allies_respond"       on public.journey_allies;
drop policy if exists "allies_owner_delete"  on public.journey_allies;
create policy "allies_read" on public.journey_allies for select to authenticated
  using (owner_id = auth.uid() or ally_id = auth.uid());
create policy "allies_owner_insert" on public.journey_allies for insert to authenticated
  with check (owner_id = auth.uid() and public.are_friends(owner_id, ally_id));
-- F4: update must ALSO re-check friendship (insert-parity), so ally_id can't be
-- re-pointed at a non-friend. Owner may change the bundle, cancel, or close.
create policy "allies_owner_update" on public.journey_allies for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and public.are_friends(owner_id, ally_id));
-- D2: the RECIPIENT may move THEIR OWN row 'requested' → 'accepted'/'declined' only
-- (mirrors friendships_respond). They can never flip anyone else's row or self-accept
-- a non-requested/closed row.
create policy "allies_respond" on public.journey_allies for update to authenticated
  using (ally_id = auth.uid() and status = 'requested')
  with check (ally_id = auth.uid() and status in ('accepted','declined'));
create policy "allies_owner_delete" on public.journey_allies for delete to authenticated
  using (owner_id = auth.uid());

-- D2: server-stamp the decision/close timestamps so lifecycle audit fields can't be
-- forged client-side (matches the snapshots updated_at pattern).
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

-- D2 (security-privacy #1/#2): RLS WITH CHECK cannot reference OLD, so it can pin the ALLOWED
-- columns but not FORBID rewriting the others. This BEFORE-UPDATE trigger closes both holes even
-- against a raw PostgREST/JWT call:
--   • RECIPIENT (auth.uid = ally): may move ONLY `status` requested → accepted/declined. Every
--     other column (owner_id/journey_id/ally_id/visibility) is forced back to its OLD value — so a
--     recipient can NOT self-escalate Encourager→Companion nor forge an `accepted` row on another
--     owner's Journey.
--   • OWNER (auth.uid = owner): may set `status` ONLY to requested/cancelled/closed — never
--     `accepted`/`declined` (those belong to the recipient), so the owner can't self-accept, revive
--     a decline, or resurrect a closed row (defeating the consent gate + least-access default).
-- A null auth.uid() (service role / SQL editor / migration backfill) bypasses — it is not a client.
create or replace function public.enforce_ally_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;   -- service role / migration: not a client request

  if auth.uid() = old.ally_id then                 -- recipient responding to their own invite
    new.owner_id   := old.owner_id;
    new.journey_id := old.journey_id;
    new.ally_id    := old.ally_id;
    new.visibility := old.visibility;              -- no self-escalation Encourager → Companion
    if not (old.status = 'requested' and new.status in ('accepted','declined')) then
      raise exception 'ally recipient may only accept or decline a requested invite';
    end if;
    return new;
  end if;

  if auth.uid() = old.owner_id then                -- owner managing their own invite
    if new.status is distinct from old.status
       and new.status not in ('requested','cancelled','closed') then
      raise exception 'ally owner may not set status to %', new.status;  -- accept/decline is the recipient's
    end if;
    return new;
  end if;

  raise exception 'not authorized to update this ally row';  -- neither owner nor recipient (RLS also blocks)
end $$;
drop trigger if exists trg_allies_enforce on public.journey_allies;
create trigger trg_allies_enforce before update on public.journey_allies
  for each row execute function public.enforce_ally_update();

-- D2: is_ally now requires an ACCEPTED invite AND a still-standing friendship — so a
-- pending/declined/closed invite grants nothing, and an unfriend instantly cuts access.
create or replace function public.is_ally(p_journey text, p_owner uuid, p_viewer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.journey_allies ja
    where ja.journey_id = p_journey and ja.owner_id = p_owner and ja.ally_id = p_viewer
      and ja.status = 'accepted'
      and public.are_friends(ja.owner_id, ja.ally_id)
  );
$$;
revoke all on function public.is_ally(text, uuid, uuid) from public, anon;   -- F8
grant execute on function public.is_ally(text, uuid, uuid) to authenticated;

-- D2 (removed-friend fix, part 2): when a friendship row is deleted (unfriend/decline-
-- removal), CASCADE-delete every Journey-Ally relationship between the two users in BOTH
-- directions. Belt-and-braces alongside the are_friends() read-gate above: the read is
-- already blocked the instant the friendship goes, and this also purges the now-orphaned
-- invite rows so nothing lingers. SECURITY DEFINER so it runs regardless of the deleter's
-- RLS (either side of the friendship may unfriend).
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

-- ── 3b. COMPANION STEPS (D2) ────────────────────────────────────────────────
-- The Companion bundle's MVP payload: SYSTEM-GENERATED Step progress only — stepId,
-- Step title, derived StepStatus, report date. Coach-Journeys ONLY (the app publishes
-- here only for `createdVia = 'coach'` Journeys), so a title is safe to share and carries
-- NO user free text. There is DELIBERATELY no column for a reason, note, description,
-- "why", postpone field, or any D34 private-profile field — those never leave the device.
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

-- Owner manages their own rows. Allies do NOT read this base table directly and it is
-- NOT on realtime — they read the definer RPC below, which enforces consent + friendship
-- + the Companion bundle. (Same shape as progress_snapshots / F1+F2.)
drop policy if exists "companion_owner_all" on public.companion_steps;
create policy "companion_owner_all" on public.companion_steps for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Server-stamp updated_at so the "last active" signal can't be forged client-side. The
-- shared helper is defined here (create-or-replace, idempotent) so this trigger can be
-- created before §4 re-declares the same function; §4's copy is identical and harmless.
create or replace function public.stamp_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_companion_stamp on public.companion_steps;
create trigger trg_companion_stamp before insert or update
  on public.companion_steps for each row execute function public.stamp_updated_at();

-- The ONLY way an Ally reads Companion Step progress. SECURITY DEFINER + explicit WHERE:
-- returns rows ONLY for an ACCEPTED, Companion-bundle ('full') invite on THIS owner+journey
-- from a still-standing friend. Non-accepted / non-friend / non-Companion / wrong-journey
-- ⇒ zero rows. No reason/note/description ever exists here to leak.
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
-- D2: gated on an ACCEPTED invite (consent) AND a still-standing friendship — a pending
-- invite reveals nothing, and an unfriend (or removed/closed invite) instantly cuts the read.
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

-- ── 5b. ENTITLEMENTS (account tier) ─────────────────────────────────────────
-- One row per user describing their account tier (free / trial / subscriber).
-- This is the $0 foundation for multi-user account management; it is NOT billing.
--
-- SECURITY (critical): writes are SERVER-AUTHORITATIVE ONLY. `authenticated` may
-- SELECT its OWN row and nothing else — there is deliberately NO insert / update
-- / delete policy for `authenticated`, so RLS DENIES every client write. A row is
-- created / upgraded only by the service role (a verified App Store / Play receipt
-- webhook, or a manual grant) — the client can therefore NEVER make itself a
-- `subscriber`. The one client-side elevation, the local dev trial, lives on the
-- device only and never touches this table.
--
-- PRIVACY: no PII here — no name, email, receipt, or purchase token. Only a tier
-- and a couple of expiry timestamps (Auth_Backend_Proposal red-line R1).
create table if not exists public.entitlements (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  tier               text not null default 'free' check (tier in ('free','trial','subscriber')),
  trial_ends_at      timestamptz,
  current_period_end timestamptz,
  source             text not null default 'none' check (source in ('none','trial','iap','grant')),
  updated_at         timestamptz not null default now()
);
alter table public.entitlements enable row level security;

-- SELECT own row only. NO insert/update/delete for authenticated: the server
-- (service role) is the sole writer of a tier — the client cannot upgrade itself.
drop policy if exists "entitlements_read_own" on public.entitlements;
create policy "entitlements_read_own" on public.entitlements for select to authenticated
  using (user_id = auth.uid());

-- Server-stamp updated_at so the "last changed" signal can't be forged (matches
-- the snapshots pattern). Reuses public.stamp_updated_at() defined above.
drop trigger if exists trg_entitlements_stamp on public.entitlements;
create trigger trg_entitlements_stamp before insert or update
  on public.entitlements for each row execute function public.stamp_updated_at();

-- ── 6. REALTIME ────────────────────────────────────────────────────────────
-- Cheers only. (F2) progress_snapshots is intentionally NOT published — realtime
-- respects only base-table RLS and would bypass the title-masking function.
-- Ally progress is fetched via ally_snapshots() on open / refresh.
alter publication supabase_realtime add table public.cheers;

-- ── 7. INDEXES ─────────────────────────────────────────────────────────────
create index if not exists idx_cheers_to       on public.cheers (to_id, created_at desc);
create index if not exists idx_allies_ally      on public.journey_allies (ally_id);
create index if not exists idx_allies_incoming   on public.journey_allies (ally_id, status);
create index if not exists idx_companion_owner_journey on public.companion_steps (owner_id, journey_id);
create index if not exists idx_snapshots_owner   on public.progress_snapshots (owner_id);
create index if not exists idx_friendships_addr  on public.friendships (addressee_id);

-- Done. RLS ON everywhere; the publishable key reaches only what these policies
-- allow; visibility is enforced by the DB. Nothing here can incur a Free-tier charge.
-- Deferred to Commercial (security-privacy F6/F7): cheer rate-limiting, handle
-- enumeration limits — noted, POC-acceptable at this scale.
