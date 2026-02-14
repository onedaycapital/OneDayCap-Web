-- Migration 012: Add import_job_id to Pre_Staging so Normalize & dedupe can run
-- Run in Supabase SQL Editor. Fixes: "column Pre_Staging.import_job_id does not exist"
-- Use quoted name so the capital-P table is altered.

alter table if exists public."Pre_Staging"
  add column if not exists import_job_id uuid references public.staging_import_job (id) on delete set null;

comment on column public."Pre_Staging".import_job_id is 'Links row to an upload job; null for legacy/bulk imports (processed as orphan batches).';
