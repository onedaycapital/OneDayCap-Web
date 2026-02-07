-- =============================================================================
-- Abandoned application progress – save partial form data by email
-- Run this in the Supabase SQL Editor (after merchant_applications exists).
-- Use: restore returning users' progress; reminder emails; analytics on drop-off.
-- =============================================================================

create table if not exists public.abandoned_application_progress (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  email text not null,
  last_step smallint not null check (last_step >= 1 and last_step <= 5),
  payload jsonb not null,

  unique (email)
);

create index if not exists idx_abandoned_application_progress_email
  on public.abandoned_application_progress (email);
create index if not exists idx_abandoned_application_progress_updated_at
  on public.abandoned_application_progress (updated_at desc);

-- Reuse existing set_updated_at trigger
drop trigger if exists set_abandoned_progress_updated_at on public.abandoned_application_progress;
create trigger set_abandoned_progress_updated_at
  before update on public.abandoned_application_progress
  for each row execute function public.set_updated_at();

alter table public.abandoned_application_progress enable row level security;

comment on table public.abandoned_application_progress is 'Partial form data by email; restored when user returns, cleared on submit. Used for reminders and drop-off analytics.';
