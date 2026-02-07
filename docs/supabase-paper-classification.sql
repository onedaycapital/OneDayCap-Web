-- =============================================================================
-- Paper classification (A/B/C/D) and Industry Risk Tier for merchant applications
-- Based on: Paper A/B/C/D classifier (Cash-Flow-Proxy Paper Model)
-- Run after merchant_applications and industry_risk_lookup exist.
-- =============================================================================

-- Add columns to merchant_applications for computed paper classification
alter table public.merchant_applications
  add column if not exists industry_risk_tier text,
  add column if not exists paper_type text,
  add column if not exists paper_score numeric(5,2);

comment on column public.merchant_applications.industry_risk_tier is 'Display tier for paper model: Low | Medium | High | Very High';
comment on column public.merchant_applications.paper_type is 'Paper grade from composite score: A | B | C | D';
comment on column public.merchant_applications.paper_score is 'Composite paper score 0–100 (TIB 30% + Revenue 30% + Industry 20% + Funding Multiple 20%)';

-- Optional: component scores for audit/debug (can be added later)
-- alter table public.merchant_applications
--   add column if not exists paper_tib_score numeric(5,2),
--   add column if not exists paper_revenue_score numeric(5,2),
--   add column if not exists paper_industry_score numeric(5,2),
--   add column if not exists paper_multiple_score numeric(5,2);
