-- ============================================================================
-- Migration 0014 — who may change whose permissions
-- ----------------------------------------------------------------------------
-- Idempotent. Founder decision, 2026-08-29:
--
--   super admin — one person. May change anyone's permissions, including
--                 another super admin's.
--   admin       — may change anyone EXCEPT a super admin, and may NOT add or
--                 remove staff. "Every addition of a team member goes through
--                 me" (founder), which is also the stronger model: a compromised
--                 admin account cannot mint itself a second one.
--
-- ── THE TRAP THIS FILE EXISTS TO AVOID ────────────────────────────────────
--
-- `has_admin_role` in 0008 answers TRUE for any role when the caller holds
-- `owner`:
--
--     where m.roles @> array[p_role] or m.roles @> array['owner']
--
-- So simply adding a role named `super_admin` would make every existing admin a
-- super admin, silently, with nothing failing. That is the same shape as the two
-- bugs already found in this schema — a check that reads correctly and answers a
-- different question.
--
-- Hence `is_super_admin()`: its own function, with NO owner shortcut, and
-- `has_admin_role` is taught to route `super_admin` to it rather than to the
-- shortcut. One place decides.
--
-- ── WHAT THIS OPENS, SAID PLAINLY ────────────────────────────────────────
--
-- Until now the console had no user directory, deliberately. Managing account
-- types needs one, so `admin_search_users` exists — and it is a SEARCH, not a
-- listing: it refuses a query shorter than two characters, caps its results, and
-- writes an audit row for every call. An operator cannot enumerate the user base
-- from it, and every look is on the record.
-- ============================================================================

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_members m
    where m.user_id = auth.uid() and m.roles @> array['super_admin']
  );
$$;

grant execute on function public.is_super_admin() to authenticated;

comment on function public.is_super_admin() is
  'The one role with no shortcut into it. has_admin_role routes super_admin here rather than to the owner clause.';

-- Rewritten so `owner` can no longer answer for `super_admin`. Every other role
-- behaves exactly as it did in 0008 — deliberately the smallest possible change
-- to a function many policies depend on.
create or replace function public.has_admin_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_role = 'super_admin' then public.is_super_admin()
    else exists (
      select 1 from public.admin_members m
      where m.user_id = auth.uid()
        and (m.roles @> array[p_role] or m.roles @> array['owner'])
    )
  end;
$$;

-- ── Looking somebody up ────────────────────────────────────────────────────
--
-- Returns the three facts the console shows side by side, which live in three
-- tables on purpose: staff role, creator access, paid tier. They answer
-- different questions — who works here, who may publish, who is paying — and
-- collapsing them would make the eventual creator subscription a schema change
-- rather than a row.
create or replace function public.admin_search_users(p_query text)
returns table (
  user_id uuid,
  handle text,
  email text,
  roles text[],
  creator_stage text,
  creator_status text,
  tier text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  needle text := lower(trim(coalesce(p_query, '')));
begin
  if not public.is_admin_member() then
    return;
  end if;
  -- A search, not a directory. Two characters is the shortest thing that is
  -- still a search; an empty one would be "show me everybody".
  if length(needle) < 2 then
    return;
  end if;

  insert into public.admin_audit (actor_id, action, subject)
  values (auth.uid(), 'admin.user_search', left(needle, 40));

  return query
    select p.id,
           p.handle,
           u.email::text,
           coalesce(m.roles, '{}'::text[]),
           c.stage,
           c.status,
           coalesce(e.tier, 'free')
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.admin_members m on m.user_id = p.id
    left join public.creator_members c on c.user_id = p.id
    left join public.entitlements e on e.user_id = p.id
    where lower(p.handle) like '%' || needle || '%'
       or lower(u.email::text) like '%' || needle || '%'
    order by p.handle
    limit 25;
end;
$$;

grant execute on function public.admin_search_users(text) to authenticated;

-- ── Changing a staff role — super admin only ──────────────────────────────
create or replace function public.admin_set_staff_roles(p_user uuid, p_roles text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  next_roles text[] := coalesce(p_roles, '{}'::text[]);
  was_super boolean;
  supers integer;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin may add or remove a team member';
  end if;

  select coalesce(roles, '{}') @> array['super_admin'] into was_super
  from public.admin_members where user_id = p_user;

  -- Never lock the product out of its own administration. If this call would
  -- remove the last super admin it is refused: there is no path back from a
  -- schema whose only administrator has just demoted themselves.
  if coalesce(was_super, false) and not (next_roles @> array['super_admin']) then
    select count(*) into supers from public.admin_members where roles @> array['super_admin'];
    if supers <= 1 then
      raise exception 'This is the last super admin; promote somebody else first';
    end if;
  end if;

  if array_length(next_roles, 1) is null then
    delete from public.admin_members where user_id = p_user;
  else
    insert into public.admin_members (user_id, roles, added_by)
    values (p_user, next_roles, auth.uid())
    on conflict (user_id) do update set roles = excluded.roles;
  end if;

  insert into public.admin_audit (actor_id, action, subject)
  values (auth.uid(), 'admin.roles_change', p_user::text || ' -> ' || array_to_string(next_roles, ','));

  return next_roles;
end;
$$;

grant execute on function public.admin_set_staff_roles(uuid, text[]) to authenticated;

-- ── Creator access and paid tier — any admin, except on a super admin ─────
--
-- The shared guard, written once so the two callers cannot drift apart.
create or replace function public.admin_may_change(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
      or (public.is_admin_member()
          and not exists (
            select 1 from public.admin_members m
            where m.user_id = p_user and m.roles @> array['super_admin']
          ));
$$;

grant execute on function public.admin_may_change(uuid) to authenticated;

create or replace function public.admin_set_creator(p_user uuid, p_stage text, p_status text default 'active')
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_may_change(p_user) then
    raise exception 'You may not change this account';
  end if;
  if p_stage is null then
    delete from public.creator_members where user_id = p_user;
  else
    if p_stage not in ('internal','invited','catalogue') then
      raise exception 'Unknown creator stage';
    end if;
    if p_status not in ('active','suspended') then
      raise exception 'Unknown creator status';
    end if;
    insert into public.creator_members (user_id, stage, status, added_by)
    values (p_user, p_stage, p_status, auth.uid())
    on conflict (user_id) do update set stage = excluded.stage, status = excluded.status;
  end if;

  insert into public.admin_audit (actor_id, action, subject)
  values (auth.uid(), 'admin.creator_change', p_user::text || ' -> ' || coalesce(p_stage || '/' || p_status, 'none'));

  return p_stage;
end;
$$;

grant execute on function public.admin_set_creator(uuid, text, text) to authenticated;

-- The paid tier.
--
-- `entitlements` has no update policy for `authenticated` — the client can never
-- upgrade itself, and that stays true: this is a SECURITY DEFINER function with
-- an explicit caller check, not a policy that opens the table. `source` is
-- stamped `grant`, which is what that column exists to distinguish from a
-- verified receipt.
create or replace function public.admin_set_tier(p_user uuid, p_tier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_may_change(p_user) then
    raise exception 'You may not change this account';
  end if;
  if p_tier not in ('free','trial','subscriber') then
    raise exception 'Unknown tier';
  end if;

  insert into public.entitlements (user_id, tier, source)
  values (p_user, p_tier, 'grant')
  on conflict (user_id) do update set tier = excluded.tier, source = 'grant';

  insert into public.admin_audit (actor_id, action, subject)
  values (auth.uid(), 'admin.tier_change', p_user::text || ' -> ' || p_tier);

  return p_tier;
end;
$$;

grant execute on function public.admin_set_tier(uuid, text) to authenticated;

-- ── Bootstrap ─────────────────────────────────────────────────────────────
--
-- No super admin is named here, for the reason 0010 and 0011 name nobody: a file
-- in the repository that says who runs production is a permanent claim about a
-- person. Run once, by hand, on the account that already holds `owner`:
--
--     update public.admin_members
--        set roles = array['super_admin','owner']
--      where user_id = (select id from auth.users where email = 'you@example.com');
--
-- Until that row exists nobody is a super admin, staff roles cannot be changed
-- from the console, and the SQL editor remains the only way in — which is the
-- correct failure, not a bug.
