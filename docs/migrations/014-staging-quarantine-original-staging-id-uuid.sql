-- Migration 014: original_staging_id as uuid for Staging tables that use UUID primary key
-- Run if you get: Quarantine insert: invalid input syntax for type bigint: '<uuid>'
-- Your Staging table uses "Primary Key" uuid; migration 006 created original_staging_id as bigint.

-- Drop FK if it exists (name may vary; 006 referenced public.staging(id))
alter table if exists public.staging_quarantine
  drop constraint if exists staging_quarantine_original_staging_id_fkey;

-- Change column to uuid. Existing bigint values cannot be converted, so we set them to null.
alter table public.staging_quarantine
  alter column original_staging_id type uuid using null;
