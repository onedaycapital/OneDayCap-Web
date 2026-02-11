-- =============================================================================
-- Application sessions – for abandonment nudges, resume links, 15-day follow-up.
-- Supabase project: Merchant DB
-- Run in Merchant DB → SQL Editor. Requires set_updated_at() (see supabase-merchant-applications.sql).
-- =============================================================================

create table if not exists public.application_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  email text not null,
  token text not null,
  current_step smallint not null default 1 check (current_step >= 1 and current_step <= 5),
  last_event text,
  last_event_at timestamptz,
  started_at timestamptz not null default now(),

  submitted_at timestamptz,
  nudge_30m_sent_at timestamptz,
  nudge_24h_sent_at timestamptz,
  last_15d_followup_sent_at timestamptz,

  opted_out boolean not null default false,

  utm_source text,
  campaign_id text,

  unique (token),
  unique (email)
);

create index if not exists idx_application_sessions_email on public.application_sessions (email);
create index if not exists idx_application_sessions_token on public.application_sessions (token);
create index if not exists idx_application_sessions_last_event_at on public.application_sessions (last_event_at);
create index if not exists idx_application_sessions_nudges on public.application_sessions (submitted_at, opted_out, nudge_30m_sent_at, nudge_24h_sent_at, last_event_at, started_at);

drop trigger if exists set_application_sessions_updated_at on public.application_sessions;
create trigger set_application_sessions_updated_at
  before update on public.application_sessions
  for each row execute function public.set_updated_at();

alter table public.application_sessions enable row level security;

comment on table public.application_sessions is 'Tracks application funnel for abandonment nudges (30m, 24h), 15-day follow-up, and resume links. Backend source of truth; Amplitude used for analytics only.';
