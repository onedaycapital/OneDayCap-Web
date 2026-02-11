import { NextRequest, NextResponse } from "next/server";
import { getSessionByToken } from "@/lib/application-session";
import { log, LOG_SCOPE } from "@/lib/log";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t")?.trim();
  if (!token) {
    log.warn(LOG_SCOPE.API_RESUME, "Missing token");
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }
  const session = await getSessionByToken(token);
  if (!session) {
    log.warn(LOG_SCOPE.API_RESUME, "Invalid or expired token", { token_length: token.length });
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  }
  return NextResponse.json({
    email: session.email,
    current_step: session.current_step,
    token: session.token,
  });
}
