/**
 * Extract structured funder/guideline data from PDF text using OpenAI.
 * Used by admin contract/guidelines upload.
 */

export interface ExtractedFunderGuidelines {
  funder_name: string | null;
  min_funding: number | null;
  max_funding: number | null;
  states_allowed: string[] | null;
  states_excluded: string[] | null;
  turnaround_time: string | null;
  revenue_min: number | null;
  revenue_max: number | null;
  min_time_in_biz: string | null;
  required_docs: { code: string; label: string }[] | null;
  industries: string[] | null;
}

export const EXTRACTION_SYSTEM_PROMPT = `You are extracting structured data from a funder guidelines or ISO contract document.
Output valid JSON only, no other text. Use this exact structure (use null for missing values):
{
  "funder_name": "string or null",
  "min_funding": number or null,
  "max_funding": number or null,
  "states_allowed": ["NY","NJ"] or null,
  "states_excluded": ["TX","CA"] or null,
  "turnaround_time": "e.g. 24-48 hours" or null,
  "revenue_min": number or null,
  "revenue_max": number or null,
  "min_time_in_biz": "e.g. 6 months" or null,
  "required_docs": [{"code": "bank_statements_3mo", "label": "3 months bank statements"}, ...] or null,
  "industries": ["Restaurant", "Retail"] or null
}
Map common phrases: "minimum advance"/"floor"/"we fund from" -> min_funding; "maximum"/"cap"/"up to" -> max_funding; "no TX"/"excluding" -> states_excluded; "only in NY" -> states_allowed; "bank statements"/"void check"/"driver's license" -> required_docs with codes bank_statements_3mo, void_check, drivers_license. Use 2-letter state codes.`;

export function buildExtractionUserPrompt(pdfText: string): string {
  const truncated = pdfText.slice(0, 12000);
  if (truncated.length < pdfText.length) {
    return truncated + "\n\n[Document truncated for length.]";
  }
  return truncated;
}

export function parseExtractionResult(jsonStr: string): ExtractedFunderGuidelines | null {
  try {
    const raw = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      funder_name: typeof raw.funder_name === "string" ? raw.funder_name : null,
      min_funding: typeof raw.min_funding === "number" ? raw.min_funding : null,
      max_funding: typeof raw.max_funding === "number" ? raw.max_funding : null,
      states_allowed: Array.isArray(raw.states_allowed) ? (raw.states_allowed as string[]) : null,
      states_excluded: Array.isArray(raw.states_excluded) ? (raw.states_excluded as string[]) : null,
      turnaround_time: typeof raw.turnaround_time === "string" ? raw.turnaround_time : null,
      revenue_min: typeof raw.revenue_min === "number" ? raw.revenue_min : null,
      revenue_max: typeof raw.revenue_max === "number" ? raw.revenue_max : null,
      min_time_in_biz: typeof raw.min_time_in_biz === "string" ? raw.min_time_in_biz : null,
      required_docs: Array.isArray(raw.required_docs)
        ? (raw.required_docs as { code: string; label: string }[])
        : null,
      industries: Array.isArray(raw.industries) ? (raw.industries as string[]) : null,
    };
  } catch {
    return null;
  }
}
