# Amplitude + Abandonment Nudges & 15-Day Follow-Up

## Overview

- **Amplitude**: User ID set to email at step 1; events `Application Form Started`, `Application Step Viewed`, `Application Step Completed`, `Application Form Submitted` (and failures). Used for funnel analytics only.
- **Backend (source of truth)**: Table `application_sessions`; API `POST /api/app/session-event` updates session on step view/complete/submit. Drives all email triggers.
- **Resume link**: `https://<your-domain>/apply/resume?t=<token>` (no email in URL).
- **Unsubscribe**: `https://<your-domain>/unsubscribe?t=<token>`.

## 1. Database

Run the migration in Supabase SQL Editor:

- **File**: `docs/supabase-application-sessions.sql`
- Requires `set_updated_at()` (see `docs/supabase-merchant-applications.sql`).

## 2. Environment

- **CRON_SECRET**: Set in Vercel (and locally if you run crons). Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when invoking cron routes. Use the same value in your cron config.
- **NEXT_PUBLIC_APP_URL** (optional): Base URL for resume/unsubscribe links in emails. Defaults to `VERCEL_URL` or `https://www.onedaycap.com`.
- **RESEND_API_KEY**: Already used for application emails; same key is used for abandonment nudge emails from subs@onedaycap.com.

## 3. Cron Jobs (Vercel)

**Requirement:** The abandonment-nudges job runs every 5 minutes. Vercel **Hobby** plan only allows cron jobs to run **once per day**. You need **Pro** (or Team) for that schedule; otherwise the cron will not run (see [§9. Troubleshooting](#9-troubleshooting-cron-jobs-not-running)).

| Path | Schedule | Purpose |
|------|---------|--------|
| `/api/cron/abandonment-nudges` | Every 5 min | Send 30-min and 24-hour abandonment nudges |
| `/api/cron/followup-15d` | Daily 14:00 UTC | Send 15-day follow-up to non-submitters who visited |
| `/api/cron/funnel-digest-noon` | Daily 18:00 UTC (≈ noon CT) | Email subs@onedaycap.com list of incomplete funnel |
| `/api/cron/funnel-digest-3pm` | Daily 21:00 UTC (≈ 3pm CT) | Same digest at 3pm CT |

In Vercel: Project → Settings → Environment Variables → add **CRON_SECRET** (e.g. a random string). Vercel Cron will send it when triggering these routes.

## 4. Flow Summary

1. User enters email on step 1 and moves forward → session created/updated, token generated.
2. On every step view (with email) and step complete/submit → `POST /api/app/session-event` updates `application_sessions`.
3. On submit → `markSubmitted(email)` sets `submitted_at`; no more nudges.
4. Cron every 5 min: finds sessions eligible for 30m or 24h nudge; re-checks `submitted_at` before sending; sends email with resume + opt-out link; sets sent timestamp.
5. Cron daily: finds sessions eligible for 15-day follow-up (last_15d null or ≥15 days ago); sends one email; sets `last_15d_followup_sent_at`.
6. Cron noon/3pm CT: sends to subs@onedaycap.com a table of emails (and step, last_event_at) who have not submitted.

## 6. CC and digest details

- **CC on every nudge**: Every 30m, 24h, and 15-day nudge email is sent to the lead with **subs@onedaycap.com** in CC, so you get a copy of each nudge that goes out.
- **Funnel digest columns**: The noon and 3pm digest includes **Email**, **Step**, **Last event**, and when available from the Staging table (Merchant DB): **Phone**, **Revenue** (Monthly Revenue), **City**. Matching is by email (any of the 11 Staging email columns).

## 7. Optional: SMS or push when a nudge is sent

To get an instant alert (e.g. text to your phone) when any nudge is sent, you can add a small integration:

- **SMS**: After sending a nudge in the cron, call Twilio (or similar) to send an SMS to an admin phone number (e.g. `ADMIN_PHONE` in env). You’d set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, and `ADMIN_PHONE`, then in the nudge cron add one line that sends a short message like “Nudge sent to &lt;email&gt;”.
- **Push**: Would require a mobile app or web push subscription; more involved than SMS.

The CC on every nudge already gives you an immediate copy in your inbox; SMS is optional if you want a separate channel.

## 8. Manual Testing

- **Session event**: From the apply form, complete step 1 with an email; check Supabase `application_sessions` for a row.
- **Resume**: Create a row in `application_sessions` with a known `token`, then open `https://<host>/apply/resume?t=<token>`; you should be redirected to /apply with email and step prefilled.
- **Unsubscribe**: Open `https://<host>/unsubscribe?t=<token>`; row should get `opted_out = true`.
- **Cron**: Call `GET /api/cron/abandonment-nudges` with header `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret: <CRON_SECRET>`). Repeat for `followup-15d`, `funnel-digest-noon`, `funnel-digest-3pm`.
- **Test nudge (one-off)**: Call `GET /api/cron/send-test-nudges` with the same auth to send the 30m nudge to sree@uncha.us and sreedharu@gmail.com (CC subs@onedaycap.com). Use this to confirm delivery and review copy.
- **Funnel digest**: Ensure Staging (Merchant DB) has rows with matching emails; the digest will show Phone, Revenue, City when found.

## 9. Troubleshooting: cron jobs not running

If the 30‑min nudge or 3pm (or noon) digest never runs, check the following. **Resend is not the cause** if the application-form confirmation emails work; the same `RESEND_API_KEY` is used for cron emails.

### 9.1 Vercel plan (most common)

**On the Hobby plan, cron jobs can only run once per day.**  
Our `vercel.json` has:

- `abandonment-nudges`: **every 5 minutes** (`*/5 * * * *`)
- `funnel-digest-3pm`: once daily at 21:00 UTC

On Hobby, the **every-5‑minute** schedule is **invalid**. Vercel may reject it at deploy time with something like: *"Hobby accounts are limited to daily cron jobs. This cron expression would run more than once per day."* In that case the abandonment-nudges cron will not run at all. The 3pm digest (once per day) is allowed on Hobby, but if *no* crons run, check the next points.

**Fix:** Upgrade to **Pro** (or Team) so crons can run every minute, or change the abandonment job to once per day (and process all eligible 30m/24h in one run—behavior change).

### 9.2 Cron Jobs disabled

- Vercel → Project → **Settings** → **Cron Jobs** (left sidebar).
- Ensure **Disable Cron Jobs** is **not** turned on. If it is, enable cron jobs and redeploy if needed.

### 9.3 CRON_SECRET and authorization

- Vercel → **Settings** → **Environment Variables**.
- Ensure **CRON_SECRET** exists and is set for **Production** (and Preview if you test there). If it’s missing or wrong, the cron route returns **401 Unauthorized** and no emails are sent.
- Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when invoking cron jobs; the route checks this. Same value must be in the env and in the header.

### 9.4 View cron logs

- Vercel → **Settings** → **Cron Jobs** → open a job → **View Logs**.
- You’ll see whether the job was invoked and the **response** (e.g. 200 = success, 401 = auth failure, 404 = route not found, 500 = server error). Use this to see if the cron is being called and why it might not be sending emails.
