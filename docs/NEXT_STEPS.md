# Next steps (Merchant DB + OneDayCap website)

All Supabase work uses **Merchant DB** only. Do not touch **WatermarkFile**. See `docs/SUPABASE_PROJECTS.md`.

---

## 1. Merchant DB – run SQL in order (if not already done)

In **Merchant DB** → SQL Editor, run these once:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `docs/supabase-merchant-applications.sql` | `merchant_applications`, `merchant_application_files`, `set_updated_at()` |
| 2 | `docs/supabase-application-sessions.sql` | Abandonment nudges, resume links, 15-day follow-up |
| 3 | `docs/supabase-staging-contact-activity.sql` | `staging` (if missing), `contact_activity`, views for “not contacted” / “available for outreach” |

Also run any other SQL you use: `supabase-abandoned-application-progress.sql`, `supabase-staging.sql` or lookup RPC, storage policies, etc., all in **Merchant DB**.

---

## 2. Env (Merchant DB + cron)

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and anon key if needed) must point at **Merchant DB**.
- **Cron (abandonment + funnel):** Set `CRON_SECRET` in Vercel (and in `.env.local` if you hit cron routes locally). Vercel Cron will send it when calling `/api/cron/*`.
- **Optional:** `NEXT_PUBLIC_APP_URL` (e.g. `https://www.onedaycap.com`) so resume/unsubscribe links in emails use the right domain.

---

## 3. Quick checks

- **Resume link:** Open `https://<your-host>/apply/resume?t=<token>` with a valid `application_sessions.token` → should redirect to `/apply` with email/step prefilled.
- **Unsubscribe:** Open `https://<your-host>/unsubscribe?t=<token>` → that session’s `opted_out` should become `true`.
- **Cron (manual):**  
  `GET https://<your-host>/api/cron/abandonment-nudges`  
  with header `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret: <CRON_SECRET>`) → should return `{ ok: true, ... }`.
- **Contact activity:** After sending outreach, insert into `contact_activity` (email, `outreach`). Then `SELECT * FROM staging_not_contacted` and `staging_available_for_outreach` should exclude those contacts.

---

## 4. Optional app wiring

- **Record outreach:** When you send campaigns (e.g. from Instantly or another tool), insert a row into Merchant DB `contact_activity` (email, `activity_type = 'outreach'`, optional `staging_id`) so those contacts drop out of `staging_not_contacted` / `staging_available_for_outreach`.
- **Record nudges in contact_activity:** If you want one place for all touches, the app can insert `nudge_30m` / `nudge_24h` / `nudge_15d` into `contact_activity` when those emails are sent (today only `application_sessions` is updated).

---

## 5. Deploy

- Push to your repo; Vercel will deploy. Ensure **Merchant DB** env vars and `CRON_SECRET` are set in Vercel. Crons will run on the schedules in `vercel.json` (abandonment every 5 min, 15-day daily, funnel digest noon + 3pm CT).

That’s the path from “Merchant DB clarity” to a fully wired site and clean outreach lists.

---

## Quick test checklist (before/after deploy)

- [ ] **Build**: `npm run build` succeeds.
- [ ] **Resume**: Open `/apply/resume?t=<valid-token>` (insert a token from `application_sessions`) → redirects to `/apply` with email/step prefilled.
- [ ] **Unsubscribe**: Open `/unsubscribe?t=<valid-token>` → “You’ve been unsubscribed” and row has `opted_out = true`.
- [ ] **Session event**: Submit step 1 with an email → row appears in `application_sessions` (or `current_step`/`last_event_at` updates).
- [ ] **Cron (manual)**:  
  `curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://<your-host>/api/cron/abandonment-nudges"`  
  returns `{"ok":true,...}`. Repeat for `funnel-digest-noon` (no need to wait for schedule).
- [ ] **Nudge CC**: After a nudge is sent (e.g. 30m), check that subs@onedaycap.com received a CC.
- [ ] **Funnel digest**: Trigger funnel digest cron; open the email and confirm columns: Email, Step, Last event, Phone, Revenue, City (Staging data when present).
