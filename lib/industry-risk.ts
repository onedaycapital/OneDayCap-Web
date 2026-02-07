/**
 * Industry description (dropdown label) → Industry Risk (T1–T4) for application form and PDF.
 * Reference table in Supabase mirrors this for reporting; see docs/supabase-industry-risk.sql
 */
export const INDUSTRY_RISK_MAP: Record<string, string> = {
  "Retail Trade (General)": "T1-T3",
  "Health Care & Social Assistance": "T1",
  "Finance & Insurance": "T1/T4",
  "Professional, Scientific & Technical Services": "T1",
  "Wholesale Trade": "T1-T2",
  "Construction": "T1-T3",
  "Manufacturing": "T2",
  "Transportation & Warehousing": "T2-T3",
  "Food Services & Drinking Places": "T2-T3",
  "Real Estate & Rental & Leasing": "T3",
  "Arts, Entertainment & Recreation": "T2-T4",
  "Other Services": "T1-T3",
  "Mining, Quarrying, Oil & Gas Extraction": "T4",
  "Agriculture, Forestry, Fishing": "T4",
  "Utilities": "T4",
  "Information": "T3-T4",
  "Consumer Lending / High-Risk Finance": "T4",
  "Gambling Industries": "T4",
  "Adult Entertainment": "T4",
  "Smoke/Vape Shops": "T4",
  "Pawn Shops": "T4",
};

/** Ordered list of industry descriptions for dropdown (same order as reference table). */
export const INDUSTRY_OPTIONS: string[] = [
  "Retail Trade (General)",
  "Health Care & Social Assistance",
  "Finance & Insurance",
  "Professional, Scientific & Technical Services",
  "Wholesale Trade",
  "Construction",
  "Manufacturing",
  "Transportation & Warehousing",
  "Food Services & Drinking Places",
  "Real Estate & Rental & Leasing",
  "Arts, Entertainment & Recreation",
  "Other Services",
  "Mining, Quarrying, Oil & Gas Extraction",
  "Agriculture, Forestry, Fishing",
  "Utilities",
  "Information",
  "Consumer Lending / High-Risk Finance",
  "Gambling Industries",
  "Adult Entertainment",
  "Smoke/Vape Shops",
  "Pawn Shops",
];

/** Get Industry Risk (T1–T4) for a selected industry description; returns "—" if not found. */
export function getIndustryRisk(industryDescription: string | null | undefined): string {
  if (!industryDescription || !industryDescription.trim()) return "—";
  const risk = INDUSTRY_RISK_MAP[industryDescription.trim()];
  return risk ?? "—";
}
