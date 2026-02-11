import { NextRequest, NextResponse } from "next/server";
import {
  getSessionsFor15dFollowup,
  isStillEligibleForNudge,
  set15dFollowupSent,
  type ApplicationSessionRow,
} from "@/lib/application-session";
import { sendEmail, getInternalEmail } from "@/lib/send-application-email";
import { FOLLOWUP_15D_SUBJECT, getFollowup15dBody } from "@/lib/abandonment-email-templates";
import { log, LOG_SCOPE } from "@/lib/log";

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-cron-secret") === secret) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    log.warn(LOG_SCOPE.CRON_FOLLOWUP_15D, "Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    log.info(LOG_SCOPE.CRON_FOLLOWUP_15D, "Starting run");
    const sessions = await getSessionsFor15dFollowup();
    log.info(LOG_SCOPE.CRON_FOLLOWUP_15D, "Candidates loaded", { candidates: sessions.length });
    let sent = 0;
    for (const s of sessions) {
      const ok = await isStillEligibleForNudge(s.id);
      if (!ok) continue;
      const { ok: emailSent, error: sendError } = await sendEmail({
        to: s.email,
        cc: getInternalEmail(),
        subject: FOLLOWUP_15D_SUBJECT,
        html: getFollowup15dBody(s.token),
      });
      if (emailSent) {
        await set15dFollowupSent(s.id);
        sent++;
      } else {
        log.error(LOG_SCOPE.CRON_FOLLOWUP_15D, "15d follow-up send failed", sendError, { email: s.email, session_id: s.id });
      }
    }
    log.info(LOG_SCOPE.CRON_FOLLOWUP_15D, "Run complete", { sent });
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    log.error(LOG_SCOPE.CRON_FOLLOWUP_15D, "Run failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
