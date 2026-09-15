-- ============================================================================
-- Migration 0019 — what a CONVERSATION costs, in money rather than in bytes
-- ----------------------------------------------------------------------------
-- Idempotent. Nothing here drops or rewrites 0002: `llm_usage` and the lifetime
-- byte cap it feeds keep working exactly as they did.
--
-- ── WHY (founder, twice on 2026-09-15: "put a limit on spending") ──────────
--
-- Every number we could put on such a limit is a guess today. The proxy counts
-- BYTES and REQUESTS per user for life (0002) and enforces 2 MB. Bytes are not
-- what Google bills. Tokens are, input and output at different rates, and
-- Gemini has been returning both counts on every single response — which the
-- proxy read past and threw away. And nothing grouped calls, so "what does one
-- conversation cost" had no answer at all, only an average of averages.
--
-- Three things were missing, and this file adds exactly those three:
--   1. token counts, input and output kept apart because they are priced apart;
--   2. a conversation id to add them up against;
--   3. a price table, so tokens can become money.
--
-- ── WHAT IS STORED, AND WHAT CANNOT BE (G1) ───────────────────────────────
--
-- Counts and ids. No prompt, no completion, no title, no fragment of anything
-- anybody wrote. The conversation id is 128 random bits minted on the device
-- and is CHECK-constrained to 32 hex characters: a column that only accepts hex
-- cannot quietly become a place where text ends up. `kind` is one of three
-- fixed words. There is no free-text column in this file and adding one is a
-- security-privacy review, not a migration.
--
-- Rows follow the account: `on delete cascade` from `auth.users`, so deleting an
-- account deletes its cost rows with it.
--
-- ── WHY PER CONVERSATION AND NOT PER CALL ─────────────────────────────────
--
-- A per-call ledger with a user id and a timestamp on every row is a per-person
-- timeline of when somebody talked to the coach, which is precisely the artefact
-- 0013 refused to build for KPIs. Aggregating on the way in gives the same
-- answer — the product question is per conversation — and the timeline never
-- exists to be queried, subpoenaed, or leaked. One row per
-- (user, conversation, model): the model is in the key because two models have
-- two prices, and a conversation that switched models would otherwise have to be
-- costed at whichever one was recorded last.
--
-- ── THE OVERLOAD TRAP (recorded in this repo, and live here) ──────────────
--
-- `create or replace function` cannot change a return type, and with a DIFFERENT
-- ARGUMENT LIST it does not replace anything — it silently creates an OVERLOAD,
-- and PostgREST then has two candidates and resolves the wrong one. So the new
-- recorder is a NEW NAME (`record_llm_call`) rather than more arguments on
-- `record_llm_usage`, and every function below is dropped by its exact signature
-- before being created.
--
-- ── DEPLOY ORDER (founder action, costs nothing until run) ────────────────
--
--   1. apply THIS migration
--   2. then deploy the function:  supabase functions deploy gemini-proxy
--
-- The other order leaves the proxy calling an RPC that does not exist; it falls
-- back to `record_llm_usage`, so the cap holds and users see nothing, but those
-- calls never reach the cost table and the gap has no error to explain it.
-- ============================================================================

-- ── 1. THE PRICE TABLE ──────────────────────────────────────────────────────
--
-- Configuration, not code. A rate hardcoded in a function is a number that
-- becomes a lie the first time Google changes it, and quietly — the dashboard
-- keeps rendering with the same confidence. Here a rate change is one UPDATE,
-- from the SQL editor, with no deploy of anything:
--
--   update public.llm_model_price
--      set input_usd_per_million = 0.30,
--          output_usd_per_million = 2.50,
--          source = 'ai.google.dev/pricing, checked 2026-11-02',
--          noted_on = current_date,
--          updated_at = now()
--    where model = 'gemini-2.5-flash';
--
-- `source` and `noted_on` are not decoration. A price with no provenance is a
-- number nobody can check, and the whole point of this table is that the cost
-- figures can be checked.
create table if not exists public.llm_model_price (
  model                  text primary key,
  -- USD per 1,000,000 tokens, kept apart because they are billed apart: output
  -- is several times input, so a single blended rate would misprice every
  -- conversation in the direction of "cheaper than it is".
  input_usd_per_million  numeric(12,6) not null check (input_usd_per_million >= 0),
  output_usd_per_million numeric(12,6) not null check (output_usd_per_million >= 0),
  -- Where the number came from and when it was read. Free text, but operator
  -- text — no user ever reaches this table.
  source                 text not null,
  noted_on               date not null default current_date,
  updated_at             timestamptz not null default now()
);

-- Seeded, never overwritten. `do nothing` matters on a re-run: if the founder
-- has corrected a rate by hand, re-applying this migration must not put the
-- stale seed back.
insert into public.llm_model_price (model, input_usd_per_million, output_usd_per_million, source, noted_on)
values
  -- Verified against ai.google.dev/gemini-api/docs/pricing on 2026-09-15. `gemini-2.5-flash` is the
  -- model this app actually runs on ({@link GeminiClient.DEFAULT_MODEL}); the others are seeded so a
  -- switch does not silently produce a conversation with no price.
  ('gemini-2.5-flash',      0.300000,  2.500000, 'Google AI paid-tier list price, text input/output; verified at ai.google.dev/gemini-api/docs/pricing on 2026-09-15', date '2026-09-15'),
  ('gemini-2.5-flash-lite', 0.100000,  0.400000, 'Google AI paid-tier list price, text input/output; verified at ai.google.dev/gemini-api/docs/pricing on 2026-09-15', date '2026-09-15'),
  ('gemini-2.5-pro',        1.250000, 10.000000, 'Google AI paid-tier list price, text input/output; verified at ai.google.dev/gemini-api/docs/pricing on 2026-09-15; the <=200k-token tier — a longer context is billed at 2.50/15.00 and this table does not model that', date '2026-09-15')
on conflict (model) do nothing;

-- RLS on, no policy for anybody: read through the function below, write with the
-- service role (the SQL editor). A price a client could edit is a cap a client
-- could move.
alter table public.llm_model_price enable row level security;

comment on table public.llm_model_price is
  'USD per million tokens per model. Configuration: change a rate with an UPDATE, never a deploy.';

-- ── 2. THE PER-CONVERSATION LEDGER ─────────────────────────────────────────
create table if not exists public.llm_conversation_usage (
  user_id             uuid not null references auth.users (id) on delete cascade,
  -- 32 hex characters from the device, or the literal 'unattributed' for a call
  -- that arrived without a usable id (an older build, or a device whose storage
  -- failed). The CHECK is the privacy control — see the header.
  conversation_id     text not null check (conversation_id = 'unattributed' or conversation_id ~ '^[0-9a-f]{32}$'),
  model               text not null,
  -- 'introduction' is the expensive question: it is spent on somebody who has
  -- paid nothing. Comparing it with 'planning' is the reason the kind is stored
  -- at all.
  kind                text not null check (kind in ('introduction', 'planning', 'unspecified')),
  calls               integer not null default 0,
  input_tokens        bigint  not null default 0,
  output_tokens       bigint  not null default 0,
  -- Calls the provider gave us no usage metadata for. NOT folded into the token
  -- totals as zeros: a call that cost nothing and a call whose cost is unknown
  -- are different facts, and a dashboard that adds the second to the first
  -- under-reports spend while looking certain. Counted here so the console can
  -- say how much of the picture is missing.
  calls_without_usage integer not null default 0,
  -- Kept alongside deliberately. The lifetime cap is enforced in bytes and will
  -- be until there is enough token data to re-set it in tokens; replacing the
  -- unit and the meaning in one change would leave the cap untested.
  bytes               bigint  not null default 0,
  first_at            timestamptz not null default now(),
  last_at             timestamptz not null default now(),
  primary key (user_id, conversation_id, model)
);

-- The console reads by window, on last activity.
create index if not exists llm_conversation_usage_last_at_idx
  on public.llm_conversation_usage (last_at desc);

-- Same posture as `llm_usage`: RLS on, no policy for anyone. Written by the Edge
-- Function's service-role client, read through the aggregate function below.
alter table public.llm_conversation_usage enable row level security;

comment on table public.llm_conversation_usage is
  'Token and byte counts per (user, conversation, model). Counts and opaque ids only — never content.';

-- ── 3. RECORDING A CALL ────────────────────────────────────────────────────
drop function if exists public.record_llm_call(uuid, bigint, text, text, text, integer, integer);

-- One statement for both ledgers. Two round trips could half-fail and leave the
-- cap's counters and the cost rows disagreeing about how many calls there were —
-- and the cap is the one that protects the founder's card, so it must not be the
-- one that goes missing.
--
-- Validation is repeated here rather than trusted from the caller. The proxy
-- checks the id and the kind already; this function is the last gate before the
-- values become rows, and a table's constraints should not be the first place a
-- bad value is noticed.
create function public.record_llm_call(
  p_user_id           uuid,
  p_bytes             bigint,
  p_conversation_id   text,
  p_conversation_kind text,
  p_model             text,
  p_input_tokens      integer,
  p_output_tokens     integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation text;
  v_kind         text;
  -- Usage counts as REPORTED only when BOTH halves are there. One number without
  -- the other cannot be priced — input and output have different rates — so a
  -- half-reported call is an unknown call, not a cheap one.
  v_reported     boolean := p_input_tokens is not null and p_output_tokens is not null;
begin
  v_conversation := case
    when p_conversation_id ~ '^[0-9a-f]{32}$' then p_conversation_id
    else 'unattributed'
  end;
  v_kind := case
    when p_conversation_kind in ('introduction', 'planning') then p_conversation_kind
    else 'unspecified'
  end;

  -- (a) the lifetime counters the byte cap reads — unchanged semantics from 0002.
  insert into public.llm_usage (user_id, bytes, requests)
  values (p_user_id, coalesce(p_bytes, 0), 1)
  on conflict (user_id) do update
    set bytes = public.llm_usage.bytes + excluded.bytes,
        requests = public.llm_usage.requests + 1,
        last_at = now();

  -- (b) the per-conversation ledger.
  insert into public.llm_conversation_usage (
    user_id, conversation_id, model, kind,
    calls, input_tokens, output_tokens, calls_without_usage, bytes
  )
  values (
    p_user_id, v_conversation, coalesce(p_model, 'unknown'), v_kind,
    1,
    case when v_reported then greatest(p_input_tokens, 0) else 0 end,
    case when v_reported then greatest(p_output_tokens, 0) else 0 end,
    case when v_reported then 0 else 1 end,
    coalesce(p_bytes, 0)
  )
  on conflict (user_id, conversation_id, model) do update
    set calls               = public.llm_conversation_usage.calls + 1,
        input_tokens        = public.llm_conversation_usage.input_tokens + excluded.input_tokens,
        output_tokens       = public.llm_conversation_usage.output_tokens + excluded.output_tokens,
        calls_without_usage = public.llm_conversation_usage.calls_without_usage + excluded.calls_without_usage,
        bytes               = public.llm_conversation_usage.bytes + excluded.bytes,
        -- The FIRST kind seen wins over 'unspecified': a conversation that was
        -- once tagged stays tagged, and a later untagged call does not erase
        -- which kind it was.
        kind                = case
                                when public.llm_conversation_usage.kind = 'unspecified'
                                  then excluded.kind
                                else public.llm_conversation_usage.kind
                              end,
        last_at             = now();
end;
$$;

-- Service-role only, exactly like `record_llm_usage`. A client that could write
-- its own usage could write zero.
revoke all on function public.record_llm_call(uuid, bigint, text, text, text, integer, integer)
  from public, anon, authenticated;

-- ── 4. WHAT THE CONSOLE MAY READ ───────────────────────────────────────────
drop function if exists public.llm_conversation_costs(timestamptz, timestamptz);

-- Per conversation and model, with NO user id and NO timestamps: enough to cost
-- a conversation and to see the distribution, not enough to reconstruct when any
-- one person used the app. The console does the arithmetic (it is tested there
-- as pure functions); this returns the counts it does it on.
--
-- The window is a parameter with no default, for the same reason as `kpi_counts`:
-- a number whose window the page cannot state is a number the page should not
-- show. A conversation falls in the window by its LAST activity, so one spanning
-- the boundary is counted once, in the later window, and never split in half.
create function public.llm_conversation_costs(p_since timestamptz, p_until timestamptz)
returns table (
  conversation_id text,
  kind text,
  model text,
  calls bigint,
  input_tokens bigint,
  output_tokens bigint,
  calls_without_usage bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.has_admin_role('operations')
       or public.has_admin_role('developer')
       or public.has_admin_role('product')) then
    return; -- no rows: "you may not ask", which is not the same as "nothing was spent"
  end if;

  return query
    select u.conversation_id,
           u.kind,
           u.model,
           sum(u.calls)::bigint,
           sum(u.input_tokens)::bigint,
           sum(u.output_tokens)::bigint,
           sum(u.calls_without_usage)::bigint
      from public.llm_conversation_usage u
     where u.last_at >= p_since and u.last_at < p_until
     -- Grouping across users only ever merges the 'unattributed' rows, which are
     -- not conversations and are reported separately. A real id is 128 random
     -- bits and does not collide.
     group by u.conversation_id, u.kind, u.model
     order by u.conversation_id;
end;
$$;

grant execute on function public.llm_conversation_costs(timestamptz, timestamptz) to authenticated;

comment on function public.llm_conversation_costs(timestamptz, timestamptz) is
  'Token counts per conversation and model in a window. No user id, no timestamps, no content.';

drop function if exists public.llm_model_prices();

-- The rates, so the console can show the price it costed with rather than one
-- baked into the page. A console displaying a stale rate it cannot see is the
-- same failure as a hardcoded rate in a function.
create function public.llm_model_prices()
returns table (
  model text,
  input_usd_per_million numeric,
  output_usd_per_million numeric,
  source text,
  noted_on date,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.has_admin_role('operations')
       or public.has_admin_role('developer')
       or public.has_admin_role('product')) then
    return;
  end if;
  return query
    select p.model, p.input_usd_per_million, p.output_usd_per_million, p.source, p.noted_on, p.updated_at
      from public.llm_model_price p
     order by p.model;
end;
$$;

grant execute on function public.llm_model_prices() to authenticated;
