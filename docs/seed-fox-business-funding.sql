-- =============================================================================
-- Seed: Fox Business Funding (signed ISO; Fox_ISO_Agent_Agreement.pdf)
-- Run in Supabase SQL Editor after funder schema + migrations 001–003.
-- Run once. To re-run: delete from funders where name = 'Fox Business Funding'; then run again.
-- Submissions To: underwriting@foxbusinessfunding.com; CC: jacob.e@, allen@ (for timely response).
-- Contact: Jacob Eidelman, Funding Advisor, jacob.e@foxbusinessfunding.com, 347-201-5143.
-- Guidelines: 2+ position, $50k min monthly revenue, 6mo TIB, FICO 500+, up to 12mo term, $10k–$1.5M. No trucking/auto; restricted: attorneys, debt consultants. CA/TX/NY: 150k/mo + 100k deal min.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Fox Business Funding – funder record (ISO signed)
-- -----------------------------------------------------------------------------
insert into public.funders (
  name,
  relationship_status,
  submission_channel,
  notes,
  iso_agreement_signed
)
values (
  'Fox Business Funding',
  'active',
  'email',
  'Signed ISO/Agent agreement. Most competitive 2–5 position, $50k+ monthly, $10k–$1.5M. Moved away from Trucking and Auto; restricted: attorneys, debt consultants. CA/TX/NY: need 150k/mo + 100k deal min. Last deal <15k likely declined (no room). Positions 2+, 6mo TIB, FICO 500+, term up to 12mo. CC Jacob and Allen for timely response.',
  true
);

-- -----------------------------------------------------------------------------
-- 2) Contact: Jacob Eidelman, Funding Advisor
-- -----------------------------------------------------------------------------
insert into public.funder_contacts (funder_id, email, name, phone)
select id, 'jacob.e@foxbusinessfunding.com', 'Jacob Eidelman', '347-201-5143'
from public.funders
where name = 'Fox Business Funding'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 3) Submission rules – To: underwriting; CC: Jacob, Allen (timely response)
-- -----------------------------------------------------------------------------
insert into public.funder_submission_rules (funder_id, channel, to_emails, cc_emails)
select id, 'email', array['underwriting@foxbusinessfunding.com'], array['jacob.e@foxbusinessfunding.com', 'allen@foxbusinessfunding.com']
from public.funders
where name = 'Fox Business Funding'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 4) Guidelines – from Fox Funding Guidelines
-- -----------------------------------------------------------------------------
insert into public.funder_guidelines (funder_id, revenue_min, min_funding, max_funding, turnaround_time)
select id, 50000, 10000, 1500000, 'Up to 12 months'
from public.funders
where name = 'Fox Business Funding'
order by created_at desc
limit 1;
