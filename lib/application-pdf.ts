/**
 * Generate application form as a single-page PDF using pdf-lib.
 * Layout: header (logo, title, contact); Additional Details tile (top right);
 * Left column = Business Details; Right column = Owner Details;
 * Funding/Use tile; Terms; Signature; Footer.
 */

import path from "path";
import fs from "fs";
import {
  PDFDocument,
  PageSizes,
  StandardFonts,
  rgb,
} from "pdf-lib";
import type { SubmitPayload } from "@/app/actions/submit-application";
import { getIndustryRisk } from "@/lib/industry-risk";
import type { PaperClassification } from "@/lib/paper-classifier";
import { LOGO_PNG_BASE64 } from "@/lib/logo-pdf";

/** One row in the Additional Details tile (label + value). */
export interface AdditionalDetailsRow {
  label: string;
  value: string;
}

/** Legacy range labels (for old data); numeric values are formatted as currency. */
const MONTHLY_REVENUE_LEGACY: Record<string, string> = {
  "under-50k": "<$50,000",
  "50k-100k": "$50,000 - $100,000",
  "over-100k": "> $100,000",
};

function formatMonthlyRevenueDisplay(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length > 0) {
    const n = parseInt(digits, 10);
    if (Number.isFinite(n)) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(n);
    }
  }
  return MONTHLY_REVENUE_LEGACY[trimmed] ?? trimmed;
}

/** Use of Funds: sentence casing for PDF (e.g. working-capital → Working Capital). */
function formatUseOfFundsDisplay(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const map: Record<string, string> = {
    "working-capital": "Working Capital",
    "business-expansion": "Business Expansion",
    "debt-refinancing": "Debt Refinancing",
    others: "Others",
  };
  return map[value.trim().toLowerCase()] ?? sentenceCase(value.trim());
}

/** Type of Business: proper casing for PDF (e.g. llc → LLC, c-corp → C-Corp). */
function formatTypeOfBusinessDisplay(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const map: Record<string, string> = {
    llc: "LLC",
    "c-corp": "C-Corp",
    "s-corp": "S-Corp",
    partnership: "Partnership",
    others: "Others",
    inc: "Inc",
    "c-type": "C-Type",
  };
  const lower = value.trim().toLowerCase();
  return map[lower] ?? sentenceCase(value.trim());
}

function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/-(\w)/g, (_, c) => " " + c.toUpperCase());
}

/** Format funding request as USD with 0 decimals for PDF display, e.g. $65,000. */
function formatFundingRequestDisplay(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits === "") return "—";
  const n = parseInt(digits, 10);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Build the same rows shown in the PDF "Additional Details" tile (for PDF and processing page). */
export function buildAdditionalDetailsRows(
  payload: SubmitPayload,
  classification?: Pick<PaperClassification, "industryRiskTier" | "paperType"> | null
): AdditionalDetailsRow[] {
  const b = payload.business;
  const f = payload.financial;
  const industryRiskDisplay = classification?.industryRiskTier ?? getIndustryRisk(b.industry);
  const paperTypeDisplay = classification?.paperType ?? "—";
  return [
    { label: "Industry Risk", value: industryRiskDisplay },
    { label: "Paper Type", value: String(paperTypeDisplay) },
    { label: "State", value: b.state || "—" },
    { label: "Monthly Revenues (Approximate)", value: formatMonthlyRevenueDisplay(f.monthlyRevenue) },
    { label: "Time in Business", value: b.startDateOfBusiness || "—" },
    { label: "Industry", value: b.industry || "—" },
  ];
}

const CONTACT_EMAIL = "subs@onedaycap.com";

const TERMS = `By submitting this application, each of the above listed business and business owner/officer (individually and collectively, "you") authorize OneDay Capital LLC and each of its representatives, successors, assigns and designees ("Recipients") that may be involved with or acquire commercial loans having daily repayment features or purchases of future receivables including Merchant Cash Advance transactions, including without limitation the application therefor (collectively, "Transactions") to obtain consumer or personal, business and investigative reports and other information about you, including credit card processor statements and bank statements, from one or more consumer reporting agencies, such as TransUnion, Experian and Equifax, and from other credit bureaus, banks, creditors and other third parties. You also authorize OneDay Capital LLC to transmit this application form, along with any of the foregoing information obtained in connection with this application, to any or all of the Recipients for the foregoing purposes. You also consent to the release, by any creditor or financial institution, of any information relating to any of you, to OneDay Capital LLC and to each of the Recipients, on its own behalf.

CONSENT TO TELEPHONE CALLS, SMS, WhatsApp, iMessaging: You expressly consent to receiving marketing and other calls and messages, to landline, wireless or similar devices, including auto-dialed and pre-recorded message calls, and SMS messages (including text messages) from recipients, at telephone numbers that you have provided. Message and data rates may apply. Your consent to receive marketing calls is not required for your application. If you do not consent, do not provide your phone number.

CONSENT TO ELECTRONIC DISCLOSURE: You expressly consent to transactions and disclosures with recipients online and electronically. Disclosure will be provided to you either on the screen, on recipients' website or via electronic mail to the email address you provided.`;

const MARGIN = 40;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const LABEL_SIZE = 7;
const VALUE_SIZE = 8;
const TITLE_SIZE = 9;
const HEADER_TITLE_SIZE = 14;
const ROW_HEIGHT = 22; // more spacing between lines
const TILE_ROW_HEIGHT = 20;
const TILE_PAD = 8;
const LABEL_COL_WIDTH = 100; // fixed width for label so value aligns
const DETAILS_LABEL_COL_WIDTH = 130; // wider so "Monthly Revenues (Approximate)" doesn't overlap value
const LIGHT_BG = rgb(0.96, 0.96, 0.96);
const TILE_BORDER = rgb(0.75, 0.75, 0.75);
const HIGHLIGHT_BG = rgb(0.93, 0.95, 1);

/** Convert y from top (0 = top of page) to pdf-lib y (from bottom). */
function fromTop(pageHeight: number, yFromTop: number): number {
  return pageHeight - yFromTop;
}

export async function generateApplicationPdf(
  payload: SubmitPayload,
  logoPath?: string,
  classification?: Pick<PaperClassification, "industryRiskTier" | "paperType"> | null
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const [helvetica, helveticaBold] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ]);

  const page = doc.addPage(PageSizes.Letter);
  const height = page.getHeight();
  const black = rgb(0, 0, 0);

  let yFromTop = MARGIN;

  // ---- Header: logo 2x size, title, contact ----
  const logoWidth = 180;
  const logoHeight = 56;
  let logoBytes: Uint8Array | null = null;
  // 1) Embedded logo (always works on Vercel - no fs/fetch)
  try {
    logoBytes = new Uint8Array(Buffer.from(LOGO_PNG_BASE64, "base64"));
  } catch {
    // skip
  }
  // 2) Optional override from disk (e.g. local dev)
  if (!logoBytes && logoPath && fs.existsSync(logoPath)) {
    try {
      logoBytes = fs.readFileSync(logoPath);
    } catch {
      // keep embedded
    }
  }
  if (!logoBytes) {
    const localPath = path.join(process.cwd(), "public", "images", "logo-small.png");
    if (fs.existsSync(localPath)) {
      try {
        logoBytes = fs.readFileSync(localPath);
      } catch {
        // keep embedded
      }
    }
  }
  if (logoBytes) {
    try {
      const logoImage = await doc.embedPng(logoBytes);
      const logoDims = logoImage.scale(logoWidth / logoImage.width);
      const h = Math.min(logoHeight, logoDims.height);
      const w = logoDims.width * (h / logoDims.height);
      page.drawImage(logoImage, {
        x: MARGIN,
        y: fromTop(height, yFromTop) - h,
        width: w,
        height: h,
      });
    } catch {
      // skip
    }
  }
  // Application Form title (right of logo, no overlap)
  page.drawText("Application Form", {
    x: MARGIN + logoWidth + 20,
    y: fromTop(height, yFromTop) - HEADER_TITLE_SIZE,
    size: HEADER_TITLE_SIZE,
    font: helveticaBold,
    color: black,
  });
  // Contact top right
  page.drawText(CONTACT_EMAIL, {
    x: PAGE_WIDTH - MARGIN - 140,
    y: fromTop(height, yFromTop) - VALUE_SIZE,
    size: VALUE_SIZE,
    font: helvetica,
    color: black,
  });
  yFromTop += logoHeight + 14;

  const p = payload.personal;
  const b = payload.business;
  const f = payload.financial;
  const c = payload.creditOwnership;

  // Column layout: equal-width columns, reduced gap
  const COL_GAP = 8;
  const COL_WIDTH = (CONTENT_WIDTH - COL_GAP) / 2;
  const col1X = MARGIN;
  const col2X = MARGIN + COL_WIDTH + COL_GAP;
  const col1W = COL_WIDTH;
  const detailsTileX = col2X;
  const detailsTileW = COL_WIDTH;
  const col2W = COL_WIDTH;

  const fundingTileH = 2 * TILE_ROW_HEIGHT + TILE_PAD * 2 + 4;
  const detailsRows = buildAdditionalDetailsRows(payload, classification);
  // Extra height so last row (Industry) can wrap without overlapping tile bottom
  const detailsTileH =
    detailsRows.length * TILE_ROW_HEIGHT + TILE_PAD * 2 + 4 + 14;
  const tilesRowH = Math.max(fundingTileH, detailsTileH);

  // ---- Left tile: Funding Request & Use of Funds (side by side with right tile) ----
  const fundingValueW = col1W - TILE_PAD * 2 - LABEL_COL_WIDTH;
  page.drawRectangle({
    x: col1X,
    y: fromTop(height, yFromTop) - fundingTileH,
    width: col1W,
    height: fundingTileH,
    borderColor: TILE_BORDER,
    borderWidth: 0.5,
    color: HIGHLIGHT_BG,
  });
  page.drawText("Funding Request ($):", {
    x: col1X + TILE_PAD,
    y: fromTop(height, yFromTop + TILE_PAD) - VALUE_SIZE,
    size: LABEL_SIZE,
    font: helveticaBold,
    color: black,
  });
  page.drawText(formatFundingRequestDisplay(f.fundingRequest), {
    x: col1X + TILE_PAD + LABEL_COL_WIDTH,
    y: fromTop(height, yFromTop + TILE_PAD) - VALUE_SIZE,
    size: VALUE_SIZE,
    font: helvetica,
    color: black,
    maxWidth: fundingValueW,
  });
  page.drawText("Use of Funds:", {
    x: col1X + TILE_PAD,
    y: fromTop(height, yFromTop + TILE_PAD + TILE_ROW_HEIGHT) - VALUE_SIZE,
    size: LABEL_SIZE,
    font: helveticaBold,
    color: black,
  });
  page.drawText(formatUseOfFundsDisplay(f.useOfFunds), {
    x: col1X + TILE_PAD + LABEL_COL_WIDTH,
    y: fromTop(height, yFromTop + TILE_PAD + TILE_ROW_HEIGHT) - VALUE_SIZE,
    size: VALUE_SIZE,
    font: helvetica,
    color: black,
    maxWidth: fundingValueW,
    lineHeight: TILE_ROW_HEIGHT - 4,
  });

  // ---- Right tile: Additional Details (side by side with left tile) ----
  const detailsValueW = detailsTileW - TILE_PAD * 2 - DETAILS_LABEL_COL_WIDTH;
  page.drawRectangle({
    x: detailsTileX,
    y: fromTop(height, yFromTop) - detailsTileH,
    width: detailsTileW,
    height: detailsTileH,
    borderColor: TILE_BORDER,
    borderWidth: 0.5,
    color: LIGHT_BG,
  });
  page.drawText("Additional Details", {
    x: detailsTileX + TILE_PAD,
    y: fromTop(height, yFromTop + TILE_PAD) - LABEL_SIZE,
    size: LABEL_SIZE,
    font: helveticaBold,
    color: black,
  });
  let detailsY = yFromTop + TILE_PAD + 14;
  for (const row of detailsRows) {
    page.drawText(row.label + ":", {
      x: detailsTileX + TILE_PAD,
      y: fromTop(height, detailsY) - VALUE_SIZE,
      size: LABEL_SIZE,
      font: helveticaBold,
      color: black,
    });
    page.drawText(row.value || "—", {
      x: detailsTileX + TILE_PAD + DETAILS_LABEL_COL_WIDTH,
      y: fromTop(height, detailsY) - VALUE_SIZE,
      size: VALUE_SIZE,
      font: helvetica,
      color: black,
      maxWidth: detailsValueW,
      lineHeight: TILE_ROW_HEIGHT - 4,
    });
    detailsY += TILE_ROW_HEIGHT;
  }

  yFromTop += tilesRowH + 12;

  // Row helper: label and value on same row; value wraps in data area. extraLines adds vertical space for wrapped text.
  function fieldRow(
    label: string,
    value: string,
    x: number,
    y: number,
    labelW: number,
    valueW: number,
    extraLines = 0
  ): number {
    page.drawText(label + ":", {
      x,
      y: fromTop(height, y) - VALUE_SIZE,
      size: LABEL_SIZE,
      font: helveticaBold,
      color: black,
    });
    const lineHeight = ROW_HEIGHT - 6;
    page.drawText(value || "—", {
      x: x + labelW,
      y: fromTop(height, y) - VALUE_SIZE,
      size: VALUE_SIZE,
      font: helvetica,
      color: black,
      maxWidth: valueW,
      lineHeight,
    });
    return y + ROW_HEIGHT + extraLines * lineHeight;
  }

  const valueW1 = col1W - LABEL_COL_WIDTH - TILE_PAD;
  const valueW2 = col2W - LABEL_COL_WIDTH - TILE_PAD;

  // ---- Left column: Business Details ----
  let yLeft = yFromTop;

  page.drawText("Business Details", {
    x: col1X,
    y: fromTop(height, yLeft) - TITLE_SIZE,
    size: TITLE_SIZE,
    font: helveticaBold,
    color: black,
  });
  yLeft += 14;

  yLeft = fieldRow("Business Name", b.businessName, col1X, yLeft, LABEL_COL_WIDTH, valueW1);
  yLeft = fieldRow("DBA", b.dba || "—", col1X, yLeft, LABEL_COL_WIDTH, valueW1);
  yLeft = fieldRow("Type of Business", formatTypeOfBusinessDisplay(b.typeOfBusiness), col1X, yLeft, LABEL_COL_WIDTH, valueW1);
  yLeft = fieldRow(
    "Start Date of Business",
    b.startDateOfBusiness,
    col1X,
    yLeft,
    LABEL_COL_WIDTH,
    valueW1
  );
  yLeft = fieldRow("Federal EIN / Tax ID", b.ein, col1X, yLeft, LABEL_COL_WIDTH, valueW1);
  yLeft = fieldRow(
    "Business Address",
    [b.address, b.city, b.state, b.zip].filter(Boolean).join(", "),
    col1X,
    yLeft,
    LABEL_COL_WIDTH,
    valueW1,
    1
  );
  yLeft += 4;

  // ---- Right column: Owner Details (label + value on same row, overflow in data area) ----
  let yRight = yFromTop;
  page.drawText("Owner Details", {
    x: col2X,
    y: fromTop(height, yRight) - TITLE_SIZE,
    size: TITLE_SIZE,
    font: helveticaBold,
    color: black,
  });
  yRight += 14;

  yRight = fieldRow(
    "Owner Name",
    `${p.firstName} ${p.lastName}`,
    col2X,
    yRight,
    LABEL_COL_WIDTH,
    valueW2
  );
  yRight = fieldRow(
    "Residence Address",
    [c.address, c.city, c.state, c.zip].filter(Boolean).join(", "),
    col2X,
    yRight,
    LABEL_COL_WIDTH,
    valueW2,
    1
  );
  yRight = fieldRow("Ownership %", c.ownershipPercent || "—", col2X, yRight, LABEL_COL_WIDTH, valueW2);
  const ssnDisplay = c.ssn?.trim() || "—";
  yRight = fieldRow("SSN", ssnDisplay, col2X, yRight, LABEL_COL_WIDTH, valueW2);

  // Terms start after the lower of the two columns
  yFromTop = Math.max(yLeft, yRight) + 14;

  // ---- Terms (6pt) ----
  const termsY = yFromTop;
  page.drawText(TERMS, {
    x: MARGIN,
    y: fromTop(height, termsY) - 6,
    size: 6,
    font: helvetica,
    color: black,
    maxWidth: CONTENT_WIDTH,
    lineHeight: 7,
  });
  const termsBlockHeight = 130;
  yFromTop = termsY + termsBlockHeight + 4; // reduced gap between terms and signature

  // ---- Signature + audit ----
  page.drawText("Signature", {
    x: MARGIN,
    y: fromTop(height, yFromTop) - 10,
    size: 8,
    font: helveticaBold,
    color: black,
  });
  yFromTop += 14;

  if (payload.signature.signatureDataUrl) {
    try {
      const base64 = payload.signature.signatureDataUrl.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      const imgBytes = new Uint8Array(Buffer.from(base64, "base64"));
      const isJpeg =
        payload.signature.signatureDataUrl.indexOf("image/jpeg") >= 0 ||
        payload.signature.signatureDataUrl.indexOf("image/jpg") >= 0;
      const sigImage = isJpeg
        ? await doc.embedJpg(imgBytes)
        : await doc.embedPng(imgBytes);
      const sigDims = sigImage.scale(180 / sigImage.width);
      const sigHeight = Math.min(50, sigDims.height);
      const sigWidth = Math.min(
        180,
        sigDims.width * (sigHeight / sigDims.height)
      );
      page.drawImage(sigImage, {
        x: MARGIN,
        y: fromTop(height, yFromTop) - sigHeight,
        width: sigWidth,
        height: sigHeight,
      });
      yFromTop += sigHeight + 8;
    } catch {
      page.drawText("[Signature on file]", {
        x: MARGIN,
        y: fromTop(height, yFromTop) - 8,
        size: 8,
        font: helvetica,
        color: black,
      });
      yFromTop += 28;
    }
  } else {
    yFromTop += 20;
  }

  if (payload.signature.signedAt) {
    page.drawText(`Signed at: ${payload.signature.signedAt}`, {
      x: MARGIN,
      y: fromTop(height, yFromTop) - 7,
      size: 7,
      font: helvetica,
      color: black,
    });
    yFromTop += 12;
  }
  if (payload.signature.auditId) {
    page.drawText(`Audit ID: ${payload.signature.auditId}`, {
      x: MARGIN,
      y: fromTop(height, yFromTop) - 7,
      size: 7,
      font: helvetica,
      color: black,
    });
  }

  // ---- Footer ----
  page.drawText("OneDay Capital LLC  |  www.onedaycap.com", {
    x: MARGIN,
    y: fromTop(height, PAGE_HEIGHT - MARGIN - 12) - 8,
    size: 8,
    font: helvetica,
    color: black,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

/** Format: {Merchant name}_OneDayCap_Application.pdf */
export function applicationPdfFilename(merchantName: string): string {
  const safeName =
    (merchantName || "Application").replace(/[^a-zA-Z0-9\s.-]/g, "").trim() ||
    "Application";
  return `${safeName}_OneDayCap_Application.pdf`;
}
