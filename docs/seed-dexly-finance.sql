-- =============================================================================
-- Seed: Dexly Finance (ISO Agreement signed; DEXLY FINANCE ISO AGREEMENT.pdf)
-- Run in Supabase SQL Editor after funder schema is applied.
-- Run once. To re-run: delete from funders where name = 'Dexly Finance'; then run again.
-- Notices to Dexly per agreement: underwriting@dexlyfinance.com. Compensation per Schedule A; 30-day clawback on default.
-- Update funder_guidelines from Dexly MCA & ISO GUIDELINES PDF when you have underwriting criteria.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Dexly Finance – funder record
-- -----------------------------------------------------------------------------
insert into public.funders (
  name,
  relationship_status,
  submission_channel,
  notes
)
values (
  'Dexly Finance',
  'active',
  'email',
  'ISO Agreement signed. 1 World Trade Center, 85th Floor, New York, NY 10007. www.dexlyfinance.com. Notices: underwriting@dexlyfinance.com. Compensation per Schedule A; clawback if merchant defaults within 30 days. Guidelines: update from Dexly MCA & ISO GUIDELINES PDF.'
);

-- -----------------------------------------------------------------------------
-- 2) Contact: Nell Grabczak, ISO Relations Manager
-- -----------------------------------------------------------------------------
insert into public.funder_contacts (funder_id, email, name, phone)
select id, 'nell@dexlyfinance.com', 'Nell Grabczak', '+1-347-362-8632'
from public.funders
where name = 'Dexly Finance'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 3) Submission rules – To: underwriting (per ISO agreement); CC: ISO contact Nell
-- -----------------------------------------------------------------------------
insert into public.funder_submission_rules (funder_id, channel, to_emails, cc_emails)
select id, 'email', array['underwriting@dexlyfinance.com'], array['nell@dexlyfinance.com']
from public.funders
where name = 'Dexly Finance'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 4) Guidelines – placeholder; update from Dexly MCA & ISO GUIDELINES PDF
-- -----------------------------------------------------------------------------
insert into public.funder_guidelines (funder_id, revenue_min, min_funding, max_funding, turnaround_time)
select id, 10000, 10000, 500000, 'Per Dexly guidelines'
from public.funders
where name = 'Dexly Finance'
order by created_at desc
limit 1;

update public.funders set iso_agreement_signed = true where name = 'Dexly Finance';
