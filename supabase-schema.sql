-- supabase-schema.sql
-- Run this once in your Supabase project (SQL Editor) so the in-app Inbox works.
--
-- The service-role key (used by the server) bypasses Row Level Security, so no
-- policies are required.

create table if not exists public.emails (
  id            uuid primary key default gen_random_uuid(),
  sender        text not null default '',
  recipient     text,
  subject       text,
  body_text     text,
  body_html     text,
  attachments   jsonb not null default '[]'::jsonb,
  metadata      jsonb not null default '{}'::jsonb,
  is_read       boolean not null default false,
  starred       boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.emails enable row level security;

create index if not exists emails_created_idx on public.emails (created_at desc);
create index if not exists emails_sender_idx  on public.emails (sender);

-- Daily sent-mail log (powers the "Sent today: X / 100" counter).
create table if not exists public.sends (
  id            uuid primary key default gen_random_uuid(),
  sender        text not null default '',
  recipient     text,
  template      text,
  subject       text,
  provider      text,
  message_id    text,
  created_at    timestamptz not null default now()
);

alter table public.sends enable row level security;

create index if not exists sends_created_idx on public.sends (created_at desc);
