/**
 * Add logo watermark to PDFs for the internal email package only.
 * Stored files stay original; only attachments to subs@onedaycap.com are watermarked.
 *
 * Rules:
 * - Logo: same asset, 2x size (360pt wide), 70–80% transparent (opacity 0.25).
 * - Application Form: 1 watermark on the terms section.
 * - Bank statement: 1 watermark on page 1 only, top 30% of page.
 * - Void check / Driver's license: 1 watermark in top half of page.
 */

import { PDFDocument } from "pdf-lib";
import { LOGO_PNG_BASE64 } from "@/lib/logo-pdf";

const LOGO_WIDTH_WATERMARK = 360; // 2x the 180 used in application header
const WATERMARK_OPACITY = 0.25; // 75% transparent

export type WatermarkPlacement = "application-form-terms" | "page1-top30" | "top-half";

function isPdf(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.toString("utf8", 0, 5) === "%PDF-";
}

/**
 * Add one logo watermark to a PDF buffer according to placement rules.
 * Returns a new buffer; does not mutate. If the file is not a PDF or watermarking fails, returns the original buffer.
 */
export async function addWatermarkToPdf(
  pdfBuffer: Buffer,
  placement: WatermarkPlacement
): Promise<Buffer> {
  if (!isPdf(pdfBuffer)) return pdfBuffer;
  try {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pages = doc.getPages();
    if (pages.length === 0) return pdfBuffer;

    const logoBytes = new Uint8Array(Buffer.from(LOGO_PNG_BASE64, "base64"));
    const logoImage = await doc.embedPng(logoBytes);
    const logoDims = logoImage.scale(LOGO_WIDTH_WATERMARK / logoImage.width);
    const w = logoDims.width;
    const h = logoDims.height;

    if (placement === "application-form-terms") {
      // Single page (application form): 1 watermark in the terms section.
      // Terms block is roughly center-bottom; y from top ~387, height 130. Center ≈ 452 from top → PDF y ≈ 340.
      const page = pages[0];
      const pageHeight = page.getHeight();
      const pageWidth = page.getWidth();
      const termsCenterY = pageHeight - 452; // terms region center (from application-pdf layout)
      const x = (pageWidth - w) / 2;
      const y = termsCenterY - h / 2;
      page.drawImage(logoImage, {
        x: Math.max(0, x),
        y: Math.max(0, Math.min(y, pageHeight - h)),
        width: w,
        height: h,
        opacity: WATERMARK_OPACITY,
      });
    } else if (placement === "page1-top30") {
      // Bank statement: page 1 only, top 30% of page (do not go below that).
      const page = pages[0];
      const pageHeight = page.getHeight();
      const pageWidth = page.getWidth();
      const top30Bottom = pageHeight * 0.7; // top 30%: y from this to pageHeight
      const centerY = (pageHeight + top30Bottom) / 2;
      const y = centerY - h / 2;
      const clampedY = Math.max(top30Bottom, Math.min(y, pageHeight - h));
      page.drawImage(logoImage, {
        x: (pageWidth - w) / 2,
        y: clampedY,
        width: w,
        height: h,
        opacity: WATERMARK_OPACITY,
      });
    } else {
      // top-half: Void check, Driver's license — top half of page
      const page = pages[0];
      const pageHeight = page.getHeight();
      const pageWidth = page.getWidth();
      const topHalfBottom = pageHeight / 2;
      const centerY = (pageHeight + topHalfBottom) / 2;
      const y = centerY - h / 2;
      const clampedY = Math.max(topHalfBottom, Math.min(y, pageHeight - h));
      page.drawImage(logoImage, {
        x: (pageWidth - w) / 2,
        y: clampedY,
        width: w,
        height: h,
        opacity: WATERMARK_OPACITY,
      });
    }

    const out = await doc.save();
    return Buffer.from(out);
  } catch (err) {
    console.error("[watermark-pdf] error:", err);
    return pdfBuffer;
  }
}
