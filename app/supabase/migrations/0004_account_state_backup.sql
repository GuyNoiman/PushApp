-- Account state — the backup that makes a lost phone survivable.
--
-- WHY THIS EXISTS AND WHAT IT CHANGES. Until now everything a person built — their Journeys, their
-- Dreams, their history, their Buddy — lived encrypted on ONE device and nowhere else. A lost phone
-- meant starting over, which the founder rightly called unreasonable (2026-08-24). He asked for the
-- model the large apps use: the content lives on the server and a new device gets it by signing in.
--
-- BE CLEAR ABOUT THE TRADE, because the privacy contract has to say it too: this row is readable by
-- the service, exactly as Instagram's servers can read what you post there. What protects it is
-- access control (the RLS below: your own row, nobody else's, no exceptions), transport encryption,
-- and the promise that we do not mine or sell it — not a key we cannot hold. The one thing that
-- stays end-to-end encrypted is direct messages, which are somebody ELSE's words as well as yours.
--
-- IT IS A BACKUP, NOT A MERGE. Last write wins, by `updated_at`. Two devices editing the same
-- Journey at once is a conflict this table does not resolve, and pretending otherwise would lose
-- data quietly. Real multi-device merge is its own project.

create table if not exists public.account_state (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  -- The AppState blob as JSON. Not `jsonb`: we never query INTO it, and text keeps it byte-identical
  -- to what the device wrote, which is what makes a restore exact.
  state        text not null,
  -- The device that wrote it and when, so a restore can say where it came from.
  schema_version integer not null default 1,
  device_label text,
  updated_at   timestamptz not null default now()
);

alter table public.account_state enable row level security;

drop policy if exists "account_state_own" on public.account_state;

-- YOUR OWN ROW, AND NOTHING ELSE. There is deliberately no policy that lets another authenticated
-- user read a row, and no "share" path anywhere: this table is a person's whole app, and the only
-- account that may touch it is theirs.
create policy "account_state_own" on public.account_state for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
