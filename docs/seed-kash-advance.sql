-- =============================================================================
-- Seed: Kash Advance (signed ISO agreement 2025; KASH ADVANCE ISO AGREEMENT 2025.pdf)
-- Run in Supabase SQL Editor after funder schema + migrations 001–003.
-- Run once. To re-run: delete from funders where name = 'Kash Advance'; then run again.
-- Contact: Kiran, kiranp@kash-advance.com, 516-395-6108. Contact and CC on submissions.
-- Guidelines: update from Kash Advance Guidelines PDF when available.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Kash Advance – funder record (ISO signed)
-- -----------------------------------------------------------------------------
insert into public.funders (
  name,
  relationship_status,
  submission_channel,
  notes,
  iso_agreement_signed
)
values (
  'Kash Advance',
  'active',
  'email',
  'Kash Advance LLC. Signed ISO agreement 2025. 111 Great Neck Road, Suite 300, Great Neck, NY 11021. Contact: Kiran kiranp@kash-advance.com. Clawback: 30 business days default; or before 40% repayment (deals under $150k) / 50% (over $150k). Fees per Exhibit A.',
  true
);

-- -----------------------------------------------------------------------------
-- 2) Contact: Kiran (contact and CC on submissions)
-- -----------------------------------------------------------------------------
insert into public.funder_contacts (funder_id, email, name, phone)
select id, 'kiranp@kash-advance.com', 'Kiran', '516-395-6108'
from public.funders
where name = 'Kash Advance'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 3) Submission rules – To: Kiran (contact and recipient for submissions)
-- -----------------------------------------------------------------------------
insert into public.funder_submission_rules (funder_id, channel, to_emails, cc_emails)
select id, 'email', array['kiranp@kash-advance.com'], array[]::text[]
from public.funders
where name = 'Kash Advance'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 4) Guidelines – placeholder; update from Kash Advance Guidelines PDF
-- -----------------------------------------------------------------------------
insert into public.funder_guidelines (funder_id, revenue_min, min_funding, max_funding, turnaround_time)
select id, 10000, 10000, 500000, 'Per Kash Advance guidelines'
from public.funders
where name = 'Kash Advance'
order by created_at desc
limit 1;
