"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { sendEmail, getInternalEmail } from "@/lib/send-application-email";

const BUCKET = "merchant-documents";
const INTERNAL_CC = "subs@onedaycap.com";

export interface FunderOption {
  id: string;
  name: string;
  email: string | null;
  relationshipStatus: string;
  /** True when this funder's guidelines match the application (shortlist). */
  matched?: boolean;
}

export interface ApplicationOption {
  id: string;
  businessName: string;
  createdAt: string;
}

export interface SubmitToFundersResult {
  success: boolean;
  error?: string;
  submitted?: number;
  failed?: { funderId: string; funderName: string; error: string }[];
}

/**
 * Parse currency-like strings from the form (e.g. "$50,000", "50000") to a number for comparison.
 */
function parseCurrencyValue(s: string | null | undefined): number | null {
  if (s == null || String(s).trim() === "") return null;
  const cleaned = String(s).replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Form stores monthly revenue as a range label (under-50k, 50k-100k, over-100k).
 * Map to a numeric value for guideline matching: use midpoint of range.
 */
function monthlyRevenueToNumber(s: string | null | undefined): number | null {
  const v = (s ?? "").trim().toLowerCase();
  if (v === "under-50k") return 25_000;   // 0–50k midpoint
  if (v === "50k-100k") return 75_000;   // 50k–100k midpoint
  if (v === "over-100k") return 150_000; // >100k representative
  return parseCurrencyValue(s);
}

/**
 * Return funder IDs that match the application per funder_guidelines (state, industry, revenue, funding range).
 * Used to build the shortlist. See docs/FUNDER_SHORTLIST_MATCHING.md for rules.
 */
export async function getMatchedFunderIds(applicationId: string): Promise<string[]> {
  const supabase = getSupabaseServer();
  const { data: app, error: appErr } = await supabase
    .from("merchant_applications")
    .select("state, industry, monthly_revenue, funding_request")
    .eq("id", applicationId)
    .single();
  if (appErr || !app) {
    console.warn("[funder-match] app not found", applicationId, appErr?.message);
    return [];
  }

  const appState = (app.state ?? "").trim().toUpperCase();
  const appIndustry = (app.industry ?? "").trim();
  const appRevenue = parseCurrencyValue(app.monthly_revenue) ?? monthlyRevenueToNumber(app.monthly_revenue);
  const appFunding = parseCurrencyValue(app.funding_request);

  const { data: guidelines, error: gErr } = await supabase
    .from("funder_guidelines")
    .select("funder_id, states_allowed, states_excluded, industries, revenue_min, revenue_max, min_funding, max_funding");
  if (gErr || !guidelines?.length) {
    console.warn("[funder-match] no funder_guidelines rows", gErr?.message);
    return [];
  }

  const matched: string[] = [];
  for (const g of guidelines) {
    if (g.states_excluded?.length && appState) {
      const excluded = (g.states_excluded as string[]).map((s) => String(s).trim().toUpperCase());
      if (excluded.includes(appState)) continue;
    }
    if (g.states_allowed?.length && appState) {
      const allowed = (g.states_allowed as string[]).map((s) => String(s).trim().toUpperCase());
      if (!allowed.includes(appState)) continue;
    }
    if (g.industries != null) {
      const list = Array.isArray(g.industries) ? g.industries : (g.industries && typeof g.industries === "object" && "list" in g.industries ? (g.industries as { list: string[] }).list : []);
      const industryList = (Array.isArray(list) ? list : []).map((i) => String(i).trim().toLowerCase());
      if (industryList.length > 0 && appIndustry && !industryList.some((i) => appIndustry.toLowerCase().includes(i) || i.includes(appIndustry.toLowerCase()))) continue;
    }
    if (g.revenue_min != null && appRevenue != null && appRevenue < g.revenue_min) continue;
    if (g.revenue_max != null && appRevenue != null && appRevenue > g.revenue_max) continue;
    if (g.min_funding != null && appFunding != null && appFunding < g.min_funding) continue;
    if (g.max_funding != null && appFunding != null && appFunding > g.max_funding) continue;
    matched.push(g.funder_id);
  }
  const result = Array.from(new Set(matched));
  if (result.length === 0) {
    console.warn("[funder-match] no funders passed filters", {
      applicationId,
      monthly_revenue_raw: app.monthly_revenue,
      appRevenue,
      appFunding,
      guidelineCount: guidelines.length,
    });
  }
  return result;
}

/**
 * List funders suitable for shortlisting (active first). Includes primary contact email.
 * When applicationId is provided, also returns matched=true for funders that match the application per funder_guidelines (shortlist).
 */
export async function listFundersForSubmit(applicationId?: string): Promise<FunderOption[]> {
  const supabase = getSupabaseServer();
  const { data: funders, error: fundersError } = await supabase
    .from("funders")
    .select("id, name, relationship_status")
    .order("relationship_status", { ascending: true })
    .order("name");

  if (fundersError) return [];
  if (!funders?.length) return [];

  const ids = funders.map((f) => f.id);
  const [contactsResult, matchedIds] = await Promise.all([
    supabase.from("funder_contacts").select("funder_id, email").in("funder_id", ids),
    applicationId ? getMatchedFunderIds(applicationId) : Promise.resolve([] as string[]),
  ]);
  const contacts = contactsResult.data ?? [];
  const matchedSet = new Set(matchedIds);

  const emailByFunder = new Map<string, string | null>();
  for (const c of contacts) {
    emailByFunder.set(c.funder_id, c.email ?? null);
  }

  return funders.map((f) => ({
    id: f.id,
    name: f.name,
    email: emailByFunder.get(f.id) ?? null,
    relationshipStatus: f.relationship_status ?? "active",
    matched: applicationId ? matchedSet.has(f.id) : undefined,
  }));
}

/**
 * List recent merchant applications for picking which to send to funders.
 */
export async function listRecentApplications(limit = 50): Promise<ApplicationOption[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("merchant_applications")
    .select("id, business_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []).map((row) => ({
    id: row.id,
    businessName: row.business_name ?? "",
    createdAt: row.created_at ?? "",
  }));
}

/**
 * Submit one merchant application to selected funders by email.
 * Attachments: all application files in storage (application form PDF, bank statements, void check, driver's license).
 * For each funder: resolve To/CC from funder_submission_rules (or contact), send email with all attachments, then insert funder_submissions + submission_messages + submission_events.
 */
export async function submitApplicationToFunders(
  applicationId: string,
  funderIds: string[]
): Promise<SubmitToFundersResult> {
  if (!funderIds.length) {
    return { success: false, error: "Select at least one funder." };
  }

  const supabase = getSupabaseServer();

  const { data: app, error: appError } = await supabase
    .from("merchant_applications")
    .select("id, business_name, funding_request, use_of_funds, state, industry, monthly_revenue, start_date_of_business")
    .eq("id", applicationId)
    .single();

  if (appError || !app) {
    return { success: false, error: "Application not found." };
  }

  const businessName = app.business_name ?? "Unknown";

  const { data: allFiles, error: filesError } = await supabase
    .from("merchant_application_files")
    .select("id, storage_path, file_name, file_type, created_at")
    .eq("application_id", applicationId)
    .order("file_type")
    .order("created_at");

  if (filesError || !allFiles?.length) {
    return { success: false, error: "No application files found for this application." };
  }

  const hasApplicationPdf = allFiles.some((f) => f.file_type === "application_pdf");
  if (!hasApplicationPdf) {
    return { success: false, error: "Application PDF not found for this application." };
  }

  // Order: application_pdf first, then bank_statements (by created_at), then void_check, then drivers_license
  const order: Record<string, number> = {
    application_pdf: 0,
    bank_statements: 1,
    void_check: 2,
    drivers_license: 3,
  };
  const sorted = [...allFiles].sort((a, b) => {
    const oa = order[a.file_type] ?? 99;
    const ob = order[b.file_type] ?? 99;
    if (oa !== ob) return oa - ob;
    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  });

  const attachments: { filename: string; content: Buffer }[] = [];
  const attachmentUrls: { name: string; storage_path: string }[] = [];
  let bankStatementIndex = 0;

  for (const row of sorted) {
    if (!row.storage_path) continue;
    const { data: blob, error: downloadErr } = await supabase.storage
      .from(BUCKET)
      .download(row.storage_path);

    if (downloadErr || !blob) {
      if (row.file_type === "application_pdf") {
        return { success: false, error: "Could not download application PDF from storage." };
      }
      continue;
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    let filename = row.file_name ?? row.storage_path.split("/").pop() ?? "document";
    if (row.file_type === "bank_statements") {
      const ext = filename.split(".").pop() || "pdf";
      bankStatementIndex += 1;
      filename = `bank-statement-${bankStatementIndex}.${ext}`;
    } else if (row.file_type === "void_check") {
      const ext = filename.split(".").pop() || "pdf";
      filename = `void-check.${ext}`;
    } else if (row.file_type === "drivers_license") {
      const ext = filename.split(".").pop() || "pdf";
      filename = `drivers-license.${ext}`;
    }

    attachments.push({ filename, content: buffer });
    attachmentUrls.push({ name: filename, storage_path: row.storage_path });
  }

  const attachmentFileNames = attachments.map((a) => a.filename);
  const subject = `New Application: ${businessName} submitted by OneDay Capital LLC.`;

  const { data: contactsForFunders } = await supabase
    .from("funder_contacts")
    .select("funder_id, name, email, phone")
    .in("funder_id", funderIds);
  const contactNameByFunderId = new Map<string, string>();
  const contactEmailByFunderId = new Map<string, string>();
  const contactPhoneByFunderId = new Map<string, string>();
  for (const c of contactsForFunders ?? []) {
    if (c.name?.trim()) contactNameByFunderId.set(c.funder_id, c.name.trim());
    if (c.email?.trim()) contactEmailByFunderId.set(c.funder_id, c.email.trim());
    if (c.phone?.trim()) contactPhoneByFunderId.set(c.funder_id, c.phone.trim());
  }

  function buildFunderEmailHtml(funderId: string, funderDisplayName: string): string {
    const greetingName = contactNameByFunderId.get(funderId) || funderDisplayName.trim() || "Team";
    return `
<p>Hi ${escapeHtml(greetingName)},</p>

<p><strong>New Application from OneDay Capital LLC</strong></p>

<p>
Merchant Name: ${escapeHtml(app?.business_name ?? "—")}<br>
Funds Requested: ${formatCurrencyDisplay(app?.funding_request)}<br>
Reason for Funds: ${escapeHtml(app?.use_of_funds ?? "—")}<br>
State: ${escapeHtml(app?.state ?? "—")}<br>
Industry: ${escapeHtml(app?.industry ?? "—")}<br>
Monthly Revenues (Approximate): ${formatCurrencyDisplay(app?.monthly_revenue)}<br>
Time in Business: ${escapeHtml(app?.start_date_of_business ?? "—")}
</p>

<p><strong>Attachment list:</strong><br>
${attachmentFileNames.map((f) => `• ${escapeHtml(f)}`).join("<br>\n")}
</p>

<p>Looking for a fast and favorable response. Pleasure working with your team.</p>

<p>
Sincerely,<br>
OneDayCap Team<br>
<a href="https://www.onedaycap.com">www.onedaycap.com</a> | <a href="mailto:subs@onedaycap.com">subs@onedaycap.com</a>
</p>

<hr style="margin:1.5em 0; border:0; border-top:1px solid #ccc;">

<p style="font-size:0.9em; color:#555;"><strong>Broker of Record Notice:</strong><br>
This submission is provided pursuant to the executed ISO/Broker Agreement between Oneday Capital and your organization. Oneday Capital remains the broker of record for this transaction. Any funding resulting from this submission is subject to the commission and protection terms outlined in our agreement.</p>

<p style="font-size:0.9em; color:#555;">Direct solicitation or funding of this merchant outside the scope of our broker relationship is prohibited under our agreement.</p>

<p style="font-size:0.9em; color:#555;"><strong>Confidential Information:</strong><br>
The attached materials contain confidential financial and personal information provided solely for underwriting and funding evaluation. Distribution, duplication, or use outside of this purpose is not permitted.</p>
`.trim();
  }

  const failed: { funderId: string; funderName: string; error: string }[] = [];
  const sentToList: {
    funderName: string;
    to: string[];
    cc: string[];
    matched: boolean;
    primaryContactName: string | null;
    primaryContactEmail: string | null;
    primaryContactPhone: string | null;
  }[] = [];
  let submitted = 0;
  const matchedFunderIds = new Set(await getMatchedFunderIds(applicationId));

  for (const funderId of funderIds) {
    const { data: funder, error: funderErr } = await supabase
      .from("funders")
      .select("id, name")
      .eq("id", funderId)
      .single();

    if (funderErr || !funder) {
      failed.push({ funderId, funderName: "(unknown)", error: "Funder not found." });
      continue;
    }

    const toEmails: string[] = [];
    const ccEmails: string[] = [];

    const { data: rules } = await supabase
      .from("funder_submission_rules")
      .select("to_emails, cc_emails")
      .eq("funder_id", funderId)
      .eq("channel", "email")
      .maybeSingle();

    if (rules?.to_emails?.length) {
      toEmails.push(...(rules.to_emails as string[]).filter(Boolean));
    }
    if (rules?.cc_emails?.length) {
      ccEmails.push(...(rules.cc_emails as string[]).filter(Boolean));
    }

    if (toEmails.length === 0) {
      const { data: contact } = await supabase
        .from("funder_contacts")
        .select("email")
        .eq("funder_id", funderId)
        .maybeSingle();
      if (contact?.email) toEmails.push(contact.email);
    }

    if (toEmails.length === 0) {
      failed.push({ funderId, funderName: funder.name, error: "No To address (add contact or submission rules)." });
      continue;
    }

    const ccWithInternal = Array.from(new Set([...ccEmails, INTERNAL_CC]));
    const { ok, error: sendErr } = await sendEmail({
      to: toEmails,
      cc: ccWithInternal,
      subject,
      html: buildFunderEmailHtml(funderId, funder.name),
      attachments,
    });

    if (!ok) {
      failed.push({ funderId, funderName: funder.name, error: sendErr ?? "Email send failed." });
      continue;
    }

    sentToList.push({
      funderName: funder.name,
      to: toEmails,
      cc: ccWithInternal,
      matched: matchedFunderIds.has(funderId),
      primaryContactName: contactNameByFunderId.get(funderId) ?? null,
      primaryContactEmail: contactEmailByFunderId.get(funderId) ?? null,
      primaryContactPhone: contactPhoneByFunderId.get(funderId) ?? null,
    });

    const toCcSnapshot = {
      to: toEmails,
      cc: ccWithInternal,
    };

    const { data: sub, error: subErr } = await supabase
      .from("funder_submissions")
      .insert({
        merchant_application_id: applicationId,
        funder_id: funderId,
        channel: "email",
        status: "sent",
        to_cc_snapshot: toCcSnapshot,
      })
      .select("id")
      .single();

    if (subErr || !sub) {
      failed.push({ funderId, funderName: funder.name, error: "Email sent but DB insert failed: " + (subErr?.message ?? "unknown") });
      continue;
    }

    await supabase.from("submission_messages").insert({
      funder_submission_id: sub.id,
      from_addr: process.env.RESEND_FROM_EMAIL ?? "subs@onedaycap.com",
      to_addrs: toEmails,
      cc_addrs: ccEmails.length ? ccEmails : null,
      attachment_urls: attachmentUrls.length ? attachmentUrls : null,
      direction: "outbound",
    });

    await supabase.from("submission_events").insert({
      funder_submission_id: sub.id,
      event_type: "sent",
    });

    submitted++;
  }

  if (sentToList.length > 0) {
    const summarySubject = `Funder submission summary: ${businessName} — sent to ${sentToList.length} funder(s)`;
    const summaryRows = sentToList
      .map(
        (s) =>
          `<tr>
            <td style="padding:0.4em 0.6em; border:1px solid #ddd;">${escapeHtml(s.funderName)}</td>
            <td style="padding:0.4em 0.6em; border:1px solid #ddd;">${escapeHtml(s.primaryContactName ?? "—")}</td>
            <td style="padding:0.4em 0.6em; border:1px solid #ddd;">${escapeHtml(s.primaryContactEmail ?? "—")}</td>
            <td style="padding:0.4em 0.6em; border:1px solid #ddd;">${escapeHtml(s.primaryContactPhone ?? "—")}</td>
            <td style="padding:0.4em 0.6em; border:1px solid #ddd;">${s.matched ? "Yes" : "No"}</td>
            <td style="padding:0.4em 0.6em; border:1px solid #ddd;">${escapeHtml(s.to.join(", "))}</td>
            <td style="padding:0.4em 0.6em; border:1px solid #ddd;">${escapeHtml(s.cc.join(", "))}</td>
          </tr>`
      )
      .join("");
    const summaryHtml = `
<p><strong>Application:</strong> ${escapeHtml(businessName)}</p>
<p>Application ID: ${escapeHtml(applicationId)}</p>
<p>Funds requested: ${formatCurrencyDisplay(app?.funding_request)} | Monthly revenues: ${formatCurrencyDisplay(app?.monthly_revenue)} | State: ${escapeHtml(app?.state ?? "—")} | Industry: ${escapeHtml(app?.industry ?? "—")}</p>

<p><strong>Recipients (use this list to follow up and negotiate):</strong></p>
<table style="border-collapse:collapse; font-size:14px;">
  <thead>
    <tr>
      <th style="padding:0.4em 0.6em; border:1px solid #ddd; text-align:left;">Funder</th>
      <th style="padding:0.4em 0.6em; border:1px solid #ddd; text-align:left;">Primary contact name</th>
      <th style="padding:0.4em 0.6em; border:1px solid #ddd; text-align:left;">Primary contact email</th>
      <th style="padding:0.4em 0.6em; border:1px solid #ddd; text-align:left;">Primary contact phone</th>
      <th style="padding:0.4em 0.6em; border:1px solid #ddd; text-align:left;">Shortlist match</th>
      <th style="padding:0.4em 0.6em; border:1px solid #ddd; text-align:left;">To</th>
      <th style="padding:0.4em 0.6em; border:1px solid #ddd; text-align:left;">CC</th>
    </tr>
  </thead>
  <tbody>${summaryRows}</tbody>
</table>

<p>— OneDayCap (submit-to-funders)</p>
`.trim();
    await sendEmail({
      to: getInternalEmail(),
      subject: summarySubject,
      html: summaryHtml,
    });
  }

  return {
    success: true,
    submitted,
    failed: failed.length ? failed : undefined,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Format digits or currency string as USD for display (e.g. in emails). */
function formatCurrencyDisplay(s: string | null | undefined): string {
  const n = parseCurrencyValue(s);
  if (n == null) return (s ?? "").trim() || "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}
