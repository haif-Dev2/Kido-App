-- ═══════════════════════════════════════════════════════════════
--  Chat / messaging schema
--  Run this in your Supabase SQL editor once.
-- ═══════════════════════════════════════════════════════════════

-- ─── Table: messages ───
-- Each row = one chat bubble between the current user and a partner.
-- `partner_key` is a flexible identifier:
--   • "sitter-<id>" while sitters are mock data
--   • a user UUID later when sitters become real accounts
create table if not exists public.messages (
  id           bigserial primary key,
  sender_id    uuid not null references auth.users(id) on delete cascade,
  partner_key  text not null,
  -- the text content of the bubble
  text         text not null check (char_length(text) between 1 and 2000),
  -- null until recipient has opened the conversation
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- Fast lookup for a conversation between sender & partner
create index if not exists messages_conv_idx
  on public.messages (sender_id, partner_key, created_at desc);

-- Index for the "inbox" query (latest message per partner)
create index if not exists messages_partner_idx
  on public.messages (partner_key, created_at desc);

-- ─── Row-Level Security ───
alter table public.messages enable row level security;

-- A user can read:
--   • messages THEY sent (sender_id = auth.uid())
--   • messages where THEY are the partner (partner_key = auth.uid()::text)
drop policy if exists "read own chat" on public.messages;
create policy "read own chat"
  on public.messages for select
  using (
    sender_id = auth.uid()
    or partner_key = auth.uid()::text
  );

-- A user can insert only their own messages
drop policy if exists "send own chat" on public.messages;
create policy "send own chat"
  on public.messages for insert
  with check (sender_id = auth.uid());

-- A user can mark messages sent TO them as read
drop policy if exists "mark read" on public.messages;
create policy "mark read"
  on public.messages for update
  using (partner_key = auth.uid()::text)
  with check (partner_key = auth.uid()::text);

-- ─── Enable realtime on this table ───
-- (Supabase automatically picks up public tables with replication)
alter publication supabase_realtime add table public.messages;
