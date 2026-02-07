# Finding server logs when Submit fails

When you click **Submit** and nothing happens (no redirect, no error on screen), the server action may be failing before the client gets a response. To see what’s happening on the server:

## Where to look in Vercel

1. Open [Vercel Dashboard](https://vercel.com) → your team → project **one-day-cap-web**.
2. Go to **Logs** (or **Monitoring** → **Logs**), or open the latest **Production** deployment and use **Functions** / **Runtime Logs**.
3. Trigger a submit on the live site, then refresh the logs. Filter by time or search for `[submit]`.

## What you’ll see

The submit action logs lines prefixed with `[submit]` in order:

| Log line | Meaning |
|----------|--------|
| `[submit] start` | Action was invoked. |
| `[submit] payload parsed, business: ...` | Form payload received. |
| `[submit] getting Supabase client` | About to connect to Supabase. |
| `[submit] insert ok, applicationId: ...` | Row saved in `merchant_applications`. |
| `[submit] generating PDF` | Building the PDF. |
| `[submit] sending email to merchant` | Sending confirmation email. |
| `[submit] sending email to internal` | Sending internal notification. |
| `[submit] returning success` | About to return to the client. |

If you **don’t see `[submit] start`** at all when you click Submit, the request isn’t reaching the server (e.g. client error, wrong URL, or request blocked).

If logs **stop** at a certain line, the failure is at the next step (e.g. stop after “getting Supabase client” → Supabase env or connection issue; stop after “inserting” → insert/RLS error).

Errors are logged with `[submit] submitApplication error:` or `[submit] Supabase insert error:` etc.; the next line usually has the message or stack.
