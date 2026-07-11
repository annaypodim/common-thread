-- Per-user monthly message quota for the College Research Helper (AI chat).
-- One row per user per calendar month (period = 'YYYY-MM', UTC).
-- Mirrors the Angle Analyzer quota in rate_limit_schema.sql.
create table if not exists research_chat_usage (
  user_id uuid references auth.users(id) on delete cascade,
  period text not null,
  message_count int not null default 0,
  primary key (user_id, period)
);

alter table research_chat_usage enable row level security;

-- Users may read their own usage (to show "N messages left"). Writes go
-- exclusively through the security-definer function below, so there is no
-- insert/update policy — clients cannot tamper with their own counts.
create policy "Users can read own research chat usage"
  on research_chat_usage for select
  using (auth.uid() = user_id);

-- Atomically reserve one message for the current month and return the new count.
-- Returns -1 when the caller has already used up `max_msgs` this month.
-- security definer so it can write past the (intentionally missing) RLS
-- write policy; search_path pinned to prevent hijacking.
create or replace function consume_research_chat_message(max_msgs int)
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

  insert into research_chat_usage (user_id, period, message_count)
    values (auth.uid(), current_period, 1)
  on conflict (user_id, period)
    do update set message_count = research_chat_usage.message_count + 1
    where research_chat_usage.message_count < max_msgs
  returning message_count into new_count;

  -- No row returned => the conflicting row failed the `message_count < max_msgs`
  -- guard, i.e. the quota is already spent for this month.
  if new_count is null then
    return -1;
  end if;

  return new_count;
end;
$$;
