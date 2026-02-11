# Runtime logs (Vercel / build analysis)

Structured logging is used so you can filter and debug issues from **Vercel → Project → Logs** (or Build / Function logs).

## Log format

Each line is: **`[scope] message { "meta": "json" }`**

- **scope** – stable prefix to filter by (e.g. `cron:abandonment-nudges`).
- **message** – short description.
- **meta** – optional JSON with counts, ids, error message, etc.

## Scopes (search for these in Vercel logs)

| Scope | Where | What’s logged |
|-------|--------|----------------|
| `cron:abandonment-nudges` | 30m/24h nudge cron | Start, candidate counts, sent counts, per-email send failures, run errors |
| `cron:followup-15d` | 15-day follow-up cron | Start, candidate count, sent count, send failures, run errors |
| `cron:funnel-digest-noon` | Noon funnel digest | Start, row count, staging map size, send failure, run errors |
| `cron:funnel-digest-3pm` | 3pm funnel digest | Same as noon |
| `api:session-event` | POST /api/app/session-event | Invalid event/step (warn), upsert failure, request error |
| `api:resume` | GET /api/app/resume | Missing token, invalid/expired token |
| `app:application-session` | application-session lib | Update/insert/query errors, markSubmitted failure |
| `email:send` | send-application-email | RESEND_API_KEY missing, Resend API error, sendEmail exception |
| `staging:contact-map` | staging-contact-map | Staging select error, getStagingContactMap exception |
| `unsubscribe` | /unsubscribe page | Opt-out completed, invalid token, no token |

## How to use in Vercel

1. **Vercel Dashboard** → your project → **Logs** (or **Deployments** → a deployment → **Functions**).
2. Filter by scope, e.g. search for `cron:abandonment-nudges` to see only that cron’s runs.
3. On errors, look for `[scope] ... {"error":"..."}` to see the message and any stack (logged separately for `Error` objects).

## Example log lines

```
[cron:abandonment-nudges] Starting run
[cron:abandonment-nudges] Candidates loaded {"candidates_30m":2,"candidates_24h":0}
[cron:abandonment-nudges] 30m nudge send failed {"email":"user@example.com","session_id":"...","error":"Resend API error..."}
[cron:abandonment-nudges] Run complete {"sent_30m":1,"sent_24h":0}
[api:session-event] Upsert failed {"event":"step_complete","step":2,"error":"..."}
[email:send] Resend API error {"to":"user@example.com","subject":"...","error":"..."}
```

These logs are emitted at **runtime** (when crons run, APIs are called, emails are sent). Build logs are from Next.js; use the scopes above to analyze **runtime** issues.
