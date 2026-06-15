-- Stores application deadlines for a user's saved colleges.
-- Each saved college can have multiple deadlines (e.g. Early Action, Regular Decision).
create table if not exists public.user_college_deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_college_id uuid not null references public.user_colleges(id) on delete cascade,
  college_name text not null,
  label text not null,
  due_date date not null,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_college_id, label, due_date)
);

-- Official page the date was sourced from, so students can verify it.
alter table public.user_college_deadlines
add column if not exists source_url text;

create index if not exists user_college_deadlines_user_id_idx
  on public.user_college_deadlines(user_id);
create index if not exists user_college_deadlines_due_date_idx
  on public.user_college_deadlines(due_date);

alter table public.user_college_deadlines enable row level security;

drop policy if exists "Users manage own deadlines" on public.user_college_deadlines;
create policy "Users manage own deadlines" on public.user_college_deadlines
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_user_college_deadlines_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_college_deadlines_set_updated_at on public.user_college_deadlines;
create trigger user_college_deadlines_set_updated_at
before update on public.user_college_deadlines
for each row execute function public.set_user_college_deadlines_updated_at();
