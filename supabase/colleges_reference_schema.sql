create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  state text,
  zip text,
  website text,
  aliases text[] default '{}'
);

alter table public.colleges
add column if not exists aliases text[] default '{}';

create index if not exists colleges_name_idx on public.colleges(name);
create index if not exists colleges_state_idx on public.colleges(state);
create index if not exists colleges_aliases_idx on public.colleges using gin(aliases);

create or replace function public.search_colleges(search_query text, max_results integer default 8)
returns table (
  name text,
  address text,
  city text,
  state text,
  zip text,
  website text,
  aliases text[]
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select lower(trim(coalesce(search_query, ''))) as query
  ),
  ranked as (
    select
      c.name,
      c.address,
      c.city,
      c.state,
      c.zip,
      c.website,
      coalesce(c.aliases, '{}'::text[]) as aliases,
      case
        when n.query <> '' and exists (
          select 1
          from unnest(coalesce(c.aliases, '{}'::text[])) as alias
          where lower(trim(alias)) = n.query
        ) then 1
        when n.query <> '' and lower(trim(c.name)) = n.query then 2
        when n.query <> '' and exists (
          select 1
          from unnest(coalesce(c.aliases, '{}'::text[])) as alias
          where lower(alias) like '%' || n.query || '%'
        ) then 3
        when n.query <> '' and lower(c.name) like '%' || n.query || '%' then 4
        else 5
      end as match_rank
    from public.colleges c
    cross join normalized n
    where n.query = ''
      or lower(c.name) like '%' || n.query || '%'
      or exists (
        select 1
        from unnest(coalesce(c.aliases, '{}'::text[])) as alias
        where lower(alias) like '%' || n.query || '%'
      )
  )
  select ranked.name, ranked.address, ranked.city, ranked.state, ranked.zip, ranked.website, ranked.aliases
  from ranked
  order by ranked.match_rank, ranked.name
  limit greatest(1, least(coalesce(max_results, 8), 25));
$$;

alter table public.colleges enable row level security;

-- Anyone authenticated can read the shared colleges list
drop policy if exists "Authenticated users can read colleges" on public.colleges;
create policy "Authenticated users can read colleges" on public.colleges
for select using (auth.role() = 'authenticated');

-- Only service role can insert/update/delete (used for seeding)
