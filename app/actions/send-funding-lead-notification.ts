"use server";

import { sendEmail, getInternalEmail } from "@/lib/send-application-email";
import type { FinancialFundingInfo } from "@/components/apply-form/types";

const SUBJECT_PREFIX = "Funding lead: new step 1";

function formatFundingLabel(useOfFunds: string): string {
  const labels: Record<string, string> = {
    "working-capital": "Working Capital",
    "business-expansion": "Business Expansion",
    "debt-refinancing": "Debt Refinancing",
    others: "Others",
  };
  return labels[useOfFunds] ?? useOfFunds;
}

function formatRevenueLabel(monthlyRevenue: string): string {
  const labels: Record<string, string> = {
    "under-50k": "<$50,000",
    "50k-100k": "$50,000 - $100,000",
    "over-100k": "> $100,000",
  };
  return labels[monthlyRevenue] ?? monthlyRevenue;
}

/**
 * Send an email to subs@onedaycap.com when the user completes step 1 (Financial and Funding)
 * so you know right away who is looking for what level of funding.
 * Email is included when available (e.g. from campaign/resume); otherwise "Not yet provided".
 */
export async function sendFundingLeadNotification(params: {
  email?: string | null;
  financial: FinancialFundingInfo;
}): Promise<{ ok: boolean; error?: string }> {
  const { email, financial } = params;
  const emailDisplay = (email ?? "").trim() || "Not yet provided (step 2)";
  const subject = `${SUBJECT_PREFIX} - ${emailDisplay}`;
  const revenue = formatRevenueLabel((financial.monthlyRevenue ?? "").trim());
  const fundingRequest = (financial.fundingRequest ?? "").trim() || "—";
  const useOfFunds = formatFundingLabel((financial.useOfFunds ?? "").trim());

  const html = `
<p><strong>Funding lead</strong> — applicant completed Step 1 (Financial and Funding).</p>
<table style="border-collapse:collapse; margin-top:12px;">
<tr><td style="padding:6px 12px 6px 0; vertical-align:top;"><strong>Email</strong></td><td style="padding:6px 0;">${escapeHtml(emailDisplay)}</td></tr>
<tr><td style="padding:6px 12px 6px 0; vertical-align:top;"><strong>Monthly Revenue</strong></td><td style="padding:6px 0;">${escapeHtml(revenue)}</td></tr>
<tr><td style="padding:6px 12px 6px 0; vertical-align:top;"><strong>Funding Request</strong></td><td style="padding:6px 0;">${escapeHtml(fundingRequest)}</td></tr>
<tr><td style="padding:6px 12px 6px 0; vertical-align:top;"><strong>Use of Funds</strong></td><td style="padding:6px 0;">${escapeHtml(useOfFunds)}</td></tr>
</table>
<p style="margin-top:16px; color:#6b7280; font-size:12px;">Sent when the user completed step 1; they may still be filling the form.</p>
`.trim();

  const { ok, error } = await sendEmail({
    to: getInternalEmail(),
    subject,
    html,
  });
  return ok ? { ok: true } : { ok: false, error };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
