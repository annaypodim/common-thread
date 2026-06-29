-- Platform-specific drafts are deliberately separate from raw profile records.
-- source_id is not a foreign key because profile imports/edits may replace raw rows.
create table if not exists public.user_activity_list_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('common_app', 'uc')),
  source_kind text not null check (source_kind in ('activity', 'honor')),
  source_id uuid,
  category text not null default '',
  title text not null default '',
  position_title text not null default '',
  organization text not null default '',
  description text not null default '',
  grade_9 boolean not null default false,
  grade_10 boolean not null default false,
  grade_11 boolean not null default false,
  grade_12 boolean not null default false,
  hours_per_week numeric,
  weeks_per_year numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_activity_list_entries_user_platform_idx
on public.user_activity_list_entries (user_id, platform, sort_order);

alter table public.user_activity_list_entries enable row level security;

drop policy if exists "Users manage own activity list drafts" on public.user_activity_list_entries;
create policy "Users manage own activity list drafts" on public.user_activity_list_entries
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

