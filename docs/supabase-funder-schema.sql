-- =============================================================================
-- Funder schema – single run (after merchant schema)
-- OneDayCap: funder CRM, submissions, offers, funded deals, commission ledger.
-- Prereqs: public.merchant_applications and public.set_updated_at() exist
--          (e.g. run docs/supabase-deploy-merchant-db.sql first).
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, etc.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Lookup: decline reasons (from email response taxonomy)
-- -----------------------------------------------------------------------------
create table if not exists public.decline_reasons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null unique,
  label text not null,
  category text
);

create index if not exists idx_decline_reasons_code on public.decline_reasons (code);
comment on table public.decline_reasons is 'Lookup for standardized decline reasons; funder_submissions and submission_events can reference.';

-- -----------------------------------------------------------------------------
-- 2) Funders – one row per partner; relationship status, SLA
-- -----------------------------------------------------------------------------
create table if not exists public.funders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  legal_name text,
  submission_channel text not null default 'email',

  relationship_status text not null default 'active',
  status_reason text,
  status_updated_at timestamptz,

  hours_to_first_response numeric,
  hours_to_offer numeric,
  funding_speed text,

  notes text,

  constraint funders_relationship_status check (
    relationship_status in (
      'active', 'paused', 'do_not_send', 'limited', 'needs_call_first'
    )
  ),
  constraint funders_submission_channel check (
    submission_channel in ('email')
  )
);

create index if not exists idx_funders_relationship_status on public.funders (relationship_status);
create index if not exists idx_funders_name on public.funders (name);

drop trigger if exists set_funders_updated_at on public.funders;
create trigger set_funders_updated_at
  before update on public.funders
  for each row execute function public.set_updated_at();

comment on table public.funders is 'One row per funding partner; relationship status, SLA; Phase 1 email-only.';

-- -----------------------------------------------------------------------------
-- 3) Funder contacts – one contact per funder, one email
-- -----------------------------------------------------------------------------
create table if not exists public.funder_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  funder_id uuid not null references public.funders (id) on delete cascade,
  email text not null,
  name text,
  phone text,

  unique (funder_id)
);

create index if not exists idx_funder_contacts_funder_id on public.funder_contacts (funder_id);

drop trigger if exists set_funder_contacts_updated_at on public.funder_contacts;
create trigger set_funder_contacts_updated_at
  before update on public.funder_contacts
  for each row execute function public.set_updated_at();

comment on table public.funder_contacts is 'One contact per funder; one email. To/CC lists live in funder_submission_rules.';

-- -----------------------------------------------------------------------------
-- 4) Funder submission rules – per-funder To/CC (email only for Phase 1)
-- -----------------------------------------------------------------------------
create table if not exists public.funder_submission_rules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  funder_id uuid not null references public.funders (id) on delete cascade,
  channel text not null default 'email',
  to_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  formatting_norms jsonb,

  unique (funder_id, channel),
  constraint fsub_rules_channel check (channel in ('email'))
);

create index if not exists idx_funder_submission_rules_funder_id on public.funder_submission_rules (funder_id);

drop trigger if exists set_funder_submission_rules_updated_at on public.funder_submission_rules;
create trigger set_funder_submission_rules_updated_at
  before update on public.funder_submission_rules
  for each row execute function public.set_updated_at();

comment on table public.funder_submission_rules is 'Per-funder To/CC for submissions; Phase 1 email only.';

-- -----------------------------------------------------------------------------
-- 5) Funder guidelines – eligibility, min/max funding, turnaround, required_docs
-- -----------------------------------------------------------------------------
create table if not exists public.funder_guidelines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  funder_id uuid not null references public.funders (id) on delete cascade unique,

  min_funding numeric,
  max_funding numeric,
  turnaround_time text,

  states_allowed text[],
  states_excluded text[],
  industries jsonb,
  min_time_in_biz text,
  revenue_min numeric,
  revenue_max numeric,
  first_position text,
  second_to_nth_position text,
  current_mca_loans text,
  defaults text,
  bankruptcy text,
  min_fico_score smallint,

  required_docs jsonb,
  criteria jsonb,

  bonus text,
  commission_points text,
  incentives_multiple_deals text,
  commission_payment_plan text
);

create index if not exists idx_funder_guidelines_funder_id on public.funder_guidelines (funder_id);

drop trigger if exists set_funder_guidelines_updated_at on public.funder_guidelines;
create trigger set_funder_guidelines_updated_at
  before update on public.funder_guidelines
  for each row execute function public.set_updated_at();

comment on table public.funder_guidelines is 'Eligibility, min/max funding, turnaround, required_docs (JSONB), commission notes.';

-- -----------------------------------------------------------------------------
-- 6) Funder commission terms – how we get paid
-- -----------------------------------------------------------------------------
create table if not exists public.funder_commission_terms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  funder_id uuid not null references public.funders (id) on delete cascade,
  rate_type text,
  rate_value numeric,
  trigger_type text,
  effective_from date,
  effective_to date,
  notes text
);

create index if not exists idx_funder_commission_terms_funder_id on public.funder_commission_terms (funder_id);

drop trigger if exists set_funder_commission_terms_updated_at on public.funder_commission_terms;
create trigger set_funder_commission_terms_updated_at
  before update on public.funder_commission_terms
  for each row execute function public.set_updated_at();

comment on table public.funder_commission_terms is 'How we get paid (rate, trigger: funded vs renewal); ledger on commission_ledger.';

-- -----------------------------------------------------------------------------
-- 7) Optional: internal rating, notes
-- -----------------------------------------------------------------------------
create table if not exists public.funder_internal_rating (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  funder_id uuid not null references public.funders (id) on delete cascade,
  rating text,
  rated_at timestamptz,
  notes text
);

create index if not exists idx_funder_internal_rating_funder_id on public.funder_internal_rating (funder_id);

drop trigger if exists set_funder_internal_rating_updated_at on public.funder_internal_rating;
create trigger set_funder_internal_rating_updated_at
  before update on public.funder_internal_rating
  for each row execute function public.set_updated_at();

comment on table public.funder_internal_rating is 'Optional internal rating per funder.';

create table if not exists public.funder_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  funder_id uuid not null references public.funders (id) on delete cascade,
  body text not null,
  noted_at timestamptz not null default now()
);

create index if not exists idx_funder_notes_funder_id on public.funder_notes (funder_id);

drop trigger if exists set_funder_notes_updated_at on public.funder_notes;
create trigger set_funder_notes_updated_at
  before update on public.funder_notes
  for each row execute function public.set_updated_at();

comment on table public.funder_notes is 'Optional free-form notes per funder.';

-- -----------------------------------------------------------------------------
-- 8) Funder submissions – one row per “we sent this application to this funder”
-- -----------------------------------------------------------------------------
create table if not exists public.funder_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  merchant_application_id uuid not null references public.merchant_applications (id) on delete cascade,
  funder_id uuid not null references public.funders (id) on delete restrict,
  submitted_at timestamptz not null default now(),
  channel text not null default 'email',
  status text not null default 'sent',
  decline_reason_id uuid references public.decline_reasons (id) on delete set null,
  to_cc_snapshot jsonb,

  constraint fsub_submissions_channel check (channel in ('email')),
  constraint fsub_submissions_status check (
    status in ('sent', 'opened', 'replied', 'requested_docs', 'declined', 'offered', 'accepted', 'expired', 'withdrawn')
  )
);

create index if not exists idx_funder_submissions_merchant_application_id on public.funder_submissions (merchant_application_id);
create index if not exists idx_funder_submissions_funder_id on public.funder_submissions (funder_id);
create index if not exists idx_funder_submissions_submitted_at on public.funder_submissions (submitted_at desc);
create index if not exists idx_funder_submissions_status on public.funder_submissions (status);

drop trigger if exists set_funder_submissions_updated_at on public.funder_submissions;
create trigger set_funder_submissions_updated_at
  before update on public.funder_submissions
  for each row execute function public.set_updated_at();

comment on table public.funder_submissions is 'One row per application sent to a funder; status and optional decline_reason_id.';

-- -----------------------------------------------------------------------------
-- 9) Submission messages – per-email audit (message_id, thread, to/cc, attachments)
-- -----------------------------------------------------------------------------
create table if not exists public.submission_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  funder_submission_id uuid not null references public.funder_submissions (id) on delete cascade,
  message_id text,
  thread_id text,
  from_addr text,
  to_addrs jsonb,
  cc_addrs jsonb,
  attachment_urls jsonb,
  sent_at timestamptz not null default now(),
  direction text not null default 'outbound',

  constraint submission_messages_direction check (direction in ('outbound', 'inbound'))
);

create index if not exists idx_submission_messages_funder_submission_id on public.submission_messages (funder_submission_id);
create index if not exists idx_submission_messages_message_id on public.submission_messages (message_id);
create index if not exists idx_submission_messages_sent_at on public.submission_messages (sent_at desc);

comment on table public.submission_messages is 'Per-email audit for a submission: message_id, thread, to/cc, attachment URLs.';

-- -----------------------------------------------------------------------------
-- 10) Submission events – timeline (sent, opened, replied, declined, offered)
-- -----------------------------------------------------------------------------
create table if not exists public.submission_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  funder_submission_id uuid not null references public.funder_submissions (id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  decline_reason_id uuid references public.decline_reasons (id) on delete set null,
  submission_message_id uuid references public.submission_messages (id) on delete set null,
  payload jsonb,

  constraint submission_events_event_type check (
    event_type in (
      'sent', 'opened', 'replied', 'requested_docs', 'declined', 'offered',
      'accepted', 'expired', 'withdrawn'
    )
  )
);

create index if not exists idx_submission_events_funder_submission_id on public.submission_events (funder_submission_id);
create index if not exists idx_submission_events_occurred_at on public.submission_events (occurred_at desc);

comment on table public.submission_events is 'Timeline per submission: sent, opened, replied, declined, offered, etc.';

-- -----------------------------------------------------------------------------
-- 11) Funder offers – terms per offer (possibly multiple per submission)
-- -----------------------------------------------------------------------------
create table if not exists public.funder_offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  funder_submission_id uuid not null references public.funder_submissions (id) on delete cascade,
  factor_rate numeric,
  term_days smallint,
  payment_frequency text,
  holdback_pct numeric,
  origination_pct numeric,
  prepay_rules text,
  offered_at timestamptz not null default now(),
  status text not null default 'pending',

  constraint funder_offers_status check (
    status in ('pending', 'accepted', 'expired', 'withdrawn')
  )
);

create index if not exists idx_funder_offers_funder_submission_id on public.funder_offers (funder_submission_id);

drop trigger if exists set_funder_offers_updated_at on public.funder_offers;
create trigger set_funder_offers_updated_at
  before update on public.funder_offers
  for each row execute function public.set_updated_at();

comment on table public.funder_offers is 'Offers from funder (factor rate, term, holdback, etc.); multiple per submission possible.';

-- -----------------------------------------------------------------------------
-- 12) Funded deals – closed deals; links to application, funder, accepted offer
-- -----------------------------------------------------------------------------
create table if not exists public.funded_deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  merchant_application_id uuid not null references public.merchant_applications (id) on delete restrict,
  funder_id uuid not null references public.funders (id) on delete restrict,
  funder_offer_id uuid references public.funder_offers (id) on delete set null,
  funded_at timestamptz not null default now(),
  funded_amount numeric not null,
  notes text
);

create index if not exists idx_funded_deals_merchant_application_id on public.funded_deals (merchant_application_id);
create index if not exists idx_funded_deals_funder_id on public.funded_deals (funder_id);
create index if not exists idx_funded_deals_funded_at on public.funded_deals (funded_at desc);

drop trigger if exists set_funded_deals_updated_at on public.funded_deals;
create trigger set_funded_deals_updated_at
  before update on public.funded_deals
  for each row execute function public.set_updated_at();

comment on table public.funded_deals is 'Closed deals; drives commission expectations via commission_ledger.';

-- -----------------------------------------------------------------------------
-- 13) Commission ledger – expected/paid per funded deal
-- -----------------------------------------------------------------------------
create table if not exists public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  funded_deal_id uuid not null references public.funded_deals (id) on delete restrict,
  funder_id uuid not null references public.funders (id) on delete restrict,
  expected_amount numeric,
  paid_amount numeric,
  payment_method text,
  reference_id text,
  paid_at timestamptz
);

create index if not exists idx_commission_ledger_funded_deal_id on public.commission_ledger (funded_deal_id);
create index if not exists idx_commission_ledger_funder_id on public.commission_ledger (funder_id);
create index if not exists idx_commission_ledger_paid_at on public.commission_ledger (paid_at);

drop trigger if exists set_commission_ledger_updated_at on public.commission_ledger;
create trigger set_commission_ledger_updated_at
  before update on public.commission_ledger
  for each row execute function public.set_updated_at();

comment on table public.commission_ledger is 'Expected vs paid commission per funded deal; payment method and reference.';

-- -----------------------------------------------------------------------------
-- RLS – enable on all funder tables; service role used server-side
-- -----------------------------------------------------------------------------
alter table public.decline_reasons enable row level security;
alter table public.funders enable row level security;
alter table public.funder_contacts enable row level security;
alter table public.funder_submission_rules enable row level security;
alter table public.funder_guidelines enable row level security;
alter table public.funder_commission_terms enable row level security;
alter table public.funder_internal_rating enable row level security;
alter table public.funder_notes enable row level security;
alter table public.funder_submissions enable row level security;
alter table public.submission_messages enable row level security;
alter table public.submission_events enable row level security;
alter table public.funder_offers enable row level security;
alter table public.funded_deals enable row level security;
alter table public.commission_ledger enable row level security;

-- Optional: add phone to funder_contacts if missing (for DBs created before this column was added)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'funder_contacts' and column_name = 'phone'
  ) then
    alter table public.funder_contacts add column phone text;
  end if;
end $$;
