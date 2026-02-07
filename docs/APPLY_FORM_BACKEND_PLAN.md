# Apply Form — Backend, Google Drive & PDF Plan

This document describes how to implement **Stage 2 (Supabase)**, **Stage 3 (Google Drive + file uploads)**, and **Stage 4 (PDF generation)** for the `/apply` merchant application form. The form UI is implemented and available at **`/apply`** (dev only; not deployed to production until testing is complete).

---

## Stage 1 (Done)

- **URLs:** `/apply` and `/application` (rewritten to `/`; form lives in `components/apply-form/`).
- **Content:** 5-step form (Personal Info, Business Info, Financial & Funding, Credit & Ownership, Documents & Agreement).
- **Features:** Progress sidebar, step progress bar, security message, file upload inputs (PDF, JPG, JPEG, GIF, CSV), signature pad on page 5, and audit trail (timestamp + audit ID) for the signature.
- **Submit:** Currently logs to console and shows an alert. No backend.

---

## Stage 2 — Supabase

### What I need from you

1. **Supabase project**
   - Project URL (e.g. `https://xxxxx.supabase.co`)
   - Anon (public) key for client-side if we ever need it
   - **Service role key** (or a key with insert permission to the tables below) for **server-side only** (e.g. Next.js API route or Server Action). Never expose the service role key in the browser.

2. **Confirm table design** (or create the table yourself from this):

   - **Table: `merchant_applications`**
     - Columns aligned with the form (snake_case in DB is fine; we can map from camelCase in the app):
       - `id` (uuid, default `gen_random_uuid()`, primary key)
       - `created_at` (timestamptz, default `now()`)
       - **Personal:** `first_name`, `last_name`, `email`, `phone`
       - **Business:** `business_name`, `dba`, `type_of_business`, `start_date_of_business`, `ein`, `address`, `city`, `state`, `zip`, `industry`
       - **Financial:** `monthly_revenue`, `funding_request`, `use_of_funds`
       - **Credit/Ownership:** `ssn`, `owner_address`, `owner_city`, `owner_state`, `owner_zip`, `ownership_percent`
       - **Signature:** `signature_data_url` (text), `signed_at` (timestamptz), `audit_id` (text)
     - Optional: `gdrive_folder_id` (text) to store the Google Drive subfolder ID for this application.

   - **Storage bucket:** e.g. `merchant-documents` (private), with RLS so only authenticated backend or service role can read/write. We’ll store uploaded files here and optionally reference them in a table like `merchant_application_files` (e.g. `application_id`, `file_name`, `storage_path`, `content_type`).

### How I’ll implement it

- **Next.js Server Action** (or API route) that:
  - Accepts the form payload (and optionally files; see Stage 3).
  - Inserts one row into `merchant_applications` (with signature + audit fields).
  - Returns success/error so the front-end can show a confirmation or error.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or a dedicated key with insert access). Service role used only on the server.

---

## Stage 3 — File uploads (Supabase + Google Drive)

### File handling

- **Accepted formats:** PDF, JPG, JPEG, GIF, CSV (already enforced in the form).
- **Two destinations:**
  1. **Supabase Storage**  
     - One bucket (e.g. `merchant-documents`).  
     - Path structure suggestion: `{application_id}/{field_name}/{filename}` so each submission has its own folder and we know which field the file came from (e.g. `bank_statements`, `void_check`, `drivers_license`).
  2. **Google Drive**  
     - One folder per application: **`MM-DD-YYYY_Merchant_Name`** (e.g. `02-05-2026_Acme_LLC`).  
     - All uploaded files for that application go into this subfolder (created on first upload).

### What I need from you for Google Drive

**Option A — Service account (recommended)**

- A **Google Cloud project** with the **Google Drive API** enabled.
- A **service account** and its **JSON key file**.
- A **shared Drive folder** (or a folder in “My Drive”) that will hold all application subfolders. Share that folder with the service account email (e.g. `xxx@xxx.iam.gserviceaccount.com`) with **Editor** access.
- You give me the **folder ID** of that parent folder (from the folder’s URL: `https://drive.google.com/.../folders/<FOLDER_ID>`).

No need to “log into” your Google account in the app; the service account acts as a bot that writes into the folder you shared.

**Option B — OAuth with your account**

- We’d use OAuth so the app can act as “you” and create folders in your Drive. This requires you to log in once (or refresh tokens), and is more fragile for an automated flow. Option A is simpler and more reliable for backend-only uploads.

### How I’ll implement it

- **Upload flow:**
  - User submits the form (including files).
  - Server Action (or API route):
    1. Inserts `merchant_applications` and gets `application_id`.
    2. Builds merchant folder name: `MM-DD-YYYY_{business_name}` (sanitized).
    3. **Supabase:** For each file, upload to `merchant-documents/{application_id}/{field_name}/{filename}`.
    4. **Google Drive:** Ensure folder `MM-DD-YYYY_Merchant_Name` exists (create if not), then upload each file into that folder.
- Env vars: Google Drive will need the path to the service account JSON or its contents (e.g. `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`), plus the parent folder ID (e.g. `GOOGLE_DRIVE_APPLICATIONS_FOLDER_ID`).

---

## Stage 4 — PDF generation

### Requirements (from you)

- Application form data converted to **PDF**.
- **Mask:** Email and phone number (e.g. `***@***.***`, `***-***-****`) in the PDF.
- **Footer:** Company logo + signature image + audit trail (e.g. “Signed at: {timestamp}”, audit ID).
- **Destination:** Same Google Drive subfolder as the uploads (`MM-DD-YYYY_Merchant_Name`).

### How I’ll implement it

- **Library:** Use a server-side PDF library, e.g. **`@react-pdf/renderer`** or **`jspdf`** + **`html2canvas`**, or **Puppeteer** for HTML→PDF. For Next.js, a **Server Action** or API route that builds the PDF and returns a buffer is best; then we upload that buffer to Google Drive (and optionally to Supabase Storage).
- **Content:** One section per form step; all fields with labels; replace `email` and `phone` with masked placeholders in the data we pass to the PDF.
- **Footer:** Embed the company logo (from `/public/images/logo-one.png` or similar), the signature image (from `signature_data_url`), and a line like: “Signed at: {signed_at} | Audit ID: {audit_id}”.
- **Flow:** After inserting the row and uploading user files, generate the PDF, then upload it to the same Drive folder (and optionally to Supabase) with a name like `Application_MM-DD-YYYY_Merchant_Name.pdf`.

---

## Suggested order of work

1. **Stage 2** — Supabase table + insert from form (no files yet). You provide Supabase URL + service role key and confirm or create the table.
2. **Stage 3** — Add file upload to Supabase Storage, then add Google Drive (service account + folder ID). Each application gets a subfolder and all files go to both Supabase and Drive.
3. **Stage 4** — Add PDF generation with masked email/phone and logo + signature + audit trail in the footer; save the PDF into the same Drive subfolder (and optionally Supabase).

---

## Summary: what to send me

| Stage | What I need |
|-------|----------------|
| **Supabase** | Project URL, service role key, confirmation that `merchant_applications` (and optionally `merchant_application_files`) table and `merchant-documents` bucket exist or that I should provide SQL. |
| **Google Drive** | Prefer **Option A**: service account JSON (or path) + parent folder ID. Or **Option B**: OAuth set up and folder ID. |
| **PDF** | Logo path (e.g. `/public/images/logo-one.png`) and confirmation that email/phone should be masked and signature + audit trail in footer. |

The form is ready for UI/UX testing at **`/apply`**. Once you’re happy with it and the above access is ready, we can implement Stages 2–4 in order.
