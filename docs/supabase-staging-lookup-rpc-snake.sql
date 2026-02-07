-- =============================================================================
-- Staging lookup RPC – SNAKE_CASE column names (email_1, email_2, etc.)
-- Use this if your existing staging table has snake_case columns, not "Email 1".
-- Run in Supabase SQL Editor. Table can be "staging" or "Staging".
-- =============================================================================

-- Uses the table name that exists in your DB (lowercase "staging" is default).
-- If your table is "Staging" (capital S), change "staging" to "Staging" in the FROM below.

create or replace function public.get_staging_merchant_by_email(lookup_email text)
returns setof public.staging
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.staging
  where lower(trim(coalesce(email_1, ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce(email_2, ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce(email_3, ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce(email_4, ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce(email_5, ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce(email_6, ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce(owner_2_email_1, ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce(owner_2_email_2, ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce(owner_2_email_3, ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce(owner_2_email_4, ''))) = lower(trim(lookup_email))
     or lower(trim(coalesce(owner_2_email_5, ''))) = lower(trim(lookup_email))
  limit 1;
$$;

comment on function public.get_staging_merchant_by_email(text) is
  'Lookup staging row by email (snake_case columns). Used by application form prefill.';

grant execute on function public.get_staging_merchant_by_email(text) to service_role;
