-- =============================================================================
-- Seed: MNR Capital Group (signed ISO agreement; Complete_with_DocuSign_MNR_ISO_Agreement)
-- Run in Supabase SQL Editor after funder schema + migrations 001–003.
-- Run once. To re-run: delete from funders where name = 'MNR Capital Group'; then run again.
-- Contact: Josh Abecassis, ISO Manager, Josh@mnrcapitalgroup.com, (305) 280-5556. Submissions To: deals@mnrcapitalgroup.com, CC: Josh@mnrcapitalgroup.com.
-- Guidelines: Up to 13 pts on 1.499; 3-deal bonus 18 pts. Trucking 5+ trucks $150K+; Construction $150K+; Auto $150K/mo. Max $500K. Terms to 8mo. Funds PR, HI, AK. Not: Legal, Adult Entertainment.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) MNR Capital Group – funder record (ISO signed)
-- -----------------------------------------------------------------------------
insert into public.funders (
  name,
  relationship_status,
  submission_channel,
  notes,
  iso_agreement_signed
)
values (
  'MNR Capital Group',
  'active',
  'email',
  'MNR Capital Group LLC. Signed ISO agreement. 7901 4th St. N Suite 7491, St. Petersburg, FL 33702. www.mnrcapitalgroup.com. Commission up to 13 pts on 1.499; fund 3 deals = 18 pts. Trucking 5+ trucks $150K+; Construction $150K+; Auto $150K/mo. Max $500K. Terms to 8 months. Weekly/bi-weekly/tri-weekly/daily. Defaults: only satisfied deals within a year. Now funding: PR, HI, AK. Not funded: Legal, Adult Entertainment.',
  true
);

-- -----------------------------------------------------------------------------
-- 2) Contact: Josh Abecassis, ISO Manager
-- -----------------------------------------------------------------------------
insert into public.funder_contacts (funder_id, email, name, phone)
select id, 'Josh@mnrcapitalgroup.com', 'Josh Abecassis', '(305) 280-5556'
from public.funders
where name = 'MNR Capital Group'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 3) Submission rules – To: deals@; CC: Josh
-- -----------------------------------------------------------------------------
insert into public.funder_submission_rules (funder_id, channel, to_emails, cc_emails)
select id, 'email', array['deals@mnrcapitalgroup.com'], array['Josh@mnrcapitalgroup.com']
from public.funders
where name = 'MNR Capital Group'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 4) Guidelines – from Funding Guidelines
-- -----------------------------------------------------------------------------
insert into public.funder_guidelines (funder_id, revenue_min, min_funding, max_funding, turnaround_time)
select id, 50000, 10000, 500000, 'Terms up to 8 months'
from public.funders
where name = 'MNR Capital Group'
order by created_at desc
limit 1;
