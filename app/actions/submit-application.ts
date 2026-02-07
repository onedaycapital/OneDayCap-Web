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
}

export type SubmitResult =
  | { success: true; applicationId: string; pdfBase64?: string; additionalDetails?: AdditionalDetailsRow[] }
  | { success: false; error: string };

export async function submitApplication(formData: FormData): Promise<SubmitResult> {
  try {
    const payloadRaw = formData.get("payload");
    if (typeof payloadRaw !== "string") {
      return { success: false, error: "Missing form payload." };
    }
    const payload: SubmitPayload = JSON.parse(payloadRaw);

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

    const supabase = getSupabaseServer();
    const { data: app, error: insertError } = await supabase
      .from("merchant_applications")
      .insert(row)
      .select("id")
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return { success: false, error: insertError.message || "Failed to save application." };
    }

    const applicationId = app.id as string;

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

    // Upload files: FormData keys are bank_statements (multiple), void_check, drivers_license
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
          // Don't fail the whole submit; application is already saved
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

    await clearAbandonedProgress(payload.personal.email.trim());

    let pdfBase64ForClient: string | undefined;
    const additionalDetails = buildAdditionalDetailsRows(payload, classification);
    // Generate PDF (data excluding phone/email in output), save to Supabase, and email to subs@onedaycap.com
    try {
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

      const fileKeys = [
        { key: "bank_statements", prefix: "bank-statement" },
        { key: "void_check", prefix: "void-check" },
        { key: "drivers_license", prefix: "drivers-license" },
      ] as const;
      const allAttachments: { filename: string; content: Buffer }[] = [
        { filename: pdfFilename, content: pdfBuffer },
      ];
      for (const { key, prefix } of fileKeys) {
        const entries = formData.getAll(key);
        for (let i = 0; i < entries.length; i++) {
          const file = entries[i];
          if (!(file instanceof File) || file.size === 0) continue;
          const buf = Buffer.from(await file.arrayBuffer());
          const ext = file.name.split(".").pop() || "pdf";
          allAttachments.push({
            filename: `${prefix}-${i + 1}.${ext}`,
            content: buf,
          });
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

      // (a) Email to Merchant: confirmation + application PDF only; cc subs@onedaycap.com
      await sendEmail({
        to: templateVars.merchantEmail,
        cc: INTERNAL_EMAIL,
        subject: MERCHANT_EMAIL_SUBJECT,
        html: toHtml(getMerchantEmailBody(templateVars)),
        attachments: [{ filename: pdfFilename, content: pdfBuffer }],
      });

      // (b) Email to me (subs@onedaycap.com): notification + PDF + all uploaded files
      await sendEmail({
        to: INTERNAL_EMAIL,
        subject: getInternalEmailSubject(templateVars),
        html: toHtml(getInternalEmailBody(templateVars)),
        attachments: allAttachments,
      });
    } catch (emailErr) {
      console.error("Application PDF/email error (application was saved):", emailErr);
      // Do not fail the submit; application is already in DB
    }

    // Don't return pdfBase64 in production to avoid Server Action response size limits (Vercel ~4.5MB).
    // User gets the PDF via email; processing page shows additionalDetails when present.
    const returnPdf = process.env.NODE_ENV !== "production" ? pdfBase64ForClient : undefined;
    return { success: true, applicationId, pdfBase64: returnPdf, additionalDetails };
  } catch (err) {
    console.error("submitApplication error:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
