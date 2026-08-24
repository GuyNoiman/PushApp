-- Mirror Feedback — asking a few people what they see, without ever handing back the raw answers.
--
-- THE ONE RULE THIS SCHEMA EXISTS TO ENFORCE (Mirror_Feedback_PRD §11): in CONFIDENTIAL mode the
-- requester must never be able to reach a contributor's raw words — not through the UI, not through
-- an API, not through an export, not through a mistake. That is why `mirror_responses` has NO policy
-- that lets a requester select it. The synthesis they read is written by a service-role function and
-- lives in a different table; the raw rows are reachable only by the person who wrote them.
--
-- In VISIBLE mode the contributor agreed to be quoted by name, and the requester reads the answers
-- directly. Two modes, two different promises, and the promise is kept by the policies rather than
-- by the screens.

-- ── 1. ROUNDS ───────────────────────────────────────────────────────────────
create table if not exists public.mirror_rounds (
  id           text primary key,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  mode         text not null check (mode in ('visible','confidential')),
  -- The five chosen questions, as ids from the authored bank (or 'custom:<n>' with its text held in
  -- `custom_questions`). Ids, never a person's own words about themselves.
  question_ids text[] not null,
  custom_questions text[] not null default '{}',
  status       text not null default 'draft' check (status in ('draft','open','closed')),
  opened_at    timestamptz,
  closes_at    timestamptz,
  closed_at    timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.mirror_rounds enable row level security;
drop policy if exists "mirror_rounds_own" on public.mirror_rounds;
drop policy if exists "mirror_rounds_invited" on public.mirror_rounds;

create policy "mirror_rounds_own" on public.mirror_rounds for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());


-- ── 2. INVITATIONS ──────────────────────────────────────────────────────────
create table if not exists public.mirror_invitations (
  round_id       text not null references public.mirror_rounds(id) on delete cascade,
  contributor_id uuid not null references public.profiles(id) on delete cascade,
  -- 'sent' → 'answered' | 'declined'. The requester may see this ONLY in visible mode; the client is
  -- responsible for not showing it in confidential mode, and the synthesis never exposes it.
  status         text not null default 'sent' check (status in ('sent','answered','declined')),
  invited_at     timestamptz not null default now(),
  answered_at    timestamptz,
  primary key (round_id, contributor_id)
);

alter table public.mirror_invitations enable row level security;
drop policy if exists "mirror_invitations_owner" on public.mirror_invitations;
drop policy if exists "mirror_invitations_mine" on public.mirror_invitations;
drop policy if exists "mirror_invitations_respond" on public.mirror_invitations;

-- The owner creates and reads invitations (who was asked). In confidential mode the CLIENT must not
-- surface per-person status; what the server allows here is the minimum the owner needs to know how
-- many people were invited at all.
create policy "mirror_invitations_owner" on public.mirror_invitations for all to authenticated
  using (exists (select 1 from public.mirror_rounds r where r.id = round_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.mirror_rounds r where r.id = round_id and r.owner_id = auth.uid()));

-- A contributor reads their own invitation.
create policy "mirror_invitations_mine" on public.mirror_invitations for select to authenticated
  using (contributor_id = auth.uid());

-- …and answers or declines it, and nothing more.
create policy "mirror_invitations_respond" on public.mirror_invitations for update to authenticated
  using (contributor_id = auth.uid()) with check (contributor_id = auth.uid());

-- ── 3. RESPONSES ────────────────────────────────────────────────────────────
create table if not exists public.mirror_responses (
  id             uuid primary key default gen_random_uuid(),
  round_id       text not null references public.mirror_rounds(id) on delete cascade,
  contributor_id uuid not null references public.profiles(id) on delete cascade,
  question_id    text not null,
  body           text not null,
  created_at     timestamptz not null default now(),
  unique (round_id, contributor_id, question_id)
);

alter table public.mirror_responses enable row level security;
drop policy if exists "mirror_responses_write_own" on public.mirror_responses;
drop policy if exists "mirror_responses_read_own" on public.mirror_responses;
drop policy if exists "mirror_responses_read_visible" on public.mirror_responses;

-- Write your own answer, into a round you were actually invited to, while it is open.
create policy "mirror_responses_write_own" on public.mirror_responses for insert to authenticated
  with check (
    contributor_id = auth.uid()
    and exists (
      select 1 from public.mirror_invitations i
      join public.mirror_rounds r on r.id = i.round_id
      where i.round_id = mirror_responses.round_id
        and i.contributor_id = auth.uid()
        and r.status = 'open'
    )
  );

-- Read back what YOU wrote — a person may always see their own words.
create policy "mirror_responses_read_own" on public.mirror_responses for select to authenticated
  using (contributor_id = auth.uid());

-- THE REQUESTER READS RAW ANSWERS ONLY IN VISIBLE MODE. There is deliberately no equivalent policy
-- for confidential rounds: that is the guarantee, and it lives here rather than in a screen.
create policy "mirror_responses_read_visible" on public.mirror_responses for select to authenticated
  using (exists (
    select 1 from public.mirror_rounds r
    where r.id = round_id and r.owner_id = auth.uid() and r.mode = 'visible'
  ));

-- ── 4. SYNTHESIS ────────────────────────────────────────────────────────────
-- What a confidential round gives back: one de-identified paragraph per question, written by a
-- service-role process that can read the raw rows. The requester reads THIS and only this.
create table if not exists public.mirror_synthesis (
  round_id    text not null references public.mirror_rounds(id) on delete cascade,
  question_id text not null,
  body        text not null,
  created_at  timestamptz not null default now(),
  primary key (round_id, question_id)
);

alter table public.mirror_synthesis enable row level security;
drop policy if exists "mirror_synthesis_owner_read" on public.mirror_synthesis;

-- Read-only, and only the owner. There is NO client insert policy: a synthesis a client could write
-- is a synthesis a client could forge, and the whole point is that it came from a process the
-- requester cannot influence.
create policy "mirror_synthesis_owner_read" on public.mirror_synthesis for select to authenticated
  using (exists (select 1 from public.mirror_rounds r where r.id = round_id and r.owner_id = auth.uid()));

-- ── 5. THE CROSS-TABLE POLICY ───────────────────────────────────────────────
-- Declared last, because it reads a table defined further down the file.
-- An invited contributor may READ the round they were asked to answer — they need its questions and
-- its mode to know what they are agreeing to. Nothing else about it.
create policy "mirror_rounds_invited" on public.mirror_rounds for select to authenticated
  using (exists (
    select 1 from public.mirror_invitations i
    where i.round_id = mirror_rounds.id and i.contributor_id = auth.uid()
  ));
