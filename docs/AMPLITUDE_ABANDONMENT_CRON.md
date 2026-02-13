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
| `/api/cron/abandonment-nudges` | Daily 16:00 UTC (10am CT) on Hobby; every 5 min on Pro | Send 30-min and 24-hour abandonment nudges |
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

### 9.4 Test cron after a redeploy

To confirm the deployed build has the cron (including backfill + 30m/24h nudges):

1. **Abandonment cron (auth + logic):**  
   `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer YOUR_CRON_SECRET" "https://www.onedaycap.com/api/cron/abandonment-nudges"`  
   Expect **200**. To see the JSON body:  
   `curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" "https://www.onedaycap.com/api/cron/abandonment-nudges"`  
   Expect `{"ok":true,"sent_30m":N,"sent_24h":N}` (N may be 0 if no candidates).

2. **Optional — test nudge email delivery:**  
   `curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" "https://www.onedaycap.com/api/cron/send-test-nudges"`  
   Expect 200 and test emails at the addresses in `send-test-nudges` (e.g. sree@uncha.us).

3. **Logs:** Vercel → **Deployments** → latest → **Logs**, or **Settings** → **Cron Jobs** → **View Logs**. Look for `[cron:abandonment-nudges]` (Starting run, Backfilled sessions…, Candidates loaded, Run complete).

If you get **401**, `CRON_SECRET` in Vercel doesn’t match or isn’t set for Production. If **404**, the route isn’t deployed (wrong deployment or path).

### 9.5 View cron logs (Vercel UI)

- Vercel → **Settings** → **Cron Jobs** → open a job → **View Logs**.
- You’ll see whether the job was invoked and the **response** (e.g. 200 = success, 401 = auth failure, 404 = route not found, 500 = server error). Use this to see if the cron is being called and why it might not be sending emails.

### 9.6 Deploy Hook (when Git push doesn’t trigger a deployment)

If pushes to `main` don’t create a deployment, use a **Deploy Hook** to trigger a build manually:

1. Vercel → Project → **Settings** → **Git** → scroll to **Deploy Hooks**.
2. **Name:** e.g. `Deploy main` (required — don’t leave empty).
3. **Branch:** `main` → **Create Hook**.
4. **Copy the URL** Vercel shows — it’s only shown once. Save it somewhere safe (e.g. a private doc or password manager). You can also paste it below for your team.
5. To deploy: open the URL in a browser or run `curl "YOUR_HOOK_URL"`. That starts a new deployment of the latest `main`.

**Deploy Hook URL (paste after creating):**
https://api.vercel.com/v1/integrations/deploy/prj_8gHeDyq2j1pQDnJlMI0xQ4e8H4AB/7l2cSzHdU0
```
# Replace with your URL from Vercel → Settings → Git → Deploy Hooks
# https://api.vercel.com/v1/integrations/deploy/prj_XXXX/XXXX
```

### 9.7 Unresolved: Git push not triggering deployment

**Issue:** Pushes to `main` (onedaycapital/OneDayCap-Web) do not create a deployment on Vercel. Workaround: use a Deploy Hook (§9.6) or manual Redeploy in the dashboard.

**Already tried:**
- Reconnected the Git repository in Vercel (Settings → Git → Disconnect → Connect).
- Confirmed GitHub App has access to all repositories and deployment permissions.
- Set Ignored Build Step to custom `exit 1` so builds are not skipped.
- GitHub repo **Webhooks** page is empty (no repo-level webhook; Vercel uses GitHub App).

**Likely cause:** The event from GitHub (push to `main`) is not reaching Vercel, or Vercel is not creating a deployment for this project when it receives it. Possible reasons: project under a different Vercel team than the one that installed the GitHub App; App installed for a different user/org; or a Vercel-side bug.

**Next steps to resolve:**
1. **Confirm project and App are same account:** In Vercel, check which **team/account** the project belongs to. In GitHub → Settings → Integrations → GitHub Apps → Vercel, check which account installed it. They must match; if not, connect the repo from the correct Vercel team.
2. **Create a new Vercel project:** Import the same repo (onedaycapital/OneDayCap-Web) as a **new** project. If the new project auto-deploys on push, the link works and the issue is specific to the original project; you can switch the domain to the new project or use it to compare settings.
3. **Contact Vercel support:** Provide project name, repo, and that “push to main does not create a deployment despite reconnecting Git and correct GitHub App permissions.” They can check server-side why the deployment isn’t being created.

**Version gap:** If `git push origin main` says "Everything up-to-date", your local/remote `main` is already current. Production may still be on an older commit (e.g. last successful Git-triggered deploy). Check Vercel → Deployments → Production deployment → commit SHA vs `git rev-parse origin/main`. The cron routes exist on `main` from commit 50bbe73 onward; if Production is before that, cron will 404 until a deployment from current `main` is live.

**Deploy from CLI (bypasses Git + hook):** From the repo root, run `vercel --prod` (after `npm i -g vercel` and `vercel link` if needed). This builds and deploys the current local code to Production and gets the latest commit (including cron) live without relying on push or Deploy Hook.
