-- ============================================================================
-- 0018 — the Versions tab reports the update NUMBER, not only the update id
--
-- 0016 records what each installation is running: platform, runtime, app
-- version, channel, and the id + timestamp of the update in front of the person.
-- All of it true, and none of it answerable across a room. The founder read the
-- Versions tab on 2026-09-08 and it said `runtime ad3ed4b6 · 1 install · 1.0.0 ·
-- preview` — three identifiers that never move between over-the-air updates and
-- one hash.
--
-- D100 gave the app a number that does move (`OTA_VERSION`, incremented on every
-- publish and announced on Home). This carries that number to the console, so the
-- one question the tab exists for — *is the phone in my hand on what I published
-- ten minutes ago?* — is answered by reading a number rather than by comparing
-- two timestamps and hoping.
--
-- Additive: an installation that has not reported one yet is null, which reads as
-- "an older build, before this existed" rather than as an error.
-- ============================================================================

alter table public.runtime_installs
  add column if not exists ota_version int;

comment on column public.runtime_installs.ota_version is
  'The app''s own update number (core/update/otaVersion.ts), incremented on every publish. Null on installations that predate it.';

create or replace function public.note_installed_runtime(
  p_install_id uuid,
  p_platform text,
  p_runtime_version text,
  p_app_version text default null,
  p_build text default null,
  p_channel text default null,
  p_update_id text default null,
  p_update_at timestamptz default null,
  p_ota_version int default null
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
    install_id, platform, runtime_version, app_version, build, channel,
    update_id, update_at, ota_version
  )
  values (
    p_install_id, p_platform, left(p_runtime_version, 80), left(p_app_version, 40),
    left(p_build, 40), left(p_channel, 40), left(p_update_id, 80), p_update_at,
    -- Clamped rather than trusted: a number, and a plausible one.
    case when p_ota_version between 0 and 1000000 then p_ota_version end
  )
  on conflict (install_id) do update set
    platform = excluded.platform,
    runtime_version = excluded.runtime_version,
    app_version = excluded.app_version,
    build = excluded.build,
    channel = excluded.channel,
    update_id = excluded.update_id,
    update_at = excluded.update_at,
    ota_version = excluded.ota_version,
    last_seen = now();
end;
$$;

grant execute on function public.note_installed_runtime(uuid, text, text, text, text, text, text, timestamptz, int) to authenticated;

-- The grouped read gains the range of update numbers running on each runtime.
-- A RANGE rather than one value on purpose: two phones on the same build can sit
-- on different updates, and that gap is the thing worth seeing.
create or replace function public.installed_runtimes()
returns table (
  platform text,
  runtime_version text,
  installs bigint,
  app_versions text[],
  channels text[],
  newest_update_at timestamptz,
  oldest_update_at timestamptz,
  newest_ota_version int,
  oldest_ota_version int,
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
           max(r.ota_version),
           min(r.ota_version),
           max(r.last_seen)
    from public.runtime_installs r
    group by r.platform, r.runtime_version
    order by max(r.last_seen) desc;
end;
$$;
