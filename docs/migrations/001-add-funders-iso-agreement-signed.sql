-- Add iso_agreement_signed to funders (run on DBs created before this column existed).
-- New installs: column is in docs/supabase-funder-schema.sql; skip this migration.

alter table public.funders
  add column if not exists iso_agreement_signed boolean not null default false;

create index if not exists idx_funders_iso_agreement_signed on public.funders (iso_agreement_signed);

comment on column public.funders.iso_agreement_signed is 'True when a signed ISO agreement is on file; only these funders are included in auto-match and should receive submissions.';
