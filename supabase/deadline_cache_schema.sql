-- Shared, cross-user cache of looked-up application deadlines per college.
-- Deadlines are the same for every applicant, so one web search per college is
-- reused by everyone until it goes stale.
create table if not exists public.college_deadline_cache (
  college_key text primary key,   -- lowercased, trimmed college name
  college_name text not null,
  deadlines jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.college_deadline_cache enable row level security;

-- Reference data: any signed-in user may read it and refresh a stale entry.
drop policy if exists "Read deadline cache" on public.college_deadline_cache;
create policy "Read deadline cache" on public.college_deadline_cache
  for select to authenticated using (true);

drop policy if exists "Insert deadline cache" on public.college_deadline_cache;
create policy "Insert deadline cache" on public.college_deadline_cache
  for insert to authenticated with check (true);

drop policy if exists "Update deadline cache" on public.college_deadline_cache;
create policy "Update deadline cache" on public.college_deadline_cache
  for update to authenticated using (true) with check (true);
