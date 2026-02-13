# Deployment checklist (Vercel)

## Cron: pending-documents-reminder

On **Vercel Hobby**, crons can run only **once per day**. The pending-documents-reminder is set to `0 14 * * *` (daily at 14:00 UTC) so deployment succeeds. On **Pro**, you can change it in `vercel.json` to `*/5 * * * *` for every-5-minute reminders.

## Why production might not show the new version

1. **Git not triggering deploy**
   - Vercel → Project → **Settings → Git**: confirm repository is connected and **Production Branch** is `main`.
   - **Deployments**: check if the latest commit (`ba6022e` or newer) has a deployment. If not, Git integration or webhook may be broken.

2. **Build failing on Vercel**
   - **Deployments** → click latest deployment → **Building** or **Logs**.
   - If status is **Failed**, open the build logs. Common causes:
     - **Tests failing**: `prebuild` runs `npm run test`. If Jest fails on Vercel (e.g. Node version), the build fails. Fix tests or temporarily set **Build Command** to `next build` in Vercel → Settings → General.
     - **Missing env vars**: e.g. `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — add them in Vercel → Settings → Environment Variables (Production).

3. **Wrong branch**
   - **Settings → Git**: ensure **Production Branch** is `main`. If it’s another branch, either change it to `main` or merge and push to that branch.

4. **Cache**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac).
   - Or open the site in an incognito/private window.

## How to verify the new form is live

- **Step 4**: Title **"Owner & Signatures"**; button **"Save & Next"** (not "Next").
- **Step 5**: Title **"Upload Documents"**; button **"Submit Documents"** (not "Submit Application").

Or in DevTools (F12) → Elements: select the apply form and check for  
`data-form-version="step4-save-next-step5-submit-docs"`.

## Deploy without Git (CLI)

From the project root:

```bash
vercel login
vercel --prod
```

Use the same Vercel account/team as the linked project so the CLI deploys to the correct production URL.
