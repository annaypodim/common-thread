create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  high_school text,
  intended_majors text,
  profile_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles
add column if not exists profile_complete boolean not null default false;

create table if not exists public.user_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text,
  position_title text,
  organization text,
  description text,
  grade_9 boolean not null default false,
  grade_10 boolean not null default false,
  grade_11 boolean not null default false,
  grade_12 boolean not null default false,
  avg_hours_per_week numeric,
  avg_weeks_per_year numeric,
  created_at timestamptz not null default now()
);

alter table public.user_activities
add column if not exists grade_9 boolean not null default false;

alter table public.user_activities
add column if not exists grade_10 boolean not null default false;

alter table public.user_activities
add column if not exists grade_11 boolean not null default false;

alter table public.user_activities
add column if not exists grade_12 boolean not null default false;

create table if not exists public.user_honors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  grade_9 boolean not null default false,
  grade_10 boolean not null default false,
  grade_11 boolean not null default false,
  grade_12 boolean not null default false,
  recognition_level text,
  eligibility_requirements text,
  achievement_description text,
  created_at timestamptz not null default now()
);

alter table public.user_honors
add column if not exists grade_9 boolean not null default false;

alter table public.user_honors
add column if not exists grade_10 boolean not null default false;

alter table public.user_honors
add column if not exists grade_11 boolean not null default false;

alter table public.user_honors
add column if not exists grade_12 boolean not null default false;

alter table public.user_honors
add column if not exists eligibility_requirements text;

alter table public.user_honors
add column if not exists achievement_description text;

alter table public.user_profiles enable row level security;
alter table public.user_activities enable row level security;
alter table public.user_honors enable row level security;

drop policy if exists "Users manage own profile" on public.user_profiles;
create policy "Users manage own profile" on public.user_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own activities" on public.user_activities;
create policy "Users manage own activities" on public.user_activities
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own honors" on public.user_honors;
create policy "Users manage own honors" on public.user_honors
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
