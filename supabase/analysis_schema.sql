-- Stores the latest angle analysis result per user
create table if not exists user_analyses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  result jsonb not null,
  analyzed_at timestamptz default now()
);

alter table user_analyses enable row level security;

create policy "Users can read own analysis"
  on user_analyses for select
  using (auth.uid() = user_id);

create policy "Users can upsert own analysis"
  on user_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own analysis"
  on user_analyses for update
  using (auth.uid() = user_id);
