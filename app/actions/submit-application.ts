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

      // Download uploaded files from storage for email attachments
      const allAttachments: { filename: string; content: Buffer }[] = [
        { filename: pdfFilename, content: pdfBuffer },
      ];
      
      // Download bank statements
      for (let i = 0; i < (uploadedFiles.bankStatements || []).length; i++) {
        const fileMetadata = uploadedFiles.bankStatements[i];
        if (fileMetadata && fileMetadata.storage_path) {
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from(BUCKET)
              .download(fileMetadata.storage_path);
            
            if (!downloadError && fileData) {
              const arrayBuffer = await fileData.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const ext = fileMetadata.file_name.split(".").pop() || "pdf";
              allAttachments.push({
                filename: `bank-statement-${i + 1}.${ext}`,
                content: buffer,
              });
            }
          } catch (err) {
            console.error("Error downloading bank statement for email:", err);
          }
        }
      }
      
      // Download void check
      if (uploadedFiles.voidCheck && uploadedFiles.voidCheck.storage_path) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(BUCKET)
            .download(uploadedFiles.voidCheck.storage_path);
          
          if (!downloadError && fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const ext = uploadedFiles.voidCheck.file_name.split(".").pop() || "pdf";
            allAttachments.push({
              filename: `void-check-1.${ext}`,
              content: buffer,
            });
          }
        } catch (err) {
          console.error("Error downloading void check for email:", err);
        }
      }
      
      // Download driver's license
      if (uploadedFiles.driversLicense && uploadedFiles.driversLicense.storage_path) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(BUCKET)
            .download(uploadedFiles.driversLicense.storage_path);
          
          if (!downloadError && fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const ext = uploadedFiles.driversLicense.file_name.split(".").pop() || "pdf";
            allAttachments.push({
              filename: `drivers-license-1.${ext}`,
              content: buffer,
            });
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
