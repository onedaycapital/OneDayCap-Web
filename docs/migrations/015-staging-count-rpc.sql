-- Migration 015: RPC for exact Staging table count (avoids REST/UI limits over 50k rows)
-- Use for admin UI so the exact count is always visible regardless of table size.

create or replace function public.get_staging_count(table_name text default 'staging')
returns bigint
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result bigint;
begin
  execute format('select count(*) from public.%I', get_staging_count.table_name) into result;
  return result;
end;
$$;

comment on function public.get_staging_count(text) is 'Returns row count for given staging table. Use for admin UI when table has 50k+ rows.';

grant execute on function public.get_staging_count(text) to anon;
grant execute on function public.get_staging_count(text) to authenticated;
grant execute on function public.get_staging_count(text) to service_role;
