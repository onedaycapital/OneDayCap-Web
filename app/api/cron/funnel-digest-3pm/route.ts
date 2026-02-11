import { NextRequest, NextResponse } from "next/server";
import { getFunnelIncompleteEmails } from "@/lib/application-session";
import { getStagingContactMap } from "@/lib/staging-contact-map";
import { sendEmail, getInternalEmail } from "@/lib/send-application-email";
import { getFunnelDigestSubject, getFunnelDigestBody, type FunnelDigestRow } from "@/lib/abandonment-email-templates";
import { log, LOG_SCOPE } from "@/lib/log";

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
}

function normalize(email: string): string {
  return email?.trim().toLowerCase() || "";
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    log.warn(LOG_SCOPE.CRON_FUNNEL_3PM, "Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const timeLabel = "3:00 PM CT";
  try {
    log.info(LOG_SCOPE.CRON_FUNNEL_3PM, "Starting run", { timeLabel });
    const [rows, stagingMap] = await Promise.all([
      getFunnelIncompleteEmails(),
      getStagingContactMap(),
    ]);
    const enriched: FunnelDigestRow[] = rows.map((r) => {
      const info = stagingMap.get(normalize(r.email));
      return {
        ...r,
        phone: info?.phone,
        revenue: info?.revenue,
        city: info?.city,
      };
    });
    log.info(LOG_SCOPE.CRON_FUNNEL_3PM, "Digest built", { rows: enriched.length, staging_entries: stagingMap.size });
    const { ok, error } = await sendEmail({
      to: getInternalEmail(),
      subject: getFunnelDigestSubject(timeLabel),
      html: getFunnelDigestBody(enriched),
    });
    if (!ok) {
      log.error(LOG_SCOPE.CRON_FUNNEL_3PM, "Send failed", error);
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }
    log.info(LOG_SCOPE.CRON_FUNNEL_3PM, "Run complete", { count: enriched.length });
    return NextResponse.json({ ok: true, count: enriched.length });
  } catch (e) {
    log.error(LOG_SCOPE.CRON_FUNNEL_3PM, "Run failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
