-- ============================================================================
-- Migration 0016 — what is actually installed, as opposed to what we published
-- ----------------------------------------------------------------------------
-- Idempotent. Founder decision, 2026-08-31 (option B).
--
-- ── THE FAILURE THIS EXISTS TO MAKE VISIBLE ───────────────────────────────
--
-- An over-the-air update can only reach an installation whose runtime it was
-- built for. `tools/publish-ota.mjs` protects US from that — it refuses to
-- publish onto a runtime with no build. Nothing protects the PERSON holding the
-- phone: an installation that can no longer receive updates simply stops
-- changing, silently, and has no way to know it.
--
-- It has already cost real time. A tester spent three days on a build from a
-- week earlier, reporting bugs that had been fixed twice, and it was only found
-- from a screenshot of the About row. This turns that into a number an operator
-- can see.
--
-- ── WHY NOT `app_versions` ────────────────────────────────────────────────
--
-- `app_versions` (0008) is the RELEASE registry: what we published. This is what
-- is INSTALLED. They are different facts and they disagree in exactly the case
-- that matters — a release nobody installed, or an installation on a release we
-- have stopped publishing to. Folding them into one table would hide the gap
-- this is built to show.
--
-- ── WHOSE DATA THIS IS ────────────────────────────────────────────────────
--
-- Nobody's. The row is keyed on the same RANDOM installation id the KPI stream
-- uses — not an account id, not a device id, never derived from either. It says
-- "a phone somewhere is on this runtime", which is what makes "the same phone"
-- countable without making "this person" identifiable. There is no select policy
-- for anybody, including operators; the console reads an aggregate.
-- ============================================================================

create table if not exists public.runtime_installs (
  -- One row per installation, updated on each launch. The id is the KPI stream's
  -- random install id, reused so a phone is not counted twice under two schemes.
  install_id      uuid primary key,
  platform        text check (platform is null or platform in ('ios','android','web')),
  runtime_version text,
  app_version     text,
  build           text,
  channel         text,
  -- The update actually running, and when it was published. This is what makes
  -- "stranded" computable without a release registry: an installation whose
  -- running update is old while others are getting fresh ones is cut off.
  update_id       text,
  update_at       timestamptz,
  first_seen      timestamptz not null default now(),
  last_seen       timestamptz not null default now()
);

create index if not exists runtime_installs_runtime_idx
  on public.runtime_installs (platform, runtime_version);

alter table public.runtime_installs enable row level security;
-- No policy for anybody, deliberately: written through the function below, read
-- as an aggregate. A table nobody can select cannot become a device list.

/**
 * Report what this installation is running.
 *
 * Takes the installation id from the CALLER rather than the session on purpose:
 * the id is random and account-independent, and binding it to `auth.uid()` would
 * make it an account id wearing a disguise — the exact thing the KPI stream's id
 * was designed not to be. A signed-in session is still required so that an
 * anonymous internet caller cannot fill the table.
 */
create or replace function public.note_installed_runtime(
  p_install_id uuid,
  p_platform text,
  p_runtime_version text,
  p_app_version text default null,
  p_build text default null,
  p_channel text default null,
  p_update_id text default null,
  p_update_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_install_id is null then
    return;
  end if;
  if p_platform is not null and p_platform not in ('ios','android','web') then
    return;
  end if;

  insert into public.runtime_installs as r (
    install_id, platform, runtime_version, app_version, build, channel, update_id, update_at
  )
  values (
    p_install_id, p_platform, left(p_runtime_version, 80), left(p_app_version, 40),
    left(p_build, 40), left(p_channel, 40), left(p_update_id, 80), p_update_at
  )
  on conflict (install_id) do update set
    platform = excluded.platform,
    runtime_version = excluded.runtime_version,
    app_version = excluded.app_version,
    build = excluded.build,
    channel = excluded.channel,
    update_id = excluded.update_id,
    update_at = excluded.update_at,
    last_seen = now();
end;
$$;

grant execute on function public.note_installed_runtime(uuid, text, text, text, text, text, text, timestamptz) to authenticated;

/**
 * What is installed, grouped by runtime — the console's Versions tab.
 *
 * `newest_update_at` is the freshest running update ON THIS RUNTIME. Comparing
 * it across rows is what identifies a stranded group: if one runtime's
 * installations are running an update from today and another's from last week,
 * the second group is cut off rather than merely quiet. That comparison is left
 * to the reader rather than baked in as a boolean, because "stranded" depends on
 * whether we have published since, and this function does not know that.
 */
create or replace function public.installed_runtimes()
returns table (
  platform text,
  runtime_version text,
  installs bigint,
  app_versions text[],
  channels text[],
  newest_update_at timestamptz,
  oldest_update_at timestamptz,
  last_seen timestamptz
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
    select r.platform,
           r.runtime_version,
           count(*)::bigint,
           array_agg(distinct r.app_version) filter (where r.app_version is not null),
           array_agg(distinct r.channel) filter (where r.channel is not null),
           max(r.update_at),
           min(r.update_at),
           max(r.last_seen)
    from public.runtime_installs r
    group by r.platform, r.runtime_version
    order by r.platform, max(r.last_seen) desc;
end;
$$;

grant execute on function public.installed_runtimes() to authenticated;

comment on function public.installed_runtimes() is
  'Installations grouped by runtime (founder option B, 2026-08-31). Counts only; no id, no device, no series.';
