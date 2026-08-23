-- Direct messaging — conversations, sealed messages, and the public keys that make them readable.
--
-- WHAT THE SERVER CAN SEE, and it is the whole point of this file: who talked to whom, when, how
-- big it was, and what state the conversation is in. NOT what was said. `ciphertext_*` columns hold
-- sealed boxes (X25519 + XSalsa20-Poly1305, see `core/messaging/crypto.ts`) and there is deliberately
-- no column, view, index or function anywhere that could hold a plaintext body. A future feature
-- that wants to search or summarise messages does not get a schema change — it gets a product
-- decision, because it cannot be done without breaking the promise in Inbox PRD §14.1.
--
-- WHY TWO CIPHERTEXTS PER ROW: one sealed to the recipient and one to the sender, so a person can
-- read their own thread without the server ever holding a key.

-- ── 1. DEVICE PUBLIC KEYS ───────────────────────────────────────────────────
-- The public half only. The secret half lives in the device's secure store and never comes here.
alter table public.profiles add column if not exists message_public_key text;
alter table public.profiles add column if not exists message_key_updated_at timestamptz;

-- ── 2. CONVERSATIONS ────────────────────────────────────────────────────────
-- `id` is the canonical pair id (the two account ids, sorted, joined by '|'), so a pair can never
-- end up with two threads however the conversation was opened.
create table if not exists public.conversations (
  id           text primary key,
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  -- 'requested' until the recipient accepts; 'approved' once they have; 'blocked' is terminal.
  permission   text not null default 'requested'
               check (permission in ('requested','approved','blocked')),
  -- Who asked, so a request can be shown to the right person and rate-limited against the sender.
  requested_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  approved_at  timestamptz,
  -- Fixed to creation: later messages never extend a request's life (PRD §8.2).
  expires_at   timestamptz,
  last_message_at timestamptz,
  blocked_by   uuid references public.profiles(id) on delete set null,
  check (participant_a <> participant_b),
  check (participant_a < participant_b)   -- the sorted order the id is built from
);

create index if not exists conversations_a_idx on public.conversations (participant_a, last_message_at desc);
create index if not exists conversations_b_idx on public.conversations (participant_b, last_message_at desc);

alter table public.conversations enable row level security;

drop policy if exists "conversations_read_own"   on public.conversations;
drop policy if exists "conversations_create_own" on public.conversations;
drop policy if exists "conversations_update_own" on public.conversations;

-- A participant, and nobody else. There is no policy that lets anyone read a conversation they are
-- not in — not staff, not a service role acting for a client.
create policy "conversations_read_own" on public.conversations for select to authenticated
  using (participant_a = auth.uid() or participant_b = auth.uid());

-- You may open a conversation you are part of, and only as the person asking.
create policy "conversations_create_own" on public.conversations for insert to authenticated
  with check (
    (participant_a = auth.uid() or participant_b = auth.uid())
    and requested_by = auth.uid()
  );

-- Accepting, blocking and stamping the last message are all updates by a participant. The state
-- machine itself is enforced in the engine; RLS enforces WHO may touch the row.
create policy "conversations_update_own" on public.conversations for update to authenticated
  using (participant_a = auth.uid() or participant_b = auth.uid())
  with check (participant_a = auth.uid() or participant_b = auth.uid());

-- ── 3. MESSAGES ─────────────────────────────────────────────────────────────
create table if not exists public.messages (
  -- Client-generated, so a retry cannot duplicate a message (PRD §10.2).
  id              text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  -- Sealed to the recipient, and to the sender. Never a plaintext body.
  ciphertext_recipient text not null,
  ciphertext_sender    text not null,
  nonce           text not null,
  key_version     text not null,
  kind            text not null default 'text' check (kind in ('text','cheerTemplate')),
  created_at      timestamptz not null default now(),
  delivered_at    timestamptz,
  read_at         timestamptz
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages_read_participant" on public.messages;
drop policy if exists "messages_send_participant" on public.messages;
drop policy if exists "messages_update_participant" on public.messages;

create policy "messages_read_participant" on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
  ));

-- Send only as yourself, only into a conversation you are in, and never into a blocked one.
create policy "messages_send_participant" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
        and c.permission <> 'blocked'
    )
  );

-- Only the RECIPIENT may stamp delivered/read — a sender cannot mark their own message read.
create policy "messages_update_participant" on public.messages for update to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  )
  with check (sender_id <> auth.uid());

-- ── 4. MUTES ────────────────────────────────────────────────────────────────
-- Account-scoped so it follows a person across devices (PRD §12). `muted_until` null with a row
-- present means "until I turn it back on"; no row means not muted.
create table if not exists public.conversation_mutes (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  conversation_id text not null references public.conversations(id) on delete cascade,
  muted_until     timestamptz,
  primary key (user_id, conversation_id)
);

alter table public.conversation_mutes enable row level security;

drop policy if exists "mutes_own" on public.conversation_mutes;
create policy "mutes_own" on public.conversation_mutes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
