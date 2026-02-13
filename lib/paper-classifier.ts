/**
 * Paper A/B/C/D classifier (Cash-Flow-Proxy Paper Model).
 * Uses: Time in Business, Stated Monthly Revenue, Industry Risk Tier, Funding Multiple.
 * Weights: TIB 30%, Revenue 30%, Industry 20%, Funding Multiple 20%.
 */

import { getIndustryRisk } from "@/lib/industry-risk";

/** Display tier for paper model (matches compute paper). */
export type IndustryRiskTier = "Low" | "Medium" | "High" | "Very High";

export type PaperType = "A" | "B" | "C" | "D";

export interface PaperClassification {
  industryRiskTier: IndustryRiskTier;
  paperType: PaperType;
  paperScore: number;
  /** Component scores 0–100 for audit */
  tibScore: number;
  revenueScore: number;
  industryScore: number;
  multipleScore: number;
}

/** Map T1/T2/T3/T4 or range (e.g. T1-T3) to tier and score. Worst tier in range wins. */
function industryRiskToTierAndScore(riskCode: string | null | undefined): { tier: IndustryRiskTier; score: number } {
  const t = (riskCode || "").trim();
  if (!t) return { tier: "Medium", score: 75 };

  const tierScores: Record<string, number> = { T1: 100, T2: 75, T3: 50, T4: 30 };
  const tierLabels: Record<string, IndustryRiskTier> = {
    T1: "Low",
    T2: "Medium",
    T3: "High",
    T4: "Very High",
  };

  const tiersInCode = (t.match(/T[1-4]/g) || []) as ("T1" | "T2" | "T3" | "T4")[];
  if (tiersInCode.length === 0) return { tier: "Medium", score: 75 };

  const scores = tiersInCode.map((x) => tierScores[x] ?? 75);
  const minScore = Math.min(...scores);
  const worstTier = tiersInCode[scores.indexOf(minScore)];
  return { tier: tierLabels[worstTier] ?? "Medium", score: minScore };
}

/** Parse "Month, Year" (e.g. "Jan, 2023") to months from that date to now. */
function monthsInBusiness(startDateOfBusiness: string | null | undefined): number | null {
  const s = (startDateOfBusiness || "").trim();
  if (!s) return null;

  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  const full = s.match(/^([A-Za-z]+),\s*(\d{4})$/);
  if (full) {
    const monthName = full[1].slice(0, 3);
    const month = months[monthName as keyof typeof months];
    const year = parseInt(full[2], 10);
    if (month === undefined || isNaN(year)) return null;
    const start = new Date(year, month, 1);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.max(0, monthsDiff);
  }

  const yearOnly = s.match(/(\d{4})/);
  if (yearOnly) {
    const year = parseInt(yearOnly[1], 10);
    const start = new Date(year, 0, 1);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.max(0, monthsDiff);
  }
  return null;
}

/** TIB score 0–100: 36+→100, 24–35→85, 12–23→65, 6–11→45, <6→25 */
function tibToScore(months: number | null): number {
  if (months === null) return 65;
  if (months >= 36) return 100;
  if (months >= 24) return 85;
  if (months >= 12) return 65;
  if (months >= 6) return 45;
  return 25;
}

/** Monthly revenue: numeric (digits/currency) or legacy range. Score: $100k+→100, $50k–99k→80, <50k→40. */
function revenueToScoreAndNumeric(
  monthlyRevenue: string | null | undefined
): { score: number; numericForMultiple: number } {
  const v = (monthlyRevenue || "").trim();
  const digits = v.replace(/\D/g, "");
  const num = digits ? parseInt(digits, 10) : NaN;
  if (Number.isFinite(num)) {
    const numericForMultiple = num > 0 ? num : 25_000;
    const score = num >= 100_000 ? 100 : num >= 50_000 ? 80 : 40;
    return { score, numericForMultiple };
  }
  const lower = v.toLowerCase();
  if (lower === "over-100k" || lower === "> $100,000") return { score: 100, numericForMultiple: 125_000 };
  if (lower === "50k-100k" || (v.includes("50") && v.includes("100"))) return { score: 80, numericForMultiple: 75_000 };
  if (lower === "under-50k" || lower === "<$50,000") return { score: 40, numericForMultiple: 25_000 };
  return { score: 40, numericForMultiple: 25_000 };
}

/** Funding multiple score: ≤1→100, 1–1.5→80, 1.5–2→60, 2–2.5→40, >2.5→20 */
function multipleToScore(multiple: number): number {
  if (multiple <= 1) return 100;
  if (multiple <= 1.5) return 80;
  if (multiple <= 2) return 60;
  if (multiple <= 2.5) return 40;
  return 20;
}

/** Composite score → Paper grade: 80–100 A, 65–79 B, 50–64 C, <50 D */
function scoreToPaperType(score: number): PaperType {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

/**
 * Compute Paper classification from application form data.
 */
export function computePaperClassification(payload: {
  business: { industry: string; startDateOfBusiness: string };
  financial: { monthlyRevenue: string; fundingRequest: string };
}): PaperClassification {
  const { business, financial } = payload;

  const months = monthsInBusiness(business.startDateOfBusiness);
  const tibScore = tibToScore(months);

  const { score: revenueScore, numericForMultiple } = revenueToScoreAndNumeric(financial.monthlyRevenue);

  const industryRiskCode = getIndustryRisk(business.industry);
  const { tier: industryRiskTier, score: industryScore } =
    industryRiskToTierAndScore(industryRiskCode === "—" ? undefined : industryRiskCode);

  const requested = parseFloat(String(financial.fundingRequest || "0").replace(/[^0-9.-]/g, "")) || 0;
  const multiple = numericForMultiple > 0 ? requested / numericForMultiple : 2.5;
  const multipleScore = multipleToScore(multiple);

  const paperScore =
    tibScore * 0.3 + revenueScore * 0.3 + industryScore * 0.2 + multipleScore * 0.2;
  const paperType = scoreToPaperType(paperScore);

  return {
    industryRiskTier,
    paperType,
    paperScore: Math.round(paperScore * 100) / 100,
    tibScore,
    revenueScore,
    industryScore,
    multipleScore,
  };
}
