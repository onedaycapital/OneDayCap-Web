"use client";

import type { FinancialFundingInfo } from "../types";
import { RadioTiles } from "../RadioTiles";
import { formatFundingRequestCurrency, parseFundingRequest } from "../formatters";
import { getGiftForFundingRequest } from "@/lib/gift-from-funding";

const emptyInputClass = "border-amber-400 bg-amber-50/50 focus:border-amber-500 focus:ring-amber-500";
const normalInputClass = "border-slate-200 focus:border-[var(--brand-blue)] focus:ring-[var(--brand-blue)]";

interface Props {
  data: FinancialFundingInfo;
  onChange: (data: FinancialFundingInfo) => void;
  highlightEmpty?: boolean;
}

const USE_OF_FUNDS_OPTIONS = [
  { value: "working-capital", label: "Working Capital" },
  { value: "business-expansion", label: "Business Expansion" },
  { value: "debt-refinancing", label: "Debt Refinancing" },
  { value: "others", label: "Others" },
];

/** First bracket (revenue < $50k): low $20k, high $25k. Aligns with Customer Reward Program first reward at $20k. */
const FIRST_BRACKET_LOW = 20_000;
const FIRST_BRACKET_HIGH = 25_000;

/** Middle bracket ($50k–$100k revenue): 0.8x–1.5x of $75k. */
const MID_BRACKET_LOW = 60_000;
const MID_BRACKET_HIGH = 112_500;

/** Last bracket (revenue ≥ $100k): 0.8x–1.5x of $150k, high capped at $500k unless requested > $500k. */
const LAST_BRACKET_LOW = 120_000;
const LAST_BRACKET_HIGH_CAP = 500_000;

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

/** Parse monthly revenue from form (digits-only string from currency input). */
function parseMonthlyRevenueNum(value: string | null | undefined): number {
  const digits = (value ?? "").replace(/\D/g, "");
  const n = digits ? parseInt(digits, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Compute pre-approval range from numeric monthly revenue (and optional funding request for >$500k cap).
 */
function getPreApprovalRange(
  monthlyRevenueDigits: string,
  fundingRequestDigits: string
): { low: number; high: number; useRequestedAmount: boolean } | null {
  const revNum = parseMonthlyRevenueNum(monthlyRevenueDigits);
  const requestedNum = parseMonthlyRevenueNum(fundingRequestDigits);
  const requestedValid = requestedNum > 0;

  if (revNum <= 0) return null;

  if (revNum < 50_000) {
    return { low: FIRST_BRACKET_LOW, high: FIRST_BRACKET_HIGH, useRequestedAmount: false };
  }
  if (revNum < 100_000) {
    return { low: MID_BRACKET_LOW, high: MID_BRACKET_HIGH, useRequestedAmount: false };
  }
  // revNum >= 100_000
  const capHigh = Math.min(225_000, LAST_BRACKET_HIGH_CAP);
  if (requestedValid && requestedNum > LAST_BRACKET_HIGH_CAP) {
    return { low: LAST_BRACKET_LOW, high: requestedNum, useRequestedAmount: true };
  }
  return { low: LAST_BRACKET_LOW, high: capHigh, useRequestedAmount: false };
}

export function Step3FinancialFunding({ data, onChange, highlightEmpty }: Props) {
  const isEmpty = (v: string) => !(v && String(v).trim());
  const inputClass = (empty: boolean) =>
    `w-full max-w-xs rounded-lg border bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${
      highlightEmpty && empty ? emptyInputClass : normalInputClass
    }`;

  const showCompute = !!(data.useOfFunds && data.useOfFunds.trim());
  const range = data.monthlyRevenue?.replace(/\D/g, "")
    ? getPreApprovalRange(data.monthlyRevenue ?? "", data.fundingRequest ?? "")
    : null;
  const rangeText = range
    ? range.useRequestedAmount
      ? `up to ${formatUsd(range.high)} (based on your requested amount)`
      : `${formatUsd(range.low)} – ${formatUsd(range.high)}`
    : "Enter monthly revenue above to see your range.";

  const gift = getGiftForFundingRequest(data.fundingRequest ?? "");
  const hasFundingAmount = !!(data.fundingRequest && parseInt(data.fundingRequest.replace(/\D/g, ""), 10) > 0);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold text-slate-800">Financial & Funding Information</h2>
      <p className="text-slate-600 text-sm">Share your funding needs and financial overview. Complete any fields that are still missing.</p>

      <div>
        <label htmlFor="monthlyRevenue" className="mb-1.5 block text-sm font-medium text-slate-700">
          Monthly Revenues (Approximate) *
        </label>
        <input
          id="monthlyRevenue"
          type="text"
          inputMode="numeric"
          value={formatFundingRequestCurrency(data.monthlyRevenue)}
          onChange={(e) => onChange({ ...data, monthlyRevenue: parseFundingRequest(e.target.value) })}
          placeholder="$0"
          className={inputClass(isEmpty(data.monthlyRevenue))}
          required
        />
      </div>

      <div>
        <label htmlFor="fundingRequest" className="mb-1.5 block text-sm font-medium text-slate-700">
          Funding Request *
        </label>
        <input
          id="fundingRequest"
          type="text"
          inputMode="numeric"
          value={formatFundingRequestCurrency(data.fundingRequest)}
          onChange={(e) => onChange({ ...data, fundingRequest: parseFundingRequest(e.target.value) })}
          placeholder="$0"
          className={inputClass(isEmpty(data.fundingRequest))}
          required
        />
      </div>

      <RadioTiles
        name="useOfFunds"
        question="Use of Funds"
        instruction="Choose one of the options provided:"
        options={USE_OF_FUNDS_OPTIONS}
        value={data.useOfFunds}
        onChange={(useOfFunds) => onChange({ ...data, useOfFunds })}
        required
        highlightEmpty={highlightEmpty}
      />

      {showCompute && (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
            <h3 className="font-heading text-lg font-semibold text-emerald-900">Potentially Approved</h3>
            <p className="mt-2 text-sm text-emerald-800">
              Pre-approved for a funding range of <strong>{rangeText}</strong> with 95%+ probability of cash in bank within 24hrs.
            </p>
            <p className="mt-1 text-xs text-emerald-700/90">
              Assumption: Your business is more than 1 year old and no defaults or bankruptcy in the last 2 years.
            </p>
            <p className="mt-4 text-sm font-medium text-emerald-900">Documents required to expedite your application process:</p>
            <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-emerald-800">
              <li>Last three months bank statements</li>
              <li>Drivers License (Optional for now)</li>
              <li>Void Check (Optional, but needed to fund your account)</li>
            </ol>
          </div>

          <div className="relative overflow-hidden rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 p-5 shadow-lg">
            <div
              className="absolute right-3 top-3 text-4xl opacity-90"
              style={{
                filter: "drop-shadow(0 0 8px rgba(255,255,255,0.9)) drop-shadow(0 0 16px rgba(255,255,255,0.6)) drop-shadow(0 0 24px rgba(255,251,240,0.5))",
              }}
              aria-hidden
            >
              🎁
            </div>
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-900/80">Your guaranteed gift</p>
              <h3 className="font-heading mt-1 text-lg font-bold text-white drop-shadow-sm">
                Free Gift - {hasFundingAmount ? gift.label : "Enter your funding amount above to see your gift"}
              </h3>
              <p className="mt-1 text-sm text-white/95">
                {hasFundingAmount
                  ? "Complete your application and get funded to receive this gift. No extra steps."
                  : "Your gift tier is based on your funding request."}
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-white">
                <span>Complete below to claim</span>
                <svg className="h-5 w-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
