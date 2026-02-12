import { NextRequest, NextResponse } from "next/server";
import {
  ensureSessionsFromAbandonedProgress,
  getSessionsFor30mNudge,
  getSessionsFor24hNudge,
  isStillEligibleForNudge,
  setNudge30mSent,
  setNudge24hSent,
  type ApplicationSessionRow,
} from "@/lib/application-session";
import { sendEmail, getInternalEmail } from "@/lib/send-application-email";
import {
  NUDGE_30M_SUBJECT,
  getNudge30mBody,
  NUDGE_24H_SUBJECT,
  getNudge24hBody,
} from "@/lib/abandonment-email-templates";
import { log, LOG_SCOPE } from "@/lib/log";

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-cron-secret") === secret) return true;
  return false;
}

async function send30m(session: ApplicationSessionRow): Promise<boolean> {
  const ok = await isStillEligibleForNudge(session.id);
  if (!ok) return false;
  const { ok: sent, error: sendError } = await sendEmail({
    to: session.email,
    cc: getInternalEmail(),
    subject: NUDGE_30M_SUBJECT,
    html: getNudge30mBody(session.token),
  });
  if (sent) {
    await setNudge30mSent(session.id);
    return true;
  }
  log.error(LOG_SCOPE.CRON_ABANDONMENT, "30m nudge send failed", sendError, { email: session.email, session_id: session.id });
  return false;
}

async function send24h(session: ApplicationSessionRow): Promise<boolean> {
  const ok = await isStillEligibleForNudge(session.id);
  if (!ok) return false;
  const { ok: sent, error: sendError } = await sendEmail({
    to: session.email,
    cc: getInternalEmail(),
    subject: NUDGE_24H_SUBJECT,
    html: getNudge24hBody(session.token),
  });
  if (sent) {
    await setNudge24hSent(session.id);
    return true;
  }
  log.error(LOG_SCOPE.CRON_ABANDONMENT, "24h nudge send failed", sendError, { email: session.email, session_id: session.id });
  return false;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    log.warn(LOG_SCOPE.CRON_ABANDONMENT, "Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    log.info(LOG_SCOPE.CRON_ABANDONMENT, "Starting run");
    const { created: backfilled } = await ensureSessionsFromAbandonedProgress();
    if (backfilled > 0) log.info(LOG_SCOPE.CRON_ABANDONMENT, "Backfilled sessions from abandoned progress", { created: backfilled });
    const [sessions30m, sessions24h] = await Promise.all([
      getSessionsFor30mNudge(),
      getSessionsFor24hNudge(),
    ]);
    log.info(LOG_SCOPE.CRON_ABANDONMENT, "Candidates loaded", { candidates_30m: sessions30m.length, candidates_24h: sessions24h.length });
    let sent30m = 0;
    let sent24h = 0;
    for (const s of sessions30m) {
      if (await send30m(s)) sent30m++;
    }
    for (const s of sessions24h) {
      if (await send24h(s)) sent24h++;
    }
    log.info(LOG_SCOPE.CRON_ABANDONMENT, "Run complete", { sent_30m: sent30m, sent_24h: sent24h });
    return NextResponse.json({ ok: true, sent_30m: sent30m, sent_24h: sent24h });
  } catch (e) {
    log.error(LOG_SCOPE.CRON_ABANDONMENT, "Run failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
