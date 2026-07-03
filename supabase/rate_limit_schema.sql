-- Per-user monthly run quota for the Angle Analyzer.
-- One row per user per calendar month (period = 'YYYY-MM', UTC).
create table if not exists analysis_usage (
  user_id uuid references auth.users(id) on delete cascade,
  period text not null,
  run_count int not null default 0,
  primary key (user_id, period)
);

alter table analysis_usage enable row level security;

-- Users may read their own usage (to show "N re-runs left"). Writes go
-- exclusively through the security-definer function below, so there is no
-- insert/update policy — clients cannot tamper with their own counts.
create policy "Users can read own usage"
  on analysis_usage for select
  using (auth.uid() = user_id);

-- Atomically reserve one run for the current month and return the new count.
-- Returns -1 when the caller has already used up `max_runs` this month.
-- security definer so it can write past the (intentionally missing) RLS
-- write policy; search_path pinned to prevent hijacking.
create or replace function consume_analysis_run(max_runs int)
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

  insert into analysis_usage (user_id, period, run_count)
    values (auth.uid(), current_period, 1)
  on conflict (user_id, period)
    do update set run_count = analysis_usage.run_count + 1
    where analysis_usage.run_count < max_runs
  returning run_count into new_count;

  -- No row returned => the conflicting row failed the `run_count < max_runs`
  -- guard, i.e. the quota is already spent for this month.
  if new_count is null then
    return -1;
  end if;

  return new_count;
end;
$$;
