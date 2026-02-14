-- Migration 009: RPC to get pre_staging row count (bypasses RLS so UI shows correct number)
-- Run in Supabase SQL Editor. Use this if Pre-Staging count still wrong after 008.

-- Drop existing so we can change return type (bigint -> int) if you ran an earlier version
drop function if exists public.get_pre_staging_count();

create or replace function public.get_pre_staging_count()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int from public.pre_staging;
$$;

comment on function public.get_pre_staging_count() is 'Returns total row count in pre_staging; use for admin UI when RLS would limit the count.';

-- Grant execute to roles that call the API (anon/authenticated/service_role)
grant execute on function public.get_pre_staging_count() to anon;
grant execute on function public.get_pre_staging_count() to authenticated;
grant execute on function public.get_pre_staging_count() to service_role;
