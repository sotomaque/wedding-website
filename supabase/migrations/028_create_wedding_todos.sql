-- Wedding Todos table
-- Run this migration in the Supabase SQL Editor

create table if not exists wedding_todos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  is_completed boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for sorting by completion status and order
create index if not exists idx_wedding_todos_order on wedding_todos (is_completed, display_order);

-- Enable RLS (required by Supabase, but we access via server-side only)
alter table wedding_todos enable row level security;
