# Production test: full funder flow

Use this to test the full scenario in production: application submit → submit to funders (shortlist) → emails (funder + CC + summary).

---

## Before you start

- [ ] **Build passes:** `npm run build` (already verified).
- [ ] **Deploy:** Push to your repo; Vercel (or your host) deploys. Ensure production env has: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (e.g. subs@onedaycap.com; domain must be verified in Resend).
- [ ] **Funder schema in production DB:** In Supabase (Merchant DB) → SQL Editor, run `docs/supabase-funder-schema.sql` once if not already done (adds `phone` to funder_contacts if missing).

---

## 1. Create a dummy funder (you can receive at this email)

In Supabase → Table Editor (or SQL):

**funders**

| name        | relationship_status | submission_channel |
|------------|----------------------|--------------------|
| Test Funder | active               | email              |

Copy the new row’s `id` (UUID).

**funder_contacts** (one row per funder)

| funder_id | email                    | name   | phone (optional) |
|-----------|--------------------------|--------|-------------------|
| \<paste funder id\> | \<your real email\> | Test Contact | (optional) |

**funder_submission_rules** (so we know where to send)

| funder_id | channel | to_emails           | cc_emails |
|-----------|---------|---------------------|-----------|
| \<paste funder id\> | email   | {\"\<your real email\>\"} | {}        |

Use an email you have access to so you receive the funder email, the CC, and the summary.

**Optional – shortlist:** To see your funder as “Shortlist” when you pick an application, add a **funder_guidelines** row for this funder (e.g. leave states_allowed / revenue_min / min_funding empty so they match any application, or set to match your test application’s state/industry/revenue/funding).

---

## 2. Submit a test application

1. Open production site → **Apply** (e.g. `https://www.onedaycap.com/apply` or your production URL).
2. Complete all 5 steps and submit (use test data; you can use your own email so you get the merchant confirmation too).
3. Confirm you receive the merchant confirmation email and that a row appears in **merchant_applications** (and **merchant_application_files** for the PDF + any uploads).

---

## 3. Submit that application to the dummy funder

1. Open **Submit to funders:** `https://<your-production-domain>/submit-to-funders`.
2. **Application:** Select the application you just submitted (top of the list).
3. **Funders:** You should see “Test Funder” (and “Shortlist” if you added matching guidelines). Select it.
4. Click **Send application to selected funders**.

---

## 4. Verify emails and data

- [ ] **Funder inbox (your email):** Received the funder email with subject “New Application: \<Merchant Name\> submitted by OneDay Capital LLC.”, body with merchant details and attachment list, and attachments (application PDF + bank statements, void check, driver’s license if you uploaded them).
- [ ] **CC:** subs@onedaycap.com (or your RESEND_FROM_EMAIL) received a CC of the same funder email.
- [ ] **Summary email:** subs@onedaycap.com received a separate “Funder submission summary: \<Merchant Name\> — sent to 1 funder(s)” with the table: Funder, Primary contact name, Primary contact email, Primary contact phone, Shortlist match, To, CC.
- [ ] **DB:** In Supabase, **funder_submissions** has one row (that application + Test Funder). **submission_messages** has one outbound row. **submission_events** has one “sent” event.

---

## 5. If something fails

- **No funder in list:** Check funders + funder_contacts exist and the page loaded (refresh).
- **“No application files” / “Application PDF not found”:** Ensure the test application completed and that **merchant_application_files** has at least the `application_pdf` row for that application.
- **Email not received:** Check Resend dashboard for sends; confirm RESEND_FROM_EMAIL domain is verified; check spam.
- **Summary not received:** Summary is sent only when at least one funder email succeeds; check for errors in server logs (Vercel logs or console).

---

## Quick reference

| Step              | Where |
|-------------------|--------|
| Create funder     | Supabase → funders, funder_contacts, funder_submission_rules |
| Submit application| Production site → /apply |
| Submit to funders | Production site → /submit-to-funders |
| Check DB          | Supabase → funder_submissions, submission_messages, submission_events |

You’re ready to push to production and run this flow end-to-end.
