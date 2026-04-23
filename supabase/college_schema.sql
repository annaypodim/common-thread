create table if not exists public.user_colleges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  college_name text not null,
  state text,
  intended_major text,
  address text,
  city text,
  zip text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, college_name, state)
);

alter table public.user_colleges
add column if not exists state text;

alter table public.user_colleges
add column if not exists intended_major text;

alter table public.user_colleges
add column if not exists address text;

alter table public.user_colleges
add column if not exists city text;

alter table public.user_colleges
add column if not exists zip text;

alter table public.user_colleges
add column if not exists website text;

alter table public.user_colleges enable row level security;

drop policy if exists "Users manage own colleges" on public.user_colleges;
create policy "Users manage own colleges" on public.user_colleges
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
