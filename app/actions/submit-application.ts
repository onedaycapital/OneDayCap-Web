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
import { addWatermarkToPdf, type WatermarkPlacement } from "@/lib/watermark-pdf";
import { markSubmitted } from "@/lib/application-session";
import { getMatchedFunderIds, submitApplicationToFunders } from "@/app/actions/submit-to-funders";

const INTERNAL_EMAIL = "subs@onedaycap.com";

const BUCKET = "merchant-documents";

/** Uploaded file metadata */
export interface UploadedFileMetadata {
  storage_path: string;
  file_name: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
}

/** Payload from the form (JSON); includes uploaded file metadata */
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
  documents: {
    bankStatements: UploadedFileMetadata[];
    voidCheck: UploadedFileMetadata | null;
    driversLicense: UploadedFileMetadata | null;
  };
}

export type SubmitResult =
  | { success: true; applicationId: string; pdfBase64?: string; additionalDetails?: AdditionalDetailsRow[] }
  | { success: false; error: string };

/** Result of saving application + PDF at step 4 (before documents). */
export type SaveApplicationResult =
  | { success: true; applicationId: string }
  | { success: false; error: string };

const LOG_PREFIX = "[submit]";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Send a funder-matching summary to subs@ when no funders matched, so they can manually review and follow up.
 */
function formatCurrencyForEmail(s: string | null | undefined): string {
  const digits = (s ?? "").trim().replace(/\D/g, "");
  const n = digits ? parseInt(digits, 10) : NaN;
  if (!Number.isFinite(n)) return (s ?? "").trim() || "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

async function sendFunderMatchSummaryZero(
  applicationId: string,
  payload: SubmitPayload
): Promise<void> {
  const businessName = (payload.business?.businessName ?? "").trim() || "—";
  const state = (payload.business?.state ?? "").trim() || "—";
  const industry = (payload.business?.industry ?? "").trim() || "—";
  const monthlyRevenueDisplay = formatCurrencyForEmail(payload.financial?.monthlyRevenue);
  const fundingRequestDisplay = formatCurrencyForEmail(payload.financial?.fundingRequest);
  const subject = `Funder matching summary: ${businessName} — 0 funders matched (manual review)`;
  const html = `
<p><strong>Application submitted; no funders matched per guidelines.</strong> Please review manually if needed.</p>

<p><strong>Application:</strong> ${escapeHtml(businessName)}</p>
<p>Application ID: ${escapeHtml(applicationId)}</p>
<p>State: ${escapeHtml(state)} | Industry: ${escapeHtml(industry)}</p>
<p>Monthly revenues (approximate): ${escapeHtml(monthlyRevenueDisplay)} | Funding request: ${escapeHtml(fundingRequestDisplay)}</p>

<p>— OneDayCap (funder matching)</p>
`.trim();
  await sendEmail({
    to: INTERNAL_EMAIL,
    subject,
    html,
  });
}

/**
 * Notify subs@ when funder matching or send failed (e.g. DB/Resend error) so they can follow up manually.
 */
async function sendFunderMatchSummaryError(
  applicationId: string,
  payload: SubmitPayload,
  error: unknown
): Promise<void> {
  const businessName = (payload.business?.businessName ?? "").trim() || "—";
  const errMessage = error instanceof Error ? error.message : String(error);
  const subject = `Funder matching error: ${businessName}`;
  const html = `
<p><strong>Application was submitted but funder matching or send failed.</strong> Please review manually.</p>

<p><strong>Application:</strong> ${escapeHtml(businessName)}</p>
<p>Application ID: ${escapeHtml(applicationId)}</p>
<p><strong>Error:</strong> ${escapeHtml(errMessage)}</p>

<p>— OneDayCap (funder matching)</p>
`.trim();
  await sendEmail({
    to: INTERNAL_EMAIL,
    subject,
    html,
  });
}

/** Build DB row from payload (shared by save and full submit). */
function payloadToRow(payload: SubmitPayload): Record<string, unknown> {
  return {
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
}

/**
 * Step 4: Save application and generate/store PDF. Does not link documents or send emails.
 * Returns applicationId for step 5 (Submit Documents).
 */
export async function saveApplicationAndPdf(formData: FormData): Promise<SaveApplicationResult> {
  try {
    const payloadRaw = formData.get("payload");
    if (typeof payloadRaw !== "string") {
      return { success: false, error: "Missing form payload." };
    }
    const payload: SubmitPayload = JSON.parse(payloadRaw);
    const supabase = getSupabaseServer();

    const row = {
      ...payloadToRow(payload),
      submission_status: "pending_documents",
    };

    const { data: app, error: insertError } = await supabase
      .from("merchant_applications")
      .insert(row)
      .select("id")
      .single();

    if (insertError) {
      console.error(LOG_PREFIX, "saveApplicationAndPdf insert error:", insertError);
      return { success: false, error: insertError.message || "Failed to save application." };
    }

    const applicationId = app.id as string;
    const classification = computePaperClassification(payload);
    await supabase
      .from("merchant_applications")
      .update({
        industry_risk_tier: classification.industryRiskTier,
        paper_type: classification.paperType,
        paper_score: classification.paperScore,
      })
      .eq("id", applicationId);

    const pdfBuffer = await generateApplicationPdf(payload, undefined, classification);
    const pdfFilename = applicationPdfFilename(payload.business.businessName);
    const safePdfName = pdfFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pdfStoragePath = `${applicationId}/application/${safePdfName}`;
    const { error: pdfUploadError } = await supabase.storage
      .from(BUCKET)
      .upload(pdfStoragePath, pdfBuffer, { contentType: "application/pdf", upsert: false });
    if (pdfUploadError) {
      console.error(LOG_PREFIX, "saveApplicationAndPdf PDF upload error:", pdfUploadError);
      return { success: false, error: "Failed to save application PDF." };
    }
    await supabase.from("merchant_application_files").insert({
      application_id: applicationId,
      file_type: "application_pdf",
      file_name: pdfFilename,
      storage_path: pdfStoragePath,
      content_type: "application/pdf",
      file_size_bytes: pdfBuffer.length,
    });

    return { success: true, applicationId };
  } catch (err) {
    console.error(LOG_PREFIX, "saveApplicationAndPdf error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to save." };
  }
}

/**
 * Step 5: Link documents to existing application, mark submitted, send emails and funder matching.
 * Payload must include savedApplicationId (from step 4).
 */
export async function submitDocuments(formData: FormData): Promise<SubmitResult> {
  try {
    const payloadRaw = formData.get("payload");
    if (typeof payloadRaw !== "string") {
      return { success: false, error: "Missing form payload." };
    }
    const payload: SubmitPayload & { savedApplicationId?: string } = JSON.parse(payloadRaw);
    const applicationId = payload.savedApplicationId;
    if (!applicationId) {
      return { success: false, error: "Missing application ID. Please complete Step 4 (Sign & Conclude) first." };
    }

    const supabase = getSupabaseServer();
    const { data: existing, error: fetchErr } = await supabase
      .from("merchant_applications")
      .select("id, submission_status")
      .eq("id", applicationId)
      .single();
    if (fetchErr || !existing) {
      return { success: false, error: "Application not found." };
    }
    if (existing.submission_status !== "pending_documents") {
      return { success: false, error: "Application was already submitted or is invalid." };
    }

    const uploadedFiles = payload.documents || { bankStatements: [], voidCheck: null, driversLicense: null };

    for (const fileMetadata of uploadedFiles.bankStatements || []) {
      if (fileMetadata?.storage_path) {
        const tempPath = fileMetadata.storage_path;
        const finalPath = tempPath.replace(/^temp\//, `${applicationId}/`);
        const { error: moveError } = await supabase.storage.from(BUCKET).move(tempPath, finalPath);
        await supabase.from("merchant_application_files").insert({
          application_id: applicationId,
          file_type: "bank_statements",
          file_name: fileMetadata.file_name,
          storage_path: moveError ? tempPath : finalPath,
          content_type: fileMetadata.content_type || null,
          file_size_bytes: fileMetadata.file_size,
        });
      }
    }
    if (uploadedFiles.voidCheck?.storage_path) {
      const tempPath = uploadedFiles.voidCheck.storage_path;
      const finalPath = tempPath.replace(/^temp\//, `${applicationId}/`);
      const { error: moveError } = await supabase.storage.from(BUCKET).move(tempPath, finalPath);
      await supabase.from("merchant_application_files").insert({
        application_id: applicationId,
        file_type: "void_check",
        file_name: uploadedFiles.voidCheck.file_name,
        storage_path: moveError ? tempPath : finalPath,
        content_type: uploadedFiles.voidCheck.content_type || null,
        file_size_bytes: uploadedFiles.voidCheck.file_size,
      });
    }
    if (uploadedFiles.driversLicense?.storage_path) {
      const tempPath = uploadedFiles.driversLicense.storage_path;
      const finalPath = tempPath.replace(/^temp\//, `${applicationId}/`);
      const { error: moveError } = await supabase.storage.from(BUCKET).move(tempPath, finalPath);
      await supabase.from("merchant_application_files").insert({
        application_id: applicationId,
        file_type: "drivers_license",
        file_name: uploadedFiles.driversLicense.file_name,
        storage_path: moveError ? tempPath : finalPath,
        content_type: uploadedFiles.driversLicense.content_type || null,
        file_size_bytes: uploadedFiles.driversLicense.file_size,
      });
    }

    await supabase
      .from("merchant_applications")
      .update({ submission_status: "submitted" })
      .eq("id", applicationId);

    const classification = computePaperClassification(payload);
    const additionalDetails = buildAdditionalDetailsRows(payload, classification);
    const pdfFilename = applicationPdfFilename(payload.business.businessName);
    const { data: pdfFile } = await supabase
      .from("merchant_application_files")
      .select("storage_path")
      .eq("application_id", applicationId)
      .eq("file_type", "application_pdf")
      .limit(1)
      .single();
    let pdfBuffer: Buffer;
    if (pdfFile?.storage_path) {
      const { data: blob } = await supabase.storage.from(BUCKET).download(pdfFile.storage_path);
      pdfBuffer = Buffer.from(await (blob ?? new Blob()).arrayBuffer());
    } else {
      pdfBuffer = await generateApplicationPdf(payload, undefined, classification);
    }

    const pathForDownload = (storagePath: string) =>
      storagePath.startsWith("temp/") ? storagePath.replace(/^temp\//, `${applicationId}/`) : storagePath;
    const internalAttachments: { filename: string; content: Buffer }[] = [];
    const addInternal = async (filename: string, buffer: Buffer, placement: WatermarkPlacement) => {
      const content = await addWatermarkToPdf(buffer, placement);
      internalAttachments.push({ filename, content });
    };
    await addInternal(pdfFilename, pdfBuffer, "application-form-terms");
    for (let i = 0; i < (uploadedFiles.bankStatements || []).length; i++) {
      const fileMetadata = uploadedFiles.bankStatements[i];
      if (fileMetadata?.storage_path) {
        try {
          const path = pathForDownload(fileMetadata.storage_path);
          const { data: fileData } = await supabase.storage.from(BUCKET).download(path);
          if (fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            const ext = fileMetadata.file_name.split(".").pop() || "pdf";
            await addInternal(`bank-statement-${i + 1}.${ext}`, buffer, "page1-top30");
          }
        } catch {
          // skip
        }
      }
    }
    if (uploadedFiles.voidCheck?.storage_path) {
      try {
        const path = pathForDownload(uploadedFiles.voidCheck.storage_path);
        const { data: fileData } = await supabase.storage.from(BUCKET).download(path);
        if (fileData) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          const ext = uploadedFiles.voidCheck.file_name.split(".").pop() || "pdf";
          await addInternal(`void-check-1.${ext}`, buffer, "top-half");
        }
      } catch {
        // skip
      }
    }
    if (uploadedFiles.driversLicense?.storage_path) {
      try {
        const path = pathForDownload(uploadedFiles.driversLicense.storage_path);
        const { data: fileData } = await supabase.storage.from(BUCKET).download(path);
        if (fileData) {
          const buffer = Buffer.from(await fileData.arrayBuffer());
          const ext = uploadedFiles.driversLicense.file_name.split(".").pop() || "pdf";
          await addInternal(`drivers-license-1.${ext}`, buffer, "top-half");
        }
      } catch {
        // skip
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
    await sendEmail({
      to: templateVars.merchantEmail,
      cc: INTERNAL_EMAIL,
      subject: MERCHANT_EMAIL_SUBJECT,
      html: toHtml(getMerchantEmailBody(templateVars)),
      attachments: [{ filename: pdfFilename, content: pdfBuffer }],
    });
    await sendEmail({
      to: INTERNAL_EMAIL,
      subject: getInternalEmailSubject(templateVars),
      html: toHtml(getInternalEmailBody(templateVars)),
      attachments: internalAttachments,
    });
    await clearAbandonedProgress(payload.personal.email.trim());
    await markSubmitted(payload.personal.email ?? "");

    try {
      const funderIds = await getMatchedFunderIds(applicationId);
      if (funderIds.length > 0) {
        const result = await submitApplicationToFunders(applicationId, funderIds);
        if (result.submitted) console.log(LOG_PREFIX, "auto-sent to", result.submitted, "funder(s)");
      } else {
        console.log(LOG_PREFIX, "auto-send: 0 funders matched for application", applicationId);
        await sendFunderMatchSummaryZero(applicationId, payload);
      }
    } catch (e) {
      console.error(LOG_PREFIX, "auto-send to funders failed", e);
      await sendFunderMatchSummaryError(applicationId, payload, e);
    }

    const returnPdf = process.env.NODE_ENV !== "production" ? pdfBuffer.toString("base64") : undefined;
    return { success: true, applicationId, pdfBase64: returnPdf, additionalDetails };
  } catch (err) {
    console.error(LOG_PREFIX, "submitDocuments error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Submission failed." };
  }
}

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

    const row = payloadToRow(payload);

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

    // Link uploaded files to application
    // Files were already uploaded directly to Supabase storage via presigned URLs
    // Now we just need to create records linking them to this application
    console.log(LOG_PREFIX, "linking uploaded files to application");
    
    const uploadedFiles = payload.documents || { bankStatements: [], voidCheck: null, driversLicense: null };
    
    // Bank statements (multiple)
    for (const fileMetadata of uploadedFiles.bankStatements || []) {
      if (fileMetadata && fileMetadata.storage_path) {
        // Move file from temp to final location
        const tempPath = fileMetadata.storage_path;
        const finalPath = tempPath.replace(/^temp\//, `${applicationId}/`);
        
        // Copy to final location
        const { error: moveError } = await supabase.storage
          .from(BUCKET)
          .move(tempPath, finalPath);
        
        if (moveError) {
          console.error("Error moving file:", moveError);
          // Continue anyway, file is still accessible at temp location
        }
        
        await supabase.from("merchant_application_files").insert({
          application_id: applicationId,
          file_type: "bank_statements",
          file_name: fileMetadata.file_name,
          storage_path: moveError ? tempPath : finalPath,
          content_type: fileMetadata.content_type || null,
          file_size_bytes: fileMetadata.file_size,
        });
      }
    }
    
    // Void check (single)
    if (uploadedFiles.voidCheck && uploadedFiles.voidCheck.storage_path) {
      const tempPath = uploadedFiles.voidCheck.storage_path;
      const finalPath = tempPath.replace(/^temp\//, `${applicationId}/`);
      
      const { error: moveError } = await supabase.storage
        .from(BUCKET)
        .move(tempPath, finalPath);
      
      if (moveError) {
        console.error("Error moving file:", moveError);
      }
      
      await supabase.from("merchant_application_files").insert({
        application_id: applicationId,
        file_type: "void_check",
        file_name: uploadedFiles.voidCheck.file_name,
        storage_path: moveError ? tempPath : finalPath,
        content_type: uploadedFiles.voidCheck.content_type || null,
        file_size_bytes: uploadedFiles.voidCheck.file_size,
      });
    }
    
    // Driver's license (single)
    if (uploadedFiles.driversLicense && uploadedFiles.driversLicense.storage_path) {
      const tempPath = uploadedFiles.driversLicense.storage_path;
      const finalPath = tempPath.replace(/^temp\//, `${applicationId}/`);
      
      const { error: moveError } = await supabase.storage
        .from(BUCKET)
        .move(tempPath, finalPath);
      
      if (moveError) {
        console.error("Error moving file:", moveError);
      }
      
      await supabase.from("merchant_application_files").insert({
        application_id: applicationId,
        file_type: "drivers_license",
        file_name: uploadedFiles.driversLicense.file_name,
        storage_path: moveError ? tempPath : finalPath,
        content_type: uploadedFiles.driversLicense.content_type || null,
        file_size_bytes: uploadedFiles.driversLicense.file_size,
      });
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

      // Download uploaded files from storage for email attachments.
      // Files were moved from temp/ to {applicationId}/, so download from final path.
      const pathForDownload = (storagePath: string) =>
        storagePath.startsWith("temp/") ? storagePath.replace(/^temp\//, `${applicationId}/`) : storagePath;

      // Attachments for internal email (subs@onedaycap.com). Watermark PDFs; stored files stay original.
      const internalAttachments: { filename: string; content: Buffer }[] = [];
      const addInternal = async (
        filename: string,
        buffer: Buffer,
        placement: WatermarkPlacement
      ) => {
        const content = await addWatermarkToPdf(buffer, placement);
        internalAttachments.push({ filename, content });
      };

      await addInternal(pdfFilename, pdfBuffer, "application-form-terms");

      for (let i = 0; i < (uploadedFiles.bankStatements || []).length; i++) {
        const fileMetadata = uploadedFiles.bankStatements[i];
        if (fileMetadata?.storage_path) {
          try {
            const path = pathForDownload(fileMetadata.storage_path);
            const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
            if (!downloadError && fileData) {
              const buffer = Buffer.from(await fileData.arrayBuffer());
              const ext = fileMetadata.file_name.split(".").pop() || "pdf";
              await addInternal(`bank-statement-${i + 1}.${ext}`, buffer, "page1-top30");
            } else if (downloadError) {
              console.error(LOG_PREFIX, "email attachment download failed (bank):", path, downloadError);
            }
          } catch (err) {
            console.error("Error downloading bank statement for email:", err);
          }
        }
      }

      if (uploadedFiles.voidCheck?.storage_path) {
        try {
          const path = pathForDownload(uploadedFiles.voidCheck.storage_path);
          const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
          if (!downloadError && fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            const ext = uploadedFiles.voidCheck.file_name.split(".").pop() || "pdf";
            await addInternal(`void-check-1.${ext}`, buffer, "top-half");
          } else if (downloadError) {
            console.error(LOG_PREFIX, "email attachment download failed (void):", path, downloadError);
          }
        } catch (err) {
          console.error("Error downloading void check for email:", err);
        }
      }

      if (uploadedFiles.driversLicense?.storage_path) {
        try {
          const path = pathForDownload(uploadedFiles.driversLicense.storage_path);
          const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
          if (!downloadError && fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            const ext = uploadedFiles.driversLicense.file_name.split(".").pop() || "pdf";
            await addInternal(`drivers-license-1.${ext}`, buffer, "top-half");
          } else if (downloadError) {
            console.error(LOG_PREFIX, "email attachment download failed (dl):", path, downloadError);
          }
        } catch (err) {
          console.error("Error downloading driver's license for email:", err);
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
      // (b) Email to me (subs@onedaycap.com): notification + watermarked PDF + all uploaded files (watermarked)
      await sendEmail({
        to: INTERNAL_EMAIL,
        subject: getInternalEmailSubject(templateVars),
        html: toHtml(getInternalEmailBody(templateVars)),
        attachments: internalAttachments,
      });
    } catch (emailErr) {
      console.error(LOG_PREFIX, "Application PDF/email error (application was saved):", emailErr);
      // Do not fail the submit; application is already in DB
    }

    console.log(LOG_PREFIX, "returning success");
    // Don't return pdfBase64 in production to avoid Server Action response size limits (Vercel ~4.5MB).
    // Mark application session as submitted so abandonment nudges are suppressed.
    await markSubmitted(payload.personal.email ?? "");

    // Auto-send to shortlisted funders (do not fail the submit if this errors).
    // subs@ always gets a summary: with recipients when we sent to funders, or a "0 matched" summary for manual follow-up.
    try {
      const funderIds = await getMatchedFunderIds(applicationId);
      if (funderIds.length > 0) {
        const result = await submitApplicationToFunders(applicationId, funderIds);
        if (result.submitted) console.log(LOG_PREFIX, "auto-sent to", result.submitted, "funder(s)");
      } else {
        console.log(LOG_PREFIX, "auto-send: 0 funders matched for application", applicationId);
        await sendFunderMatchSummaryZero(applicationId, payload);
      }
    } catch (e) {
      console.error(LOG_PREFIX, "auto-send to funders failed", e);
      await sendFunderMatchSummaryError(applicationId, payload, e);
    }

    // User gets the PDF via email; processing page shows additionalDetails when present.
    const returnPdf = process.env.NODE_ENV !== "production" ? pdfBase64ForClient : undefined;
    return { success: true, applicationId, pdfBase64: returnPdf, additionalDetails };
  } catch (err) {
    console.error(LOG_PREFIX, "submitApplication error:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
