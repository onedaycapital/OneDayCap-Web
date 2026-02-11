import { NextRequest, NextResponse } from "next/server";
import { getFunnelIncompleteEmails } from "@/lib/application-session";
import { sendEmail } from "@/lib/send-application-email";
import { getFunnelDigestSubject, getFunnelDigestBody } from "@/lib/abandonment-email-templates";
import { getInternalEmail } from "@/lib/send-application-email";

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-cron-secret") === secret) return true;
  return false;
}

/** Time label for digest subject. Noon/3pm CT; crons call with ?slot=noon or ?slot=3pm. */
function getTimeLabel(searchParams: URLSearchParams): string {
  const slot = searchParams.get("slot");
  if (slot === "noon") return "12:00 PM CT";
  if (slot === "3pm") return "3:00 PM CT";
  return "Funnel";
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const timeLabel = getTimeLabel(request.nextUrl.searchParams);

  try {
    const rows = await getFunnelIncompleteEmails();
    const subject = getFunnelDigestSubject(timeLabel);
    const html = getFunnelDigestBody(rows);
    const to = getInternalEmail();
    const { ok, error } = await sendEmail({ to, subject, html });
    if (!ok) {
      console.error("[cron/funnel-digest] send failed:", error);
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (e) {
    console.error("[cron/funnel-digest]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
