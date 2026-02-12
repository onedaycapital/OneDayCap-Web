import { NextRequest, NextResponse } from "next/server";
import {
  getSessionByEmail,
  createSessionForEmail,
  setNudge30mSent,
  type ApplicationSessionRow,
} from "@/lib/application-session";
import { sendEmail, getInternalEmail } from "@/lib/send-application-email";
import { NUDGE_30M_SUBJECT, getNudge30mBody } from "@/lib/abandonment-email-templates";
import { log, LOG_SCOPE } from "@/lib/log";

/** Emails to receive the test 30m nudge (so you can confirm delivery and review copy). */
const TEST_NUDGE_EMAILS = ["sree@uncha.us", "sreedharu@gmail.com"];

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
    log.warn(LOG_SCOPE.CRON_ABANDONMENT, "Unauthorized send-test-nudges request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    log.info(LOG_SCOPE.CRON_ABANDONMENT, "send-test-nudges: starting");
    let sent = 0;
    const results: { email: string; sent: boolean; error?: string }[] = [];

    for (const email of TEST_NUDGE_EMAILS) {
      let session: ApplicationSessionRow | null = await getSessionByEmail(email);
      if (!session) {
        session = await createSessionForEmail(email);
      }
      if (!session) {
        results.push({ email, sent: false, error: "Could not get or create session" });
        continue;
      }

      const { ok: emailSent, error: sendError } = await sendEmail({
        to: email,
        cc: getInternalEmail(),
        subject: NUDGE_30M_SUBJECT,
        html: getNudge30mBody(session.token),
      });

      if (emailSent) {
        await setNudge30mSent(session.id);
        sent++;
        results.push({ email, sent: true });
      } else {
        results.push({ email, sent: false, error: sendError });
        log.error(LOG_SCOPE.CRON_ABANDONMENT, "Test nudge send failed", sendError, { email });
      }
    }

    log.info(LOG_SCOPE.CRON_ABANDONMENT, "send-test-nudges: complete", { sent, total: TEST_NUDGE_EMAILS.length });
    return NextResponse.json({ ok: true, sent, results });
  } catch (e) {
    log.error(LOG_SCOPE.CRON_ABANDONMENT, "send-test-nudges failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
