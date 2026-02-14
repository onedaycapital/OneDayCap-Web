# Admin Module – Phase 1 Implementation

Phase 1 scope: login, applications list, funder list, contract/guideline upload (extract → populate), purchased merchant DB upload to Pre-Staging with normalize/dedupe/quarantine and counts, and daily/weekly application activity reports.

---

## 1. Login

- **Goal:** Only internal team can access `/admin` and all admin routes.
- **Options:**
  - **A. Simple password (Phase 1):** Single shared password in env (`ADMIN_PASSWORD`). Login form sets a signed cookie or session; middleware checks it for `/admin/*`. No user DB.
  - **B. NextAuth / Supabase Auth (later):** Email/password or magic link; user table for audit.
- **Implementation:** Middleware or layout server component checks auth; redirect to `/admin/login` if unauthenticated. Logout clears session.

---

## 2. Applications List

- **Goal:** View and search merchant applications in one place.
- **Data:** `merchant_applications` (id, business_name, email, state, submission_status, created_at, etc.).
- **UI:** Table or card list with filters (date range, status: pending_documents | submitted), search by business name or email. Link to application detail or “Submit to funders” (existing flow).
- **Actions:** Reuse or extend `listRecentApplications` from submit-to-funders; add `listApplicationsForAdmin` with filters, pagination, and `submission_status`.

---

## 3. Funder List

- **Goal:** View all funders and key info (name, relationship_status, iso_agreement_signed, contact, guideline summary).
- **Data:** `funders`, `funder_contacts`, `funder_guidelines` (min/max funding, etc.).
- **UI:** Table with columns: name, status, ISO signed, contact email, min/max funding, link to “Edit” or “Upload contract/guidelines”.
- **Actions:** Reuse `listFundersForSubmit` or add `listFundersForAdmin` with guideline summary.

---

## 4. Contract / Guideline Upload – Extract and Populate

- **Goal:** Upload PDF (ISO contract or funder guidelines), extract structured data via LLM, then save to `funders` and `funder_guidelines`.
- **Flow:**
  1. Admin selects “New funder” or “Existing funder” and uploads PDF(s).
  2. Backend: extract text from PDF (e.g. pdf-parse); send text to LLM with schema + few-shot prompt; get JSON (funder_name, min_funding, max_funding, states_allowed, states_excluded, required_docs, etc.).
  3. Pre-fill a form with extracted data; admin reviews/edits and saves.
  4. Save: create or update `funders` (name, iso_agreement_signed if contract), `funder_guidelines` (all guideline fields). Optionally store PDF in storage (e.g. `funder-contracts/{funder_id}/filename.pdf`).
- **Dependencies:** PDF text extraction (library), OpenAI (or Ollama) API key, structured prompt. No agent required.

---

## 5. Purchased Merchant Database Upload → Pre-Staging

- **Goal:** Upload CSV (purchased list) into Pre-Staging, then normalize and dedupe against Staging; move duplicates to Quarantine and new rows to Staging; show original count, dup count, and inserted count.
- **Tables:**
  - **Pre_Staging:** Same column shape as `staging` (or compatible). Rows land here after CSV upload. Optional: `import_job_id`, `source_filename`, `uploaded_at`.
  - **staging:** Existing table; only new, deduped rows are inserted here.
  - **staging_quarantine:** Duplicates from Pre-Staging that already exist in Staging (by email match). Same columns as staging + `quarantine_reason` (e.g. `duplicate`), `original_staging_id`, `import_job_id`, `quarantined_at`.
  - **staging_import_job:** One row per upload: `id`, `filename`, `uploaded_at`, `pre_staging_count`, `dup_count`, `inserted_count`, `status` (e.g. pending, processed).
- **Flow:**
  1. Admin uploads CSV; backend parses and normalizes (trim, lowercase emails, etc.) and inserts into Pre_Staging; create `staging_import_job` with `pre_staging_count`, status `pending`.
  2. “Process” step: for each row in Pre_Staging, check if any of its email columns (Email 1–6, Owner 2 Email 1–5) already exist in Staging (normalized). If yes → insert row into `staging_quarantine` (with reason `duplicate`, original_staging_id if desired), increment dup count. If no → insert into Staging, increment inserted count.
  3. Update `staging_import_job`: `dup_count`, `inserted_count`, `status = processed`. Optionally clear or keep Pre_Staging rows for audit.
- **UI:** Upload CSV (with column mapping if needed), “Process” button, then show: original count, duplicates count, inserted count; link to view quarantine rows.

---

## 6. Daily / Weekly Application Activity Report

- **Goal:** Report of application activity for the last day or last week (submissions, pending_documents, funnel stats).
- **Data sources:**
  - `merchant_applications`: count by `submission_status`, by `created_at` (date range).
  - `application_sessions`: started, step progress, submitted (optional).
- **Metrics (examples):** Applications created (today / this week), Submitted (status = submitted), Pending documents (status = pending_documents); optionally: applications by day (chart or table).
- **UI:** Admin report page with “Daily” / “Weekly” toggle or two sections; table or cards with counts; optional export CSV.

---

## 7. File and Route Summary

| Area            | Routes / Files |
|-----------------|----------------|
| Auth            | `/admin/login`, middleware or layout auth check |
| Layout          | `app/admin/layout.tsx` (nav: Applications, Funders, Upload DB, Upload contract, Reports) |
| Applications    | `app/admin/applications/page.tsx`, actions in `app/actions/admin-applications.ts` |
| Funders         | `app/admin/funders/page.tsx`, actions in `app/actions/admin-funders.ts` |
| Contract upload | `app/admin/funders/upload/page.tsx` or `app/admin/upload-contract/page.tsx`, extract API + save action |
| Merchant DB     | `app/admin/upload-merchant-db/page.tsx`, actions: upload to Pre_Staging, process (dedupe, quarantine, counts) |
| Reports         | `app/admin/reports/page.tsx` or `app/admin/reports/activity/page.tsx`, actions: daily/weekly application stats |

---

## 8. Migrations

- **006:** Pre_Staging (if not already present), staging_quarantine, staging_import_job. See `docs/migrations/006-pre-staging-quarantine-import-job.sql`.

---

## 9. Environment

- Existing: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.
- Add for Phase 1: `ADMIN_PASSWORD` (simple auth), optional `OPENAI_API_KEY` (for contract/guideline extraction).
