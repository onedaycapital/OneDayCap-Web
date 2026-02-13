# Project status – OneDayCap website

Quick view of **what’s done** and **what’s open**.

---

## Completed

### Merchant / application flow (pre-existing)
- Merchant application form (5 steps), submit to `merchant_applications` + files in storage.
- Application PDF generation, email to merchant + internal (subs@onedaycap.com).
- Application sessions (abandonment), resume links, 30m / 24h nudges, 15-day follow-up.
- Cron: abandonment nudges, funnel digest (noon + 3pm).
- Staging, contact_activity, views (staging_not_contacted, staging_available_for_outreach).

### Funder subsystem (Phase 1) – done in this project
- **Schema:** `docs/supabase-funder-schema.sql` – funders, funder_contacts (with phone), funder_submission_rules, funder_guidelines, funder_commission_terms, funder_submissions, submission_messages, submission_events, funder_offers, funded_deals, commission_ledger, decline_reasons. RLS enabled. Optional: funder_internal_rating, funder_notes.
- **Submit to funders:** Internal page `/submit-to-funders`:
  - Pick application (recent list), select funders (with **shortlist** = matched by funder_guidelines when application is selected).
  - Send: full package (application PDF + all bank statements, void check, driver’s license) to each funder’s To/CC from submission rules (or contact).
  - Email: subject “New Application: {Merchant Name} submitted by OneDay Capital LLC.”, body with merchant details + attachment list + Broker of Record + Confidential notice.
  - **CC subs@onedaycap.com** on every funder email.
  - **Summary email** to subs@onedaycap.com after send: application summary + table of recipients (funder name, primary contact name / email / **phone**, shortlist match, To, CC).
- **Shortlist matching:** `getMatchedFunderIds(applicationId)` from funder_guidelines (state, industry, revenue, funding). Doc: `docs/FUNDER_SHORTLIST_MATCHING.md`.
- **Setup script:** `npm run setup:supabase` runs merchant + abandoned + funder schema (when SUPABASE_DB_URL is set).

### Docs added/updated
- `docs/FUNDER_DATA_MODEL_SPEC.md` – funder data model and Phase 1 app summary.
- `docs/FUNDER_SHORTLIST_MATCHING.md` – how shortlist is computed.
- `docs/FUNDER_INBOUND_EMAIL_DESIGN.md` – inbox-first reply flow, “forward a copy” (Gmail steps), what we record auto vs manual, lifecycle (replied/declined/offered → offers → funded → commission).
- `docs/SUPABASE_TABLE_LIST.md` – reference list of tables/views.
- `docs/NEXT_STEPS.md` – includes funder Phase 1 and optional next steps.

---

## Open / to-do

### Funder – Phase 2 (outcomes and deals)
- [ ] **Send path:** Set **Message-ID** header when sending funder emails and store it in `submission_messages.message_id` (so we can match replies later). Keep **Reply-To** = your real inbox (e.g. subs@onedaycap.com).
- [ ] **Your Gmail:** Add filter to **forward a copy** of (funder) replies to a Resend receiving address (see `docs/FUNDER_INBOUND_EMAIL_DESIGN.md` §6.1).
- [ ] **Resend:** Turn on Receiving, get receiving address, add webhook `email.received` → e.g. `POST /api/webhooks/inbound-email`.
- [ ] **Inbound webhook handler:** Verify signature, fetch email (headers + body), match In-Reply-To to `submission_messages`, insert inbound `submission_message` + `submission_events` (replied/declined/offered), optional decline_reason_id and funder_offers. Idempotency by inbound message id.
- [ ] **Parsing:** Keyword (or later LLM) to infer replied vs declined vs offered; optional mapping to decline_reasons and parsing offer terms into funder_offers.
- [ ] **Manual “log outcome” form:** Internal page/form – pick submission → set status, decline reason, add/edit offer, mark which offer accepted, create funded_deal, record commission_ledger. Required for “which offer accepted,” funded deals, and commissions; also fallback when inbound parsing doesn’t run or is wrong.

### Optional / later
- [ ] Protect `/submit-to-funders` (e.g. secret query param or auth) if you ever share the URL.
- [ ] Record outreach in `contact_activity` when you send campaigns so staging views stay accurate.
- [ ] Optionally record nudge sends (30m, 24h, 15d) in `contact_activity` for a single touch history.

### One-time / ops
- [ ] Run `docs/supabase-funder-schema.sql` in Merchant DB if not already done (adds `phone` to funder_contacts if missing).
- [ ] Add funder data: funders, funder_contacts (name, email, phone), funder_submission_rules (To/CC), optionally funder_guidelines (for shortlist).
- [ ] Quick test checklist in `docs/NEXT_STEPS.md` (build, resume, unsubscribe, cron, nudge CC, funnel digest).

---

## Where to look

| Topic | Doc |
|-------|-----|
| What to run in Supabase, env, deploy | `docs/NEXT_STEPS.md` |
| Funder tables and Phase 1 app | `docs/FUNDER_DATA_MODEL_SPEC.md` |
| Shortlist logic | `docs/FUNDER_SHORTLIST_MATCHING.md` |
| Reply flow, forward a copy (Gmail), what we record | `docs/FUNDER_INBOUND_EMAIL_DESIGN.md` |
| Table list | `docs/SUPABASE_TABLE_LIST.md` |
