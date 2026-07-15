-- Per-user monthly quotas for two more Claude-token features:
--   * Resume Reader   (POST /api/parse-resume)      -> resume_parse_usage
--   * Deadline lookup (dashboard "look up deadlines") -> deadline_lookup_usage
-- Both mirror the Angle Analyzer quota in rate_limit_schema.sql: one row per
-- user per calendar month (period = 'YYYY-MM', UTC), writes only through a
-- security-definer function so clients can't tamper with their own counts.

-- ---------------------------------------------------------------------------
-- Resume Reader
-- ---------------------------------------------------------------------------
create table if not exists resume_parse_usage (
  user_id uuid references auth.users(id) on delete cascade,
  period text not null,
  parse_count int not null default 0,
  primary key (user_id, period)
);

alter table resume_parse_usage enable row level security;

create policy "Users can read own resume parse usage"
  on resume_parse_usage for select
  using (auth.uid() = user_id);

-- Atomically reserve one parse for the current month and return the new count.
-- Returns -1 when the caller has already used up `max_parses` this month.
create or replace function consume_resume_parse(max_parses int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  current_period text := to_char(now() at time zone 'utc', 'YYYY-MM');
  new_count int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into resume_parse_usage (user_id, period, parse_count)
    values (auth.uid(), current_period, 1)
  on conflict (user_id, period)
    do update set parse_count = resume_parse_usage.parse_count + 1
    where resume_parse_usage.parse_count < max_parses
  returning parse_count into new_count;

  if new_count is null then
    return -1;
  end if;

  return new_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deadline lookup (only counted on a live/uncached web search)
-- ---------------------------------------------------------------------------
create table if not exists deadline_lookup_usage (
  user_id uuid references auth.users(id) on delete cascade,
  period text not null,
  lookup_count int not null default 0,
  primary key (user_id, period)
);

alter table deadline_lookup_usage enable row level security;

create policy "Users can read own deadline lookup usage"
  on deadline_lookup_usage for select
  using (auth.uid() = user_id);

-- Atomically reserve one lookup for the current month and return the new count.
-- Returns -1 when the caller has already used up `max_lookups` this month.
create or replace function consume_deadline_lookup(max_lookups int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  current_period text := to_char(now() at time zone 'utc', 'YYYY-MM');
  new_count int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into deadline_lookup_usage (user_id, period, lookup_count)
    values (auth.uid(), current_period, 1)
  on conflict (user_id, period)
    do update set lookup_count = deadline_lookup_usage.lookup_count + 1
    where deadline_lookup_usage.lookup_count < max_lookups
  returning lookup_count into new_count;

  if new_count is null then
    return -1;
  end if;

  return new_count;
end;
$$;
