-- =============================================================================
-- Merchant Applications – Supabase schema for the application form (Stage 2)
-- Run this in the Supabase SQL Editor to create tables and RLS.
-- =============================================================================

-- Applications table: one row per submission, UUID for workflows
create table if not exists public.merchant_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Step 1: Personal
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  sms_consent boolean not null default false,

  -- Step 2: Business
  business_name text not null,
  dba text,
  type_of_business text not null,
  start_date_of_business text not null,
  ein text not null,
  address text not null,
  city text not null,
  state text not null,
  zip text not null,
  industry text not null,

  -- Step 3: Financial
  monthly_revenue text not null,
  funding_request text not null,
  use_of_funds text not null,

  -- Step 4: Credit & Ownership (owner address etc.; SSN stored but never pre-filled)
  ssn text not null,
  owner_address text,
  owner_city text,
  owner_state text,
  owner_zip text,
  ownership_percent text,

  -- Step 5: Signature & audit
  signature_data_url text,
  signed_at timestamptz,
  audit_id text,

  -- Optional: for Stage 3+ (Google Drive folder id for this application)
  gdrive_folder_id text
);

-- Index for lookups by email (e.g. “existing merchant” check or your workflows)
create index if not exists idx_merchant_applications_email on public.merchant_applications (email);
create index if not exists idx_merchant_applications_created_at on public.merchant_applications (created_at desc);

-- Optional: updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_merchant_applications_updated_at on public.merchant_applications;
create trigger set_merchant_applications_updated_at
  before update on public.merchant_applications
  for each row execute function public.set_updated_at();

-- =============================================================================
-- File references: one row per uploaded file (files live in Storage)
-- =============================================================================
create table if not exists public.merchant_application_files (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  application_id uuid not null references public.merchant_applications (id) on delete cascade,
  file_type text not null,  -- 'bank_statements' | 'void_check' | 'drivers_license'
  file_name text not null,
  storage_path text not null,
  content_type text,
  file_size_bytes bigint
);

create index if not exists idx_merchant_application_files_application_id
  on public.merchant_application_files (application_id);

-- =============================================================================
-- RLS: use service role for server-side writes; restrict anon if needed
-- =============================================================================
alter table public.merchant_applications enable row level security;
alter table public.merchant_application_files enable row level security;

-- Policy: service role can do everything (used by your Next.js backend)
-- No policies for anon/authenticated here = only service role can read/write
-- unless you add specific policies. Add policies below if you want other roles.

-- Example: allow service role full access (service role bypasses RLS by default in Supabase)
-- So the above enable RLS is enough; your app uses SUPABASE_SERVICE_ROLE_KEY server-side.

comment on table public.merchant_applications is 'One row per application form submission; id is UUID for workflows';
comment on table public.merchant_application_files is 'References to files uploaded for each application (files in Storage bucket merchant-documents)';
