import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/send-application-email";
import {
  DOCUMENTS_REMINDER_SUBJECT,
  DOCUMENTS_REMINDER_INTERNAL_BODY,
  getDocumentsReminderBody,
  getDocumentsUploadLink,
  getDocumentsReminderInternalSubject,
  DEFAULT_DOCUMENT_LIST,
} from "@/lib/documents-reminder-email-templates";
import { log, LOG_SCOPE } from "@/lib/log";
import { randomBytes } from "crypto";

const INTERNAL_EMAIL = "subs@onedaycap.com";
const BUCKET = "merchant-documents";

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
    log.warn(LOG_SCOPE.CRON_PENDING_DOCUMENTS, "pending-documents-reminder: unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseServer();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: rows, error: fetchError } = await supabase
      .from("merchant_applications")
      .select("id, email, first_name, business_name, documents_reminder_sent_at")
      .eq("submission_status", "pending_documents")
      .lt("created_at", fiveMinutesAgo)
      .is("documents_reminder_sent_at", null);

    if (fetchError) {
      log.error(LOG_SCOPE.CRON_PENDING_DOCUMENTS, "pending-documents-reminder fetch failed", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!rows?.length) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let sent = 0;
    for (const row of rows) {
      const applicationId = row.id as string;
      const token = randomBytes(16).toString("hex");
      const { error: updateTokenError } = await supabase
        .from("merchant_applications")
        .update({ documents_resume_token: token })
        .eq("id", applicationId);
      if (updateTokenError) {
        log.error(LOG_SCOPE.CRON_PENDING_DOCUMENTS, "pending-documents-reminder set token failed", updateTokenError, { applicationId });
        continue;
      }

      const { data: pdfFile } = await supabase
        .from("merchant_application_files")
        .select("storage_path")
        .eq("application_id", applicationId)
        .eq("file_type", "application_pdf")
        .limit(1)
        .single();

      let pdfBuffer: Buffer | null = null;
      if (pdfFile?.storage_path) {
        const { data: blob } = await supabase.storage.from(BUCKET).download(pdfFile.storage_path);
        if (blob) pdfBuffer = Buffer.from(await blob.arrayBuffer());
      }

      const uploadLink = getDocumentsUploadLink(token);
      const firstName = (row.first_name as string)?.trim() || "there";
      const businessName = (row.business_name as string)?.trim() || "your business";
      const documentList = DEFAULT_DOCUMENT_LIST.replace(/\n/g, "<br>\n");
      const userHtml = getDocumentsReminderBody({
        firstName,
        businessName,
        uploadLink,
        documentList,
      }).replace(/\n/g, "<br>\n");

      if (pdfBuffer) {
        const internalSubject = getDocumentsReminderInternalSubject(applicationId, businessName);
        const { ok: internalOk, error: internalErr } = await sendEmail({
          to: INTERNAL_EMAIL,
          subject: internalSubject,
          html: DOCUMENTS_REMINDER_INTERNAL_BODY.replace(/\n/g, "<br>\n"),
          attachments: [{ filename: `application_${applicationId}.pdf`, content: pdfBuffer }],
        });
        if (!internalOk) {
          log.error(LOG_SCOPE.CRON_PENDING_DOCUMENTS, "pending-documents-reminder internal email failed", internalErr, { applicationId });
        }
      }

      const { ok: userOk, error: userErr } = await sendEmail({
        to: (row.email as string)?.trim() || "",
        subject: DOCUMENTS_REMINDER_SUBJECT,
        html: userHtml,
      });
      if (!userOk) {
        log.error(LOG_SCOPE.CRON_PENDING_DOCUMENTS, "pending-documents-reminder user email failed", userErr, { applicationId });
        continue;
      }

      const { error: markError } = await supabase
        .from("merchant_applications")
        .update({ documents_reminder_sent_at: new Date().toISOString() })
        .eq("id", applicationId);
      if (markError) {
        log.error(LOG_SCOPE.CRON_PENDING_DOCUMENTS, "pending-documents-reminder mark sent failed", markError, { applicationId });
      } else {
        sent++;
      }
    }

    log.info(LOG_SCOPE.CRON_PENDING_DOCUMENTS, "pending-documents-reminder run complete", { sent, candidates: rows.length });
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    log.error(LOG_SCOPE.CRON_PENDING_DOCUMENTS, "pending-documents-reminder run failed", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
