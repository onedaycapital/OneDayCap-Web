-- =============================================================================
-- Seed: Selective Funding (signed ISO agreement; Program Guidelines PDF)
-- Run in Supabase SQL Editor after funder schema + migrations 001–003.
-- Run once. To re-run: delete from funders where name = 'Selective Funding'; then run again.
-- Guidelines: 2nd–6th position, $10k–$2M, $45k min monthly revenue, 5 deposits/mo, 35wk max term, 5 NSFs/mo max, FICO 600+.
-- Restricted: HI, AK, PR, Canada; Auto Sales (no repair); Consulting/Marketing; Visa/Passport; Law; Financial; Non-Profits; All-Cash/Zelle; Single-truck trucking.
-- Contact/submissions: To uw@selectivefunder.com, CC Ari@selectivefunder.com. Rep: Ari Cohen, Tel 929-602-0880, Cell 347-948-8890.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Selective Funding – funder record (ISO signed)
-- -----------------------------------------------------------------------------
insert into public.funders (
  name,
  relationship_status,
  submission_channel,
  notes,
  iso_agreement_signed
)
values (
  'Selective Funding',
  'active',
  'email',
  'Signed ISO agreement. 29 W 36th Street, New York, NY 10018. Submissions: uw@selectivefunder.com. Program: 2nd–6th position, $10k–$2M, $45k min monthly revenue, 5 deposits/mo, 35wk max term, FICO 600+. Beta (high-risk) and Plus (premium) programs. 30-day clawback on default. Compensation 5–20% per Schedule A.',
  true
);

-- -----------------------------------------------------------------------------
-- 2) Contact: Ari Cohen (rep); submissions To uw@, CC Ari@
-- -----------------------------------------------------------------------------
insert into public.funder_contacts (funder_id, email, name, phone)
select id, 'Ari@selectivefunder.com', 'Ari Cohen', '929-602-0880'
from public.funders
where name = 'Selective Funding'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 3) Submission rules – To: underwriting; CC: Ari Cohen
-- -----------------------------------------------------------------------------
insert into public.funder_submission_rules (funder_id, channel, to_emails, cc_emails)
select id, 'email', array['uw@selectivefunder.com'], array['Ari@selectivefunder.com']
from public.funders
where name = 'Selective Funding'
order by created_at desc
limit 1;

-- -----------------------------------------------------------------------------
-- 4) Guidelines – from Program Guidelines PDF
-- -----------------------------------------------------------------------------
insert into public.funder_guidelines (funder_id, revenue_min, min_funding, max_funding, states_excluded, turnaround_time)
select id, 45000, 10000, 2000000, array['HI', 'AK'], 'Per Selective Funding guidelines'
from public.funders
where name = 'Selective Funding'
order by created_at desc
limit 1;
