-- =============================================================================
-- Seed: Monday Funding (signed ISO agreement; guidelines from Monday Funding PDF)
-- Run in Supabase SQL Editor after funder schema + migration 001 (iso_agreement_signed).
-- Run once. To re-run: delete from funders where name = 'Monday Funding'; then run again.
-- Guidelines: 12mo TIB, 40k monthly deposits, FICO 550+, 2nd position+, $20k–$200k, 5 deposits, 4 NSFs/mo max.
-- Hard industry restrictions: Law, Auto, real estate, nonprofit. Preferred: Healthcare, restaurants, professional services.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Monday Funding – funder record (ISO signed)
-- -----------------------------------------------------------------------------
insert into public.funders (
  name,
  relationship_status,
  submission_channel,
  notes,
  iso_agreement_signed
)
values (
  'Monday Funding',
  'active',
  'email',
  'Signed ISO agreement. 1416 Avenue J, Brooklyn, NY 11230. www.MondayFunding.com. Subs: subs@mondayfunding.com. Guidelines: 12mo TIB, 40k monthly deposits, FICO 550+, $20k–$200k, 5 deposits/mo, 4 NSFs/mo max. Restricted: Law, Auto, real estate, nonprofit.',
  true
);

-- -----------------------------------------------------------------------------
-- 2) Contact: Josh Kaplinsky, Strategic Partnerships
-- -----------------------------------------------------------------------------
insert into public.funder_contacts (funder_id, email, name, phone)
select id, 'Josh@mondayfunding.com', 'Josh Kaplinsky', '(732) 917-1306'
from public.funders
where name = 'Monday Funding'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 3) Submission rules – To: subs (per guidelines); CC: Josh
-- -----------------------------------------------------------------------------
insert into public.funder_submission_rules (funder_id, channel, to_emails, cc_emails)
select id, 'email', array['subs@mondayfunding.com'], array['Josh@mondayfunding.com']
from public.funders
where name = 'Monday Funding'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 4) Guidelines – from Monday Funding guidelines PDF
-- -----------------------------------------------------------------------------
insert into public.funder_guidelines (funder_id, revenue_min, min_funding, max_funding, turnaround_time)
select id, 40000, 20000, 200000, 'Per Monday Funding guidelines'
from public.funders
where name = 'Monday Funding'
order by created_at desc
limit 1;
