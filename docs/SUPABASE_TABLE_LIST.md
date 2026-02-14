# Supabase table list

Reference for the Merchant DB project. Tables/views as shown in Supabase Studio.

## Tables

| Table | Purpose |
|-------|--------|
| `pre_staging` | Landing table for merchant DB CSV uploads; process moves new rows to staging, dupes to staging_quarantine (migration 006) |
| `staging_quarantine` | Duplicates from pre_staging that already exist in staging; audit only (migration 006) |
| `staging_import_job` | Per-upload counts: pre_staging_count, dup_count, inserted_count (migration 006) |
| `Staging` | Staging / prefill lookup (capital S) |
| `staging` | Staging (lowercase; see deploy-merchant-db) |
| `abandoned_application_progress` | Abandonment tracking |
| `application_sessions` | Funnel, nudges, resume links |
| `contact_activity` | Outreach + nudge activity per contact |
| `merchant_applications` | One row per application submission |
| `merchant_application_files` | File refs per application (Storage) |
| `decline_reasons` | Lookup for decline taxonomy |
| `funders` | One row per funding partner (CRM) |
| `funder_contacts` | One contact per funder |
| `funder_submission_rules` | Per-funder To/CC for submissions |
| `funder_guidelines` | Eligibility, min/max funding, required_docs |
| `funder_commission_terms` | How we get paid |
| `funder_internal_rating` | Optional internal rating |
| `funder_notes` | Optional notes per funder |
| `funder_submissions` | One row per “application sent to funder” |
| `submission_messages` | Per-email audit (message_id, to/cc, attachments) |
| `submission_events` | Timeline: sent, opened, replied, declined, offered |
| `funder_offers` | Offers from funder (terms, status) |
| `funded_deals` | Closed deals (application + funder + offer) |
| `commission_ledger` | Expected/paid commission per funded deal |

## Views

| View | Purpose |
|------|--------|
| `staging_not_contacted` | Staging rows with no outreach activity |
| `staging_available_for_outreach` | Not contacted and not in application_sessions |

## Migration sources

- Merchant / sessions / staging / contact: `docs/supabase-deploy-merchant-db.sql`, `docs/supabase-merchant-applications.sql`, `docs/supabase-application-sessions.sql`, `docs/supabase-abandoned-application-progress.sql`, `docs/supabase-staging-contact-activity.sql`
- Funder schema: `docs/supabase-funder-schema.sql`
