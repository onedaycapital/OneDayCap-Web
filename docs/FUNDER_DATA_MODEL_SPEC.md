# Funder Data Model – Aligned Spec (Pre-Implementation)

This doc captures the agreed design for the **funder side** (CRM + submissions + commissions + messages) on top of the existing merchant tables. Build **in unison** so we can test end-to-end. **Phase 1 implementation: email only** (shortlist funders → email them the application); no API or portal at this time.

---

## 1. Scope and phasing

- **Delivery:** All funder-side tables/migrations completed together so we can test the full flow end-to-end.
- **First use case:** Shortlist funders → email them the application (email only; no API or portal).

---

## 2. Core Funder CRM

### `funders`
- One row per funding partner.
- No multiple entities per partner (e.g. parent + brands) at this time.
- **Relationship status** (important): enum or lookup — e.g. `active` | `paused` | `do_not_send` | `limited` | `needs_call_first`. Include `status_reason` and `status_updated_at` if useful.
- **SLA / response expectations:** Columns on `funders` (e.g. hours to first response, hours to offer, funding speed).
- **Compliance:** Not required at this stage (no NDA/ISO/state restrictions/disclosures tables).

### `funder_contacts`
- **One contact per funder** (one primary point of contact).
- **One email per contact** (single email field).
- No role/type or primary flag at this time.
- At submission time we still support **multiple To and CC** (see `funder_submission_rules`): the contact’s email plus other addresses the funder has given (e.g. submit desk, AE) are stored in submission rules.

### `funder_submission_rules`
- **Per-funder** (and effectively per-channel; for Phase 1, channel = email only).
- **Per-contact overrides:** Store who to send to and who to CC for this funder when we submit. So: **To list** and **CC list** (each can be multiple emails, including the funder contact and any other addresses).
- One row per funder (or one per funder + channel when we add more channels). Columns: e.g. `funder_id`, `to_emails` (array or JSONB), `cc_emails` (array or JSONB), optional formatting norms.

### `funder_guidelines`
- Credit box + constraints + doc requirements.
- **Eligibility / rule-based filters** (as columns and/or JSONB):  
  states, industries, time in biz, revenue, **1st position**, **2nd to nth position**, **current MCA loans**, **defaults**, **bankruptcy**, **minimum FICO score**, etc.
- **Also from funder:**  
  - **Min and max funding**  
  - **Turnaround time**  
  - **Bonus, commission points, incentives for multiple deals funded**  
  - **Commission payment plan** (e.g. same day, end of week, beginning of next week, 7 days out, 2 days out)
- **Required docs checklist:** Store on **`funder_guidelines`** (per funder). One row per funder; required docs can be a JSONB array of doc types or a simple text array (e.g. `required_docs text[]` or `required_docs jsonb`). This keeps “what this funder needs” in one place and is easy to show in the UI when shortlisting. *If* a funder later has multiple products with different doc sets, we can add a `funder_guideline_products` or similar; for Phase 1, per-funder is enough.
- **Structure:** Hybrid suggested: key filters as columns (revenue min/max, term min/max, states allowed/excluded, min/max funding, FICO min, etc.); more complex or variable rules in a JSONB “rules” or “criteria” column.

### Submission channel types
- **Email only** for Phase 1. Store on funder (e.g. `submission_channel` or supported channels); per-submission we record channel used (email).

### Offer terms structure
- Belongs on **`funder_offers`** (factor rate/interest, term, payment frequency, holdback, origination, prepay rules). Funder profile can omit or use only for “typical” display.

### Decline reason taxonomy
- **`decline_reasons`** = lookup table (id, code, label, optional category).
- **Source:** Lookup from **email response** (standardized list for analyzing rejects).
- **`funder_submissions`** and/or **`submission_events`** store `decline_reason_id` (and optional free text) when status = declined.

### Commissions
- **`funder_commission_terms`:** How we get paid (rate, trigger: funded amount vs funded + renewal, etc.).
- **`commission_ledger`:** Expected vs paid, payment method, trace/reference id, dates. **Link to `funded_deal_id`** (and `funder_id`) — ledger rows represent expected/earned/paid commission per closed deal.

### Attachments / logged messages
- **`submission_messages`** (or `funder_submission_emails`): One row per email sent/received for a submission. Fields: message_id, thread_id, from/to/cc, **attachment links** (Drive/S3 URLs). Keeps full audit of what was sent; **submission_events** stay high-level (sent/opened/replied/declined/offered).

---

## 3. Submission + performance audit trail

- **`funder_submissions`:** One row per “we sent a deal to this funder.” Columns: `merchant_application_id`, `funder_id`, `submitted_at`, `channel` (email for Phase 1), `status`, optional `decline_reason_id`, and “who it was sent to” (e.g. to/cc snapshot or link to the submission_message).
- **`submission_events`:** Timeline per submission: event_type (sent, opened, replied, requested_docs, declined, offered, etc.), `occurred_at`, optional `decline_reason_id`, optional `submission_message_id`.
- **`funder_offers`:** One submission can have multiple offers (e.g. counter-offers). Terms (factor rate, term, payment frequency, holdback, origination, prepay rules), `offered_at`, status (pending/accepted/expired/withdrawn).
- **`funded_deals`:** One row per closed deal. Links: `merchant_application_id`, `funder_id`, accepted `funder_offer_id`, `funded_at`, `funded_amount`, etc. Drives commission expectations.
- **`commission_ledger`:** Rows keyed by `funded_deal_id` (and `funder_id`): expected amount, earned/paid amount, payment method, trace/reference id, dates.

---

## 4. Required docs checklist – suggestion

- **Store on `funder_guidelines`** as **`required_docs jsonb`** (Option B). Example: `[{"code": "bank_statements_3mo", "label": "Last 3 months bank statements"}, {"code": "void_check", "label": "Void check"}, ...]`. Easy to extend later with extra fields (e.g. min_months, required_if) without schema changes. No separate lookup table for Phase 1 unless we need it.

---

## 5. Table list (summary)

| Module | Table | Purpose |
|--------|--------|--------|
| Core CRM | `funders` | One row per partner; relationship status, SLA, no compliance for now. |
| Core CRM | `funder_contacts` | One contact per funder; one email. |
| Core CRM | `funder_submission_rules` | Per-funder To/CC lists (multiple emails) + formatting; email-only for Phase 1. |
| Core CRM | `funder_guidelines` | Eligibility rules, min/max funding, turnaround, commission terms, payment plan, **required_docs**. |
| Core CRM | `funder_commission_terms` | How we get paid (rate, trigger, etc.). |
| Core CRM | `funder_internal_rating` | Optional. |
| Core CRM | `funder_notes` | Optional. |
| Lookup | `decline_reasons` | Taxonomy for decline (from email response). |
| Submission | `funder_submissions` | One row per “we sent this application to this funder.” |
| Submission | `submission_events` | Timeline: sent, opened, replied, declined, offered, etc. |
| Submission | `submission_messages` | Per-email audit: message_id, thread_id, to/cc, attachment URLs. |
| Offers / deals | `funder_offers` | Offers from funder (possibly multiple per submission). |
| Offers / deals | `funded_deals` | Closed deals; links to application, funder, accepted offer. |
| Commissions | `commission_ledger` | Expected/paid per funded deal; payment method, reference id. |

Merchant side stays as-is: `merchant_applications`, `merchant_application_files`, `application_sessions`, `abandoned_application_progress`, `contact_activity`, `staging`, views.

---

## 6. Phase 1 app (done)

- **Migration:** `docs/supabase-funder-schema.sql` (single run).
- **Submit to funders:** Internal page `/submit-to-funders`:
  - Lists recent applications and all funders (with contact email).
  - User selects one application and one or more funders, then clicks “Send application to selected funders”.
  - Server action `submitApplicationToFunders(applicationId, funderIds)`:
    - Loads application PDF from storage; resolves To/CC from `funder_submission_rules` (or `funder_contacts`).
    - Sends email via Resend (subject + body + PDF attachment).
    - Inserts `funder_submissions`, `submission_messages`, `submission_events` (event_type `sent`).
  - Actions: `listFundersForSubmit`, `listRecentApplications`, `submitApplicationToFunders` in `app/actions/submit-to-funders.ts`.
