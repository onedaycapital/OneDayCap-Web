-- =============================================================================
-- Staging lookup RPC – for reliable application form prefill (recommended)
-- Run this in the Supabase SQL Editor. Your staging table must have columns
-- "Email 1", "Email 2", "Email 3", "Email 4", "Email 5", "Email 6".
-- If your table is lowercase "staging", change "Staging" to staging below.
-- =============================================================================

create or replace function public.get_staging_merchant_by_email(lookup_email text)
returns setof public."Staging"
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public."Staging"
  where lower(trim(coalesce("Email 1", ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce("Email 2", ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce("Email 3", ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce("Email 4", ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce("Email 5", ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce("Email 6", ''))) = lower(trim(lookup_email))
  limit 1;
$$;

comment on function public.get_staging_merchant_by_email(text) is
  'Lookup staging row by email (Email 1–6). Used by application form prefill.';

-- Grant execute to service role (used by Next.js server)
grant execute on function public.get_staging_merchant_by_email(text) to service_role;
