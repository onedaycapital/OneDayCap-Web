import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { log, LOG_SCOPE } from "@/lib/log";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }
  const supabase = getSupabaseServer();
  const { data: row, error } = await supabase
    .from("merchant_applications")
    .select("id, email")
    .eq("documents_resume_token", token)
    .eq("submission_status", "pending_documents")
    .limit(1)
    .single();

  if (error || !row) {
    log.warn(LOG_SCOPE.API_RESUME, "documents-resume: invalid or expired token");
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  }

  return NextResponse.json({
    applicationId: row.id,
    email: (row.email as string)?.trim() ?? "",
  });
}
