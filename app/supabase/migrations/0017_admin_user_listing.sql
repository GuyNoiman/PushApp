-- ============================================================================
-- 0017 — the Users page can list, not only search
--
-- 0014 deliberately shipped a SEARCH and no directory, and said why: managing
-- account types needs a way to find a person, and that is a smaller thing than a
-- list of everybody. That reasoning was right for a console nobody had signed
-- into yet. It stopped being the whole picture the moment there was an operator
-- who has to answer "how many people are on this?" and "did anybody sign up
-- today?" — questions a search cannot answer at all, because you have to already
-- know a name to ask one (founder, 2026-09-08).
--
-- So this adds listing, and keeps every protection that still means something:
--
--   · admin only, decided in Postgres, exactly like the search;
--   · capped, and paginated by a cursor rather than an offset, so no call can
--     ever return the whole table however it is driven;
--   · AUDITED — one row per page fetched. The point of the audit was never that
--     looking is rare. It is that looking is on the record, and a listing is
--     more worth recording than a search, not less.
--
-- What is deliberately NOT here: no free-text filter (that is the search, which
-- stays), and no ordering the caller chooses. Newest first, always — it is the
-- ordering the questions above actually want, and a caller-chosen sort is a
-- surface for probing the table one predicate at a time.
-- ============================================================================

create or replace function public.admin_list_users(
  p_limit  int         default 50,
  p_before timestamptz default null
)
returns table (
  user_id        uuid,
  handle         text,
  email          text,
  roles          text[],
  creator_stage  text,
  creator_status text,
  tier           text,
  created_at     timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- Clamped rather than trusted: the caller names a page size, it does not get
  -- to name the whole table.
  page int := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if not public.is_admin_member() then
    return;
  end if;

  insert into public.admin_audit (actor_id, action, subject)
  values (auth.uid(), 'admin.user_list', coalesce(p_before::text, 'first page'));

  return query
    select p.id,
           p.handle,
           u.email::text,
           coalesce(m.roles, '{}'::text[]),
           c.stage,
           c.status,
           coalesce(e.tier, 'free'),
           u.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.admin_members m on m.user_id = p.id
    left join public.creator_members c on c.user_id = p.id
    left join public.entitlements e on e.user_id = p.id
    -- Keyset pagination on the same column the ordering uses, so a page cannot
    -- silently skip or repeat somebody when a signup lands mid-read.
    where p_before is null or u.created_at < p_before
    order by u.created_at desc
    limit page;
end;
$$;

grant execute on function public.admin_list_users(int, timestamptz) to authenticated;

comment on function public.admin_list_users(int, timestamptz) is
  'Newest-first page of accounts for the operations console. Admin only, capped at 100, audited per page.';

-- How many people are on this, which is the one number a page of rows cannot
-- give you. Separate from the listing so it can be read without pulling rows.
create or replace function public.admin_count_users()
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin_member() then
    return null;
  end if;
  return (select count(*) from public.profiles);
end;
$$;

grant execute on function public.admin_count_users() to authenticated;

comment on function public.admin_count_users() is
  'Total accounts. Admin only; deliberately a count and nothing else.';
