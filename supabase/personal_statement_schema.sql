-- One central personal statement draft per user, independent of colleges.
create table if not exists public.user_personal_statements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content text not null default '',
  status text not null default 'not_started'
    check (status in ('not_started', 'drafting', 'needs_revision', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_personal_statements enable row level security;

drop policy if exists "Users manage own personal statement" on public.user_personal_statements;
create policy "Users manage own personal statement"
  on public.user_personal_statements
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
