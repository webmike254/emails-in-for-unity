-- Unity Shared Inbox schema — run in Supabase SQL Editor

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text default 'member',
  color text default '#3b82f6',
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  company text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  snippet text,
  is_starred boolean default false,
  is_archived boolean default false,
  assigned_to uuid references public.team_members(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  mailersend_id text,
  from_email text not null,
  from_name text,
  to_email text not null,
  to_name text,
  subject text not null,
  body_html text,
  body_text text,
  status text not null default 'received',
  is_read boolean default false,
  sent_by uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists threads_last_message_idx on public.threads (last_message_at desc);
create index if not exists threads_assigned_idx on public.threads (assigned_to);
create index if not exists messages_thread_idx on public.messages (thread_id);
create index if not exists messages_created_idx on public.messages (created_at desc);

alter table public.team_members enable row level security;
alter table public.contacts enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;

drop policy if exists "all" on public.team_members;
drop policy if exists "all" on public.contacts;
drop policy if exists "all" on public.threads;
drop policy if exists "all" on public.messages;

create policy "all" on public.team_members for all using (true) with check (true);
create policy "all" on public.contacts for all using (true) with check (true);
create policy "all" on public.threads for all using (true) with check (true);
create policy "all" on public.messages for all using (true) with check (true);

insert into public.team_members (name, email, role, color) values
  ('Amara Njoroge', 'hr@unity-software.online', 'HR Manager', '#f59e0b'),
  ('Daniel Ochieng', 'hiring@unity-software.online', 'Hiring Manager', '#3b82f6'),
  ('Grace Wambui', 'director@unity-software.online', 'Director', '#8b5cf6'),
  ('Team Shared', 'hello@unity-software.online', 'General', '#10b981')
on conflict (email) do nothing;
