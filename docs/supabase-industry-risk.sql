-- =============================================================================
-- Industry Risk reference table: Description → Industry Risk (T1–T4)
-- Used for dropdown options and PDF "Additional Details" tile.
-- Run in Supabase SQL Editor. App uses lib/industry-risk.ts for same mapping.
-- =============================================================================

create table if not exists public.industry_risk_lookup (
  id serial primary key,
  description text not null unique,
  industry_risk text not null
);

comment on table public.industry_risk_lookup is 'Industry description to risk tier (T1–T4) for application form and PDF';

-- Seed with mapping (matches lib/industry-risk.ts)
insert into public.industry_risk_lookup (description, industry_risk) values
  ('Retail Trade (General)', 'T1-T3'),
  ('Health Care & Social Assistance', 'T1'),
  ('Finance & Insurance', 'T1/T4'),
  ('Professional, Scientific & Technical Services', 'T1'),
  ('Wholesale Trade', 'T1-T2'),
  ('Construction', 'T1-T3'),
  ('Manufacturing', 'T2'),
  ('Transportation & Warehousing', 'T2-T3'),
  ('Food Services & Drinking Places', 'T2-T3'),
  ('Real Estate & Rental & Leasing', 'T3'),
  ('Arts, Entertainment & Recreation', 'T2-T4'),
  ('Other Services', 'T1-T3'),
  ('Mining, Quarrying, Oil & Gas Extraction', 'T4'),
  ('Agriculture, Forestry, Fishing', 'T4'),
  ('Utilities', 'T4'),
  ('Information', 'T3-T4'),
  ('Consumer Lending / High-Risk Finance', 'T4'),
  ('Gambling Industries', 'T4'),
  ('Adult Entertainment', 'T4'),
  ('Smoke/Vape Shops', 'T4'),
  ('Pawn Shops', 'T4')
on conflict (description) do update set industry_risk = excluded.industry_risk;
