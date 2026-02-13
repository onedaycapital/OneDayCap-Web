-- =============================================================================
-- Seed: Eminent Funding + Pivot Funding Group (from funder email)
-- Run in Supabase SQL Editor after funder schema is applied.
-- Run once. To re-run: delete from funders where name in ('Eminent Funding','Pivot Funding Group'); then run this again.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Eminent Funding – $50K+ monthly revenue, $10K–$1M funding
-- -----------------------------------------------------------------------------
insert into public.funders (
  name,
  relationship_status,
  submission_channel,
  notes
)
values (
  'Eminent Funding',
  'active',
  'email',
  'Direct MCA lender, high-risk. $10K–$1M. Quick approvals, same-day funding. Deals $50K+ monthly revenue. In contract.'
);

insert into public.funder_contacts (funder_id, email, name, phone)
select id, 'abe@eminentfunding.com', 'Abe E', '(929) 289-5867'
from public.funders
where name = 'Eminent Funding'
order by created_at desc
limit 1;

insert into public.funder_submission_rules (funder_id, channel, to_emails, cc_emails)
select id, 'email', array['deals@eminentfunding.com'], array['abe@eminentfunding.com']
from public.funders
where name = 'Eminent Funding'
order by created_at desc
limit 1;

insert into public.funder_guidelines (funder_id, revenue_min, min_funding, max_funding, turnaround_time)
select id, 50000, 10000, 1000000, 'Same-day funding'
from public.funders
where name = 'Eminent Funding'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 2) Pivot Funding Group – $10K–$50K monthly revenue, smaller high-risk
-- -----------------------------------------------------------------------------
insert into public.funders (
  name,
  relationship_status,
  submission_channel,
  notes
)
values (
  'Pivot Funding Group',
  'active',
  'email',
  'Micro shop for smaller high-risk files. $10K–$50K monthly revenue. Launched under Eminent. In contract.'
);

insert into public.funder_contacts (funder_id, email, name, phone)
select id, 'abe@eminentfunding.com', 'Abe E', '(929) 289-5867'
from public.funders
where name = 'Pivot Funding Group'
order by created_at desc
limit 1;

insert into public.funder_submission_rules (funder_id, channel, to_emails, cc_emails)
select id, 'email', array['deals@pivotfundinggroup.com'], array['abe@pivotfundinggroup.com']
from public.funders
where name = 'Pivot Funding Group'
order by created_at desc
limit 1;

insert into public.funder_guidelines (funder_id, revenue_min, revenue_max, min_funding, turnaround_time)
select id, 10000, 50000, 10000, 'Quick approvals'
from public.funders
where name = 'Pivot Funding Group'
order by created_at desc
limit 1;
