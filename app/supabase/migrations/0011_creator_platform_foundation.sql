-- ============================================================================
-- Migration 0011 — the foundation under the Creator Journey Studio
-- ----------------------------------------------------------------------------
-- NOT YET APPLIED. Idempotent (if-not-exists / policies dropped first).
--
-- Built to `04_Product/PRD/Future/Creator_Journey_Authoring_Platform_PRD.md`
-- (Future Vision). That PRD's §20 lists promotion gates this does not meet and
-- does not claim to: this is the FOUNDATION the founder asked for — sign in,
-- prove you are a creator, see the Journey Templates you authored for the
-- community, and see what happened to them. Authoring the structure of a
-- template (Milestones, Steps, dependencies, release rules) is not here.
--
-- ── THE ONE DECISION EVERYTHING ELSE FOLLOWS FROM ──────────────────────────
--
-- §14: "Creators must not see private Dreams, individual reasons for misses,
-- personal Coach context, Ally activity, free-text answers, photos, or health
-- behavior… Aggregate completion analytics must not become surveillance."
--
-- So `template_enrollments` — the table that knows which person is on which
-- Journey Template — has **no select policy for a creator at all**. Not a
-- masked view, not a column grant. The creator's numbers come from SECURITY
-- DEFINER functions that return counts, exactly as `kpi_events` does in
-- migration 0008. A table a creator cannot select is a table that cannot
-- quietly become a participant list two features from now.
--
-- ── SUPPRESSION, AND WHERE IT ACTUALLY BELONGS ────────────────────────────
--
-- §14 requires minimum cohort thresholds. Applied literally to everything, a
-- creator with three participants sees nothing at all, which is not what the
-- requirement protects against — an enrolment COUNT identifies nobody.
-- Re-identification comes from the BREAKDOWN: "1 enrolled, 1 completed" is a
-- fact about a person. So the total is always shown and every breakdown is
-- suppressed below the threshold, which is the narrowest rule that satisfies
-- the requirement. The threshold is one constant, named, in one function.
--
-- ── WHY A `creator_members` ROW AND NOT A SUBSCRIPTION TIER ────────────────
--
-- The founder's intent is that creators eventually hold a different
-- subscription from ordinary users. `entitlements` already exists for that and
-- is service-role-written. It is deliberately NOT the check today, because
-- §13.1 is explicit that an open creator platform must not be the first
-- release: the first creators are invited, and "who was invited" is a different
-- fact from "who is paying". `is_creator()` is the seam — when the
-- subscription exists it is ORed in there, in one function, and nothing else in
-- the schema or the web app changes.
-- ============================================================================

-- ── 1. WHO MAY AUTHOR FOR THE COMMUNITY ────────────────────────────────────
create table if not exists public.creator_members (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  -- §13.1's release sequence, as data: internal team, then invited
  -- professionals, then a reviewed catalogue. It is not a permission level —
  -- it records WHICH release stage let this person in, which is what a later
  -- controlled rollout needs to know.
  stage        text not null default 'invited'
               check (stage in ('internal','invited','catalogue')),
  status       text not null default 'active' check (status in ('active','suspended')),
  -- The name shown ON a template. Separate from the account handle on purpose:
  -- a creator publishes under a professional identity, and §5.1 lists creator
  -- identity and credentials as template metadata rather than account profile.
  display_name text,
  credentials  text,
  added_at     timestamptz not null default now(),
  added_by     uuid references public.profiles(id)
);

alter table public.creator_members enable row level security;
drop policy if exists "creator_members_own" on public.creator_members;

-- A creator reads their OWN row and nobody else's, for the same reason an
-- operator does in 0008: the roster of who may publish is not a directory the
-- product needs to hand out.
create policy "creator_members_own" on public.creator_members for select to authenticated
  using (user_id = auth.uid());

-- A creator may edit their own published identity, and nothing else about their
-- membership.
--
-- The policy alone does NOT achieve that, and it is worth being explicit about
-- why: RLS is row-level. A policy saying "your own row" permits updating every
-- column of that row, so `stage` and `status` would be self-service — a
-- suspended creator could un-suspend themselves, which is not a subtle failure.
-- Column privileges are the mechanism that actually restricts columns, and they
-- compose with the policy: the row check says WHICH row, the grant says WHICH
-- columns.
drop policy if exists "creator_members_own_identity" on public.creator_members;
create policy "creator_members_own_identity" on public.creator_members for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke update on public.creator_members from authenticated;
grant update (display_name, credentials) on public.creator_members to authenticated;

/**
 * Is the caller a creator in good standing?
 *
 * SECURITY DEFINER, no argument, caller from auth.uid() — the same discipline as
 * has_admin_role(). THE SEAM: when a creator subscription exists, it is ORed in
 * here and only here.
 */
create or replace function public.is_creator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.creator_members m
    where m.user_id = auth.uid() and m.status = 'active'
  );
  -- Future, when the creator subscription lands (see the header):
  --   or exists (select 1 from public.entitlements e
  --              where e.user_id = auth.uid() and e.tier = 'subscriber' and …)
$$;

grant execute on function public.is_creator() to authenticated;

comment on function public.is_creator() is
  'The single creator capability check. Reads creator_members today; the future creator subscription is ORed in here and nowhere else.';

-- ── 2. THE JOURNEY TEMPLATE ────────────────────────────────────────────────
--
-- Terminology, exactly (Product_Terminology): a **Journey Template** is the
-- reusable definition; a **Journey Instance** is the participant's personal
-- copy. This table is the template. It is not a Course, a Program, a Plan or a
-- Workshop, and a creator describing their offering as a workshop externally
-- still publishes a Journey here.
--
-- The columns are §5.1 (identity and fit) and the subset of §5.2 (rules) that is
-- a field rather than a structure. The STRUCTURE — Milestones, Steps,
-- dependencies, release rules, rich Step types — is deliberately absent: it is
-- the authoring product, it is the largest open design in the PRD, and putting
-- an empty jsonb column here now would be a guess that later code would build
-- on.
create table if not exists public.journey_templates (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid not null references public.profiles(id) on delete cascade,

  -- §13's lifecycle. `published` is the only state that may be adopted.
  status            text not null default 'draft'
                    check (status in ('draft','private_test','in_review','changes_requested',
                                      'published','paused','retired','archived')),

  -- §5.1 identity and fit
  name              text not null,
  short_description text,
  long_description  text,
  -- "A paragraph describing which Dreams or aspirations it may fit." Descriptive
  -- metadata and a matching signal — adopting a template never creates, renames
  -- or links the participant's Dream (§5.1, last paragraph).
  dream_fit         text,
  audience          text,
  prerequisites     text,
  outcome           text,
  language          text not null default 'he',
  cover_url         text,
  estimated_days    integer check (estimated_days is null or estimated_days > 0),
  weekly_minutes    integer check (weekly_minutes is null or weekly_minutes > 0),
  difficulty        text check (difficulty is null or difficulty in ('gentle','moderate','demanding')),
  -- Discovery only. §5.1: "used for discovery, not exposed as user profiling."
  tags              text[] not null default '{}',

  -- §5.2 rules, the field-shaped subset
  start_mode        text not null default 'flexible' check (start_mode in ('fixed','flexible')),
  completion_window_days integer check (completion_window_days is null or completion_window_days > 0),
  edit_policy       text not null default 'editable'
                    check (edit_policy in ('editable','partially_editable','locked')),
  restart_policy    text not null default 'allowed' check (restart_policy in ('allowed','once','never')),
  -- §9: what completing this Journey MEANS. Held as text until §6's structure
  -- exists, because a completion threshold that references Steps cannot be
  -- expressed before Steps can.
  success_policy    text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  published_at      timestamptz
);

create index if not exists journey_templates_creator_idx on public.journey_templates (creator_id, updated_at desc);
create index if not exists journey_templates_published_idx on public.journey_templates (status, published_at desc);

alter table public.journey_templates enable row level security;
drop policy if exists "journey_templates_own" on public.journey_templates;
drop policy if exists "journey_templates_read_published" on public.journey_templates;

-- A creator owns their own templates entirely. `is_creator()` on the write side
-- as well as the ownership check: losing creator status must stop new authoring,
-- not just hide the studio's front door.
create policy "journey_templates_own" on public.journey_templates for all to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid() and public.is_creator());

-- Anybody signed in may read a PUBLISHED template — that is what publishing
-- means. A draft is the creator's alone.
create policy "journey_templates_read_published" on public.journey_templates for select to authenticated
  using (status = 'published');

-- `stamp_updated_at()` was defined in schema.sql, not in a numbered migration, so
-- a fresh project running migrations alone would not have it. Repeated verbatim
-- rather than assumed: a server-stamped timestamp cannot be forged by a client,
-- and that property should not depend on which file somebody ran.
create or replace function public.stamp_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_journey_templates_stamp on public.journey_templates;
create trigger trg_journey_templates_stamp before insert or update
  on public.journey_templates for each row execute function public.stamp_updated_at();

-- ── 3. WHO IS ON ONE, AND HOW IT WENT ──────────────────────────────────────
--
-- One row per Journey Instance created from a template. Read the header before
-- adding a select policy to this table for a creator: there is none, on purpose.
create table if not exists public.template_enrollments (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references public.journey_templates(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,

  -- The lifecycle the creator's numbers are counted from. `abandoned` is a real,
  -- named outcome rather than the absence of activity — Journey_Abandonment_PRD
  -- treats abandoning as something a person DOES, and a template's honest
  -- analytics need the same distinction.
  state          text not null default 'active'
                 check (state in ('active','paused','completed','abandoned')),
  started_at     timestamptz not null default now(),
  last_activity_at timestamptz,
  completed_at   timestamptz,
  ended_at       timestamptz,

  -- ONE ROW PER PERSON PER TEMPLATE, and the reason is arithmetic rather than
  -- tidiness. Without it, "enrolled" (distinct participants) and the breakdown
  -- (rows by state) count different things, so a person who restarted would
  -- make 12 completions out of 10 participants — and the first person to notice
  -- would be a creator who cannot be shown the rows to check.
  --
  -- The cost is that per-attempt history is not kept: a restart moves this row
  -- back to `active`. The restart policy exists on the template, so attempts ARE
  -- a real thing; how to count them is a decision worth making with real data
  -- rather than now, and a separate attempts table can be added without moving
  -- anything that already exists.
  unique (template_id, participant_id)
);

create index if not exists template_enrollments_template_idx
  on public.template_enrollments (template_id, state);
create index if not exists template_enrollments_participant_idx
  on public.template_enrollments (participant_id);

alter table public.template_enrollments enable row level security;
drop policy if exists "template_enrollments_own" on public.template_enrollments;

-- The participant, and only the participant. They may enrol themselves, read
-- their own row and update their own state. There is deliberately no policy
-- naming a creator anywhere in this table.
create policy "template_enrollments_own" on public.template_enrollments for all to authenticated
  using (participant_id = auth.uid())
  with check (participant_id = auth.uid());

-- ── 4. WHAT PARTICIPANTS SAID, WHEN THEY CHOSE TO SAY IT ──────────────────
--
-- A review is the one piece of free text a creator sees, and it is not an
-- exception to §14 — §14 forbids free-text ANSWERS, photos, reports and Coach
-- context, which are things a person wrote for themselves or for the coach. A
-- review is written knowingly, to be read by the creator. That is the whole
-- difference, and it is why the reviewer's identity still never travels with it.
create table if not exists public.template_reviews (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references public.journey_templates(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  rating         integer not null check (rating between 1 and 5),
  -- Optional. A rating with no words is a complete review.
  comment        text,
  created_at     timestamptz not null default now(),
  -- One review per person per template. A second one edits the first.
  unique (template_id, participant_id)
);

create index if not exists template_reviews_template_idx on public.template_reviews (template_id, created_at desc);

alter table public.template_reviews enable row level security;
drop policy if exists "template_reviews_own" on public.template_reviews;

-- Same shape as enrolments: the author, and nobody else, through the table. The
-- creator reads reviews through a function that cannot return an identity.
create policy "template_reviews_own" on public.template_reviews for all to authenticated
  using (participant_id = auth.uid())
  with check (participant_id = auth.uid());

-- ── 5. WHAT THE CREATOR IS ALLOWED TO KNOW ────────────────────────────────

/**
 * The suppression threshold (§14). One constant, named once.
 *
 * Five is the smallest cohort in which a breakdown does not point at a person:
 * with four, "3 completed, 1 abandoned" plus anything the creator knows from
 * outside the product is often enough. It is a function rather than a literal so
 * that changing it is one edit and shows up in a diff as a decision.
 */
create or replace function public.creator_min_cohort()
returns integer language sql immutable as $$ select 5 $$;

/**
 * The numbers behind one template.
 *
 * `enrolled` is always returned: a total identifies nobody. Every breakdown is
 * null when the cohort is below the threshold, and `suppressed` says so, so the
 * studio can show "not enough participants yet" rather than a zero that reads
 * as a fact about the Journey.
 */
create or replace function public.creator_template_stats(p_template_id uuid)
returns table (
  template_id uuid,
  enrolled bigint,
  suppressed boolean,
  active bigint,
  paused bigint,
  completed bigint,
  abandoned bigint,
  completion_rate numeric,
  reviews bigint,
  average_rating numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n bigint;
  min_n integer := public.creator_min_cohort();
  owns boolean;
begin
  -- The ownership check is inside the function because the function is SECURITY
  -- DEFINER: it runs past RLS, so it has to ask the question RLS would have.
  select exists (
    select 1 from public.journey_templates t
    where t.id = p_template_id and t.creator_id = auth.uid()
  ) into owns;
  if not owns then
    return; -- no rows: "you may not ask", which is not the same as zeros
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
  select
    p_template_id,
    n,
    false,
    count(*) filter (where e.state = 'active')::bigint,
    count(*) filter (where e.state = 'paused')::bigint,
    count(*) filter (where e.state = 'completed')::bigint,
    count(*) filter (where e.state = 'abandoned')::bigint,
    round(100.0 * count(*) filter (where e.state = 'completed') / nullif(count(*), 0), 1),
    (select count(*) from public.template_reviews r where r.template_id = p_template_id)::bigint,
    (select round(avg(r.rating), 2) from public.template_reviews r where r.template_id = p_template_id)
  from public.template_enrollments e
  where e.template_id = p_template_id;
end;
$$;

grant execute on function public.creator_template_stats(uuid) to authenticated;

/**
 * The same numbers for every template this creator owns, so the profile page is
 * one request rather than one per row.
 */
create or replace function public.creator_my_template_stats()
returns table (
  template_id uuid,
  enrolled bigint,
  suppressed boolean,
  active bigint,
  completed bigint,
  abandoned bigint,
  average_rating numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  min_n integer := public.creator_min_cohort();
begin
  if not public.is_creator() then
    return;
  end if;
  return query
  with mine as (
    select t.id from public.journey_templates t where t.creator_id = auth.uid()
  ),
  counted as (
    select m.id,
           count(distinct e.participant_id) as n,
           count(e.id) filter (where e.state = 'active') as a,
           count(e.id) filter (where e.state = 'completed') as c,
           count(e.id) filter (where e.state = 'abandoned') as ab
    from mine m
    left join public.template_enrollments e on e.template_id = m.id
    group by m.id
  )
  select c.id,
         c.n,
         c.n < min_n,
         case when c.n < min_n then null else c.a end,
         case when c.n < min_n then null else c.c end,
         case when c.n < min_n then null else c.ab end,
         case when c.n < min_n then null
              else (select round(avg(r.rating), 2) from public.template_reviews r where r.template_id = c.id) end
  from counted c;
end;
$$;

grant execute on function public.creator_my_template_stats() to authenticated;

/**
 * The reviews, without the reviewers.
 *
 * The participant id is not in the return type at all. It cannot be selected,
 * joined or leaked by a later `select *` — the shape of the function is the
 * guarantee, rather than a caller remembering to drop a column.
 *
 * Reviews are NOT cohort-suppressed. A review is written to be read by the
 * creator; withholding it would be withholding something a person deliberately
 * said. What is protected is who said it.
 */
create or replace function public.creator_template_reviews(p_template_id uuid)
returns table (rating integer, comment text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
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

grant execute on function public.creator_template_reviews(uuid) to authenticated;

-- ── 6. BOOTSTRAP ──────────────────────────────────────────────────────────
--
-- As in 0010, no first creator is inserted here: a migration that named one
-- would put a permanent claim about a person in the repository. Run once, by
-- hand, with the account's auth user id:
--
--     insert into public.creator_members (user_id, stage, display_name)
--     values ('<the auth user id>', 'internal', 'Guy Noiman')
--     on conflict (user_id) do update set stage = excluded.stage;
--
-- Until that row exists the studio signs in and says the account is not a
-- creator, which is the check working.
