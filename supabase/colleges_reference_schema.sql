create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  state text,
  zip text,
  website text
);

create index if not exists colleges_name_idx on public.colleges(name);
create index if not exists colleges_state_idx on public.colleges(state);

alter table public.colleges enable row level security;

-- Anyone authenticated can read the shared colleges list
drop policy if exists "Authenticated users can read colleges" on public.colleges;
create policy "Authenticated users can read colleges" on public.colleges
for select using (auth.role() = 'authenticated');

-- Only service role can insert/update/delete (used for seeding)
