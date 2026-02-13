# Production test: full funder flow

Use this to test the full scenario in production: application submit → **auto-send to shortlisted funders** → emails (funder + CC + summary). You can also send manually from `/submit-to-funders`.

---

## Before you start

- [ ] **Build passes:** `npm run build` (already verified).
- [ ] **Deploy:** Push to your repo; Vercel (or your host) deploys. Ensure production env has: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (e.g. subs@onedaycap.com; domain must be verified in Resend).
- [ ] **Funder schema in production DB:** In Supabase (Merchant DB) → SQL Editor, run `docs/supabase-funder-schema.sql` once if not already done (adds `phone` to funder_contacts if missing).

---

## Is Resend configured for this workflow?

The funder flow uses the **same** `sendEmail()` used for application submit (merchant confirmation + internal notification). So if those emails work in production, Resend is already set up; the funder flow only adds **more recipients (To/CC)** and **multiple attachments** (application PDF + bank statements + void check + driver’s license).

**Checklist:**

| Check | Where | Why |
|-------|--------|-----|
| **RESEND_API_KEY** set in production | Vercel → Project → Settings → Environment Variables | Without it, `sendEmail()` returns “Email not configured” and no email is sent. |
| **From domain verified** | Resend Dashboard → Domains | The “from” address (e.g. `subs@onedaycap.com` or `RESEND_FROM_EMAIL`) must use a domain you’ve added and verified in Resend (DNS records). Otherwise Resend may reject or fail the send. |
| **RESEND_FROM_EMAIL** (optional) | Vercel env | Default is `subs@onedaycap.com`. Set only if you use a different sending address; it must use a verified domain. |

**Funder-specific behavior:**

- **To:** From `funder_submission_rules.to_emails` (or `funder_contacts.email`).
- **CC:** Those CC addresses **plus** `subs@onedaycap.com` (so you always get a copy).
- **Attachments:** All application files (PDF + uploads). Same Resend attachment API as application submit; if that works, funder emails will too.
- **Summary email:** Separate send to `subs@onedaycap.com` (no attachments). No extra config.

**Quick test:** If you can receive the merchant confirmation email and the internal “application submitted” email when someone completes the apply form, Resend is configured correctly for the funder workflow too. Then run the seed, use submit-to-funders, and confirm you get the funder email, CC, and summary.

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

## 2. Submit a test application (triggers auto-send to shortlisted funders)

1. Open production site → **Apply** (e.g. `https://www.onedaycap.com/apply` or your production URL).
2. Complete all 5 steps and submit (use test data; you can use your own email so you get the merchant confirmation too).
3. On success, the app **automatically** finds funders whose guidelines match this application (revenue, state, funding range, etc.) and sends the full application package to each, CC subs@, plus a summary email to subs@. So you should receive: merchant confirmation, internal “application submitted” email, **funder email(s)** (if any funder matched), **CC** of those, and **summary** (who was reached).
4. For **Eminent** to match: application monthly revenue must be **$50K+**. For **Pivot**: **$10K–$50K**. If the test application’s “Monthly Revenue” is outside those ranges, no funder will match and no funder email is sent; use `/submit-to-funders` to send manually, or change the application’s revenue to fall in range and submit again.

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

- **Nothing happened after submit (no funder email, no summary):** Auto-send only runs for **shortlisted** funders. Check that the application’s Monthly Revenue and Funding Request (and state/industry if set on guidelines) match at least one funder’s guidelines. Eminent = $50K+ monthly revenue; Pivot = $10K–$50K. If none match, use `/submit-to-funders` to send manually.
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
