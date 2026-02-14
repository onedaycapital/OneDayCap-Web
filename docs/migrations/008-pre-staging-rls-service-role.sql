-- Migration 008: Ensure pre_staging count in admin UI matches the table (fix 87 vs 23,858)
-- Cause: Row Level Security (RLS) on pre_staging was limiting which rows the API could see.
-- Staging table had no RLS (or permissive policy), so its count was correct.

-- Option A: Disable RLS on pre_staging so all roles see all rows.
-- Safe if only your server (with service_role key) and admins access this table.
alter table if exists public.pre_staging disable row level security;

-- Option B (if you prefer to keep RLS): enable and add a policy for service_role.
-- Uncomment below and comment out the line above if you use Option B.
-- alter table if exists public.pre_staging enable row level security;
-- drop policy if exists "Service role full access on pre_staging" on public.pre_staging;
-- create policy "Service role full access on pre_staging"
--   on public.pre_staging for all to service_role using (true) with check (true);

-- After running: reload the Upload merchant DB page; Pre-Staging count should match the table.
