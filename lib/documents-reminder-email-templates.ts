/**
 * Email copy for the 5-minute "submit documents" reminder.
 * Placeholders: {{firstName}}, {{businessName}}, {{uploadLink}}, {{documentList}}
 */

function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit && explicit.startsWith("http")) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.includes("vercel.app")) return "https://www.onedaycap.com";
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "https://www.onedaycap.com";
}

export function getDocumentsUploadLink(token: string): string {
  return `${baseUrl()}/apply/documents?t=${encodeURIComponent(token)}`;
}

export type DocumentsReminderVars = {
  firstName: string;
  businessName: string;
  uploadLink: string;
  documentList: string;
};

function replaceVars(text: string, vars: Record<string, string>): string {
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value ?? "");
  }
  return out;
}

export const DOCUMENTS_REMINDER_SUBJECT = "Complete your OneDayCap application – submit your documents";

/** Body for the applicant: list documents and link to upload page. */
export const DOCUMENTS_REMINDER_BODY = `Hello {{firstName}},

You recently signed and saved your funding application for {{businessName}}, but we haven’t received your documents yet.

Please submit the following via the link below (or reply to this email with the files attached):

{{documentList}}

Upload your documents here: {{uploadLink}}

If you have already submitted, please disregard this message.

Best regards,
OneDay Capital LLC
www.onedaycap.com`;

export function getDocumentsReminderBody(vars: DocumentsReminderVars): string {
  return replaceVars(DOCUMENTS_REMINDER_BODY, vars);
}

/** Subject for internal email to subs@ (with application PDF). */
export const DOCUMENTS_REMINDER_INTERNAL_SUBJECT_TEMPLATE = "Pending documents – {{businessName}} ({{applicationId}})";

export function getDocumentsReminderInternalSubject(applicationId: string, businessName: string): string {
  return replaceVars(DOCUMENTS_REMINDER_INTERNAL_SUBJECT_TEMPLATE, { applicationId, businessName });
}

/** Body for internal email (subs@). */
export const DOCUMENTS_REMINDER_INTERNAL_BODY = `Application was saved (Sign & Conclude) but documents were not submitted within 5 minutes.

Applicant has been sent a reminder email with the upload link.

Application PDF is attached.`;

/** Default document list text for the applicant email. */
export const DEFAULT_DOCUMENT_LIST =
  "• Bank statements (consecutive months)\n• Void check\n• Driver's license";
