-- llm_usage — per-user metering for the `gemini-proxy` Edge Function.
--
-- WHAT IT HOLDS, and just as importantly what it does not: one row per user, a byte total and a
-- request count. NO prompt text, no response text, no goal titles, nothing the user wrote. The
-- request body that passes through the proxy carries the user's own words (G1, on-device-only
-- signal) and it is forwarded, never stored. If a future column would hold content, that is a
-- security-privacy review, not a migration.
--
-- WHY THE COUNTS ARE HERE AT ALL: the cap the founder set (2 MB per user, 2026-08-18) cannot be
-- enforced without remembering what has been spent. The request count rides alongside because bytes
-- are an unconventional unit for model usage — keeping both means the unit can be reconsidered
-- later against real numbers instead of guesses.

create table if not exists public.llm_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Request + response bytes, cumulative. `bigint` because a byte total outgrows `int` in a year.
  bytes bigint not null default 0,
  requests integer not null default 0,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);

-- RLS ON with NO policy for anyone: this table is written and read ONLY by the Edge Function's
-- service-role client. A user has no reason to read it and no business writing it — a client that
-- could write its own usage row could zero it and uncap itself.
alter table public.llm_usage enable row level security;

-- Atomic increment. Doing this as an UPDATE from the function would race two concurrent requests
-- and lose one, which is the failure mode that quietly turns a cap into a suggestion.
create or replace function public.record_llm_usage(p_user_id uuid, p_bytes bigint)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.llm_usage (user_id, bytes, requests)
  values (p_user_id, p_bytes, 1)
  on conflict (user_id) do update
    set bytes = public.llm_usage.bytes + excluded.bytes,
        requests = public.llm_usage.requests + 1,
        last_at = now();
$$;

-- The function is service-role-only; no grant to `anon` or `authenticated`.
revoke all on function public.record_llm_usage(uuid, bigint) from public, anon, authenticated;
