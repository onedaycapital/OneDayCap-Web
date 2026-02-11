# Where to find and set env vars (CRON_SECRET + Merchant DB)

Use **Merchant DB** only (not WatermarkFile). See `docs/SUPABASE_PROJECTS.md`.

---

## 1. Vercel (production)

Your app runs on Vercel. Env vars for production live here:

1. Go to **[Vercel Dashboard](https://vercel.com)** and sign in.
2. Open your **OneDayCap website project**.
3. Click **Settings** (top nav).
4. In the left sidebar, click **Environment Variables**.

There you’ll see (or add) variables. Key ones:

| Variable | Where to get it | Used for |
|----------|------------------|----------|
| **NEXT_PUBLIC_SUPABASE_URL** | Merchant DB (below) | Supabase API base URL |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | Merchant DB (below) | Supabase anon key |
| **SUPABASE_SERVICE_ROLE_KEY** | Merchant DB (below) | Server-only Supabase access (applications, sessions, staging) |
| **RESEND_API_KEY** | [Resend](https://resend.com) → API Keys | Sending emails (nudges, digest, application emails) |
| **CRON_SECRET** | You create it (below) | Authorizing cron routes so only Vercel Cron can call them |

Optional:

- **SUPABASE_STAGING_TABLE** – default `staging`; set only if your table name is different (e.g. `Staging`).
- **NEXT_PUBLIC_APP_URL** – e.g. `https://www.onedaycap.com` so resume/unsubscribe links in emails use the right domain.

After adding or changing vars, **redeploy** (Deployments → … on latest → Redeploy) so the new values are used.

---

## 2. Merchant DB (Supabase) – URL and keys

1. Go to **[Supabase Dashboard](https://supabase.com/dashboard)** and sign in.
2. Open the **Merchant DB** project (not WatermarkFile).
3. Click **Project Settings** (gear in the left sidebar).
4. Click **API** in the left menu.

You’ll see:

- **Project URL** → use as `NEXT_PUBLIC_SUPABASE_URL` in Vercel.
- **Project API keys**:
  - **anon public** → use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - **service_role** (secret) → use as `SUPABASE_SERVICE_ROLE_KEY`.  
  Copy the **service_role** key and paste it into Vercel; never expose it in the browser or in client-side code.

---

## 3. CRON_SECRET (you create it)

Vercel Cron calls your cron routes (e.g. `/api/cron/abandonment-nudges`) and sends this secret so the app knows the request is from your cron, not a random visitor.

1. **Create a long random string** (e.g. 32+ characters).  
   Examples:
   - Terminal: `openssl rand -base64 32`
   - Or use a password generator.
2. In **Vercel** → your project → **Settings** → **Environment Variables**, add:
   - **Name:** `CRON_SECRET`
   - **Value:** the string you generated (e.g. the output of `openssl rand -base64 32`)
   - **Environment:** Production (and Preview if you want to test crons on preview deploys).
3. Save.

You don’t need to put CRON_SECRET in Supabase. It only lives in Vercel. When Vercel’s cron runs your job, it sends `Authorization: Bearer <CRON_SECRET>` (if you’ve configured it that way in Vercel Cron settings).

**Optional (Vercel Cron config):** In Vercel → Project → **Settings** → **Cron Jobs**, you can set the same secret so Vercel sends it when invoking your cron routes. Our routes accept either `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.

---

## 4. Resend (email)

1. Go to **[Resend](https://resend.com)** → **API Keys**.
2. Create an API key (or copy an existing one).
3. In **Vercel** → **Environment Variables**, add **RESEND_API_KEY** with that value.

Ensure your sending domain (e.g. onedaycap.com) is verified in Resend so emails from subs@onedaycap.com work.

---

## 5. Local development (.env.local)

For running the app locally (`npm run dev`), use a **.env.local** file in the project root (it’s gitignored). Copy the same variable names and values you use in Vercel (Merchant DB URL/keys, RESEND_API_KEY, CRON_SECRET). You can use the same Merchant DB project for dev; use a strong CRON_SECRET so local cron tests are authorized.

Example minimal **.env.local**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
CRON_SECRET=your-secret-here
```

---

## Quick checklist

- [ ] Vercel → Settings → Environment Variables: **NEXT_PUBLIC_SUPABASE_URL**, **SUPABASE_SERVICE_ROLE_KEY** (and anon if needed), **RESEND_API_KEY**, **CRON_SECRET**.
- [ ] Merchant DB → Project Settings → API: copied URL and **service_role** key into Vercel.
- [ ] CRON_SECRET: created a random string and added it in Vercel (and in .env.local for local cron tests).
- [ ] After any env change in Vercel, redeploy so the new values are used.
