-- ============================================================================
-- Migration 0013 — the console can finally read a KPI, without reading a row
-- ----------------------------------------------------------------------------
-- Idempotent.
--
-- Numbered 0013, not 0012: a concurrently-authored `0012_creator_draft_write_boundary.sql`
-- claimed that number first. Two files with the same version is a push that
-- fails on a primary-key collision, which is the right failure — the CLI will
-- not let two migrations disagree about what 0012 means.
--
-- Migration 0008 created `kpi_events` with an insert policy and NO select policy
-- for anybody — deliberately: "a table nobody can select is a table nobody can
-- accidentally turn into a per-person timeline". That decision stands. This adds
-- the one thing the console needs on the other side of it: counts.
--
-- ── ONE FUNCTION, AND WHAT IT CANNOT DO ───────────────────────────────────
--
-- `kpi_counts` returns, per event name and bucket, how many events there were
-- and how many DISTINCT INSTALLATIONS produced them. That is the whole surface.
--
-- It cannot return an installation id, an ordering, a timestamp of an individual
-- event, or any per-installation series. Every KPI in the taxonomy is a ratio of
-- two of these counts — which is why the app emits `journey_first_report` as its
-- own event rather than letting the server join reports to Journeys. That join
-- would need a Journey id in the stream, and a Journey id is the first step
-- toward the timeline this function exists to make unavailable.
--
-- ── WHY THE WINDOW IS A PARAMETER AND NOT A DEFAULT ───────────────────────
--
-- PRD §7.2 requires every KPI to show its time window. A function with a
-- built-in default window would let the console display a number whose window
-- it did not state.
-- ============================================================================

create or replace function public.kpi_counts(p_since timestamptz, p_until timestamptz)
returns table (name text, bucket text, events bigint, installs bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- The same three roles that may read the version registry. `product` is here
  -- because KPIs are its whole reason for existing.
  if not (public.has_admin_role('operations')
       or public.has_admin_role('developer')
       or public.has_admin_role('product')) then
    return; -- no rows: "you may not ask", which is not the same as zeros
  end if;

  return query
    select e.name,
           e.bucket,
           count(*)::bigint,
           count(distinct e.install_id)::bigint
    from public.kpi_events e
    where e.at >= p_since and e.at < p_until
    group by e.name, e.bucket
    order by e.name, e.bucket;
end;
$$;

grant execute on function public.kpi_counts(timestamptz, timestamptz) to authenticated;

comment on function public.kpi_counts(timestamptz, timestamptz) is
  'Counts per KPI event name and bucket in a window (PRD §7.2). Returns no identifier and no series.';

-- The taxonomy version, so the console can say when a definition changed under a
-- number. PRD §7.2: historical values are never silently recomputed under a new
-- meaning, which is only checkable if the meaning is recorded alongside them.
create or replace function public.kpi_versions_seen()
returns table (taxonomy_version integer, first_at timestamptz, last_at timestamptz, events bigint)
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
    select e.taxonomy_version, min(e.at), max(e.at), count(*)::bigint
    from public.kpi_events e
    group by e.taxonomy_version
    order by e.taxonomy_version desc;
end;
$$;

grant execute on function public.kpi_versions_seen() to authenticated;
