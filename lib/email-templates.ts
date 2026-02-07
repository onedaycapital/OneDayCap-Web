/**
 * Editable email body copy for application submission.
 * Edit the strings below to change what recipients see.
 * Placeholders: {{businessName}}, {{applicationId}}, {{merchantEmail}}, {{firstName}}, {{ownerName}}, {{phone}}
 */

/** Placeholder map type for template substitution */
export type EmailTemplateVars = Record<string, string>;

function replaceVars(text: string, vars: EmailTemplateVars): string {
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value ?? "");
  }
  return out;
}

// -----------------------------------------------------------------------------
// (a) Email to Merchant — confirmation after they submit
// -----------------------------------------------------------------------------

export const MERCHANT_EMAIL_SUBJECT = "You have successfully submitted your application with OneDayCap.com";

/** Body of the email sent to the merchant. Edit this copy as needed. Placeholders: {{businessName}}, {{firstName}}. */
export const MERCHANT_EMAIL_BODY = `Hello {{firstName}},

Thank you for submitting your funding application with OneDay Capital.

We have received your application for {{businessName}} and will work with our funder network to find the best options for you.

What happens next:
• Our team will review your application.
• We'll match you with suitable funders and keep you updated.
• You can expect to hear from us typically within 1–4 hours during business hours.

Your application form PDF is attached to this email for your records.

If you have any questions or need to send additional documents, reply to this email or contact us at subs@onedaycap.com and include your business name in the subject line.

Best regards,
OneDay Capital LLC
www.onedaycap.com`;

export function getMerchantEmailBody(vars: EmailTemplateVars): string {
  const defaults: EmailTemplateVars = {
    businessName: "",
    applicationId: "",
    merchantEmail: "",
    firstName: "",
  };
  const merged = { ...defaults, ...vars };
  let body = replaceVars(MERCHANT_EMAIL_BODY, merged);
  body = body.replace(/^Hello \s*,/m, "Hello,");
  return body.trim();
}

// -----------------------------------------------------------------------------
// (b) Email to Internal (subs@onedaycap.com) — new application notification
// -----------------------------------------------------------------------------

/** Subject for the internal email. {{businessName}} is replaced. */
export const INTERNAL_EMAIL_SUBJECT_TEMPLATE = "Merchant application {{businessName}}";

export function getInternalEmailSubject(vars: EmailTemplateVars): string {
  return replaceVars(INTERNAL_EMAIL_SUBJECT_TEMPLATE, vars);
}

/** Body of the email sent to subs@onedaycap.com. Edit this copy as needed. Placeholders: {{businessName}}, {{ownerName}}, {{merchantEmail}}, {{phone}}, {{applicationId}}. */
export const INTERNAL_EMAIL_BODY = `New application submitted.

Business Name: {{businessName}}
Owner Name: {{ownerName}}
Email: {{merchantEmail}}
Phone No: {{phone}}

Application ID: {{applicationId}}

Attachments: Merchant Application Form PDF and all files uploaded by the applicant.`;

export function getInternalEmailBody(vars: EmailTemplateVars): string {
  const defaults: EmailTemplateVars = {
    businessName: "",
    applicationId: "",
    merchantEmail: "",
    ownerName: "",
    phone: "",
  };
  return replaceVars(INTERNAL_EMAIL_BODY, { ...defaults, ...vars });
}
