# Stage 2 – Supabase: What We Need From You

To wire the application form to Supabase (email lookup + save applications), we need the following.

---

## 1. Supabase project access

| What | Where to find it | Used for |
|------|------------------|----------|
| **Project URL** | Supabase Dashboard → Project Settings → API → Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| **Service role key** | Same page → Project API keys → `service_role` (secret) | `SUPABASE_SERVICE_ROLE_KEY` (server-only, never in browser) |

- **Project URL** can be public (e.g. in env as `NEXT_PUBLIC_*`) so the client can call your backend or Supabase from the front end if needed.
- **Service role key** must be used only on the server (Next.js API route or Server Action). Do not expose it in the client.

---

## 2. New tables for the application form

We’ve provided the SQL in **`docs/supabase-merchant-applications.sql`**.

- Run that script in the **Supabase SQL Editor** (or apply it yourself) so that:
  - **`merchant_applications`** exists with a UUID `id` and all form fields (including file metadata and signature).
  - **`merchant_application_files`** exists to reference uploaded files per application.

You don’t need to send the SQL back; just confirm once the tables (and indexes/triggers) are created.

---

## 3. Existing table for “lookup by email” (prefill steps 2–4)

You said: *“Check in the existing table of supabase if the merchant email id is available … auto-populate as much of steps 2–4 as possible. Don’t … populate users SSN.”*

To implement that we need:

| What | Description |
|------|-------------|
| **Table name** | The Supabase table that already stores merchant/customer data keyed by (or searchable by) email. |
| **Column list (optional but helpful)** | Either the exact column names in that table, or a short description (e.g. “same as application form but with columns X, Y”). |

We will:

- Look up by **email** (the one they enter in Step 1).
- If a row is found, **prefill** only steps **2, 3, and 4** (Business, Financial, Credit/Ownership).
- **Never prefill SSN**; the user always types that themselves.
- Map from your existing table’s columns to our form fields (e.g. `business_name` ↔ `business_name`, or whatever the actual names are).

So please send:

1. **Name of the existing table** (e.g. `merchants`, `customers`, `applicants`).
2. **List of columns** in that table (or a screenshot of the table structure from Supabase Table Editor). If the table has different column names, we’ll map them to our form (e.g. `company_name` → `business_name`).

If you prefer not to share column names, we can assume generic names (e.g. `email`, `business_name`, `ein`, `address`, …) and you can correct the mapping.

---

## 4. Storage bucket (for file uploads)

For **uploaded files** (bank statements, void check, driver’s license) we’ll use a **Storage bucket**.

- Create a bucket named **`merchant-documents`** in Supabase:  
  **Storage → New bucket → Name: `merchant-documents`** (private is fine; the server will use the service role to write).
- No need to send anything else; we’ll reference this name in code.

If you prefer a different bucket name, tell us and we’ll use that instead.

---

## 5. Summary checklist

- [ ] **Project URL** and **Service role key** (you’ll add them to `.env.local`; we never commit keys).
- [ ] **`merchant_applications`** and **`merchant_application_files`** created from `docs/supabase-merchant-applications.sql`.
- [ ] **Existing table name** for lookup by email (and optionally its columns) so we can prefill steps 2–4 and exclude SSN.
- [ ] **Storage bucket** `merchant-documents` (or your chosen name) created in Supabase.

Once you provide (1) URL + key, (2) confirmation that the new tables exist, (3) existing table name (+ columns if possible), and (4) bucket name if different, we can implement:

1. **Lookup by email** and prefill of steps 2–4 (no SSN).
2. **Submit** writing one row to `merchant_applications` with a UUID and, when we add file uploads, rows in `merchant_application_files` and files in the bucket.
