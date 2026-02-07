"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { clearAbandonedProgress } from "@/app/actions/abandoned-progress";
import { generateApplicationPdf, applicationPdfFilename, buildAdditionalDetailsRows } from "@/lib/application-pdf";
import type { AdditionalDetailsRow } from "@/lib/application-pdf";
import { sendEmail } from "@/lib/send-application-email";
import {
  MERCHANT_EMAIL_SUBJECT,
  getMerchantEmailBody,
  getInternalEmailSubject,
  getInternalEmailBody,
} from "@/lib/email-templates";
import { computePaperClassification } from "@/lib/paper-classifier";

const INTERNAL_EMAIL = "subs@onedaycap.com";

const BUCKET = "merchant-documents";

/** Payload from the form (JSON); documents are omitted, files sent separately in FormData */
export interface SubmitPayload {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    smsConsent: boolean;
  };
  business: {
    businessName: string;
    dba: string;
    typeOfBusiness: string;
    startDateOfBusiness: string;
    ein: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    industry: string;
  };
  financial: {
    monthlyRevenue: string;
    fundingRequest: string;
    useOfFunds: string;
  };
  creditOwnership: {
    ssn: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    ownershipPercent: string;
  };
  signature: {
    signatureDataUrl: string | null;
    signedAt: string | null;
    auditId: string | null;
  };
  /** When set, files were uploaded directly to Storage; server copies from pending/uploadId to applicationId */
  uploadId?: string;
  uploadedPaths?: { type: "bank_statements" | "void_check" | "drivers_license"; path: string; fileName: string }[];
}

export type SubmitResult =
  | { success: true; applicationId: string; pdfBase64?: string; additionalDetails?: AdditionalDetailsRow[] }
  | { success: false; error: string };

const LOG_PREFIX = "[submit]";

export async function submitApplication(formData: FormData): Promise<SubmitResult> {
  try {
    console.log(LOG_PREFIX, "start");
    const payloadRaw = formData.get("payload");
    if (typeof payloadRaw !== "string") {
      console.log(LOG_PREFIX, "missing payload");
      return { success: false, error: "Missing form payload." };
    }
    const payload: SubmitPayload = JSON.parse(payloadRaw);
    console.log(LOG_PREFIX, "payload parsed, business:", payload.business?.businessName || "");

    const row = {
      first_name: payload.personal.firstName,
      last_name: payload.personal.lastName,
      email: payload.personal.email.trim(),
      phone: payload.personal.phone.trim(),
      sms_consent: payload.personal.smsConsent ?? false,
      business_name: payload.business.businessName.trim(),
      dba: payload.business.dba?.trim() || null,
      type_of_business: payload.business.typeOfBusiness.trim(),
      start_date_of_business: payload.business.startDateOfBusiness.trim(),
      ein: payload.business.ein.trim(),
      address: payload.business.address.trim(),
      city: payload.business.city.trim(),
      state: payload.business.state.trim(),
      zip: payload.business.zip.trim(),
      industry: payload.business.industry.trim(),
      monthly_revenue: payload.financial.monthlyRevenue.trim(),
      funding_request: payload.financial.fundingRequest.trim(),
      use_of_funds: payload.financial.useOfFunds.trim(),
      ssn: payload.creditOwnership.ssn.trim(),
      owner_address: payload.creditOwnership.address?.trim() || null,
      owner_city: payload.creditOwnership.city?.trim() || null,
      owner_state: payload.creditOwnership.state?.trim() || null,
      owner_zip: payload.creditOwnership.zip?.trim() || null,
      ownership_percent: payload.creditOwnership.ownershipPercent?.trim() || null,
      signature_data_url: payload.signature.signatureDataUrl || null,
      signed_at: payload.signature.signedAt || null,
      audit_id: payload.signature.auditId || null,
    };

    console.log(LOG_PREFIX, "getting Supabase client");
    const supabase = getSupabaseServer();
    console.log(LOG_PREFIX, "inserting into merchant_applications");
    const { data: app, error: insertError } = await supabase
      .from("merchant_applications")
      .insert(row)
      .select("id")
      .single();

    if (insertError) {
      console.error(LOG_PREFIX, "Supabase insert error:", insertError);
      return { success: false, error: insertError.message || "Failed to save application." };
    }

    const applicationId = app.id as string;
    console.log(LOG_PREFIX, "insert ok, applicationId:", applicationId);

    // Paper classification (Industry Risk Tier + Paper Type) and update row
    const classification = computePaperClassification(payload);
    await supabase
      .from("merchant_applications")
      .update({
        industry_risk_tier: classification.industryRiskTier,
        paper_type: classification.paperType,
        paper_score: classification.paperScore,
      })
      .eq("id", applicationId);

    // Files: either from direct upload (payload.uploadId) or from FormData
    const useDirectUpload = Boolean(payload.uploadId && payload.uploadedPaths?.length);

    if (useDirectUpload) {
      // Copy from pending/{uploadId} to {applicationId} and register in DB
      for (const { type, path: pendingPath, fileName } of payload.uploadedPaths!) {
        const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(pendingPath);
        if (downloadError || !blob) {
          console.error("Storage download error (pending):", downloadError);
          continue;
        }
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const finalPath = `${applicationId}/${type}/${safeName}`;
        const buf = Buffer.from(await blob.arrayBuffer());
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(finalPath, buf, {
          contentType: blob.type || "application/octet-stream",
          upsert: false,
        });
        if (uploadError) {
          console.error("Storage upload error (final):", uploadError);
          continue;
        }
        await supabase.from("merchant_application_files").insert({
          application_id: applicationId,
          file_type: type,
          file_name: fileName,
          storage_path: finalPath,
          content_type: blob.type || null,
          file_size_bytes: buf.length,
        });
      }
      // Delete pending folder: list subfolders (type per file), then remove all file paths
      const { data: topList } = await supabase.storage.from(BUCKET).list(`pending/${payload.uploadId}`);
      if (topList?.length) {
        const toRemove: string[] = [];
        for (const item of topList) {
          const subPath = `pending/${payload.uploadId}/${item.name}`;
          const { data: subList } = await supabase.storage.from(BUCKET).list(subPath);
          if (subList?.length) {
            for (const f of subList) toRemove.push(`${subPath}/${f.name}`);
          }
        }
        if (toRemove.length) await supabase.storage.from(BUCKET).remove(toRemove);
      }
    } else {
      // Upload from FormData (legacy / small payloads)
      const fileTypes = [
        { key: "bank_statements", type: "bank_statements" as const },
        { key: "void_check", type: "void_check" as const },
        { key: "drivers_license", type: "drivers_license" as const },
      ] as const;
      for (const { key, type } of fileTypes) {
        const entries = formData.getAll(key);
        for (let i = 0; i < entries.length; i++) {
          const file = entries[i];
          if (!(file instanceof File) || file.size === 0) continue;
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const storagePath = `${applicationId}/${type}/${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });
          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            continue;
          }
          await supabase.from("merchant_application_files").insert({
            application_id: applicationId,
            file_type: type,
            file_name: file.name,
            storage_path: storagePath,
            content_type: file.type || null,
            file_size_bytes: file.size,
          });
        }
      }
    }

    await clearAbandonedProgress(payload.personal.email.trim());

    let pdfBase64ForClient: string | undefined;
    const additionalDetails = buildAdditionalDetailsRows(payload, classification);
    // Generate PDF (data excluding phone/email in output), save to Supabase, and email to subs@onedaycap.com
    try {
      console.log(LOG_PREFIX, "generating PDF");
      const pdfBuffer = await generateApplicationPdf(payload, undefined, classification);
      const pdfFilename = applicationPdfFilename(payload.business.businessName);
      const safePdfName = pdfFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const pdfStoragePath = `${applicationId}/application/${safePdfName}`;
      const { error: pdfUploadError } = await supabase.storage
        .from(BUCKET)
        .upload(pdfStoragePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (pdfUploadError) {
        console.error("Application PDF upload error:", pdfUploadError);
      } else {
        await supabase.from("merchant_application_files").insert({
          application_id: applicationId,
          file_type: "application_pdf",
          file_name: pdfFilename,
          storage_path: pdfStoragePath,
          content_type: "application/pdf",
          file_size_bytes: pdfBuffer.length,
        });
      }
      pdfBase64ForClient = pdfBuffer.toString("base64");

      const allAttachments: { filename: string; content: Buffer }[] = [
        { filename: pdfFilename, content: pdfBuffer },
      ];
      if (useDirectUpload && payload.uploadedPaths?.length) {
        const prefixByType: Record<string, string> = {
          bank_statements: "bank-statement",
          void_check: "void-check",
          drivers_license: "drivers-license",
        };
        const indexByType: Record<string, number> = {};
        for (const { type, path: _p, fileName } of payload.uploadedPaths) {
          const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          const finalPath = `${applicationId}/${type}/${safeName}`;
          const { data: blob, error } = await supabase.storage.from(BUCKET).download(finalPath);
          if (error || !blob) continue;
          const buf = Buffer.from(await blob.arrayBuffer());
          const ext = fileName.split(".").pop() || "pdf";
          const prefix = prefixByType[type] ?? "doc";
          const idx = (indexByType[type] ?? 0) + 1;
          indexByType[type] = idx;
          allAttachments.push({ filename: `${prefix}-${idx}.${ext}`, content: buf });
        }
      } else {
        const fileKeys = [
          { key: "bank_statements", prefix: "bank-statement" },
          { key: "void_check", prefix: "void-check" },
          { key: "drivers_license", prefix: "drivers-license" },
        ] as const;
        for (const { key, prefix } of fileKeys) {
          const entries = formData.getAll(key);
          for (let i = 0; i < entries.length; i++) {
            const file = entries[i];
            if (!(file instanceof File) || file.size === 0) continue;
            const buf = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split(".").pop() || "pdf";
            allAttachments.push({ filename: `${prefix}-${i + 1}.${ext}`, content: buf });
          }
        }
      }

      const templateVars = {
        businessName: payload.business.businessName || "",
        applicationId,
        merchantEmail: payload.personal.email?.trim() || "",
        firstName: payload.personal.firstName?.trim() || "",
        ownerName: [payload.personal.firstName?.trim(), payload.personal.lastName?.trim()].filter(Boolean).join(" ") || "",
        phone: payload.personal.phone?.trim() || "",
      };

      const toHtml = (text: string) => text.replace(/\n/g, "<br>\n");

      console.log(LOG_PREFIX, "sending email to merchant");
      // (a) Email to Merchant: confirmation + application PDF only; cc subs@onedaycap.com
      await sendEmail({
        to: templateVars.merchantEmail,
        cc: INTERNAL_EMAIL,
        subject: MERCHANT_EMAIL_SUBJECT,
        html: toHtml(getMerchantEmailBody(templateVars)),
        attachments: [{ filename: pdfFilename, content: pdfBuffer }],
      });
      console.log(LOG_PREFIX, "sending email to internal");
      // (b) Email to me (subs@onedaycap.com): notification + PDF + all uploaded files
      await sendEmail({
        to: INTERNAL_EMAIL,
        subject: getInternalEmailSubject(templateVars),
        html: toHtml(getInternalEmailBody(templateVars)),
        attachments: allAttachments,
      });
    } catch (emailErr) {
      console.error(LOG_PREFIX, "Application PDF/email error (application was saved):", emailErr);
      // Do not fail the submit; application is already in DB
    }

    console.log(LOG_PREFIX, "returning success");
    // Don't return pdfBase64 in production to avoid Server Action response size limits (Vercel ~4.5MB).
    // User gets the PDF via email; processing page shows additionalDetails when present.
    const returnPdf = process.env.NODE_ENV !== "production" ? pdfBase64ForClient : undefined;
    return { success: true, applicationId, pdfBase64: returnPdf, additionalDetails };
  } catch (err) {
    console.error(LOG_PREFIX, "submitApplication error:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
