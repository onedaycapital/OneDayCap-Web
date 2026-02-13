/**
 * Email copy for abandonment nudges (30m, 24h), 15-day follow-up, and funnel digest.
 * Placeholders: {{resumeUrl}}, {{unsubscribeUrl}}
 */

/** Base URL for resume/unsubscribe links in emails. Prefer canonical production domain so CTAs never point at vercel.app. */
function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit && explicit.startsWith("http")) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.includes("vercel.app")) return "https://www.onedaycap.com";
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "https://www.onedaycap.com";
}

/** Unique resume URL for this session (token identifies the user's application; no email in URL for privacy). */
export function resumeUrl(token: string): string {
  return `${baseUrl()}/apply/resume?t=${encodeURIComponent(token)}`;
}

export function unsubscribeUrl(token: string): string {
  return `${baseUrl()}/unsubscribe?t=${encodeURIComponent(token)}`;
}

// -----------------------------------------------------------------------------
// 30-minute nudge
// -----------------------------------------------------------------------------

export const NUDGE_30M_SUBJECT = "Finish your OnedayCap application — we saved your progress";

export function getNudge30mBody(token: string): string {
  const resume = resumeUrl(token);
  const unsub = unsubscribeUrl(token);
  return `
<p>You are almost done with your funding application. Pick up where you left off in a minute to complete.</p>
<p>Ensure you are uploading 3 latest bank statements and we will get your funding quotes within this hour.</p>
<p><a href="${resume}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:600;">Resume Application</a></p>
<p>Complete today and get a faster decision. And redeem your gift after funding.</p>
<p>Sincerely,<br>OneDayCap Team<br>subs@onedaycap.com | www.onedaycap.com</p>
<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
<p style="font-size:12px;color:#6b7280;">If you don't want reminders, <a href="${unsub}">click here to opt out</a>.</p>
`.trim();
}

// -----------------------------------------------------------------------------
// 24-hour nudge
// -----------------------------------------------------------------------------

export const NUDGE_24H_SUBJECT = "Still need working capital? Complete your application in minutes";

export function getNudge24hBody(token: string): string {
  const resume = resumeUrl(token);
  const unsub = unsubscribeUrl(token);
  return `
<p>One more reminder: your application is saved. Finish in minutes and we'll get you a decision fast.</p>
<p><a href="${resume}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:600;">Resume Application</a></p>
<p>Limited-time: reduced fees / expedited review for completed applications.</p>
<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
<p style="font-size:12px;color:#6b7280;">If you don't want reminders, <a href="${unsub}">click here to opt out</a>.</p>
`.trim();
}

// -----------------------------------------------------------------------------
// 15-day follow-up
// -----------------------------------------------------------------------------

export const FOLLOWUP_15D_SUBJECT = "Interested in funding to accelerate your business?";

export function getFollowup15dBody(token: string): string {
  const resume = resumeUrl(token);
  const unsub = unsubscribeUrl(token);
  return `
<p>We noticed you started an application with OneDay Capital. Do you still need working capital to meet cash flow needs or accelerate your business?</p>
<p>Your progress is saved. Pick up where you left off:</p>
<p><a href="${resume}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:600;">Resume Application</a></p>
<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
<p style="font-size:12px;color:#6b7280;">If you don't want reminders, <a href="${unsub}">click here to opt out</a>.</p>
`.trim();
}

// -----------------------------------------------------------------------------
// Funnel digest (to subs@onedaycap.com)
// -----------------------------------------------------------------------------

export function getFunnelDigestSubject(timeLabel: string): string {
  return `OneDayCap Funnel at ${timeLabel}`;
}

export type FunnelDigestRow = {
  email: string;
  current_step: number;
  last_event_at: string | null;
  phone?: string;
  revenue?: string;
  city?: string;
};

export function getFunnelDigestBody(rows: FunnelDigestRow[]): string {
  if (rows.length === 0) {
    return "<p>No incomplete sessions in the funnel.</p>";
  }
  const lines = rows.map(
    (r) =>
      `<tr><td>${escapeHtml(r.email)}</td><td>${r.current_step}</td><td>${r.last_event_at ? new Date(r.last_event_at).toISOString() : "—"}</td><td>${escapeHtml(r.phone ?? "—")}</td><td>${escapeHtml(r.revenue ?? "—")}</td><td>${escapeHtml(r.city ?? "—")}</td></tr>`
  );
  return `
<p>Users who visited but have not completed their application:</p>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
<thead><tr><th>Email</th><th>Step</th><th>Last event</th><th>Phone</th><th>Revenue</th><th>City</th></tr></thead>
<tbody>${lines.join("")}</tbody>
</table>
<p>Total: ${rows.length}</p>
<p><em>Phone, Revenue, City from Staging when available.</em></p>
`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
