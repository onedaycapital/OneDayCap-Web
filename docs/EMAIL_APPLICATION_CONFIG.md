# Application email configuration

When a merchant submits the application, the app sends **two emails**:

1. **Email (a) to Merchant** — Confirmation with their application PDF attached. CC: subs@onedaycap.com.
2. **Email (b) to you (subs@onedaycap.com)** — Internal notification with subject "Merchant application {Business Name}", plus the application PDF and all files uploaded by the user.

Both are sent via [Resend](https://resend.com) from **subs@onedaycap.com** (or the address you set in `RESEND_FROM_EMAIL`).

---

## Config you need

### 1. `RESEND_API_KEY` (required)

- Create an API key at [Resend Dashboard → API Keys](https://resend.com/api-keys).
- Add to `.env.local` (and to production, e.g. Vercel):

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
```

If this is not set, neither email is sent. The application is still saved and the PDF is still stored in Supabase; only the email step is skipped. The server logs: `RESEND_API_KEY not set; skipping email.`

### 2. Verify your domain in Resend

Resend only sends from **verified** domains.

- In [Resend → Domains](https://resend.com/domains), add and verify **onedaycap.com** (add the DNS records they give you).
- The default “from” address is **subs@onedaycap.com**. That address must use a domain you’ve verified (e.g. onedaycap.com).

### 3. `RESEND_FROM_EMAIL` (optional)

- Default “from” for both emails is **subs@onedaycap.com**.
- To use a different address (e.g. noreply@onedaycap.com), set:

```env
RESEND_FROM_EMAIL=noreply@onedaycap.com
```

The address must use a domain you’ve verified in Resend.

---

## Editable email copy (templates)

You can change the **body** (and internal **subject**) of both emails without touching the rest of the code.

- **File:** `lib/email-templates.ts`
- **What to edit:**
  - **Merchant email**
    - `MERCHANT_EMAIL_SUBJECT` — subject (default: "You have successfully submitted your application with OneDayCap.com")
    - `MERCHANT_EMAIL_BODY` — body text. Placeholders: `{{firstName}}`, `{{businessName}}`.
  - **Internal email (to you)**
    - `INTERNAL_EMAIL_SUBJECT_TEMPLATE` — subject (default: "Merchant application {{businessName}}")
    - `INTERNAL_EMAIL_BODY` — body text. Placeholders: `{{businessName}}`, `{{applicationId}}`, `{{merchantEmail}}`.

Save the file and redeploy (or restart the dev server). No other config is needed to change the copy.

---

## Summary

| What | Value |
|-----|--------|
| **Email (a) To** | Merchant’s email (from the form) |
| **Email (a) CC** | subs@onedaycap.com |
| **Email (a) Subject** | "You have successfully submitted your application with OneDayCap.com" (editable in `lib/email-templates.ts`) |
| **Email (a) Attachment** | Merchant Application Form PDF only |
| **Email (b) To** | subs@onedaycap.com |
| **Email (b) Subject** | "Merchant application {Business Name}" (editable) |
| **Email (b) Attachments** | Application PDF + all uploaded files (bank statements, void check, driver’s license, etc.) |
| **From (both)** | subs@onedaycap.com (or `RESEND_FROM_EMAIL`) |

---

## If you don’t receive the emails

| Cause | What to do |
|-------|------------|
| **RESEND_API_KEY missing** | Add it to `.env.local` and restart (or redeploy). Check logs for "RESEND_API_KEY not set". |
| **Domain not verified** | Verify onedaycap.com (or the domain of your from address) in Resend → Domains. |
| **Wrong or unverified from** | Set `RESEND_FROM_EMAIL` to a verified address, or keep default and ensure that address is verified. |
| **Merchant email in spam** | Ask the merchant to check spam and add subs@onedaycap.com to contacts. |
| **Resend error** | In [Resend → Emails](https://resend.com/emails), check for failed sends and the error message. |

After a submit, check server logs for `Resend error:` or `sendEmail error:` to see the exact reason if a send fails.
