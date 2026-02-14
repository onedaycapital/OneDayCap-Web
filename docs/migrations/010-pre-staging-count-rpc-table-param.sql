-- Migration 010: RPC get_pre_staging_count accepts table name (for Pre_Staging vs pre_staging)
-- Run after 009. Lets app count either table via SUPABASE_PRE_STAGING_TABLE.

drop function if exists public.get_pre_staging_count();

create or replace function public.get_pre_staging_count(table_name text default 'pre_staging')
returns int
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result int;
begin
  execute format('select count(*)::int from public.%I', get_pre_staging_count.table_name) into result;
  return result;
end;
$$;

comment on function public.get_pre_staging_count(text) is 'Returns row count for given pre-staging table (e.g. pre_staging or Pre_Staging). Use for admin UI.';

grant execute on function public.get_pre_staging_count(text) to anon;
grant execute on function public.get_pre_staging_count(text) to authenticated;
grant execute on function public.get_pre_staging_count(text) to service_role;
