/**
 * Send emails on application submit:
 * (a) To merchant — confirmation + application PDF
 * (b) To subs@onedaycap.com — notification + PDF + all uploaded files
 * Uses Resend. Set RESEND_API_KEY and optionally RESEND_FROM_EMAIL (default subs@onedaycap.com).
 */

const INTERNAL_EMAIL = "subs@onedaycap.com";
const DEFAULT_FROM_EMAIL = "subs@onedaycap.com";
/** Display name recipients see in their inbox (e.g. "OneDayCap" instead of "subs"). */
const FROM_DISPLAY_NAME = "OneDayCap";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  cc?: string | string[];
  from?: string;
}

/**
 * Send a single email via Resend.
 * Used for both merchant confirmation and internal notification.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set; skipping email.");
    return { ok: false, error: "Email not configured (RESEND_API_KEY)." };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const fromRaw = options.from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL;
    const from = fromRaw.includes("<") ? fromRaw : `${FROM_DISPLAY_NAME} <${fromRaw}>`;
    const to = Array.isArray(options.to) ? options.to : [options.to];

    const payload: Parameters<typeof resend.emails.send>[0] = {
      from,
      to,
      subject: options.subject,
      html: options.html,
    };
    if (options.cc?.length) {
      payload.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
    }
    if (options.attachments?.length) {
      payload.attachments = options.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
      }));
    }

    const result = await resend.emails.send(payload);

    if (result.error) {
      console.error("Resend error:", result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sendEmail error:", e);
    return { ok: false, error: msg };
  }
}

/** Internal recipient for application notifications (workflow: "email to me"). */
export function getInternalEmail(): string {
  return INTERNAL_EMAIL;
}

/**
 * Legacy: send one email to subs@onedaycap.com (internal only).
 * Prefer using sendEmail() directly for the two-email workflow.
 */
export async function sendApplicationEmail(
  subject: string,
  body: string,
  attachments: EmailAttachment[]
): Promise<{ ok: boolean; error?: string }> {
  return sendEmail({
    to: INTERNAL_EMAIL,
    subject,
    html: body.replace(/\n/g, "<br>\n"),
    attachments,
  });
}
