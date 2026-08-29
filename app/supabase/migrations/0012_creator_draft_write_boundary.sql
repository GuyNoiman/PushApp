-- Creator Journey Studio: safe metadata-draft write boundary.
--
-- The browser may describe a draft. It may not choose its owner, lifecycle,
-- publication timestamp, or bypass a creator suspension. Publishing remains a
-- later reviewed capability and has no client write path in this migration.

-- Direct table mutation is too broad for a lifecycle whose states have meaning.
revoke insert, update, delete on public.journey_templates from authenticated;

-- Split the old FOR ALL policy into the read capability that exists today.
drop policy if exists "journey_templates_own" on public.journey_templates;
drop policy if exists "journey_templates_read_own_active" on public.journey_templates;
create policy "journey_templates_read_own_active"
  on public.journey_templates for select to authenticated
  using (creator_id = auth.uid() and public.is_creator());

-- Published templates remain readable through migration 0011's separate policy.

create or replace function public.creator_create_template_draft(
  p_name text,
  p_short_description text default null,
  p_long_description text default null,
  p_dream_fit text default null,
  p_audience text default null,
  p_prerequisites text default null,
  p_outcome text default null,
  p_language text default 'he',
  p_cover_url text default null,
  p_estimated_days integer default null,
  p_weekly_minutes integer default null,
  p_difficulty text default null,
  p_tags text[] default '{}',
  p_start_mode text default 'flexible',
  p_completion_window_days integer default null,
  p_edit_policy text default 'editable',
  p_restart_policy text default 'allowed',
  p_success_policy text default null
)
returns setof public.journey_templates
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := nullif(btrim(p_name), '');
  clean_cover text := nullif(btrim(p_cover_url), '');
begin
  if not public.is_creator() then
    raise exception 'Creator access is not active' using errcode = '42501';
  end if;
  if clean_name is null or char_length(clean_name) > 100 then
    raise exception 'Journey name must contain 1 to 100 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(p_short_description, '')) > 180
     or char_length(coalesce(p_long_description, '')) > 1200
     or char_length(coalesce(p_dream_fit, '')) > 700
     or char_length(coalesce(p_audience, '')) > 700
     or char_length(coalesce(p_prerequisites, '')) > 500
     or char_length(coalesce(p_outcome, '')) > 700
     or char_length(coalesce(p_success_policy, '')) > 700 then
    raise exception 'One or more fields exceed the allowed length' using errcode = '22023';
  end if;
  if p_language not in ('he', 'en') then
    raise exception 'Unsupported language' using errcode = '22023';
  end if;
  if p_estimated_days is not null and p_estimated_days not between 1 and 730 then
    raise exception 'Estimated duration must be between 1 and 730 days' using errcode = '22023';
  end if;
  if p_weekly_minutes is not null and p_weekly_minutes not between 1 and 10080 then
    raise exception 'Weekly effort is outside the allowed range' using errcode = '22023';
  end if;
  if p_completion_window_days is not null and p_completion_window_days not between 1 and 730 then
    raise exception 'Completion window must be between 1 and 730 days' using errcode = '22023';
  end if;
  if coalesce(array_length(p_tags, 1), 0) > 12
     or exists (select 1 from unnest(coalesce(p_tags, '{}')) as tag(value) where char_length(value) > 32) then
    raise exception 'Use up to 12 tags of 32 characters each' using errcode = '22023';
  end if;
  if clean_cover is not null and clean_cover !~ '^https://[^[:space:]]+$' then
    raise exception 'Cover image must use a valid HTTPS URL' using errcode = '22023';
  end if;

  return query
  insert into public.journey_templates (
    creator_id, status, name, short_description, long_description, dream_fit,
    audience, prerequisites, outcome, language, cover_url, estimated_days,
    weekly_minutes, difficulty, tags, start_mode, completion_window_days,
    edit_policy, restart_policy, success_policy
  ) values (
    auth.uid(), 'draft', clean_name, nullif(btrim(p_short_description), ''),
    nullif(btrim(p_long_description), ''), nullif(btrim(p_dream_fit), ''),
    nullif(btrim(p_audience), ''), nullif(btrim(p_prerequisites), ''),
    nullif(btrim(p_outcome), ''), p_language, clean_cover, p_estimated_days,
    p_weekly_minutes, p_difficulty, coalesce(p_tags, '{}'), p_start_mode,
    p_completion_window_days, p_edit_policy, p_restart_policy,
    nullif(btrim(p_success_policy), '')
  )
  returning *;
end;
$$;

revoke all on function public.creator_create_template_draft(
  text,text,text,text,text,text,text,text,text,integer,integer,text,text[],text,integer,text,text,text
) from public, anon;
grant execute on function public.creator_create_template_draft(
  text,text,text,text,text,text,text,text,text,integer,integer,text,text[],text,integer,text,text,text
) to authenticated;

-- Suspended creators may not use SECURITY DEFINER analytics or read reviews.
create or replace function public.creator_template_reviews(p_template_id uuid)
returns table (rating integer, comment text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_creator() or not exists (
    select 1 from public.journey_templates t
    where t.id = p_template_id and t.creator_id = auth.uid()
  ) then
    return;
  end if;
  return query
    select r.rating, r.comment, r.created_at
    from public.template_reviews r
    where r.template_id = p_template_id
    order by r.created_at desc
    limit 200;
end;
$$;

-- Patch the single-template stats function's owner gate without changing its
-- result contract. A suspended creator receives no rows.
create or replace function public.creator_template_stats(p_template_id uuid)
returns table (
  template_id uuid, enrolled bigint, suppressed boolean, active bigint,
  paused bigint, completed bigint, abandoned bigint, completion_rate numeric,
  reviews bigint, average_rating numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n bigint;
  min_n integer := public.creator_min_cohort();
begin
  if not public.is_creator() or not exists (
    select 1 from public.journey_templates t
    where t.id = p_template_id and t.creator_id = auth.uid()
  ) then
    return;
  end if;

  select count(distinct e.participant_id) into n
  from public.template_enrollments e where e.template_id = p_template_id;

  if n < min_n then
    return query select p_template_id, n, true,
      null::bigint, null::bigint, null::bigint, null::bigint, null::numeric,
      null::bigint, null::numeric;
    return;
  end if;

  return query
  select p_template_id, n, false,
    count(*) filter (where e.state = 'active')::bigint,
    count(*) filter (where e.state = 'paused')::bigint,
    count(*) filter (where e.state = 'completed')::bigint,
    count(*) filter (where e.state = 'abandoned')::bigint,
    round(100.0 * count(*) filter (where e.state = 'completed') / nullif(count(*), 0), 1),
    (select count(*) from public.template_reviews r where r.template_id = p_template_id)::bigint,
    (select round(avg(r.rating), 2) from public.template_reviews r where r.template_id = p_template_id)
  from public.template_enrollments e where e.template_id = p_template_id;
end;
$$;
