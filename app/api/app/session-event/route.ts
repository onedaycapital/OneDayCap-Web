import { NextRequest, NextResponse } from "next/server";
import { upsertSessionEvent, type SessionEvent } from "@/lib/application-session";
import { log, LOG_SCOPE } from "@/lib/log";

type Body = {
  email?: string;
  event: SessionEvent;
  step: number;
  application_id?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const event = body?.event;
    const step = typeof body?.step === "number" ? body.step : undefined;
    if (!event || !["step_view", "step_complete", "submit"].includes(event) || step == null || step < 1 || step > 5) {
      log.warn(LOG_SCOPE.API_SESSION_EVENT, "Invalid event or step", { event, step });
      return NextResponse.json({ error: "Invalid event or step." }, { status: 400 });
    }
    const email = typeof body.email === "string" ? body.email.trim() : undefined;
    if (!email) {
      return NextResponse.json({ ok: true }); // no-op when no email (e.g. step 1 view before they type)
    }
    const result = await upsertSessionEvent({
      email,
      event,
      step,
      application_id: typeof body.application_id === "string" ? body.application_id : undefined,
    });
    if (!result.ok) {
      log.error(LOG_SCOPE.API_SESSION_EVENT, "Upsert failed", result.error, { event, step });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, token: result.token });
  } catch (e) {
    log.error(LOG_SCOPE.API_SESSION_EVENT, "Request failed", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
